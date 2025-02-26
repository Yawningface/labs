import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';

// Content
import ThumbnailGeneratorPage from './pages/content/ThumbnailGeneratorPage';
import ReelGeneratorPage from './pages/content/ReelGeneratorPage';

// Images
import ImageColorPickePage from './pages/images/ImageColorPickePage';
import CompressImagePage from './pages/images/CompressImagePage';
import ResizeImagePage from './pages/images/ResizeImagePage';
import CutImagePage from './pages/images/CutImagePage';
import ConvertImagePage from './pages/images/ConvertImagePage';
import RemoveBackgroundPage from './pages/images/RemoveBackgroundPage';
import AddWatermarkPage from './pages/images/AddWatermarkPage';
import TurnImagePage from './pages/images/TurnImagePage';

// PDF
import CombinePdfPage from './pages/pdf/CombinePdfPage';
import SplitPdfPage from './pages/pdf/SplitPdfPage';
import CompressPdfPage from './pages/pdf/CompressPdfPage';
import SignPdfPage from './pages/pdf/SignPdfPage';

// Developers
import ChromeExtensionIconGeneratorPage from './pages/developers/ChromeExtensionIconGeneratorPage';
import FaviconGeneratorPage from './pages/developers/FaviconGeneratorPage';

// Video
import ChangeVideoFormatPage from './pages/video/ChangeVideoFormatPage';
import ChangeVideoResolutionPage from './pages/video/ChangeVideoResolutionPage';
import ExtractVideoClipsPage from './pages/video/ExtractVideoClipsPage';

function App() {
  return (
    <div className="w-full min-h-screen bg-[#101827] p-6">
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Content Routes */}
        <Route path="/thumbnail-generator" element={<ThumbnailGeneratorPage />} />
        <Route path="/reel-generator" element={<ReelGeneratorPage />} />

        {/* Image Routes */}
        <Route path="/image-color-picker" element={<ImageColorPickePage />} />
        <Route path="/compress-image" element={<CompressImagePage />} />
        <Route path="/resize-image" element={<ResizeImagePage />} />
        {/* <Route path="/cut-image" element={<CutImagePage />} /> */}
        <Route path="/convert-image" element={<ConvertImagePage />} />
        <Route path="/turn-image" element={<TurnImagePage />} />
        <Route path="/remove-background" element={<RemoveBackgroundPage />} />
        <Route path="/add-watermark" element={<AddWatermarkPage />} />

        {/* PDF Routes */}
        <Route path="/combine-pdf" element={<CombinePdfPage />} />
        <Route path="/split-pdf" element={<SplitPdfPage />} />
        <Route path="/compress-pdf" element={<CompressPdfPage />} />
        <Route path="/sign-pdf" element={<SignPdfPage />} />

        {/* Developer Routes */}
        <Route path="/chrome-extension-icon-generator" element={<ChromeExtensionIconGeneratorPage />} />
        <Route path="/favicon-generator" element={<FaviconGeneratorPage />} />

        {/* Video Routes */}
        <Route path="/change-video-format" element={<ChangeVideoFormatPage />} />
        <Route path="/change-video-resolution" element={<ChangeVideoResolutionPage />} />
        <Route path="/extract-video-clips" element={<ExtractVideoClipsPage />} />
      </Routes>
    </div>
  );
}

export default App;
