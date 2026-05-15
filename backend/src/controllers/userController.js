const bcrypt = require('bcryptjs');
const pool = require('../../db');
const { auditLog } = require('../middleware');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role: filterRole, is_active } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
             u.is_active, u.is_verified, u.avatar_url, u.created_at,
             COALESCE(r.name, 'client') as role_name, r.id as role_id
      FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (search) { query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`; values.push(`%${search}%`); paramIndex++; }
    if (filterRole) { query += ` AND r.name = $${paramIndex}`; values.push(filterRole); paramIndex++; }
    if (is_active !== undefined) { query += ` AND u.is_active = $${paramIndex}`; values.push(is_active === 'true'); paramIndex++; }

    const countResult = await pool.query(query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM'), values);
    const total = parseInt(countResult.rows[0].count, 10);
    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, values);
    res.json({ success: true, data: { users: result.rows, pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) } } });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.profile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
              u.is_active, u.is_verified, u.avatar_url, u.created_at, u.last_login,
              COALESCE(r.name, 'client') as role_name, r.id as role_id
       FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [req.user.userId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'User not found' });

    const permissions = await pool.query(
      `SELECT p.name, p.module FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN roles r ON rp.role_id = r.id WHERE r.name = $1`,
      [result.rows[0].role_name]
    );
    res.json({ success: true, data: { ...result.rows[0], role: result.rows[0].role_name, permissions: permissions.rows } });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    if (req.params.id !== req.user.userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
              u.is_active, u.is_verified, u.avatar_url, u.created_at,
              COALESCE(r.name, 'client') as role_name, r.id as role_id
       FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, avatar_url, is_active, role_id, email } = req.body;
    if (id !== req.user.userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    const fields = [];
    const values = [];
    let paramIndex = 1;
    const changes = {};

    if (first_name !== undefined) { fields.push(`first_name = $${paramIndex}`); values.push(first_name); changes.first_name = first_name; paramIndex++; }
    if (last_name !== undefined) { fields.push(`last_name = $${paramIndex}`); values.push(last_name); changes.last_name = last_name; paramIndex++; }
    if (email !== undefined && isAdmin) { fields.push(`email = $${paramIndex}`); values.push(email); changes.email = email; paramIndex++; }
    if (phone !== undefined) { fields.push(`phone = $${paramIndex}`); values.push(phone); changes.phone = phone; paramIndex++; }
    if (avatar_url !== undefined) { fields.push(`avatar_url = $${paramIndex}`); values.push(avatar_url); changes.avatar_url = avatar_url; paramIndex++; }
    if (is_active !== undefined && isAdmin) { fields.push(`is_active = $${paramIndex}`); values.push(is_active); changes.is_active = is_active; paramIndex++; }
    if (role_id !== undefined && isAdmin) { fields.push(`role_id = $${paramIndex}`); values.push(role_id); changes.role_id = role_id; paramIndex++; }

    if (!fields.length) return res.status(400).json({ success: false, error: 'No fields to update' });
    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, first_name, last_name, phone, is_active, avatar_url`, values);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'User not found' });

    const updatedUser = result.rows[0];
    const roleResult = await pool.query('SELECT name FROM roles WHERE id = (SELECT role_id FROM users WHERE id = $1)', [id]);
    updatedUser.role_name = roleResult.rows[0]?.name || 'client';

    await auditLog('users', id, 'UPDATE', req.user.userId, changes);
    res.json({ success: true, data: updatedUser });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    if (req.params.id === req.user.userId) return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    await pool.query('UPDATE sessions SET is_active = false WHERE user_id = $1', [req.params.id]);
    await auditLog('users', req.params.id, 'DELETE', req.user.userId, { id: req.params.id });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  const client = await pool.connect();
  try {
    const { username, email, password, first_name, last_name, phone, role_name, is_active } = req.body;
    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'User with this email or username already exists' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    let role_id = null;
    const validRoles = ['admin', 'superadmin', 'driver', 'mechanic', 'farm_client', 'client'];
    if (role_name && validRoles.includes(role_name)) {
      const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [role_name]);
      if (roleResult.rows.length) role_id = roleResult.rows[0].id;
    }

    const result = await client.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, username, email, first_name, last_name, phone, is_active, is_verified, role_id, avatar_url, created_at`,
      [username, email, password_hash, first_name, last_name, phone || null, role_id, is_active !== false]
    );

    const user = result.rows[0];
    const roleResult = await client.query('SELECT name FROM roles WHERE id = $1', [user.role_id]);
    const userRoleName = roleResult.rows.length ? roleResult.rows[0].name : 'client';

    // Auto-create driver/mechanic profile records
    if (userRoleName === 'driver') {
      const licNum = 'TMP-' + user.id.substring(0, 8).toUpperCase();
      await client.query(
        'INSERT INTO drivers (id, license_number, license_type, hire_date, is_available) VALUES ($1,$2,$3,$4,true) ON CONFLICT (id) DO NOTHING',
        [user.id, licNum, 'Pending', new Date().toISOString().split('T')[0]]
      );
    } else if (userRoleName === 'mechanic') {
      await client.query(
        'INSERT INTO mechanics (id, specialization, certification_level, hire_date, is_available) VALUES ($1,$2,$3,$4,true) ON CONFLICT (id) DO NOTHING',
        [user.id, 'General', 'Entry Level', new Date().toISOString().split('T')[0]]
      );
    }

    user.role_name = userRoleName;

    await client.query("INSERT INTO activity_logs (user_id, action, description, table_name) VALUES ($1, 'USER_CREATED', 'Admin created user', 'users')", [req.user.userId]);
    await client.query('COMMIT');

    res.status(201).json({ success: true, data: user, message: 'User created successfully' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Create user error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  } finally {
    client.release();
  }
};

exports.activity = async (req, res) => {
  try {
    if (req.params.id !== req.user.userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

const [logsResult, countResult] = await Promise.all([
       pool.query('SELECT table_name, record_id, action, description, changes, created_at FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [req.params.id, parseInt(limit, 10), offset]),
       pool.query('SELECT COUNT(*) FROM activity_logs WHERE user_id = $1', [req.params.id]),
     ]);
    res.json({ success: true, data: { logs: logsResult.rows, total: parseInt(countResult.rows[0].count, 10) } });
  } catch (err) {
    console.error('Get activity logs error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.permissions = async (req, res) => {
  try {
    if (req.params.id !== req.user.userId && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const result = await pool.query(
      `SELECT p.name, p.module FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN users u ON u.role_id = rp.role_id WHERE u.id = $1`,
      [req.params.id]
    );
    res.json({ success: true, data: { permissions: result.rows } });
  } catch (err) {
    console.error('Get permissions error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
