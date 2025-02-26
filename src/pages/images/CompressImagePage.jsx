import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import FileLoader from "../../components/FileLoader";

const CompressImage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [error, setError] = useState(null);
  const [originalSize, setOriginalSize] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);
  const [loading, setLoading] = useState(false);

  // When a file is selected, create an object URL for preview.
  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      setOriginalSize(selectedFile.size);
      setCompressedFile(null);
      setError(null);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // Handle file selection via FileLoader.
  const handleFile = (file) => {
    if (file) {
      setSelectedFile(file);
    }
  };

  // Compress image using browser-image-compression.
  const handleCompress = async () => {
    if (!selectedFile) {
      setError('Please select an image file.');
      return;
    }
    setLoading(true);
    try {
      // Options to mimic a high-quality compressor (adjust as needed)
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedBlob = await imageCompression(selectedFile, options);
      setCompressedFile(compressedBlob);
      setCompressedSize(compressedBlob.size);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6">Compress Image</h1>

      {/* Use the FileLoader component for file selection */}
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

      {/* Preview of the selected image */}
      {selectedFile && (
        <div className="mt-4">
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

      {/* Compress Button */}
      <button
        onClick={handleCompress}
        className="mb-4 px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
      >
        {loading ? 'Compressing...' : 'Compress Image'}
      </button>

      {/* Error Message */}
      {error && <p className="mb-4 text-red-500">{error}</p>}

      {/* Compressed Image Preview & Details */}
      {compressedFile && (
        <div>
          <p>Original Size: {(originalSize / 1024).toFixed(2)} KB</p>
          <p>Compressed Size: {(compressedSize / 1024).toFixed(2)} KB</p>
          <img
            src={URL.createObjectURL(compressedFile)}
            alt="Compressed"
            className="mt-4 max-w-full border border-gray-700 rounded"
          />
          <div className="mt-4">
            <a
              href={URL.createObjectURL(compressedFile)}
              download={`compressed_${selectedFile.name}`}
              className="inline-block px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
            >
              Download Compressed Image
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompressImage;
