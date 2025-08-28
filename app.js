require('dotenv').config();
const express = require('express'); // Importation du framework Express pour créer le serveur web
const mongoose = require('mongoose'); // Importation de Mongoose pour interagir avec MongoDB
const path = require('path'); // Importation du module path pour gérer les chemins de fichiers

const booksRoutes = require('./routes/books'); // Importation des routes liées aux livres
const userRoutes = require('./routes/user'); // Importation des routes liées aux utilisateurs

// Connexion à la base de données MongoDB avec Mongoose
// useNewUrlParser et useUnifiedTopology sont des options pour éviter les warnings de dépréciation
mongoose.connect('mongodb+srv://admin:admin1234@cluster0.i6qnexs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  { useNewUrlParser: true,
   useUnifiedTopology: true })
 // En cas de succès, affichage d'un message dans la console
 .then(() => console.log('Connexion à MongoDB réussie !'))
 // En cas d'échec, affichage d'un message d'erreur dans la console
 .catch(() => console.log('Connexion à MongoDB échouée !'));

const app = express(); // Création de l'application Express

app.use(express.json()); 
// Middleware pour parser les requêtes entrantes au format JSON
app.use(express.urlencoded({ extended: true }));
// Middleware pour parser les données url-encodées (formulaires HTML)

// Middleware pour gérer les erreurs CORS (Cross-Origin Resource Sharing)
// Permet d'autoriser les requêtes provenant d'autres domaines que le serveur
app.use((req, res, next) => {
  // Autorise toutes les origines à accéder à l'API
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Définit les headers autorisés dans les requêtes
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  // Définit les méthodes HTTP autorisées
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  next(); // Passe au middleware suivant
});  

// Utilisation des routes pour gérer les requêtes liées aux livres sous le chemin /api/books
app.use('/api/books', booksRoutes);
// Utilisation des routes pour gérer les requêtes liées aux utilisateurs sous le chemin /api/auth
app.use('/api/auth', userRoutes);
// Middleware pour servir les fichiers statiques (images) depuis le dossier "images"
app.use('/images', express.static(path.join(__dirname, 'images')));

module.exports = app; // Exportation de l'application Express pour l'utiliser dans d'autres fichiers (ex: server.js)