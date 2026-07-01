import React from 'react';
import { Link } from 'react-router-dom';

// Split-screen premium shell for all auth pages: a sacred maroon panel on the
// left (mandala + verse) and the form on the right.
const AuthLayout = ({ title, subtitle, children }) => (
  <div className="min-h-screen flex">
    {/* Decorative panel */}
    <aside className="hidden lg:flex relative w-1/2 bg-gradient-to-br from-maroon-dark via-maroon to-[#7d2636] text-cream overflow-hidden">
      <div className="mandala animate-spin-slow absolute -bottom-32 -left-24 w-[520px] h-[520px] opacity-[0.1]" />
      <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative z-10 flex flex-col justify-between p-14">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid place-items-center h-11 w-11 rounded-full border border-gold/50 text-gold text-xl">ॐ</span>
          <span className="font-display text-2xl">Hindu Wisdom</span>
        </Link>
        <div>
          <p className="font-display text-5xl leading-tight text-gold-light italic mb-4">
            “Yoga is the journey<br />of the self, through<br />the self, to the self.”
          </p>
          <p className="text-cream/70 tracking-wide">— The Bhagavad Gita</p>
        </div>
        <p className="text-xs text-cream/50 tracking-[0.3em] uppercase">Sacred Knowledge Hub</p>
      </div>
    </aside>

    {/* Form side */}
    <main className="flex-1 flex flex-col bg-cream">
      <div className="lg:hidden p-5">
        <Link to="/" className="flex items-center gap-2 text-maroon">
          <span className="grid place-items-center h-9 w-9 rounded-full border border-gold/50 text-gold">ॐ</span>
          <span className="font-display text-xl font-semibold">Hindu Wisdom</span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-semibold text-maroon">{title}</h1>
            {subtitle && <p className="text-ink-soft mt-2">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </main>
  </div>
);

export default AuthLayout;
