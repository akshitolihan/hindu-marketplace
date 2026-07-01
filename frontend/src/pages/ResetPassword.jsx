import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const token = params.get('token');
  const email = params.get('email');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, email, password });
      if (data.token) {
        localStorage.setItem('token', data.token);
        await refreshUser();
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const invalid = !token || !email;

  return (
    <AuthLayout title="Reset Password" subtitle={invalid ? '' : 'Choose a new password'}>
      {invalid ? (
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-ink/80 mb-6">This reset link is invalid or incomplete.</p>
          <Link to="/forgot-password" className="btn btn-primary">Request a new link</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-center text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field" required />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
