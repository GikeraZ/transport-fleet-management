const pool = require('../../db');
const { auditLog } = require('../middleware');

exports.list = async (req, res) => {
  try {
    const { status, vehicle_id, mechanic_id, task_type, date_from, date_to, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT mt.id, mt.vehicle_id, mt.mechanic_id, mt.task_type, mt.description,
             mt.scheduled_date, mt.start_date, mt.completion_date, mt.status,
             mt.parts_used, mt.labor_hours, mt.cost, mt.created_at, mt.created_by,
             v.license_plate as vehicle_license_plate,
             CONCAT(u.first_name, ' ', u.last_name) as mechanic_name
      FROM maintenance_tasks mt
      LEFT JOIN vehicles v ON mt.vehicle_id = v.id
      LEFT JOIN users u ON mt.mechanic_id = u.id
      WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (status) { query += ` AND mt.status = $${paramIndex}`; values.push(status); paramIndex++; }
    if (vehicle_id) { query += ` AND mt.vehicle_id = $${paramIndex}`; values.push(vehicle_id); paramIndex++; }
    if (mechanic_id) { query += ` AND mt.mechanic_id = $${paramIndex}`; values.push(mechanic_id); paramIndex++; }
    if (task_type) { query += ` AND mt.task_type = $${paramIndex}`; values.push(task_type); paramIndex++; }
    if (date_from) { query += ` AND mt.scheduled_date >= $${paramIndex}`; values.push(date_from); paramIndex++; }
    if (date_to) { query += ` AND mt.scheduled_date <= $${paramIndex}`; values.push(date_to); paramIndex++; }
    if (search) {
      const s = `%${search}%`;
      query += ` AND (mt.description ILIKE $${paramIndex} OR mt.task_type ILIKE $${paramIndex + 1})`;
      values.push(s, s);
      paramIndex += 2;
    }

    const countResult = await pool.query(query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM'), values);
    const total = parseInt(countResult.rows[0].count, 10);
    query += ` ORDER BY mt.scheduled_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows, pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get maintenance tasks error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mt.*, v.license_plate as vehicle_license_plate, CONCAT(u.first_name, ' ', u.last_name) as mechanic_name
       FROM maintenance_tasks mt
       LEFT JOIN vehicles v ON mt.vehicle_id = v.id
       LEFT JOIN users u ON mt.mechanic_id = u.id
       WHERE mt.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get maintenance task error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { vehicle_id, mechanic_id, task_type, description, scheduled_date } = req.body;
    if (!vehicle_id || !mechanic_id || !task_type || !scheduled_date) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO maintenance_tasks (vehicle_id, mechanic_id, task_type, description, scheduled_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [vehicle_id, mechanic_id, task_type, description || '', scheduled_date, req.user.userId]
    );

    await pool.query(
      `INSERT INTO notifications (recipient_id, title, message, type, related_entity_type, related_entity_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [mechanic_id, 'Maintenance Task Assigned', `New task: ${task_type} scheduled on ${scheduled_date}`, 'maintenance_reminder', 'maintenance_task', result.rows[0].id]
    ).catch(e => console.error('Notification insert error:', e));

    await auditLog('maintenance_tasks', result.rows[0].id, 'INSERT', req.user.userId, req.body);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create maintenance task error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['vehicle_id', 'mechanic_id', 'task_type', 'description', 'scheduled_date', 'start_date', 'completion_date', 'status', 'parts_used', 'labor_hours', 'cost'];
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

    const result = await pool.query(`UPDATE maintenance_tasks SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Task not found' });

    if (changes.status === 'completed' && result.rows[0].mechanic_id) {
      await pool.query(
        `INSERT INTO notifications (recipient_id, title, message, type, related_entity_type, related_entity_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [result.rows[0].mechanic_id, 'Task Completed', `Maintenance task ${result.rows[0].task_type} has been completed.`, 'task_update', 'maintenance_task', id]
      ).catch(e => console.error('Notification error:', e));
    }

    await auditLog('maintenance_tasks', id, 'UPDATE', req.user.userId, changes);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update maintenance task error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM maintenance_tasks WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Task not found' });
    await auditLog('maintenance_tasks', req.params.id, 'DELETE', req.user.userId, { id: req.params.id });
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Delete maintenance task error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.vehicleHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mt.*, CONCAT(u.first_name, ' ', u.last_name) as mechanic_name
       FROM maintenance_tasks mt
       LEFT JOIN users u ON mt.mechanic_id = u.id
       WHERE mt.vehicle_id = $1
       ORDER BY mt.scheduled_date DESC`,
      [req.params.vehicleId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get maintenance history error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
