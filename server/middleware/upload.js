const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { MAX_PHOTOS } = require('../utils/constants');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`),
});

function fileFilter(req, file, cb) {
  if (ALLOWED[file.mimetype]) return cb(null, true);
  cb(new AppError('Only JPG, PNG or WEBP images are allowed', 400));
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: MAX_PHOTOS } });

const fileUrl = (file) => `/uploads/${file.filename}`;

function removeUploads(urls = []) {
  for (const url of urls) {
    if (typeof url !== 'string' || !url.startsWith('/uploads/')) continue;
    fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), () => {});
  }
}

module.exports = { upload, fileUrl, removeUploads };
