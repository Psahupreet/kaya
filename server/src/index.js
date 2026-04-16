require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');

const authRoutes = require('./routes/auth');
const sqmRoutes = require('./routes/sqm');
const spbRoutes = require('./routes/spb');
const labRoutes = require('./routes/lab');
const adminRoutes = require('./routes/admin');

const app = express();

// ======================
// 🔐 SECURITY MIDDLEWARE
// ======================
app.use(helmet());
app.disable('x-powered-by');

// ======================
// 🌍 CORS CONFIG
// ======================
function normalizeOrigin(value) {
  if (!value) return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  try {
    return new URL(trimmedValue).origin;
  } catch (error) {
    return trimmedValue.replace(/\/+$/, '');
  }
}

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

const productionFallbackOrigins = [
  'https://incandescent-centaur-2ae88f.netlify.app'
].map((origin) => normalizeOrigin(origin));

const effectiveAllowedOrigins =
  process.env.NODE_ENV === 'production'
    ? Array.from(new Set([...productionFallbackOrigins, ...allowedOrigins]))
    : Array.from(new Set([...defaultDevOrigins, ...productionFallbackOrigins, ...allowedOrigins]));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedRequestOrigin = normalizeOrigin(origin);

      if (effectiveAllowedOrigins.includes(normalizedRequestOrigin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },
    credentials: true
  })
);

// ======================
// 🚦 RATE LIMITING
// ======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api', limiter);

// ======================
// ⚡ PERFORMANCE
// ======================
app.use(compression());

// ======================
// 📜 LOGGING
// ======================
app.use(morgan('combined'));

// ======================
// 📦 BODY PARSER
// ======================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// 📁 STATIC FILES (DEV ONLY)
// ⚠️ Use Cloudinary/S3 in production
// ======================
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// ======================
// 🚀 ROUTES
// ======================
app.use('/api/auth', authRoutes);
app.use('/api/sqm', sqmRoutes);
app.use('/api/spb', spbRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/admin', adminRoutes);

// ======================
// 📊 OPTIONS DATA
// ======================
app.get('/api/options', (req, res) => {
  const options = require('./data/options.json');
  res.json(options);
});

// ======================
// ❤️ HEALTH CHECK
// ======================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// ======================
// ❌ 404 HANDLER
// ======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// ======================
// ❌ GLOBAL ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ======================
// 🗄️ DATABASE CONNECTION
// ======================
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || 'kayakalp',
      serverSelectionTimeoutMS: 10000,
      family: 4
    });

    console.log('✅ MongoDB connected');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // ======================
    // 🔄 GRACEFUL SHUTDOWN
    // ======================
    process.on('SIGINT', async () => {
      console.log('🔴 Shutting down server...');
      await mongoose.connection.close();
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);

    if (err.cause) {
      console.error('Root cause:', err.cause);
    }

    process.exit(1);
  }
}

startServer();
