const pool = require('../../db');

exports.listRoles = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description FROM roles ORDER BY id');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('List roles error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.listPermissions = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, module, description FROM permissions ORDER BY module, name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('List permissions error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.rolePermissions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.module, p.description FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1 ORDER BY p.module, p.name`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Role permissions error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.assignPermission = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { role_id, permission_id, assigned } = req.body;
    if (assigned) {
      await client.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [role_id, permission_id]
      );
    } else {
      await client.query(
        'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [role_id, permission_id]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: assigned ? 'Permission assigned' : 'Permission removed' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Assign permission error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Role name is required' });
    const result = await pool.query(
      'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, error: 'Role already exists' });
    console.error('Create role error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const check = await pool.query('SELECT COUNT(*) FROM users WHERE role_id = $1', [req.params.id]);
    if (parseInt(check.rows[0].count, 10) > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete role with active users' });
    }
    await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [req.params.id]);
    const result = await pool.query('DELETE FROM roles WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Role not found' });
    res.json({ success: true, message: 'Role deleted' });
  } catch (err) {
    console.error('Delete role error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
