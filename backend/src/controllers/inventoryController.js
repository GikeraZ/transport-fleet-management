const pool = require('../../db');
const { auditLog } = require('../middleware');

exports.list = async (req, res) => {
  try {
    const { category, search, low_stock, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM inventory WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (category) { query += ` AND category = $${paramIndex}`; values.push(category); paramIndex++; }
    if (search) {
      const s = `%${search}%`;
      query += ` AND (item_name ILIKE $${paramIndex} OR item_code ILIKE $${paramIndex} OR supplier ILIKE $${paramIndex})`;
      values.push(s, s, s);
      paramIndex += 3;
    }
    if (low_stock === 'true') query += ' AND quantity <= min_threshold';

    const countResult = await pool.query(query.replace('SELECT *', 'SELECT COUNT(*)'), values);
    const total = parseInt(countResult.rows[0].count, 10);
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows, pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get inventory error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get inventory item error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { item_name, item_code, category, quantity, unit, min_threshold, unit_cost, supplier, location } = req.body;
    if (!item_name) return res.status(400).json({ success: false, error: 'Item name is required' });

    const result = await pool.query(
      `INSERT INTO inventory (item_name, item_code, category, quantity, unit, min_threshold, unit_cost, supplier, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [item_name, item_code || null, category || null, quantity || 0, unit || null, min_threshold || 5, unit_cost || 0, supplier || null, location || null]
    );
    await auditLog('inventory', result.rows[0].id, 'INSERT', req.user.userId, req.body);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create inventory item error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['item_name', 'item_code', 'category', 'quantity', 'unit', 'min_threshold', 'unit_cost', 'supplier', 'location'];
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

    const result = await pool.query(`UPDATE inventory SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Item not found' });
    await auditLog('inventory', id, 'UPDATE', req.user.userId, changes);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update inventory item error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Item not found' });
    await auditLog('inventory', req.params.id, 'DELETE', req.user.userId, { id: req.params.id });
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Delete inventory item error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.useItem = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { inventory_item_id, quantity_used } = req.body;
    const maintenance_task_id = req.params.id;

    const result = await client.query(
      `INSERT INTO maintenance_inventory_usage (maintenance_task_id, inventory_item_id, quantity_used) VALUES ($1, $2, $3) RETURNING *`,
      [maintenance_task_id, inventory_item_id, quantity_used]
    );
    await client.query('UPDATE inventory SET quantity = quantity - $1 WHERE id = $2', [quantity_used, inventory_item_id]);
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Record inventory usage error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
};
