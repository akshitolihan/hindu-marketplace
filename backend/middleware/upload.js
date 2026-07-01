const multer = require('multer');

// Keep files in memory; we stream them straight to Cloudinary and never
// write to local disk. Limits and a type whitelist guard against abuse.
const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pdf') {
      if (file.mimetype !== 'application/pdf') {
        return cb(new Error('The book file must be a PDF.'));
      }
    } else if (file.fieldname === 'cover') {
      if (!/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) {
        return cb(new Error('Cover must be a PNG, JPG or WEBP image.'));
      }
    }
    cb(null, true);
  }
});

// Accept one PDF (private) and one optional cover image (public) per request.
const uploadBookFiles = upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);

module.exports = { uploadBookFiles, MAX_PDF_BYTES };
