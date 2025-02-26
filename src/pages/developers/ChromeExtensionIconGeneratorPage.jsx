import React, { useState, useRef, useEffect } from "react";
import FileLoader from "../../components/FileLoader";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const sizes = [128, 48, 32, 16];

const ChromeExtensionIconGeneratorPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resizedImages, setResizedImages] = useState({});

  // Update state regardless of file existence.
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (!file) {
      setResizedImages({});
    }
  };

  // When a file is selected, create an object URL and generate icons.
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      generateResizedImages(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // Generate resized images for each icon size.
  const generateResizedImages = (url) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const newResized = {};
      sizes.forEach((size) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        newResized[size] = canvas.toDataURL("image/png");
      });
      setResizedImages(newResized);
    };
    img.onerror = () => {
      console.error("Error loading image.");
    };
  };

  // Generate a ZIP file of all the resized images and trigger a download.
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    sizes.forEach((size) => {
      const dataUrl = resizedImages[size];
      if (dataUrl) {
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        zip.file(`icon-${size}.png`, base64Data, { base64: true });
      }
    });
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "chrome-extension-icons.zip");
  };

  // Download individual image for the given size.
  const handleIndividualDownload = (size) => {
    const dataUrl = resizedImages[size];
    if (dataUrl) {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `icon-${size}.png`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Explanation Block */}
      <div className="mb-8 p-4 border border-gray-700 rounded bg-gray-800">
        <h2 className="text-2xl font-bold mb-4">How to Use the Icon Generator</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            <strong>Load an image:</strong> Drag & drop, paste (Ctrl+V) or click
            the file loader below.
          </li>
          <li>
            <strong>Review the icons:</strong> Your image will be automatically
            resized to 128x128, 48x48, 32x32, and 16x16 PNG icons.
          </li>
          <li>
            <strong>Download your icons:</strong> You can download individual icons
            or download all icons as a ZIP file.
          </li>
        </ol>
      </div>

      <h1 className="text-3xl mb-6">Chrome Extension Icon Generator</h1>

      {/* FileLoader for image selection */}
      <FileLoader onFileSelect={handleFileSelect}>
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 9l-3-3-3 3"
          />
        </svg>
        <p className="mt-4 text-lg text-gray-200">
          Drag & drop an image, paste (Ctrl+V), or click to select
        </p>
      </FileLoader>

      {/* Display resized icons only after transformation */}
      {Object.keys(resizedImages).length > 0 && (
        <>
          <div className="mt-6 flex flex-row justify-around items-start">
            {sizes.map((size) => (
              <div key={size} className="flex flex-col items-center h-48">
                <img
                  src={resizedImages[size]}
                  alt={`Icon ${size}x${size}`}
                  className="border border-gray-700 rounded"
                />
                <span className="mt-2">
                  {size} x {size}
                </span>
                <button
                  onClick={() => handleIndividualDownload(size)}
                  className="mt-auto px-3 py-1 bg-green-500 rounded hover:bg-green-600 transition-colors"
                >
                  Download
                </button>
              </div>
            ))}
          </div>

          {/* ZIP download button */}
          <div className="mt-6 text-center">
            <button
              onClick={handleDownloadZip}
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
            >
              Download All as ZIP
            </button>
          </div>

          {/* Tutorial and SEO section */}
          <div className="mt-12 p-4 border border-gray-700 rounded bg-gray-800">
            <h2 className="text-2xl mb-4">How to Add Icons to Your Manifest</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Add the generated icons (<code>icon-128.png</code>,{" "}
                <code>icon-48.png</code>, <code>icon-32.png</code>,{" "}
                <code>icon-16.png</code>) to your project directory.
              </li>
              <li>
                Update your <code>manifest.json</code> with the following:
              </li>
              <pre className="bg-gray-700 p-2 rounded mt-2 text-sm overflow-x-auto">
{"\"icons\": {\n  \"128\": \"icon-128.png\",\n  \"48\": \"icon-48.png\",\n  \"32\": \"icon-32.png\",\n  \"16\": \"icon-16.png\"\n}"}
              </pre>
              <li>Reload your extension in Chrome.</li>
            </ol>
            <p className="mt-4 text-sm">
              SEO Keywords: chrome extension icons, icon generator, manifest icons, chrome app development, extension design.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ChromeExtensionIconGeneratorPage;
