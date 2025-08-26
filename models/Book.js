const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, trim: true },
    grade: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
);

const bookSchema = new mongoose.Schema(
  {
    userId:   { type: String, required: true, trim: true },
    title:    { type: String, required: true, trim: true },
    author:   { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    year:     { type: Number, required: true } ,
    genre:    { type: String, required: true, trim: true },

    ratings:       { type: [ratingSchema], default: [] },
    averageRating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

// Index utile pour /bestrating
bookSchema.index({ averageRating: -1, createdAt: -1 });

module.exports = mongoose.model('Book', bookSchema);