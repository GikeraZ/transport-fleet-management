const pool = require('../../db');

// Request validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (rules.type && typeof value !== rules.type) {
          errors.push({ field, message: `${field} must be of type ${rules.type}` });
        }

        if (rules.minLength && value.length < rules.minLength) {
          errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push({ field, message: `${field} must be no more than ${rules.maxLength} characters` });
        }

        if (rules.pattern && !rules.pattern.test(value)) {
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
      return res.status(400).json({ success: false, errors });
    }

    next();
  };
};

// Sanitize input
const sanitize = (obj) => {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitized[key].trim();
    }
  }
  return sanitized;
};

// Pagination helper
const getPagination = (page, limit) => {
  const offset = (page - 1) * limit;
  return { limit, offset };
};

// Get paging data
const getPagingData = (data, page, limit) => {
  const totalItems = data.length;
  const currentPage = page ? +page : 1;
  const offset = (currentPage - 1) * limit;
  const items = data.slice(offset, offset + limit);
  const totalPages = Math.ceil(totalItems / limit);

  return { totalItems, items, totalPages, currentPage };
};

module.exports = { validate, sanitize, getPagination, getPagingData };