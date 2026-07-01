const { validationResult } = require('express-validator');

// Runs after a chain of express-validator checks and returns 400 with the
// first error per field if anything failed.
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};
