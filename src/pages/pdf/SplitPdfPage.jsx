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

const SplitPdfPage = () => {
  // File and PDF info states
  const [selectedFile, setSelectedFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  // Cache the loaded PDF for on-demand previews
  const [pdfDocPreview, setPdfDocPreview] = useState(null);
  // Previews for the very first and last page of the document
  const [firstPagePreview, setFirstPagePreview] = useState(null);
  const [lastPagePreview, setLastPagePreview] = useState(null);

  // Splitting mode: "custom", "fixed", or "extract"
  const [splittingMode, setSplittingMode] = useState("custom");
  
  // For custom mode: array of { start, end, previewData?: { first, last } }
  const [customRanges, setCustomRanges] = useState([]);
  
  // For fixed mode: pages per split (number)
  const [fixedRangeSize, setFixedRangeSize] = useState(2);
  
  // For extract mode: an array of selected page numbers (1-indexed)
  const [extractPages, setExtractPages] = useState([]);
  
  // Option to merge output (for custom and extract modes)
  const [mergeOutput, setMergeOutput] = useState(false);
  
  // Split results: each result is { id, blob, label }
  const [splitResults, setSplitResults] = useState([]);
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Ref for drop zone
  const dropZoneRef = useRef(null);
  
  // Helper: generate a unique id
  const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
  
  // Scale factor for previews
  const previewScale = 1.0;
  
  // Generate a preview image for a given page number from a given PDF document
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
  
  // Load PDF info (total pages) and generate first and last page previews
  const loadPdfInfo = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setTotalPages(pdf.numPages);
      setPdfDocPreview(pdf);
      const firstPreview = await generatePagePreview(pdf, 1);
      const lastPreview = await generatePagePreview(pdf, pdf.numPages);
      setFirstPagePreview(firstPreview);
      setLastPagePreview(lastPreview);
    } catch (err) {
      console.error("Error loading PDF info:", err);
      setError("Failed to load PDF file.");
    }
  };
  
  // File input handler
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      loadPdfInfo(file);
      // Reset previous settings and results
      setCustomRanges([]);
      setExtractPages([]);
      setSplitResults([]);
      setError(null);
    }
  };
  
  // Drop zone and paste handlers
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      loadPdfInfo(file);
      setCustomRanges([]);
      setExtractPages([]);
      setSplitResults([]);
      setError(null);
    }
  };
  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files[0]) {
      const file = e.clipboardData.files[0];
      setSelectedFile(file);
      loadPdfInfo(file);
      setCustomRanges([]);
      setExtractPages([]);
      setSplitResults([]);
      setError(null);
    }
  };
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener('paste', handlePaste);
      return () => dropZone.removeEventListener('paste', handlePaste);
    }
  }, []);
  
  // Clear the loaded file and all related states
  const clearFile = () => {
    setSelectedFile(null);
    setTotalPages(0);
    setPdfDocPreview(null);
    setFirstPagePreview(null);
    setLastPagePreview(null);
    setCustomRanges([]);
    setExtractPages([]);
    setSplitResults([]);
    setError(null);
  };
  
  // --- Custom Range Handlers ---
  const addCustomRange = () => {
    setCustomRanges(prev => [...prev, { start: "", end: "" }]);
  };
  const updateCustomRange = (index, field, value) => {
    const newRanges = [...customRanges];
    newRanges[index][field] = value;
    setCustomRanges(newRanges);
  };
  const removeCustomRange = (index) => {
    setCustomRanges(prev => prev.filter((_, i) => i !== index));
  };
  
  // When user clicks "Preview Range", generate thumbnails for the first and last pages of the range.
  const previewCustomRange = async (index) => {
    const range = customRanges[index];
    const start = parseInt(range.start, 10);
    const end = parseInt(range.end, 10);
    if (
      isNaN(start) ||
      isNaN(end) ||
      start < 1 ||
      end > totalPages ||
      start > end
    ) {
      setError(`Invalid range values. Pages must be between 1 and ${totalPages} and in proper order.`);
      return;
    }
    try {
      const scale = 1.0;
      const firstPreview = await generatePagePreview(pdfDocPreview, start, scale);
      const lastPreview = await generatePagePreview(pdfDocPreview, end, scale);
      const newRanges = [...customRanges];
      newRanges[index].previewData = { first: firstPreview, last: lastPreview };
      setCustomRanges(newRanges);
      setError(null);
    } catch (err) {
      console.error("Error generating range preview:", err);
      setError("Failed to generate preview for the selected range.");
    }
  };
  
  // For extract mode: toggle a page’s selection
  const toggleExtractPage = (pageNumber) => {
    if (extractPages.includes(pageNumber)) {
      setExtractPages(prev => prev.filter(p => p !== pageNumber));
    } else {
      setExtractPages(prev => [...prev, pageNumber]);
    }
  };
  
  // --- Splitting Process ---
  const splitPdf = async () => {
    if (!selectedFile) {
      setError("Please upload a PDF file first.");
      return;
    }
    setLoading(true);
    setError(null);
    setSplitResults([]);
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const srcPdf = await PDFDocument.load(arrayBuffer);
      let results = [];
      
      if (splittingMode === "custom") {
        if (customRanges.length === 0) {
          setError("Please add at least one range.");
          setLoading(false);
          return;
        }
        if (mergeOutput) {
          // Merge all ranges into one PDF
          const mergedPdf = await PDFDocument.create();
          let rangeLabels = [];
          for (const range of customRanges) {
            const start = parseInt(range.start, 10);
            const end = parseInt(range.end, 10);
            if (
              isNaN(start) ||
              isNaN(end) ||
              start < 1 ||
              end > totalPages ||
              start > end
            ) {
              setError("Invalid range values.");
              setLoading(false);
              return;
            }
            const indices = [];
            for (let i = start - 1; i < end; i++) {
              indices.push(i);
            }
            const pages = await mergedPdf.copyPages(srcPdf, indices);
            pages.forEach(page => mergedPdf.addPage(page));
            rangeLabels.push(`Pages ${start}-${end}`);
          }
          const mergedBytes = await mergedPdf.save();
          results.push({
            id: "merged_custom",
            blob: new Blob([mergedBytes], { type: "application/pdf" }),
            label: rangeLabels.join(", ")
          });
        } else {
          // Create separate PDFs for each custom range
          for (const range of customRanges) {
            const start = parseInt(range.start, 10);
            const end = parseInt(range.end, 10);
            if (
              isNaN(start) ||
              isNaN(end) ||
              start < 1 ||
              end > totalPages ||
              start > end
            ) {
              setError("Invalid range values.");
              setLoading(false);
              return;
            }
            const newPdf = await PDFDocument.create();
            const indices = [];
            for (let i = start - 1; i < end; i++) {
              indices.push(i);
            }
            const pages = await newPdf.copyPages(srcPdf, indices);
            pages.forEach(page => newPdf.addPage(page));
            const pdfBytes = await newPdf.save();
            results.push({
              id: generateId(),
              blob: new Blob([pdfBytes], { type: "application/pdf" }),
              label: `Pages ${start}-${end}`
            });
          }
        }
      } else if (splittingMode === "fixed") {
        if (!fixedRangeSize || fixedRangeSize < 1) {
          setError("Please enter a valid number for pages per split.");
          setLoading(false);
          return;
        }
        // Create chunks for the entire PDF
        const chunks = [];
        for (let start = 1; start <= totalPages; start += fixedRangeSize) {
          const end = Math.min(start + fixedRangeSize - 1, totalPages);
          chunks.push({ start, end });
        }
        for (const chunk of chunks) {
          const newPdf = await PDFDocument.create();
          const indices = [];
          for (let i = chunk.start - 1; i < chunk.end; i++) {
            indices.push(i);
          }
          const pages = await newPdf.copyPages(srcPdf, indices);
          pages.forEach(page => newPdf.addPage(page));
          const pdfBytes = await newPdf.save();
          results.push({
            id: generateId(),
            blob: new Blob([pdfBytes], { type: "application/pdf" }),
            label: `Pages ${chunk.start}-${chunk.end}`
          });
        }
      } else if (splittingMode === "extract") {
        if (extractPages.length === 0) {
          setError("Please select at least one page to extract.");
          setLoading(false);
          return;
        }
        // Sort selected pages
        const sortedPages = [...extractPages].sort((a, b) => a - b);
        if (mergeOutput) {
          const mergedPdf = await PDFDocument.create();
          for (const pageNum of sortedPages) {
            if (pageNum < 1 || pageNum > totalPages) continue;
            const pages = await mergedPdf.copyPages(srcPdf, [pageNum - 1]);
            mergedPdf.addPage(pages[0]);
          }
          const mergedBytes = await mergedPdf.save();
          results.push({
            id: "merged_extract",
            blob: new Blob([mergedBytes], { type: "application/pdf" }),
            label: `Extracted Pages: ${sortedPages.join(", ")}`
          });
        } else {
          for (const pageNum of sortedPages) {
            if (pageNum < 1 || pageNum > totalPages) continue;
            const newPdf = await PDFDocument.create();
            const pages = await newPdf.copyPages(srcPdf, [pageNum - 1]);
            newPdf.addPage(pages[0]);
            const pdfBytes = await newPdf.save();
            results.push({
              id: generateId(),
              blob: new Blob([pdfBytes], { type: "application/pdf" }),
              label: `Page ${pageNum}`
            });
          }
        }
      }
      
      setSplitResults(results);
    } catch (err) {
      console.error("Error splitting PDF:", err);
      setError("Error splitting PDF: " + err.message);
    }
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6 text-center">Split PDF</h1>
      
      {/* Document Preview and File Info */}
      {selectedFile && (
        <div className="mb-6 flex flex-col items-center">
          <p className="text-gray-300 mb-2">
            <strong>Loaded:</strong> {selectedFile.name} — Total pages: {totalPages}
          </p>
          <div className="flex items-center justify-center border p-4 rounded bg-gray-800 space-x-4">
            <div className="text-center">
              <span className="text-sm">First Page</span>
              {firstPagePreview && (
                <img src={firstPagePreview} alt="First Page Preview" className="w-20 h-20 object-contain border border-gray-600 rounded mt-1" />
              )}
            </div>
            <div className="text-3xl">...</div>
            <div className="text-center">
              <span className="text-sm">Last Page</span>
              {lastPagePreview && (
                <img src={lastPagePreview} alt="Last Page Preview" className="w-20 h-20 object-contain border border-gray-600 rounded mt-1" />
              )}
            </div>
          </div>
          <button
            onClick={clearFile}
            className="mt-4 px-4 py-2 bg-red-500 rounded hover:bg-red-600 transition-colors"
          >
            Clear File
          </button>
        </div>
      )}
      
      {/* File Upload / Drop Zone (shown if no file is loaded) */}
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
          <input type="file" accept="application/pdf" onChange={handleFileInputChange} className="hidden" id="pdfInput" />
          <label htmlFor="pdfInput" className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors cursor-pointer">
            Browse Files
          </label>
        </div>
      )}
      
      {/* Splitting Mode Selection and Settings */}
      {selectedFile && (
        <div className="mb-4 space-y-4">
          <div>
            <label className="mr-4">
              <input
                type="radio"
                name="mode"
                value="custom"
                checked={splittingMode === "custom"}
                onChange={(e) => setSplittingMode(e.target.value)}
              />{" "}
              Custom Ranges
            </label>
            <label className="mr-4">
              <input
                type="radio"
                name="mode"
                value="fixed"
                checked={splittingMode === "fixed"}
                onChange={(e) => setSplittingMode(e.target.value)}
              />{" "}
              Fixed Ranges
            </label>
            <label>
              <input
                type="radio"
                name="mode"
                value="extract"
                checked={splittingMode === "extract"}
                onChange={(e) => setSplittingMode(e.target.value)}
              />{" "}
              Extract Pages
            </label>
          </div>
          
          {/* Settings for Custom Ranges */}
          {splittingMode === "custom" && (
            <div className="border p-4 rounded bg-gray-800">
              <h2 className="text-xl mb-2">Custom Ranges</h2>
              {customRanges.map((range, index) => (
                <div key={index} className="mb-4 border p-2 rounded bg-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      placeholder="From"
                      value={range.start}
                      onChange={(e) => updateCustomRange(index, "start", e.target.value)}
                      className="p-1 rounded text-black w-20"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      placeholder="To"
                      value={range.end}
                      onChange={(e) => updateCustomRange(index, "end", e.target.value)}
                      className="p-1 rounded text-black w-20"
                    />
                    <button
                      onClick={() => removeCustomRange(index)}
                      className="px-2 py-1 bg-red-500 rounded hover:bg-red-600 text-sm"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => previewCustomRange(index)}
                      className="px-2 py-1 bg-blue-500 rounded hover:bg-blue-600 text-sm"
                    >
                      Preview Range
                    </button>
                  </div>
                  {range.previewData && (
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <span className="text-sm">Start Page</span>
                        <img src={range.previewData.first} alt="Start Preview" className="w-20 h-20 object-contain border border-gray-600 rounded mt-1" />
                      </div>
                      <div className="text-3xl">...</div>
                      <div className="text-center">
                        <span className="text-sm">End Page</span>
                        <img src={range.previewData.last} alt="End Preview" className="w-20 h-20 object-contain border border-gray-600 rounded mt-1" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={addCustomRange}
                className="mt-2 px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
              >
                Add Range
              </button>
              <div className="mt-2">
                <label>
                  <input
                    type="checkbox"
                    checked={mergeOutput}
                    onChange={(e) => setMergeOutput(e.target.checked)}
                  />{" "}
                  Merge output into one PDF
                </label>
              </div>
            </div>
          )}
          
          {/* Settings for Fixed Ranges */}
          {splittingMode === "fixed" && (
            <div className="border p-4 rounded bg-gray-800">
              <h2 className="text-xl mb-2">Fixed Range Settings</h2>
              <label>
                Pages per split:{" "}
                <input
                  type="number"
                  min="1"
                  value={fixedRangeSize}
                  onChange={(e) => setFixedRangeSize(parseInt(e.target.value, 10))}
                  className="p-1 rounded text-black w-20"
                />
              </label>
            </div>
          )}
          
          {/* Settings for Extract Mode */}
          {splittingMode === "extract" && (
            <div className="border p-4 rounded bg-gray-800">
              <h2 className="text-xl mb-2">Extract Pages</h2>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <label key={pageNum} className="flex items-center space-x-1 text-sm">
                    <input
                      type="checkbox"
                      checked={extractPages.includes(pageNum)}
                      onChange={() => toggleExtractPage(pageNum)}
                    />
                    <span>{pageNum}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2">
                <label>
                  <input
                    type="checkbox"
                    checked={mergeOutput}
                    onChange={(e) => setMergeOutput(e.target.checked)}
                  />{" "}
                  Merge extracted pages into one PDF
                </label>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Split PDF Button */}
      {selectedFile && (
        <button
          onClick={splitPdf}
          disabled={loading}
          className="mb-4 px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
        >
          {loading ? "Splitting PDF..." : "Split PDF"}
        </button>
      )}
      
      {error && <p className="mb-4 text-red-500">{error}</p>}
      
      {/* Display Split Results */}
      {splitResults.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl mb-4">Split Results</h2>
          <div className="space-y-4">
            {splitResults.map(result => (
              <div key={result.id} className="p-4 border rounded bg-gray-800 flex items-center justify-between">
                <span>{result.label}</span>
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(result.blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `${result.label}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SplitPdfPage;
