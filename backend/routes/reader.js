const express = require('express');
const { PDFDocument } = require('pdf-lib');
const User = require('../models/User');
const Product = require('../models/Product');
const ReadingProgress = require('../models/ReadingProgress');
const Bookmark = require('../models/Bookmark');
const Highlight = require('../models/Highlight');
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const { signedPdfUrl } = require('../utils/cloudinaryStorage');

const router = express.Router();

const COLORS = ['yellow', 'blue', 'green', 'pink', 'purple'];

async function userOwns(userId, productId) {
  const user = await User.findById(userId).select('purchasedProducts');
  return !!user?.purchasedProducts.some((p) => p.product.toString() === productId);
}

/* ---------------- Access + preview ---------------- */

// Tells the reader whether the user owns the book, and its preview allowance +
// pricing (so a non-owner can read a free preview and see the paywall).
router.get('/:productId/access', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.productId, isPublished: true }).select(
      'title author coverImage price salePrice saleEndsAt previewPages allowDownload allowHighlights allowNotes allowBookmarks allowCopy chapters'
    );
    if (!product) return res.status(404).json({ message: 'Book not found' });
    const owned = await userOwns(req.user.id, req.params.productId);
    res.json({
      owned,
      previewPages: product.previewPages || 0,
      title: product.title,
      author: product.author,
      coverImage: product.coverImage,
      price: product.price,
      salePrice: product.salePrice,
      onSale: product.onSale,
      effectivePrice: product.effectivePrice,
      permissions: {
        download: product.allowDownload,
        highlights: product.allowHighlights,
        notes: product.allowNotes,
        bookmarks: product.allowBookmarks,
        copy: product.allowCopy
      },
      chapters: product.chapters || []
    });
  } catch (e) {
    res.status(404).json({ message: 'Book not found' });
  }
});

// Streams a PDF containing only the first N (previewPages) pages — so a
// non-owner can sample the book without receiving the full file.
router.get('/:productId/preview-file', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).select('+pdfPublicId previewPages title isPublished');
    if (!product || !product.isPublished || !product.previewPages || product.previewPages < 1) {
      return res.status(404).json({ message: 'No preview available for this book' });
    }
    const signed = signedPdfUrl(product.pdfPublicId, 120);
    const upstream = await fetch(signed);
    if (!upstream.ok) return res.status(502).json({ message: 'Could not retrieve the book' });

    const fullBytes = Buffer.from(await upstream.arrayBuffer());
    const srcDoc = await PDFDocument.load(fullBytes, { ignoreEncryption: true });
    const total = srcDoc.getPageCount();
    const n = Math.min(product.previewPages, total);
    const previewDoc = await PDFDocument.create();
    const copied = await previewDoc.copyPages(srcDoc, Array.from({ length: n }, (_, i) => i));
    copied.forEach((p) => previewDoc.addPage(p));
    const out = Buffer.from(await previewDoc.save());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.setHeader('Content-Length', out.length);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(out);
  } catch (e) {
    console.error('preview error:', e.message);
    res.status(500).json({ message: 'Could not build preview' });
  }
});

// Guard: every reader route requires that the user OWNS the book. Attaches
// req.productId for handlers.
async function requireOwnership(req, res, next) {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user.id).select('purchasedProducts');
    const owns = user?.purchasedProducts.some((p) => p.product.toString() === productId);
    if (!owns) return res.status(403).json({ message: 'You do not own this book' });
    req.productId = productId;
    next();
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
}

const computeStatus = (percent) =>
  percent >= 95 ? 'completed' : percent > 0 ? 'in_progress' : 'not_started';

/* ---------------- Reading progress ---------------- */

// GET current progress (returns a default if none saved yet).
router.get('/:productId/progress', auth, requireOwnership, async (req, res) => {
  const progress = await ReadingProgress.findOne({ user: req.user.id, product: req.productId });
  res.json(
    progress || { lastPage: 1, totalPages: 0, percent: 0, status: 'not_started' }
  );
});

