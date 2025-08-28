const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Définition du chemin vers le dossier 'images' situé un niveau au-dessus du dossier courant
const IMAGES_DIR = path.join(__dirname, '..', 'images');

// Vérification de l'existence du dossier 'images', création si inexistant
// Cela permet de s'assurer que le dossier de destination pour les fichiers uploadés existe
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Mapping des types MIME acceptés vers leurs extensions de fichier correspondantes
// Cela facilite la gestion des extensions lors de la sauvegarde des fichiers
const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Configuration du stockage des fichiers uploadés via multer
const storage = multer.diskStorage({
  // Destination des fichiers : dossier 'images'
  destination: (req, file, cb) => {
    cb(null, IMAGES_DIR);
  },
  // Logique de génération du nom de fichier sauvegardé
  filename: (req, file, cb) => {
    // Récupération du nom original du fichier, ou 'image' par défaut
    const original = file.originalname || 'image';

    // Détermination de l'extension à utiliser :
    // Priorité à l'extension correspondant au type MIME, sinon extension du nom original, sinon 'jpg' par défaut
    const extFromMime = MIME_TYPES[file.mimetype];
    const extFromName = path.extname(original).toLowerCase().replace('.', '');
    const ext = extFromMime || extFromName || 'jpg';

    // Construction du nom de base du fichier :
    // - suppression de l'extension
    // - conversion en minuscules
    // - remplacement des espaces par des tirets
    // - suppression des caractères non alphanumériques, tirets ou underscores
    // Si le résultat est vide, on utilise 'image' par défaut
    const base = path
      .basename(original, path.extname(original))
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/gi, '') || 'image';

    // Assemblage final du nom de fichier avec un timestamp pour éviter les collisions
    cb(null, `${base}-${Date.now()}.${ext}`);
  },
});

// Filtre des fichiers uploadés pour n'accepter que les images JPG, JPEG et PNG
const fileFilter = (req, file, cb) => {
  // Expression régulière pour vérifier le type MIME autorisé
  const ok = /^image\/(jpe?g|png|webp)$/i.test(file.mimetype);
  // Appel du callback avec une erreur si le type n'est pas autorisé, sinon sans erreur
  cb(ok ? null : new Error('Only JPG/JPEG/PNG/WEBP allowed'), ok);
};

// Exportation de la configuration multer avec stockage, filtre et limites définies
// Limite la taille des fichiers à 20 Mo et n'autorise qu'un seul fichier nommé 'image' par requête
module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
}).single('image');