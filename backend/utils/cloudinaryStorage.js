const cloudinary = require('../config/cloudinary');

// Uploads an in-memory buffer to Cloudinary.
// PDFs go in as `type: 'authenticated'` so they are NOT publicly accessible;
// the only way to fetch one is a signed URL we mint per download.
function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function uploadPrivatePdf(buffer, baseName) {
  return uploadBuffer(buffer, {
    resource_type: 'raw',
    type: 'authenticated',
    folder: 'hindu-marketplace/books',
    public_id: `${baseName}-${Date.now()}`,
    format: 'pdf'
  });
}

async function uploadPublicCover(buffer, baseName) {
  return uploadBuffer(buffer, {
    resource_type: 'image',
    type: 'upload',
    folder: 'hindu-marketplace/covers',
    public_id: `${baseName}-${Date.now()}`,
    transformation: [{ width: 600, height: 800, crop: 'limit' }]
  });
}

// Mint a signed, expiring URL for a private PDF. Default lifetime: 5 minutes.
function signedPdfUrl(publicId, ttlSeconds = 300) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  return cloudinary.utils.private_download_url(publicId, 'pdf', {
    resource_type: 'raw',
    type: 'authenticated',
    expires_at: expiresAt
  });
}

async function destroyResource(publicId, resourceType, type) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: type,
      invalidate: true
    });
  } catch (err) {
    console.error('Cloudinary delete failed for', publicId, err.message);
  }
}

module.exports = {
  uploadPrivatePdf,
  uploadPublicCover,
  signedPdfUrl,
  destroyResource
};
