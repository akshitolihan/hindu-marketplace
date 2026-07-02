import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CoverImage from '../components/CoverImage';

const STATUS = {
  not_started: { label: 'Not Started', cls: 'bg-white/10 text-ink-soft', action: 'Start Reading' },
  in_progress: { label: 'In Progress', cls: 'bg-saffron/15 text-saffron', action: 'Continue' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700', action: 'Read Again' }
};

const FILTERS = [
  ['all', 'All Books'],
  ['in_progress', 'In Progress'],
  ['completed', 'Completed'],
  ['not_started', 'Not Started']
];
const SORTS = [
  ['recent', 'Recently Read'],
  ['purchased', 'Recently Purchased'],
  ['title', 'Title A–Z'],
  ['progress', 'Progress']
];

const ProgressBar = ({ percent }) => (
  <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
    <div className="h-full rounded-full bg-gradient-to-r from-saffron to-gold" style={{ width: `${percent}%` }} />
  </div>
);

const MyLibrary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    api.get('/library').then((res) => setBooks(res.data)).catch(() => setError('Could not load your library')).finally(() => setLoading(false));
  }, []);

  const openBook = (b) => navigate(`/read/${b._id}`, { state: { title: b.title } });

  // The single most-recently-read in-progress book → "Continue Reading" hero.
  const continueBook = useMemo(() => {
    const inProgress = books.filter((b) => b.progress?.status === 'in_progress' && b.progress?.lastReadAt);
    inProgress.sort((a, b) => new Date(b.progress.lastReadAt) - new Date(a.progress.lastReadAt));
    return inProgress[0] || null;
  }, [books]);

  const view = useMemo(() => {
    let list = [...books];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q));
    }
    if (filter !== 'all') list = list.filter((b) => (b.progress?.status || 'not_started') === filter);
    const ts = (d) => (d ? new Date(d).getTime() : 0);
    list.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'progress') return (b.progress?.percent || 0) - (a.progress?.percent || 0);
      if (sort === 'purchased') return ts(b.purchasedAt) - ts(a.purchasedAt);
      return ts(b.progress?.lastReadAt) - ts(a.progress?.lastReadAt); // recent
    });
    return list;
  }, [books, search, filter, sort]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="relative bg-gradient-to-b from-maroon-dark to-maroon text-cream pt-32 pb-14 overflow-hidden">
        <div className="mandala absolute -right-20 -top-12 w-80 h-80 opacity-[0.07]" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <p className="eyebrow text-gold mb-2">Your Collection</p>
          <h1 className="font-display text-5xl font-semibold">My Library</h1>
        </div>
      </div>

      <main className="flex-1 bg-cream">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {location.state?.justPurchased && (
            <div className="card border-emerald-300/60 bg-emerald-50 text-emerald-800 px-5 py-3 mb-8 inline-flex items-center gap-2">
              🎉 <span className="font-medium">Purchase complete! Your new books are below.</span>
            </div>
          )}
          {error && <p className="text-red-600 mb-4">{error}</p>}

          {loading ? (
            <p className="text-center text-ink-soft py-20 font-display text-xl">Loading…</p>
          ) : books.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4 opacity-40">📚</div>
              <p className="font-display text-2xl text-maroon mb-2">Your library awaits</p>
              <p className="text-ink-soft mb-6">You haven't added any sacred texts yet.</p>
              <Link to="/books" className="btn btn-primary">Explore Books</Link>
            </div>
          ) : (
            <>
              {/* Continue reading hero */}
              {continueBook && (
                <div className="card overflow-hidden mb-10 flex flex-col sm:flex-row">
                  <div className="sm:w-44 flex-shrink-0">
                    <CoverImage src={continueBook.coverImage} alt={continueBook.title} className="h-48 sm:h-full" />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <span className="eyebrow mb-1">Continue Reading</span>
                    <h2 className="font-display text-2xl font-semibold text-maroon leading-tight">{continueBook.title}</h2>
                    <p className="text-sm text-ink-soft mb-4">by {continueBook.author}</p>
                    <div className="mt-auto">
                      <div className="flex justify-between text-xs text-ink-soft mb-1.5">
                        <span>Page {continueBook.progress.lastPage}{continueBook.progress.totalPages ? ` of ${continueBook.progress.totalPages}` : ''}</span>
                        <span>{continueBook.progress.percent}%</span>
                      </div>
                      <ProgressBar percent={continueBook.progress.percent} />
                      <button onClick={() => openBook(continueBook)} className="btn btn-gold mt-4">
                        📖 Continue from page {continueBook.progress.lastPage}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-8">
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map(([key, label]) => (
                    <button key={key} onClick={() => setFilter(key)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${filter === key ? 'bg-maroon text-cream shadow-[var(--shadow-soft)]' : 'bg-white text-maroon border border-gold/25 hover:bg-sand'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1 lg:w-56">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/60">🔍</span>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search library…" className="field field-search" />
                  </div>
                  <select value={sort} onChange={(e) => setSort(e.target.value)}
                    className="w-44 bg-[#fffdf8] border-[1.5px] border-[#e6dcc6] rounded-xl px-3 py-2 text-ink focus:outline-none focus:border-gold cursor-pointer">
                    {SORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
              </div>

              {/* Grid */}
              {view.length === 0 ? (
                <p className="text-center text-ink-soft py-16">No books match your filters.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {view.map((b) => {
                    const st = STATUS[b.progress?.status || 'not_started'];
                    return (
                      <div key={b._id} onClick={() => openBook(b)} className="card card-hover group overflow-hidden flex flex-col cursor-pointer">
                        <div className="relative">
                          <CoverImage src={b.coverImage} alt={b.title} className="aspect-[4/5]" />
                          <span className={`pill absolute top-2.5 left-2.5 z-20 text-[0.62rem] ${st.cls}`}>{st.label}</span>
                          <div className="absolute inset-0 z-20 grid place-items-center bg-maroon-dark/45 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="btn btn-gold btn-sm">📖 {st.action}</span>
                          </div>
                        </div>
                        <div className="p-3.5 flex flex-col flex-1">
                          <span className="eyebrow text-[0.58rem]">{b.category}</span>
                          <h3 className="font-display text-base font-semibold text-maroon leading-snug mt-0.5 line-clamp-1 group-hover:text-saffron transition-colors">{b.title}</h3>
                          <p className="text-[0.7rem] text-ink-soft mb-2.5">by {b.author}</p>
                          <div className="mt-auto">
                            <div className="flex justify-between text-[0.65rem] text-ink-soft mb-1">
                              <span>{b.progress?.percent ? `${b.progress.percent}%` : 'Not started'}</span>
                              {b.progress?.totalPages > 0 && <span>{b.progress.lastPage}/{b.progress.totalPages}</span>}
                            </div>
                            <ProgressBar percent={b.progress?.percent || 0} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyLibrary;
