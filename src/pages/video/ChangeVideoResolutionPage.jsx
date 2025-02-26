import React, { useState, useEffect } from "react";
import FileLoader from "../../components/FileLoader";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import confetti from "canvas-confetti";

/**
 * Checks if a video file is likely playable in most modern browsers
 * by examining its MIME type.
 */
function isBrowserPlayableFile(file) {
  if (!file || !file.type.startsWith("video/")) return false;
  const playableTypes = ["video/mp4", "video/webm", "video/ogg"];
  return playableTypes.includes(file.type);
}

/**
 * Parse relevant info from FFmpeg logs (duration, resolution, bitrate).
 */
function parseMetadata(logs) {
  let duration = null;
  let bitrate = null;
  let resolution = null;

  for (const line of logs) {
    // Duration line
    if (line.includes("Duration:")) {
      const durMatch = line.match(/Duration:\s(\d\d:\d\d:\d\d\.\d\d)/);
      if (durMatch) {
        duration = durMatch[1];
      }
      const brMatch = line.match(/bitrate:\s(\d+)\s*kb\/s/);
      if (brMatch) {
        bitrate = `${brMatch[1]} kb/s`;
      }
    }
    // Resolution line
    if (line.includes("Stream #") && line.includes("Video:")) {
      const resMatch = line.match(/,\s(\d+)x(\d+)[,\s]/);
      if (resMatch) {
        resolution = `${resMatch[1]}x${resMatch[2]}`;
      }
    }
  }

  return { duration, bitrate, resolution };
}

