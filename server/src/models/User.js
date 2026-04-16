const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['admin','sqm','spb','lab'] },
  name: String,
  assignedDivision: { type: String, enum: ['BHOPAL', 'NARMADAPURAM'], default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);