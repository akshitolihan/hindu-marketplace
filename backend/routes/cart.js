const express = require('express');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's cart
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    if (!cart) {
      cart = { items: [] };
    }
    
    res.json(cart);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/cart/add
// @desc    Add item to cart
router.post('/add', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Find user's cart
    let cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      // Create new cart if doesn't exist
      cart = new Cart({
        user: req.user.id,
        items: [{ product: productId, quantity: 1 }]
      });
    } else {
      // Check if product already in cart
      const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
      
      if (itemIndex > -1) {
        // Increment quantity if already exists
        cart.items[itemIndex].quantity += 1;
      } else {
        // Add new item
        cart.items.push({ product: productId, quantity: 1 });
      }
    }
    
    await cart.save();
    await cart.populate('items.product');
    
    res.json(cart);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/cart/remove/:productId
// @desc    Remove item from cart
router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
    await cart.save();
    await cart.populate('items.product');
    
    res.json(cart);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/cart/clear
// @desc    Clear entire cart
router.delete('/clear', auth, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user.id });
    res.json({ message: 'Cart cleared successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;