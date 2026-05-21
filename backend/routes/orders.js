const express = require('express');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @route   POST /api/orders/create-order
// @desc    Create a Razorpay order
router.post('/create-order', auth, async (req, res) => {
  try {
    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    
    // Calculate total amount
    let totalAmount = 0;
    const products = cart.items.map(item => {
      const price = item.product.price;
      totalAmount += price * item.quantity;
      return {
        product: item.product._id,
        price: price
      };
    });
    
    // Create Razorpay order
    const options = {
      amount: totalAmount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    };
    
    const razorpayOrder = await razorpay.orders.create(options);
    
    // Save order in database
    const order = new Order({
      user: req.user.id,
      products: products,
      totalAmount: totalAmount,
      razorpayOrderId: razorpayOrder.id,
      status: 'pending'
    });
    
    await order.save();
    
    res.json({
      orderId: razorpayOrder.id,
      amount: totalAmount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders/verify-payment
// @desc    Verify payment and complete order
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Find order
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update order with payment details
    order.razorpayPaymentId = razorpay_payment_id;
    order.status = 'completed';
    await order.save();
    
    // Add purchased products to user's profile
    const user = await User.findById(req.user.id);
    const productIds = order.products.map(p => ({
      product: p.product,
      orderId: order._id
    }));
    
    user.purchasedProducts.push(...productIds);
    await user.save();
    
    // Clear user's cart
    await Cart.findOneAndDelete({ user: req.user.id });
    
    res.json({ 
      message: 'Payment verified and order completed',
      orderId: order._id
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/my-orders
// @desc    Get user's purchase history
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id, status: 'completed' })
      .populate('products.product')
      .sort({ createdAt: -1 });
    
    res.json(orders);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;