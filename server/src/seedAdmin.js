// creates a default admin user (run once)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await User.findOne({ username: 'admin' });
  if (existing) {
    console.log('Admin already exists');
    process.exit(0);
  }
  const hash = await bcrypt.hash('admin123', 10);
  const u = new User({ username: 'admin', passwordHash: hash, role: 'admin', name: 'Administrator' });
  await u.save();
  console.log('Admin created. username=admin password=admin123');
  process.exit(0);
}
seed().catch(err => {
  console.error(err);
  process.exit(1);
});