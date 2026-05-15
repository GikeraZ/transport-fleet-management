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

exports.driverPerformance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.first_name, u.last_name, u.email,
        COUNT(DISTINCT t.id) as total_trips,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_trips,
        COUNT(DISTINCT CASE WHEN t.status = 'cancelled' THEN t.id END) as cancelled_trips,
        COUNT(DISTINCT CASE WHEN t.actual_departure <= t.scheduled_departure THEN t.id END) as on_time_departures,
        ROUND(COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END)::decimal / NULLIF(COUNT(DISTINCT t.id), 0) * 100, 1) as completion_rate,
        ROUND(AVG(CASE WHEN t.status = 'completed' THEN EXTRACT(EPOCH FROM (t.actual_arrival - t.scheduled_arrival)) / 60 END)) as avg_late_minutes
      FROM users u
      JOIN drivers d ON u.id = d.id
      LEFT JOIN trips t ON t.driver_id = d.id AND t.status != 'available'
      WHERE u.role_id = (SELECT id FROM roles WHERE name = 'driver')
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY completed_trips DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Driver performance error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.operationalSummary = async (req, res) => {
  try {
    const [tripStats, vehicleStats, maintStats, fuelStats] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
        COUNT(*) FILTER (WHERE status = 'active' OR status = 'taken' OR status = 'started' OR status = 'on_route') as active_trips,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_trips
      FROM trips`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active_vehicles,
        COUNT(*) FILTER (WHERE status = 'under_maintenance') as in_maintenance FROM vehicles`),
      pool.query(`SELECT COUNT(*) as pending_tasks FROM maintenance_tasks WHERE status NOT IN ('completed', 'cancelled')`),
      pool.query(`SELECT COALESCE(SUM(cost), 0) as total_fuel_cost, COALESCE(SUM(liters), 0) as total_liters FROM fuel_usage`),
    ]);
    res.json({
      success: true,
      data: {
        trips: tripStats.rows[0],
        vehicles: vehicleStats.rows[0],
        maintenance: maintStats.rows[0],
        fuel: fuelStats.rows[0],
      }
    });
  } catch (err) {
    console.error('Operational summary error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
