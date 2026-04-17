const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, permit } = require('../middleware/auth');
const dotenv = require('dotenv');
dotenv.config();

// login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'Invalid username or password' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid username or password' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      name: user.name,
      assignedDivision: user.assignedDivision || null
    }
  });
});

// create user (only admin)
router.post('/create-user', auth, permit('admin', 'super_admin'), async (req, res) => {
  const { username, password, role, name, assignedDivision } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  if (role === 'sqm' && !assignedDivision) {
    return res.status(400).json({ error: 'Assigned division is required for SQM user.' });
  }
  if (!['super_admin', 'admin', 'sqm', 'spb', 'lab'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  if (req.user.role !== 'super_admin' && role === 'super_admin') {
    return res.status(403).json({ error: 'Only super admin can create another super admin.' });
  }
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  try {
    const u = new User({
      username,
      passwordHash: hash,
      role,
      name,
      assignedDivision: role === 'sqm' ? assignedDivision : null
    });
    await u.save();
    res.json({ message: 'User created', userId: u._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
