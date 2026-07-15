import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookCard from '../components/BookCard';

const categories = [
  { name: 'Vedas', icon: '📖', description: 'Ancient scriptures of divine knowledge' },
  { name: 'Upanishads', icon: '🕉️', description: 'Philosophical texts on meditation' },
  { name: 'Gita', icon: '🪈', description: 'The divine song of Lord Krishna' },
  { name: 'OSHO', icon: '🧘', description: 'Modern commentaries on Hindu texts' },
  { name: 'Puranas', icon: '📜', description: 'Timeless mythological stories' },
  { name: 'Others', icon: '📿', description: 'Other sacred wisdom texts' }
];

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products')
      .then((res) => setFeatured(res.data.slice(0, 4)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ===== HERO ===== */}
      <header className="relative overflow-hidden bg-gradient-to-b from-maroon-dark via-maroon to-[#7d2636] text-cream">
        {/* mandala watermark */}
        <div className="mandala animate-spin-slow absolute -top-40 left-1/2 -translate-x-1/2 w-[680px] h-[680px] opacity-[0.08] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-saffron/20 blur-3xl" />
        <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-gold/15 blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-6 pt-36 pb-28 text-center">
          <p className="eyebrow text-gold mb-5 animate-fade-up">॥ Sacred Knowledge Hub ॥</p>
          <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.05] mb-6 animate-fade-up">
            Timeless Wisdom of the
            <span className="block text-gold-light italic">Sanātana Dharma</span>
          </h1>
          <p className="text-lg md:text-xl text-cream/80 max-w-2xl mx-auto leading-relaxed animate-fade-up">
            Discover the Vedas, Upanishads, and Bhagavad Gita — illuminated by{' '}
            <span className="text-gold font-medium">OSHO's</span> luminous commentary. Read instantly, anywhere.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4 animate-fade-up">
            <Link to="/books" className="btn btn-gold">Explore the Library</Link>
            <Link to="/signup" className="btn btn-outline-light">
              Begin Your Journey
            </Link>
          </div>
        </div>

        {/* soft transition into page */}
        <div className="h-16 bg-gradient-to-b from-transparent to-cream" />
      </header>

      <main className="flex-1 bg-cream">
        {/* ===== FEATURED ===== */}
        {(loading || featured.length > 0) && (
          <section className="max-w-7xl mx-auto px-6 py-20">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="eyebrow mb-2">Curated for you</p>
                <h2 className="font-display text-4xl font-semibold text-maroon">Featured Texts</h2>
              </div>
              <Link to="/books" className="text-saffron font-semibold hover:text-maroon transition-colors whitespace-nowrap">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="card overflow-hidden animate-pulse">
                      <div className="aspect-[3/4] bg-gradient-to-br from-sand to-[#ecdfc6]" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 rounded bg-gold/15 w-3/4" />
                        <div className="h-3 rounded bg-gold/10 w-1/2" />
                        <div className="h-5 rounded bg-gold/15 w-1/3 mt-3" />
                      </div>
                    </div>
                  ))
                : featured.map((p) => <BookCard key={p._id} product={p} />)}
            </div>
          </section>
        )}

        {/* ===== CATEGORIES ===== */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-14">
            <p className="eyebrow mb-2">Explore the path</p>
            <h2 className="font-display text-4xl font-semibold text-maroon">Sacred Collections</h2>
            <div className="divider-gold max-w-xs mx-auto mt-5" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={`/books?category=${cat.name}`}
                className="card card-hover group p-7 flex items-center gap-5"
              >
                <span className="grid place-items-center h-16 w-16 rounded-full bg-gradient-to-br from-sand to-[#ecdfc6] text-3xl border border-gold/30 group-hover:scale-105 transition-transform">
                  {cat.icon}
                </span>
                <div>
                  <h3 className="font-display text-2xl font-semibold text-maroon group-hover:text-saffron transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-ink-soft">{cat.description}</p>
                </div>
                <span className="ml-auto text-gold opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ===== VALUES ===== */}
        <section className="relative overflow-hidden bg-gradient-to-br from-maroon to-maroon-dark text-cream py-20 mt-12">
          <div className="mandala absolute -left-32 top-1/2 -translate-y-1/2 w-[420px] h-[420px] opacity-[0.07]" />
          <div className="relative max-w-6xl mx-auto px-6 text-center">
            <p className="eyebrow text-gold mb-2">Why Hindu Wisdom</p>
            <h2 className="font-display text-4xl font-semibold mb-12">A Premium Reading Sanctuary</h2>
            <div className="grid md:grid-cols-3 gap-10">
              {[
                { icon: '📖', t: 'Authentic Teachings', d: 'Faithfully curated from original scriptures and trusted sources.' },
                { icon: '🧘', t: "OSHO's Commentary", d: 'Profound modern insight that brings ancient verses to life.' },
                { icon: '✨', t: 'Instant & Beautiful', d: 'Read in our elegant in-site reader the moment you purchase.' }
              ].map((f) => (
                <div key={f.t} className="px-4">
                  <div className="mx-auto mb-4 grid place-items-center h-16 w-16 rounded-full border border-gold/40 text-3xl">{f.icon}</div>
                  <h3 className="font-display text-2xl font-semibold text-gold-light mb-2">{f.t}</h3>
                  <p className="text-cream/75 leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
