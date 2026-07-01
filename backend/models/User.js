const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpiry: Date,
  resetPasswordToken: String,
  resetPasswordExpiry: Date,
  purchasedProducts: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    purchasedAt: { type: Date, default: Date.now },
    orderId: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Admin user list sorts newest-first.
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);