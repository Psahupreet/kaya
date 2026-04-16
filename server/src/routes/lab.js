const express = require('express');
const router = express.Router();
const { auth, permit } = require('../middleware/auth');
const Sample = require('../models/Sample');
const Report = require('../models/Report');
const multer = require('multer');
const path = require('path');
const uniqid = require('uniqid');

// multer for reports
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads', 'reports'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + uniqid() + ext);
  }
});
const upload = multer({ storage });

// lab: list samples assigned to them
router.get('/my-samples', auth, permit('lab'), async (req, res) => {
  const samples = await Sample.find({ labAssigned: req.user._id }).populate('submission spbId');
  res.json(samples);
});

// upload test report for a sample
router.post('/upload-report', auth, permit('lab'), upload.single('report'), async (req, res) => {
  const { sampleId, remarks } = req.body;
  const file = req.file;
  const sample = await Sample.findById(sampleId);
  if (!sample) return res.status(404).json({ error: 'Sample not found' });
  if (String(sample.labAssigned) !== String(req.user._id)) return res.status(403).json({ error: 'Not assigned to this lab' });

  const report = new Report({
    sample: sampleId,
    labId: req.user._id,
    reportFile: `/uploads/reports/${file.filename}`,
    remarks
  });
  await report.save();

  sample.status = 'reported';
  await sample.save();

  const Submission = require('../models/Submission');
  const submission = await Submission.findById(sample.submission);
  submission.status = 'reported';
  await submission.save();

  res.json({ message: 'Report uploaded', reportId: report._id });
});

// lab: get reports they uploaded
router.get('/reports', auth, permit('lab'), async (req, res) => {
  const reports = await Report.find({ labId: req.user._id }).populate({ path: 'sample', populate: { path: 'submission' }});
  res.json(reports);
});

module.exports = router;