const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');
const sharp = require('sharp');

function computeAverage(ratings) {
  if (!Array.isArray(ratings) || ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + Number(r.grade || 0), 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

function removeOldImage(imageUrl) {
  if (!imageUrl) return;
  const idx = imageUrl.indexOf('/images/');
  if (idx === -1) return;
  const fileName = imageUrl.slice(idx + '/images/'.length);
  const filePath = path.join(__dirname, '..', 'images', fileName);
  fs.unlink(filePath, () => {});
}

async function convertToWebp(inputPath) {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  const outPath = path.join(dir, `${base}.webp`);

  await sharp(inputPath)
    .rotate()
    .resize({
      width: 1200,
      height: 1200,
      fit: 'inside',
      withoutEnlargement: true 
    })
    .webp({
      quality: 80,
      effort: 5
    })
    .toFile(outPath);

  fs.unlink(inputPath, () => {});
  return outPath;
}

exports.createBook = async (req, res, next) => {
  try {
    if (!req.body.book) {
      return res.status(400).json({ message: "Champ 'book' manquant" });
    }
    let bookObject;
    try {
      bookObject = JSON.parse(req.body.book);
    } catch (e) {
      return res.status(400).json({ message: "Le champ 'book' doit être un JSON valide" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image requise (champ 'image')" });
    }

    delete bookObject._id;
    delete bookObject._userId;

  const outPath = await convertToWebp(req.file.path);
  const imageUrl = `${req.protocol}://${req.get('host')}/images/${path.basename(outPath)}`;

  const book = new Book({
    ...bookObject,
    userId: req.auth?.userId || bookObject.userId,
    imageUrl,
    averageRating: 0,
    ratings: []
  });

    book.save()
      .then(() => res.status(201).json({ message: 'Livre enregistré !' }))
      .catch((error) => res.status(400).json({ error }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.modifyBook = async (req, res) => {
  try {
    const existing = await Book.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Livre introuvable' });

    if (req.auth?.userId && existing.userId !== req.auth.userId) {
      return res.status(403).json({ message: 'Interdit: vous n’êtes pas le propriétaire de ce livre' });
    }

    let updates;
    let hasNewImage = false;

    if (req.file) {
      if (!req.body?.book) {
        return res.status(400).json({ message: "Champ 'book' manquant dans le form-data" });
      }
      let parsed;
      try {
        parsed = JSON.parse(req.body.book);
      } catch {
        return res.status(400).json({ message: "Le champ 'book' doit être un JSON valide" });
      }
      const outPath = await convertToWebp(req.file.path);
      updates = {
        ...parsed,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${path.basename(outPath)}`
      };
      hasNewImage = true;
    } 
    else {
      updates = { ...req.body };
    }

    delete updates._id;
    delete updates._userId;
    delete updates.userId;

    const updated = await Book.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Livre introuvable' });

    if (hasNewImage && existing.imageUrl && typeof removeOldImage === 'function') {
      try { removeOldImage(existing.imageUrl); } catch (_) {}
    }

    return res.status(200).json({ message: 'Livre modifié !', book: updated });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Conflit: doublon de clé unique', fields: Object.keys(err.keyPattern || {}) });
    }
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const doc = await Book.findById(req.params.id);

    if (!doc) return res.status(404).json({ message: 'Livre introuvable' });
    if (req.auth?.userId && doc.userId !== req.auth.userId) {
      return res.status(403).json({ message: 'Interdit' });
    }

    await Book.deleteOne({ _id: req.params.id });

    try {
      if (typeof removeOldImage === 'function') {
        removeOldImage(doc.imageUrl);
      }
    } catch (_) {
    }

    return res.status(200).json({ message: 'Livre supprimé !' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => res.status(200).json(book))
    .catch((error) => res.status(404).json({ error }));
};

exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
};


exports.rateBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const userIdFromAuth = req.auth?.userId;
    const userIdFromBody = req.body?.userId;
    const userId = userIdFromAuth || userIdFromBody;

    if (!userId) return res.status(401).json({ message: 'Authentification requise' });
    if (userIdFromAuth && userIdFromBody && userIdFromAuth !== userIdFromBody) {
      return res.status(400).json({ message: 'userId du body différent du token' });
    }

    const rating = Number(req.body?.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return res.status(400).json({ message: 'rating doit être un nombre entre 0 et 5' });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });

    const already = book.ratings.find(r => r.userId === userId);
    if (already) {
      return res.status(409).json({ message: 'Vous avez déjà noté ce livre' });
    }

    book.ratings.push({ userId, grade: rating });
    book.averageRating = computeAverage(book.ratings);

    const saved = await book.save();
    return res.status(200).json(saved);
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
};

exports.getBestRating = async (req, res) => {
  try {
    const items = await Book
      .find({ averageRating: { $ne: null } }) // ignore les livres sans note
      .sort({ averageRating: -1, createdAt: -1 })
      .limit(3)
      .lean();
    return res.status(200).json(items);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
