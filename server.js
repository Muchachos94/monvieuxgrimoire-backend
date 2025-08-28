// Import du module HTTP natif de Node.js
// Il permet de créer un serveur HTTP basique
const http = require('http');

// Import de l'application Express (fichier app.js)
// qui contient toute la logique de ton API
const app = require('./app');

// Fonction qui "normalise" le port en le transformant
// en nombre, ou en validant qu'il est correct
const normalizePort = val => {
  const port = parseInt(val, 10);

  // Si ce n’est pas un nombre, on retourne la valeur telle quelle (ex: un nom de pipe)
  if (isNaN(port)) {
    return val;
  }
  // Si le port est valide (>= 0), on le retourne
  if (port >= 0) {
    return port;
  }
  // Sinon, on retourne false (port non valide)
  return false;
};

// On récupère le port défini dans les variables d’environnement (process.env.PORT)
// ou on utilise par défaut 4000 si rien n’est défini
const port = normalizePort(process.env.PORT || '4000');

// On indique à Express sur quel port il doit tourner
app.set('port', port);

// Gestion des erreurs spécifiques liées au serveur (ex: port occupé, privilèges)
const errorHandler = error => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  const address = server.address();
  const bind = typeof address === 'string' ? 'pipe ' + address : 'port: ' + port;
  switch (error.code) {
    case 'EACCES': // Droits insuffisants
      console.error(bind + ' nécessite des privilèges élevés.');
      process.exit(1);
      break;
    case 'EADDRINUSE': // Port déjà utilisé
      console.error(bind + ' est déjà utilisé.');
      process.exit(1);
      break;
    default:
      throw error;
  }
};

// Création du serveur HTTP qui utilise l’application Express
const server = http.createServer(app);

// Gestionnaire d’événement en cas d’erreur du serveur
server.on('error', errorHandler);

// Gestionnaire d’événement quand le serveur démarre correctement
server.on('listening', () => {
  const address = server.address();
  const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + port;
  console.log('✅ Serveur en écoute sur ' + bind);
});

// Lancement du serveur et écoute sur le port défini
server.listen(port);