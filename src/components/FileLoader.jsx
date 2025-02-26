import React, { useRef, useState, useEffect } from "react";

const FileLoader = ({ onFileSelect, children }) => {
  const [dragOver, setDragOver] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const dropZoneRef = useRef(null);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    setCurrentFile(file);
    onFileSelect(file);
  };

  const removeFile = () => {
    setCurrentFile(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  // Global paste listener.
  useEffect(() => {
    const handlePaste = (e) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        handleFile(e.clipboardData.files[0]);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <div
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors cursor-pointer
         ${dragOver ? "border-blue-400 bg-blue-900" : "border-gray-600 bg-gray-800"}
         min-h-[300px] p-4 pb-200`}
    >
      {children}
      {currentFile && (
        <p className="mt-2 text-sm text-gray-300">
          Selected: {currentFile.name}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <input
          type="file"
          // Updated accept to allow video
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
          id="fileInput"
          ref={inputRef}
        />
        <label
          htmlFor="fileInput"
          className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 transition-colors cursor-pointer text-sm"
        >
          {currentFile ? "Change File" : "Browse Files"}
        </label>
        {currentFile && (
          <button
            onClick={removeFile}
            className="px-3 py-1 bg-red-500 rounded hover:bg-red-600 transition-colors text-sm"
          >
            Remove File
          </button>
        )}
      </div>
    </div>
  );
};

export default FileLoader;
