import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { THEMES, Icon, IconBtn } from '../components/reader/readerUI';

// pdf.js worker (bundled by Vite from pdfjs-dist).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Faint diagonal watermark tile of the reader's email — discourages sharing.
const watermarkTile = (text, light) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='210'><text x='10' y='150' transform='rotate(-28 170 105)' font-family='sans-serif' font-size='13' fill='${
      light ? '#ffffff' : '#3a2f22'
    }' fill-opacity='0.10'>${esc(text)}</text></svg>`
  );

const Reader = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const title = location.state?.title || 'Reading';

  // ---- document / file ----
  const [fileUrl, setFileUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [aspect, setAspect] = useState(1.414); // h/w, A4 default
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ---- reading state ----
  const [pageNumber, setPageNumber] = useState(1);
  const [mode, setMode] = useState('single'); // single | double | scroll
  const [fit, setFit] = useState('width'); // width | page
  const [zoom, setZoom] = useState(1);
  const [theme, setTheme] = useState('light');

  // ---- panels ----
  const [tocOpen, setTocOpen] = useState(false);
  const [bmOpen, setBmOpen] = useState(false);
  const [apOpen, setApOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [outline, setOutline] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);

  // ---- chrome / fullscreen ----
  const [fullscreen, setFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [resumeToast, setResumeToast] = useState(null);

  const areaRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const progressRef = useRef({ lastPage: 1, saved: 1 });
  const hideTimer = useRef(null);

  const themeCfg = THEMES[theme];
  const isDouble = mode === 'double';
  const isScroll = mode === 'scroll';

  /* ---------------- load file + progress + bookmarks ---------------- */
  useEffect(() => {
    let revoked = null;
    setLoading(true);
    Promise.all([
      api.get(`/library/${id}/file`, { responseType: 'blob' }),
      api.get(`/reader/${id}/progress`).catch(() => ({ data: null })),
      api.get(`/reader/${id}/bookmarks`).catch(() => ({ data: [] }))
    ])
      .then(([fileRes, progRes, bmRes]) => {
        const b = fileRes.data;
        setBlob(b);
        const url = URL.createObjectURL(b);
        revoked = url;
        setFileUrl(url);
        setBookmarks(bmRes.data || []);
        const saved = progRes.data?.lastPage;
        if (saved && saved > 1) {
          progressRef.current.lastPage = saved;
          setResumeToast(saved);
          setTimeout(() => setResumeToast(null), 4500);
        }
      })
      .catch((e) =>
        setError(e.response?.status === 403 ? 'You do not own this book.' : 'Could not load the book.')
      )
      .finally(() => setLoading(false));
    return () => revoked && URL.revokeObjectURL(revoked);
  }, [id]);

  /* ---------------- responsive area size ---------------- */
  useEffect(() => {
    const update = () => {
      if (areaRef.current) {
        setSize({ w: areaRef.current.clientWidth, h: areaRef.current.clientHeight });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (areaRef.current) ro.observe(areaRef.current);
    return () => ro.disconnect();
  }, [fileUrl]);

  /* ---------------- document loaded ---------------- */
  const onDocLoad = useCallback(async (pdf) => {
    setPdfDoc(pdf);
    setNumPages(pdf.numPages);
    try {
      const p1 = await pdf.getPage(1);
      const vp = p1.getViewport({ scale: 1 });
      setAspect(vp.height / vp.width);
    } catch {
      /* keep default aspect */
    }
    // resume to saved page
    const resume = progressRef.current.lastPage;
    if (resume > 1 && resume <= pdf.numPages) setPageNumber(resume);
    // build table of contents from the PDF outline
    try {
      const raw = await pdf.getOutline();
      if (raw?.length) setOutline(await flattenOutline(pdf, raw, 0));
    } catch {
      /* no outline */
    }
  }, []);

  // Resolve a pdf outline into a flat list with page numbers.
  async function flattenOutline(pdf, items, level) {
    const out = [];
    for (const it of items) {
      let page = null;
      try {
        let dest = it.dest;
        if (typeof dest === 'string') dest = await pdf.getDestination(dest);
        if (Array.isArray(dest) && dest[0]) {
          const idx = await pdf.getPageIndex(dest[0]);
          page = idx + 1;
        }
      } catch {
        /* ignore unresolved dest */
      }
      out.push({ title: it.title, page, level });
      if (it.items?.length) out.push(...(await flattenOutline(pdf, it.items, level + 1)));
    }
    return out;
  }

  /* ---------------- page sizing ---------------- */
  const pageWidth = useMemo(() => {
    const gut = 48;
    if (fit === 'page') {
      const h = Math.max(200, size.h - gut);
      return (h / aspect) * zoom;
    }
    const base = isDouble ? size.w / 2 - 30 : size.w - gut;
    return Math.max(200, base) * zoom;
  }, [fit, size, aspect, zoom, isDouble]);

  /* ---------------- navigation ---------------- */
  const clampPage = useCallback((p) => Math.min(Math.max(1, p), numPages || 1), [numPages]);
  const step = isDouble ? 2 : 1;
  const goTo = useCallback((p) => setPageNumber(clampPage(p)), [clampPage]);
  const next = useCallback(() => setPageNumber((p) => clampPage(p + step)), [clampPage, step]);
  const prev = useCallback(() => setPageNumber((p) => clampPage(p - step)), [clampPage, step]);

  /* ---------------- progress saving (debounced + on unmount) ---------------- */
  const saveProgress = useCallback(
    (page) => {
      if (!numPages || page === progressRef.current.saved) return;
      progressRef.current.saved = page;
      api.put(`/reader/${id}/progress`, { page, totalPages: numPages }).catch(() => {});
    },
    [id, numPages]
  );
  useEffect(() => {
    if (!numPages) return;
    const t = setTimeout(() => saveProgress(pageNumber), 1200);
    return () => clearTimeout(t);
  }, [pageNumber, numPages, saveProgress]);
  useEffect(() => {
    // Save when the tab is hidden (covers most closes) and on unmount. Uses the
    // authenticated api.put — sendBeacon can't carry the JWT header.
    const onHide = () => { if (document.visibilityState === 'hidden') saveProgress(pageNumber); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      saveProgress(pageNumber);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, numPages]);

  /* ---------------- bookmarks ---------------- */
  const isBookmarked = bookmarks.some((b) => b.page === pageNumber);
  const toggleBookmark = async () => {
    const existing = bookmarks.find((b) => b.page === pageNumber);
    if (existing) {
      setBookmarks((bs) => bs.filter((b) => b._id !== existing._id));
      api.delete(`/reader/${id}/bookmarks/${existing._id}`).catch(() => {});
    } else {
      const chapter = currentChapter?.title || '';
      const { data } = await api.post(`/reader/${id}/bookmarks`, { page: pageNumber, chapterTitle: chapter });
      setBookmarks((bs) => [...bs, data].sort((a, b) => a.page - b.page));
    }
  };
  const removeBookmark = (bid) => {
    setBookmarks((bs) => bs.filter((b) => b._id !== bid));
    api.delete(`/reader/${id}/bookmarks/${bid}`).catch(() => {});
  };

  const currentChapter = useMemo(() => {
    let cur = null;
    for (const it of outline) {
      if (it.page && it.page <= pageNumber) cur = it;
    }
    return cur;
  }, [outline, pageNumber]);

  /* ---------------- keyboard shortcuts ---------------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowRight': case 'PageDown': e.preventDefault(); next(); break;
        case 'ArrowLeft': case 'PageUp': e.preventDefault(); prev(); break;
        case ' ': e.preventDefault(); (e.shiftKey ? prev : next)(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'b': case 'B': toggleBookmark(); break;
        case 't': case 'T': setTocOpen((o) => !o); break;
        case 'n': case 'N': setBmOpen((o) => !o); break;
        case '+': case '=': setFit('width'); setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2))); break;
        case '-': case '_': setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2))); break;
        case 'Escape': setTocOpen(false); setBmOpen(false); setApOpen(false); setMoreOpen(false); if (fullscreen) exitFs(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, prev, fullscreen, bookmarks, pageNumber, currentChapter]);

  /* ---------------- fullscreen + chrome auto-hide ---------------- */
  const exitFs = () => { if (document.fullscreenElement) document.exitFullscreen?.(); };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  useEffect(() => {
    if (!fullscreen) { setChromeVisible(true); return; }
    const show = () => {
      setChromeVisible(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setChromeVisible(false), 2600);
    };
    show();
    window.addEventListener('mousemove', show);
    return () => { window.removeEventListener('mousemove', show); clearTimeout(hideTimer.current); };
  }, [fullscreen]);

  const download = () => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^\w\- ]+/g, '')}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const percent = numPages ? Math.round((pageNumber / numPages) * 100) : 0;
  const wmBg = useMemo(
    () => (user ? `url("${watermarkTile(user.email || user.name || '', theme === 'dark')}")` : 'none'),
    [user, theme]
  );

  /* ---------------- page rendering ---------------- */
  const renderPage = (n, key) => (
    <div key={key} className="relative rounded-sm overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)] bg-white">
      <div style={{ filter: themeCfg.pageFilter }}>
        <Page pageNumber={n} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false} loading="" />
      </div>
      {/* watermark overlay (not affected by page filter) */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: wmBg, backgroundRepeat: 'repeat' }} />
    </div>
  );

  const readingBody = () => {
    if (isScroll) {
      return (
        <div className="flex flex-col items-center gap-6 py-6">
          {Array.from({ length: numPages }, (_, i) => (
            <ScrollPage
              key={i}
              n={i + 1}
              width={pageWidth}
              aspect={aspect}
              filter={themeCfg.pageFilter}
              wmBg={wmBg}
              onVisible={setPageNumber}
            />
          ))}
        </div>
      );
    }
    if (isDouble) {
      const left = pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber;
      return (
        <div className="flex items-center justify-center gap-1 py-6">
          {left >= 1 && renderPage(left, 'L')}
          {left + 1 <= numPages && renderPage(left + 1, 'R')}
        </div>
      );
    }
    return <div className="flex justify-center py-6">{renderPage(pageNumber, 'S')}</div>;
  };

  /* ---------------- error / loading ---------------- */
  if (error) {
    return (
      <div className="fixed inset-0 bg-[#0b0f12] text-[#F5F2EA] grid place-items-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="mb-5 text-[#A9B1B8]">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20">Retry</button>
            <button onClick={() => navigate('/my-library')} className="px-5 py-2 rounded-full bg-gold text-[#0b0f12] font-semibold">Back to Library</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0b0f12] text-[#F5F2EA] select-none">
      {/* ===== Top bar ===== */}
      <header
        className={`flex items-center justify-between gap-2 px-3 h-14 bg-[#141A1F] border-b border-[#2A333B] z-30 transition-transform duration-300 ${
          chromeVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <IconBtn name="menu" title="Contents (T)" active={tocOpen} onClick={() => setTocOpen((o) => !o)} />
          <IconBtn name="back" title="Back to library" onClick={() => navigate('/my-library')} />
          <h1 className="font-display text-lg truncate ml-1 mr-2">{title}</h1>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="hidden sm:flex items-center bg-[#0e1318] rounded-lg px-1">
            <IconBtn name="left" title="Previous (←)" onClick={prev} disabled={pageNumber <= 1} size={16} />
            <span className="text-xs tabular-nums text-[#A9B1B8] px-1 whitespace-nowrap">{pageNumber} / {numPages || '–'}</span>
            <IconBtn name="right" title="Next (→)" onClick={next} disabled={pageNumber >= numPages} size={16} />
          </div>
          <IconBtn title="Appearance" active={apOpen} onClick={() => { setApOpen((o) => !o); setMoreOpen(false); }}>
            <span className="font-serif text-[15px] leading-none">Aa</span>
          </IconBtn>
          <IconBtn name="bookmark" title="Bookmark (B)" active={isBookmarked} onClick={toggleBookmark} />
          <IconBtn name="note" title="Bookmarks list (N)" active={bmOpen} onClick={() => setBmOpen((o) => !o)} />
          <IconBtn name="expand" title="Full screen (F)" active={fullscreen} onClick={toggleFullscreen} />
          <div className="relative">
            <IconBtn name="more" title="More" active={moreOpen} onClick={() => { setMoreOpen((o) => !o); setApOpen(false); }} />
            {moreOpen && <MoreMenu onDownload={download} onClose={() => setMoreOpen(false)} />}
          </div>
        </div>
      </header>

      {/* ===== Body ===== */}
      <div className="flex-1 flex min-h-0 relative">
        {/* TOC sidebar */}
        <TocSidebar
          open={tocOpen}
          onClose={() => setTocOpen(false)}
          title={title}
          outline={outline}
          numPages={numPages}
          currentPage={pageNumber}
          onGo={(p) => { goTo(p); if (window.innerWidth < 768) setTocOpen(false); }}
        />

        {/* Reading area */}
        <main
          ref={areaRef}
          className="flex-1 overflow-auto min-w-0"
          style={{ background: `radial-gradient(circle at 50% 0%, #1a222a 0%, ${themeCfg.area} 70%)` }}
          onClick={() => fullscreen && setChromeVisible((v) => !v)}
        >
          {loading || !fileUrl ? (
            <div className="h-full grid place-items-center text-[#A9B1B8]">
              <div className="text-center">
                <div className="h-10 w-10 mx-auto mb-4 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                Preparing your book…
              </div>
            </div>
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocLoad}
              onLoadError={() => setError('Could not render this PDF.')}
              loading={<div className="h-full grid place-items-center text-[#A9B1B8] py-20">Rendering…</div>}
            >
              {numPages > 0 && readingBody()}
            </Document>
          )}
        </main>

        {/* Bookmarks panel */}
        <BookmarkPanel
          open={bmOpen}
          onClose={() => setBmOpen(false)}
          bookmarks={bookmarks}
          currentPage={pageNumber}
          onGo={(p) => { setMode((m) => (m === 'scroll' ? 'single' : m)); goTo(p); }}
          onRemove={removeBookmark}
        />

        {/* Appearance menu */}
        {apOpen && (
          <AppearanceMenu
            theme={theme} setTheme={setTheme}
            mode={mode} setMode={setMode}
            fit={fit} setFit={setFit}
            onClose={() => setApOpen(false)}
          />
        )}

        {/* Resume toast (auto-dismisses); tap to restart from the beginning */}
        {resumeToast && (
          <button
            onClick={() => { goTo(1); setResumeToast(null); }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-[#141A1F] border border-gold/40 text-sm px-4 py-2 rounded-full shadow-xl hover:bg-[#1a222a] animate-fade-up"
          >
            ↩ Resumed at page {resumeToast} · <span className="text-gold">restart</span>
          </button>
        )}
      </div>

      {/* ===== Bottom controls ===== */}
      {!isScroll && (
        <footer
          className={`h-14 bg-[#141A1F] border-t border-[#2A333B] flex items-center gap-3 px-4 z-30 transition-transform duration-300 ${
            chromeVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <span className="text-xs tabular-nums text-[#A9B1B8] w-16">{pageNumber}/{numPages || '–'}</span>
          <input
            type="range"
            min="1"
            max={numPages || 1}
            value={pageNumber}
            onChange={(e) => goTo(parseInt(e.target.value, 10))}
            className="flex-1 accent-[#C99A3B] h-1 cursor-pointer"
          />
          <span className="hidden sm:block text-xs text-[#A9B1B8] w-10 text-right">{percent}%</span>
          <div className="flex items-center gap-0.5 ml-1">
            <IconBtn name="minus" title="Zoom out (−)" size={16} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} />
            <span className="text-xs tabular-nums text-[#A9B1B8] w-10 text-center">{Math.round(zoom * 100)}%</span>
            <IconBtn name="plus" title="Zoom in (+)" size={16} onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))} />
          </div>
        </footer>
      )}
    </div>
  );
};

/* ================= Sub-components ================= */

// One page slot for continuous-scroll mode; lazy-mounts when near the viewport.
const ScrollPage = ({ n, width, aspect, filter, wmBg, onVisible }) => {
  const ref = useRef(null);
  const [show, setShow] = useState(n <= 3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            setShow(true);
            if (en.intersectionRatio > 0.5) onVisible(n);
          }
        });
      },
      { root: null, rootMargin: '400px 0px', threshold: [0, 0.5, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [n, onVisible]);
  return (
    <div ref={ref} style={{ width, minHeight: show ? undefined : width * aspect }} className="relative rounded-sm overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)] bg-white">
      {show ? (
        <>
          <div style={{ filter }}>
            <Page pageNumber={n} width={width} renderTextLayer={false} renderAnnotationLayer={false} loading="" />
          </div>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: wmBg, backgroundRepeat: 'repeat' }} />
        </>
      ) : (
        <div className="w-full grid place-items-center text-[#0b0f12]/30" style={{ height: width * aspect }}>{n}</div>
      )}
    </div>
  );
};

const TocSidebar = ({ open, onClose, title, outline, numPages, currentPage, onGo }) => {
  const [q, setQ] = useState('');
  const items = outline.filter((it) => it.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <aside
      className={`${open ? 'w-72' : 'w-0'} flex-shrink-0 bg-[#171E24] border-r border-[#2A333B] overflow-hidden transition-[width] duration-300 z-20 absolute md:relative h-full`}
    >
      <div className="w-72 h-full flex flex-col">
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#2A333B]">
          <span className="font-display text-lg truncate">Contents</span>
          <IconBtn name="close" title="Close" onClick={onClose} size={16} />
        </div>
        {outline.length > 0 ? (
          <>
            <div className="p-3">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contents…"
                className="w-full bg-[#0e1318] border border-[#2A333B] rounded-lg px-3 py-1.5 text-sm text-[#F5F2EA] placeholder:text-[#5c6670] focus:outline-none focus:border-gold/50" />
            </div>
            <nav className="flex-1 overflow-auto px-2 pb-4">
              {items.map((it, i) => {
                const active = it.page && it.page <= currentPage && (!items[i + 1]?.page || items[i + 1].page > currentPage);
                return (
                  <button key={i} onClick={() => it.page && onGo(it.page)} disabled={!it.page}
                    className={`w-full text-left flex items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      active ? 'bg-gold/15 text-gold' : 'text-[#C6CDD3] hover:bg-white/5'
                    }`}
                    style={{ paddingLeft: `${10 + it.level * 14}px` }}>
                    <span className="line-clamp-2">{it.title}</span>
                    {it.page && <span className="text-xs text-[#7c8690] tabular-nums flex-shrink-0">{it.page}</span>}
                  </button>
                );
              })}
            </nav>
          </>
        ) : (
          <div className="p-6 text-sm text-[#7c8690] text-center mt-6">
            <Icon name="list" size={28} className="mx-auto mb-3 opacity-50" />
            This PDF has no built-in table of contents.
            <p className="mt-2 text-[#5c6670]">Chapters can be added from the admin panel later.</p>
          </div>
        )}
      </div>
    </aside>
  );
};

const BookmarkPanel = ({ open, onClose, bookmarks, currentPage, onGo, onRemove }) => (
  <aside className={`${open ? 'w-72' : 'w-0'} flex-shrink-0 bg-[#171E24] border-l border-[#2A333B] overflow-hidden transition-[width] duration-300 z-20 absolute md:relative right-0 h-full`}>
    <div className="w-72 h-full flex flex-col">
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#2A333B]">
        <span className="font-display text-lg">Bookmarks</span>
        <IconBtn name="close" title="Close" onClick={onClose} size={16} />
      </div>
      {bookmarks.length === 0 ? (
        <div className="p-6 text-sm text-[#7c8690] text-center mt-6">
          <Icon name="bookmark" size={26} className="mx-auto mb-3 opacity-50" />
          No bookmarks yet. Press <span className="text-gold">B</span> to bookmark a page.
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-2">
          {bookmarks.map((b) => (
            <div key={b._id} className={`group rounded-lg px-3 py-2.5 mb-1 flex items-center justify-between gap-2 cursor-pointer ${b.page === currentPage ? 'bg-gold/15' : 'hover:bg-white/5'}`} onClick={() => onGo(b.page)}>
              <div className="min-w-0">
                <div className="text-sm text-[#E7EBEE]">Page {b.page}</div>
                {b.chapterTitle && <div className="text-xs text-[#7c8690] truncate">{b.chapterTitle}</div>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); onRemove(b._id); }} className="opacity-0 group-hover:opacity-100 text-[#7c8690] hover:text-red-400 flex-shrink-0"><Icon name="close" size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  </aside>
);

const AppearanceMenu = ({ theme, setTheme, mode, setMode, fit, setFit, onClose }) => (
  <>
    <div className="fixed inset-0 z-30" onClick={onClose} />
    <div className="absolute top-2 right-3 z-40 w-64 bg-[#141A1F] border border-[#2A333B] rounded-xl shadow-2xl p-4 text-sm">
      <p className="text-[#7c8690] text-xs uppercase tracking-wider mb-2">Theme</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Object.entries(THEMES).map(([key, t]) => (
          <button key={key} onClick={() => setTheme(key)}
            className={`py-2 rounded-lg border text-xs ${theme === key ? 'border-gold text-gold' : 'border-[#2A333B] text-[#A9B1B8] hover:border-[#3a444d]'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-[#7c8690] text-xs uppercase tracking-wider mb-2">Layout</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[['single', 'Single'], ['double', 'Two-page'], ['scroll', 'Scroll']].map(([key, lbl]) => (
          <button key={key} onClick={() => setMode(key)}
            className={`py-2 rounded-lg border text-xs ${mode === key ? 'border-gold text-gold' : 'border-[#2A333B] text-[#A9B1B8] hover:border-[#3a444d]'}`}>
            {lbl}
          </button>
        ))}
      </div>
      <p className="text-[#7c8690] text-xs uppercase tracking-wider mb-2">Fit</p>
      <div className="grid grid-cols-2 gap-2">
        {[['width', 'Fit Width'], ['page', 'Fit Page']].map(([key, lbl]) => (
          <button key={key} onClick={() => setFit(key)}
            className={`py-2 rounded-lg border text-xs ${fit === key ? 'border-gold text-gold' : 'border-[#2A333B] text-[#A9B1B8] hover:border-[#3a444d]'}`}>
            {lbl}
          </button>
        ))}
      </div>
    </div>
  </>
);

const MoreMenu = ({ onDownload, onClose }) => (
  <>
    <div className="fixed inset-0 z-30" onClick={onClose} />
    <div className="absolute top-11 right-0 z-40 w-56 bg-[#141A1F] border border-[#2A333B] rounded-xl shadow-2xl py-2 text-sm">
      <button onClick={() => { onDownload(); onClose(); }} className="w-full text-left px-4 py-2 text-[#C6CDD3] hover:bg-white/5">Download PDF</button>
      <div className="border-t border-[#2A333B] my-1" />
      <div className="px-4 py-2 text-xs text-[#7c8690]">
        <p className="font-semibold text-[#A9B1B8] mb-1">Keyboard shortcuts</p>
        ← → pages · Space next · F fullscreen<br />B bookmark · T contents · N list · +/− zoom
      </div>
    </div>
  </>
);

export default Reader;
