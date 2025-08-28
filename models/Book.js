const mongoose = require('mongoose');

// Schéma pour la notation (rating) d'un livre par un utilisateur
// Chaque notation contient l'identifiant de l'utilisateur et sa note (grade)
// L'option _id: false est utilisée pour ne pas créer d'identifiant unique pour chaque sous-document rating
const ratingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, trim: true }, // Identifiant de l'utilisateur qui a noté le livre
    grade: { type: Number, required: true, min: 1, max: 5 }, // Note attribuée, entre 1 et 5
  },
  { _id: false }
);

// Schéma principal pour un livre
const bookSchema = new mongoose.Schema(
  {
    // Identifiant de l'utilisateur qui a ajouté le livre
    userId:   { type: String, required: true, trim: true },

    // Titre du livre, chaîne de caractères obligatoire, sans espaces inutiles
    title:    { type: String, required: true, trim: true },

    // Auteur du livre, chaîne de caractères obligatoire, sans espaces inutiles
    author:   { type: String, required: true, trim: true },

    // URL de l'image représentant le livre, obligatoire et nettoyée des espaces superflus
    imageUrl: { type: String, required: true, trim: true },

    // Année de publication du livre, nombre obligatoire
    year:     { type: Number, required: true } ,

    // Genre littéraire du livre, chaîne de caractères obligatoire, sans espaces inutiles
    genre:    { type: String, required: true, trim: true },

    // Liste des notations données au livre, chaque élément suit ratingSchema
    ratings:       { type: [ratingSchema], default: [] },

    // Note moyenne calculée à partir des différentes notations, entre 1 et 5
    averageRating: { type: Number, min: 1, max: 5 },
  },
  {
    // Ajoute automatiquement les champs createdAt et updatedAt pour chaque document
    timestamps: true
  }
);

// Index utile pour optimiser les requêtes qui cherchent les livres avec la meilleure note moyenne
// Trie d'abord par averageRating décroissant, puis par date de création décroissante
bookSchema.index({ averageRating: -1, createdAt: -1 });

// Export du modèle Mongoose 'Book' basé sur bookSchema
module.exports = mongoose.model('Book', bookSchema);