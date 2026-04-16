const express = require('express');
const router = express.Router();
const { auth, permit } = require('../middleware/auth');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Sample = require('../models/Sample');

const SAMPLE_PREFIX = 'EF_REQUEST_';
const SAMPLE_START = 6431;

const getNextSampleCode = async () => {
  const rows = await Sample.find({
    sampleCode: { $regex: `^${SAMPLE_PREFIX}\\d+$` }
  }).select('sampleCode');

  let maxNumber = SAMPLE_START - 1;
  for (const row of rows) {
    const numericPart = Number.parseInt(
      String(row.sampleCode).replace(SAMPLE_PREFIX, ''),
      10
    );
    if (!Number.isNaN(numericPart) && numericPart > maxNumber) {
      maxNumber = numericPart;
    }
  }

  return `${SAMPLE_PREFIX}${Math.max(SAMPLE_START, maxNumber + 1)}`;
};

// SPB: list submissions
router.get('/submissions', auth, permit('spb'), async (req, res) => {
  // Only show fresh submissions to avoid accidental re-assignment.
  const subs = await Submission.find({ status: 'submitted' }).sort({ createdAt: -1 });
  res.json(subs);
});

// SPB: list labs
router.get('/labs', auth, permit('spb'), async (req, res) => {
  const labs = await User.find({ role: 'lab' }).select('_id username name');
  res.json(labs);
});

// SPB: create sample and assign to a lab
router.post('/assign-sample', auth, permit('spb'), async (req, res) => {
  const { submissionId, labId, thickness, numberOfCores, strength, diameter } = req.body;
  const submission = await Submission.findById(submissionId);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  if (submission.status !== 'submitted') {
    return res.status(409).json({ error: 'This submission is already assigned.' });
  }

  const labUser = await User.findOne({ _id: labId, role: 'lab' });
  if (!labUser) return res.status(400).json({ error: 'Please select a valid lab user.' });

  const existingSample = await Sample.findOne({ submission: submissionId });
  if (existingSample) {
    return res.status(409).json({ error: 'Sample already assigned for this submission.' });
  }

  const thicknessStr = (thickness ?? '').toString().trim();
  const diameterStr = (diameter ?? '').toString().trim();
  const strengthStr = (strength ?? '').toString().trim();

  // Accept values like "3", "03", but avoid casting errors if someone types "3 cores"
  const coresNumRaw = (numberOfCores ?? '').toString().trim();
  const coresNum = coresNumRaw === '' ? undefined : Number.parseInt(coresNumRaw, 10);
  if (coresNumRaw !== '' && Number.isNaN(coresNum)) {
    return res.status(400).json({ error: 'Number of cores must be a number (e.g. 3)' });
  }

  let savedSample = null;
  let attempts = 0;
  while (!savedSample && attempts < 5) {
    attempts += 1;
    const sampleCode = await getNextSampleCode();
    const sample = new Sample({
      submission: submissionId,
      sampleCode,
      spbId: req.user._id,
      labAssigned: labId,
      thickness: thicknessStr,
      numberOfCores: coresNum,
      strength: strengthStr,
      diameter: diameterStr,
      status: 'assigned'
    });
    try {
      savedSample = await sample.save();
    } catch (err) {
      // Handle race condition where two requests assign at the same time.
      if (err?.code === 11000) {
        if (String(err.message).includes('submission')) {
          return res.status(409).json({ error: 'Sample already assigned for this submission.' });
        }
        continue;
      }
      throw err;
    }
  }
  if (!savedSample) return res.status(500).json({ error: 'Failed to generate sample ID. Please try again.' });

  submission.status = 'assigned';
  submission.assignedToSPB = req.user._id;
  await submission.save();

  res.json({ message: 'Sample assigned', sampleId: savedSample.sampleCode, sampleObjectId: savedSample._id });
});

// SPB: view samples they created
router.get('/samples', auth, permit('spb'), async (req, res) => {
  const samples = await Sample.find({ spbId: req.user._id }).populate('labAssigned submission');
  res.json(samples);
});

module.exports = router;