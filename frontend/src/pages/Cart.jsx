import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CoverImage from '../components/CoverImage';
import { formatINR, effectivePrice } from '../utils/format';
import { loadRazorpay } from '../utils/razorpay';

const Cart = () => {
  const { items, removeFromCart, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = items.reduce((sum, i) => sum + (i.product ? effectivePrice(i.product) : 0), 0);

  const checkout = async () => {
    setError('');
    setBusy(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load the payment gateway. Check your connection.');

      const { data: order } = await api.post('/orders/create-order');

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: 'Hindu Wisdom',
          description: 'Ebook purchase',
          order_id: order.orderId,
          prefill: { name: user?.name, email: user?.email },
          theme: { color: '#6b1e2e' },
          handler: async (response) => {
            try {
              await api.post('/orders/verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              resolve();
            } catch (e) {
              reject(new Error(e.response?.data?.message || 'Payment verification failed'));
            }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
        });
        rzp.on('payment.failed', () => reject(new Error('Payment failed. Please try again.')));
        rzp.open();
      });

      await refresh();
      navigate('/my-library', { state: { justPurchased: true } });
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Checkout failed');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="relative bg-gradient-to-b from-maroon-dark to-maroon text-cream pt-32 pb-14 overflow-hidden">
        <div className="mandala absolute -left-16 -top-10 w-72 h-72 opacity-[0.07]" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="eyebrow text-gold mb-2">Checkout</p>
          <h1 className="font-display text-5xl font-semibold">Your Cart</h1>
        </div>
      </div>

      <main className="flex-1 bg-cream">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4 opacity-40">🛒</div>
              <p className="font-display text-2xl text-maroon mb-5">Your cart is empty</p>
              <Link to="/books" className="btn btn-primary">Browse the Library</Link>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {items.map((i) => (
                  <div key={i.product?._id} className="card p-4 flex items-center gap-4">
                    <CoverImage src={i.product?.coverImage} alt={i.product?.title} className="w-14 h-20 flex-shrink-0" rounded="rounded-lg" iconSize="text-2xl" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg font-semibold text-maroon truncate">{i.product?.title}</h3>
                      <p className="text-sm text-ink-soft">{i.product?.author}</p>
                    </div>
                    <span className="font-display text-lg font-bold text-maroon">{formatINR(effectivePrice(i.product))}</span>
                    <button onClick={() => removeFromCart(i.product._id)} className="text-ink-soft hover:text-maroon text-sm transition-colors">
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="card p-6 mt-6">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-ink-soft">Subtotal</span>
                  <span className="text-ink-soft">{formatINR(total)}</span>
                </div>
                <div className="divider-gold my-3" />
                <div className="flex justify-between items-baseline mb-5">
                  <span className="font-display text-xl font-semibold text-maroon">Total</span>
                  <span className="font-display text-2xl font-bold text-maroon">{formatINR(total)}</span>
                </div>
                {error && <p className="text-red-600 text-sm mb-3 text-center">{error}</p>}
                <button onClick={checkout} disabled={busy} className="btn btn-gold w-full">
                  {busy ? 'Processing…' : 'Proceed to Payment'}
                </button>
                <p className="text-xs text-ink-soft/70 text-center mt-3">🔒 Secured by Razorpay</p>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
