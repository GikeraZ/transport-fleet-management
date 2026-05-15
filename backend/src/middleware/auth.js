require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Verify JWT token and attach user to request
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
};

// Optional token verification (for refresh endpoints)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // Token invalid or expired, continue without user
    }
  }
  next();
};

// Check if user has required role(s)
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Please login.' });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

// Check specific permissions
const hasPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    try {
      const result = await pool.query(
        `SELECT p.name FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN roles r ON rp.role_id = r.id
         WHERE r.name = $1 AND p.name = $2`,
        [req.user.role, permission]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  };
};

// Validate request body
const validateBody = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const body = req.body;

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (rules.type && typeof value !== rules.type) {
          errors.push({ field, message: `${field} must be of type ${rules.type}` });
        }
        if (rules.minLength && String(value).length < rules.minLength) {
          errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
        }
        if (rules.maxLength && String(value).length > rules.maxLength) {
          errors.push({ field, message: `${field} must be no more than ${rules.maxLength} characters` });
        }
        if (rules.pattern && !rules.pattern.test(String(value))) {
          errors.push({ field, message: `${field} format is invalid` });
        }
        if (rules.min !== undefined && Number(value) < rules.min) {
          errors.push({ field, message: `${field} must be at least ${rules.min}` });
        }
        if (rules.max !== undefined && Number(value) > rules.max) {
          errors.push({ field, message: `${field} must be no more than ${rules.max}` });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors.map(e => e.message).join(', '), errors });
    }

    next();
  };
};

// Validate email format
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validate phone format
const isValidPhone = (phone) => {
  return /^[+]?[0-9\s\-\(\)]{7,20}$/.test(phone);
};

// Sanitize input (modifies in-place to preserve all properties, including non-enumerable ones)
const sanitizeInput = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].trim().replace(/<[^>]*>/g, ''); // XSS protection
    }
  }
  return obj;
};

// Rate limiting middleware (simple in-memory)
const rateLimitMap = new Map();

const rateLimit = (options = { windowMs: 60000, max: 100 }) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress;
    const now = Date.now();
    const windowStart = now - options.windowMs;

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, []);
    }

    const requests = rateLimitMap.get(ip).filter((time) => time > windowStart);
    requests.push(now);
    rateLimitMap.set(ip, requests);

    if (requests.length > options.max) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  optionalAuth,
  authorize,
  hasPermission,
  validateBody,
  isValidEmail,
  isValidPhone,
  sanitizeInput,
  rateLimit,
};