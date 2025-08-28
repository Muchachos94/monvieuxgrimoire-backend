// Importation du framework Express, qui permet de gérer les requêtes HTTP facilement
const express = require('express');
// Création d'un routeur Express, qui va permettre de définir des routes spécifiques pour les utilisateurs
const router = express.Router();
// Importation du contrôleur utilisateur, qui contient la logique métier pour les actions liées aux utilisateurs
const userCtrl = require('../controllers/user');

// Route POST pour l'inscription d'un nouvel utilisateur
// Elle utilise la méthode signup du contrôleur utilisateur pour traiter la requête
router.post('/signup', userCtrl.signup);

// Route POST pour la connexion d'un utilisateur existant
// Elle utilise la méthode login du contrôleur utilisateur pour vérifier les informations d'identification
router.post('/login', userCtrl.login);

// Export du routeur pour pouvoir l'utiliser dans d'autres parties de l'application (par exemple dans app.js)
module.exports = router;