"use client";

import { useState, useMemo } from "react";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import ImageInput from "../../components/ImageInput.jsx";

export default function ReelGeneratorPage() {
  const [overlayText, setOverlayText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [songFile, setSongFile] = useState(null);
  const [selectedPredefinedSong, setSelectedPredefinedSong] = useState("");
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(null);
  const [error, setError] = useState(null);

  const predefinedSongs = [
    { name: "Aura (Slowed + Reverb)", url: "https://ehxuban11.github.io/yawningStudioTools/songs/aura_super_slowed_reverb.mp3" },
    { name: "Chubina", url: "https://ehxuban11.github.io/yawningStudioTools/songs/chubina.mp3" },
    { name: "Je te laisserai des mots", url: "https://ehxuban11.github.io/yawningStudioTools/songs/je_te_laisserai_des_mots.mp3" },
    { name: "Memory Reboot (Slowed)", url: "https://ehxuban11.github.io/yawningStudioTools/songs/memory_reboot_slowed.mp3" },
    { name: "Snowfall", url: "https://ehxuban11.github.io/yawningStudioTools/songs/snowfall.mp3" },
    { name: "Void (Super Slowed)", url: "https://ehxuban11.github.io/yawningStudioTools/songs/void_super_slowed.mp3" },
  ];

  // Create the ffmpeg instance only once using useMemo
  const ffmpeg = useMemo(() => createFFmpeg({ log: true }), []);

  ffmpeg.setProgress(({ ratio }) => {
    setProgress(Math.round(ratio * 100));
  });

  const handleGenerateVideo = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    const startTime = Date.now();

    try {
      if (!imageFile || (!songFile && !selectedPredefinedSong) || !overlayText.trim()) {
        throw new Error("Please upload an image, select a song (or predefined one), and enter overlay text.");
      }

      // Create a canvas to compose the video frame
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const image = new Image();

      image.src = URL.createObjectURL(imageFile);
      await new Promise((resolve) => (image.onload = resolve));

      const FRAME_WIDTH = 1080;
      const FRAME_HEIGHT = 1920;
      canvas.width = FRAME_WIDTH;
      canvas.height = FRAME_HEIGHT;

      // Draw top and bottom black rectangles
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, FRAME_WIDTH, 400);
      ctx.fillRect(0, 1450, FRAME_WIDTH, 400);

      // Draw a white rectangle in the middle-top section for text overlay
      ctx.fillStyle = "white";
      ctx.fillRect(0, 400, FRAME_WIDTH, 270);

      // Draw the overlay text
      ctx.fillStyle = "black";
      ctx.font = "48px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(overlayText, FRAME_WIDTH / 2, 535);

      // Draw the uploaded image in the specified area
      ctx.drawImage(image, 0, 670, FRAME_WIDTH, 850);

      // Convert canvas to a JPEG buffer
      const frameDataUrl = canvas.toDataURL("image/jpeg");
      const frameBlob = await fetch(frameDataUrl).then((res) => res.blob());
      const frameBuffer = await frameBlob.arrayBuffer();

      // Get the audio buffer either from the predefined URL or the uploaded file
      const songBuffer = selectedPredefinedSong
        ? await fetch(selectedPredefinedSong).then((res) => res.arrayBuffer())
        : await songFile.arrayBuffer();

      // Load ffmpeg if not already loaded
      if (!ffmpeg.isLoaded()) await ffmpeg.load();

      // Write the frame and audio to ffmpeg's virtual filesystem
      ffmpeg.FS("writeFile", "frame.jpg", new Uint8Array(frameBuffer));
      ffmpeg.FS("writeFile", "audio.mp3", new Uint8Array(songBuffer));

      // Run the ffmpeg command to generate the video with a fade-in effect
      await ffmpeg.run(
        "-loop", "1", "-i", "frame.jpg",
        "-i", "audio.mp3",
        "-vf", "fade=in:0:25",
        "-c:v", "libx264",
        "-t", "5",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "output.mp4"
      );

      // Retrieve the output video and create a blob URL for it
      const videoData = ffmpeg.FS("readFile", "output.mp4");
      const videoBlob = new Blob([videoData.buffer], { type: "video/mp4" });
      const videoUrl = URL.createObjectURL(videoBlob);

      setGeneratedVideo(videoUrl);

      const endTime = Date.now();
      setElapsedTime(((endTime - startTime) / 1000).toFixed(2));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101827] p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-12 text-white text-center">One-Step Video Generator</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-10">
            <div className="space-y-6">
              <h2 className="text-2xl text-[#9ca3af] font-medium">Step 1: Enter Overlay Text</h2>
              <input
                type="text"
                placeholder="Enter text for overlay"
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                className="w-full p-4 rounded-lg bg-[#1F2937] text-[#e5e7eb]"
              />
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl text-[#9ca3af] font-medium">Step 2: Upload an Image</h2>
              <ImageInput onImageChange={setImageFile} />
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl text-[#9ca3af] font-medium">Step 3: Choose or Upload a Song</h2>
              <select
                value={selectedPredefinedSong}
                onChange={(e) => setSelectedPredefinedSong(e.target.value)}
                className="w-full p-4 rounded-lg bg-[#1F2937] text-[#e5e7eb]"
              >
                <option value="">-- Select a predefined song --</option>
                {predefinedSongs.map((song, index) => (
                  <option key={index} value={song.url}>
                    {song.name}
                  </option>
                ))}
              </select>

              <p className="text-center text-[#9ca3af] my-2">OR</p>

              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setSongFile(e.target.files[0])}
                className="w-full p-4 rounded-lg bg-[#1F2937] text-[#e5e7eb]"
              />
            </div>

            <button
              onClick={handleGenerateVideo}
              disabled={loading}
              className={`w-full bg-[#ebb305] py-4 rounded-lg text-lg font-medium ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              {loading ? "Processing..." : "Generate Video"}
            </button>

            {error && <p className="text-red-500 text-center">{error}</p>}
            {loading && <p className="text-center text-[#9ca3af]">Progress: {progress}%</p>}
          </div>

          <div className="flex flex-col items-center space-y-6 lg:pt-12">
            <h2 className="text-2xl text-[#9ca3af] font-medium">Generated Video</h2>
            {generatedVideo ? (
              <video controls className="w-[320px] h-[568px] rounded-lg">
                <source src={generatedVideo} type="video/mp4" />
              </video>
            ) : (
              <div className="w-[320px] h-[568px] flex items-center justify-center bg-[#1F2937] rounded-lg">
                <p className="text-[#9ca3af]">Video will appear here</p>
              </div>
            )}
            {elapsedTime && <p className="text-[#9ca3af]">Generated in {elapsedTime} seconds</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
