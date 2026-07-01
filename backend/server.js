const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Load and validate environment before anything else.
dotenv.config();
require('./config/env')();

const { apiLimiter } = require('./middleware/rateLimit');

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const libraryRoutes = require('./routes/library');

const app = express();

// Sit behind a proxy (Render/Railway/Nginx) so rate-limit sees real client IPs.
app.set('trust proxy', 1);

// --- Security middleware ---
app.use(helmet());

// CORS: only allow the configured frontend origin(s).
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / server-to-server (no Origin header) and the allowlist.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// The Razorpay webhook must read the RAW body to verify its signature, so it
// is mounted with express.raw BEFORE the global JSON parser.
app.use('/api/orders/webhook', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '1mb' }));

// Throttle the whole API; auth routes get a stricter limiter of their own.
app.use('/api', apiLimiter);

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/library', libraryRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Hindu Marketplace API is running!' });
});

// 404 + centralized error handler (also catches Multer/CORS errors).
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large.' });
  }
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();
