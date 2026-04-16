const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  seriesNumber: { type: String, unique: true },
  sqmId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  division: String,
  district: String,
  urbanLocalBody: String,
  projectName: String,
  roadType: String,
  photos: [String], // Cloudinary URLs
  status: { type: String, enum: ['submitted','assigned','in-lab','reported'], default: 'submitted' },
  assignedToSPB: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);
