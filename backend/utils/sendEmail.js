const nodemailer = require('nodemailer');

// Lazily build the transporter so the app still boots if email isn't configured.
let transporter = null;
function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  }
  return transporter;
}

// Sends an email as a BEST-EFFORT side effect: it never throws. A missing or
// misconfigured SMTP setup logs a warning instead of failing the request that
// triggered it (signup, password reset, purchase receipt, etc.). Returns
// true on success, false otherwise.
const sendEmail = async (to, subject, html) => {
  const tx = getTransporter();
  if (!tx) {
    console.warn(`✉️  Email skipped (EMAIL_USER/PASS not set). Would send "${subject}" to ${to}`);
    return false;
  }
  try {
    await tx.sendMail({
      from: `"Hindu Wisdom" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    return true;
  } catch (err) {
    console.error(`✉️  Email send failed ("${subject}" -> ${to}): ${err.message}`);
    return false;
  }
};

module.exports = sendEmail;
