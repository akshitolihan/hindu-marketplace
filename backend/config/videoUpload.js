// Video-upload provider abstraction for the Reawaken course.
//
// Both providers do the same thing from the browser's point of view: the admin
// gets a short-lived upload target from us, POSTs the file straight to the
// provider (never through this server), and we save the resulting playback URL.
// This module normalises the two so the route and the frontend don't care which
// one is active.
//
// Which provider is used:
//   VIDEO_PROVIDER=cloudinary | cloudflare  → force that one
//   (unset)                                 → auto: Cloudflare if configured,
//                                             else Cloudinary
// So production can switch to Cloudflare just by configuring it in Render —
// no code change.

const cloudinary = require('./cloudinary');
const cfStream = require('./cloudflareStream');

const FOLDER = 'hindu-marketplace/reawaken-videos';
const CLOUDINARY_MAX_MB = 100; // free-plan single-request video limit

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// Resolve the active provider, honouring VIDEO_PROVIDER, else auto-detecting.
// Returns 'cloudflare' | 'cloudinary' | null (nothing configured).
function selectedProvider() {
  const pref = String(process.env.VIDEO_PROVIDER || '').toLowerCase();
  if (pref === 'cloudflare') return cfStream.isConfigured() ? 'cloudflare' : null;
  if (pref === 'cloudinary') return cloudinaryConfigured() ? 'cloudinary' : null;
  if (cfStream.isConfigured()) return 'cloudflare';
  if (cloudinaryConfigured()) return 'cloudinary';
  return null;
}

// Build a normalised upload target for the browser:
//   { provider, uploadURL, fields, playbackUrl, maxSizeMB }
// - fields: extra multipart fields to send alongside the file (Cloudinary needs
//   its signature; Cloudflare needs none).
// - playbackUrl: known up front for Cloudflare; null for Cloudinary, where the
//   browser reads `secure_url` from the upload response instead.
async function createUploadTarget(lessonId) {
  const provider = selectedProvider();

  if (provider === 'cloudflare') {
    const { uploadURL, uid } = await cfStream.createDirectUpload({ name: `reawaken-${lessonId}` });
    return {
      provider,
      uploadURL,
      fields: {},
      playbackUrl: cfStream.playbackUrl(uid),
      maxSizeMB: cfStream.MAX_UPLOAD_MB
    };
  }

  if (provider === 'cloudinary') {
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `lesson-${lessonId}-${timestamp}`;
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: FOLDER, public_id: publicId },
      process.env.CLOUDINARY_API_SECRET
    );
    return {
      provider,
      uploadURL: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
      fields: {
        api_key: process.env.CLOUDINARY_API_KEY,
        timestamp,
        folder: FOLDER,
        public_id: publicId,
        signature
      },
      playbackUrl: null,
      maxSizeMB: CLOUDINARY_MAX_MB
    };
  }

  return null; // nothing configured
}

module.exports = { createUploadTarget, selectedProvider };
