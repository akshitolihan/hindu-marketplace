import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatINR, isOnSale } from '../utils/format';

const CATEGORIES = ['Vedas', 'Upanishads', 'Gita', 'OSHO', 'Puranas', 'Others'];
const TABS = ['Dashboard', 'Upload Book', 'Manage Books', 'Reawaken', 'Orders', 'Users'];

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
        {tab === 'Reawaken' && <ReawakenAdmin />}
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
  const empty = { title: '', author: 'OSHO', category: 'Gita', price: '', previewPages: '0', description: '' };
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Price (₹) *</label>
          <input type="number" min="0" step="1" value={form.price} onChange={field('price')} required className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Free preview pages</label>
          <input type="number" min="0" step="1" value={form.previewPages} onChange={field('previewPages')} className="w-full border rounded-lg px-3 py-2" />
          <p className="text-xs text-ink-soft mt-1">0 = no preview. Non-owners can read this many pages free.</p>
        </div>
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
  const [analyticsFor, setAnalyticsFor] = useState(null); // product whose analytics are shown

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
                <button onClick={() => setAnalyticsFor(b)} className="text-maroon hover:underline mr-3">
                  Stats
                </button>
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
      {analyticsFor && <AnalyticsModal product={analyticsFor} onClose={() => setAnalyticsFor(null)} />}
    </div>
  );
};

