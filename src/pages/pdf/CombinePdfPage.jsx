import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// Configure PDF.js worker using Vite’s URL resolution
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const CombinePdfPage = () => {
  // Each file object: { id, file, preview, pageCount }
  const [pdfFiles, setPdfFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropZoneRef = useRef(null);

  // Helper: generate a unique id for each file
  const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

  // Set the scale for the preview image (1.0 = full size, adjust as needed)
  const previewScale = 1.0;

  // Generate a preview image and get the page count for the first page of a PDF file
  const generatePreview = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const typedArray = new Uint8Array(reader.result);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          const pageCount = pdf.numPages;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: previewScale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          await page.render({ canvasContext: context, viewport }).promise;
          resolve({ preview: canvas.toDataURL(), pageCount });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // Process files from input, drag, or paste events
  const handleFiles = async (files) => {
    setError(null);
    const newFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    if (newFiles.length === 0) {
      setError('Please upload valid PDF files.');
      return;
    }
    for (const file of newFiles) {
      try {
        const { preview, pageCount } = await generatePreview(file);
        const id = generateId();
        setPdfFiles(prev => [...prev, { id, file, preview, pageCount }]);
      } catch (err) {
        console.error('Failed to generate preview:', err);
        setError('Failed to generate preview for one of the PDFs.');
      }
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  // Drop zone event handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  // Paste event handler (for Ctrl+V)
  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      handleFiles(e.clipboardData.files);
    }
  };

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener('paste', handlePaste);
      return () => dropZone.removeEventListener('paste', handlePaste);
    }
  }, []);

  // Remove a PDF from the list by id
  const removeFile = (id) => {
    setPdfFiles(prev => prev.filter(item => item.id !== id));
  };

  // Handle reordering using react-beautiful-dnd
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const newFiles = Array.from(pdfFiles);
    const [removed] = newFiles.splice(result.source.index, 1);
    newFiles.splice(result.destination.index, 0, removed);
    setPdfFiles(newFiles);
  };

  // Combine the PDFs in the current order and trigger a download
  const combinePdfs = async () => {
    if (pdfFiles.length < 2) {
      setError('Please add at least two PDF files to combine.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const { file } of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error combining PDFs: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6 text-center">Combine PDFs</h1>
      
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 mb-4 transition-colors cursor-pointer ${
          dragOver ? 'border-blue-400 bg-blue-900' : 'border-gray-600 bg-gray-800'
        }`}
      >
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4a1 1 0 011-1h8a1 1 0 011 1v12m-9 4h10a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="mt-4 text-lg text-gray-200">
          Drag & drop PDF files here, paste (Ctrl+V), or click to select
        </p>
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          id="pdfInput"
        />
        <label
          htmlFor="pdfInput"
          className="mt-4 inline-block px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors cursor-pointer"
        >
          Browse Files
        </label>
      </div>
      
      {/* Reorderable Preview List */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="pdfFiles">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="mb-4 space-y-2 min-h-[100px] border border-dashed border-gray-500 p-2 rounded"
            >
              {pdfFiles.length === 0 ? (
                <p className="text-gray-400 text-center">No PDFs loaded yet.</p>
              ) : (
                pdfFiles.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center space-x-4 p-2 border rounded border-gray-700 ${
                          snapshot.isDragging ? 'bg-blue-800' : 'bg-gray-800'
                        }`}
                      >
                        {/* Drag Handle */}
                        <div {...provided.dragHandleProps} className={`mr-2 cursor-grab ${snapshot.isDragging ? 'text-blue-400' : 'text-gray-300'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="w-24 h-24 object-contain rounded border border-gray-700"
                        />
                        <div className="flex flex-col flex-1">
                          <span className="break-words">{item.file.name}</span>
                          <span className="text-sm text-gray-400">Pages: {item.pageCount}</span>
                        </div>
                        <button
                          onClick={() => removeFile(item.id)}
                          className="ml-2 px-2 py-1 bg-red-500 rounded hover:bg-red-600 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      {error && <p className="mb-4 text-red-500">{error}</p>}
      
      {/* Combine PDFs Button */}
      <button
        onClick={combinePdfs}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
      >
        {loading ? 'Combining PDFs...' : 'Combine PDFs'}
      </button>
    </div>
  );
};

export default CombinePdfPage;
