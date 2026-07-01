import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatINR, isOnSale } from '../utils/format';

const CATEGORIES = ['Vedas', 'Upanishads', 'Gita', 'OSHO', 'Puranas', 'Others'];
const TABS = ['Dashboard', 'Upload Book', 'Manage Books', 'Orders', 'Users'];

const Admin = () => {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('Dashboard');

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-gradient-to-r from-maroon-dark to-maroon text-cream px-6 py-3 flex justify-between items-center shadow-lg">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid place-items-center h-9 w-9 rounded-full border border-gold/50 text-gold">ॐ</span>
          <span className="font-display text-xl font-semibold">Hindu Wisdom <span className="text-gold/80 font-sans text-xs tracking-widest uppercase ml-1">Admin</span></span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="opacity-75 hidden sm:inline">{user?.email}</span>
          <Link to="/" className="hover:text-gold transition-colors">View Store</Link>
          <button onClick={logout} className="btn btn-gold btn-sm">Logout</button>
        </div>
      </header>

      <div className="flex gap-2 px-6 pt-5 flex-wrap max-w-7xl mx-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
              tab === t ? 'bg-maroon text-cream shadow-[var(--shadow-soft)]' : 'bg-white text-maroon border border-gold/25 hover:bg-sand'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <main className="p-6 max-w-7xl mx-auto">
        {tab === 'Dashboard' && <Dashboard />}
        {tab === 'Upload Book' && <UploadBook onDone={() => setTab('Manage Books')} />}
        {tab === 'Manage Books' && <ManageBooks />}
        {tab === 'Orders' && <Orders />}
        {tab === 'Users' && <Users />}
      </main>
    </div>
  );
};

