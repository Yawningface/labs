import React, { useState, useEffect } from "react";
import FileLoader from "../../components/FileLoader";
import { saveAs } from "file-saver";

// The favicon sizes we want to support.
const sizes = [16, 32, 48, 64];

/**
 * Assemble multiple PNG images into a single ICO file.
 * Each image is expected as an object: { width, height, data: Uint8Array }.
 */
function assembleIco(images) {
  const count = images.length;
  // The header is 6 bytes, each directory entry is 16 bytes.
  let offset = 6 + count * 16;
  let totalSize = offset;
  images.forEach(img => {
    totalSize += img.data.length;
  });

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let pos = 0;
  // Write ICO header:
  view.setUint16(pos, 0, true); // Reserved
  pos += 2;
  view.setUint16(pos, 1, true); // Type: icon (1)
  pos += 2;
  view.setUint16(pos, count, true); // Number of images
  pos += 2;

  // Write directory entries for each image.
  images.forEach(img => {
    // In ICO, a value of 0 means 256 pixels.
    const width = img.width >= 256 ? 0 : img.width;
    const height = img.height >= 256 ? 0 : img.height;
    view.setUint8(pos, width); pos += 1;
    view.setUint8(pos, height); pos += 1;
    view.setUint8(pos, 0); pos += 1; // Color count (0 if >= 256 colors)
    view.setUint8(pos, 0); pos += 1; // Reserved
    view.setUint16(pos, 1, true); pos += 2; // Color planes
    view.setUint16(pos, 32, true); pos += 2; // Bits per pixel (assume 32)
    view.setUint32(pos, img.data.length, true); pos += 4; // Size of the image data in bytes
    view.setUint32(pos, offset, true); pos += 4; // Offset from beginning of file to image data
    offset += img.data.length;
  });

  // Write the image data one after another.
  images.forEach(img => {
    for (let i = 0; i < img.data.length; i++) {
      view.setUint8(pos++, img.data[i]);
    }
  });

  return buffer;
}

// Convert an image URL to a multi-resolution ICO file.
// Returns a promise that resolves with an ArrayBuffer.
const generateIcoFromImage = (url) => {
  const promises = sizes.map(
    size =>
      new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        // Avoid CORS issues:
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => {
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          canvas.toBlob(blob => {
            if (blob) {
              const reader = new FileReader();
              reader.onload = () => {
                const arrayBuffer = reader.result;
                const uint8Array = new Uint8Array(arrayBuffer);
                resolve({ width: size, height: size, data: uint8Array });
              };
              reader.onerror = reject;
              reader.readAsArrayBuffer(blob);
            } else {
              reject("Canvas toBlob failed.");
            }
          }, "image/png");
        };
        img.onerror = reject;
      })
  );
  return Promise.all(promises).then(images => {
    return assembleIco(images);
  });
};

// Convert an emoji character to a multi-resolution ICO file.
// Returns a promise that resolves with an ArrayBuffer.
const generateIcoFromEmoji = (emojiChar) => {
  const promises = sizes.map(
    size =>
      new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, size, size);
        // Use a font size slightly smaller than the canvas size.
        ctx.font = `${size - 4}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emojiChar, size / 2, size / 2);
        canvas.toBlob(blob => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              const arrayBuffer = reader.result;
              const uint8Array = new Uint8Array(arrayBuffer);
              resolve({ width: size, height: size, data: uint8Array });
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
          } else {
            reject("Canvas toBlob failed for emoji.");
          }
        }, "image/png");
      })
  );
  return Promise.all(promises).then(images => {
    return assembleIco(images);
  });
};

const FaviconGeneratorPage = () => {
  // Mode state: "image" or "emoji"
  const [mode, setMode] = useState("image");

  // Image-to-ICO state:
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [icoBlob, setIcoBlob] = useState(null);

  // Emoji-to-ICO state:
  const [emoji, setEmoji] = useState("");
  const [emojiIcoBlob, setEmojiIcoBlob] = useState(null);

  // Generate ICO from image when a file is selected.
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setImageUrl(url);
      generateIcoFromImage(url)
        .then(arrayBuffer => {
          setIcoBlob(new Blob([arrayBuffer], { type: "image/x-icon" }));
        })
        .catch(err => console.error("Error generating ICO:", err));
      return () => URL.revokeObjectURL(url);
    } else {
      setImageUrl(null);
      setIcoBlob(null);
    }
  }, [selectedFile]);

  // Generate ICO from emoji when one is provided.
  useEffect(() => {
    if (emoji) {
      generateIcoFromEmoji(emoji)
        .then(arrayBuffer => {
          setEmojiIcoBlob(new Blob([arrayBuffer], { type: "image/x-icon" }));
        })
        .catch(err => console.error("Error generating emoji ICO:", err));
    } else {
      setEmojiIcoBlob(null);
    }
  }, [emoji]);

  // Download functions.
  const downloadIco = () => {
    if (icoBlob) {
      saveAs(icoBlob, "favicon.ico");
    }
  };

  const downloadEmojiIco = () => {
    if (emojiIcoBlob) {
      saveAs(emojiIcoBlob, "favicon.ico");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-6">Favicon Generator</h1>
      <div className="mb-6">
        <button
          onClick={() => setMode("image")}
          className={`px-4 py-2 ${
            mode === "image" ? "bg-blue-600" : "bg-gray-700"
          } rounded mr-2`}
        >
          Image to ICO
        </button>
        <button
          onClick={() => setMode("emoji")}
          className={`px-4 py-2 ${
            mode === "emoji" ? "bg-blue-600" : "bg-gray-700"
          } rounded`}
        >
          Emoji to Favicon
        </button>
      </div>

      {mode === "image" && (
        <>
          <FileLoader onFileSelect={setSelectedFile}>
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
              Drag & drop an image, paste (Ctrl+V), or click to select an image.
            </p>
          </FileLoader>
          {icoBlob && (
            <div className="mt-6 text-center">
              <p className="mb-4">
                Your multi‑resolution favicon.ico (16, 32, 48, 64) is ready:
              </p>
              <div className="inline-block border border-gray-700 rounded p-2">
                <img
                  src={imageUrl}
                  alt="favicon preview"
                  style={{ width: 32, height: 32 }}
                />
              </div>
              <div className="mt-4">
                <button
                  onClick={downloadIco}
                  className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
                >
                  Download Favicon (.ico)
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {mode === "emoji" && (
        <>
          <div className="mb-4">
            <p className="mb-2">
              To create a favicon from an emoji, please visit{" "}
              <a
                href="https://emojipedia.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline font-semibold"
              >
                Emojipedia
              </a>{" "}
              and copy your desired emoji, then paste it below:
            </p>
            <input
              type="text"
              placeholder="Paste your emoji here"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="px-3 py-2 rounded bg-gray-700 text-white w-full"
            />
          </div>
          {emoji && emojiIcoBlob && (
            <div className="mt-6 text-center">
              <p className="mb-4">
                Your multi‑resolution emoji favicon.ico (16, 32, 48, 64) is ready:
              </p>
              <div className="inline-block border border-gray-700 rounded p-2">
                <img
                  src={URL.createObjectURL(emojiIcoBlob)}
                  alt="emoji favicon preview"
                  style={{ width: 32, height: 32 }}
                />
              </div>
              <div className="mt-4">
                <button
                  onClick={downloadEmojiIco}
                  className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
                >
                  Download Favicon (.ico)
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FaviconGeneratorPage;
