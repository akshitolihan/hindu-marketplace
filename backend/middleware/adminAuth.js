const jwt = require('jsonwebtoken');

// Add your email address here for admin access
const ADMIN_EMAILS = ['your_email@gmail.com']; // 👈 Replace with your email

module.exports = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is admin
    if (!ADMIN_EMAILS.includes(decoded.email)) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};