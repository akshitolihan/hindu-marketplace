import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/format';
import { THEMES, Icon, IconBtn } from '../components/reader/readerUI';
import { AnnotationsPanel, HighlightToolbar, HighlightLayer } from '../components/reader/annotations';
import { SearchPanel } from '../components/reader/search';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
  const { addToCart } = useCart();
  const [title, setTitle] = useState(location.state?.title || 'Reading');
  const [access, setAccess] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  useEffect(() => {
    if (!location.state?.title) {
      api.get(`/products/${id}`).then((r) => r.data?.title && setTitle(r.data.title)).catch(() => {});
    }
  }, [id, location.state]);

  // document / file
  const [fileUrl, setFileUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [aspect, setAspect] = useState(1.414);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // reading state
  const [pageNumber, setPageNumber] = useState(1);
  const [mode, setMode] = useState('single');
  const [fit, setFit] = useState('width');
  const [zoom, setZoom] = useState(1);
  const [theme, setTheme] = useState('light');

  // annotations
  const [bookmarks, setBookmarks] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [toolbar, setToolbar] = useState(null); // {page, rects, text, top, left}
  const [autoNoteFor, setAutoNoteFor] = useState(null);

  // panels / chrome
  const [tocOpen, setTocOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('highlights');
  const [apOpen, setApOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [outline, setOutline] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [resumeToast, setResumeToast] = useState(null);

  // search
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeResult, setActiveResult] = useState(0);
  const [searchOpts, setSearchOpts] = useState({ caseSensitive: false, wholeWord: false });

  const areaRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const progressRef = useRef({ lastPage: 1, saved: 1 });
  const hideTimer = useRef(null);
  const pdfDocRef = useRef(null);
  const pageTextsRef = useRef(null);

  const themeCfg = THEMES[theme];
  const isDouble = mode === 'double';
  const isScroll = mode === 'scroll';

  // Per-book permissions (default allow until access loads). Preview mode is
  // always read-only regardless of permissions.
  const perms = access?.permissions || { download: true, highlights: true, notes: true, bookmarks: true, copy: true };
  const canHighlight = !isPreview && perms.highlights;
  const canBookmark = !isPreview && perms.bookmarks;
  const showAnnotations = !isPreview && (perms.highlights || perms.notes || perms.bookmarks);
  const canDownload = !isPreview && perms.download;

  /* ---- load: check access, then load full file (owner) or preview ---- */
  useEffect(() => {
    let revoked = null;
    setLoading(true);
    (async () => {
      try {
        const { data: acc } = await api.get(`/reader/${id}/access`);
        setAccess(acc);
        if (acc.title) setTitle(acc.title);

        if (acc.owned) {
          const [fileRes, progRes, bmRes, hlRes, noteRes] = await Promise.all([
            api.get(`/library/${id}/file`, { responseType: 'blob' }),
            api.get(`/reader/${id}/progress`).catch(() => ({ data: null })),
            api.get(`/reader/${id}/bookmarks`).catch(() => ({ data: [] })),
            api.get(`/reader/${id}/highlights`).catch(() => ({ data: [] })),
            api.get(`/reader/${id}/notes`).catch(() => ({ data: [] }))
          ]);
          const b = fileRes.data;
          setBlob(b);
          const url = URL.createObjectURL(b);
          revoked = url;
          setFileUrl(url);
          setBookmarks(bmRes.data || []);
          setHighlights(hlRes.data || []);
          setNotes(noteRes.data || []);
          const saved = progRes.data?.lastPage;
          if (saved && saved > 1) {
            progressRef.current.lastPage = saved;
            setResumeToast(saved);
            setTimeout(() => setResumeToast(null), 4500);
          }
        } else if (acc.previewPages > 0) {
          setIsPreview(true);
          const fileRes = await api.get(`/reader/${id}/preview-file`, { responseType: 'blob' });
          const b = fileRes.data;
          setBlob(b);
          const url = URL.createObjectURL(b);
          revoked = url;
          setFileUrl(url);
        } else {
          setError('locked');
        }
      } catch (e) {
        setError(e.response?.status === 403 ? 'You do not own this book.' : 'Could not load the book.');
      } finally {
        setLoading(false);
      }
    })();
    return () => revoked && URL.revokeObjectURL(revoked);
  }, [id]);

  /* ---- responsive area (debounced so panel open/close doesn't re-render the
         PDF canvas on every animation frame → no flicker) ---- */
  useEffect(() => {
    let t;
    const measure = () => {
      if (!areaRef.current) return;
      const w = areaRef.current.clientWidth;
      const h = areaRef.current.clientHeight;
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    measure(); // immediate first measure
    const debounced = () => { clearTimeout(t); t = setTimeout(measure, 180); };
    const ro = new ResizeObserver(debounced);
    if (areaRef.current) ro.observe(areaRef.current);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [fileUrl]);

  /* ---- document loaded ---- */
  const onDocLoad = useCallback(async (pdf) => {
    pdfDocRef.current = pdf;
    setNumPages(pdf.numPages);
    try {
      const p1 = await pdf.getPage(1);
      const vp = p1.getViewport({ scale: 1 });
      setAspect(vp.height / vp.width);
    } catch {}
    const resume = progressRef.current.lastPage;
    if (resume > 1 && resume <= pdf.numPages) setPageNumber(resume);
    try {
      const raw = await pdf.getOutline();
      if (raw?.length) setOutline(await flattenOutline(pdf, raw, 0));
    } catch {}
  }, []);

  async function flattenOutline(pdf, items, level) {
    const out = [];
    for (const it of items) {
      let page = null;
      try {
        let dest = it.dest;
        if (typeof dest === 'string') dest = await pdf.getDestination(dest);
        if (Array.isArray(dest) && dest[0]) page = (await pdf.getPageIndex(dest[0])) + 1;
      } catch {}
      out.push({ title: it.title, page, level });
      if (it.items?.length) out.push(...(await flattenOutline(pdf, it.items, level + 1)));
    }
    return out;
  }

  /* ---- page sizing ---- */
  const pageWidth = useMemo(() => {
    const gut = 48;
    if (fit === 'page') return Math.max(200, (Math.max(200, size.h - gut) / aspect)) * zoom;
    const base = isDouble ? size.w / 2 - 30 : size.w - gut;
    return Math.max(200, base) * zoom;
  }, [fit, size, aspect, zoom, isDouble]);

  /* ---- navigation ---- */
  const clampPage = useCallback((p) => Math.min(Math.max(1, p), numPages || 1), [numPages]);
  const stepN = isDouble ? 2 : 1;
  const goTo = useCallback((p) => setPageNumber(clampPage(p)), [clampPage]);
  const next = useCallback(() => {
    if (isPreview && pageNumber >= numPages) { setShowPaywall(true); return; }
    setPageNumber((p) => clampPage(p + stepN));
  }, [clampPage, stepN, isPreview, pageNumber, numPages]);
  const prev = useCallback(() => setPageNumber((p) => clampPage(p - stepN)), [clampPage, stepN]);
  const jumpTo = (p) => { if (isScroll) setMode('single'); goTo(p); };

  const currentChapter = useMemo(() => {
    let cur = null;
    for (const it of outline) if (it.page && it.page <= pageNumber) cur = it;
    return cur;
  }, [outline, pageNumber]);

  // Fall back to admin-defined chapters when the PDF has no embedded outline.
  useEffect(() => {
    if (numPages && outline.length === 0 && access?.chapters?.length) {
      setOutline(access.chapters.filter((c) => c.title && c.page).map((c) => ({ title: c.title, page: c.page, level: 0 })));
    }
  }, [numPages, access, outline.length]);

  /* ---- in-book search ---- */
  const buildIndex = useCallback(async () => {
    if (pageTextsRef.current) return pageTextsRef.current;
    const pdf = pdfDocRef.current;
    if (!pdf) return [];
    const texts = new Array(pdf.numPages + 1).fill('');
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const tc = await (await pdf.getPage(i)).getTextContent();
        texts[i] = tc.items.map((it) => it.str).join(' ');
      } catch {}
    }
    pageTextsRef.current = texts;
    return texts;
  }, []);

  const runSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); setSearchTerm(''); return; }
    setSearching(true);
    const texts = await buildIndex();
    const escd = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = searchOpts.wholeWord ? `\\b${escd}\\b` : escd;
    const flags = searchOpts.caseSensitive ? 'g' : 'gi';
    const res = [];
    for (let i = 1; i < texts.length; i++) {
      const text = texts[i];
      if (!text) continue;
      const re = new RegExp(pattern, flags);
      let m, count = 0, firstIdx = -1;
      while ((m = re.exec(text)) !== null) {
        count++;
        if (firstIdx < 0) firstIdx = m.index;
        if (m.index === re.lastIndex) re.lastIndex++;
        if (count > 500) break;
      }
      if (count > 0) {
        const start = Math.max(0, firstIdx - 40);
        const snippet = (start > 0 ? '…' : '') + text.slice(start, firstIdx + q.length + 60).trim() + '…';
        res.push({ page: i, count, snippet });
      }
    }
    setResults(res);
    setActiveResult(0);
    setSearchTerm(q);
    setSearching(false);
    if (res[0]) { if (isScroll) setMode('single'); goTo(res[0].page); }
  }, [buildIndex, searchOpts, isScroll, goTo]);

  // Debounced search on query / option change.
  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, searchOpts, searchOpen, runSearch]);

  const jumpResult = (idx) => { setActiveResult(idx); const r = results[idx]; if (r) { if (isScroll) setMode('single'); goTo(r.page); } };
  const nextResult = () => results.length && jumpResult((activeResult + 1) % results.length);
  const prevResult = () => results.length && jumpResult((activeResult - 1 + results.length) % results.length);
  const openSearch = () => { setSearchOpen(true); setTocOpen(false); };

  // Highlight search matches on the rendered page via the text layer.
  const textRenderer = useCallback(
    (item) => {
      if (!searchTerm) return item.str;
      const escd = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(${escd})`, searchOpts.caseSensitive ? 'g' : 'gi');
      return item.str.replace(re, '<mark class="rd-search">$1</mark>');
    },
    [searchTerm, searchOpts.caseSensitive]
  );

  /* ---- progress ---- */
  const saveProgress = useCallback((page) => {
    if (isPreview || !numPages || page === progressRef.current.saved) return;
    progressRef.current.saved = page;
    api.put(`/reader/${id}/progress`, { page, totalPages: numPages }).catch(() => {});
  }, [id, numPages, isPreview]);
  useEffect(() => {
    if (!numPages) return;
    const t = setTimeout(() => saveProgress(pageNumber), 1200);
    return () => clearTimeout(t);
  }, [pageNumber, numPages, saveProgress]);
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && saveProgress(pageNumber);
    document.addEventListener('visibilitychange', onHide);
    return () => { document.removeEventListener('visibilitychange', onHide); saveProgress(pageNumber); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, numPages]);

  /* ---- bookmarks ---- */
  const isBookmarked = bookmarks.some((b) => b.page === pageNumber);
  const toggleBookmark = async () => {
    if (!canBookmark) return;
    const existing = bookmarks.find((b) => b.page === pageNumber);
    if (existing) {
      setBookmarks((bs) => bs.filter((b) => b._id !== existing._id));
      api.delete(`/reader/${id}/bookmarks/${existing._id}`).catch(() => {});
    } else {
      const { data } = await api.post(`/reader/${id}/bookmarks`, { page: pageNumber, chapterTitle: currentChapter?.title || '' });
      setBookmarks((bs) => [...bs, data].sort((a, b) => a.page - b.page));
    }
  };
  const removeBookmark = (bid) => { setBookmarks((bs) => bs.filter((b) => b._id !== bid)); api.delete(`/reader/${id}/bookmarks/${bid}`).catch(() => {}); };

  /* ---- text selection → highlight ---- */
  const onSelectText = useCallback(() => {
    if (!canHighlight) return; // needs ownership + highlight permission
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { setToolbar(null); return; }
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    node = node.nodeType === 3 ? node.parentElement : node;
    const pageEl = node?.closest?.('[data-reader-page]');
    if (!pageEl) { setToolbar(null); return; }
    const page = parseInt(pageEl.getAttribute('data-reader-page'), 10);
    const pr = pageEl.getBoundingClientRect();
    const clientRects = [...range.getClientRects()];
    const rects = clientRects
      .map((r) => ({ x: (r.left - pr.left) / pr.width, y: (r.top - pr.top) / pr.height, w: r.width / pr.width, h: r.height / pr.height }))
      .filter((r) => r.w > 0.002 && r.h > 0.002);
    if (!rects.length) { setToolbar(null); return; }
    const first = clientRects[0];
    setToolbar({ page, rects, text: sel.toString().trim(), top: first.top, left: first.left + first.width / 2 });
  }, [canHighlight]);

  const createHighlight = async (color) => {
    if (!toolbar) return null;
    const { page, rects, text } = toolbar;
    let created = null;
    try {
      const { data } = await api.post(`/reader/${id}/highlights`, { page, color, text, rects, chapterTitle: currentChapter?.title || '' });
      setHighlights((hs) => [...hs, data]);
      created = data;
    } catch {}
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
    return created;
  };
  const highlightThenNote = async () => {
    const h = await createHighlight('yellow');
    if (h) { setPanelTab('highlights'); setPanelOpen(true); setAutoNoteFor(h._id); setTimeout(() => setAutoNoteFor(null), 300); }
  };
  const recolorHighlight = (hid, color) => {
    setHighlights((hs) => hs.map((h) => (h._id === hid ? { ...h, color } : h)));
    api.patch(`/reader/${id}/highlights/${hid}`, { color }).catch(() => {});
  };
  const saveHlNote = (hid, note) => {
    setHighlights((hs) => hs.map((h) => (h._id === hid ? { ...h, note } : h)));
    api.patch(`/reader/${id}/highlights/${hid}`, { note }).catch(() => {});
  };
  const removeHighlight = (hid) => { setHighlights((hs) => hs.filter((h) => h._id !== hid)); api.delete(`/reader/${id}/highlights/${hid}`).catch(() => {}); };

  /* ---- notes ---- */
  const addNote = async (text) => {
    const { data } = await api.post(`/reader/${id}/notes`, { page: pageNumber, text, chapterTitle: currentChapter?.title || '' });
    setNotes((ns) => [...ns, data]);
  };
  const editNote = (nid, text) => { setNotes((ns) => ns.map((n) => (n._id === nid ? { ...n, text } : n))); api.patch(`/reader/${id}/notes/${nid}`, { text }).catch(() => {}); };
  const removeNote = (nid) => { setNotes((ns) => ns.filter((n) => n._id !== nid)); api.delete(`/reader/${id}/notes/${nid}`).catch(() => {}); };

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); openSearch(); return; }
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 's': case 'S': openSearch(); break;
        case 'ArrowRight': case 'PageDown': e.preventDefault(); next(); break;
        case 'ArrowLeft': case 'PageUp': e.preventDefault(); prev(); break;
        case ' ': e.preventDefault(); (e.shiftKey ? prev : next)(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'b': case 'B': toggleBookmark(); break;
        case 't': case 'T': setTocOpen((o) => !o); break;
        case 'n': case 'N': setPanelOpen((o) => !o); break;
        case '+': case '=': setFit('width'); setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2))); break;
        case '-': case '_': setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2))); break;
        case 'Escape': setTocOpen(false); setPanelOpen(false); setApOpen(false); setMoreOpen(false); setSearchOpen(false); setToolbar(null); if (fullscreen) exitFs(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, prev, fullscreen, bookmarks, pageNumber, currentChapter]);

  /* ---- fullscreen + chrome ---- */
  const exitFs = () => document.fullscreenElement && document.exitFullscreen?.();
  const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.());
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  useEffect(() => {
    if (!fullscreen) { setChromeVisible(true); return; }
    const show = () => { setChromeVisible(true); clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setChromeVisible(false), 2600); };
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

  const buyBook = async () => {
    try { await addToCart(id); } catch {}
    navigate('/cart');
  };

  const percent = numPages ? Math.round((pageNumber / numPages) * 100) : 0;
  const wmBg = useMemo(() => (user ? `url("${watermarkTile(user.email || user.name || '', theme === 'dark')}")` : 'none'), [user, theme]);

  /* ---- page render ---- */
  const renderPage = (n, key) => (
    <div key={key} data-reader-page={n} className="relative rounded-sm overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)] bg-white">
      <div style={{ filter: themeCfg.pageFilter }}>
        <Page pageNumber={n} width={pageWidth} renderTextLayer renderAnnotationLayer={false} loading="" customTextRenderer={searchTerm ? textRenderer : undefined} />
      </div>
      <HighlightLayer items={highlights.filter((h) => h.page === n)} />
      <div className="absolute inset-0 pointer-events-none z-[6]" style={{ backgroundImage: wmBg, backgroundRepeat: 'repeat' }} />
    </div>
  );

  const readingBody = () => {
    if (isScroll)
      return (
        <div className="flex flex-col items-center gap-6 py-6">
          {Array.from({ length: numPages }, (_, i) => (
            <ScrollPage key={i} n={i + 1} width={pageWidth} aspect={aspect} filter={themeCfg.pageFilter} wmBg={wmBg}
              pageHighlights={highlights.filter((h) => h.page === i + 1)} textRenderer={searchTerm ? textRenderer : undefined} onVisible={setPageNumber} />
          ))}
        </div>
      );
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

  if (error === 'locked') {
    return (
      <div className="fixed inset-0 bg-[#0b0f12] text-[#F5F2EA] grid place-items-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="font-display text-2xl mb-2">This book is locked</h2>
          <p className="mb-6 text-[#A9B1B8]">You need to purchase this book to read it.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate(`/books/${id}`)} className="px-5 py-2 rounded-full bg-gold text-[#0b0f12] font-semibold">View & Buy</button>
            <button onClick={() => navigate('/my-library')} className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20">My Library</button>
          </div>
        </div>
      </div>
    );
  }
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
    <div className="fixed inset-0 flex flex-col bg-[#0b0f12] text-[#F5F2EA]">
      {/* Top bar */}
      <header className={`flex items-center justify-between gap-2 px-3 h-14 bg-[#141A1F] border-b border-[#2A333B] z-30 select-none transition-transform duration-300 ${chromeVisible ? 'translate-y-0' : '-translate-y-full'}`}>
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
          <IconBtn name="search" title="Search in book (S)" active={searchOpen} onClick={() => (searchOpen ? setSearchOpen(false) : openSearch())} />
          <IconBtn title="Appearance" active={apOpen} onClick={() => { setApOpen((o) => !o); setMoreOpen(false); }}>
            <span className="font-serif text-[15px] leading-none">Aa</span>
          </IconBtn>
          {canBookmark && <IconBtn name="bookmark" title="Bookmark (B)" active={isBookmarked} onClick={toggleBookmark} />}
          {showAnnotations && <IconBtn name="note" title="Annotations (N)" active={panelOpen} onClick={() => setPanelOpen((o) => !o)} />}
          <IconBtn name="expand" title="Full screen (F)" active={fullscreen} onClick={toggleFullscreen} />
          <div className="relative">
            <IconBtn name="more" title="More" active={moreOpen} onClick={() => { setMoreOpen((o) => !o); setApOpen(false); }} />
            {moreOpen && <MoreMenu onDownload={download} canDownload={canDownload} onClose={() => setMoreOpen(false)} />}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0 relative">
        <TocSidebar open={tocOpen} onClose={() => setTocOpen(false)} outline={outline} currentPage={pageNumber}
          onGo={(p) => { goTo(p); if (window.innerWidth < 768) setTocOpen(false); }} />

        <SearchPanel
          open={searchOpen} onClose={() => setSearchOpen(false)}
          query={query} setQuery={setQuery} results={results} searching={searching} term={searchTerm}
          options={searchOpts} setOptions={setSearchOpts} activeIdx={activeResult}
          onJump={jumpResult} onPrev={prevResult} onNext={nextResult}
        />

        <main
          ref={areaRef}
          className="flex-1 overflow-auto min-w-0"
          style={{ background: `radial-gradient(circle at 50% 0%, #1a222a 0%, ${themeCfg.area} 70%)` }}
          onMouseUp={onSelectText}
          onTouchEnd={onSelectText}
          onCopy={(e) => { if (!perms.copy) e.preventDefault(); }}
          onScroll={() => toolbar && setToolbar(null)}
        >
          {loading || !fileUrl ? (
            <div className="h-full grid place-items-center text-[#A9B1B8]">
              <div className="text-center">
                <div className="h-10 w-10 mx-auto mb-4 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                Preparing your book…
              </div>
            </div>
          ) : (
            <Document file={fileUrl} onLoadSuccess={onDocLoad} onLoadError={() => setError('Could not render this PDF.')}
              loading={<div className="h-full grid place-items-center text-[#A9B1B8] py-20">Rendering…</div>}>
              {numPages > 0 && readingBody()}
            </Document>
          )}
        </main>

        <AnnotationsPanel
          open={panelOpen} onClose={() => setPanelOpen(false)} tab={panelTab} setTab={setPanelTab}
          bookmarks={bookmarks} highlights={highlights} notes={notes} currentPage={pageNumber} currentChapter={currentChapter}
          autoNoteFor={autoNoteFor}
          onGo={jumpTo} onRemoveBookmark={removeBookmark} onRecolor={recolorHighlight} onRemoveHighlight={removeHighlight}
          onSaveHlNote={saveHlNote} onAddNote={addNote} onEditNote={editNote} onRemoveNote={removeNote}
        />

        {apOpen && <AppearanceMenu theme={theme} setTheme={setTheme} mode={mode} setMode={setMode} fit={fit} setFit={setFit} onClose={() => setApOpen(false)} />}

        {resumeToast && (
          <button onClick={() => { goTo(1); setResumeToast(null); }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-[#141A1F] border border-gold/40 text-sm px-4 py-2 rounded-full shadow-xl hover:bg-[#1a222a] animate-fade-up">
            ↩ Resumed at page {resumeToast} · <span className="text-gold">restart</span>
          </button>
        )}

        {/* Preview banner */}
        {isPreview && !showPaywall && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-[#141A1F] border border-gold/40 px-4 py-2 rounded-full shadow-xl animate-fade-up">
            <span className="text-sm text-[#C6CDD3]">🔓 Free preview · {access?.previewPages} pages</span>
            <button onClick={() => setShowPaywall(true)} className="text-sm bg-gold text-[#0b0f12] font-semibold px-3 py-1 rounded-full hover:brightness-105">
              Unlock full book
            </button>
          </div>
        )}
      </div>

      {/* Paywall overlay */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm grid place-items-center px-4">
          <div className="bg-[#141A1F] border border-[#2A333B] rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
            <div className="mx-auto w-24 h-32 rounded-lg overflow-hidden bg-[#0e1318] mb-5 grid place-items-center">
              {access?.coverImage ? <img src={access.coverImage} alt="" className="w-full h-full object-contain" /> : <span className="text-4xl">📖</span>}
            </div>
            <h2 className="font-display text-2xl text-cream mb-2">Continue reading</h2>
            <p className="text-[#A9B1B8] mb-5 text-sm leading-relaxed">
              You've reached the end of the free preview. Unlock <span className="text-gold">{title}</span> to read the full book, highlight, take notes, and sync your progress.
            </p>
            <div className="font-display text-3xl font-bold text-gold">{formatINR(access?.effectivePrice)}</div>
            {access?.onSale && <div className="text-sm text-[#7c8690] line-through mb-1">{formatINR(access.price)}</div>}
            <button onClick={buyBook} className="w-full bg-gradient-to-r from-gold-light to-gold text-[#0b0f12] font-semibold py-3 rounded-full my-4 hover:brightness-105">
              Unlock Full Book
            </button>
            <div className="flex gap-3">
              <button onClick={() => setShowPaywall(false)} className="flex-1 py-2 rounded-full bg-white/10 text-[#C6CDD3] hover:bg-white/15 text-sm">Keep previewing</button>
              <button onClick={() => navigate(`/books/${id}`)} className="flex-1 py-2 rounded-full bg-white/10 text-[#C6CDD3] hover:bg-white/15 text-sm">Book details</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating highlight toolbar */}
      {toolbar && <HighlightToolbar pos={toolbar} onColor={createHighlight} onNote={highlightThenNote} />}

      {/* Bottom controls */}
      {!isScroll && (
        <footer className={`h-14 bg-[#141A1F] border-t border-[#2A333B] flex items-center gap-3 px-4 z-30 select-none transition-transform duration-300 ${chromeVisible ? 'translate-y-0' : 'translate-y-full'}`}>
          <span className="text-xs tabular-nums text-[#A9B1B8] w-16">{pageNumber}/{numPages || '–'}</span>
          <input type="range" min="1" max={numPages || 1} value={pageNumber} onChange={(e) => goTo(parseInt(e.target.value, 10))} className="flex-1 accent-[#C99A3B] h-1 cursor-pointer" />
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

/* ================= sub-components ================= */

const ScrollPage = ({ n, width, aspect, filter, wmBg, pageHighlights, textRenderer, onVisible }) => {
  const ref = useRef(null);
  const [show, setShow] = useState(n <= 3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => { if (en.isIntersecting) { setShow(true); if (en.intersectionRatio > 0.5) onVisible(n); } }),
      { root: null, rootMargin: '400px 0px', threshold: [0, 0.5, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [n, onVisible]);
  return (
    <div ref={ref} data-reader-page={n} style={{ width, minHeight: show ? undefined : width * aspect }}
      className="relative rounded-sm overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)] bg-white">
      {show ? (
        <>
          <div style={{ filter }}>
            <Page pageNumber={n} width={width} renderTextLayer renderAnnotationLayer={false} loading="" customTextRenderer={textRenderer} />
          </div>
          <HighlightLayer items={pageHighlights} />
          <div className="absolute inset-0 pointer-events-none z-[6]" style={{ backgroundImage: wmBg, backgroundRepeat: 'repeat' }} />
        </>
      ) : (
        <div className="w-full grid place-items-center text-[#0b0f12]/30" style={{ height: width * aspect }}>{n}</div>
      )}
    </div>
  );
};

const TocSidebar = ({ open, onClose, outline, currentPage, onGo }) => {
  const [q, setQ] = useState('');
  const items = outline.filter((it) => it.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <aside className={`${open ? 'w-72' : 'w-0'} bg-[#171E24] border-r border-[#2A333B] overflow-hidden transition-[width] duration-300 z-20 absolute left-0 top-0 h-full shadow-2xl`}>
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
                    className={`w-full text-left flex items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${active ? 'bg-gold/15 text-gold' : 'text-[#C6CDD3] hover:bg-white/5'}`}
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
          </div>
        )}
      </div>
    </aside>
  );
};

const AppearanceMenu = ({ theme, setTheme, mode, setMode, fit, setFit, onClose }) => (
  <>
    <div className="fixed inset-0 z-30" onClick={onClose} />
    <div className="absolute top-2 right-3 z-40 w-64 bg-[#141A1F] border border-[#2A333B] rounded-xl shadow-2xl p-4 text-sm">
      <p className="text-[#7c8690] text-xs uppercase tracking-wider mb-2">Theme</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Object.entries(THEMES).map(([key, t]) => (
          <button key={key} onClick={() => setTheme(key)} className={`py-2 rounded-lg border text-xs ${theme === key ? 'border-gold text-gold' : 'border-[#2A333B] text-[#A9B1B8] hover:border-[#3a444d]'}`}>{t.label}</button>
        ))}
      </div>
      <p className="text-[#7c8690] text-xs uppercase tracking-wider mb-2">Layout</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[['single', 'Single'], ['double', 'Two-page'], ['scroll', 'Scroll']].map(([key, lbl]) => (
          <button key={key} onClick={() => setMode(key)} className={`py-2 rounded-lg border text-xs ${mode === key ? 'border-gold text-gold' : 'border-[#2A333B] text-[#A9B1B8] hover:border-[#3a444d]'}`}>{lbl}</button>
        ))}
      </div>
      <p className="text-[#7c8690] text-xs uppercase tracking-wider mb-2">Fit</p>
      <div className="grid grid-cols-2 gap-2">
        {[['width', 'Fit Width'], ['page', 'Fit Page']].map(([key, lbl]) => (
          <button key={key} onClick={() => setFit(key)} className={`py-2 rounded-lg border text-xs ${fit === key ? 'border-gold text-gold' : 'border-[#2A333B] text-[#A9B1B8] hover:border-[#3a444d]'}`}>{lbl}</button>
        ))}
      </div>
    </div>
  </>
);

const MoreMenu = ({ onDownload, canDownload, onClose }) => (
  <>
    <div className="fixed inset-0 z-30" onClick={onClose} />
    <div className="absolute top-11 right-0 z-40 w-56 bg-[#141A1F] border border-[#2A333B] rounded-xl shadow-2xl py-2 text-sm">
      {canDownload && (
        <>
          <button onClick={() => { onDownload(); onClose(); }} className="w-full text-left px-4 py-2 text-[#C6CDD3] hover:bg-white/5">Download PDF</button>
          <div className="border-t border-[#2A333B] my-1" />
        </>
      )}
      <div className="px-4 py-2 text-xs text-[#7c8690]">
        <p className="font-semibold text-[#A9B1B8] mb-1">Keyboard shortcuts</p>
        ← → pages · Space next · F fullscreen<br />B bookmark · T contents · N notes · +/− zoom
      </div>
    </div>
  </>
);

export default Reader;