const ChangeVideoResolutionPage = () => {
  // ffmpeg instance
  const [ffmpeg, setFfmpeg] = useState(null);

  // Selected file from FileLoader
  const [selectedFile, setSelectedFile] = useState(null);

  // For previewing the original video (if playable)
  const [previewUrl, setPreviewUrl] = useState(null);

  // Error, loading, and progress states
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  // Advanced console logs
  const [logs, setLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);

  // Metadata for input and output
  const [inputMetadata, setInputMetadata] = useState({});
  const [outputMetadata, setOutputMetadata] = useState({});

  // The final converted video URL
  const [convertedUrl, setConvertedUrl] = useState(null);

  // Track converted file size
  const [convertedBlobSize, setConvertedBlobSize] = useState(null);

  // Resolution selection
  // mode: "preset" or "custom"
  const [resolutionMode, setResolutionMode] = useState("preset");

  // Preset resolution
  const [targetResolution, setTargetResolution] = useState("1280:720"); // default 720p

  // Custom resolution fields
  const [customWidth, setCustomWidth] = useState("1920");
  const [customHeight, setCustomHeight] = useState("1080");

  // Common preset resolutions
  const resolutionOptions = [
    { label: "360p (640x360)", value: "640:360" },
    { label: "480p (854x480)", value: "854:480" },
    { label: "720p (1280x720)", value: "1280:720" },
    { label: "1080p (1920x1080)", value: "1920:1080" },
    { label: "1440p (2560x1440)", value: "2560:1440" },
    { label: "2160p (3840x2160)", value: "3840:2160" },
  ];

  // Load FFmpeg on mount
  useEffect(() => {
    const loadFfmpeg = async () => {
      try {
        const _ffmpeg = createFFmpeg({
          log: true,
          progress: ({ ratio }) => {
            setProgress(`Processing: ${(ratio * 100).toFixed(2)}%`);
          },
        });
        _ffmpeg.setLogger(({ type, message }) => {
          setLogs((prev) => [...prev, `[${type}] ${message}`]);
        });
        setFfmpeg(_ffmpeg);
      } catch (err) {
        setError("Failed to load ffmpeg. Please refresh the page.");
      }
    };
    loadFfmpeg();
  }, []);

  // Preview the selected file (if playable)
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // When convertedUrl changes, fetch the new file size
  useEffect(() => {
    if (!convertedUrl) {
      setConvertedBlobSize(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(convertedUrl);
        const blob = await res.blob();
        setConvertedBlobSize(blob.size);
      } catch (err) {
        console.error("Failed to get converted blob size:", err);
      }
    })();
  }, [convertedUrl]);

  // FileLoader callback
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setError(null);
    setLoading(false);
    setProgress("");
    setLogs([]);
    setInputMetadata({});
    setOutputMetadata({});
    setConvertedUrl(null);
    setConvertedBlobSize(null);
  };

  // Temporarily override logger to parse metadata logs
  const probeFile = async (fileName) => {
    const localLogs = [];
    const tempLogger = ({ type, message }) => {
      localLogs.push(message);
      setLogs((prev) => [...prev, `[${type}] ${message}`]);
    };
    ffmpeg.setLogger(tempLogger);

    // "dummy" command to force FFmpeg to print file info
    await ffmpeg.run("-i", fileName, "-c", "copy", "-f", "null", "/dev/null");

    // restore main logger
    ffmpeg.setLogger(({ type, message }) => {
      setLogs((prev) => [...prev, `[${type}] ${message}`]);
    });

    const lines = localLogs.map((msg) => msg.toString());
    return parseMetadata(lines);
  };

  // Build the scale argument
  const getScaleArgument = () => {
    if (resolutionMode === "preset") {
      return targetResolution; // e.g. "1280:720"
    }
    // "custom" mode
    // e.g. scale=1920:1080
    // You could add logic to handle aspect ratio (like using -1), but let's keep it simple
    return `${customWidth}:${customHeight}`;
  };

  // Main function to change resolution
  const handleChangeResolution = async () => {
    if (!selectedFile) {
      setError("Please select a video file first.");
      return;
    }
    if (!ffmpeg) {
      setError("FFmpeg is still loading. Please wait...");
      return;
    }

    // Validate custom resolution if selected
    if (resolutionMode === "custom") {
      if (!customWidth || !customHeight) {
        setError("Please provide both width and height for custom resolution.");
        return;
      }
      // Optionally, ensure they are numeric
      if (isNaN(Number(customWidth)) || isNaN(Number(customHeight))) {
        setError("Width and height must be numeric.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setLogs([]);
    setProgress("Initializing FFmpeg...");
    setConvertedUrl(null);
    setConvertedBlobSize(null);
    setInputMetadata({});
    setOutputMetadata({});

    try {
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }
      // Write file to FS
      ffmpeg.FS("writeFile", "input", await fetchFile(selectedFile));

      // 1) Probe input
      const inMeta = await probeFile("input");
      setInputMetadata(inMeta);

      // 2) Apply scale filter to change resolution
      // e.g. ffmpeg -i input -vf scale=1280:720 output.mp4
      const scaleArg = getScaleArgument();
      await ffmpeg.run("-i", "input", "-vf", `scale=${scaleArg}`, "output.mp4");

      // 3) Read the output
      const data = ffmpeg.FS("readFile", "output.mp4");

      // 4) Create blob and object URL
      const convertedBlob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(convertedBlob);
      setConvertedUrl(url);
      setProgress("Done! Resolution changed successfully.");

      // 5) Probe output
      const outMeta = await probeFile("output.mp4");
      setOutputMetadata(outMeta);

      // 6) Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error(err);
      setError(`Error changing resolution: ${err.message}`);
    }
    setLoading(false);
  };

  // Toggle console
  const toggleConsole = () => setShowConsole(!showConsole);
  const clearLogs = () => setLogs([]);

  // Decide if we can show the *input* preview
  const canShowInputPreview =
    selectedFile && isBrowserPlayableFile(selectedFile);

  // We always produce MP4, so likely playable in modern browsers
  const canShowOutputPreview = !!convertedUrl;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-4 text-center">Change Video Resolution</h1>

      {/* FileLoader */}
      <FileLoader onFileSelect={handleFileSelect}>
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
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
          Drag &amp; drop a video, paste (Ctrl+V), or click to select
        </p>
      </FileLoader>

      {/* Input file preview */}
      {selectedFile && (
        <div className="mt-4">
          <p className="font-semibold">Selected: {selectedFile.name}</p>
          {!canShowInputPreview ? (
            <p className="mt-2 text-yellow-400">
              Preview not available (unsupported format or codec).
            </p>
          ) : (
            previewUrl && (
              <video
                className="mt-2 max-w-full border border-gray-700 rounded"
                controls
                src={previewUrl}
              />
            )
          )}
        </div>
      )}

      {/* Resolution mode: Preset or Custom */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-gray-200">
            <input
              type="radio"
              name="resMode"
              value="preset"
              checked={resolutionMode === "preset"}
              onChange={() => setResolutionMode("preset")}
              className="mr-1"
            />
            Preset
          </label>
          <label className="text-gray-200">
            <input
              type="radio"
              name="resMode"
              value="custom"
              checked={resolutionMode === "custom"}
              onChange={() => setResolutionMode("custom")}
              className="mr-1"
            />
            Custom
          </label>
        </div>

        {/* If preset, show dropdown */}
        {resolutionMode === "preset" && (
          <div className="flex items-center gap-2">
            <label htmlFor="resolution" className="text-gray-200">
              Target Resolution:
            </label>
            <select
              id="resolution"
              className="text-black p-2 rounded"
              value={targetResolution}
              onChange={(e) => setTargetResolution(e.target.value)}
            >
              {resolutionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* If custom, show width/height inputs */}
        {resolutionMode === "custom" && (
          <div className="flex items-center gap-2">
            <label className="text-gray-200">Width:</label>
            <input
              type="number"
              className="w-20 text-black p-1 rounded"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
            />
            <label className="text-gray-200">Height:</label>
            <input
              type="number"
              className="w-20 text-black p-1 rounded"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap gap-4">
        <button
          onClick={handleChangeResolution}
          disabled={!ffmpeg || loading}
          className={`px-4 py-2 rounded transition-colors ${
            !ffmpeg || loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Processing..." : "Change Resolution"}
        </button>

        <button
          onClick={toggleConsole}
          className="px-4 py-2 bg-purple-500 rounded hover:bg-purple-600 transition-colors"
        >
          {showConsole ? "Hide Console" : "Show Console"}
        </button>
      </div>

      {/* Status or error */}
      {progress && <p className="mt-2 text-sm text-blue-300">{progress}</p>}
      {error && <p className="mt-2 text-red-500">{error}</p>}

      {/* Input metadata */}
      {inputMetadata.duration && (
        <div className="mt-4 p-2 border border-gray-700 bg-gray-800 rounded">
          <h2 className="text-lg mb-1">Input Video Info</h2>
          <p>Duration: {inputMetadata.duration}</p>
          <p>Resolution: {inputMetadata.resolution || "Unknown"}</p>
          <p>Bitrate: {inputMetadata.bitrate || "Unknown"}</p>
          <p>File Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}

      {/* Output preview & download */}
      {convertedUrl && (
        <div className="mt-6">
          <h2 className="text-xl mb-2">Converted Video</h2>
          {canShowOutputPreview ? (
            <video
              className="w-full max-w-xl border border-gray-700 rounded mb-2"
              controls
              src={convertedUrl}
            />
          ) : (
            <p className="mb-2 text-yellow-400">
              Preview not available in this browser.
            </p>
          )}
          <a
            href={convertedUrl}
            download="changed_resolution.mp4"
            className="inline-block px-4 py-2 bg-green-500 rounded hover:bg-green-600 transition-colors"
          >
            Download Converted Video
          </a>
        </div>
      )}

      {/* Output metadata */}
      {outputMetadata.duration && (
        <div className="mt-4 p-2 border border-gray-700 bg-gray-800 rounded">
          <h2 className="text-lg mb-1">Output Video Info</h2>
          <p>Duration: {outputMetadata.duration}</p>
          <p>Resolution: {outputMetadata.resolution || "Unknown"}</p>
          <p>Bitrate: {outputMetadata.bitrate || "Unknown"}</p>
          {convertedBlobSize !== null && (
            <p>
              File Size: {(convertedBlobSize / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </div>
      )}

      {/* Console logs */}
      {showConsole && (
        <div className="mt-6 bg-gray-800 p-4 rounded">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg">FFmpeg Console Logs</h3>
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-red-500 rounded hover:bg-red-600 transition-colors text-sm"
            >
              Clear Logs
            </button>
          </div>
          <div className="max-h-64 overflow-auto text-sm border border-gray-700 rounded p-2 bg-black">
            {logs.length === 0 ? (
              <p className="text-gray-400">No logs yet.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-gray-300 whitespace-pre-wrap">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Info / disclaimers */}
      <div className="mt-8 p-4 border border-gray-700 rounded bg-gray-800 text-sm text-gray-300">
        <p>
          This tool uses{" "}
          <a
            href="https://github.com/ffmpegwasm/ffmpeg.wasm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            ffmpeg.wasm
          </a>{" "}
          to change video resolution directly in your browser.
        </p>
        <p className="mt-2">
          If you encounter issues, consider a server-side solution or a local
          tool for large files.
        </p>
      </div>
    </div>
  );
};

export default ChangeVideoResolutionPage;
