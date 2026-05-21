import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-cream">
      <nav className="bg-maroon text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl">🕉️</span>
          <span className="text-xl font-bold">Hindu Wisdom</span>
        </Link>
      </nav>

      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <h2 className="text-3xl font-bold text-center text-maroon mb-6">Login</h2>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-saffron"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-saffron"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-saffron text-white py-2 rounded-lg font-semibold hover:bg-gold hover:text-maroon transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <p className="text-center text-gray-600 mt-4">
            Don't have an account?{' '}
            <Link to="/signup" className="text-saffron hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;