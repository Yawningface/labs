import React from "react";
import Hero from "../components/Landing/Hero";
import Footer from "../components/Landing/Footer";
import ToolComponent from "../components/ToolComponent";

function Landing() {
  return (
    <div className="flex flex-col items-center gap-10 bg-gray-900 text-white p-10">
      <Hero />

      {/* Content Creation Tools Section */}
      <section className="flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold text-center">Content Creation Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolComponent
            title="Youtube Thumbnail"
            description="Generate thumbnail for a YouTube Vlog"
            icon="🤳"
            link="/thumbnail-generator"
          />
          <ToolComponent
            title="Reel Generator"
            description="Generate an Instagram reel with your image, text, and song"
            icon="🎥"
            link="/reel-generator"
          />
        </div>
      </section>

      {/* Image Tools Section */}
      <section className="flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold text-center">Image Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolComponent
            title="Image Color Picker"
            description="Pick colors from images easily"
            icon="🎨"
            link="/image-color-picker"
          />
          <ToolComponent
            title="Compress Image"
            description="Reduce image file size efficiently"
            icon="🗜️"
            link="/compress-image"
          />
          <ToolComponent
            title="Resize Image"
            description="Adjust image dimensions easily"
            icon="📏"
            link="/resize-image"
          />
          <ToolComponent
            title="Convert Image Format"
            description="Change images to different formats"
            icon="🔄"
            link="/convert-image"
          />
          <ToolComponent
            title="Remove Background"
            description="Easily remove backgrounds from images"
            icon="🧼"
            link="/remove-background"
          />
          <ToolComponent
            title="Add Watermark"
            description="Protect your images with a watermark"
            icon="🔖"
            link="/add-watermark"
          />
          <ToolComponent
            title="Turn Image"
            description="Rotate or flip your images"
            icon="↩️"
            link="/turn-image"
          />
        </div>
      </section>

      {/* PDF Tools Section */}
      <section className="flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold text-center">PDF Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolComponent
            title="Combine PDF"
            description="Merge multiple PDFs into a single document"
            icon="🔗"
            link="/combine-pdf"
          />
          <ToolComponent
            title="Split PDF"
            description="Split a PDF into multiple files"
            icon="✂️"
            link="/split-pdf"
          />
          <ToolComponent
            title="Compress PDF"
            description="Reduce the file size of your PDFs"
            icon="🗜️"
            link="/compress-pdf"
          />
          <ToolComponent
            title="Sign a PDF"
            description="Digitally sign your PDF documents"
            icon="✍️"
            link="/sign-pdf"
          />
        </div>
      </section>

      {/* Video Tools Section */}
      <section className="flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold text-center">Video Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolComponent
            title="Change Video Format"
            description="Convert your video to different formats"
            icon="🎞️"
            link="/change-video-format"
          />
          <ToolComponent
            title="Change Video Resolution"
            description="Change the resolution of your video"
            icon="⚙️"
            link="/change-video-resolution"
          />
          <ToolComponent
            title="Extract Video Clips"
            description="Extract short clips from a longer video"
            icon="✂️"
            link="/extract-video-clips"
          />
          <ToolComponent
            title="Youtube Transcription Generator"
            description="Extract transcription from youtube"
            icon="📝"
            link="/youtube-transcription"
          />
        </div>
        
      </section>

      {/* Developers Section */}
      <section className="flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold text-center">Developer Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolComponent
            title="Chrome Extension Icon Generator"
            description="Generate icons for your Chrome extensions"
            icon="🔌"
            link="/chrome-extension-icon-generator"
          />
          <ToolComponent
            title="Favicon Generator"
            description="Generate a favicon for your website"
            icon="🌐"
            link="/favicon-generator"
          />
          <ToolComponent
            title="Readme Generator"
            description="Generate a README for your project"
            icon="📄"
            link="/readme-generator"
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Landing;
