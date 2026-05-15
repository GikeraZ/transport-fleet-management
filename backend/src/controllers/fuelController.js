const pool = require('../../db');

exports.list = async (req, res) => {
  try {
    const { vehicle_id, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT f.*, v.license_plate,
             CONCAT(u.first_name, ' ', u.last_name) as driver_name
      FROM fuel_usage f
      LEFT JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN users u ON f.driver_id = u.id
      WHERE 1=1`;
    const values = [];
    let p = 1;

    if (vehicle_id) { query += ` AND f.vehicle_id = $${p}`; values.push(vehicle_id); p++; }
    if (date_from) { query += ` AND f.filled_at >= $${p}`; values.push(date_from); p++; }
    if (date_to) { query += ` AND f.filled_at <= $${p}`; values.push(date_to); p++; }

    const countResult = await pool.query(query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM'), values);
    const total = parseInt(countResult.rows[0].count, 10);

    query += ` ORDER BY f.filled_at DESC LIMIT $${p} OFFSET $${p + 1}`;
    values.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows, pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get fuel usage error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { vehicle_id, driver_id, liters, cost, mileage_at_fill, fuel_type, station_name, notes } = req.body;
    if (!vehicle_id || !liters || !cost) {
      return res.status(400).json({ success: false, error: 'vehicle_id, liters, and cost are required' });
    }

    const result = await pool.query(
      `INSERT INTO fuel_usage (vehicle_id, driver_id, liters, cost, mileage_at_fill, fuel_type, station_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [vehicle_id, driver_id || null, liters, cost, mileage_at_fill || null, fuel_type || 'diesel', station_name || null, notes || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create fuel usage error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.stats = async (req, res) => {
  try {
    const { vehicle_id, date_from, date_to } = req.query;
    let conditions = 'WHERE 1=1';
    const values = [];
    let p = 1;
    if (vehicle_id) { conditions += ` AND vehicle_id = $${p}`; values.push(vehicle_id); p++; }
    if (date_from) { conditions += ` AND filled_at >= $${p}`; values.push(date_from); p++; }
    if (date_to) { conditions += ` AND filled_at <= $${p}`; values.push(date_to); p++; }

    const result = await pool.query(`
      SELECT
        COUNT(*) as total_refills,
        SUM(liters) as total_liters,
        SUM(cost) as total_cost,
        AVG(cost / NULLIF(liters, 0)) as avg_cost_per_liter,
        SUM(cost) FILTER (WHERE fuel_type = 'diesel') as diesel_cost,
        SUM(cost) FILTER (WHERE fuel_type = 'petrol') as petrol_cost
      FROM fuel_usage ${conditions}
    `, values);

    const monthly = await pool.query(`
      SELECT DATE_TRUNC('month', filled_at) as month,
             SUM(liters) as liters,
             SUM(cost) as cost
      FROM fuel_usage ${conditions}
      GROUP BY DATE_TRUNC('month', filled_at)
      ORDER BY month DESC LIMIT 12
    `, values);

    res.json({ success: true, data: { summary: result.rows[0], monthly: monthly.rows } });
  } catch (err) {
    console.error('Fuel stats error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
