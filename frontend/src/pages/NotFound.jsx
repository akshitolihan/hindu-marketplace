import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const NotFound = () => (
  <div className="min-h-screen flex flex-col bg-cream">
    <Navbar />
    <div className="flex-1 grid place-items-center text-center px-4 relative overflow-hidden">
      <div className="mandala animate-spin-slow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] opacity-[0.06]" />
      <div className="relative">
        <div className="text-7xl mb-4">🕉️</div>
        <h1 className="font-display text-5xl font-semibold text-maroon mb-3">Page Not Found</h1>
        <p className="text-ink-soft mb-7">The path you seek is not on this map.</p>
        <Link to="/" className="btn btn-primary">Return Home</Link>
      </div>
    </div>
  </div>
);

export default NotFound;
