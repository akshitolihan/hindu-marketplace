import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookCard from '../components/BookCard';

const CATEGORIES = ['All', 'Vedas', 'Upanishads', 'Gita', 'OSHO', 'Puranas', 'Others'];

const Books = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || 'All';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category !== 'All') params.category = category;
    if (search) params.search = search;
    api
      .get('/products', { params })
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, search]);

  const selectCategory = (c) => (c === 'All' ? setSearchParams({}) : setSearchParams({ category: c }));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* header band */}
      <div className="relative bg-gradient-to-b from-maroon-dark to-maroon text-cream pt-32 pb-14 overflow-hidden">
        <div className="mandala absolute -right-20 -top-16 w-80 h-80 opacity-[0.08]" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <p className="eyebrow text-gold mb-2">The Library</p>
          <h1 className="font-display text-5xl font-semibold">Browse Sacred Texts</h1>
        </div>
      </div>

      <main className="flex-1 bg-cream">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* controls */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-10">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => selectCategory(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    category === c
                      ? 'bg-maroon text-cream shadow-[var(--shadow-soft)]'
                      : 'bg-white text-maroon border border-gold/25 hover:border-gold hover:bg-sand'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:w-72">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/60">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles…"
                className="field field-search"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-sand" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-sand rounded w-1/3" />
                    <div className="h-4 bg-sand rounded w-3/4" />
                    <div className="h-4 bg-sand rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-4 opacity-40">📚</div>
              <p className="font-display text-2xl text-maroon">No texts found here yet</p>
              <p className="text-ink-soft mt-1">Try another collection or search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((p) => <BookCard key={p._id} product={p} showAddToCart />)}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Books;
