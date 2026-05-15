const pool = require('../../db');

// Audit log helper
async function auditLog(tableName, recordId, action, userId, changes) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (table_name, record_id, action, user_id, description, changes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tableName, recordId, action, userId, `${action} on ${tableName}`, JSON.stringify(changes)]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

// Send notification to specific users
async function notifyUsers(io, recipientIds, title, message, type, relatedEntity = null) {
  try {
    for (const recipientId of recipientIds) {
      const notification = await pool.query(
        `INSERT INTO notifications (recipient_id, title, message, type, related_entity_type, related_entity_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [recipientId, title, message, type, relatedEntity?.type || null, relatedEntity?.id || null]
      );

      if (io) {
        io.to(`user_${recipientId}`).emit('notification', notification.rows[0]);
      }
    }
  } catch (error) {
    console.error('Notification error:', error);
  }
}

// Send notification to a single user
async function notifyUser(io, userId, title, message, type, relatedEntity = null) {
  await notifyUsers(io, [userId], title, message, type, relatedEntity);
}

// Get user's permissions from role
async function getUserPermissions(roleName) {
  try {
    const result = await pool.query(
      `SELECT p.name, p.module FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN roles r ON rp.role_id = r.id
       WHERE r.name = $1`,
      [roleName]
    );
    return result.rows;
  } catch (error) {
    console.error('Get permissions error:', error);
    return [];
  }
}

module.exports = { auditLog, notifyUsers, notifyUser, getUserPermissions };