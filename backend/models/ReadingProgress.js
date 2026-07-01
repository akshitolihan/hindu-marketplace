const mongoose = require('mongoose');

// One document per (user, product) tracking where a reader left off.
const readingProgressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    lastPage: { type: Number, default: 1, min: 1 },
    totalPages: { type: Number, default: 0 },
    percent: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started'
    },
    lastReadAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

readingProgressSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('ReadingProgress', readingProgressSchema);
