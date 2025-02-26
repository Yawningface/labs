import React, { useState, useRef, useEffect } from 'react';
import FileLoader from '../../components/FileLoader';

function TurnImagePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [angle, setAngle] = useState(0);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const canvasRef = useRef(null);

  // Handle file selection using FileLoader.
  const handleFile = (file) => {
    if (file) {
      setSelectedFile(file);
      setAngle(0); // Reset rotation when a new image is loaded
      setError(null);
    }
  };

  // Draw the rotated image on the canvas.
  const drawRotatedImage = (img, angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const radians = angle * (Math.PI / 180);

    // Calculate new bounding box dimensions.
    const width = img.width;
    const height = img.height;
    const newWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
    const newHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));

    // Set canvas size to the new bounding box dimensions.
    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.clearRect(0, 0, newWidth, newHeight);
    ctx.translate(newWidth / 2, newHeight / 2);
    ctx.rotate(radians);
    ctx.drawImage(img, -width / 2, -height / 2);
    ctx.resetTransform();

    // Update the download URL from the canvas content.
    setDownloadUrl(canvas.toDataURL());
  };

  // Redraw the canvas whenever the file or angle changes.
  useEffect(() => {
    if (!selectedFile) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(selectedFile);
    img.src = objectUrl;
    img.onload = () => {
      drawRotatedImage(img, angle);
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      setError('Failed to load image.');
    };
  }, [selectedFile, angle]);

  // Rotate left/right by 90° increments.
  const rotateLeft = () => setAngle((prev) => prev - 90);
  const rotateRight = () => setAngle((prev) => prev + 90);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <h1 className="text-3xl mb-6">Turn Image</h1>
      
      {/* FileLoader Component for File Selection */}
      <FileLoader onFileSelect={handleFile}>
        <p className="mb-2">
          Drag & drop an image here, paste it (Ctrl+V), or click to select
        </p>
      </FileLoader>

      {selectedFile && <p className="mt-2">Selected: {selectedFile.name}</p>}

      {/* Canvas Preview & Controls */}
      {selectedFile && (
        <>
          {/* Container to limit canvas display size */}
          <div className="mb-4" style={{ maxWidth: '300px', maxHeight: '300px', width: '100%', margin: '0 auto' }}>
            <canvas
              ref={canvasRef}
              className="border border-gray-700 rounded"
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
          <div className="flex gap-4 mb-4">
            <button
              onClick={rotateLeft}
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
            >
              Rotate Left
            </button>
            <button
              onClick={rotateRight}
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
            >
              Rotate Right
            </button>
          </div>
          {/* Custom Rotation Slider */}
          <div className="flex flex-col items-center mb-4">
            <label htmlFor="angleSlider" className="mb-2">
              Custom Rotation: {angle}°
            </label>
            <input
              type="range"
              id="angleSlider"
              min="0"
              max="360"
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-64"
            />
          </div>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={`turned_${selectedFile.name}`}
              className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
            >
              Download Rotated Image
            </a>
          )}
        </>
      )}

      {/* Error Message */}
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  );
}

export default TurnImagePage;
