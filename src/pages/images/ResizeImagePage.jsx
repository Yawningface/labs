import React, { useState, useRef, useEffect } from 'react';
import FileLoader from '../../components/FileLoader';

function ResizeImagePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [originalWidth, setOriginalWidth] = useState(null);
  const [originalHeight, setOriginalHeight] = useState(null);
  const [resizedWidth, setResizedWidth] = useState('');
  const [resizedHeight, setResizedHeight] = useState('');
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef(null);

  // Create an object URL for preview when a file is selected.
  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // Handle file selection using FileLoader.
  const handleFile = (file) => {
    if (file) {
      setSelectedFile(file);
      setError(null);
      // Load the image to get its dimensions.
      const img = new Image();
      const tempUrl = URL.createObjectURL(file);
      img.src = tempUrl;
      img.onload = () => {
        setOriginalWidth(img.width);
        setOriginalHeight(img.height);
        // Set default resize values to the original dimensions.
        setResizedWidth(img.width);
        setResizedHeight(img.height);
        URL.revokeObjectURL(tempUrl);
      };
      img.onerror = () => {
        setError('Failed to load image.');
        URL.revokeObjectURL(tempUrl);
      };
    }
  };

  // File input change handler (if needed elsewhere)
  const handleFileChange = (e) => {
    setError(null);
    const file = e.target.files[0];
    handleFile(file);
  };

  // Update resizedHeight automatically if "Maintain Aspect Ratio" is enabled.
  useEffect(() => {
    if (maintainAspect && originalWidth && originalHeight && resizedWidth) {
      const newHeight = Math.round((resizedWidth / originalWidth) * originalHeight);
      setResizedHeight(newHeight);
    }
  }, [resizedWidth, maintainAspect, originalWidth, originalHeight]);

  // Resize the image using a hidden canvas.
  const handleResize = () => {
    if (!selectedFile) {
      setError('Please select an image file.');
      return;
    }
    setLoading(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = resizedWidth;
    canvas.height = resizedHeight;

    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, resizedWidth, resizedHeight);
      const dataUrl = canvas.toDataURL();
      setDownloadUrl(dataUrl);
      setLoading(false);
    };
    img.onerror = () => {
      setError('Error loading image for resizing.');
      setLoading(false);
    };
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6">Resize Image</h1>
      
      {/* FileLoader Component for File Selection */}
      <FileLoader onFileSelect={handleFile}>
        <p className="mb-2 text-lg">Drag & drop an image, paste (Ctrl+V), or click to select</p>
      </FileLoader>

      {/* Preview of the Selected Image */}
      {selectedFile && (
        <div className="mt-4 text-center">
          <p>Selected: {selectedFile.name}</p>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="mt-2 max-h-48 mx-auto object-contain rounded border border-gray-700"
            />
          )}
        </div>
      )}

      {/* Resize Options */}
      {selectedFile && (
        <div className="mb-4 flex flex-col items-center">
          <div className="flex gap-4 mb-2">
            <div>
              <label htmlFor="widthInput" className="block mb-1">Width (px):</label>
              <input
                id="widthInput"
                type="number"
                value={resizedWidth}
                onChange={(e) => setResizedWidth(Number(e.target.value))}
                className="px-2 py-1 text-black rounded"
              />
            </div>
            <div>
              <label htmlFor="heightInput" className="block mb-1">Height (px):</label>
              <input
                id="heightInput"
                type="number"
                value={resizedHeight}
                onChange={(e) => setResizedHeight(Number(e.target.value))}
                className="px-2 py-1 text-black rounded"
                disabled={maintainAspect}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="aspectRatioToggle"
              checked={maintainAspect}
              onChange={(e) => setMaintainAspect(e.target.checked)}
              className="accent-blue-500"
            />
            <label htmlFor="aspectRatioToggle">Maintain Aspect Ratio</label>
          </div>
        </div>
      )}

      {/* Resize Button */}
      {selectedFile && (
        <button
          onClick={handleResize}
          className="mb-4 px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
        >
          {loading ? 'Resizing...' : 'Resize Image'}
        </button>
      )}

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Download and Preview Result */}
      {downloadUrl && (
        <div className="mt-4 text-center">
          <p>Resized Image:</p>
          <img
            src={downloadUrl}
            alt="Resized"
            className="mt-2 max-w-full border border-gray-700 rounded"
          />
          <div className="mt-4">
            <a
              href={downloadUrl}
              download={`resized_${selectedFile.name}`}
              className="inline-block px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
            >
              Download Resized Image
            </a>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  );
}

export default ResizeImagePage;
