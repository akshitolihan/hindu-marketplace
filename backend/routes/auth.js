const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL?.split(',')[0].trim() || 'http://localhost:5173';
// Only force verification when explicitly enabled AND email is actually configured.
const REQUIRE_VERIFICATION =
  process.env.REQUIRE_EMAIL_VERIFICATION === 'true' &&
  !!process.env.EMAIL_USER &&
  !!process.env.EMAIL_PASS;

const generateToken = (user) =>
  jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// A throwaway hash to compare against when an email isn't found, so login
// response time doesn't reveal whether an account exists (user enumeration).
const DUMMY_HASH = bcrypt.hashSync('unused-placeholder-for-timing', 12);

async function sendVerificationEmail(user) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.verificationToken = hashToken(rawToken);
  user.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  const link = `${CLIENT_URL}/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
  await sendEmail(
    user.email,
    'Verify your Hindu Wisdom account',
    `<h2>Welcome, ${user.name} 🙏</h2>
     <p>Please confirm your email to activate your account:</p>
     <p><a href="${link}" style="background:#7b1e1e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Verify Email</a></p>
     <p>This link expires in 24 hours.</p>`
  );
}

// @route POST /api/auth/signup
router.post(
  '/signup',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
    body('email')
      .isEmail()
      .withMessage('A valid email is required')
      // Lowercase only — do NOT strip Gmail dots / sub-addresses, which would
      // silently change the address the user typed.
      .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'An account with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({
        name,
        email,
        password: hashedPassword,
        // If verification isn't required (e.g. no SMTP), auto-verify.
        isVerified: !REQUIRE_VERIFICATION
      });
      await user.save();

      if (REQUIRE_VERIFICATION) {
        await sendVerificationEmail(user);
        return res.status(201).json({
          message: 'Account created. Please check your email to verify your account.',
          requiresVerification: true
        });
      }

      // No verification step — log the user straight in.
      const token = generateToken(user);
      res.status(201).json({
        message: 'Account created successfully.',
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
    body('password').notEmpty()
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      // Generic message + always run a bcrypt compare (against a dummy hash when
      // the user is missing) so timing doesn't reveal whether the email exists.
      const isMatch = await bcrypt.compare(password, user?.password || DUMMY_HASH);
      if (!user || !user.password || !isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      if (REQUIRE_VERIFICATION && !user.isVerified) {
        return res.status(403).json({ message: 'Please verify your email before logging in.' });
      }

      const token = generateToken(user);
      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route POST /api/auth/verify-email  { token, email }
router.post('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body;
    if (!token || !email) return res.status(400).json({ message: 'Invalid verification link' });

    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationToken: hashToken(token),
      verificationTokenExpiry: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: 'Verification link is invalid or expired' });

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    const jwtToken = generateToken(user);
    res.json({
      message: 'Email verified successfully.',
      token: jwtToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/auth/me  — used by the frontend to validate a stored token
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email role isVerified');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/auth/resend-verification  { email }
// Re-sends the verification email. Always returns a generic message so the
// endpoint can't be used to discover which emails are registered.
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase();
    const user = await User.findOne({ email });
    if (user && !user.isVerified && REQUIRE_VERIFICATION) {
      await sendVerificationEmail(user);
    }
    res.json({ message: 'If that account exists and is unverified, a new link has been sent.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/auth/forgot-password  { email }
// Emails a password-reset link. Generic response (no user enumeration).
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false })],
  validate,
  async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (user && user.password) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = hashToken(rawToken);
        user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save();

        const link = `${CLIENT_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
        await sendEmail(
          user.email,
          'Reset your Hindu Wisdom password',
          `<h2>Password reset</h2>
           <p>We received a request to reset your password. This link is valid for 1 hour:</p>
           <p><a href="${link}" style="background:#7b1e1e;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Reset Password</a></p>
           <p>If you didn't request this, you can safely ignore this email.</p>`
        );
      }
      res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route POST /api/auth/reset-password  { token, email, password }
router.post(
  '/reset-password',
  authLimiter,
  [
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  validate,
  async (req, res) => {
    try {
      const { token, email, password } = req.body;
      if (!token || !email) return res.status(400).json({ message: 'Invalid reset link' });

      const user = await User.findOne({
        email: email.toLowerCase(),
        resetPasswordToken: hashToken(token),
        resetPasswordExpiry: { $gt: Date.now() }
      });
      if (!user) return res.status(400).json({ message: 'Reset link is invalid or expired' });

      user.password = await bcrypt.hash(password, 12);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      // A successful reset also confirms ownership of the inbox.
      user.isVerified = true;
      await user.save();

      const jwtToken = generateToken(user);
      res.json({
        message: 'Password reset successfully.',
        token: jwtToken,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route POST /api/auth/change-password  (auth)  { currentPassword, newPassword }
router.post(
  '/change-password',
  auth,
  [body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')],
  validate,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);
      if (!user || !user.password) return res.status(400).json({ message: 'Cannot change password for this account' });

      const match = await bcrypt.compare(currentPassword || '', user.password);
      if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

      user.password = await bcrypt.hash(newPassword, 12);
      await user.save();
      res.json({ message: 'Password changed successfully.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