const AnalyticsModal = ({ product, onClose }) => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get(`/admin/products/${product._id}/analytics`).then((r) => setData(r.data)).catch(() => setErr('Could not load analytics'));
  }, [product._id]);

  const Stat = ({ label, value, sub }) => (
    <div className="bg-sand rounded-lg p-4 text-center">
      <div className="font-display text-2xl font-bold text-maroon">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
      {sub && <div className="text-[0.65rem] text-ink-soft/70 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[88vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-maroon">Reading Analytics — {product.title}</h3>
          <button onClick={onClose} className="text-gray-500 text-xl leading-none">✕</button>
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        {!data && !err ? (
          <p className="text-ink-soft text-sm py-8 text-center">Loading…</p>
        ) : data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <Stat label="Readers" value={data.opens} />
              <Stat label="Completed" value={data.completed} />
              <Stat label="Completion" value={`${data.completionRate}%`} />
              <Stat label="Avg progress" value={`${data.avgProgress}%`} />
            </div>
            {data.opens === 0 ? (
              <p className="text-sm text-ink-soft text-center py-4">No reading activity yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-sm font-semibold text-maroon mb-2">Drop-off pages</p>
                  {data.dropOffPages.length === 0 ? <p className="text-xs text-ink-soft">—</p> : (
                    <ul className="space-y-1 text-sm">
                      {data.dropOffPages.map((d) => (
                        <li key={d.page} className="flex justify-between"><span>Page {d.page}</span><span className="text-ink-soft">{d.readers} reader{d.readers === 1 ? '' : 's'}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-maroon mb-2">Most highlighted pages</p>
                  {data.mostHighlighted.length === 0 ? <p className="text-xs text-ink-soft">—</p> : (
                    <ul className="space-y-1 text-sm">
                      {data.mostHighlighted.map((h) => (
                        <li key={h.page} className="flex justify-between"><span>Page {h.page}</span><span className="text-ink-soft">{h.highlights} ✎</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-4 text-xs text-ink-soft mt-5 border-t pt-3">
              <span>{data.totals.highlights} highlights</span>
              <span>{data.totals.notes} notes</span>
              <span>{data.totals.bookmarks} bookmarks</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const PERMS = [
  ['allowDownload', 'Download', false],
  ['allowHighlights', 'Highlights', true],
  ['allowNotes', 'Notes', true],
  ['allowBookmarks', 'Bookmarks', true],
  ['allowCopy', 'Copy text', true]
];

const EditBookModal = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: product.title,
    author: product.author,
    category: product.category,
    description: product.description,
    previewPages: product.previewPages ?? 0,
    allowDownload: product.allowDownload ?? false,
    allowHighlights: product.allowHighlights ?? true,
    allowNotes: product.allowNotes ?? true,
    allowBookmarks: product.allowBookmarks ?? true,
    allowCopy: product.allowCopy ?? true
  });
  const [chapters, setChapters] = useState(product.chapters?.length ? product.chapters.map((c) => ({ ...c })) : []);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (k) => setForm((f) => ({ ...f, [k]: !f[k] }));

  const setChapter = (i, key, val) => setChapters((cs) => cs.map((c, j) => (j === i ? { ...c, [key]: val } : c)));
  const addChapter = () => setChapters((cs) => [...cs, { title: '', page: '' }]);
  const removeChapter = (i) => setChapters((cs) => cs.filter((_, j) => j !== i));

  const save = async () => {
    setErr('');
    setBusy(true);
    try {
      const cleanChapters = chapters.filter((c) => c.title && c.page).map((c) => ({ title: c.title, page: Number(c.page) }));
      await api.put(`/admin/products/${product._id}`, { ...form, chapters: cleanChapters });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save changes');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[88vh] overflow-auto">
        <h3 className="font-bold text-maroon mb-4">Edit Book</h3>
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
        <label className="block text-sm font-medium mb-1">Free preview pages</label>
        <input type="number" min="0" value={form.previewPages} onChange={field('previewPages')} className="w-full border rounded-lg px-3 py-2 mb-3" />
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea value={form.description} onChange={field('description')} rows={3} className="w-full border rounded-lg px-3 py-2 mb-4" />

        {/* Permissions */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-maroon mb-2">Reader permissions</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {PERMS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form[key]} onChange={() => toggle(key)} className="accent-maroon" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Manual chapters */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-maroon">Chapters (for PDFs without a table of contents)</p>
            <button onClick={addChapter} className="text-xs text-saffron font-semibold">+ Add</button>
          </div>
          {chapters.length === 0 && <p className="text-xs text-ink-soft">None. The PDF's built-in outline is used when available.</p>}
          <div className="space-y-2">
            {chapters.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input value={c.title} onChange={(e) => setChapter(i, 'title', e.target.value)} placeholder="Chapter title" className="flex-1 border rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" min="1" value={c.page} onChange={(e) => setChapter(i, 'page', e.target.value)} placeholder="Pg" className="w-16 border rounded-lg px-2 py-1.5 text-sm" />
                <button onClick={() => removeChapter(i)} className="text-red-500 px-1">✕</button>
              </div>
            ))}
          </div>
        </div>

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

/* ---------------- Reawaken: manage lesson videos ---------------- */
const MAX_VIDEO_MB = 200; // Cloudflare Stream single-request (non-resumable) upload limit

const ReawakenAdmin = () => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({}); // lessonId -> edited URL
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [uploads, setUploads] = useState({}); // lessonId -> percent (0-100)
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/reawaken/admin/lessons')
      .then((r) => {
        setStages(r.data.stages || []);
        const d = {};
        (r.data.stages || []).forEach((s) => s.lessons.forEach((l) => { d[l.id] = l.videoUrl || ''; }));
        setDrafts(d);
      })
      .catch(() => setErr('Could not load the Reawaken course.'))
      .finally(() => setLoading(false));
  }, []);

  const applyVideo = (lessonId, videoUrl) => {
    setDrafts((d) => ({ ...d, [lessonId]: videoUrl }));
    setStages((prev) => prev.map((s) => ({
      ...s,
      lessons: s.lessons.map((l) => (l.id === lessonId ? { ...l, videoUrl } : l))
    })));
    setSavedId(lessonId);
    setTimeout(() => setSavedId((c) => (c === lessonId ? null : c)), 2000);
  };

  const save = async (lessonId) => {
    setErr('');
    setSavingId(lessonId);
    try {
      const { data } = await api.put(`/reawaken/admin/lessons/${lessonId}`, { videoUrl: drafts[lessonId] || '' });
      applyVideo(lessonId, data.videoUrl);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save that link.');
    } finally {
      setSavingId(null);
    }
  };

  // Upload a video file straight from the browser to Cloudflare Stream, then
  // save the resulting playback URL. The file never routes through our server.
  const uploadVideo = async (lessonId, file) => {
    if (!file) return;
    setErr('');
    if (!file.type.startsWith('video/')) { setErr('Please choose a video file.'); return; }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setErr(`That file is ${(file.size / 1048576).toFixed(0)}MB. Please keep lesson videos under ${MAX_VIDEO_MB}MB (compress it, or paste a YouTube/Vimeo link instead).`);
      return;
    }
    setUploads((u) => ({ ...u, [lessonId]: 0 }));
    try {
      // 1. Ask our server for a one-time Cloudflare upload URL.
      const { data: up } = await api.get(`/reawaken/admin/video-upload-url/${lessonId}`);

      // 2. Upload the file directly to Cloudflare with a live progress bar.
      const form = new FormData();
      form.append('file', file);
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', up.uploadURL);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploads((u) => ({ ...u, [lessonId]: Math.round((ev.loaded / ev.total) * 100) }));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Upload failed — check your connection.'));
        xhr.send(form);
      });

      // 3. Save the playback URL. Cloudflare keeps encoding for a few seconds
      //    after this; the player shows a brief "processing" state until ready.
      await api.put(`/reawaken/admin/lessons/${lessonId}`, { videoUrl: up.playbackUrl });
      applyVideo(lessonId, up.playbackUrl);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Upload failed.');
    } finally {
      setUploads((u) => { const n = { ...u }; delete n[lessonId]; return n; });
    }
  };

  const total = stages.reduce((n, s) => n + s.lessons.length, 0);
  const withVideo = stages.reduce((n, s) => n + s.lessons.filter((l) => l.videoUrl).length, 0);

  if (loading) return <p className="text-gray-500">Loading course…</p>;

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-semibold text-maroon">Reawaken — course videos</h2>
        <p className="text-sm text-ink-soft mt-1">
          For each lesson, <span className="text-maroon font-medium">upload a video file</span> (up to {MAX_VIDEO_MB}MB) or paste a
          YouTube / Vimeo / .mp4 link. It plays inside the lesson on the{' '}
          <Link to="/reawaken" className="text-saffron underline">Reawaken</Link> page.
          <span className="text-maroon font-medium"> {withVideo}/{total}</span> lessons have a video.
        </p>
      </div>
      {err && <p className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm">{err}</p>}

      <div className="space-y-6">
        {stages.map((s, i) => (
          <div key={s.key} className="card p-5">
            <h3 className="font-display text-lg font-semibold text-maroon mb-3">
              <span className="text-gold mr-2">{i + 1}.</span>{s.title}
            </h3>
            <div className="space-y-4">
              {s.lessons.map((l) => {
                const pct = uploads[l.id];
                const uploading = pct !== undefined;
                return (
                  <div key={l.id} className="border-b border-gold/10 pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="sm:w-64 flex-shrink-0">
                        <p className="text-sm font-medium text-maroon flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${l.videoUrl ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {l.title}
                        </p>
                        <p className="text-xs text-ink-soft ml-4">{l.dur}</p>
                      </div>
                      <input
                        type="url"
                        value={drafts[l.id] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [l.id]: e.target.value }))}
                        placeholder="Paste a link, or upload a file →"
                        disabled={uploading}
                        className="flex-1 border border-gold/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold disabled:bg-gray-100"
                      />
                      <button
                        onClick={() => save(l.id)}
                        disabled={savingId === l.id || uploading || (drafts[l.id] ?? '') === (l.videoUrl || '')}
                        className="btn btn-primary btn-sm disabled:opacity-40"
                      >
                        {savingId === l.id ? 'Saving…' : savedId === l.id ? '✓ Saved' : 'Save'}
                      </button>
                      <label className={`btn btn-outline btn-sm cursor-pointer whitespace-nowrap ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                        {uploading ? `${pct}%` : '⬆ Upload'}
                        <input type="file" accept="video/*" className="hidden"
                          onChange={(e) => { uploadVideo(l.id, e.target.files[0]); e.target.value = ''; }} />
                      </label>
                    </div>
                    {uploading && (
                      <div className="mt-2 ml-1 h-1.5 rounded-full bg-gold/15 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-saffron to-gold transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
