const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products (with optional category filter)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = {};
    if (category && category !== 'All') {
      query.category = category;
    }
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/categories/all
// @desc    Get all categories
router.get('/categories/all', (req, res) => {
  const categories = ['Vedas', 'Upanishads', 'Gita', 'OSHO', 'Puranas', 'Others'];
  res.json(categories);
});

module.exports = router;