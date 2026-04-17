require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const [, , username, newPassword] = process.argv;

async function main() {
  if (!username || !newPassword) {
    throw new Error('Usage: node src/scripts/resetUserPassword.js <username> <newPassword>');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || 'kayakalp',
    serverSelectionTimeoutMS: 10000,
    family: 4
  });

  const user = await User.findOne({ username });

  if (!user) {
    throw new Error(`User not found: ${username}`);
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  console.log(`Password reset for ${username}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
