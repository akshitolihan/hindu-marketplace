const User = require('../models/User');
const Cart = require('../models/Cart');
const sendEmail = require('./sendEmail');

const CLIENT_URL = process.env.CLIENT_URL?.split(',')[0].trim() || 'http://localhost:5173';

// Marks an order paid and grants the buyer access to its books.
// Idempotent: safe to call from BOTH the client verify call and the webhook —
// whichever arrives first fulfills, the second is a no-op.
async function fulfillOrder(order, paymentId) {
  if (order.status === 'completed') return order;

  order.razorpayPaymentId = paymentId || order.razorpayPaymentId;
  order.status = 'completed';
  await order.save();

  const user = await User.findById(order.user);
  if (user) {
    const owned = new Set(user.purchasedProducts.map((p) => p.product.toString()));
    for (const item of order.products) {
      const id = item.product.toString();
      if (!owned.has(id)) {
        user.purchasedProducts.push({ product: item.product, orderId: order._id.toString() });
        owned.add(id);
      }
    }
    await user.save();

    // Best-effort receipt; never let an email failure break fulfillment.
    sendEmail(
      user.email,
      'Your Hindu Wisdom purchase is ready 📚',
      `<h2>Thank you, ${user.name} 🙏</h2>
       <p>Your payment was successful. Your books are now in your library.</p>
       <p><a href="${CLIENT_URL}/my-library" style="background:#7b1e1e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Open My Library</a></p>`
    ).catch((e) => console.error('Receipt email failed:', e.message));
  }

  // Empty the cart now that it's been converted to an order.
  await Cart.findOneAndDelete({ user: order.user });
  return order;
}

module.exports = fulfillOrder;