/* ---------------- Dashboard ---------------- */
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get('/admin/stats').then((res) => setStats(res.data)).catch(() => {});
  }, []);
  if (!stats) return <p className="text-gray-500">Loading…</p>;

  const cards = [
    { label: 'Total Revenue', value: formatINR(stats.revenue), icon: '💰' },
    { label: 'Books', value: stats.books, icon: '📚' },
    { label: 'Customers', value: stats.users, icon: '👤' },
    { label: 'Completed Orders', value: stats.completedOrders, icon: '✅' }
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((c) => (
        <div key={c.label} className="card p-6 relative overflow-hidden">
          <div className="mandala absolute -right-8 -top-8 w-28 h-28 opacity-[0.05]" />
          <div className="relative">
            <div className="text-3xl mb-2">{c.icon}</div>
            <div className="font-display text-3xl font-bold text-maroon">{c.value}</div>
            <div className="text-sm text-ink-soft mt-0.5">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------------- Upload Book ---------------- */
const UploadBook = ({ onDone }) => {
  const empty = { title: '', author: 'OSHO', category: 'Gita', price: '', description: '' };
  const [form, setForm] = useState(empty);
  const [pdf, setPdf] = useState(null);
  const [cover, setCover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!pdf) return setMsg({ type: 'error', text: 'Please choose a PDF file.' });
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('pdf', pdf);
      if (cover) fd.append('cover', cover);
      await api.post('/admin/products', fd);
      setMsg({ type: 'success', text: 'Book uploaded successfully!' });
      setForm(empty);
      setPdf(null);
      setCover(null);
      e.target.reset();
      setTimeout(onDone, 800);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Upload failed' });
    } finally {
      setBusy(false);
    }
  };

  const field = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="card p-6 max-w-2xl space-y-4">
      <h2 className="text-xl font-bold text-maroon">Upload a New Book</h2>
      {msg && (
        <p className={`p-3 rounded-lg ${msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {msg.text}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input value={form.title} onChange={field('title')} required className="w-full border rounded-lg px-3 py-2" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Author</label>
          <input value={form.author} onChange={field('author')} className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category *</label>
          <select value={form.category} onChange={field('category')} className="w-full border rounded-lg px-3 py-2">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Price (₹) *</label>
        <input
          type="number"
          min="0"
          step="1"
          value={form.price}
          onChange={field('price')}
          required
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description *</label>
        <textarea
          value={form.description}
          onChange={field('description')}
          required
          rows={4}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Book PDF * (private)</label>
          <input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files[0])} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cover Image (optional)</label>
          <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files[0])} />
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary"
      >
        {busy ? 'Uploading…' : 'Upload Book'}
      </button>
    </form>
  );
};

/* ---------------- Manage Books ---------------- */
const ManageBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // product being sale-edited
  const [editingMeta, setEditingMeta] = useState(null); // product whose details are being edited

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/products').then((res) => setBooks(res.data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => load(), [load]);

  const updatePrice = async (id, price) => {
    await api.put(`/admin/products/${id}`, { price: Number(price) });
    load();
  };
  const togglePublish = async (b) => {
    await api.put(`/admin/products/${b._id}`, { isPublished: !b.isPublished });
    load();
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this book and its file permanently?')) return;
    await api.delete(`/admin/products/${id}`);
    load();
  };
  const clearSale = async (id) => {
    await api.delete(`/admin/products/${id}/sale`);
    load();
  };

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (books.length === 0) return <p className="text-gray-500">No books yet. Upload one from the “Upload Book” tab.</p>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-sand text-left text-ink-soft">
          <tr>
            <th className="p-3">Book</th>
            <th className="p-3">Category</th>
            <th className="p-3">Price (₹)</th>
            <th className="p-3">Sale</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => (
            <tr key={b._id} className="border-t">
              <td className="p-3 font-medium text-maroon">{b.title}</td>
              <td className="p-3">{b.category}</td>
              <td className="p-3">
                <input
                  type="number"
                  defaultValue={b.price}
                  onBlur={(e) => e.target.value != b.price && updatePrice(b._id, e.target.value)}
                  className="w-24 border rounded px-2 py-1"
                />
              </td>
              <td className="p-3">
                {isOnSale(b) ? (
                  <span className="text-red-600 font-semibold">
                    {formatINR(b.salePrice)}
                    <button onClick={() => clearSale(b._id)} className="ml-2 text-xs text-gray-400 underline">
                      clear
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setEditing(b)} className="text-saffron underline">
                    Set sale
                  </button>
                )}
              </td>
              <td className="p-3">
                <button
                  onClick={() => togglePublish(b)}
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    b.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {b.isPublished ? 'Published' : 'Hidden'}
                </button>
              </td>
              <td className="p-3 whitespace-nowrap">
                <button onClick={() => setEditingMeta(b)} className="text-maroon hover:underline mr-3">
                  Edit
                </button>
                <button onClick={() => remove(b._id)} className="text-red-500 hover:underline">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && <SaleModal product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {editingMeta && <EditBookModal product={editingMeta} onClose={() => setEditingMeta(null)} onSaved={() => { setEditingMeta(null); load(); }} />}
    </div>
  );
};

const EditBookModal = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: product.title,
    author: product.author,
    category: product.category,
    description: product.description
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setErr('');
    setBusy(true);
    try {
      await api.put(`/admin/products/${product._id}`, form);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save changes');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="font-bold text-maroon mb-4">Edit Book Details</h3>
        {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
        <label className="block text-sm font-medium mb-1">Title</label>
        <input value={form.title} onChange={field('title')} className="w-full border rounded-lg px-3 py-2 mb-3" />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">Author</label>
            <input value={form.author} onChange={field('author')} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={form.category} onChange={field('category')} className="w-full border rounded-lg px-3 py-2">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea value={form.description} onChange={field('description')} rows={4} className="w-full border rounded-lg px-3 py-2 mb-4" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
          <button onClick={save} disabled={busy} className="btn btn-primary btn-sm">
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SaleModal = ({ product, onClose, onSaved }) => {
  const [salePrice, setSalePrice] = useState('');
  const [saleEndsAt, setSaleEndsAt] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setErr('');
    setBusy(true);
    try {
      await api.put(`/admin/products/${product._id}/sale`, {
        salePrice: Number(salePrice),
        saleEndsAt: saleEndsAt || null
      });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not set sale');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-maroon mb-1">Set Sale</h3>
        <p className="text-sm text-gray-500 mb-4">{product.title} · base {formatINR(product.price)}</p>
        {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
        <label className="block text-sm font-medium mb-1">Sale price (₹)</label>
        <input
          type="number"
          min="0"
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-3"
        />
        <label className="block text-sm font-medium mb-1">Ends at (optional)</label>
        <input
          type="datetime-local"
          value={saleEndsAt}
          onChange={(e) => setSaleEndsAt(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
          <button onClick={save} disabled={busy} className="btn btn-primary btn-sm">
            {busy ? 'Saving…' : 'Save Sale'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Orders ---------------- */
const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/admin/orders').then((res) => setOrders(res.data)).finally(() => setLoading(false));
  }, []);
  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (orders.length === 0) return <p className="text-gray-500">No orders yet.</p>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-sand text-left text-ink-soft">
          <tr>
            <th className="p-3">Date</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Books</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id} className="border-t">
              <td className="p-3">{new Date(o.createdAt).toLocaleDateString()}</td>
              <td className="p-3">
                {o.user?.name || o.customerName}
                <div className="text-xs text-gray-400">{o.user?.email || o.customerEmail}</div>
              </td>
              <td className="p-3">{o.products?.map((p) => p.product?.title).filter(Boolean).join(', ')}</td>
              <td className="p-3 font-semibold">{formatINR(o.totalAmount)}</td>
              <td className="p-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    o.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : o.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {o.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ---------------- Users ---------------- */
const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/admin/users').then((res) => setUsers(res.data)).finally(() => setLoading(false));
  }, []);
  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-sand text-left text-ink-soft">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Books Owned</th>
            <th className="p-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} className="border-t">
              <td className="p-3 font-medium">{u.name}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.role}</td>
              <td className="p-3">{u.purchasedProducts?.length || 0}</td>
              <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;
