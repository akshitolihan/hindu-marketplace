import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="relative overflow-hidden bg-maroon-dark text-cream/70 pt-16 pb-8 mt-10">
    {/* faint mandala motif */}
    <div className="mandala absolute -right-24 -top-24 w-96 h-96 opacity-[0.06] pointer-events-none" />

    <div className="relative max-w-7xl mx-auto px-6">
      <div className="grid md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid place-items-center h-10 w-10 rounded-full border border-gold/40 text-gold text-xl">ॐ</span>
            <span className="font-display text-2xl text-cream">Hindu Wisdom</span>
          </div>
          <p className="text-sm leading-relaxed text-cream/60">
            A sacred library of ancient Hindu texts and OSHO's timeless commentaries — for the modern seeker.
          </p>
        </div>

        <div>
          <h4 className="text-gold font-semibold mb-4 tracking-wide text-sm uppercase">Collections</h4>
          <ul className="space-y-2.5 text-sm">
            {['Vedas', 'Upanishads', 'Gita', 'OSHO'].map((c) => (
              <li key={c}>
                <Link to={`/books?category=${c}`} className="hover:text-gold transition-colors">{c}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-gold font-semibold mb-4 tracking-wide text-sm uppercase">Explore</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/books" className="hover:text-gold transition-colors">All Books</Link></li>
            <li><Link to="/my-library" className="hover:text-gold transition-colors">My Library</Link></li>
            <li><Link to="/account" className="hover:text-gold transition-colors">My Account</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-gold font-semibold mb-4 tracking-wide text-sm uppercase">Connect</h4>
          <ul className="space-y-2.5 text-sm">
            <li className="hover:text-gold transition-colors">✉️ Email Us</li>
            <li className="hover:text-gold transition-colors">📿 Our Story</li>
          </ul>
        </div>
      </div>

      <div className="divider-gold my-8" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cream/50">
        <p>&copy; {new Date().getFullYear()} Hindu Wisdom. All rights reserved.</p>
        <p className="font-display text-base text-gold/80 tracking-wide">सत्यं शिवं सुन्दरम्</p>
      </div>
    </div>
  </footer>
);

export default Footer;
