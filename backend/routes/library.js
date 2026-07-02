const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const ReadingProgress = require('../models/ReadingProgress');
const auth = require('../middleware/auth');
const { signedPdfUrl } = require('../utils/cloudinaryStorage');

const router = express.Router();

// @route GET /api/library
// The authenticated user's owned books, enriched with reading progress
// (last page, %, status, last-read time) for the library UI. No file refs.
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'purchasedProducts.product',
      select: 'title author coverImage category description'
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const owned = user.purchasedProducts.filter((p) => p.product);
    const progressList = await ReadingProgress.find({
      user: req.user.id,
      product: { $in: owned.map((p) => p.product._id) }
    });
    const progressByProduct = new Map(progressList.map((pr) => [pr.product.toString(), pr]));

    const books = owned.map((p) => {
      const pr = progressByProduct.get(p.product._id.toString());
      return {
        ...p.product.toObject(),
        purchasedAt: p.purchasedAt,
        progress: {
          lastPage: pr?.lastPage || 1,
          totalPages: pr?.totalPages || 0,
          percent: pr?.percent || 0,
          status: pr?.status || 'not_started',
          lastReadAt: pr?.lastReadAt || null
        }
      };
    });

    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/library/:productId/download
// Confirms ownership, then mints a ~5-minute signed Cloudinary URL. The raw
// file URL is never stored on the client or exposed in any public response.
router.get('/:productId/download', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('purchasedProducts');
    const owns = user?.purchasedProducts.some(
      (p) => p.product.toString() === req.params.productId
    );
    if (!owns) {
      return res.status(403).json({ message: 'You do not own this book' });
    }

    // pdfPublicId is select:false, so explicitly request it.
    const product = await Product.findById(req.params.productId).select('+pdfPublicId title');
    if (!product || !product.pdfPublicId) {
      return res.status(404).json({ message: 'Book file not available' });
    }

    const url = signedPdfUrl(product.pdfPublicId, 300);
    res.json({ url, expiresInSeconds: 300, title: product.title });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/library/:productId/file
// Streams the PDF bytes through our own server (ownership-checked) so the
// in-site reader can render it without ever exposing the Cloudinary URL to the
// browser. Same-origin, auth via the Authorization header.
router.get('/:productId/file', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('purchasedProducts');
    const owns = user?.purchasedProducts.some(
      (p) => p.product.toString() === req.params.productId
    );
    if (!owns) return res.status(403).json({ message: 'You do not own this book' });

    const product = await Product.findById(req.params.productId).select('+pdfPublicId title');
    if (!product || !product.pdfPublicId) {
      return res.status(404).json({ message: 'Book file not available' });
    }

    // Fetch the private file from Cloudinary server-side via a short-lived
    // signed URL, then relay the bytes to the client.
    const signed = signedPdfUrl(product.pdfPublicId, 120);
    const upstream = await fetch(signed);
    if (!upstream.ok) {
      return res.status(502).json({ message: 'Could not retrieve the book file' });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const safeName = (product.title || 'book').replace(/[^\w\-]+/g, '_').slice(0, 60);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
