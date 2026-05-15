const pool = require('../../db');

exports.farms = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, COUNT(DISTINCT t.id) as total_trips, COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_trips
      FROM farms f LEFT JOIN trips t ON f.id = t.farm_id GROUP BY f.id ORDER BY f.name
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Farms report error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.vehicleStatus = async (req, res) => {
  try {
    const result = await pool.query('SELECT status, COUNT(*) as count FROM vehicles GROUP BY status ORDER BY status');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Vehicle status report error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.maintenanceStats = async (req, res) => {
  try {
    const [statusResult, costResult, typeResult] = await Promise.all([
      pool.query('SELECT status, COUNT(*) as count FROM maintenance_tasks GROUP BY status ORDER BY status'),
      pool.query(`SELECT DATE_TRUNC('month', scheduled_date) as month, SUM(cost) as total_cost, COUNT(*) as task_count
        FROM maintenance_tasks GROUP BY DATE_TRUNC('month', scheduled_date) ORDER BY month DESC LIMIT 12`),
      pool.query('SELECT task_type, COUNT(*) as count, AVG(cost) as avg_cost FROM maintenance_tasks GROUP BY task_type ORDER BY task_type'),
    ]);
    res.json({ success: true, data: { status: statusResult.rows, cost: costResult.rows, type: typeResult.rows } });
  } catch (err) {
    console.error('Maintenance stats error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.tripAnalytics = async (req, res) => {
  try {
    const [statusResult, dailyResult, driverResult] = await Promise.all([
      pool.query('SELECT status, COUNT(*) as count FROM trips GROUP BY status ORDER BY status'),
      pool.query(`SELECT DATE_TRUNC('day', scheduled_departure) as day, COUNT(*) as trip_count, SUM(passenger_count) as total_passengers
        FROM trips WHERE scheduled_departure >= NOW() - INTERVAL '30 days' GROUP BY DATE_TRUNC('day', scheduled_departure) ORDER BY day DESC`),
      pool.query(`SELECT CONCAT(u.first_name, ' ', u.last_name) as driver_name, COUNT(*) as trip_count
        FROM trips t JOIN drivers d ON t.driver_id = d.id JOIN users u ON d.id = u.id GROUP BY u.id ORDER BY trip_count DESC LIMIT 10`),
    ]);
    res.json({ success: true, data: { status: statusResult.rows, daily: dailyResult.rows, topDrivers: driverResult.rows } });
  } catch (err) {
    console.error('Trip analytics error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
