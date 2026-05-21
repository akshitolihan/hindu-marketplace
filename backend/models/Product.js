const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
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
    required: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  coverImage: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    default: 'OSHO'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);