import React, { useState, useEffect, useRef } from 'react';
import FileLoader from "../../components/FileLoader";

function ConvertImagePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [convertedImageUrl, setConvertedImageUrl] = useState(null);
  const [targetFormat, setTargetFormat] = useState('image/png'); // default format
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);

  // When a file is selected, create an object URL for preview.
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // Handle file selection via the FileLoader component.
  const handleFile = (file) => {
    if (file) {
      setSelectedFile(file);
      setConvertedImageUrl(null);
      setError(null);
    }
  };

  // Convert the image using a hidden canvas.
  const handleConvert = () => {
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }
    setLoading(true);
    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      const canvas = canvasRef.current;
      // Use the natural image dimensions for conversion.
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      // Convert the drawn image to a Data URL in the selected format.
      const dataUrl = canvas.toDataURL(targetFormat);
      setConvertedImageUrl(dataUrl);
      setLoading(false);
    };
    img.onerror = () => {
      setError('Error converting image.');
      setLoading(false);
    };
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6">Convert Image Format</h1>

      {/* FileLoader Component for File Selection */}
      <FileLoader onFileSelect={handleFile}>
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 15a4 4 0 004 4h10a4 4 0 004-4V9a4 4 0 00-4-4H7a4 4 0 00-4 4v6z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-3-3-3 3" />
        </svg>
        <p className="mt-4 text-lg text-gray-200">
          Drag & drop an image, paste (Ctrl+V), or click to select
        </p>
      </FileLoader>

      {/* Preview of the Selected Image */}
      {selectedFile && (
        <div className="mt-4 text-center">
          <p>Selected: {selectedFile.name}</p>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="mt-2 max-h-64 mx-auto object-contain rounded border border-gray-700"
            />
          )}
        </div>
      )}

      {/* Format Selection */}
      {selectedFile && (
        <div className="mb-4">
          <label htmlFor="formatSelect" className="mr-2">
            Select target format:
          </label>
          <select
            id="formatSelect"
            value={targetFormat}
            onChange={(e) => setTargetFormat(e.target.value)}
            className="px-2 py-1 text-black rounded"
          >
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/jpg">JPG</option>
            <option value="image/webp">WebP</option>
            <option value="image/avif">AVIF</option>
            <option value="image/gif">GIF</option>
          </select>
        </div>
      )}

      {/* Convert Button */}
      {selectedFile && (
        <button
          onClick={handleConvert}
          className="mb-4 px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
        >
          {loading ? 'Converting...' : 'Convert Image'}
        </button>
      )}

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Converted Image Preview & Download */}
      {convertedImageUrl && (
        <div className="mt-4 text-center">
          <p>Converted Image Preview:</p>
          <img
            src={convertedImageUrl}
            alt="Converted"
            className="mt-2 max-w-full border border-gray-700 rounded"
          />
          <div className="mt-4">
            <a
              href={convertedImageUrl}
              download={`converted_${selectedFile.name
                .split('.')
                .slice(0, -1)
                .join('.')}.${targetFormat.split('/')[1]}`}
              className="inline-block px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
            >
              Download Converted Image
            </a>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  );
}

export default ConvertImagePage;
