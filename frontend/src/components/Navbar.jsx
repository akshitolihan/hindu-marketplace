import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  const navLink = 'text-sm font-medium text-cream/85 hover:text-gold transition-colors';

  const links = (
    <>
      <Link to="/books" className={navLink}>Library</Link>
      {user ? (
        <>
          <Link to="/my-library" className={navLink}>My Books</Link>
          <Link to="/cart" className={`${navLink} relative`}>
            Cart
            {count > 0 && (
              <span className="absolute -top-2 -right-4 bg-gold text-maroon-dark text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          {isAdmin && <Link to="/admin" className="text-sm font-semibold text-gold hover:text-gold-light transition-colors">Admin</Link>}
          <Link to="/account" className={navLink}>Account</Link>
          <button onClick={logout} className="btn btn-gold btn-sm">Logout</button>
        </>
      ) : (
        <>
          <Link to="/login" className={navLink}>Login</Link>
          <Link to="/signup" className="btn btn-gold btn-sm">Begin Free</Link>
        </>
      )}
    </>
  );

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-maroon-dark/95 backdrop-blur-md shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)] py-2.5'
          : 'bg-gradient-to-b from-maroon-dark/70 to-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <span className="grid place-items-center h-10 w-10 rounded-full border border-gold/50 text-gold text-xl group-hover:bg-gold/10 transition-colors">
            ॐ
          </span>
          <span className="leading-tight">
            <span className="block font-display text-xl font-semibold text-cream tracking-wide">Hindu Wisdom</span>
            <span className="block text-[10px] uppercase tracking-[0.3em] text-gold/80">Sacred Knowledge</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">{links}</div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden h-10 w-10 grid place-items-center rounded-full border border-cream/20 text-cream text-xl"
          aria-label="Toggle menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {open && (
        <div className="md:hidden mt-3 mx-3 rounded-2xl bg-maroon-dark/97 backdrop-blur-md border border-gold/15 px-6 py-5 flex flex-col items-start gap-4 shadow-2xl">
          {links}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
