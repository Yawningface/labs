import React, { useState, useEffect } from "react";
import FileLoader from "../../components/FileLoader";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import confetti from "canvas-confetti";

/**
 * Checks if a video format is likely playable in most modern browsers
 * by examining the container/extension. This is a simple approach.
 */
function isBrowserPlayableFormat(format) {
  // Common HTML5 video containers:
  //   mp4, webm, ogg
  // Some browsers also handle .mov or .mkv with certain codecs,
  // but we’ll keep it simple.
  const playableFormats = ["mp4", "webm", "ogg"];
  return playableFormats.includes(format.toLowerCase());
}

/**
 * Checks if a video file is likely playable by looking at its MIME type.
 */
function isBrowserPlayableFile(file) {
  if (!file || !file.type.startsWith("video/")) return false;
  const playableTypes = ["video/mp4", "video/webm", "video/ogg"];
  return playableTypes.includes(file.type);
}

/**
 * Parse relevant info from FFmpeg logs.
 */
function parseMetadata(logs) {
  let duration = null;
  let bitrate = null;
  let resolution = null;

  for (const line of logs) {
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
    if (line.includes("Stream #") && line.includes("Video:")) {
      const resMatch = line.match(/,\s(\d+)x(\d+)[,\s]/);
      if (resMatch) {
        resolution = `${resMatch[1]}x${resMatch[2]}`;
      }
    }
  }
  return { duration, bitrate, resolution };
}

