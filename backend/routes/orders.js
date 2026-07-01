const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const auth = require('../middleware/auth');
const fulfillOrder = require('../utils/fulfillOrder');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @route POST /api/orders/create-order
// Builds a Razorpay order from the user's cart. The amount is computed entirely
// server-side from each product's effectivePrice — the client cannot set prices.
router.post('/create-order', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const user = await User.findById(req.user.id).select('purchasedProducts name email');
    const owned = new Set(user.purchasedProducts.map((p) => p.product.toString()));

    // Ebooks are bought once. Skip anything the user already owns or that vanished.
    let totalAmount = 0;
    const products = [];
    for (const item of cart.items) {
      const p = item.product;
      if (!p || owned.has(p._id.toString())) continue;
      const price = p.effectivePrice; // server-trusted virtual
      totalAmount += price;
      products.push({ product: p._id, price });
    }

    if (products.length === 0) {
      return res.status(400).json({ message: 'Nothing to purchase — you already own these books.' });
    }
    if (totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid order total' });
    }

    const amountPaise = Math.round(totalAmount * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `rcpt_${req.user.id.slice(-6)}_${Date.now()}`
    });

    await Order.create({
      user: req.user.id,
      products,
      totalAmount,
      razorpayOrderId: razorpayOrder.id,
      status: 'pending',
      customerEmail: user.email,
      customerName: user.name
    });

    res.json({
      orderId: razorpayOrder.id,
      amount: amountPaise,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/orders/verify-payment
// Verifies the Razorpay signature before granting access. Without this check
// anyone could fake a payment and get the books for free.
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // The order must belong to the authenticated user.
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Constant-time comparison to avoid leaking the signature via timing.
    const valid =
      expected.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));

    if (!valid) {
      order.status = 'failed';
      await order.save();
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    await fulfillOrder(order, razorpay_payment_id);
    res.json({ message: 'Payment verified', orderId: order._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/orders/webhook
// Server-to-server confirmation from Razorpay. This is the source of truth:
// even if the buyer closes the tab before verify-payment runs, the webhook
// fulfills the order. Body is the RAW buffer (see server.js).
router.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ message: 'Webhook not configured' });

    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    if (
      !signature ||
      expected.length !== signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = JSON.parse(req.body.toString());
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const entity = event.payload.payment?.entity || {};
      const orderId = entity.order_id;
      const paymentId = entity.id;
      if (orderId) {
        const order = await Order.findOne({ razorpayOrderId: orderId });
        if (order) await fulfillOrder(order, paymentId);
      }
    }

    // Always 200 quickly so Razorpay doesn't retry on our slow processing.
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ message: 'Webhook handling failed' });
  }
});

// @route GET /api/orders/my-orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id, status: 'completed' })
      .populate('products.product', 'title author coverImage category')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
