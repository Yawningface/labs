"use client";

import React, { useState, useRef, lazy, Suspense } from "react";
import "cropperjs/dist/cropper.css";

// Dynamically import the Cropper component using React.lazy
const Cropper = lazy(() => import("react-cropper"));

function ImageInput({ onImageChange }) {
  const [image, setImage] = useState(null); // Final cropped image URL
  const [croppingImage, setCroppingImage] = useState(null); // Image to be cropped (Base64)
  const cropperRef = useRef(null); // Reference to the Cropper instance

  const handleFileChange = (file) => {
    if (!file.type.startsWith("image/")) {
      console.error("Invalid file type. Please upload an image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Image = reader.result;
      const img = new Image();

      img.onload = () => {
        if (img.width < 460 || img.height < 300) {
          console.error("Image is too small for the cropping dimensions.");
          return;
        }
        setCroppingImage(base64Image); // Valid image for cropping
      };

      img.src = base64Image;
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const croppedCanvas = cropper.getCroppedCanvas({
        width: 460,
        height: 300,
      });

      croppedCanvas.toBlob((blob) => {
        if (!blob) return;
        const croppedImageFile = new File([blob], "cropped-image.png", {
          type: "image/png",
        });
        const croppedImageURL = URL.createObjectURL(blob);

        setImage(croppedImageURL); // Set cropped image preview
        setCroppingImage(null); // Exit cropping mode
        onImageChange(croppedImageFile); // Notify parent component
      });
    }
  };

  return (
    <div className="w-64 border border-gray-300 rounded-lg shadow-lg p-4 flex flex-col">
      {/* Upload or Drag-and-Drop Section */}
      {!image && (
        <div
          className="w-full border-dashed border-2 border-gray-300 flex items-center justify-center relative cursor-pointer hover:border-blue-400"
          style={{ aspectRatio: "460 / 300" }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => handleFileChange(e.target.files[0])}
          />
          <p className="text-gray-500 text-center">
            Drag & drop an image or click to upload
          </p>
        </div>
      )}

      {/* Cropped Image Preview */}
      {image && (
        <div className="flex flex-col items-center space-y-4">
          <img
            src={image}
            alt="Uploaded"
            className="w-full h-full object-cover rounded"
          />
          <button
            onClick={() => {
              setImage(null);
              setCroppingImage(null);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
          >
            Change Image
          </button>
        </div>
      )}

      {/* Cropper Modal */}
      {croppingImage && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-800 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg w-11/12 max-w-md">
            <Suspense fallback={<div>Loading cropper...</div>}>
              <Cropper
                src={croppingImage}
                style={{ width: "100%", maxHeight: "80vh" }}
                aspectRatio={460 / 300}
                guides={true}
                ref={cropperRef}
              />
            </Suspense>
            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={handleCrop}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Crop
              </button>
              <button
                onClick={() => setCroppingImage(null)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageInput;
