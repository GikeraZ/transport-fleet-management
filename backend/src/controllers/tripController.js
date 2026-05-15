const pool = require('../../db');
const { auditLog } = require('../middleware');

const ALLOWED_TRIP_FIELDS = ['farm_id', 'vehicle_id', 'driver_id', 'client_id', 'route_name', 'pickup_location', 'dropoff_location', 'scheduled_departure', 'scheduled_arrival', 'actual_departure', 'actual_arrival', 'status', 'passenger_count', 'notes'];

const VALID_STATUS_TRANSITIONS = {
  available: ['taken', 'cancelled'],
  taken: ['started', 'cancelled'],
  started: ['on_route', 'cancelled'],
  on_route: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  scheduled: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
};

const TRIP_QUERY_JOIN = `
  SELECT t.id, t.farm_id, t.vehicle_id, t.driver_id, t.route_name,
         t.pickup_location, t.dropoff_location, t.scheduled_departure,
         t.scheduled_arrival, t.actual_departure, t.actual_arrival,
         t.status, t.passenger_count, t.notes, t.created_at,
         t.accepted_at, t.completed_at, t.client_id,
         f.name as farm_name,
         v.license_plate as vehicle_license_plate,
         v.make, v.model,
         COALESCE(u.first_name || ' ' || u.last_name, NULL) as driver_name,
         COALESCE(cu.first_name || ' ' || cu.last_name, NULL) as client_name
  FROM trips t
  LEFT JOIN farms f ON t.farm_id = f.id
  LEFT JOIN vehicles v ON t.vehicle_id = v.id
  LEFT JOIN drivers d ON t.driver_id = d.id
  LEFT JOIN users u ON d.id = u.id
  LEFT JOIN users cu ON t.client_id = cu.id
`;

function buildListQuery(params) {
  const { status, farm_id, vehicle_id, driver_id, client_id, date_from, date_to, search, page = 1, limit = 20, exclude_completed_cancelled } = params;
  const offset = (page - 1) * limit;

  let countQuery = 'SELECT COUNT(*) FROM trips WHERE 1=1';
  let dataQuery = TRIP_QUERY_JOIN + ' WHERE 1=1';
  const values = [];
  let paramIndex = 1;

  if (status) {
    const statuses = Array.isArray(status) ? status : status.split(',');
    const placeholders = statuses.map(() => `$${paramIndex++}`).join(', ');
    countQuery += ` AND t.status IN (${placeholders})`;
    dataQuery += ` AND t.status IN (${placeholders})`;
    values.push(...statuses);
  }
  if (farm_id) {
    countQuery += ` AND t.farm_id = $${paramIndex}`;
    dataQuery += ` AND t.farm_id = $${paramIndex}`;
    values.push(farm_id); paramIndex++;
  }
  if (vehicle_id) {
    countQuery += ` AND t.vehicle_id = $${paramIndex}`;
    dataQuery += ` AND t.vehicle_id = $${paramIndex}`;
    values.push(vehicle_id); paramIndex++;
  }
  if (driver_id) {
    countQuery += ` AND t.driver_id = $${paramIndex}`;
    dataQuery += ` AND t.driver_id = $${paramIndex}`;
    values.push(driver_id); paramIndex++;
  }
  if (client_id) {
    countQuery += ` AND t.client_id = $${paramIndex}`;
    dataQuery += ` AND t.client_id = $${paramIndex}`;
    values.push(client_id); paramIndex++;
  }
  if (date_from) {
    countQuery += ` AND t.scheduled_departure >= $${paramIndex}`;
    dataQuery += ` AND t.scheduled_departure >= $${paramIndex}`;
    values.push(date_from); paramIndex++;
  }
  if (date_to) {
    countQuery += ` AND t.scheduled_departure <= $${paramIndex}`;
    dataQuery += ` AND t.scheduled_departure <= $${paramIndex}`;
    values.push(date_to); paramIndex++;
  }
  if (search) {
    const s = `%${search}%`;
    dataQuery += ` AND (t.route_name ILIKE $${paramIndex} OR t.pickup_location ILIKE $${paramIndex} OR t.dropoff_location ILIKE $${paramIndex})`;
    values.push(s);
    paramIndex++;
  }
  if (exclude_completed_cancelled) {
    countQuery += ` AND t.status NOT IN ('completed', 'cancelled')`;
    dataQuery += ` AND t.status NOT IN ('completed', 'cancelled')`;
  }

  return { countQuery, dataQuery, values, paramIndex, page, limit, offset };
}

