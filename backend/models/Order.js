const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    price: Number
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  razorpayOrderId: {
    type: String,
    unique: true
  },
  razorpayPaymentId: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  customerEmail: String,
  customerName: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);