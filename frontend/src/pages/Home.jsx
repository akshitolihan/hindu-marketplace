import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    { name: 'Vedas', icon: '📖', description: 'Ancient scriptures of divine knowledge', color: 'from-orange-600 to-red-600', bg: 'bg-orange-50' },
    { name: 'Upanishads', icon: '🕉️', description: 'Philosophical texts on meditation', color: 'from-purple-600 to-pink-600', bg: 'bg-purple-50' },
    { name: 'Gita', icon: '⚔️', description: 'The divine song of Lord Krishna', color: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50' },
    { name: 'OSHO', icon: '🧘', description: 'Commentaries on Hindu texts', color: 'from-green-600 to-teal-600', bg: 'bg-green-50' },
    { name: 'Puranas', icon: '📜', description: 'Ancient mythological stories', color: 'from-yellow-600 to-orange-600', bg: 'bg-yellow-50' },
    { name: 'Others', icon: '📚', description: 'Other sacred texts', color: 'from-gray-600 to-gray-800', bg: 'bg-gray-50' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-orange-50">
      {/* Navigation Bar - Transparent with blur on scroll */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-maroon/95 backdrop-blur-md shadow-lg' : 'bg-maroon/80 backdrop-blur-sm'
      } text-white px-6 py-4 flex justify-between items-center`}>
        <div className="flex items-center space-x-3">
          <div className="text-3xl animate-pulse">🕉️</div>
          <div>
            <span className="text-2xl font-bold tracking-wide">Hindu Wisdom</span>
            <p className="text-xs text-gold">Sacred Knowledge Hub</p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          {user ? (
            <>
              <span className="text-sm">Welcome, {user.name}</span>
              <Link to="/my-library" className="hover:text-gold transition">My Library</Link>
              <Link to="/cart" className="hover:text-gold transition">Cart 🛒</Link>
              <button onClick={logout} className="bg-saffron text-maroon px-5 py-2 rounded-full font-semibold hover:bg-gold transition shadow-md">
                    Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-gold transition font-medium">Login</Link>
              <Link to="/signup" className="bg-saffron text-maroon px-5 py-2 rounded-full font-semibold hover:bg-gold transition shadow-md">
                Sign Up Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section with Decorative Elements */}
      <div className="relative overflow-hidden pt-24">
        <div className="absolute top-20 left-10 w-64 h-64 bg-orange-300 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-yellow-300 rounded-full opacity-20 blur-3xl animate-pulse delay-1000"></div>
        
        <div className="text-center py-20 px-4 relative z-10">
          <div className="inline-block mb-6">
            <div className="flex items-center justify-center space-x-3 text-6xl mb-4">
              <span className="animate-bounce">🕉️</span>
              <span className="animate-bounce delay-150">🔱</span>
              <span className="animate-bounce delay-300">🪔</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-maroon mb-4">
            Sacred Hindu Texts
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Discover profound wisdom from ancient scriptures with <span className="text-saffron font-semibold">OSHO's</span> unique commentary
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <button className="bg-maroon text-white px-8 py-3 rounded-full font-semibold hover:bg-saffron hover:text-maroon transition shadow-lg">
              Explore Collection
            </button>
            <button className="border-2 border-maroon text-maroon px-8 py-3 rounded-full font-semibold hover:bg-maroon hover:text-white transition">
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-maroon mb-4">Explore by Category</h2>
          <div className="w-24 h-1 bg-gold mx-auto rounded-full"></div>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
            Dive into the timeless wisdom of Hindu scriptures, organized by category
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((cat, index) => (
            <div 
              key={index} 
              className={`${cat.bg} rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden group`}
            >
              <div className={`bg-gradient-to-r ${cat.color} p-4 text-white`}>
                <div className="text-5xl mb-2">{cat.icon}</div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-maroon mb-2">{cat.name}</h3>
                <p className="text-gray-600 mb-4">{cat.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gold font-semibold">Available Now</span>
                  <button className="bg-maroon text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-saffron hover:text-maroon transition shadow-md group-hover:shadow-lg">
                    View All →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Section */}
      <div className="bg-gradient-to-r from-maroon to-orange-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Why Choose Hindu Wisdom?</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-8">
            <div className="p-6">
              <div className="text-4xl mb-3">📖</div>
              <h3 className="text-xl font-semibold mb-2">Authentic Teachings</h3>
              <p className="text-orange-100">Carefully curated summaries from original scriptures</p>
            </div>
            <div className="p-6">
              <div className="text-4xl mb-3">🧘</div>
              <h3 className="text-xl font-semibold mb-2">OSHO's Commentary</h3>
              <p className="text-orange-100">Unique insights and modern interpretations</p>
            </div>
            <div className="p-6">
              <div className="text-4xl mb-3">💎</div>
              <h3 className="text-xl font-semibold mb-2">Instant Download</h3>
              <p className="text-orange-100">Get PDFs immediately after purchase</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">🕉️</span>
                <span className="text-white font-bold text-xl">Hindu Wisdom</span>
              </div>
              <p className="text-sm">Preserving and sharing ancient Hindu wisdom for modern seekers.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Categories</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-gold transition">Vedas</a></li>
                <li><a href="#" className="hover:text-gold transition">Upanishads</a></li>
                <li><a href="#" className="hover:text-gold transition">Gita</a></li>
                <li><a href="#" className="hover:text-gold transition">OSHO</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-gold transition">FAQ</a></li>
                <li><a href="#" className="hover:text-gold transition">Contact Us</a></li>
                <li><a href="#" className="hover:text-gold transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gold transition">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-gold transition">📧 Email Us</a></li>
                <li><a href="#" className="hover:text-gold transition">📱 Follow on Social</a></li>
                <li><a href="#" className="hover:text-gold transition">📞 Customer Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm">
            <p>&copy; 2024 Hindu Wisdom. All rights reserved. | May wisdom prevail 🕉️</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;