const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const header = (req.headers.authorization || '').trim();
    const match = header.match(/^Bearer\s+(.+)$/i);
    const token = match ? match[1] : null;
    if (!token) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'Configuration serveur invalide (JWT_SECRET manquant).' });
    }

    const decoded = jwt.verify(token, secret);
    req.auth = { userId: decoded.userId };
    return next();
  } catch (error) {
    if (error && error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    return res.status(401).json({ message: 'Token invalide' });
  }
};
