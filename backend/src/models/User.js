const { hashPassword, verifyPassword, generateToken } = require('../utils/auth');
const pool = require('../../db');

class UserModel {
  constructor() {
    this.table = 'users';
  }

  async findByEmail(email) {
    const result = await pool.query(
      'SELECT u.*, COALESCE(r.name, \'client\') as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  async findByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await pool.query(
      'SELECT u.*, COALESCE(r.name, \'client\') as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const { username, email, password, first_name, last_name, phone, role_id } = data;
    const password_hash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, first_name, last_name, phone, is_active, is_verified, role_id, avatar_url, created_at`,
      [username || email.split('@')[0], email, password_hash, first_name, last_name, phone || null, role_id || null]
    );
    return result.rows[0];
  }

  async verifyPassword(password, hashedPassword) {
    return verifyPassword(password, hashedPassword);
  }

  async generateToken(userId, role) {
    return generateToken(userId, role);
  }

  async update(id, data) {
    const allowedFields = ['first_name', 'last_name', 'phone', 'password_hash', 'avatar_url', 'is_active', 'is_verified', 'role_id'];
    const filtered = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        filtered[key] = data[key];
      }
    }
    if (Object.keys(filtered).length === 0) return null;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(filtered)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async getAll(page = 1, limit = 20, search = '', role = '', is_active = undefined) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
             u.is_active, u.is_verified, u.avatar_url, u.created_at,
             COALESCE(r.name, 'client') as role_name, r.id as role_id
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
    if (is_active !== undefined) {
      query += ` AND u.is_active = $${paramIndex}`;
      values.push(is_active === 'true' || is_active === true);
      paramIndex++;
    }

    const countResult = await pool.query(
      query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM'),
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, values);

    return { users: result.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async delete(id) {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [id]);
    return result.rows[0];
  }
}

module.exports = new UserModel();