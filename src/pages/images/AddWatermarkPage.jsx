import React, { useState, useRef, useEffect } from "react";
import FileLoader from "../../components/FileLoader";

function AddWatermarkPage() {
  // Main image states
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  // Watermark selection
  const [watermarkType, setWatermarkType] = useState("text"); // "text" or "image"

  // For text watermark:
  const [watermarkText, setWatermarkText] = useState("Watermark");
  const [textSize, setTextSize] = useState(48); // in pixels
  const [watermarkColor, setWatermarkColor] = useState("#ffffff"); // default white

  // For image watermark:
  const [watermarkImage, setWatermarkImage] = useState(null);
  const [watermarkImageUrl, setWatermarkImageUrl] = useState(null);
  const [watermarkImageScale, setWatermarkImageScale] = useState(30); // as percentage of main image width

  // Common watermark placement:
  const [watermarkPosition, setWatermarkPosition] = useState("bottom-right"); // options: top-left, top-right, bottom-left, bottom-right, center

  // Watermark opacity (0 to 1)
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);

  // Final watermarked image result
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);

  // Ref for hidden canvas (for processing)
  const canvasRef = useRef(null);

  // ---------------------
  // Main Image Handlers
  // ---------------------
  const handleMainImageFile = (file) => {
    if (file) {
      setSelectedImage(file);
      setResultUrl(null);
      setError(null);
    }
  };

  // ---------------------
  // Watermark Image Handlers (for image watermark type)
  // ---------------------
  const handleWatermarkImageFile = (file) => {
    if (file) {
      setWatermarkImage(file);
      setResultUrl(null);
      setError(null);
    }
  };

  // ---------------------
  // Update Preview URLs
  // ---------------------
  useEffect(() => {
    if (selectedImage) {
      const url = URL.createObjectURL(selectedImage);
      setSelectedImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setSelectedImageUrl(null);
    }
  }, [selectedImage]);

  useEffect(() => {
    if (watermarkImage) {
      const url = URL.createObjectURL(watermarkImage);
      setWatermarkImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setWatermarkImageUrl(null);
    }
  }, [watermarkImage]);

  // ---------------------
  // Add Watermark Function
  // ---------------------
  const handleAddWatermark = () => {
    if (!selectedImage) {
      setError("Please select a main image first.");
      return;
    }
    setError(null);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const mainImg = new Image();
    mainImg.src = selectedImageUrl;
    mainImg.onload = () => {
      // Set canvas dimensions to match main image
      canvas.width = mainImg.naturalWidth;
      canvas.height = mainImg.naturalHeight;
      ctx.drawImage(mainImg, 0, 0);

      const padding = 10;
      let x = 0,
        y = 0;

      // Helper: calculate watermark position based on chosen option.
      const calculatePosition = (elementWidth, elementHeight) => {
        switch (watermarkPosition) {
          case "top-left":
            return { x: padding, y: padding + elementHeight };
          case "top-right":
            return { x: canvas.width - elementWidth - padding, y: padding + elementHeight };
          case "bottom-left":
            return { x: padding, y: canvas.height - padding };
          case "bottom-right":
            return { x: canvas.width - elementWidth - padding, y: canvas.height - padding };
          case "center":
            return { x: (canvas.width - elementWidth) / 2, y: (canvas.height + elementHeight) / 2 };
          default:
            return { x: canvas.width - elementWidth - padding, y: canvas.height - padding };
        }
      };

      if (watermarkType === "text") {
        // Set up text watermark properties.
        ctx.font = `${textSize}px sans-serif`;
        const previousAlpha = ctx.globalAlpha;
        ctx.globalAlpha = watermarkOpacity;
        ctx.fillStyle = watermarkColor;
        ctx.textBaseline = "bottom";
        const textWidth = ctx.measureText(watermarkText).width;
        const textHeight = textSize; // approximate height
        ({ x, y } = calculatePosition(textWidth, textHeight));
        ctx.fillText(watermarkText, x, y);
        // Optional stroke for contrast.
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.strokeText(watermarkText, x, y);
        ctx.globalAlpha = previousAlpha;
        // Generate PNG output
        setResultUrl(canvas.toDataURL("image/png"));
      } else if (watermarkType === "image") {
        if (!watermarkImageUrl) {
          setError("Please select a watermark image.");
          return;
        }
        const wmImg = new Image();
        wmImg.src = watermarkImageUrl;
        wmImg.onload = () => {
          // Determine watermark image size based on watermarkImageScale (percentage of main image width)
          const scale = watermarkImageScale / 100;
          const wmWidth = wmImg.naturalWidth * scale;
          const wmHeight = wmImg.naturalHeight * scale;
          ({ x, y } = calculatePosition(wmWidth, wmHeight));
          const previousAlpha = ctx.globalAlpha;
          ctx.globalAlpha = watermarkOpacity;
          // Adjust y to align watermark properly (assuming bottom alignment for the watermark image)
          ctx.drawImage(wmImg, x, y - wmHeight, wmWidth, wmHeight);
          ctx.globalAlpha = previousAlpha;
          setResultUrl(canvas.toDataURL("image/png"));
        };
        wmImg.onerror = () => {
          setError("Error loading watermark image.");
        };
      }
    };
    mainImg.onerror = () => {
      setError("Error loading main image.");
    };
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6">Add Watermark</h1>

      {/* Main Image Loader */}
      <FileLoader onFileSelect={handleMainImageFile}>
        <p className="mb-2 text-lg">
          Drag & drop your main image, paste (Ctrl+V), or click to select
        </p>
        {selectedImageUrl && (
          <img
            src={selectedImageUrl}
            alt="Main Preview"
            className="mt-4 max-h-64 object-contain rounded border border-gray-700"
          />
        )}
      </FileLoader>

      {/* Watermark Type Selection */}
      <div className="mb-4">
        <label className="block mb-2">Watermark Type:</label>
        <select
          value={watermarkType}
          onChange={(e) => {
            setWatermarkType(e.target.value);
            setResultUrl(null);
          }}
          className="px-2 py-1 text-black rounded"
        >
          <option value="text">Text Watermark</option>
          <option value="image">Image Watermark</option>
        </select>
      </div>

      {/* Watermark Options */}
      {watermarkType === "text" ? (
        <div className="mb-4">
          <label className="block mb-2">Watermark Text:</label>
          <input
            type="text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            className="w-full px-2 py-1 text-black rounded"
          />
          <label className="block mt-2 mb-2">Text Size (px):</label>
          <input
            type="number"
            value={textSize}
            onChange={(e) => setTextSize(Number(e.target.value))}
            className="w-full px-2 py-1 text-black rounded"
          />
          <label className="block mt-2 mb-2">Watermark Color:</label>
          <input
            type="color"
            value={watermarkColor}
            onChange={(e) => setWatermarkColor(e.target.value)}
            className="w-16 h-10 p-1 rounded"
          />
          <label className="block mt-2 mb-2">Watermark Opacity (0 to 1):</label>
          <input
            type="number"
            value={watermarkOpacity}
            min="0"
            max="1"
            step="0.1"
            onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
            className="w-full px-2 py-1 text-black rounded"
          />
        </div>
      ) : (
        <div className="mb-4">
          {/* Watermark Image Loader */}
          <FileLoader onFileSelect={handleWatermarkImageFile}>
            <p className="mb-2 text-lg">
              Drag & drop your watermark image, paste (Ctrl+V), or click to select
            </p>
            {watermarkImageUrl && (
              <img
                src={watermarkImageUrl}
                alt="Watermark Preview"
                className="mt-4 max-h-32 object-contain rounded border border-gray-700"
              />
            )}
          </FileLoader>
          <label className="block mt-2 mb-2">
            Watermark Size (% of main image width):
          </label>
          <input
            type="number"
            value={watermarkImageScale}
            onChange={(e) => setWatermarkImageScale(Number(e.target.value))}
            className="w-full px-2 py-1 text-black rounded"
          />
          <label className="block mt-2 mb-2">Watermark Opacity (0 to 1):</label>
          <input
            type="number"
            value={watermarkOpacity}
            min="0"
            max="1"
            step="0.1"
            onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
            className="w-full px-2 py-1 text-black rounded"
          />
        </div>
      )}

      {/* Watermark Position Selection */}
      <div className="mb-4">
        <label className="block mb-2">Watermark Position:</label>
        <select
          value={watermarkPosition}
          onChange={(e) => setWatermarkPosition(e.target.value)}
          className="px-2 py-1 text-black rounded"
        >
          <option value="top-left">Top Left</option>
          <option value="top-right">Top Right</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="bottom-right">Bottom Right</option>
          <option value="center">Center</option>
        </select>
      </div>

      {/* Add Watermark Button */}
      <button
        onClick={handleAddWatermark}
        className="mb-4 px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
      >
        Add Watermark
      </button>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Result Preview & Download */}
      {resultUrl && (
        <div className="mt-4 text-center">
          <p>Watermarked Image:</p>
          <img
            src={resultUrl}
            alt="Watermarked"
            className="mt-2 max-w-full rounded"
          />
          <div className="mt-4">
            <a
              href={resultUrl}
              download={`watermarked_${selectedImage && selectedImage.name}`}
              className="inline-block px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
            >
              Download Watermarked Image
            </a>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  );
}

export default AddWatermarkPage;
