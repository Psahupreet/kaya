const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const { auth, permit } = require('../middleware/auth');
const { photoUpload, handleUpload } = require('../config/upload');

const SERIES_START = 900;

const getNextSeriesNumber = async () => {
  const submissions = await Submission.find({
    seriesNumber: { $regex: '^\\d+$' }
  }).select('seriesNumber');

  let maxSeries = SERIES_START - 1;
  for (const row of submissions) {
    const numericPart = Number.parseInt(String(row.seriesNumber), 10);
    if (!Number.isNaN(numericPart) && numericPart > maxSeries) {
      maxSeries = numericPart;
    }
  }

  return String(Math.max(SERIES_START, maxSeries + 1));
};

// submit form (sqm)
router.post('/submit', auth, permit('sqm'), handleUpload(photoUpload.array('photos', 6)), async (req, res) => {
  const { division, district, urbanLocalBody, projectName, roadType } = req.body;
  if (req.user?.assignedDivision && division !== req.user.assignedDivision) {
    return res.status(403).json({ error: `You can submit only for ${req.user.assignedDivision} division.` });
  }
  const cleanProjectName = (projectName || '').toString().trim();
  if (!cleanProjectName) {
    return res.status(400).json({ error: 'Project name is required.' });
  }
  const files = req.files || [];

  // Retry to avoid duplicate series if two users submit at the same moment.
  let createdSubmission = null;
  let attempts = 0;

  while (!createdSubmission && attempts < 5) {
    attempts += 1;
    const seriesNumber = await getNextSeriesNumber();
    try {
      const submission = new Submission({
        seriesNumber,
        sqmId: req.user._id,
        division,
        district,
        urbanLocalBody,
        projectName: cleanProjectName,
        roadType,
        photos: files.map((file) => file.path)
      });
      createdSubmission = await submission.save();
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }

  if (!createdSubmission) {
    return res.status(500).json({ error: 'Failed to generate series number. Please try again.' });
  }

  res.json({
    message: 'Submitted',
    seriesNumber: createdSubmission.seriesNumber,
    submissionId: createdSubmission._id
  });
});

// SQM can list their submissions
router.get('/my', auth, permit('sqm'), async (req, res) => {
  const subs = await Submission.find({ sqmId: req.user._id }).sort({ createdAt: -1 });
  res.json(subs);
});

module.exports = router;