// PUT (upsert) progress. Body: { page, totalPages, completed? }
router.put('/:productId/progress', auth, requireOwnership, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.body.page, 10) || 1);
    const totalPages = Math.max(0, parseInt(req.body.totalPages, 10) || 0);
    let percent = totalPages > 0 ? Math.min(100, Math.round((page / totalPages) * 100)) : 0;
    let status = computeStatus(percent);
    // Allow an explicit "mark complete".
    if (req.body.completed === true) {
      percent = 100;
      status = 'completed';
    }

    const progress = await ReadingProgress.findOneAndUpdate(
      { user: req.user.id, product: req.productId },
      { lastPage: page, totalPages, percent, status, lastReadAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(progress);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------- Bookmarks ---------------- */

router.get('/:productId/bookmarks', auth, requireOwnership, async (req, res) => {
  const bookmarks = await Bookmark.find({ user: req.user.id, product: req.productId }).sort({ page: 1 });
  res.json(bookmarks);
});

router.post('/:productId/bookmarks', auth, requireOwnership, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.body.page, 10) || 1);
    // Toggle: if a bookmark already exists on this page, treat as idempotent.
    let bookmark = await Bookmark.findOne({ user: req.user.id, product: req.productId, page });
    if (!bookmark) {
      bookmark = await Bookmark.create({
        user: req.user.id,
        product: req.productId,
        page,
        label: (req.body.label || '').slice(0, 60),
        chapterTitle: req.body.chapterTitle || ''
      });
    } else if (req.body.label !== undefined) {
      bookmark.label = (req.body.label || '').slice(0, 60);
      await bookmark.save();
    }
    res.status(201).json(bookmark);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:productId/bookmarks/:bookmarkId', auth, requireOwnership, async (req, res) => {
  await Bookmark.deleteOne({ _id: req.params.bookmarkId, user: req.user.id, product: req.productId });
  res.json({ message: 'Bookmark removed' });
});

/* ---------------- Highlights ---------------- */

router.get('/:productId/highlights', auth, requireOwnership, async (req, res) => {
  const highlights = await Highlight.find({ user: req.user.id, product: req.productId }).sort({ page: 1, createdAt: 1 });
  res.json(highlights);
});

router.post('/:productId/highlights', auth, requireOwnership, async (req, res) => {
  try {
    const { page, color, text, rects, chapterTitle, note } = req.body;
    if (!page || !Array.isArray(rects) || rects.length === 0) {
      return res.status(400).json({ message: 'Invalid highlight' });
    }
    const highlight = await Highlight.create({
      user: req.user.id,
      product: req.productId,
      page: Math.max(1, parseInt(page, 10)),
      color: COLORS.includes(color) ? color : 'yellow',
      text: (text || '').slice(0, 2000),
      note: (note || '').slice(0, 2000),
      chapterTitle: chapterTitle || '',
      rects: rects.slice(0, 50).map((r) => ({ x: +r.x, y: +r.y, w: +r.w, h: +r.h }))
    });
    res.status(201).json(highlight);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:productId/highlights/:hid', auth, requireOwnership, async (req, res) => {
  const update = {};
  if (req.body.color !== undefined && COLORS.includes(req.body.color)) update.color = req.body.color;
  if (req.body.note !== undefined) update.note = String(req.body.note).slice(0, 2000);
  const highlight = await Highlight.findOneAndUpdate(
    { _id: req.params.hid, user: req.user.id, product: req.productId },
    update,
    { new: true }
  );
  if (!highlight) return res.status(404).json({ message: 'Highlight not found' });
  res.json(highlight);
});

router.delete('/:productId/highlights/:hid', auth, requireOwnership, async (req, res) => {
  await Highlight.deleteOne({ _id: req.params.hid, user: req.user.id, product: req.productId });
  res.json({ message: 'Highlight removed' });
});

/* ---------------- Notes ---------------- */

router.get('/:productId/notes', auth, requireOwnership, async (req, res) => {
  const notes = await Note.find({ user: req.user.id, product: req.productId }).sort({ page: 1, createdAt: 1 });
  res.json(notes);
});

router.post('/:productId/notes', auth, requireOwnership, async (req, res) => {
  try {
    const { page, text, quote, color, chapterTitle } = req.body;
    if (!page || !text || !text.trim()) return res.status(400).json({ message: 'Note text is required' });
    const note = await Note.create({
      user: req.user.id,
      product: req.productId,
      page: Math.max(1, parseInt(page, 10)),
      text: text.slice(0, 5000),
      quote: (quote || '').slice(0, 2000),
      color: COLORS.includes(color) ? color : 'yellow',
      chapterTitle: chapterTitle || ''
    });
    res.status(201).json(note);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:productId/notes/:nid', auth, requireOwnership, async (req, res) => {
  const note = await Note.findOneAndUpdate(
    { _id: req.params.nid, user: req.user.id, product: req.productId },
    { text: String(req.body.text || '').slice(0, 5000) },
    { new: true }
  );
  if (!note) return res.status(404).json({ message: 'Note not found' });
  res.json(note);
});

router.delete('/:productId/notes/:nid', auth, requireOwnership, async (req, res) => {
  await Note.deleteOne({ _id: req.params.nid, user: req.user.id, product: req.productId });
  res.json({ message: 'Note removed' });
});

module.exports = router;
