import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CoverImage from '../components/CoverImage';
import { formatINR, effectivePrice, isOnSale } from '../utils/format';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/products/${id}`).then((res) => setProduct(res.data)).catch(() => setProduct(null)).finally(() => setLoading(false));
  }, [id]);

  const inCart = items.some((i) => i.product?._id === id);

  const handleAdd = async (goToCart) => {
    if (!user) return navigate('/login', { state: { from: `/books/${id}` } });
    setBusy(true);
    setMsg('');
    try {
      if (!inCart) await addToCart(id);
      if (goToCart) navigate('/cart');
      else setMsg('Added to your cart ✓');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not add to cart');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center bg-cream text-maroon font-display text-xl">Loading…</div>;
  if (!product)
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        <Navbar />
        <div className="flex-1 grid place-items-center text-center">
          <div>
            <p className="font-display text-3xl text-maroon mb-3">Book not found</p>
            <Link to="/books" className="btn btn-primary">← Back to library</Link>
          </div>
        </div>
      </div>
    );

  const onSale = isOnSale(product);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* maroon backdrop behind the floating card */}
      <div className="relative bg-gradient-to-b from-maroon-dark to-maroon pt-28 pb-40 overflow-hidden">
        <div className="mandala absolute -right-24 top-10 w-96 h-96 opacity-[0.07]" />
        <div className="relative max-w-5xl mx-auto px-6">
          <Link to="/books" className="text-cream/70 hover:text-gold text-sm transition-colors">← Library</Link>
        </div>
      </div>

      <main className="flex-1 bg-cream">
        <div className="max-w-5xl mx-auto px-6 -mt-32 pb-16">
          <div className="card p-6 md:p-10 grid md:grid-cols-2 gap-10">
            <div className="relative">
              <CoverImage
                src={product.coverImage}
                alt={product.title}
                className="aspect-[3/4] shadow-[var(--shadow-soft)]"
                rounded="rounded-xl"
                iconSize="text-7xl"
              />
              {onSale && <span className="pill absolute top-4 left-4 z-20 bg-maroon text-cream">SALE</span>}
            </div>

            <div className="flex flex-col">
              <span className="eyebrow">{product.category}</span>
              <h1 className="font-display text-4xl font-semibold text-maroon leading-tight mt-1">{product.title}</h1>
              <p className="text-ink-soft mb-5">by {product.author}</p>
              <div className="divider-gold mb-5" />
              <p className="text-ink/80 leading-relaxed mb-7 whitespace-pre-line">{product.description}</p>

              <div className="flex items-baseline gap-3 mb-7">
                <span className="font-display text-4xl font-bold text-maroon">{formatINR(effectivePrice(product))}</span>
                {onSale && (
                  <>
                    <span className="text-lg text-ink-soft/60 line-through">{formatINR(product.price)}</span>
                    <span className="pill bg-saffron/15 text-saffron">Limited offer</span>
                  </>
                )}
              </div>

              {msg && <p className="text-emerald-700 mb-4 text-sm font-medium">{msg}</p>}

              <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                <button onClick={() => handleAdd(false)} disabled={busy || inCart} className="btn btn-outline flex-1">
                  {inCart ? 'In Cart ✓' : 'Add to Cart'}
                </button>
                <button onClick={() => handleAdd(true)} disabled={busy} className="btn btn-gold flex-1">
                  Buy Now
                </button>
              </div>
              <p className="text-xs text-ink-soft/70 mt-4 text-center sm:text-left">
                🔒 Secure checkout · Instant access in your library
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookDetail;