const ChangeVideoFormatPage = () => {
  // ffmpeg instance
  const [ffmpeg, setFfmpeg] = useState(null);

  // Selected file from FileLoader
  const [selectedFile, setSelectedFile] = useState(null);

  // For previewing the original video
  const [previewUrl, setPreviewUrl] = useState(null);

  // Error and loading states
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Output format selection (e.g., mp4, webm, mkv, etc.)
  const [outputFormat, setOutputFormat] = useState("mp4");

  // Store the URL of the converted video for download
  const [convertedUrl, setConvertedUrl] = useState(null);

  // Short progress status (like "Converting: 40%")
  const [progress, setProgress] = useState("");

  // FFmpeg console logs (for advanced debugging)
  const [logs, setLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);

  // Input & output video metadata
  const [inputMetadata, setInputMetadata] = useState({});
  const [outputMetadata, setOutputMetadata] = useState({});

  // Track converted file size (to display in MB)
  const [convertedBlobSize, setConvertedBlobSize] = useState(null);

  useEffect(() => {
    const loadFfmpeg = async () => {
      try {
        const _ffmpeg = createFFmpeg({
          log: true,
          progress: ({ ratio }) => {
            setProgress(`Converting: ${(ratio * 100).toFixed(2)}%`);
          },
        });

        _ffmpeg.setLogger(({ type, message }) => {
          // e.g., 'info', 'ffout', 'fferr'
          setLogs((prev) => [...prev, `[${type}] ${message}`]);
        });

        setFfmpeg(_ffmpeg);
      } catch (err) {
        setError("Failed to load ffmpeg. Please refresh the page.");
      }
    };
    loadFfmpeg();
  }, []);

  // Update previewUrl when a new file is selected
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // Whenever convertedUrl changes, fetch its size in a separate async call
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

  // Handle file selection from FileLoader
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setConvertedUrl(null);
    setError(null);
    setProgress("");
    setLogs([]);
    setInputMetadata({});
    setOutputMetadata({});
    setConvertedBlobSize(null);
  };

  // Temporarily override the logger to parse metadata logs,
  // but also forward them to our main console logs
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

  // Perform the conversion
  const handleConvertVideo = async () => {
    if (!selectedFile) {
      setError("Please select a video file first.");
      return;
    }
    if (!ffmpeg) {
      setError("FFmpeg is still loading. Please wait...");
      return;
    }

    setLoading(true);
    setError(null);
    setConvertedUrl(null);
    setProgress("Initializing FFmpeg...");
    setLogs([]);
    setInputMetadata({});
    setOutputMetadata({});
    setConvertedBlobSize(null);

    try {
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }
      // Write input file to FFmpeg FS
      ffmpeg.FS("writeFile", "input", await fetchFile(selectedFile));

      // 1) Probe the input file to get metadata
      const inMeta = await probeFile("input");
      setInputMetadata(inMeta);

      // 2) Convert to the chosen format
      const outputFileName = `output.${outputFormat}`;
      await ffmpeg.run("-i", "input", outputFileName);

      // 3) Read the result
      const data = ffmpeg.FS("readFile", outputFileName);

      // 4) Create a Blob from the output data
      const convertedBlob = new Blob([data.buffer], {
        type: `video/${outputFormat}`,
      });
      const url = URL.createObjectURL(convertedBlob);
      setConvertedUrl(url);
      setProgress("Conversion complete!");

      // 5) Probe the output file for metadata
      const outMeta = await probeFile(outputFileName);
      setOutputMetadata(outMeta);

      // 6) Throw confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error(err);
      setError("Error converting the video: " + err.message);
    }
    setLoading(false);
  };

  // Decide if we can show the preview player for the *input* file
  const canShowInputPlayer = selectedFile && isBrowserPlayableFile(selectedFile);

  // Decide if we can show the preview player for the *output* file
  const canShowOutputPlayer = convertedUrl && isBrowserPlayableFormat(outputFormat);

  // Toggle advanced console
  const toggleConsole = () => setShowConsole(!showConsole);

  // Clear console logs
  const clearLogs = () => setLogs([]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl mb-4 text-center">Change Video Format</h1>

      {/* FileLoader for picking the video */}
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

      {/* Show selected video name and a small preview if it's playable */}
      {selectedFile && (
        <div className="mt-4">
          <p className="font-semibold">Selected: {selectedFile.name}</p>
          {!canShowInputPlayer ? (
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

      {/* Output format selection */}
      <div className="mt-4 flex items-center gap-4">
        <label htmlFor="outputFormat" className="text-gray-200">
          Output Format:
        </label>
        <select
          id="outputFormat"
          className="text-black p-2 rounded"
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value)}
        >
          <option value="mp4">MP4</option>
          <option value="webm">WebM</option>
          <option value="mkv">MKV</option>
          <option value="avi">AVI</option>
          <option value="mov">MOV</option>
          {/* Add more if desired */}
        </select>
      </div>

      {/* Convert & Console Toggle buttons */}
      <div className="mt-4 flex flex-wrap gap-4">
        <button
          onClick={handleConvertVideo}
          disabled={!ffmpeg || loading}
          className={`px-4 py-2 rounded transition-colors ${
            !ffmpeg || loading
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Converting..." : "Convert Video"}
        </button>

        {/* Toggle advanced console */}
        <button
          onClick={toggleConsole}
          className="px-4 py-2 bg-purple-500 rounded hover:bg-purple-600 transition-colors"
        >
          {showConsole ? "Hide Console" : "Show Console"}
        </button>
      </div>

      {/* Show progress or error messages */}
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

      {/* Download or preview the converted video */}
      {convertedUrl && (
        <div className="mt-6">
          <h2 className="text-xl mb-2">Converted Video</h2>
          {/* Only show preview if the chosen format is typically playable */}
          {canShowOutputPlayer ? (
            <video
              className="w-full max-w-xl border border-gray-700 rounded mb-2"
              controls
              src={convertedUrl}
            />
          ) : (
            <p className="mb-2 text-yellow-400">
              Preview not available for {outputFormat}.
            </p>
          )}
          <a
            href={convertedUrl}
            download={`converted.${outputFormat}`}
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

      {/* Advanced Console Accordion */}
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

      {/* Info or disclaimers */}
      <div className="mt-8 p-4 border border-gray-700 rounded bg-gray-800 text-sm text-gray-300">
        <p>
          Video conversion is powered by{" "}
          <a
            href="https://github.com/ffmpegwasm/ffmpeg.wasm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            ffmpeg.wasm
          </a>
          , which runs FFmpeg in your browser. This may be slow or memory-intensive
          for large files.
        </p>
        <p className="mt-2">
          If you encounter issues, consider using a server-side solution or a more
          powerful local tool.
        </p>
      </div>
    </div>
  );
};

export default ChangeVideoFormatPage;
