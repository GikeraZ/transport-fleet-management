const pool = require('../../db');
const { auditLog } = require('../middleware');

exports.list = async (req, res) => {
  try {
    const { status, type, licensePlate, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT id, license_plate, make, model, year, vehicle_type, capacity, status, mileage, last_service_date, next_service_date, created_at FROM vehicles WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (status) { query += ` AND status = $${paramIndex}`; values.push(status); paramIndex++; }
    if (type) { query += ` AND vehicle_type = $${paramIndex}`; values.push(type); paramIndex++; }
    if (licensePlate) { query += ` AND license_plate ILIKE $${paramIndex}`; values.push(`%${licensePlate}%`); paramIndex++; }
    if (search) {
      const s = `%${search}%`;
      query += ` AND (license_plate ILIKE $${paramIndex} OR make ILIKE $${paramIndex} OR model ILIKE $${paramIndex})`;
      values.push(s);
      paramIndex++;
    }

    const countQuery = query.replace(
      'SELECT id, license_plate, make, model, year, vehicle_type, capacity, status, mileage, last_service_date, next_service_date, created_at',
      'SELECT COUNT(*)'
    );
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, values);

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ success: true, data: result.rows, pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get vehicles error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get vehicle error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { license_plate, make, model, year, vehicle_type, capacity, vin } = req.body;
    if (!license_plate || !make || !model || !vehicle_type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const existing = await pool.query('SELECT id FROM vehicles WHERE license_plate = $1', [license_plate]);
    if (existing.rows.length > 0) return res.status(400).json({ success: false, error: 'License plate already exists' });

    const result = await pool.query(
      `INSERT INTO vehicles (license_plate, make, model, year, vehicle_type, capacity, vin) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [license_plate, make, model, year || null, vehicle_type, capacity || null, vin || null]
    );
    await auditLog('vehicles', result.rows[0].id, 'INSERT', req.user.userId, req.body);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create vehicle error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['license_plate', 'make', 'model', 'year', 'vehicle_type', 'capacity', 'status', 'vin', 'mileage', 'last_service_date', 'next_service_date', 'insurance_expiry', 'registration_expiry'];
    const fields = [];
    const values = [id];
    let paramIndex = 2;
    const changes = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(req.body[field]);
        changes[field] = req.body[field];
        paramIndex++;
      }
    }
    if (!fields.length) return res.status(400).json({ success: false, error: 'No fields to update' });
    fields.push('updated_at = NOW()');

    const result = await pool.query(`UPDATE vehicles SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    await auditLog('vehicles', id, 'UPDATE', req.user.userId, changes);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update vehicle error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Vehicle not found' });
    await auditLog('vehicles', req.params.id, 'DELETE', req.user.userId, { id: req.params.id });
    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error('Delete vehicle error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
