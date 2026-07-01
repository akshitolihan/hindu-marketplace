import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      navigate(result.user?.role === 'admin' ? '/admin' : from, { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Continue your journey of wisdom">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-5 text-center text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" required />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-medium text-ink">Password</label>
            <Link to="/forgot-password" className="text-xs text-saffron hover:text-maroon transition-colors">Forgot?</Link>
          </div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" required />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <p className="text-center text-ink-soft mt-6 text-sm">
        New here?{' '}
        <Link to="/signup" className="text-saffron font-semibold hover:text-maroon transition-colors">Create an account</Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
