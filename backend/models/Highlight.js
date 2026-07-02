const mongoose = require('mongoose');

// A colored text highlight on a page. Position is stored as normalized rects
// (fractions 0–1 of the page width/height) so it renders correctly at any
// zoom or screen size.
const highlightSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    page: { type: Number, required: true, min: 1 },
    color: { type: String, enum: ['yellow', 'blue', 'green', 'pink', 'purple'], default: 'yellow' },
    text: { type: String, default: '' }, // the highlighted quote
    note: { type: String, default: '' }, // optional note attached to this highlight
    chapterTitle: { type: String, default: '' },
    rects: [
      {
        _id: false,
        x: Number,
        y: Number,
        w: Number,
        h: Number
      }
    ]
  },
  { timestamps: true }
);

highlightSchema.index({ user: 1, product: 1, page: 1 });

module.exports = mongoose.model('Highlight', highlightSchema);
