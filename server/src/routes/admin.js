const express = require('express');
const router = express.Router();
const { auth, permit } = require('../middleware/auth');
const User = require('../models/User');
const Submission = require('../models/Submission');
const Sample = require('../models/Sample');
const Report = require('../models/Report');

// admin: overview
router.get('/overview', auth, permit('admin'), async (req, res) => {
  const users = await User.countDocuments();
  const submissions = await Submission.countDocuments();
  const samples = await Sample.countDocuments();
  const reports = await Report.countDocuments();
  res.json({ users, submissions, samples, reports });
});

// admin: list all submissions with populated info
router.get('/submissions', auth, permit('admin'), async (req, res) => {
  const subs = await Submission.find().populate('sqmId assignedToSPB');
  res.json(subs);
});

// admin: list all samples with populated info
router.get('/samples', auth, permit('admin'), async (req, res) => {
  const samples = await Sample.find()
    .populate('submission')
    .populate('spbId', '-passwordHash')
    .populate('labAssigned', '-passwordHash');
  res.json(samples);
});

// admin: list all reports with populated info
router.get('/reports', auth, permit('admin'), async (req, res) => {
  const reports = await Report.find()
    .populate({
      path: 'sample',
      populate: { path: 'submission' }
    })
    .populate('labId', '-passwordHash');
  res.json(reports);
});

// admin: list users
router.get('/users', auth, permit('admin'), async (req, res) => {
  const users = await User.find().select('-passwordHash').sort({ role: 1 });
  res.json(users);
});

module.exports = router;