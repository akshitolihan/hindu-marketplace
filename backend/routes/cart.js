const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route GET /api/cart  — the user's cart with populated product details.
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart) cart = { items: [] };
    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/cart/add  { productId }
// Ebooks are unique items: a book is either in the cart or not (no quantities).
router.post('/add', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findOne({ _id: productId, isPublished: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Don't let users add books they already own.
    const user = await User.findById(req.user.id).select('purchasedProducts');
    if (user.purchasedProducts.some((p) => p.product.toString() === productId)) {
      return res.status(400).json({ message: 'You already own this book' });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [{ product: productId }] });
    } else if (!cart.items.some((i) => i.product.toString() === productId)) {
      cart.items.push({ product: productId });
    }
    cart.updatedAt = new Date();
    await cart.save();
    await cart.populate('items.product');
    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route DELETE /api/cart/remove/:productId
router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
    await cart.save();
    await cart.populate('items.product');
    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route DELETE /api/cart/clear
router.delete('/clear', auth, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user.id });
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
