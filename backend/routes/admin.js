const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// @route   POST /api/admin/products
// @desc    Add a new product (Admin only)
router.post('/products', adminAuth, async (req, res) => {
  try {
    const { title, description, category, price, pdfUrl, coverImage, author } = req.body;
    
    const product = new Product({
      title,
      description,
      category,
      price,
      pdfUrl,
      coverImage,
      author
    });
    
    await product.save();
    res.status(201).json({ message: 'Product added successfully', product });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders (Admin only)
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('products.product')
      .sort({ createdAt: -1 });
    
    res.json(orders);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (Admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete a product (Admin only)
router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;