const mongoose = require('mongoose');

// Définition du schéma pour le modèle User
// Ce schéma représente la structure des documents utilisateur dans la base de données MongoDB
const userSchema = new mongoose.Schema({
  // Champ email : de type String, obligatoire (required), unique (aucun doublon autorisé),
  // et trim permet de supprimer les espaces inutiles avant et après la chaîne
  email: { type: String, required: true, unique: true, trim: true },

  // Champ password : de type String, obligatoire (required)
  password: { type: String, required: true },
});

// Export du modèle 'User' basé sur le schéma défini ci-dessus
// Ce modèle pourra être importé et utilisé dans d'autres parties de l'application
module.exports = mongoose.model('User', userSchema);