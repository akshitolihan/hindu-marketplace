const express = require('express');
const cloudinary = require('../config/cloudinary');
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

// Coerce an assessment map into a small, well-formed object: at most 20 keys,
// each a short string key mapped to a number 1-5. Guards the Mixed field from
// being used to store arbitrary/oversized JSON.
function cleanScoreMap(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out = {};
  for (const k of Object.keys(v).slice(0, 20)) {
    const n = Number(v[k]);
    if (Number.isFinite(n)) out[String(k).slice(0, 40)] = Math.min(5, Math.max(1, Math.round(n)));
  }
  return out;
}

// Upsert. Body: { scores?, answers?, completedLessons? } — any subset.
router.put('/progress', auth, async (req, res) => {
  try {
    const update = {};
    if (req.body.scores !== undefined) update.scores = cleanScoreMap(req.body.scores);
    if (req.body.answers !== undefined) update.answers = cleanScoreMap(req.body.answers);
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

// Admin: get a signed payload for a DIRECT browser → Cloudinary video upload.
// Large course videos must not be proxied through the (free-tier) server —
// the browser uploads straight to Cloudinary, then saves the resulting URL via
// the PUT route below.
router.get('/admin/video-signature/:lessonId', adminAuth, (req, res) => {
  try {
    const { lessonId } = req.params;
    if (!LESSON_IDS.has(lessonId)) return res.status(404).json({ message: 'Unknown lesson' });
    if (!process.env.CLOUDINARY_API_SECRET) return res.status(500).json({ message: 'Uploads not configured' });

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'hindu-marketplace/reawaken-videos';
    const public_id = `lesson-${lessonId}-${timestamp}`;
    // Signature must cover exactly the params the browser will send (besides
    // file / api_key / resource_type).
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder, public_id },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      publicId: public_id,
      signature
    });
  } catch (e) {
    console.error('video-signature error:', e.message);
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
