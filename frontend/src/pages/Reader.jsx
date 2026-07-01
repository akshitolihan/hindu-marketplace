import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import api from '../api/client';

// Point pdf.js at its worker (bundled by Vite from pdfjs-dist).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const Reader = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const title = location.state?.title || 'Reading';

  const [fileUrl, setFileUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [baseWidth, setBaseWidth] = useState(800);

  // Fetch the PDF bytes through our own backend (ownership-checked) and turn
  // them into a same-origin blob URL so pdf.js can render it.
  useEffect(() => {
    let revoked = null;
    api
      .get(`/library/${id}/file`, { responseType: 'blob' })
      .then((res) => {
        const b = res.data;
        setBlob(b);
        const url = URL.createObjectURL(b);
        revoked = url;
        setFileUrl(url);
      })
      .catch((e) => {
        setError(e.response?.status === 403 ? 'You do not own this book.' : 'Could not load the book.');
      })
      .finally(() => setLoading(false));
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [id]);

  // Keep the page width responsive to the viewport.
  useEffect(() => {
    const update = () => setBaseWidth(Math.min((containerRef.current?.clientWidth || 800) - 24, 820));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [fileUrl]);

  const go = useCallback(
    (delta) => setPageNumber((p) => Math.min(Math.max(1, p + delta), numPages || 1)),
    [numPages]
  );

  // Keyboard navigation: arrows / page up-down.
  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(1); }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const download = () => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^\w\- ]+/g, '')}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed inset-0 bg-[#1c1611] flex flex-col z-50">
      {/* Top toolbar */}
      <div className="bg-gradient-to-r from-maroon-dark to-maroon text-cream px-4 py-2.5 flex items-center justify-between shadow-lg flex-shrink-0 border-b border-gold/20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/my-library')}
            className="hover:text-gold transition flex items-center gap-1 flex-shrink-0"
            title="Back to library"
          >
            ← <span className="hidden sm:inline">Library</span>
          </button>
          <span className="text-lg">🕉️</span>
          <h1 className="font-display text-lg font-semibold truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          {/* Pager */}
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
            <button onClick={() => go(-1)} disabled={pageNumber <= 1} className="px-2 disabled:opacity-40 hover:text-gold">‹</button>
            <span className="text-xs tabular-nums whitespace-nowrap">{pageNumber} / {numPages || '–'}</span>
            <button onClick={() => go(1)} disabled={pageNumber >= numPages} className="px-2 disabled:opacity-40 hover:text-gold">›</button>
          </div>
          {/* Zoom */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
            <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))} className="px-2 hover:text-gold">−</button>
            <span className="text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(2)))} className="px-2 hover:text-gold">+</button>
          </div>
          <button
            onClick={download}
            className="btn btn-gold btn-sm"
          >
            ↓ <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Reading area */}
      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center py-6 px-2">
        {loading && <p className="text-gray-300 mt-10">Loading your book…</p>}
        {error && (
          <div className="text-center mt-16">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="text-gray-200 mb-4">{error}</p>
            <button onClick={() => navigate('/my-library')} className="bg-saffron text-maroon px-5 py-2 rounded-full font-semibold">
              Back to Library
            </button>
          </div>
        )}
        {fileUrl && !error && (
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            onLoadError={() => setError('Could not render this PDF.')}
            loading={<p className="text-gray-300 mt-10">Rendering…</p>}
          >
            <div className="shadow-2xl rounded overflow-hidden bg-white">
              <Page
                pageNumber={pageNumber}
                width={baseWidth * zoom}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          </Document>
        )}
      </div>

      {/* Mobile pager footer */}
      <div className="sm:hidden bg-maroon/95 text-white flex items-center justify-center gap-6 py-2 flex-shrink-0">
        <button onClick={() => go(-1)} disabled={pageNumber <= 1} className="px-6 py-1 disabled:opacity-40">‹ Prev</button>
        <span className="text-sm tabular-nums">{pageNumber} / {numPages || '–'}</span>
        <button onClick={() => go(1)} disabled={pageNumber >= numPages} className="px-6 py-1 disabled:opacity-40">Next ›</button>
      </div>
    </div>
  );
};

export default Reader;
