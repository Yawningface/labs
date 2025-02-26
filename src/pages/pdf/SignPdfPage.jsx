import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Configure PDF.js worker using Vite’s URL resolution
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const SignPdfPage = () => {
  // File and viewer state
  const [selectedFile, setSelectedFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDocPreview, setPdfDocPreview] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [signedBlob, setSignedBlob] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Overlays state: each overlay is { id, pageNumber, type, text, fontSize, x, y, color }
  const [overlays, setOverlays] = useState([]);
  
  // Inputs for new overlay
  const [currentOverlayText, setCurrentOverlayText] = useState("");
  const [currentFontSize, setCurrentFontSize] = useState(24);
  const [currentOverlayType, setCurrentOverlayType] = useState("text"); // "text" or "signature"
  const [placementMode, setPlacementMode] = useState(false);
  
  // Signature font bytes loaded from public folder (/GreatVibes-Regular.ttf)
  const [signatureFontBytes, setSignatureFontBytes] = useState(null);
  
  // Refs
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Load the signature font from public folder
  useEffect(() => {
    const loadSignatureFont = async () => {
      try {
        const res = await fetch('/GreatVibes-Regular.ttf');
        const bytes = await res.arrayBuffer();
        setSignatureFontBytes(bytes);
      } catch (err) {
        console.error("Error loading signature font:", err);
        setError("Failed to load signature font. Ensure /GreatVibes-Regular.ttf is a valid TTF file.");
      }
    };
    loadSignatureFont();
  }, []);
  
  // Helper: generate unique id
  const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
  
  // Load the PDF file and render the first page in the viewer.
  const loadPdfFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setTotalPages(pdf.numPages);
      setPdfDocPreview(pdf);
      setCurrentPage(1);
      renderPage(1, pdf);
    } catch (err) {
      console.error("Error loading PDF file:", err);
      setError("Failed to load PDF file.");
    }
  };
  
  // Render a specific page onto the canvas.
  const renderPage = async (pageNumber, pdfDoc = pdfDocPreview) => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const scale = 1.0; // Adjust scale as needed.
      const viewport = page.getViewport({ scale });
      const offscreen = document.createElement('canvas');
      offscreen.width = viewport.width;
      offscreen.height = viewport.height;
      const offscreenContext = offscreen.getContext('2d');
      await page.render({ canvasContext: offscreenContext, viewport }).promise;
      const canvas = canvasRef.current;
      canvas.width = offscreen.width;
      canvas.height = offscreen.height;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(offscreen, 0, 0);
    } catch (err) {
      console.error("Error rendering page:", err);
      setError("Failed to render page.");
    }
  };
  
  // File input handler
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setOverlays([]);
      setSignedBlob(null);
      setError(null);
      loadPdfFile(file);
    }
  };
  
  // Common file loader for drag-drop and paste
  const loadFile = (file) => {
    setSelectedFile(file);
    setOverlays([]);
    setSignedBlob(null);
    setError(null);
    loadPdfFile(file);
  };
  
  // Drag-and-drop handlers
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };
  
  // Paste handler
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
  
  // Clear file and reset state
  const clearFile = () => {
    setSelectedFile(null);
    setTotalPages(0);
    setPdfDocPreview(null);
    setCurrentPage(1);
    setOverlays([]);
    setSignedBlob(null);
    setError(null);
  };
  
  // Page navigation
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      renderPage(newPage);
    }
  };
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      renderPage(newPage);
    }
  };
  
  // Enable placement mode for new overlay.
  const enablePlacementMode = () => {
    if (!currentOverlayText.trim()) {
      setError("Please enter the text for your overlay.");
      return;
    }
    setPlacementMode(true);
    setError(null);
  };
  
  // When canvas is clicked in placement mode, record overlay position.
  const handleCanvasClick = (e) => {
    if (!placementMode) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newOverlay = {
      id: generateId(),
      pageNumber: currentPage,
      type: currentOverlayType, // "text" or "signature"
      text: currentOverlayText,
      fontSize: currentFontSize,
      color: 'black',
      x,
      y,
    };
    setOverlays(prev => [...prev, newOverlay]);
    setPlacementMode(false);
  };
  
  // Update overlay position after dragging.
  const updateOverlayPosition = (id, x, y) => {
    setOverlays(prev => prev.map(ov => (ov.id === id ? { ...ov, x, y } : ov)));
  };
  
  // Remove an overlay.
  const removeOverlay = (id) => {
    setOverlays(prev => prev.filter(ov => ov.id !== id));
  };
  
  // Sign the PDF by embedding overlays using pdf-lib.
  const signPdf = async () => {
    if (!selectedFile) {
      setError("Please upload a PDF file first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      // Register fontkit for custom fonts.
      pdfDoc.registerFontkit(fontkit);
      // Embed standard text font (TimesRoman).
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      // Embed the custom signature font if available.
      let customSignatureFont = timesRomanFont;
      if (signatureFontBytes) {
        try {
          customSignatureFont = await pdfDoc.embedFont(signatureFontBytes);
        } catch (err) {
          console.error("Error embedding signature font, falling back:", err);
          setError("Error embedding signature font. Ensure that /GreatVibes-Regular.ttf is a valid TTF/OTF file.");
          customSignatureFont = timesRomanFont;
        }
      }
      // Process overlays for each page.
      for (let p = 1; p <= totalPages; p++) {
        const page = pdfDoc.getPage(p - 1);
        const { width, height } = page.getSize();
        const pageOverlays = overlays.filter(ov => ov.pageNumber === p);
        for (const ov of pageOverlays) {
          const font = (ov.type === "signature") ? customSignatureFont : timesRomanFont;
          // Adjust vertical position: subtract a portion of the font size so the text's bottom aligns.
          const pdfY = height - ov.y - ov.fontSize * 0.8;
          page.drawText(ov.text, {
            x: ov.x,
            y: pdfY,
            size: ov.fontSize,
            font,
            color: rgb(0, 0, 0),
          });
        }
      }
      const signedPdfBytes = await pdfDoc.save();
      setSignedBlob(new Blob([signedPdfBytes], { type: "application/pdf" }));
    } catch (err) {
      console.error("Error signing PDF:", err);
      setError("Error signing PDF: " + err.message);
    }
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6 text-center">Sign PDF</h1>
      
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
      
      {/* File Info and Clear File Button */}
      {selectedFile && (
        <div className="mb-4 text-center">
          <p>
            <strong>Loaded:</strong> {selectedFile.name} — Total pages: {totalPages}
          </p>
          <button
            onClick={clearFile}
            className="mt-2 px-4 py-2 bg-red-500 rounded hover:bg-red-600 transition-colors"
          >
            Clear File
          </button>
        </div>
      )}
      
      {/* PDF Viewer with Page Navigation */}
      {selectedFile && pdfDocPreview && (
        <div className="mb-6">
          <div className="flex justify-center mb-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors mr-2"
            >
              Previous
            </button>
            <span className="self-center">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors ml-2"
            >
              Next
            </button>
          </div>
          <div className="relative border border-gray-600 rounded inline-block">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-crosshair"
            />
            {/* Render overlays as draggable elements */}
            {overlays.filter(ov => ov.pageNumber === currentPage).map(ov => (
              <Draggable
                key={ov.id}
                position={{ x: ov.x, y: ov.y }}
                onStop={(e, data) => updateOverlayPosition(ov.id, data.x, data.y)}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    cursor: 'move',
                    userSelect: 'none',
                    color: ov.color,
                    fontSize: ov.fontSize,
                    fontFamily: ov.type === 'signature' ? "'Great Vibes', cursive" : 'Times-Roman, serif'
                  }}
                >
                  {ov.text}
                  <button
                    onClick={() => removeOverlay(ov.id)}
                    style={{
                      marginLeft: 4,
                      color: 'red',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ×
                  </button>
                </div>
              </Draggable>
            ))}
          </div>
        </div>
      )}
      
      {/* Overlay Input Controls */}
      {selectedFile && (
        <div className="mb-4 text-center">
          <input
            type="text"
            value={currentOverlayText}
            onChange={(e) => setCurrentOverlayText(e.target.value)}
            placeholder="Enter text or signature"
            className="p-2 rounded text-black w-64"
          />
          <input
            type="number"
            value={currentFontSize}
            onChange={(e) => setCurrentFontSize(parseInt(e.target.value, 10))}
            placeholder="Font Size"
            className="p-2 rounded text-black w-24 ml-4"
          />
          <select
            value={currentOverlayType}
            onChange={(e) => setCurrentOverlayType(e.target.value)}
            className="p-2 rounded text-black ml-4"
          >
            <option value="text">Text</option>
            <option value="signature">Signature</option>
          </select>
          <button
            onClick={enablePlacementMode}
            className="ml-4 px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
          >
            Add Overlay
          </button>
          {placementMode && (
            <p className="mt-2 text-yellow-400">Click on the PDF to place the overlay</p>
          )}
        </div>
      )}
      
      {/* List of Overlays */}
      {selectedFile && overlays.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xl text-center mb-2">Overlays</h2>
          <ul className="space-y-2">
            {overlays.map((ov) => (
              <li key={ov.id} className="text-center">
                {ov.text} (Size: {ov.fontSize}px) on Page {ov.pageNumber} at ({Math.round(ov.x)}, {Math.round(ov.y)})
                <button
                  onClick={() => removeOverlay(ov.id)}
                  className="ml-2 text-red-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Sign PDF Button */}
      {selectedFile && (
        <div className="text-center mb-4">
          <button
            onClick={signPdf}
            disabled={loading}
            className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
          >
            {loading ? "Signing PDF..." : "Sign PDF"}
          </button>
        </div>
      )}
      
      {error && <p className="mb-4 text-red-500 text-center">{error}</p>}
      
      {/* Download Signed PDF */}
      {signedBlob && (
        <div className="text-center mt-6">
          <button
            onClick={() => {
              const url = URL.createObjectURL(signedBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "signed.pdf";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            className="mt-4 px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
          >
            Download Signed PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default SignPdfPage;
