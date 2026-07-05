const express = require('express');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const ReawakenLesson = require('../models/ReawakenLesson');
const ReawakenProgress = require('../models/ReawakenProgress');
const { STAGES, LESSON_IDS } = require('../data/reawakenCatalog');

const router = express.Router();

// Admin-only field, so validation is lenient: any http(s) URL is accepted
// (YouTube / Vimeo / a Cloudinary or direct .mp4 link). Empty clears the video.
function validVideoUrl(u) {
  if (!u) return true;
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/* ---------------- Public course video map ---------------- */

// Returns { videos: { lessonId: url } } for every lesson the admin has filled in.
// The frontend already knows the lesson structure; it only needs the URLs.
router.get('/course', async (req, res) => {
  try {
    const rows = await ReawakenLesson.find({ videoUrl: { $ne: '' } }).select('lessonId videoUrl');
    const videos = {};
    rows.forEach((r) => { videos[r.lessonId] = r.videoUrl; });
    res.json({ videos });
  } catch (e) {
    console.error(e);
    res.json({ videos: {} });
  }
});

/* ---------------- Per-user assessment + progress ---------------- */

router.get('/progress', auth, async (req, res) => {
  try {
    const p = await ReawakenProgress.findOne({ user: req.user.id });
    res.json(p || { scores: null, answers: null, completedLessons: [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upsert. Body: { scores?, answers?, completedLessons? } — any subset.
router.put('/progress', auth, async (req, res) => {
  try {
    const update = {};
    if (req.body.scores !== undefined) update.scores = req.body.scores;
    if (req.body.answers !== undefined) update.answers = req.body.answers;
    if (Array.isArray(req.body.completedLessons)) {
      update.completedLessons = req.body.completedLessons
        .filter((id) => LESSON_IDS.has(id))
        .slice(0, 200);
    }
    const p = await ReawakenProgress.findOneAndUpdate(
      { user: req.user.id },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(p);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------- Admin: manage lesson videos ---------------- */

// The full catalog, each lesson annotated with its current video URL (if any).
router.get('/admin/lessons', adminAuth, async (req, res) => {
  try {
    const rows = await ReawakenLesson.find().select('lessonId videoUrl');
    const map = {};
    rows.forEach((r) => { map[r.lessonId] = r.videoUrl; });
    const stages = STAGES.map((s) => ({
      key: s.key,
      title: s.title,
      lessons: s.lessons.map((l) => ({ ...l, videoUrl: map[l.id] || '' }))
    }));
    res.json({ stages });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set (or clear, with an empty string) the video URL for one lesson.
router.put('/admin/lessons/:lessonId', adminAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    if (!LESSON_IDS.has(lessonId)) return res.status(404).json({ message: 'Unknown lesson' });
    const videoUrl = String(req.body.videoUrl || '').trim();
    if (!validVideoUrl(videoUrl)) {
      return res.status(400).json({ message: 'Enter a valid http(s) video URL, or leave blank to clear.' });
    }
    const row = await ReawakenLesson.findOneAndUpdate(
      { lessonId },
      { videoUrl },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ lessonId: row.lessonId, videoUrl: row.videoUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
