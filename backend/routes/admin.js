const express = require('express');
const { body } = require('express-validator');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');
const validate = require('../middleware/validate');
const { uploadBookFiles } = require('../middleware/upload');
const {
  uploadPrivatePdf,
  uploadPublicCover,
  destroyResource
} = require('../utils/cloudinaryStorage');

const router = express.Router();

const CATEGORIES = ['Vedas', 'Upanishads', 'Gita', 'OSHO', 'Puranas', 'Others'];
const slug = (s) => (s || 'book').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);

// Every admin route requires a verified admin role (checked against the DB).
router.use(adminAuth);

// @route POST /api/admin/products
// Upload a new book: PDF (required, private) + cover image (optional, public).
router.post(
  '/products',
  uploadBookFiles,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').isIn(CATEGORIES).withMessage('Invalid category'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be 0 or more')
  ],
  validate,
  async (req, res) => {
    let pdfResult;
    let coverResult;
    try {
      const pdfFile = req.files?.pdf?.[0];
      if (!pdfFile) return res.status(400).json({ message: 'A PDF file is required' });

      const base = slug(req.body.title);
      pdfResult = await uploadPrivatePdf(pdfFile.buffer, base);

      const coverFile = req.files?.cover?.[0];
      if (coverFile) coverResult = await uploadPublicCover(coverFile.buffer, base);

      const product = await Product.create({
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        price: Number(req.body.price),
        author: req.body.author || 'OSHO',
        previewPages: Math.max(0, parseInt(req.body.previewPages, 10) || 0),
        pdfUrl: pdfResult.secure_url,
        pdfPublicId: pdfResult.public_id,
        coverImage: coverResult ? coverResult.secure_url : ''
      });

      // Strip private fields from the response.
      const { pdfUrl, pdfPublicId, ...safe } = product.toObject();
      res.status(201).json({ message: 'Book uploaded successfully', product: safe });
    } catch (error) {
      console.error(error);
      // Roll back any uploaded files if the DB write failed.
      if (pdfResult) await destroyResource(pdfResult.public_id, 'raw', 'authenticated');
      if (coverResult) await destroyResource(coverResult.public_id, 'image', 'upload');
      res.status(500).json({ message: 'Failed to upload book' });
    }
  }
);

// @route GET /api/admin/products  (full catalog incl. unpublished)
router.get('/products', async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

// @route PUT /api/admin/products/:id  (edit metadata, price, sale, publish)
router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const fields = ['title', 'description', 'author'];
    for (const f of fields) if (req.body[f] !== undefined) product[f] = req.body[f];

    if (req.body.category !== undefined) {
      if (!CATEGORIES.includes(req.body.category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      product.category = req.body.category;
    }
    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (Number.isNaN(price) || price < 0) {
        return res.status(400).json({ message: 'Invalid price' });
      }
      product.price = price;
    }
    if (req.body.isPublished !== undefined) product.isPublished = !!req.body.isPublished;
    if (req.body.previewPages !== undefined) product.previewPages = Math.max(0, parseInt(req.body.previewPages, 10) || 0);

    await product.save();
    res.json({ message: 'Product updated', product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route PUT /api/admin/products/:id/sale  { salePrice, saleEndsAt }
router.put('/products/:id/sale', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { salePrice, saleEndsAt } = req.body;
    const sp = Number(salePrice);
    if (Number.isNaN(sp) || sp < 0 || sp >= product.price) {
      return res.status(400).json({ message: 'Sale price must be 0 or more and below the base price' });
    }
    product.salePrice = sp;
    product.saleEndsAt = saleEndsAt ? new Date(saleEndsAt) : null;
    await product.save();
    res.json({ message: 'Sale set', product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route DELETE /api/admin/products/:id/sale  (end a sale)
router.delete('/products/:id/sale', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  product.salePrice = null;
  product.saleEndsAt = null;
  await product.save();
  res.json({ message: 'Sale removed', product });
});

// @route DELETE /api/admin/products/:id  (also removes Cloudinary files)
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('+pdfPublicId coverImage');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await destroyResource(product.pdfPublicId, 'raw', 'authenticated');
    // Cover public_id can be derived only if stored; best-effort skip if absent.
    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/admin/orders
router.get('/orders', async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'name email')
    .populate('products.product', 'title')
    .sort({ createdAt: -1 })
    .limit(500);
  res.json(orders);
});

// @route GET /api/admin/users
router.get('/users', async (req, res) => {
  const users = await User.find()
    .select('-password -verificationToken -resetPasswordToken')
    .sort({ createdAt: -1 })
    .limit(500);
  res.json(users);
});

// @route GET /api/admin/stats  (dashboard summary)
router.get('/stats', async (req, res) => {
  const [bookCount, userCount, revenueAgg, orderCount] = await Promise.all([
    Product.countDocuments(),
    User.countDocuments(),
    Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Order.countDocuments({ status: 'completed' })
  ]);
  res.json({
    books: bookCount,
    users: userCount,
    completedOrders: orderCount,
    revenue: revenueAgg[0]?.total || 0
  });
});

module.exports = router;
