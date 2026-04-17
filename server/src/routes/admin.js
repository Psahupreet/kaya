const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { auth, permit } = require('../middleware/auth');
const User = require('../models/User');
const Submission = require('../models/Submission');
const Sample = require('../models/Sample');
const Report = require('../models/Report');
const { photoUpload, handleUpload } = require('../config/upload');
const cloudinary = require('../config/cloudinary');

const ADMIN_ROLES = ['admin', 'super_admin'];

function getCloudinaryPublicId(url) {
  const value = String(url || '').trim();
  if (!value.includes('/upload/')) return null;

  const withoutQuery = value.split('?')[0];
  const [, afterUpload] = withoutQuery.split('/upload/');
  if (!afterUpload) return null;

  const segments = afterUpload.split('/').filter(Boolean);
  if (segments[0] && /^v\d+$/.test(segments[0])) {
    segments.shift();
  }

  if (segments.length === 0) return null;

  const joined = segments.join('/');
  return joined.replace(/\.[^.]+$/, '');
}

async function deleteSubmissionPhotos(photoUrls = []) {
  const publicIds = photoUrls
    .map(getCloudinaryPublicId)
    .filter(Boolean);

  await Promise.allSettled(
    publicIds.map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: 'image' }))
  );
}

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  role: user.role,
  name: user.name,
  assignedDivision: user.assignedDivision || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// admin: dashboard payload in a single request
router.get('/dashboard', auth, permit(...ADMIN_ROLES), async (req, res) => {
  const [users, submissions, samples, reports] = await Promise.all([
    User.find().select('-passwordHash').sort({ role: 1 }),
    Submission.find().populate('sqmId assignedToSPB'),
    Sample.find()
      .populate('submission')
      .populate('spbId', '-passwordHash')
      .populate('labAssigned', '-passwordHash'),
    Report.find()
      .populate({
        path: 'sample',
        populate: { path: 'submission' }
      })
      .populate('labId', '-passwordHash')
  ]);

  res.json({
    overview: {
      users: users.length,
      submissions: submissions.length,
      samples: samples.length,
      reports: reports.length
    },
    users,
    submissions,
    samples,
    reports
  });
});

// admin: overview
router.get('/overview', auth, permit(...ADMIN_ROLES), async (req, res) => {
  const users = await User.countDocuments();
  const submissions = await Submission.countDocuments();
  const samples = await Sample.countDocuments();
  const reports = await Report.countDocuments();
  res.json({ users, submissions, samples, reports });
});

// admin: list all submissions with populated info
router.get('/submissions', auth, permit(...ADMIN_ROLES), async (req, res) => {
  const subs = await Submission.find().populate('sqmId assignedToSPB');
  res.json(subs);
});

// admin: list all samples with populated info
router.get('/samples', auth, permit(...ADMIN_ROLES), async (req, res) => {
  const samples = await Sample.find()
    .populate('submission')
    .populate('spbId', '-passwordHash')
    .populate('labAssigned', '-passwordHash');
  res.json(samples);
});

// admin: list all reports with populated info
router.get('/reports', auth, permit(...ADMIN_ROLES), async (req, res) => {
  const reports = await Report.find()
    .populate({
      path: 'sample',
      populate: { path: 'submission' }
    })
    .populate('labId', '-passwordHash');
  res.json(reports);
});

// admin: list users
router.get('/users', auth, permit(...ADMIN_ROLES), async (req, res) => {
  const users = await User.find().select('-passwordHash').sort({ role: 1 });
  res.json(users);
});

