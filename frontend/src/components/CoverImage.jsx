import React from 'react';

// Renders a book cover that looks premium no matter the source image's aspect
// ratio: a blurred, zoomed copy fills the frame while the full image sits on
// top (object-contain), so nothing is ever awkwardly cropped. Portrait book
// covers fill the frame edge-to-edge; odd/landscape images get a tasteful
// framed look instead of a bad crop.
const CoverImage = ({ src, alt = '', className = '', rounded = '', iconSize = 'text-5xl' }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-sand to-[#e8dcc4] ${rounded} ${className}`}>
    {src ? (
      <>
        <div
          className="absolute inset-0 bg-center bg-cover blur-2xl scale-125 opacity-55"
          style={{ backgroundImage: `url("${src}")` }}
          aria-hidden="true"
        />
        <img src={src} alt={alt} className="relative z-10 w-full h-full object-contain" loading="lazy" />
      </>
    ) : (
      <div className={`w-full h-full grid place-items-center text-maroon/25 ${iconSize}`}>📖</div>
    )}
  </div>
);

export default CoverImage;
