const pool = require('../../db');
const bcrypt = require('bcryptjs');
const { auditLog } = require('../middleware');

exports.list = async (req, res) => {
  try {
    const { available, search, specialization, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT m.id, m.specialization, m.certification_level, m.hire_date, m.is_available,
             u.first_name, u.last_name, u.email, u.phone, u.is_active
      FROM mechanics m JOIN users u ON m.id = u.id WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (available !== undefined) { query += ` AND m.is_available = $${paramIndex}`; values.push(available === 'true'); paramIndex++; }
    if (specialization) { query += ` AND m.specialization = $${paramIndex}`; values.push(specialization); paramIndex++; }
    if (search) {
      const s = `%${search}%`;
      query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR m.specialization ILIKE $${paramIndex})`;
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
    console.error('Get mechanics error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.first_name, u.last_name, u.email, u.phone, u.is_active FROM mechanics m JOIN users u ON m.id = u.id WHERE m.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Mechanic not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get mechanic error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, specialization, certification_level, hire_date, is_available, password } = req.body;
    if (!first_name || !last_name || !email || !specialization) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password || 'mechanic123', salt);
    const username = email.split('@')[0] + '_' + Date.now();

    const userResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, (SELECT id FROM roles WHERE name = 'mechanic')) RETURNING id`,
      [username, email, password_hash, first_name, last_name, phone || null]
    );
    const userId = userResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO mechanics (id, specialization, certification_level, hire_date, is_available) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, specialization, certification_level || null, hire_date || null, is_available !== undefined ? is_available : true]
    );
    await auditLog('mechanics', userId, 'INSERT', req.user.userId, req.body);
    res.status(201).json({ success: true, data: { ...result.rows[0], user_id: userId } });
  } catch (err) {
    console.error('Create mechanic error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { specialization, certification_level, hire_date, is_available, first_name, last_name, phone, email } = req.body;

    const mechFields = [];
    const mechValues = [id];
    let paramIndex = 2;
    const changes = {};

    if (specialization !== undefined) { mechFields.push(`specialization = $${paramIndex}`); mechValues.push(specialization); changes.specialization = specialization; paramIndex++; }
    if (certification_level !== undefined) { mechFields.push(`certification_level = $${paramIndex}`); mechValues.push(certification_level); changes.certification_level = certification_level; paramIndex++; }
    if (hire_date !== undefined) { mechFields.push(`hire_date = $${paramIndex}`); mechValues.push(hire_date); changes.hire_date = hire_date; paramIndex++; }
    if (is_available !== undefined) { mechFields.push(`is_available = $${paramIndex}`); mechValues.push(is_available); changes.is_available = is_available; paramIndex++; }

    if (mechFields.length > 0) {
      mechFields.push('updated_at = NOW()');
      const mechResult = await pool.query(`UPDATE mechanics SET ${mechFields.join(', ')} WHERE id = $1 RETURNING *`, mechValues);
      if (!mechResult.rows.length) return res.status(404).json({ success: false, error: 'Mechanic not found' });
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
      `SELECT m.*, u.first_name, u.last_name, u.email, u.phone, u.is_active FROM mechanics m JOIN users u ON m.id = u.id WHERE m.id = $1`,
      [id]
    );
    await auditLog('mechanics', id, 'UPDATE', req.user.userId, changes);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update mechanic error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM mechanics WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Mechanic not found' });
    await auditLog('mechanics', req.params.id, 'DELETE', req.user.userId, { id: req.params.id });
    res.json({ success: true, message: 'Mechanic deleted successfully' });
  } catch (err) {
    console.error('Delete mechanic error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
