import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatINR, effectivePrice, isOnSale } from '../utils/format';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CoverImage from './CoverImage';

const BookCard = ({ product, showAddToCart = false }) => {
  const onSale = isOnSale(product);
  const { items, addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const inCart = items.some((i) => i.product?._id === product._id);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate('/login', { state: { from: `/books/${product._id}` } });
    if (inCart) return navigate('/cart');
    setAdding(true);
    try {
      await addToCart(product._id);
    } catch {
      /* surfaced elsewhere */
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link to={`/books/${product._id}`} className="card card-hover group overflow-hidden flex flex-col">
      <div className="relative">
        <CoverImage src={product.coverImage} alt={product.title} className="aspect-[4/5]" />
        {onSale && <span className="pill absolute top-2.5 left-2.5 z-20 bg-maroon text-cream shadow text-[0.62rem]">SALE</span>}
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        <span className="eyebrow text-[0.58rem]">{product.category}</span>
        <h3 className="font-display text-base font-semibold text-maroon leading-snug mt-0.5 line-clamp-1 group-hover:text-saffron transition-colors">
          {product.title}
        </h3>
        <p className="text-[0.7rem] text-ink-soft mb-2.5">by {product.author}</p>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-display text-lg font-bold text-maroon">{formatINR(effectivePrice(product))}</span>
            {onSale && <span className="text-xs text-ink-soft/60 line-through">{formatINR(product.price)}</span>}
          </div>

          {showAddToCart && (
            <button
              onClick={handleAdd}
              disabled={adding}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                inCart
                  ? 'bg-maroon text-cream'
                  : 'bg-gradient-to-r from-gold-light to-gold text-maroon-dark hover:brightness-105 shadow-[0_6px_16px_-8px_rgba(200,160,74,0.9)]'
              }`}
            >
              {inCart ? 'In Cart' : adding ? '…' : '+ Add'}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default BookCard;
