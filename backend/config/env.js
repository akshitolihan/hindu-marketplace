// Validates that required environment variables are present at boot.
// Fails fast with a clear message instead of crashing deep inside a request.
const REQUIRED = [
  'MONGODB_URI',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

// Optional but warned about, since features silently degrade without them.
const OPTIONAL = ['RAZORPAY_WEBHOOK_SECRET', 'EMAIL_USER', 'EMAIL_PASS', 'CLIENT_URL'];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('   Copy backend/.env.example to backend/.env and fill these in.');
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET is short. Use a random string of at least 32 characters.');
  }

  const missingOptional = OPTIONAL.filter((key) => !process.env[key]);
  if (missingOptional.length) {
    console.warn('⚠️  Optional env vars not set (some features disabled):', missingOptional.join(', '));
  }
}

module.exports = validateEnv;
