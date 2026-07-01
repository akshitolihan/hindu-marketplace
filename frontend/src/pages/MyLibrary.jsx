import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CoverImage from '../components/CoverImage';

const MyLibrary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/library').then((res) => setBooks(res.data)).catch(() => setError('Could not load your library')).finally(() => setLoading(false));
  }, []);

  const readBook = (book) => navigate(`/read/${book._id}`, { state: { title: book.title } });

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
              <Link to="/books" className="btn btn-primary">Browse the Library</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {books.map((b) => (
                <div
                  key={b._id}
                  onClick={() => readBook(b)}
                  className="card card-hover group overflow-hidden flex flex-col cursor-pointer"
                >
                  <div className="relative">
                    <CoverImage src={b.coverImage} alt={b.title} className="aspect-[4/5]" />
                    <span className="pill absolute top-2.5 left-2.5 z-20 bg-emerald-600/90 text-white shadow text-[0.62rem]">✓ Owned</span>
                    {/* hover overlay */}
                    <div className="absolute inset-0 z-20 grid place-items-center bg-maroon-dark/45 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="btn btn-gold btn-sm">📖 Read Now</span>
                    </div>
                  </div>
                  <div className="p-3.5 flex flex-col flex-1">
                    <span className="eyebrow text-[0.58rem]">{b.category}</span>
                    <h3 className="font-display text-base font-semibold text-maroon leading-snug mt-0.5 line-clamp-1 group-hover:text-saffron transition-colors">
                      {b.title}
                    </h3>
                    <p className="text-[0.7rem] text-ink-soft mb-2.5">by {b.author}</p>
                    <button onClick={() => readBook(b)} className="rounded-full w-full mt-auto text-xs font-semibold py-2 bg-gradient-to-r from-gold-light to-gold text-maroon-dark hover:brightness-105 transition-all">
                      📖 Read Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyLibrary;
