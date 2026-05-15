require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';

class AuthService {
  // Hash password
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  // Verify password
  static async verifyPassword(password, hashedPassword) {
    if (!hashedPassword) return false;
    return bcrypt.compare(password, hashedPassword);
  }

  // Generate access token
  static generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role_name || user.role || 'client',
        firstName: user.first_name,
        lastName: user.last_name,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );
  }

  // Generate refresh token
  static generateRefreshToken(user) {
    return jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRE }
    );
  }

  // Generate password reset token
  static generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Verify token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Check if email exists
  static async findUserByEmail(email) {
    const result = await pool.query(
      `SELECT u.*, COALESCE(r.name, 'client') as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  // Check if username exists
  static async findUserByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  // Create new user
  static async createUser(userData) {
    const { username, email, password_hash, first_name, last_name, phone, role_id } = userData;
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, first_name, last_name, phone, role_id, is_active, avatar_url, created_at`,
      [username, email, password_hash, first_name, last_name, phone || null, role_id || null]
    );
    return result.rows[0];
  }

  // Store password reset token
  static async storeResetToken(userId, token, expiresAt) {
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
  }

  // Validate password reset token
  static async validateResetToken(token) {
    const result = await pool.query(
      `SELECT prt.*, u.email, u.first_name, u.last_name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()`,
      [token]
    );
    return result.rows[0] || null;
  }

  // Mark reset token as used
  static async markResetTokenUsed(token) {
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [token]);
  }

  // Create user session
  static async createSession(userId, refreshToken, ipAddress, userAgent, deviceInfo, expiresAt) {
    const result = await pool.query(
      `INSERT INTO sessions (user_id, refresh_token, ip_address, user_agent, device_info, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, refreshToken, ipAddress, userAgent, deviceInfo, expiresAt]
    );
    return result.rows[0];
  }

  // Log user activity
  static async logActivity(userId, action, entityType, entityId, description, ipAddress, userAgent, metadata) {
    try {
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, action, entityType, entityId, description, ipAddress, userAgent, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error('Activity log error:', error);
    }
  }

  // Get user permissions based on role
  static async getUserPermissions(roleName) {
    const result = await pool.query(
      `SELECT p.name, p.module
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN roles r ON rp.role_id = r.id
       WHERE r.name = $1`,
      [roleName]
    );
    return result.rows;
  }

  // Get all users with pagination
  static async getUsers(page = 1, limit = 20, search = '', role = '') {
    const offset = (page - 1) * limit;
    let query = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
             u.is_active, u.is_verified, u.avatar_url, u.created_at,
             COALESCE(r.name, 'client') as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }
    if (role) {
      query += ` AND r.name = $${paramIndex}`;
      values.push(role);
      paramIndex++;
    }

    const countResult = await pool.query(query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM'), values);
    const total = parseInt(countResult.rows[0].count, 10);

    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, values);
    return { users: result.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Get user by ID
  static async getUserById(userId) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
              u.is_active, u.is_verified, u.avatar_url, u.created_at,
              r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  // Update user
  static async updateUser(userId, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['first_name', 'last_name', 'phone', 'avatar_url', 'is_active', 'role_id'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) return null;

    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  // Delete user
  static async deleteUser(userId) {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);
    return result.rows[0];
  }
}

module.exports = AuthService;