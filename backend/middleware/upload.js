const multer = require('multer');

// Keep files in memory; we stream them straight to Cloudinary and never
// write to local disk. Limits and a type whitelist guard against abuse.
const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: (req, file, cb) => {
    // Reject with a client-safe 400 (see the error handler in server.js).
    const reject = (msg) => {
      const e = new Error(msg);
      e.status = 400;
      return cb(e);
    };
    if (file.fieldname === 'pdf') {
      if (file.mimetype !== 'application/pdf') {
        return reject('The book file must be a PDF.');
      }
    } else if (file.fieldname === 'cover') {
      if (!/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) {
        return reject('Cover must be a PNG, JPG or WEBP image.');
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
