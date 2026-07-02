const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Vedas', 'Upanishads', 'Gita', 'OSHO', 'Puranas', 'Others']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // Optional sale. The effective price is computed server-side (see virtuals)
  // so the client can never dictate what it pays.
  salePrice: {
    type: Number,
    min: 0,
    default: null
  },
  saleEndsAt: {
    type: Date,
    default: null
  },
  // Private Cloudinary references for the ebook file. NEVER sent to clients
  // (select:false keeps them out of normal queries).
  pdfUrl: {
    type: String,
    required: true,
    select: false
  },
  pdfPublicId: {
    type: String,
    required: true,
    select: false
  },
  coverImage: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    default: 'OSHO'
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  // Number of pages non-owners may read for free (0 = no preview).
  previewPages: {
    type: Number,
    default: 0,
    min: 0
  },
  // Per-book reader permissions.
  allowDownload: { type: Boolean, default: false },
  allowHighlights: { type: Boolean, default: true },
  allowNotes: { type: Boolean, default: true },
  allowBookmarks: { type: Boolean, default: true },
  allowCopy: { type: Boolean, default: true },
  // Manual table of contents, used when the PDF has no embedded outline.
  chapters: [
    {
      _id: false,
      title: { type: String, trim: true },
      page: { type: Number, min: 1 }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Catalog browsing filters on isPublished + category and sorts by createdAt.
productSchema.index({ isPublished: 1, category: 1, createdAt: -1 });
// Title search (case-insensitive regex still benefits from a text-ish lookup).
productSchema.index({ title: 1 });

// True when a sale is configured and still active.
productSchema.virtual('onSale').get(function () {
  return (
    this.salePrice != null &&
    this.salePrice < this.price &&
    (!this.saleEndsAt || this.saleEndsAt > new Date())
  );
});

// The price a buyer actually pays right now. Always use this for charging.
productSchema.virtual('effectivePrice').get(function () {
  return this.onSale ? this.salePrice : this.price;
});

module.exports = mongoose.model('Product', productSchema);
