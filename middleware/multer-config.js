const sharp = require('sharp');
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

async function convertToWebp(inputPath) {
  const dir  = path.dirname(inputPath);
  const ext  = path.extname(inputPath).toLowerCase();
  const base = path.basename(inputPath, ext);

  if (ext === '.webp') {
    return inputPath;
  }

  const outPath = path.join(dir, `${base}.webp`);

  await sharp(inputPath)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toFile(outPath);

  if (outPath !== inputPath) fs.unlink(inputPath, () => {});
  return outPath;
}

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
  const ok = /^image\/(jpe?g|png|webp)$/i.test(file.mimetype);
  cb(ok ? null : new Error('Only JPG/JPEG/PNG/WEBP allowed'), ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
}).single('image');


module.exports = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message || 'Upload invalide' });
    }
    if (!req.file) return next();

    try {
      const outPath = await convertToWebp(req.file.path);
      req.file.path = outPath;
      req.file.filename = path.basename(outPath);
      req.file.mimetype = 'image/webp';
      try {
        req.file.size = fs.statSync(outPath).size;
      } catch (_) {}
      return next();
    } catch (e) {
      return res.status(400).json({ message: `Image illisible ou non supportée: ${e.message}` });
    }
  });
};