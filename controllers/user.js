const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

// Helpers simples
const MIN_PASSWORD_LEN = 8;
const normalizeEmail = (e = '') => String(e).trim().toLowerCase();
const isEmail = (e = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/**
 * Inscription d'un nouvel utilisateur.
 * - Vérifie présence/format email + longueur de mot de passe
 * - Normalise l'email (trim + lowercase) pour éviter les doublons "visuels"
 * - Hache le mot de passe avec bcrypt
 * - Gère proprement l'erreur de doublon (code 11000)
 */
exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    const normEmail = normalizeEmail(email);
    if (!normEmail || !password) {
      return res.status(400).json({ code: 'MISSING_FIELDS', message: 'Email et mot de passe sont requis.' });
    }
    if (!isEmail(normEmail)) {
      return res.status(400).json({ code: 'INVALID_EMAIL_FORMAT', message: "Format d'email invalide." });
    }
    if (String(password).length < MIN_PASSWORD_LEN) {
      return res.status(400).json({ code: 'WEAK_PASSWORD', message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LEN} caractères.` });
    }

    const hash = await bcrypt.hash(password, 10);
    await User.create({ email: normEmail, password: hash });
    return res.status(201).json({ message: 'Utilisateur créé !' });
  } catch (error) {
    if (error && (error.code === 11000 || error.codeName === 'DuplicateKey')) {
      return res.status(409).json({ code: 'EMAIL_IN_USE', message: 'Email déjà utilisé.' });
    }
    return res.status(500).json({ code: 'SERVER_ERROR', message: error.message || 'Erreur serveur.' });
  }
};

/**
 * Connexion d'un utilisateur existant.
 * - Normalise l'email
 * - Répond 401 si email inconnu ou mot de passe invalide (sans fuiter la raison exacte)
 * - Signe un JWT (24h) avec JWT_SECRET et renvoie { userId, token }
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    const normEmail = normalizeEmail(email);
    if (!normEmail || !password) {
      return res.status(400).json({ code: 'MISSING_FIELDS', message: 'Email et mot de passe sont requis.' });
    }

    const user = await User.findOne({ email: normEmail });
    if (!user) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Identifiants incorrects.'
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Identifiants incorrects.'
      });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ code: 'CONFIG_ERROR', message: 'Configuration serveur invalide (JWT_SECRET manquant).' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
    return res.status(200).json({ userId: user._id, token });
  } catch (error) {
    return res.status(500).json({ code: 'SERVER_ERROR', message: error.message || 'Erreur serveur.' });
  }
};