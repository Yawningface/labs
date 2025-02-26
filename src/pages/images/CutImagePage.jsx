import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import FileLoader from '../../components/FileLoader';

function CutImagePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  // No aspect ratio constraint by default; the user can crop freely.
  const [crop, setCrop] = useState({ unit: '%', width: 50 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);

  const imageRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Handle file selection via FileLoader.
  const handleFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Generate cropped image using a hidden canvas.
  const generateCroppedImage = useCallback(() => {
    if (!completedCrop || !imageRef.current || !previewCanvasRef.current) {
      return;
    }
    const image = imageRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    // Calculate scaling between natural size and displayed size.
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    // Convert the canvas to a Blob and set as URL for download.
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCroppedImageUrl(url);
      }
    }, 'image/jpeg', 1);
  }, [completedCrop]);

  useEffect(() => {
    generateCroppedImage();
  }, [completedCrop, generateCroppedImage]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6">Cut Image</h1>

      {/* Use FileLoader for file selection */}
      <FileLoader onFileSelect={handleFile}>
        <p className="mb-2 text-lg">
          Drag & drop an image, paste (Ctrl+V), or click to select
        </p>
      </FileLoader>

      {/* Visual Crop Tool */}
      {imageSrc && (
        <div className="mb-6">
          <ReactCrop
            src={imageSrc}
            crop={crop}
            onImageLoaded={(img) => { imageRef.current = img; }}
            onChange={(newCrop) => setCrop(newCrop)}
            onComplete={(c) => setCompletedCrop(c)}
          />
        </div>
      )}

      {/* Cropped Image Preview & Download */}
      {completedCrop && (
        <div className="text-center">
          <h2 className="text-xl mb-4">Cropped Image Preview</h2>
          <canvas
            ref={previewCanvasRef}
            className="border border-gray-700 rounded mb-4"
            style={{ maxWidth: '100%' }}
          />
          {croppedImageUrl && (
            <a
              href={croppedImageUrl}
              download={`cropped_${selectedFile && selectedFile.name}`}
              className="inline-block px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
            >
              Download Cropped Image
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default CutImagePage;
