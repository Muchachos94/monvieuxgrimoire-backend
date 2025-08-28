/**
 * Contrôleurs Books — Mon Vieux Grimoire
 * --------------------------------------
 * Ce fichier contient :
 *  - Helpers de gestion d'images (suppression, conversion WebP)
 *  - Fonctions de contrôleur CRUD pour les livres
 *  - Notation d'un livre + calcul de la moyenne
 *
 * NB:
 *  - Le front envoie les créations/mises à jour avec Multer (form-data):
 *      - champ texte "book" (JSON stringify) + champ fichier "image"
 *    ou bien du JSON pur (pour PUT sans nouvelle image).
 *  - Les images sont servies depuis /images (static) défini dans app.js.
 */

const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');
const sharp = require('sharp');

/**
 * Calcule la note moyenne à partir d'un tableau de ratings.
 * - Arrondit à 1 décimale (ex: 4.3).
 * - Si aucune note, renvoie 0 (conforme à la spec qui initialise à 0).
 * @param {Array<{userId: string, grade: number}>} ratings
 * @returns {number}
 */
function computeAverage(ratings) {
  if (!Array.isArray(ratings) || ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + Number(r.grade || 0), 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

/**
 * Supprime un fichier d'image local associé à un imageUrl absolu.
 * - Extrait le nom de fichier après "/images/"
 * - Construit le chemin local vers /images puis unlink sans bloquer.
 * @param {string} imageUrl
 */
function removeOldImage(imageUrl) {
  if (!imageUrl) return;
  const idx = imageUrl.indexOf('/images/');
  if (idx === -1) return;
  const fileName = imageUrl.slice(idx + '/images/'.length);
  const filePath = path.join(__dirname, '..', 'images', fileName);
  fs.unlink(filePath, () => {}); // suppression best-effort, silencieuse
}

/**
 * Convertit une image uploadée en WebP optimisé et supprime l'original.
 * - Rotation selon EXIF
 * - Redimensionnement pour limiter à 1200px (côté max), sans agrandir
 * - Encodage WebP qualité 80 (compromis) / effort 5
 * @param {string} inputPath Chemin du fichier temporaire Multer
 * @returns {Promise<string>} Chemin de sortie (fichier .webp)
 */
async function convertToWebp(inputPath) {
  const dir  = path.dirname(inputPath);
  const ext  = path.extname(inputPath).toLowerCase();
  const base = path.basename(inputPath, ext);

  if (ext === '.webp') {
    return inputPath; // pas de reconversion/suppression
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

/**
 * POST /api/books
 * Création d'un livre.
 * - Attend form-data: { book: string(JSON), image: file }
 * - Convertit l'image en WebP, construit imageUrl absolu
 * - Initialise ratings = [] et averageRating = 0
 * @status 201 Livre créé
 * @status 400 Données invalides / JSON invalide / image manquante
 * @status 500 Erreur serveur
 */
exports.createBook = async (req, res) => {
  try {
    // --- DEBUG TEMP (à retirer une fois OK) ---
     console.log('[createBook] has file?', !!req.file);
     console.log('[createBook] typeof book:', typeof req.body.book);
     console.log('[createBook] keys:', Object.keys(req.body || {}));

    // 1) Récupère l'objet livre quelle que soit la forme d'envoi
    let bookObject;

    console.log(typeof req.body.book === 'string');
    if (typeof req.body.book === 'string') {
      // format attendu: book = JSON.stringify({...})
      try {
        bookObject = JSON.parse(req.body.book);
        console.log('Parsed bookObject:', bookObject);
      } catch (e) {
        return res.status(400).json({ message: "Le champ 'book' doit être un JSON valide" });
      }
    } else if (req.body.book && typeof req.body.book === 'object') {
      // (rare) si un middleware a déjà parsé le champ
      bookObject = req.body.book;
    } else {
      // fallback: champs à plat dans le form-data
      const { title, author, year, genre, userId } = req.body || {};
      bookObject = { title, author, year: year !== undefined ? Number(year) : year, genre, userId };
    }

    // 2) Vérifie la présence de l'image (champ 'image' pour multer.single('image'))
    if (!req.file) {
      return res.status(400).json({ message: "Image requise (champ 'image')" });
    }

    // 3) Vérifie les champs requis avant d'aller vers Mongoose
    const missing = [];
    if (!bookObject?.title)  missing.push('title');
    if (!bookObject?.author) missing.push('author');
    if (bookObject?.year === undefined || bookObject?.year === null || Number.isNaN(Number(bookObject.year))) missing.push('year');
    if (!bookObject?.genre)  missing.push('genre');
    if (missing.length) {
      return res.status(400).json({ message: `Champs manquants/invalides: ${missing.join(', ')}` });
    }

    // 4) Nettoie les champs protégés
    delete bookObject._id;
    delete bookObject._userId;

  // 5) Convertit l'image en WebP (ou laisse telle quelle si déjà .webp)
  let outPath;
  try {
    outPath = await convertToWebp(req.file.path);
  } catch (e) {
    console.error('[createBook] sharp/convert error:', e); // <-- LOG
    return res.status(400).json({ message: `Image illisible ou non supportée: ${e.message}` });
  }

const imageUrl = `${req.protocol}://${req.get('host')}/images/${path.basename(outPath)}`;


console.log(bookObject);
    // 6) Création
    const book = new Book({
      ...bookObject,
      year: Number(bookObject.year),
      userId: req.auth?.userId || bookObject.userId,
      imageUrl,
      ratings: []
    });
  console.log('[createBook] Final book object to save:', book);

    const result = await book.save();
    console.log(result);
    return res.status(201).json({ message: 'Livre enregistré !' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/books/:id
 * Mise à jour d'un livre.
 * - Deux modes:
 *    a) form-data (book JSON + image) => remplace l'image (convertie en WebP)
 *    b) JSON pur (pas d'image) => met à jour champs texte
 * - Empêche la modification de userId/_id/_userId
 * - Supprime l'ancienne image si une nouvelle est fournie, après succès DB
 * @status 200 Livre modifié
 * @status 400 JSON invalide / validation Mongoose
 * @status 403 Interdit si l'utilisateur n'est pas propriétaire (si check activé)
 * @status 404 Livre introuvable
 * @status 409 Conflit (doublon unique)
 * @status 500 Erreur serveur
 */
exports.modifyBook = async (req, res) => {
  try {
    // 1) Récupérer le doc existant (utile pour l'ancienne image + ownership)
    const existing = await Book.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Livre introuvable' });

    // (Option sécurité) Refus si l'appelant n'est pas propriétaire
    if (req.auth?.userId && existing.userId !== req.auth.userId) {
      return res.status(403).json({ message: 'Interdit: vous n’êtes pas le propriétaire de ce livre' });
    }

    let updates;
    let hasNewImage = false;

    // 2) Construire l'update selon la présence d'un fichier
    if (req.file) {
      // Mode multipart: le JSON est dans req.body.book
      if (!req.body?.book) {
        return res.status(400).json({ message: "Champ 'book' manquant dans le form-data" });
      }
      let parsed;
      try {
        parsed = JSON.parse(req.body.book);
      } catch {
        return res.status(400).json({ message: "Le champ 'book' doit être un JSON valide" });
      }
      // Convertir la nouvelle image en WebP
      const outPath = await convertToWebp(req.file.path);
      updates = {
        ...parsed,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${path.basename(outPath)}`
      };
      hasNewImage = true;
    } else {
      // Mode JSON pur: pas de nouvelle image
      updates = { ...req.body };
    }

    // 3) Sécuriser les champs non modifiables
    delete updates._id;
    delete updates._userId;
    delete updates.userId;

    // 4) Mise à jour avec validations
    const updated = await Book.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Livre introuvable' });

    // 5) Suppression de l'ancienne image si une nouvelle a été fournie (post-update)
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

/**
 * DELETE /api/books/:id
 * Suppression d'un livre + suppression de l'image locale associée.
 * - Supprime d'abord le document en base
 * - Puis tente de supprimer l'image (best-effort)
 * @status 200 Livre supprimé
 * @status 403 Interdit si non propriétaire (si check activé)
 * @status 404 Introuvable
 * @status 500 Erreur serveur
 */
exports.deleteBook = async (req, res) => {
  try {
    const doc = await Book.findById(req.params.id);

    if (!doc) return res.status(404).json({ message: 'Livre introuvable' });
    if (req.auth?.userId && doc.userId !== req.auth.userId) {
      return res.status(403).json({ message: 'Interdit' });
    }

    // 1) Supprimer en base
    await Book.deleteOne({ _id: req.params.id });

    // 2) Supprimer l'image (sans bloquer la réponse)
    try {
      if (typeof removeOldImage === 'function') {
        removeOldImage(doc.imageUrl);
      }
    } catch (_) {}

    return res.status(200).json({ message: 'Livre supprimé !' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/books/:id
 * Retourne un livre par son id.
 * @status 200 Livre
 * @status 404 Introuvable
 */
exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => res.status(200).json(book))
    .catch((error) => res.status(404).json({ error }));
};

/**
 * GET /api/books
 * Liste l'ensemble des livres.
 * @status 200 Tableau de livres
 * @status 400 Erreur requête
 */
exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
};

/**
 * POST /api/books/:id/rating
 * Ajoute une note pour l'utilisateur authentifié (1 seule fois).
 * - Body spec: { userId: String, rating: Number (0..5) }
 * - On lit l'userId depuis le token si présent (et on vérifie la cohérence avec le body)
 * - Met à jour averageRating après ajout
 * @status 200 Livre à jour
 * @status 400 Données invalides
 * @status 401 Non authentifié
 * @status 404 Livre introuvable
 * @status 409 L'utilisateur a déjà noté ce livre
 * @status 500 Erreur serveur
 */
exports.rateBook = async (req, res) => {
  try {
    const bookId = req.params.id;

    // Source de vérité: token (si dispo). On tolère la présence dans le body pour coller à la spec.
    const userIdFromAuth = req.auth?.userId;
    const userIdFromBody = req.body?.userId;
    const userId = userIdFromAuth || userIdFromBody;

    if (!userId) return res.status(401).json({ message: 'Authentification requise' });
    if (userIdFromAuth && userIdFromBody && userIdFromAuth !== userIdFromBody) {
      return res.status(400).json({ message: 'userId du body différent du token' });
    }

    // La spec utilise "rating" (0..5). En base on stocke "grade".
    const rating = Number(req.body?.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return res.status(400).json({ message: 'rating doit être un nombre entre 0 et 5' });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });

    // Interdire plusieurs notations pour le même user
    const already = book.ratings.find(r => r.userId === userId);
    if (already) {
      return res.status(409).json({ message: 'Vous avez déjà noté ce livre' });
    }

    // Ajouter la note et recalculer la moyenne
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

/**
 * GET /api/books/bestrating
 * Renvoie les 3 livres avec la meilleure moyenne (tri décroissant).
 * - Ignore les livres sans note (averageRating null) — tu peux filtrer > 0 si tu veux exclure ceux initialisés à 0.
 * @status 200 Tableau de 3 livres
 * @status 500 Erreur serveur
 */
exports.getBestRating = async (req, res) => {
  try {
    const items = await Book
      .find({ averageRating: { $gt: 0 } }) // ignore les livres sans note
      .sort({ averageRating: -1, createdAt: -1 })
      .limit(3)
      .lean();
    return res.status(200).json(items);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
