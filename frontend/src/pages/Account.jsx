import React, { useState } from 'react';
import api from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const Account = () => {
  const { user, isAdmin } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const field = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (form.newPassword !== form.confirm) return setMsg({ type: 'error', text: 'New passwords do not match' });
    if (form.newPassword.length < 8) return setMsg({ type: 'error', text: 'New password must be at least 8 characters' });
    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setMsg({ type: 'success', text: data.message });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Could not change password' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="relative bg-gradient-to-b from-maroon-dark to-maroon text-cream pt-32 pb-14 overflow-hidden">
        <div className="mandala absolute -left-16 -top-10 w-72 h-72 opacity-[0.07]" />
        <div className="relative max-w-lg mx-auto px-6 text-center">
          <p className="eyebrow text-gold mb-2">Settings</p>
          <h1 className="font-display text-5xl font-semibold">My Account</h1>
        </div>
      </div>

      <main className="flex-1 bg-cream">
        <div className="max-w-lg mx-auto px-6 py-12">
          <div className="card p-6 mb-6">
            {[
              ['Name', user?.name],
              ['Email', user?.email],
              ['Role', (user?.role || '') + (isAdmin ? ' 👑' : '')]
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gold/10 last:border-0">
                <span className="text-ink-soft">{k}</span>
                <span className="font-medium text-ink capitalize">{v}</span>
              </div>
            ))}
          </div>

          <form onSubmit={submit} className="card p-6 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-maroon">Change Password</h2>
            {msg && (
              <p className={`p-3 rounded-xl text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {msg.text}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Current Password</label>
              <input type="password" value={form.currentPassword} onChange={field('currentPassword')} required className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">New Password</label>
              <input type="password" value={form.newPassword} onChange={field('newPassword')} required className="field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Confirm New Password</label>
              <input type="password" value={form.confirm} onChange={field('confirm')} required className="field" />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;
