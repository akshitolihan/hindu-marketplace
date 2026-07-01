const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

const CATEGORIES = ['Vedas', 'Upanishads', 'Gita', 'OSHO', 'Puranas', 'Others'];

// @route GET /api/products  (public catalog, optional ?category= & ?search=)
// pdfUrl/pdfPublicId are select:false so they are never sent here.
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { isPublished: true };

    if (category && category !== 'All') {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Unknown category' });
      }
      query.category = category;
    }
    if (search) {
      query.title = { $regex: search.slice(0, 80), $options: 'i' };
    }

    const products = await Product.find(query).sort({ createdAt: -1 }).limit(100);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/products/categories/all
router.get('/categories/all', (req, res) => {
  res.json(CATEGORIES);
});

// @route GET /api/products/:id  (single published product)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isPublished: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    // Invalid ObjectId etc.
    res.status(404).json({ message: 'Product not found' });
  }
});

module.exports = router;
