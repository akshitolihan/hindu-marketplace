const mongoose = require('mongoose');

// A standalone note, optionally attached to a highlighted quote.
const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    page: { type: Number, required: true, min: 1 },
    text: { type: String, required: true },
    quote: { type: String, default: '' },
    color: { type: String, default: 'yellow' },
    chapterTitle: { type: String, default: '' }
  },
  { timestamps: true }
);

noteSchema.index({ user: 1, product: 1, page: 1 });

module.exports = mongoose.model('Note', noteSchema);
