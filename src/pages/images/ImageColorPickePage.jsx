import React, { useState, useRef, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import FileLoader from "../../components/FileLoader";

// Helper to convert an RGB color to HEX.
const rgbToHex = (r, g, b) =>
  "#" +
  [r, g, b]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

// Helper to convert RGB to HSL.
const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(
    l * 100
  )}%)`;
};

const ImageColorPickerPage = () => {
  const [colorInfo, setColorInfo] = useState({
    r: null,
    g: null,
    b: null,
    a: null,
    rgb: "",
    hex: "",
    hsl: ""
  });
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  const canvasRef = useRef(null);

  // When an image file is set, create an object URL.
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      // Reset color info when a new image is loaded.
      setColorInfo({ r: null, g: null, b: null, a: null, rgb: "", hex: "", hsl: "" });
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  // When the imageUrl is set, load the image and draw it on the canvas.
  useEffect(() => {
    if (imageUrl) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        // Maximum dimensions for the canvas image.
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 450;
        let width = img.width;
        let height = img.height;

        // Scale down if necessary while preserving aspect ratio.
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  // When the user clicks on the canvas, extract the pixel color.
  const handleCanvasClick = (e) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    const ctx = canvasRef.current.getContext("2d");
    const pixelData = ctx.getImageData(x, y, 1, 1).data;
    const [r, g, b, a] = pixelData;
    const rgb = `rgb(${r}, ${g}, ${b})`;
    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);
    setColorInfo({ r, g, b, a, rgb, hex, hsl });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6">Image Color Picker</h1>

      {/* FileLoader Component for File Selection */}
      <FileLoader onFileSelect={setImageFile}>
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
      {imageFile && (
        <div className="mt-4">
          <p>Selected: {imageFile.name}</p>
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Preview"
              className="mt-2 max-h-24 mx-auto object-contain rounded border border-gray-700"
            />
          )}
        </div>
      )}

      {/* Always-visible Color Info Box */}
      <div className="mt-4 mb-4 p-4 border border-gray-700 rounded bg-gray-800 flex items-center">
        <div
          style={{ backgroundColor: colorInfo.hex || "transparent" }}
          className="w-10 h-10 rounded mr-4 border border-gray-600"
        />
        <div>
          <p>
            <strong>RGB:</strong> {colorInfo.rgb || "N/A"}
          </p>
          <p>
            <strong>HEX:</strong> {colorInfo.hex || "N/A"}
          </p>
          <p>
            <strong>HSL:</strong> {colorInfo.hsl || "N/A"}
          </p>
        </div>
      </div>

      {/* Zoomable Canvas for Color Picking */}
      {imageUrl && (
        <div className="mt-4">
          <TransformWrapper>
            <TransformComponent>
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="border border-gray-600 rounded cursor-crosshair"
              />
            </TransformComponent>
          </TransformWrapper>
        </div>
      )}
    </div>
  );
};

export default ImageColorPickerPage;
