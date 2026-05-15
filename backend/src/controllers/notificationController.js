const pool = require('../../db');

exports.list = async (req, res) => {
  try {
    const { read, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM notifications WHERE recipient_id = $1';
    const values = [req.user.userId];
    let paramIndex = 2;

    if (read !== undefined) { query += ` AND is_read = $${paramIndex}`; values.push(read === 'true'); paramIndex++; }

    const countResult = await pool.query(query.replace('SELECT *', 'SELECT COUNT(*)'), values);
    const total = parseInt(countResult.rows[0].count, 10);
    query += ' ORDER BY created_at DESC';
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, values);
    const unreadCountResult = await pool.query('SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = false', [req.user.userId]);

    res.json({
      success: true,
      data: result.rows,
      unreadCount: parseInt(unreadCountResult.rows[0].count, 10),
      pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = false', [req.user.userId]);
    res.json({ success: true, count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_id = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Notification not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Mark notification error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND is_read = false', [req.user.userId]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 AND recipient_id = $2 RETURNING *', [req.params.id, req.user.userId]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
