const mongoose = require('mongoose');

// One document per user: their Life Compass assessment (scores + raw answers)
// and which lesson IDs they've completed. Lets the roadmap follow a user across
// devices instead of living only in that browser's localStorage.
const reawakenProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    scores: { type: mongoose.Schema.Types.Mixed, default: null },
    answers: { type: mongoose.Schema.Types.Mixed, default: null },
    completedLessons: { type: [String], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReawakenProgress', reawakenProgressSchema);
