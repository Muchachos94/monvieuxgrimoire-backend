const multer = require('multer');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const original = file.originalname || 'image';
    const extFromMime = MIME_TYPES[file.mimetype];
    const extFromName = path.extname(original).toLowerCase().replace('.', '');
    const ext = extFromMime || extFromName || 'jpg';

    const base = path
      .basename(original, path.extname(original))
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/gi, '') || 'image';

    cb(null, `${base}-${Date.now()}.${ext}`);
  },
});


const fileFilter = (req, file, cb) => {
  const ok = /^image\/(jpe?g|png)$/i.test(file.mimetype);
  cb(ok ? null : new Error('Only JPG/JPEG/PNG allowed'), ok);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
}).single('image');