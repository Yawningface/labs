import React from 'react';
import { Star } from 'lucide-react';

const Hero = () => {
  return (
    <section className="bg-gray-900 text-white py-20 px-6 md:px-12 lg:px-24 text-center">
      <div className="max-w-4xl mx-auto">
        {/* Main Title */}
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Experimental Tools by{' '}
          <span className="text-[#ebb305]">Yawning Face</span> 🥱
        </h1>

        {/* Colorful Subtitle (Emphasized) */}
        <p className="text-lg md:text-xl font-semibold leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
            NO server
          </span>
          , it all happens in your web{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            browser
          </span>
        </p>

        {/* Open Source & Star Repo Section */}
        <p className="mt-6 text-sm font-semibold text-gray-400">
          100% Free & Open Source
          <a
            href="https://github.com/EHxuban11/block"
            className="inline-flex items-center gap-1 text-yellow-400 ml-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Star size={14} /> Star Repo
          </a>
        </p>
      </div>
    </section>
  );
};

export default Hero;
