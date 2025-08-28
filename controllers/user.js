const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Inscription d'un nouvel utilisateur.
 */
exports.signup = (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
    }

    bcrypt.hash(password, 10)
      .then((hash) => User.create({ email, password: hash }))
      .then(() => res.status(201).json({ message: 'Utilisateur créé !' }))
      .catch((error) => {
        // Email déjà utilisé (index unique)
        if (error && (error.code === 11000 || error.codeName === 'DuplicateKey')) {
          return res.status(409).json({ message: 'Email déjà utilisé.' });
        }
        return res.status(400).json({ message: error.message || 'Erreur lors de la création de l’utilisateur.' });
      });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Erreur serveur.' });
  }
};

/**
 * Connexion d'un utilisateur existant.
 */
exports.login = (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
    }

    User.findOne({ email })
      .then((user) => {
        if (!user) {
          return res.status(401).json({ message: 'Identifiants invalides.' });
        }
        return bcrypt.compare(password, user.password).then((valid) => ({ user, valid }));
      })
      .then((ctx) => {
        if (!ctx) return; // déjà répondu
        const { user, valid } = ctx;
        if (!valid) {
          return res.status(401).json({ message: 'Identifiants invalides.' });
        }
        if (!JWT_SECRET) {
          return res.status(500).json({ message: 'Configuration serveur invalide (JWT_SECRET manquant).' });
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
        return res.status(200).json({ userId: user._id, token });
      })
      .catch((error) => {
        return res.status(500).json({ message: error.message || 'Erreur serveur.' });
      });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Erreur serveur.' });
  }
};