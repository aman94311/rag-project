const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_session_token_key_12345');

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = { protect };
