import React, { useState, useEffect, useRef } from "react";
import FileLoader from "../../components/FileLoader";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import ReactPlayer from "react-player";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import confetti from "canvas-confetti";

function ExtractVideoClipsPage() {
  const [ffmpeg, setFfmpeg] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [clipUrl, setClipUrl] = useState(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [logs, setLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const playerRef = useRef(null);

  // Load FFmpeg and setup logger/progress
  useEffect(() => {
    const loadFfmpeg = async () => {
      const _ffmpeg = createFFmpeg({
        log: true,
        progress: ({ ratio }) => {
          setProgress(`Processing: ${(ratio * 100).toFixed(0)}%`);
        },
      });
      _ffmpeg.setLogger(({ type, message }) => {
        setLogs((prev) => [...prev, `[${type}] ${message}`]);
      });
      await _ffmpeg.load();
      setFfmpeg(_ffmpeg);
    };

    loadFfmpeg();
  }, []);

  // Handle file selection and auto-conversion if needed
  useEffect(() => {
    if (!selectedFile || !ffmpeg) return;

    const processFile = async () => {
      let url;
      const isMp4 = selectedFile.type === "video/mp4";

      // If file is not MP4, auto convert immediately
      if (!isMp4) {
        setIsConverting(true);
        setShowConsole(true);
        setProgress("Converting to MP4...");
        try {
          // Write the input file to FFmpeg FS
          ffmpeg.FS("writeFile", "input", await fetchFile(selectedFile));
          // Run conversion command
          await ffmpeg.run("-i", "input", "converted.mp4");
          const data = ffmpeg.FS("readFile", "converted.mp4");
          const convertedBlob = new Blob([data.buffer], { type: "video/mp4" });
          url = URL.createObjectURL(convertedBlob);
          // Clear logs after conversion (optional)
          setLogs([]);
        } catch (err) {
          setError("Failed to convert video. Try another file.");
          console.error(err);
          return;
        }
        setIsConverting(false);
      } else {
        url = URL.createObjectURL(selectedFile);
      }
      setPreviewUrl(url);
      setClipUrl(null);
      setStartTime(0);
      setEndTime(0);
      setError(null);
    };

    processFile();
  }, [selectedFile, ffmpeg]);

  // Handle file selection from FileLoader
  const handleFileSelect = (file) => {
    if (!file.type.startsWith("video/")) {
      setError("Please select a video file.");
      return;
    }
    setSelectedFile(file);
    // Reset state on new file
    setPreviewUrl(null);
    setClipUrl(null);
    setError(null);
    setLogs([]);
    setProgress("");
  };

  // Set duration for slider control once metadata is loaded
  const handleLoadedMetadata = (duration) => {
    setDuration(duration);
    setEndTime(duration);
  };

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Extract a clip using the selected start/end times
  const handleExtractClip = async () => {
    if (!ffmpeg || !previewUrl) return;
    setError(null);
    setClipUrl(null);
    setProgress("Extracting clip...");

    try {
      // Write working file if not already in FS
      try {
        ffmpeg.FS("stat", "working.mp4");
      } catch (err) {
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        ffmpeg.FS("writeFile", "working.mp4", await fetchFile(blob));
      }
      await ffmpeg.run(
        "-i",
        "working.mp4",
        "-ss",
        `${startTime}`,
        "-to",
        `${endTime}`,
        "-c:v",
        "copy",
        "-c:a",
        "copy",
        "output.mp4"
      );
      const data = ffmpeg.FS("readFile", "output.mp4");
      const clipBlob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(clipBlob);
      setClipUrl(url);
      setProgress("Clip extracted!");

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      setError("Failed to extract clip. Try again.");
      console.error(err);
    }
  };

  // Toggle the accordion for FFmpeg logs
  const toggleConsole = () => setShowConsole(!showConsole);

  // Clear console logs
  const clearLogs = () => setLogs([]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <h1 className="text-3xl mb-6">Extract Video Clip</h1>

      {!selectedFile && (
        <FileLoader onFileSelect={handleFileSelect}>
          <p className="mt-4 text-lg text-gray-200">
            Drop a video here or click to select
          </p>
        </FileLoader>
      )}

      {previewUrl && (
        <div className="w-full max-w-2xl mt-4">
          <ReactPlayer
            ref={playerRef}
            url={previewUrl}
            controls
            width="100%"
            height="auto"
            playing={false}
            onDuration={handleLoadedMetadata}
          />

          {duration > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-300 mb-2">
                <span
                  className="cursor-pointer hover:text-blue-400"
                  onClick={() => playerRef.current.seekTo(startTime)}
                >
                  {formatTime(startTime)}
                </span>
                <span
                  className="cursor-pointer hover:text-red-400"
                  onClick={() => playerRef.current.seekTo(endTime)}
                >
                  {formatTime(endTime)}
                </span>
              </div>
              <Slider
                range
                min={0}
                max={duration}
                step={0.1}
                value={[startTime, endTime]}
                onChange={(value) => {
                  setStartTime(value[0]);
                  setEndTime(value[1]);
                  playerRef.current.seekTo(value[0]);
                }}
                trackStyle={[{ backgroundColor: "#3b82f6" }]}
                handleStyle={[
                  { borderColor: "#3b82f6" },
                  { borderColor: "#3b82f6" },
                ]}
              />
            </div>
          )}

          <div className="mt-4 flex gap-4">
            <button
              onClick={handleExtractClip}
              className="px-6 py-2 bg-blue-500 rounded hover:bg-blue-600"
            >
              Extract Clip
            </button>
            <button
              onClick={toggleConsole}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              {showConsole ? "Hide Console" : "Show Console"}
            </button>
          </div>
        </div>
      )}

      {showConsole && (
        <div className="mt-6 w-full max-w-2xl bg-gray-800 p-4 rounded">
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

      {clipUrl && (
        <div className="mt-6">
          <h2 className="text-xl">Your Clip</h2>
          <ReactPlayer url={clipUrl} controls width="100%" height="auto" />
          <a href={clipUrl} download="clip.mp4" className="block mt-4">
            <button className="px-6 py-2 bg-green-500 rounded hover:bg-green-600">
              Download Clip
            </button>
          </a>
        </div>
      )}

      {progress && (
        <p className="mt-4 text-sm text-blue-300">
          {progress} {isConverting && "(Auto converting...)"}
        </p>
      )}

      {error && (
        <p className="mt-4 text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export default ExtractVideoClipsPage;