exports.list = async (req, res) => {
  try {
    const { q_status, farm_id, vehicle_id, driver_id, client_id, date_from, date_to, search, page, limit } = req.query;
    const bq = buildListQuery({
      status: q_status, farm_id, vehicle_id, driver_id, client_id,
      date_from, date_to, search, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
    });

    const countResult = await pool.query(bq.countQuery, bq.values);
    const total = parseInt(countResult.rows[0].count, 10);

    bq.dataQuery += ` ORDER BY t.created_at DESC LIMIT $${bq.paramIndex} OFFSET $${bq.paramIndex + 1}`;
    bq.values.push(bq.limit, bq.offset);

    const result = await pool.query(bq.dataQuery, bq.values);

    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    res.json({ success: true, data: result.rows, pagination: { total, page: bq.page, limit: bq.limit, totalPages: Math.ceil(total / bq.limit) } });
  } catch (err) {
    console.error('Get trips error:', err);
    res.status(500).json({ success: false, error: process.env.NODE_ENV === 'development' ? err.message : 'Server error' });
  }
};

exports.available = async (req, res) => {
  try {
    const { date_from, date_to, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let dataQuery = TRIP_QUERY_JOIN + ' WHERE t.status = $1';
    let countQuery = 'SELECT COUNT(*) FROM trips WHERE status = $1';
  const values = ['available'];
  let paramIndex = 2;

    if (date_from) {
      dataQuery += ` AND t.scheduled_departure >= $${paramIndex}`;
      countQuery += ` AND scheduled_departure >= $${paramIndex}`;
      values.push(date_from); paramIndex++;
    }
    if (date_to) {
      dataQuery += ` AND t.scheduled_departure <= $${paramIndex}`;
      countQuery += ` AND scheduled_departure <= $${paramIndex}`;
      values.push(date_to); paramIndex++;
    }
    if (search) {
      const s = `%${search}%`;
      dataQuery += ` AND (t.pickup_location ILIKE $${paramIndex} OR t.dropoff_location ILIKE $${paramIndex} OR t.route_name ILIKE $${paramIndex})`;
      countQuery += ` AND (pickup_location ILIKE $${paramIndex} OR dropoff_location ILIKE $${paramIndex} OR route_name ILIKE $${paramIndex})`;
      values.push(s); paramIndex++;
    }

    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    dataQuery += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit), offset);

    const result = await pool.query(dataQuery, values);
    res.json({ success: true, data: result.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    console.error('Get available trips error:', err);
    res.status(500).json({ success: false, error: process.env.NODE_ENV === 'development' ? err.message : 'Server error' });
  }
};

exports.myTrips = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let dataQuery = TRIP_QUERY_JOIN + ' WHERE t.driver_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM trips WHERE driver_id = $1';
    const values = [req.user.userId];
    let paramIndex = 2;

    if (status) {
      const statuses = Array.isArray(status) ? status : status.split(',');
      const placeholders = statuses.map(() => `$${paramIndex++}`).join(', ');
      dataQuery += ` AND t.status IN (${placeholders})`;
      countQuery += ` AND status IN (${placeholders})`;
      values.push(...statuses);
    }

    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    dataQuery += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit), offset);

    const result = await pool.query(dataQuery, values);
    res.json({ success: true, data: result.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    console.error('Get my trips error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.myRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let dataQuery = TRIP_QUERY_JOIN + ' WHERE t.client_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM trips WHERE client_id = $1';
    const values = [req.user.userId];
    let paramIndex = 2;

    if (status) {
      const statuses = Array.isArray(status) ? status : status.split(',');
      const placeholders = statuses.map(() => `$${paramIndex++}`).join(', ');
      dataQuery += ` AND t.status IN (${placeholders})`;
      countQuery += ` AND status IN (${placeholders})`;
      values.push(...statuses);
    }

    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    dataQuery += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit), offset);

    const result = await pool.query(dataQuery, values);
    res.json({ success: true, data: result.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    console.error('Get my requests error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await pool.query(TRIP_QUERY_JOIN + ' WHERE t.id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Trip not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get trip error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.checkConflict = async (req, res) => {
  try {
    const { vehicle_id, driver_id, departure, arrival, exclude_id } = req.body;
    let vehicleConflict = false;
    let driverConflict = false;

    if (vehicle_id) {
      let vQuery = `SELECT COUNT(*) FROM trips WHERE vehicle_id = $1 AND status NOT IN ('completed', 'cancelled') AND scheduled_departure < $3 AND scheduled_arrival > $2`;
      const vValues = [vehicle_id, arrival, departure];
      if (exclude_id) { vQuery += ` AND id != $${vValues.length + 1}`; vValues.push(exclude_id); }
      const vResult = await pool.query(vQuery, vValues);
      vehicleConflict = parseInt(vResult.rows[0].count, 10) > 0;
    }
    if (driver_id) {
      let dQuery = `SELECT COUNT(*) FROM trips WHERE driver_id = $1 AND status NOT IN ('completed', 'cancelled') AND scheduled_departure < $3 AND scheduled_arrival > $2`;
      const dValues = [driver_id, arrival, departure];
      if (exclude_id) { dQuery += ` AND id != $${dValues.length + 1}`; dValues.push(exclude_id); }
      const dResult = await pool.query(dQuery, dValues);
      driverConflict = parseInt(dResult.rows[0].count, 10) > 0;
    }
    res.json({ success: true, data: { vehicleConflict, driverConflict } });
  } catch (err) {
    console.error('Conflict check error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.clientRequest = async (req, res) => {
  try {
    const { pickup_location, dropoff_location, scheduled_departure, passenger_count, notes, route_name } = req.body;
    if (!pickup_location) return res.status(400).json({ success: false, error: 'Pickup location is required' });
    if (!dropoff_location) return res.status(400).json({ success: false, error: 'Destination is required' });
    if (!scheduled_departure) return res.status(400).json({ success: false, error: 'Pickup date/time is required' });

    const scheduled_arrival = new Date(new Date(scheduled_departure).getTime() + 60 * 60 * 1000).toISOString();

    const result = await pool.query(
      `INSERT INTO trips (pickup_location, dropoff_location, scheduled_departure, scheduled_arrival, passenger_count, notes, route_name, status, client_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'available', $8, $8) RETURNING *`,
      [pickup_location, dropoff_location, scheduled_departure, scheduled_arrival, passenger_count || 0, notes || '', route_name || '', req.user.userId]
    );

    const fullTrip = await pool.query(TRIP_QUERY_JOIN + ' WHERE t.id = $1', [result.rows[0].id]);
    await auditLog('trips', result.rows[0].id, 'INSERT', req.user.userId, req.body);

    const io = req.app.locals.io;
    if (io) {
      io.to('available_trips').emit('trip:new', fullTrip.rows[0]);
      io.to(`user_${req.user.userId}`).emit('trip:request-created', fullTrip.rows[0]);
      io.to('admin_trips').emit('trip:new', fullTrip.rows[0]);
    }

    res.status(201).json({ success: true, data: fullTrip.rows[0] });
  } catch (err) {
    console.error('Client request error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.claim = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tripId = req.params.id;
    const driverId = req.user.userId;

    const trip = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [tripId]);
    if (!trip.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (trip.rows[0].status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'Trip is no longer available', currentStatus: trip.rows[0].status, assignedDriver: trip.rows[0].driver_id });
    }

    const result = await client.query(
      `UPDATE trips SET status = 'taken', driver_id = $1, accepted_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *`,
      [driverId, tripId]
    );

    await client.query(
      `INSERT INTO notifications (recipient_id, title, message, type, related_entity_type, related_entity_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [trip.rows[0].client_id, 'Trip Accepted', 'A driver has accepted your trip request.', 'trip_update', 'trip', tripId]
    );

    await client.query('COMMIT');

    const fullTrip = await pool.query(TRIP_QUERY_JOIN + ' WHERE t.id = $1', [tripId]);
    await auditLog('trips', tripId, 'CLAIM', driverId, { driver_id: driverId });

    const io = req.app.locals.io;
    if (io) {
      io.emit('trip:claimed', fullTrip.rows[0]);
      io.emit('trip:status-update', fullTrip.rows[0]);
      io.to(`user_${trip.rows[0].client_id}`).emit('trip:status-update', fullTrip.rows[0]);
      io.to(`user_${driverId}`).emit('trip:assigned', fullTrip.rows[0]);
      io.to('admin_trips').emit('trip:status-update', fullTrip.rows[0]);
    }

    res.json({ success: true, data: fullTrip.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Claim trip error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.accept = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tripId = req.params.id;
    const driverId = req.user.userId;

    const trip = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [tripId]);
    if (!trip.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (trip.rows[0].status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'Trip is no longer available', currentStatus: trip.rows[0].status, assignedDriver: trip.rows[0].driver_id });
    }

    const result = await client.query(
      `UPDATE trips SET status = 'taken', driver_id = $1, accepted_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *`,
      [driverId, tripId]
    );

    await client.query(
      `INSERT INTO notifications (recipient_id, title, message, type, related_entity_type, related_entity_id) VALUES ($1, $2, $3, $4, $5, $6)`,
      [trip.rows[0].client_id, 'Trip Accepted', 'A driver has accepted your trip request.', 'trip_update', 'trip', tripId]
    );

    await client.query('COMMIT');

    const fullTrip = await pool.query(TRIP_QUERY_JOIN + ' WHERE t.id = $1', [tripId]);
    await auditLog('trips', tripId, 'ACCEPT', driverId, { driver_id: driverId });

    const io = req.app.locals.io;
    if (io) {
      io.emit('trip:claimed', fullTrip.rows[0]);
      io.emit('trip:status-update', fullTrip.rows[0]);
      io.to(`user_${trip.rows[0].client_id}`).emit('trip:status-update', fullTrip.rows[0]);
      io.to(`user_${driverId}`).emit('trip:assigned', fullTrip.rows[0]);
      io.to('admin_trips').emit('trip:status-update', fullTrip.rows[0]);
    }

    res.json({ success: true, data: fullTrip.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Accept trip error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.driverTrips = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let dataQuery = TRIP_QUERY_JOIN + ' WHERE t.driver_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM trips WHERE driver_id = $1';
    const values = [driverId];
    let paramIndex = 2;

    if (status) {
      const statuses = Array.isArray(status) ? status : status.split(',');
      const placeholders = statuses.map(() => `$${paramIndex++}`).join(', ');
      dataQuery += ` AND t.status IN (${placeholders})`;
      countQuery += ` AND status IN (${placeholders})`;
      values.push(...statuses);
    }

    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    dataQuery += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit), offset);

    const result = await pool.query(dataQuery, values);
    res.json({ success: true, data: result.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    console.error('Get driver trips error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { farm_id, vehicle_id, driver_id, route_name, pickup_location, dropoff_location, scheduled_departure, scheduled_arrival, passenger_count, notes } = req.body;

    const result = await client.query(
      `INSERT INTO trips (farm_id, vehicle_id, driver_id, route_name, pickup_location, dropoff_location, scheduled_departure, scheduled_arrival, passenger_count, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [farm_id, vehicle_id, driver_id, route_name, pickup_location, dropoff_location, scheduled_departure, scheduled_arrival, passenger_count, notes, req.user.userId]
    );

    if (driver_id) {
      await client.query(
        `INSERT INTO notifications (recipient_id, title, message, type, related_entity_type, related_entity_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [driver_id, 'Trip Assigned', `You have been assigned to trip: ${route_name}`, 'trip_assignment', 'trip', result.rows[0].id]
      );
    }

    await client.query('COMMIT');
    await auditLog('trips', result.rows[0].id, 'INSERT', req.user.userId, req.body);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Create trip error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.update = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { status: newStatus, ...rest } = req.body;

    const oldTrip = await client.query('SELECT * FROM trips WHERE id = $1', [id]);
    if (!oldTrip.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    const oldStatus = oldTrip.rows[0].status;
    if (newStatus && newStatus !== oldStatus) {
      const allowed = VALID_STATUS_TRANSITIONS[oldStatus];
      if (!allowed || !allowed.includes(newStatus)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: `Cannot transition from '${oldStatus}' to '${newStatus}'` });
      }
    }

    const fields = [];
    const values = [id];
    let paramIndex = 2;
    const changes = {};

    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && ALLOWED_TRIP_FIELDS.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        changes[key] = value;
        paramIndex++;
      }
    }

    if (newStatus) {
      fields.push(`status = $${paramIndex}`);
      values.push(newStatus);
      changes.status = newStatus;
      paramIndex++;

      if (newStatus === 'completed') {
        fields.push(`completed_at = NOW()`);
        fields.push(`actual_arrival = NOW()`);
      }
      if (newStatus === 'taken' && !oldTrip.rows[0].accepted_at) {
        fields.push(`accepted_at = NOW()`);
      }
      if (newStatus === 'started') {
        fields.push(`actual_departure = NOW()`);
      }
    }

    if (!fields.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    fields.push('updated_at = NOW()');

    const result = await client.query(`UPDATE trips SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, values);
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (newStatus && newStatus !== oldStatus) {
      const recipientIds = [];
      if (result.rows[0].driver_id && result.rows[0].driver_id !== req.user.userId) recipientIds.push(result.rows[0].driver_id);
      if (result.rows[0].client_id && result.rows[0].client_id !== req.user.userId) recipientIds.push(result.rows[0].client_id);

      for (const rid of recipientIds) {
        await client.query(
          `INSERT INTO notifications (recipient_id, title, message, type, related_entity_type, related_entity_id) VALUES ($1, $2, $3, $4, $5, $6)`,
          [rid, 'Trip Status Updated', `Trip status changed to ${newStatus}`, 'trip_update', 'trip', id]
        );
      }
    }

    await client.query('COMMIT');

    const fullTrip = await pool.query(TRIP_QUERY_JOIN + ' WHERE t.id = $1', [id]);
    await auditLog('trips', id, 'UPDATE', req.user.userId, changes);

    const io = req.app.locals.io;
    if (io) io.emit('trip:status-update', fullTrip.rows[0]);

    res.json({ success: true, data: fullTrip.rows[0] });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Update trip error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM trips WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Trip not found' });
    await auditLog('trips', req.params.id, 'DELETE', req.user.userId, { id: req.params.id });
    res.json({ success: true, message: 'Trip deleted successfully' });
  } catch (err) {
    console.error('Delete trip error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
