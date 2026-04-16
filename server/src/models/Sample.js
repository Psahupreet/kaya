const mongoose = require('mongoose');

const sampleSchema = new mongoose.Schema({
  // One submission can have only one sample assignment.
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', unique: true, index: true },
  sampleCode: { type: String, unique: true, index: true },
  spbId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  labAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Thickness can be ranges or multiple values (e.g. "100-120 mm", "100,120 MM")
  thickness: String,
  numberOfCores: Number,
  strength: String,
  // Diameter often includes unit (e.g. "150MM")
  diameter: String,
  status: { type: String, enum: ['assigned','in-lab','reported'], default: 'assigned' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sample', sampleSchema);