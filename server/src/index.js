const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const path = require('path');

const authRoutes = require('./routes/auth');
const sqmRoutes = require('./routes/sqm');
const spbRoutes = require('./routes/spb');
const labRoutes = require('./routes/lab');
const adminRoutes = require('./routes/admin');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    }
  })
);
app.use(express.json());
// Uploaded photos are stored under `server/src/uploads/...`
// so expose them here as `/uploads/...`.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/sqm', sqmRoutes);
app.use('/api/spb', spbRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/admin', adminRoutes);

// data file route for dropdowns
app.get('/api/options', (req, res) => {
  const options = require('./data/options.json');
  res.json(options);
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || 'kayakalp',
      serverSelectionTimeoutMS: 10000,
      family: 4
    });

    console.log('Mongo connected');
    app.listen(PORT, () => console.log('Server running on', PORT));
  } catch (err) {
    console.error('Mongo connect error:', err.message);

    if (err.cause) {
      console.error('Mongo root cause:', err.cause);
    }

    console.error(
      'Check your Atlas URI, database name, IP access list, and local network/antivirus SSL inspection settings.'
    );
  }
}

startServer();
