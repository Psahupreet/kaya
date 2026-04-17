// creates a default super admin user (run once)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await User.findOne({ username: 'superadmin' });
  if (existing) {
    console.log('Super admin already exists');
    process.exit(0);
  }
  const hash = await bcrypt.hash('admin123', 10);
  const u = new User({ username: 'superadmin', passwordHash: hash, role: 'super_admin', name: 'Super Administrator' });
  await u.save();
  console.log('Super admin created. username=superadmin password=admin123');
  process.exit(0);
}
seed().catch(err => {
  console.error(err);
  process.exit(1);
});
