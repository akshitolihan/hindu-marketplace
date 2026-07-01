import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');

    setLoading(true);
    const result = await signup(name, email, password);
    if (result.success) {
      setSuccess(result.message);
      setTimeout(() => navigate(result.loggedIn ? '/' : '/login'), result.loggedIn ? 600 : 2000);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <AuthLayout title="Begin Your Journey" subtitle="Create your free account">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-5 text-center text-sm">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl mb-5 text-center text-sm">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="field" required />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Creating…' : 'Create Account'}
        </button>
      </form>
      <p className="text-center text-ink-soft mt-6 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-saffron font-semibold hover:text-maroon transition-colors">Sign In</Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
