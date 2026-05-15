const pool = require('../../db');
const bcrypt = require('bcryptjs');
const { auditLog } = require('../middleware');

exports.list = async (req, res) => {
  try {
    const { available, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT d.id, d.license_number, d.license_type, d.license_expiry,
             d.hire_date, d.is_available, d.emergency_contact_name, d.emergency_contact_phone,
             u.first_name, u.last_name, u.email, u.phone, u.is_active
      FROM drivers d JOIN users u ON d.id = u.id WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (available !== undefined) { query += ` AND d.is_available = $${paramIndex}`; values.push(available === 'true'); paramIndex++; }
    if (search) {
      const s = `%${search}%`;
      query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR d.license_number ILIKE $${paramIndex})`;
      values.push(s, s, s);
      paramIndex += 3;
    }

    const countResult = await pool.query(query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM'), values);
    const total = parseInt(countResult.rows[0].count, 10);
    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows, pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get drivers error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.first_name, u.last_name, u.email, u.phone, u.is_active FROM drivers d JOIN users u ON d.id = u.id WHERE d.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Driver not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get driver error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, license_number, license_type, license_expiry, hire_date, emergency_contact_name, emergency_contact_phone, password } = req.body;
    if (!first_name || !last_name || !email || !license_number) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password || 'driver123', salt);
    const username = email.split('@')[0] + '_' + Date.now();

    const userResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, (SELECT id FROM roles WHERE name = 'driver')) RETURNING id`,
      [username, email, password_hash, first_name, last_name, phone || null]
    );
    const userId = userResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO drivers (id, license_number, license_type, license_expiry, hire_date, emergency_contact_name, emergency_contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, license_number, license_type || 'CDL Class B', license_expiry || null, hire_date || null, emergency_contact_name || null, emergency_contact_phone || null]
    );
    await auditLog('drivers', userId, 'INSERT', req.user.userId, req.body);
    res.status(201).json({ success: true, data: { ...result.rows[0], user_id: userId } });
  } catch (err) {
    console.error('Create driver error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { license_number, license_type, license_expiry, hire_date, emergency_contact_name, emergency_contact_phone, is_available, first_name, last_name, phone, email } = req.body;

    const driverFields = [];
    const driverValues = [id];
    let paramIndex = 2;
    const changes = {};

    if (license_number !== undefined) { driverFields.push(`license_number = $${paramIndex}`); driverValues.push(license_number); changes.license_number = license_number; paramIndex++; }
    if (license_type !== undefined) { driverFields.push(`license_type = $${paramIndex}`); driverValues.push(license_type); changes.license_type = license_type; paramIndex++; }
    if (license_expiry !== undefined) { driverFields.push(`license_expiry = $${paramIndex}`); driverValues.push(license_expiry); changes.license_expiry = license_expiry; paramIndex++; }
    if (hire_date !== undefined) { driverFields.push(`hire_date = $${paramIndex}`); driverValues.push(hire_date); changes.hire_date = hire_date; paramIndex++; }
    if (emergency_contact_name !== undefined) { driverFields.push(`emergency_contact_name = $${paramIndex}`); driverValues.push(emergency_contact_name); changes.emergency_contact_name = emergency_contact_name; paramIndex++; }
    if (emergency_contact_phone !== undefined) { driverFields.push(`emergency_contact_phone = $${paramIndex}`); driverValues.push(emergency_contact_phone); changes.emergency_contact_phone = emergency_contact_phone; paramIndex++; }
    if (is_available !== undefined) { driverFields.push(`is_available = $${paramIndex}`); driverValues.push(is_available); changes.is_available = is_available; paramIndex++; }

    if (driverFields.length > 0) {
      driverFields.push('updated_at = NOW()');
      const drResult = await pool.query(`UPDATE drivers SET ${driverFields.join(', ')} WHERE id = $1 RETURNING *`, driverValues);
      if (!drResult.rows.length) return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    const userFields = [];
    const userValues = [id];
    paramIndex = 2;
    if (first_name !== undefined) { userFields.push(`first_name = $${paramIndex}`); userValues.push(first_name); paramIndex++; }
    if (last_name !== undefined) { userFields.push(`last_name = $${paramIndex}`); userValues.push(last_name); paramIndex++; }
    if (phone !== undefined) { userFields.push(`phone = $${paramIndex}`); userValues.push(phone); paramIndex++; }
    if (email !== undefined) { userFields.push(`email = $${paramIndex}`); userValues.push(email); paramIndex++; }
    if (userFields.length > 0) {
      userFields.push('updated_at = NOW()');
      await pool.query(`UPDATE users SET ${userFields.join(', ')} WHERE id = $1`, userValues);
    }

    const result = await pool.query(
      `SELECT d.*, u.first_name, u.last_name, u.email, u.phone, u.is_active FROM drivers d JOIN users u ON d.id = u.id WHERE d.id = $1`,
      [id]
    );
    await auditLog('drivers', id, 'UPDATE', req.user.userId, changes);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update driver error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM drivers WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Driver not found' });
    await auditLog('drivers', req.params.id, 'DELETE', req.user.userId, { id: req.params.id });
    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (err) {
    console.error('Delete driver error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
