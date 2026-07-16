import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

// Turn an admin-entered URL (YouTube / Vimeo / Cloudflare Stream / direct file)
// into a Vidstack source so every provider plays through the SAME custom skin.
function toSource(url) {
  if (!url) return null;

  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `youtube/${yt[1]}`;

  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `vimeo/${vm[1]}`;

  // Cloudflare Stream: play the HLS manifest with our own controls instead of
  // Cloudflare's iframe player. Works from the iframe/customer/videodelivery form.
  const cf = url.match(/(?:iframe\.cloudflarestream\.com|customer-[\w]+\.cloudflarestream\.com|videodelivery\.net)\/([\w-]+)/);
  if (cf) return { src: `https://videodelivery.net/${cf[1]}/manifest/video.m3u8`, type: 'application/x-mpegurl' };

  if (/\.m3u8(\?|$)/i.test(url)) return { src: url, type: 'application/x-mpegurl' };

  return url; // direct .mp4/.webm (incl. Cloudinary) — Vidstack detects the type
}

// A premium, provider-agnostic lesson player (speed, quality, captions, PiP,
// fullscreen, keyboard). Gold accent to match the brand.
export default function LessonPlayer({ title, src, onEnded }) {
  const source = toSource(src);
  if (!source) return null;
  return (
    <MediaPlayer
      key={src}
      className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-contain"
      title={title}
      src={source}
      playsInline
      onEnded={onEnded}
      style={{ '--media-brand': '#e6b64d', '--video-brand': '#e6b64d', height: '100%', width: '100%' }}
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
