const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_MIME_TYPES = ['application/pdf'];

function sanitizeName(value, fallback) {
  return (value || fallback)
    .toString()
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80) || fallback;
}

function buildStorage({ folder, allowedFormats, resourceType = 'image', publicIdPrefix }) {
  return new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const originalName = sanitizeName(
        path.parse(file.originalname).name,
        publicIdPrefix
      );

      return {
        folder,
        resource_type: resourceType,
        allowed_formats: allowedFormats,
        public_id: `${publicIdPrefix}-${Date.now()}-${originalName}`
      };
    }
  });
}

function buildFileFilter(allowedMimeTypes, label) {
  return (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `${label} has an invalid file type.`));
  };
}

function buildUploader({
  folder,
  allowedFormats,
  allowedMimeTypes,
  maxFileSize,
  maxFiles,
  resourceType,
  publicIdPrefix,
  label
}) {
  return multer({
    storage: buildStorage({ folder, allowedFormats, resourceType, publicIdPrefix }),
    fileFilter: buildFileFilter(allowedMimeTypes, label),
    limits: {
      fileSize: maxFileSize,
      files: maxFiles
    }
  });
}

const photoUpload = buildUploader({
  folder: 'kayakalp/submissions/photos',
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  allowedMimeTypes: IMAGE_MIME_TYPES,
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 6,
  resourceType: 'image',
  publicIdPrefix: 'submission-photo',
  label: 'Photo'
});

const reportUpload = buildUploader({
  folder: 'kayakalp/lab/reports',
  allowedFormats: ['pdf'],
  allowedMimeTypes: DOCUMENT_MIME_TYPES,
  maxFileSize: 10 * 1024 * 1024,
  maxFiles: 1,
  resourceType: 'raw',
  publicIdPrefix: 'lab-report',
  label: 'Report'
});

function handleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) {
        return next();
      }

      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({ error: 'Uploaded file is too large.' });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({ error: 'Too many files uploaded.' });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({ error: err.field || 'Invalid file upload.' });
          default:
            return res.status(400).json({ error: 'File upload failed.' });
        }
      }

      return next(err);
    });
  };
}

module.exports = {
  photoUpload,
  reportUpload,
  handleUpload
};
