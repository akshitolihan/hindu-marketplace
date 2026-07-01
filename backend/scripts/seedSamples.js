// Seeds a handful of SAMPLE books so the storefront grid can be previewed with
// premium, consistent covers. These use generated SVG covers and placeholder
// file references (no real PDF) — they're for visual preview only and can be
// deleted anytime from Admin → Manage Books.
//
//   node scripts/seedSamples.js         (add samples)
//   node scripts/seedSamples.js --clean (remove previously seeded samples)
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const wrap = (text, max) => {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) {
      lines.push(line.trim());
      line = w;
    } else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line.trim());
  return lines.slice(0, 3);
};

// Build a tasteful SVG cover as a data URI (portrait 3:4).
const cover = (title, author, c1, c2) => {
  const lines = wrap(title, 13);
  const startY = 430 - (lines.length - 1) * 34;
  const titleSvg = lines
    .map((l, i) => `<text x='300' y='${startY + i * 68}' font-family='Georgia, serif' font-size='54' fill='#FBF3E0' text-anchor='middle'>${l}</text>`)
    .join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/>
      </linearGradient>
    </defs>
    <rect width='600' height='800' fill='url(#g)'/>
    <rect x='30' y='30' width='540' height='740' fill='none' stroke='#E4C97E' stroke-opacity='0.55' stroke-width='2'/>
    <circle cx='300' cy='170' r='62' fill='none' stroke='#E4C97E' stroke-opacity='0.5' stroke-width='1.5'/>
    <text x='300' y='192' font-family='Georgia, serif' font-size='64' fill='#E4C97E' text-anchor='middle'>&#2384;</text>
    ${titleSvg}
    <line x1='230' y1='650' x2='370' y2='650' stroke='#E4C97E' stroke-opacity='0.6' stroke-width='1.5'/>
    <text x='300' y='700' font-family='Georgia, serif' font-size='28' fill='#F3E9D2' fill-opacity='0.9' text-anchor='middle' font-style='italic'>${author}</text>
  </svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
};

const M = '#6b1e2e', MD = '#4c1320', IND = '#243b6b', TEAL = '#155e63', PLUM = '#4a1d4e', OCH = '#8a4b1e';

const SAMPLES = [
  { title: 'The Bhagavad Gita', author: 'OSHO', category: 'Gita', price: 199, salePrice: 129, c: [M, MD] },
  { title: 'Isha & Kena Upanishads', author: 'OSHO', category: 'Upanishads', price: 149, c: [IND, MD] },
  { title: 'Rig Veda: Sacred Hymns', author: 'Traditional', category: 'Vedas', price: 249, c: [OCH, MD] },
  { title: 'Vishnu Purana', author: 'Traditional', category: 'Puranas', price: 179, salePrice: 139, c: [TEAL, MD] },
  { title: 'The Book of Secrets', author: 'OSHO', category: 'OSHO', price: 299, c: [PLUM, MD] },
  { title: 'Patanjali Yoga Sutras', author: 'OSHO', category: 'Others', price: 159, c: [M, IND] },
  { title: 'Katha Upanishad', author: 'OSHO', category: 'Upanishads', price: 129, c: [MD, M] },
  { title: 'Shiva Purana', author: 'Traditional', category: 'Puranas', price: 209, c: [IND, PLUM] }
];

const SAMPLE_TAG = '[sample]';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  if (process.argv.includes('--clean')) {
    const r = await Product.deleteMany({ pdfPublicId: SAMPLE_TAG });
    console.log(`🧹 Removed ${r.deletedCount} sample books.`);
    await mongoose.disconnect();
    return;
  }

  // Avoid duplicates on re-run.
  await Product.deleteMany({ pdfPublicId: SAMPLE_TAG });

  const docs = SAMPLES.map((s) => ({
    title: s.title,
    author: s.author,
    category: s.category,
    description: `${s.title} — a sample listing to preview the storefront. Replace with a real upload from the admin panel. This edition presents the timeless teachings with clarity and depth for the modern seeker.`,
    price: s.price,
    salePrice: s.salePrice || null,
    coverImage: cover(s.title, s.author, s.c[0], s.c[1]),
    pdfUrl: SAMPLE_TAG,
    pdfPublicId: SAMPLE_TAG,
    isPublished: true
  }));

  await Product.insertMany(docs);
  console.log(`✅ Seeded ${docs.length} sample books with generated covers.`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
