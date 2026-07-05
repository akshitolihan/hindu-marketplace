const mongoose = require('mongoose');

// One document per Reawaken lesson that the admin has attached a video to.
// lessonId matches the IDs in data/reawakenCatalog.js (e.g. 'a1', 'r2').
const reawakenLessonSchema = new mongoose.Schema(
  {
    lessonId: { type: String, required: true, unique: true },
    videoUrl: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReawakenLesson', reawakenLessonSchema);
