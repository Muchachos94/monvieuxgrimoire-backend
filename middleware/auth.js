const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
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
    return res.status(401).json({ message: 'Token invalide' });
  }
};
