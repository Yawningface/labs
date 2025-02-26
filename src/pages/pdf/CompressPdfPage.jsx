import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Configure PDF.js worker using Vite’s URL resolution
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const CompressPdfPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalSize, setOriginalSize] = useState(null);
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);
  const [compressMessage, setCompressMessage] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // For preview generation
  const [firstPagePreview, setFirstPagePreview] = useState(null);
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Helper function to load a file (for file input, drag-and-drop, or paste)
  const loadFile = (file) => {
    setSelectedFile(file);
    setOriginalSize(file.size);
    setCompressedBlob(null);
    setCompressedSize(null);
    setCompressMessage("");
    setError(null);
    generateDocumentPreview(file);
  };

  // Generate a preview for the first page of the PDF using pdfjs-lib.
  const previewScale = 1.0;
  const generatePagePreview = async (pdfDoc, pageNumber, scale = previewScale) => {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL();
  };

  // Load the PDF document info and generate the first page preview.
  const generateDocumentPreview = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      // Only generate preview for the first page
      const firstPreview = await generatePagePreview(pdf, 1);
      setFirstPagePreview(firstPreview);
    } catch (err) {
      console.error("Error loading PDF info:", err);
      setError("Failed to load PDF file.");
    }
  };

  // File input handler
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      loadFile(e.target.files[0]);
    }
  };

  // Drag-and-drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  // Paste handler (Ctrl+V)
  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files[0]) {
      loadFile(e.clipboardData.files[0]);
    }
  };

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener('paste', handlePaste);
      return () => dropZone.removeEventListener('paste', handlePaste);
    }
  }, []);

  // Clear the loaded file and reset state
  const clearFile = () => {
    setSelectedFile(null);
    setOriginalSize(null);
    setCompressedBlob(null);
    setCompressedSize(null);
    setCompressMessage("");
    setError(null);
    setFirstPagePreview(null);
  };

  // Compress the PDF using pdf-lib's re-save (with useObjectStreams for potential size reduction)
  const compressPdf = async () => {
    if (!selectedFile) {
      setError("Please upload a PDF file first.");
      return;
    }
    setLoading(true);
    setError(null);
    setCompressMessage("");
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      // Re-save the PDF with useObjectStreams enabled.
      const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([compressedPdfBytes], { type: "application/pdf" });
      setCompressedBlob(blob);
      setCompressedSize(blob.size);

      const reduction = (originalSize - blob.size) / originalSize;
      if (reduction < 0.1) {
        setCompressMessage("The PDF did not compress significantly.");
      } else {
        setCompressMessage("");
      }
    } catch (err) {
      console.error("Error compressing PDF:", err);
      setError("Error compressing PDF: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6 text-center">Compress PDF</h1>
      
      {/* File Upload / Drop Zone */}
      {!selectedFile && (
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 mb-4 transition-colors cursor-pointer bg-gray-800"
        >
          <p className="text-lg text-gray-200 mb-2">
            Drag & drop a PDF here, paste (Ctrl+V), or click to select a file.
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileInputChange}
            ref={fileInputRef}
            className="hidden"
            id="pdfInput"
          />
          <label
            htmlFor="pdfInput"
            className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Browse Files
          </label>
        </div>
      )}
      
      {/* File Info, Document Preview, and Clear Button */}
      {selectedFile && (
        <div className="mb-6 flex flex-col items-center">
          <p className="text-gray-300 mb-2">
            <strong>Loaded:</strong> {selectedFile.name} — Original size: {(originalSize / 1024).toFixed(2)} KB
          </p>
          {firstPagePreview && (
            <div className="flex flex-col items-center border p-4 rounded bg-gray-800">
              <span className="text-sm mb-2">First Page Preview</span>
              <img
                src={firstPagePreview}
                alt="First Page Preview"
                className="w-40 h-40 object-contain border border-gray-600 rounded"
              />
            </div>
          )}
          <button
            onClick={clearFile}
            className="mt-4 px-4 py-2 bg-red-500 rounded hover:bg-red-600 transition-colors"
          >
            Clear File
          </button>
        </div>
      )}
      
      {/* Compress Button */}
      {selectedFile && (
        <div className="text-center mb-4">
          <button
            onClick={compressPdf}
            disabled={loading}
            className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
          >
            {loading ? "Compressing..." : "Compress PDF"}
          </button>
        </div>
      )}
      
      {error && <p className="mb-4 text-red-500 text-center">{error}</p>}
      
      {/* Compressed PDF Download and Message */}
      {compressedBlob && (
        <div className="text-center mt-6">
          <p>
            Compressed size: {(compressedSize / 1024).toFixed(2)} KB
          </p>
          {compressMessage && (
            <p className="text-yellow-400 mt-2">{compressMessage}</p>
          )}
          <button
            onClick={() => {
              const url = URL.createObjectURL(compressedBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "compressed.pdf";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="mt-4 px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
          >
            Download Compressed PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default CompressPdfPage;
