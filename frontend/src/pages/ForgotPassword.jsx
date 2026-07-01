import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import AuthLayout from '../components/AuthLayout';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot Password" subtitle="We'll send you a reset link">
      {sent ? (
        <div className="text-center">
          <div className="text-5xl mb-4">📧</div>
          <p className="text-ink/80 mb-6">{message}</p>
          <Link to="/login" className="btn btn-primary">Back to Login</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-center text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" required />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
          <p className="text-center">
            <Link to="/login" className="text-sm text-saffron hover:text-maroon transition-colors">Back to Login</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
