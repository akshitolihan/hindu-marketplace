// One-off script to create or promote an admin account.
// Usage:
//   node scripts/createAdmin.js <email> [name] [password]
// - If the user exists, they are promoted to admin (and verified).
// - If not, a new admin user is created with the given name/password.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

(async () => {
  const [, , email, name, password] = process.argv;
  if (!email) {
    console.error('Usage: node scripts/createAdmin.js <email> [name] [password]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.role = 'admin';
    user.isVerified = true;
    await user.save();
    console.log(`✅ Promoted existing user ${email} to admin.`);
  } else {
    if (!password) {
      console.error('New admin needs a password: node scripts/createAdmin.js <email> <name> <password>');
      process.exit(1);
    }
    user = await User.create({
      name: name || 'Admin',
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 12),
      role: 'admin',
      isVerified: true
    });
    console.log(`✅ Created new admin ${email}.`);
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
