import React, { useState, useEffect } from 'react';
import FileLoader from '../../components/FileLoader';

// Inline convertToPng function.
// Helper function to convert AVIF or GIF images to PNG using a canvas.
// (For GIFs, only the first frame is captured.)
const convertToPng = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Conversion to PNG failed'));
        }
      }, 'image/png');
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
};

const RemoveBackgroundPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [bgRemovalModule, setBgRemovalModule] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced configuration state.
  const [advancedConfig, setAdvancedConfig] = useState({
    device: 'cpu', // 'cpu' or 'gpu'
    model: 'isnet_fp16', // 'isnet_fp16', 'isnet', or 'isnet_quint8'
    output: {
      format: 'image/png', // 'image/png', 'image/jpeg', or 'image/webp'
      quality: 0.8,        // For JPEG/WebP; value between 0 and 1.
      type: 'foreground'   // 'foreground', 'background', or 'mask'
    }
  });

  // Generate a preview URL when a file is selected.
  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // Dynamically import the background removal module.
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('@imgly/background-removal');
        setBgRemovalModule(mod);
      } catch (err) {
        console.error('Failed to load background removal module', err);
        setError('Failed to load background removal module.');
      }
    })();
  }, []);

  // File selection handler.
  const handleFile = (file) => {
    if (file) {
      setSelectedFile(file);
      setError(null);
      setProcessedUrl(null);
      setDownloadProgress(null);
    }
  };

  // File input change handler.
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  // Handler for changes in the advanced configuration form.
  const handleAdvancedChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [group, key] = name.split('.');
      setAdvancedConfig((prev) => ({
        ...prev,
        [group]: {
          ...prev[group],
          [key]: key === 'quality' ? parseFloat(value) : value
        }
      }));
    } else {
      setAdvancedConfig((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handler to trigger background removal.
  const handleRemoveBackground = async () => {
    if (!selectedFile) {
      setError('Please select an image file.');
      return;
    }
    if (!bgRemovalModule) {
      setError('Background removal module is not loaded yet.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Convert the file if it's AVIF or GIF.
      let inputFile = selectedFile;
      if (selectedFile.type === 'image/avif' || selectedFile.type === 'image/gif') {
        inputFile = await convertToPng(selectedFile);
      }
      // Build configuration – ensure publicPath matches your version.
      const config = {
        publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.5.8/dist/',
        device: advancedConfig.device,
        model: advancedConfig.model,
        output: {
          format: advancedConfig.output.format,
          quality: advancedConfig.output.quality,
          type: advancedConfig.output.type
        },
        // Progress callback to inform the user about asset downloads.
        progress: (key, current, total) => {
          setDownloadProgress(`Downloading ${key}: ${current} of ${total}`);
        }
      };

      // Select the correct function based on the output type.
      let removalFn;
      if (advancedConfig.output.type === 'foreground') {
        removalFn = bgRemovalModule.removeBackground;
      } else if (advancedConfig.output.type === 'background') {
        removalFn = bgRemovalModule.removeForeground;
      } else if (advancedConfig.output.type === 'mask') {
        removalFn = bgRemovalModule.segmentForeground;
      } else {
        removalFn = bgRemovalModule.removeBackground;
      }

      const blob = await removalFn(inputFile, config);
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during background removal.');
    }
    setLoading(false);
    setDownloadProgress(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6">Remove Background</h1>

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

      {/* Preview of the Selected Image */}
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

      {/* Buttons Container */}
      <div className="flex flex-wrap gap-4 mb-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 bg-purple-500 rounded hover:bg-purple-600 transition-colors"
        >
          {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
        </button>
        <button
          onClick={handleRemoveBackground}
          disabled={!bgRemovalModule || loading}
          className={`px-4 py-2 rounded transition-colors ${
            !bgRemovalModule || loading
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-[#ebb305] hover:bg-[#d4a91d] text-black'
          }`}
        >
          {loading ? 'Removing Background...' : 'Remove Background'}
        </button>
      </div>

      {/* Progress Info */}
      {downloadProgress && (
        <p className="mb-2 text-sm text-blue-300">{downloadProgress}</p>
      )}

      {/* Advanced Options Form */}
      {showAdvanced && (
        <div className="mb-4 p-4 border border-gray-700 rounded">
          <h2 className="text-xl mb-2">Advanced Configuration</h2>
          <div className="mb-2">
            <label className="block mb-1">Device</label>
            <select
              name="device"
              value={advancedConfig.device}
              onChange={handleAdvancedChange}
              className="text-black p-2 rounded"
            >
              <option value="cpu">CPU</option>
              <option value="gpu" disabled>
                GPU [it's not working yet]
              </option>
            </select>
          </div>
          <div className="mb-2">
            <label className="block mb-1">Model</label>
            <select
              name="model"
              value={advancedConfig.model}
              onChange={handleAdvancedChange}
              className="text-black p-2 rounded"
            >
              <option value="isnet_fp16">isnet_fp16</option>
              <option value="isnet">isnet</option>
              <option value="isnet_quint8">isnet_quint8</option>
            </select>
          </div>
          <div className="mb-2">
            <label className="block mb-1">Output Format</label>
            <select
              name="output.format"
              value={advancedConfig.output.format}
              onChange={handleAdvancedChange}
              className="text-black p-2 rounded"
            >
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WebP</option>
            </select>
          </div>
          <div className="mb-2">
            <label className="block mb-1">Quality (for JPEG/WebP)</label>
            <input
              type="range"
              name="output.quality"
              min="0.1"
              max="1.0"
              step="0.1"
              value={advancedConfig.output.quality}
              onChange={handleAdvancedChange}
              className="w-full"
            />
            <p>{advancedConfig.output.quality}</p>
          </div>
          <div className="mb-2">
            <label className="block mb-1">Output Type</label>
            <select
              name="output.type"
              value={advancedConfig.output.type}
              onChange={handleAdvancedChange}
              className="text-black p-2 rounded"
            >
              <option value="foreground">Foreground</option>
              <option value="background">Background</option>
              <option value="mask">Mask</option>
            </select>
          </div>
        </div>
      )}

      {/* Download Processed Image Button */}
      {processedUrl && (
        <div className="mb-4">
          <a
            href={processedUrl}
            download={`no-background_${selectedFile.name}`}
            className="inline-block px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
          >
            Download Processed Image
          </a>
        </div>
      )}

      {/* Display Processed Image */}
      {processedUrl && (
        <div>
          <h2 className="text-2xl mb-4">Processed Image</h2>
          <img
            src={processedUrl}
            alt="Processed"
            className="mt-4 max-w-full border border-gray-700 rounded"
          />
        </div>
      )}

      {/* Information Box */}
      <div className="mt-8 p-4 border border-gray-700 rounded bg-gray-800 text-sm text-gray-300">
        <p>
          The background remover uses this open source library which is very strong:{' '}
          <a
            href="https://github.com/imgly/background-removal-js"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            background-removal-js
          </a>.
        </p>
        <p className="mt-2">
          Sometimes it does not give the expected results. In that case you can try the following services.
          Please be aware that they are not only frontend—your image will be uploaded:
        </p>
        <ul className="list-disc list-inside mt-2">
          <li>
            <a
              href="https://www.remove.bg/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              remove.bg
            </a>{' '}
            – "the gold standard" but with a limited quality version for free users.
          </li>
          <li>
            <a
              href="https://www.adobe.com/express/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              express.adobe.com
            </a>{' '}
            – Very good and made by Adobe.
          </li>
          <li>
            <a
              href="https://www.inpixio.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              inpixio.com
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default RemoveBackgroundPage;