router.put('/users/:id', auth, permit('super_admin'), async (req, res) => {
  const { username, password, role, name, assignedDivision } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (role && !['super_admin', 'admin', 'sqm', 'spb', 'lab'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  if (user.role === 'super_admin' && role && role !== 'super_admin') {
    const totalSuperAdmins = await User.countDocuments({ role: 'super_admin' });
    if (totalSuperAdmins <= 1) {
      return res.status(400).json({ error: 'At least one super admin must remain.' });
    }
  }

  if (username) user.username = String(username).trim();
  if (name !== undefined) user.name = String(name || '').trim();
  if (role) user.role = role;
  user.assignedDivision = user.role === 'sqm' ? assignedDivision || null : null;

  if (user.role === 'sqm' && !user.assignedDivision) {
    return res.status(400).json({ error: 'Assigned division is required for SQM user.' });
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
  }

  await user.save();
  res.json({ message: 'User updated', user: sanitizeUser(user) });
});

router.delete('/users/:id', auth, permit('super_admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ error: 'You cannot delete the logged in super admin.' });
  }

  if (user.role === 'super_admin') {
    const totalSuperAdmins = await User.countDocuments({ role: 'super_admin' });
    if (totalSuperAdmins <= 1) {
      return res.status(400).json({ error: 'At least one super admin must remain.' });
    }
  }

  await user.deleteOne();
  res.json({ message: 'User deleted' });
});

router.put('/submissions/:id', auth, permit('super_admin'), async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  const allowedFields = ['division', 'district', 'urbanLocalBody', 'projectName', 'roadType', 'status', 'seriesNumber'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      submission[field] = req.body[field];
    }
  }

  if (req.body.sqmId !== undefined) submission.sqmId = req.body.sqmId || null;
  if (req.body.assignedToSPB !== undefined) submission.assignedToSPB = req.body.assignedToSPB || null;

  await submission.save();
  const populated = await Submission.findById(submission._id).populate('sqmId assignedToSPB');
  res.json({ message: 'Submission updated', submission: populated });
});

router.put(
  '/submissions/:id/photos',
  auth,
  permit('super_admin'),
  handleUpload(photoUpload.array('photos', 6)),
  async (req, res) => {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one photo.' });
    }

    const previousPhotos = Array.isArray(submission.photos) ? [...submission.photos] : [];
    submission.photos = files.map((file) => file.path);
    await submission.save();
    await deleteSubmissionPhotos(previousPhotos);

    const populated = await Submission.findById(submission._id).populate('sqmId assignedToSPB');
    res.json({ message: 'Submission photos updated', submission: populated });
  }
);

router.delete('/submissions/:id', auth, permit('super_admin'), async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  const sample = await Sample.findOne({ submission: submission._id });
  if (sample) {
    await Report.deleteMany({ sample: sample._id });
    await sample.deleteOne();
  }

  await submission.deleteOne();
  res.json({ message: 'Submission deleted' });
});

router.put('/samples/:id', auth, permit('super_admin'), async (req, res) => {
  const sample = await Sample.findById(req.params.id);
  if (!sample) return res.status(404).json({ error: 'Sample not found' });

  const allowedFields = ['sampleCode', 'thickness', 'numberOfCores', 'strength', 'diameter', 'status'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      sample[field] = req.body[field];
    }
  }

  if (req.body.spbId !== undefined) sample.spbId = req.body.spbId || null;
  if (req.body.labAssigned !== undefined) sample.labAssigned = req.body.labAssigned || null;
  if (req.body.submission !== undefined) sample.submission = req.body.submission || null;

  await sample.save();

  if (sample.submission) {
    const submission = await Submission.findById(sample.submission);
    if (submission && req.body.status) {
      submission.status = req.body.status;
      await submission.save();
    }
  }

  const populated = await Sample.findById(sample._id)
    .populate('submission')
    .populate('spbId', '-passwordHash')
    .populate('labAssigned', '-passwordHash');

  res.json({ message: 'Sample updated', sample: populated });
});

router.delete('/samples/:id', auth, permit('super_admin'), async (req, res) => {
  const sample = await Sample.findById(req.params.id);
  if (!sample) return res.status(404).json({ error: 'Sample not found' });

  await Report.deleteMany({ sample: sample._id });

  if (sample.submission) {
    await Submission.findByIdAndUpdate(sample.submission, {
      status: 'submitted',
      assignedToSPB: null
    });
  }

  await sample.deleteOne();
  res.json({ message: 'Sample deleted' });
});

router.put('/reports/:id', auth, permit('super_admin'), async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  if (req.body.remarks !== undefined) report.remarks = req.body.remarks;
  if (req.body.reportFile !== undefined) report.reportFile = req.body.reportFile;
  if (req.body.labId !== undefined) report.labId = req.body.labId || null;
  if (req.body.sample !== undefined) report.sample = req.body.sample || null;

  await report.save();

  const populated = await Report.findById(report._id)
    .populate({
      path: 'sample',
      populate: { path: 'submission' }
    })
    .populate('labId', '-passwordHash');

  res.json({ message: 'Report updated', report: populated });
});

router.delete('/reports/:id', auth, permit('super_admin'), async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  const sample = report.sample ? await Sample.findById(report.sample) : null;
  if (sample) {
    sample.status = 'assigned';
    await sample.save();
    if (sample.submission) {
      await Submission.findByIdAndUpdate(sample.submission, { status: 'assigned' });
    }
  }

  await report.deleteOne();
  res.json({ message: 'Report deleted' });
});

module.exports = router;
