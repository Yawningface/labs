import React, { useState, useEffect, useRef } from 'react';
import FileLoader from '../../components/FileLoader';

// Helper function to convert AVIF or GIF images to PNG
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
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
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

// Helper to reshape any image to 1920x1080 (16:9)
const reshapeImageTo1920x1080 = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, 1920, 1080);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Resizing to 1920x1080 failed'));
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

const Spinner = () => (
  <div className="flex justify-center items-center h-48">
    <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
  </div>
);

const ThumbnailGeneratorPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [foregroundUrl, setForegroundUrl] = useState(null);
  const [inputText, setInputText] = useState('');
  const [textSize, setTextSize] = useState(250);
  const [fontFamily, setFontFamily] = useState('Roboto, sans-serif');
  const [textColor, setTextColor] = useState('#ffffff');
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(30);
  const [shadowOffsetX, setShadowOffsetX] = useState(0);
  const [shadowOffsetY, setShadowOffsetY] = useState(30);
  const [textOffsetX, setTextOffsetX] = useState(-300);
  const [textOffsetY, setTextOffsetY] = useState(0);
  const [textBold, setTextBold] = useState(true);
  const [textWeight, setTextWeight] = useState(400);
  const [textOutlineEnabled, setTextOutlineEnabled] = useState(false);
  const [textOutlineWidth, setTextOutlineWidth] = useState(2);
  const [textOutlineColor, setTextOutlineColor] = useState('#000000');
  const [textLetterSpacing, setTextLetterSpacing] = useState(0);
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [useGradient, setUseGradient] = useState(false);
  const [gradientOpacity, setGradientOpacity] = useState(0.6);
  const [gradientBlobs, setGradientBlobs] = useState([
    { x: 247, y: 324, radius: 967, color: '#FF6B6B' },
    { x: 1504, y: 953, radius: 562, color: '#FFD93D' },
    { x: 960, y: 540, radius: 1152, color: '#6BCB77' },
  ]);
  const [fgBrightness, setFgBrightness] = useState(0.83);
  const [fgContrast, setFgContrast] = useState(1.10);
  const [fgSaturation, setFgSaturation] = useState(1.07);
  const [fgShadowColor, setFgShadowColor] = useState('#000000');
  const [fgShadowBlur, setFgShadowBlur] = useState(0);
  const [fgShadowOffsetX, setFgShadowOffsetX] = useState(0);
  const [fgShadowOffsetY, setFgShadowOffsetY] = useState(0);
  const [error, setError] = useState(null);
  const [processingLoading, setProcessingLoading] = useState(false);
  const [generatingLoading, setGeneratingLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const finalCanvasRef = useRef(null);
  const textPreviewCanvasRef = useRef(null);
  const foregroundPreviewCanvasRef = useRef(null);

  const [bgRemovalModule, setBgRemovalModule] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('@imgly/background-removal');
        setBgRemovalModule(mod);
      } catch (err) {
        console.error('Failed to load module', err);
        setError('Failed to load background removal module.');
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const applyBackgroundEffects = (ctx, bgImg, width, height) => {
    if (backgroundBlur > 0) {
      ctx.filter = `blur(${backgroundBlur}px)`;
    }
    ctx.drawImage(bgImg, 0, 0, width, height);
    ctx.filter = 'none';

    if (useGradient) {
      gradientBlobs.forEach((blob) => {
        const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
        gradient.addColorStop(0, blob.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = gradientOpacity;
        ctx.fillRect(0, 0, width, height);
      });
      ctx.globalAlpha = 1.0;
    }
  };

  const applyForegroundEffects = (ctx, fgImg, width, height) => {
    ctx.filter = `brightness(${fgBrightness}) contrast(${fgContrast}) saturate(${fgSaturation})`;
    if (fgShadowBlur > 0) {
      ctx.shadowColor = fgShadowColor;
      ctx.shadowBlur = fgShadowBlur;
      ctx.shadowOffsetX = fgShadowOffsetX;
      ctx.shadowOffsetY = fgShadowOffsetY;
    }
    ctx.drawImage(fgImg, 0, 0, width, height);
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  useEffect(() => {
    if (!backgroundUrl) return;
    const canvas = textPreviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bgImg = new Image();
    bgImg.onload = () => {
      canvas.width = bgImg.width;
      canvas.height = bgImg.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      applyBackgroundEffects(ctx, bgImg, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (inputText) {
        const weight = textBold ? 700 : textWeight;
        ctx.font = `${weight} ${textSize}px ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = shadowOffsetX;
        ctx.shadowOffsetY = shadowOffsetY;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = `${textLetterSpacing}px`;
        const textX = canvas.width / 2 + textOffsetX;
        const textY = canvas.height / 2 + textOffsetY;
        if (textOutlineEnabled) {
          ctx.strokeStyle = textOutlineColor;
          ctx.lineWidth = textOutlineWidth;
          ctx.strokeText(inputText, textX, textY);
        }
        ctx.fillText(inputText, textX, textY);
      }
    };
    bgImg.src = backgroundUrl;
  }, [
    backgroundUrl,
    inputText,
    textSize,
    fontFamily,
    textColor,
    shadowColor,
    shadowBlur,
    shadowOffsetX,
    shadowOffsetY,
    textOffsetX,
    textOffsetY,
    textBold,
    textWeight,
    textOutlineEnabled,
    textOutlineWidth,
    textOutlineColor,
    textLetterSpacing,
    backgroundBlur,
    useGradient,
    gradientOpacity,
    gradientBlobs
  ]);

  useEffect(() => {
    if (!foregroundUrl) return;
    const canvas = foregroundPreviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const fgImg = new Image();
    fgImg.onload = () => {
      canvas.width = fgImg.width;
      canvas.height = fgImg.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      applyForegroundEffects(ctx, fgImg, canvas.width, canvas.height);
    };
    fgImg.src = foregroundUrl;
  }, [
    foregroundUrl,
    fgBrightness,
    fgContrast,
    fgSaturation,
    fgShadowColor,
    fgShadowBlur,
    fgShadowOffsetX,
    fgShadowOffsetY
  ]);

  const handleFile = async (file) => {
    setError(null);
    setBackgroundUrl(null);
    setForegroundUrl(null);
    try {
      const reshapedBlob = await reshapeImageTo1920x1080(file);
      setSelectedFile(reshapedBlob);
      setStatusMessage('Your image has been reshaped to 16:9 (1920x1080) for processing.');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const processImage = async () => {
    if (!selectedFile) {
      setError('Please select an image file.');
      return;
    }
    if (!bgRemovalModule) {
      setError('Background removal module is not loaded yet.');
      return;
    }
    setProcessingLoading(true);
    setStatusMessage('Processing image... This may take around 10 seconds.');
    try {
      let inputFile = selectedFile;
      if (selectedFile.type === 'image/avif' || selectedFile.type === 'image/gif') {
        inputFile = await convertToPng(selectedFile);
      }
      const config = {
        publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.5.8/dist/',
        device: 'cpu',
        model: 'isnet_fp16',
        output: { format: 'image/png', quality: 0.8 },
      };

      const bgBlob = await bgRemovalModule.removeForeground(inputFile, config);
      const bgUrl = URL.createObjectURL(bgBlob);
      setBackgroundUrl(bgUrl);

      const fgBlob = await bgRemovalModule.removeBackground(inputFile, config);
      const fgUrl = URL.createObjectURL(fgBlob);
      setForegroundUrl(fgUrl);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during image processing.');
    }
    setProcessingLoading(false);
    setStatusMessage('');
  };

  const generateThumbnail = () => {
    if (!backgroundUrl || !foregroundUrl) {
      setError('Please process the image first.');
      return;
    }
    setGeneratingLoading(true);
    setStatusMessage('Generating thumbnail... Please wait.');
    const canvas = finalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const bgImg = new Image();
    const fgImg = new Image();

    bgImg.onload = () => {
      const finalWidth = 1920;
      const finalHeight = 1080;
      canvas.width = finalWidth;
      canvas.height = finalHeight;

      // Fill the canvas with a solid background to ensure 0% transparency
      ctx.fillStyle = '#1F2937'; // Matches bg-gray-900; use '#FFFFFF' for white if preferred
      ctx.fillRect(0, 0, finalWidth, finalHeight);

      applyBackgroundEffects(ctx, bgImg, finalWidth, finalHeight);

      fgImg.onload = () => {
        if (inputText) {
          const weight = textBold ? 700 : textWeight;
          ctx.font = `${weight} ${textSize}px ${fontFamily}`;
          ctx.fillStyle = textColor;
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadowBlur;
          ctx.shadowOffsetX = shadowOffsetX;
          ctx.shadowOffsetY = shadowOffsetY;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.letterSpacing = `${textLetterSpacing}px`;
          const textX = finalWidth / 2 + textOffsetX;
          const textY = finalHeight / 2 + textOffsetY;
          if (textOutlineEnabled) {
            ctx.strokeStyle = textOutlineColor;
            ctx.lineWidth = textOutlineWidth;
            ctx.strokeText(inputText, textX, textY);
          }
          ctx.fillText(inputText, textX, textY);
        }

        applyForegroundEffects(ctx, fgImg, finalWidth, finalHeight);
        setGeneratingLoading(false);
        setStatusMessage('');
      };
      fgImg.src = foregroundUrl;
    };
    bgImg.src = backgroundUrl;
  };

  const downloadThumbnail = () => {
    const canvas = finalCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'thumbnail.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  };

  const handleGradientBlobChange = (index, field, value) => {
    const newBlobs = [...gradientBlobs];
    newBlobs[index][field] = Number(value) || value;
    setGradientBlobs(newBlobs);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6">Thumbnail Generator</h1>

      <FileLoader onFileSelect={handleFile}>
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h10a4 4 0 004-4V9a4 4 0 00-4-4H7a4 4 0 00-4 4v6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-3-3-3 3" />
        </svg>
        <p className="mt-4 text-lg text-gray-200">Drag & drop an image, paste (Ctrl+V), or click to select</p>
      </FileLoader>

      {previewUrl && (
        <div className="mt-4">
          <p>Reshaped Image (16:9 - 1920×1080):</p>
          <img
            src={previewUrl}
            alt="Original Reshaped"
            className="mt-2 max-h-48 mx-auto object-contain rounded border border-gray-700"
          />
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <button
          onClick={processImage}
          disabled={processingLoading || !selectedFile || !bgRemovalModule}
          className={`px-4 py-2 rounded transition-colors ${
            processingLoading || !selectedFile || !bgRemovalModule
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-[#ebb305] hover:bg-[#d4a91d] text-black'
          }`}
        >
          {processingLoading ? 'Processing Image...' : 'Process Image'}
        </button>
      </div>

      {statusMessage && <p className="mt-4 text-yellow-300">{statusMessage}</p>}

      <div className="mt-6 sticky top-0 z-10 bg-gray-900 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <p className="mb-2">Background</p>
          {backgroundUrl ? (
            <img
              src={backgroundUrl}
              alt="Background"
              className="max-h-48 mx-auto object-contain rounded border border-gray-700"
            />
          ) : processingLoading ? (
            <Spinner />
          ) : null}
        </div>
        <div>
          <p className="mb-2">Foreground Preview</p>
          {foregroundUrl ? (
            <canvas
              ref={foregroundPreviewCanvasRef}
              className="max-h-48 w-full object-contain rounded border border-gray-700"
            />
          ) : processingLoading ? (
            <Spinner />
          ) : null}
        </div>
        <div>
          <p className="mb-2">Text Preview (with Grid)</p>
          {backgroundUrl ? (
            <canvas ref={textPreviewCanvasRef} className="w-full border border-gray-700 rounded" />
          ) : processingLoading ? (
            <Spinner />
          ) : null}
        </div>
      </div>

      <div className="mt-6 border-t border-gray-700 pt-4">
        <h2 className="text-xl mb-2">Advanced Settings</h2>
        <details className="mt-4 border rounded p-2 bg-gray-800">
          <summary className="cursor-pointer">Text Tools</summary>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block mb-2">Enter Text for Thumbnail:</label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full p-2 text-black rounded"
                placeholder="Your text here..."
              />
            </div>
            <div>
              <label className="block mb-2">Text Size: {textSize}px</label>
              <input
                type="range"
                min="100"
                max="500"
                value={textSize}
                onChange={(e) => setTextSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2">Font Family:</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full p-2 text-black rounded"
              >
                <option value="Roboto, sans-serif">Roboto</option>
                <option value="sans-serif">Sans-serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="cursive">Cursive</option>
                <option value="Lato, sans-serif">Lato</option>
                <option value="Montserrat, sans-serif">Montserrat</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 flex items-center">
                <input
                  type="checkbox"
                  checked={textBold}
                  onChange={(e) => setTextBold(e.target.checked)}
                  className="mr-2"
                />
                Bold Text
              </label>
            </div>
            <div>
              <label className="block mb-2">Font Weight: {textWeight}</label>
              <input
                type="range"
                min="100"
                max="900"
                step="100"
                value={textWeight}
                onChange={(e) => setTextWeight(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2">Text Color:</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-full p-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Shadow Color:</label>
              <input
                type="color"
                value={shadowColor}
                onChange={(e) => setShadowColor(e.target.value)}
                className="w-full p-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Shadow Blur: {shadowBlur}</label>
              <input
                type="range"
                min="0"
                max="50"
                value={shadowBlur}
                onChange={(e) => setShadowBlur(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2">Shadow Offset X: {shadowOffsetX}px</label>
              <input
                type="range"
                min="-50"
                max="50"
                value={shadowOffsetX}
                onChange={(e) => setShadowOffsetX(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2">Shadow Offset Y: {shadowOffsetY}px</label>
              <input
                type="range"
                min="-50"
                max="50"
                value={shadowOffsetY}
                onChange={(e) => setShadowOffsetY(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1 flex items-center">
                <input
                  type="checkbox"
                  checked={textOutlineEnabled}
                  onChange={(e) => setTextOutlineEnabled(e.target.checked)}
                  className="mr-2"
                />
                Enable Text Outline
              </label>
            </div>
            {textOutlineEnabled && (
              <>
                <div>
                  <label className="block mb-2">Outline Width: {textOutlineWidth}px</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={textOutlineWidth}
                    onChange={(e) => setTextOutlineWidth(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block mb-2">Outline Color:</label>
                  <input
                    type="color"
                    value={textOutlineColor}
                    onChange={(e) => setTextOutlineColor(e.target.value)}
                    className="w-full p-2 rounded"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block mb-2">Letter Spacing: {textLetterSpacing}px</label>
              <input
                type="range"
                min="-10"
                max="20"
                value={textLetterSpacing}
                onChange={(e) => setTextLetterSpacing(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2">Text Displacement X: {textOffsetX}px</label>
              <input
                type="range"
                min="-1920"
                max="1920"
                value={textOffsetX}
                onChange={(e) => setTextOffsetX(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2">Text Displacement Y: {textOffsetY}px</label>
              <input
                type="range"
                min="-1080"
                max="1080"
                value={textOffsetY}
                onChange={(e) => setTextOffsetY(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </details>
        <details className="mt-4 border rounded p-2 bg-gray-800">
          <summary className="cursor-pointer">Background Tools</summary>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Background Blur: {backgroundBlur}px</label>
              <input
                type="range"
                min="0"
                max="20"
                value={backgroundBlur}
                onChange={(e) => setBackgroundBlur(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1 flex items-center">
                <input
                  type="checkbox"
                  checked={useGradient}
                  onChange={(e) => setUseGradient(e.target.checked)}
                  className="mr-2"
                />
                Apply Gradient
              </label>
            </div>
            {useGradient && (
              <>
                <div>
                  <label className="block mb-1">Gradient Opacity: {(gradientOpacity * 100).toFixed(0)}%</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={gradientOpacity}
                    onChange={(e) => setGradientOpacity(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1">Gradient Blobs:</label>
                  {gradientBlobs.map((blob, index) => (
                    <div key={index} className="mb-4 p-2 border rounded">
                      <p>Blob {index + 1}</p>
                      <label className="block mb-1">Color:</label>
                      <input
                        type="color"
                        value={blob.color}
                        onChange={(e) => handleGradientBlobChange(index, 'color', e.target.value)}
                        className="w-full p-2 rounded"
                      />
                      <label className="block mb-1 mt-2">X Position: {blob.x}px</label>
                      <input
                        type="range"
                        min="0"
                        max="1920"
                        value={blob.x}
                        onChange={(e) => handleGradientBlobChange(index, 'x', e.target.value)}
                        className="w-full"
                      />
                      <label className="block mb-1 mt-2">Y Position: {blob.y}px</label>
                      <input
                        type="range"
                        min="0"
                        max="1080"
                        value={blob.y}
                        onChange={(e) => handleGradientBlobChange(index, 'y', e.target.value)}
                        className="w-full"
                      />
                      <label className="block mb-1 mt-2">Radius: {blob.radius}px</label>
                      <input
                        type="range"
                        min="100"
                        max="2000"
                        value={blob.radius}
                        onChange={(e) => handleGradientBlobChange(index, 'radius', e.target.value)}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </details>
        <details className="mt-4 border rounded p-2 bg-gray-800">
          <summary className="cursor-pointer">Foreground Tools</summary>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Brightness: {(fgBrightness * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={fgBrightness}
                onChange={(e) => setFgBrightness(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Contrast: {(fgContrast * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={fgContrast}
                onChange={(e) => setFgContrast(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Saturation: {(fgSaturation * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={fgSaturation}
                onChange={(e) => setFgSaturation(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Shadow Color:</label>
              <input
                type="color"
                value={fgShadowColor}
                onChange={(e) => setFgShadowColor(e.target.value)}
                className="w-full p-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-1">Shadow Blur: {fgShadowBlur}px</label>
              <input
                type="range"
                min="0"
                max="50"
                value={fgShadowBlur}
                onChange={(e) => setFgShadowBlur(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Shadow Offset X: {fgShadowOffsetX}px</label>
              <input
                type="range"
                min="-50"
                max="50"
                value={fgShadowOffsetX}
                onChange={(e) => setFgShadowOffsetX(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Shadow Offset Y: {fgShadowOffsetY}px</label>
              <input
                type="range"
                min="-50"
                max="50"
                value={fgShadowOffsetY}
                onChange={(e) => setFgShadowOffsetY(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </details>
      </div>

      <div className="mt-4">
        <button
          onClick={generateThumbnail}
          disabled={generatingLoading}
          className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
        >
          {generatingLoading ? 'Generating Thumbnail...' : 'Generate Final Thumbnail'}
        </button>
      </div>

      <div className="mt-6">
        <canvas ref={finalCanvasRef} className="w-full border border-gray-700 rounded" />
      </div>

      <div className="mt-4">
        <button
          onClick={downloadThumbnail}
          className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
        >
          Download Thumbnail
        </button>
      </div>

      {error && <p className="mt-4 text-red-400">{error}</p>}
    </div>
  );
};

export default ThumbnailGeneratorPage;