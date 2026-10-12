const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

/**
 * multer saves uploaded images to server/uploads with a random file name,
 * so users can't overwrite each other's files or guess names.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`),
});

// Rejects anything that isn't an image.
function fileFilter(req, file, cb) {
  if (ALLOWED[file.mimetype]) return cb(null, true);
  cb(new AppError('Only JPG, PNG, WEBP or GIF images are allowed', 400));
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: 6 } });

// Public URL for a saved file, e.g. /uploads/1712-abc.jpg
const fileUrl = (file) => `/uploads/${file.filename}`;

// Deletes files we stored; ignores external URLs and files that are already gone.
function removeUploads(urls = []) {
  for (const url of urls) {
    if (typeof url !== 'string' || !url.startsWith('/uploads/')) continue;
    fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), () => {});
  }
}

module.exports = { upload, fileUrl, removeUploads };
