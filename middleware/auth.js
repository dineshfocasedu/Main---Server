// middleware/auth.js
import jwt from "jsonwebtoken"
import User from "../models/User.js"

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};

// Verify JWT + require isAdmin
const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (!user.isAdmin) return res.status(403).json({ error: 'Admin access required' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export { auth, adminAuth, generateToken }