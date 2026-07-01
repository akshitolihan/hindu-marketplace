const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from environment variables.
// Ebook PDFs are uploaded as private/authenticated resources so their URLs
// cannot be opened without a freshly signed, short-lived link.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

module.exports = cloudinary;
