const express = require('express');
const User = require('../models/User');
const ReadingProgress = require('../models/ReadingProgress');
const Bookmark = require('../models/Bookmark');
const auth = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;
