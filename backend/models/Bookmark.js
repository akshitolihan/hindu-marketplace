const mongoose = require('mongoose');

// A user's bookmark on a specific page of a book.
const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    page: { type: Number, required: true, min: 1 },
    label: { type: String, default: '', maxlength: 60, trim: true },
    chapterTitle: { type: String, default: '' }
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, product: 1, page: 1 });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
