// Cloudflare Stream — video hosting for the Reawaken course.
//
// Large course videos are uploaded straight from the admin's browser to
// Cloudflare (a "direct creator upload"), so they never pass through this
// free-tier server. We only ask Cloudflare for a one-time upload URL here,
// using a scoped API token that stays server-side.
//
// Env:
//   CF_ACCOUNT_ID   — Cloudflare account id
//   CF_STREAM_TOKEN — API token with the "Stream:Edit" permission
//
// Playback uses Cloudflare's generic iframe embed
// (https://iframe.cloudflarestream.com/<uid>), which works without knowing the
// account's customer subdomain and plays adaptive HLS in every browser.

const CF_API = 'https://api.cloudflare.com/client/v4';

// Single POST uploads are capped at 200MB by Cloudflare; larger files would
// need the resumable (tus) protocol, which we don't implement yet.
const MAX_UPLOAD_MB = 200;

function isConfigured() {
  return Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_STREAM_TOKEN);
}

function playbackUrl(uid) {
  return `https://iframe.cloudflarestream.com/${uid}`;
}

// Ask Cloudflare for a one-time direct-upload URL. Returns { uploadURL, uid }.
async function createDirectUpload({ name, maxDurationSeconds = 7200 }) {
  const res = await fetch(`${CF_API}/accounts/${process.env.CF_ACCOUNT_ID}/stream/direct_upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CF_STREAM_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs: false, // parity with the current public (YouTube) links
      meta: name ? { name } : undefined
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.result?.uploadURL) {
    const msg = data?.errors?.[0]?.message || `Cloudflare responded ${res.status}`;
    throw new Error(msg);
  }
  return { uploadURL: data.result.uploadURL, uid: data.result.uid };
}

module.exports = { isConfigured, createDirectUpload, playbackUrl, MAX_UPLOAD_MB };
