import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const VerifyEmail = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const email = params.get('email');
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }
    api
      .post('/auth/verify-email', { token, email })
      .then(async ({ data }) => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          await refreshUser();
        }
        setStatus('success');
        setMessage(data.message);
        setTimeout(() => navigate('/'), 1500);
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e.response?.data?.message || 'Verification failed.');
      });
  }, [params, navigate, refreshUser]);

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-to-br from-maroon-dark via-maroon to-[#7d2636]">
      <div className="mandala animate-spin-slow fixed -bottom-40 -right-40 w-[520px] h-[520px] opacity-[0.08] pointer-events-none" />
      <div className="card relative p-10 text-center max-w-md w-full">
        <div className="text-5xl mb-4">{status === 'success' ? '✅' : status === 'error' ? '⚠️' : '⏳'}</div>
        <h1 className="font-display text-3xl font-semibold text-maroon mb-2">
          {status === 'verifying' ? 'Verifying your email…' : status === 'success' ? 'Email Verified!' : 'Verification Failed'}
        </h1>
        <p className="text-ink-soft mb-6">{message}</p>
        {status === 'error' && (
          <Link to="/login" className="btn btn-primary">Go to Login</Link>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
