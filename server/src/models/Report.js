const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  sample: { type: mongoose.Schema.Types.ObjectId, ref: 'Sample' },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportFile: String, // path
  remarks: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);