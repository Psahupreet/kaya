require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
const Submission = require('../models/Submission');

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(value || '');
}

function buildLocalPhotoPath(photoValue) {
  const normalizedValue = String(photoValue || '').replace(/^\/+/, '');
  return path.join(__dirname, '..', normalizedValue);
}

function buildPublicId({ submission, index, filePath }) {
  const parsed = path.parse(filePath);
  const safeSeriesNumber = String(submission.seriesNumber || submission._id)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  const safeName = parsed.name
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `submission-${safeSeriesNumber}-photo-${index + 1}-${safeName || 'image'}`;
}

async function uploadPhoto({ submission, photoValue, index }) {
  const localPath = buildLocalPhotoPath(photoValue);

  if (!fs.existsSync(localPath)) {
    throw new Error(`Local file not found: ${localPath}`);
  }

  const uploadResult = await cloudinary.uploader.upload(localPath, {
    folder: 'kayakalp/submissions/photos',
    resource_type: 'image',
    use_filename: false,
    unique_filename: false,
    overwrite: false,
    public_id: buildPublicId({ submission, index, filePath: localPath })
  });

  return uploadResult.secure_url;
}

async function migrate() {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing MONGO_URI environment variable.');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || 'kayakalp',
    serverSelectionTimeoutMS: 10000,
    family: 4
  });

  const submissions = await Submission.find({
    photos: {
      $elemMatch: {
        $regex: '^/uploads/'
      }
    }
  }).sort({ createdAt: 1 });

  console.log(`Found ${submissions.length} submissions with local photo paths.`);

  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const submission of submissions) {
    try {
      const nextPhotos = [];
      let hasChanges = false;

      for (let index = 0; index < submission.photos.length; index += 1) {
        const photoValue = submission.photos[index];

        if (isRemoteUrl(photoValue)) {
          nextPhotos.push(photoValue);
          continue;
        }

        if (!String(photoValue).startsWith('/uploads/')) {
          nextPhotos.push(photoValue);
          continue;
        }

        const localPath = buildLocalPhotoPath(photoValue);

        if (isDryRun) {
          console.log(`[dry-run] Would upload ${localPath} for submission ${submission.seriesNumber || submission._id}`);
          nextPhotos.push(photoValue);
          continue;
        }

        const secureUrl = await uploadPhoto({ submission, photoValue, index });
        nextPhotos.push(secureUrl);
        hasChanges = true;
        console.log(`Uploaded ${localPath} -> ${secureUrl}`);
      }

      if (isDryRun) {
        skippedCount += 1;
        continue;
      }

      if (!hasChanges) {
        skippedCount += 1;
        continue;
      }

      submission.photos = nextPhotos;
      await submission.save();
      updatedCount += 1;
      console.log(`Updated submission ${submission.seriesNumber || submission._id}`);
    } catch (error) {
      failedCount += 1;
      console.error(`Failed submission ${submission.seriesNumber || submission._id}: ${error.message}`);
    }
  }

  console.log(
    isDryRun
      ? `Dry run complete. Checked ${submissions.length} submissions.`
      : `Migration complete. Updated: ${updatedCount}, skipped: ${skippedCount}, failed: ${failedCount}.`
  );
}

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
