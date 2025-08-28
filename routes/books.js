// Importation du module Express
const express = require('express');
// Création d'un routeur Express pour gérer les routes liées aux livres
const router = express.Router();
// Importation du modèle Book (non utilisé directement ici mais potentiellement utile)
const Book = require('../models/Book');

// Importation du middleware d'authentification
// Ce middleware vérifie que l'utilisateur est authentifié avant d'autoriser certaines actions (création, modification, suppression, notation)
const auth = require('../middleware/auth');
// Importation du middleware Multer pour la gestion des fichiers (ex : images de couverture de livre)
// Ce middleware permet de traiter les fichiers envoyés lors des requêtes POST/PUT
const multer = require('../middleware/multer-config');

// Importation du contrôleur contenant la logique métier pour chaque route de livre
const booksCtrl = require('../controllers/books');

// ROUTES

// Route GET '/' : Récupérer tous les livres
// Appelle la méthode getAllBooks du contrôleur pour retourner la liste complète des livres
router.get('/', booksCtrl.getAllBooks);

// Route GET '/bestrating' : Récupérer les 3 livres ayant la meilleure note
// Appelle la méthode getBestRating du contrôleur pour retourner les livres les mieux notés
router.get('/bestrating', booksCtrl.getBestRating);

// Route GET '/:id' : Récupérer un livre spécifique par son identifiant
// Appelle la méthode getOneBook du contrôleur pour retourner les détails d'un livre
router.get('/:id', booksCtrl.getOneBook);

// Route POST '/' : Créer un nouveau livre
// Nécessite que l'utilisateur soit authentifié (middleware auth) et gère l'upload d'un fichier (middleware multer)
// Appelle la méthode createBook du contrôleur pour ajouter un nouveau livre à la base de données
router.post('/', auth, multer, booksCtrl.createBook);

// Route PUT '/:id' : Modifier un livre existant
// Nécessite l'authentification (auth) et la gestion de fichiers (multer)
// Appelle la méthode modifyBook du contrôleur pour modifier les informations d'un livre existant
router.put('/:id', auth, multer, booksCtrl.modifyBook);

// Route DELETE '/:id' : Supprimer un livre
// Nécessite l'authentification (auth)
// Appelle la méthode deleteBook du contrôleur pour supprimer un livre de la base de données
router.delete('/:id', auth, booksCtrl.deleteBook);

// Route POST '/:id/rating' : Noter un livre
// Nécessite l'authentification (auth)
// Appelle la méthode rateBook du contrôleur pour ajouter une note à un livre par l'utilisateur
router.post('/:id/rating', auth, booksCtrl.rateBook);

// Exportation du routeur pour l'utiliser dans l'application principale
module.exports = router;