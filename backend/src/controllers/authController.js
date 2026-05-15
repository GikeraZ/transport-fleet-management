const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '7d';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const generateTokens = (user) => {
  // Defensive: ensure user object has required properties
  if (!user || !user.id || !user.email) {
    throw new Error('Invalid user object for token generation');
  }
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role_name || user.role || 'client', firstName: user.first_name, lastName: user.last_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRE }
  );
  return { accessToken, refreshToken };
};

const logAuthError = (context, details) => {
  console.error(`[AUTH ERROR] ${context}:`, {
    ...details,
    timestamp: new Date().toISOString()
  });
};

const sendEmail = async (to, subject, html) => {
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
  return true;
};

const sanitize = (str) => (typeof str === 'string' ? str.replace(/<[^>]*>/g, '') : str);

exports.getMe = async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
              u.is_active, u.is_verified, u.avatar_url, u.created_at, u.last_login,
              COALESCE(r.name, 'client') as role_name
       FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [req.user.userId]
    );
    if (!user.rows.length) return res.status(404).json({ success: false, error: 'User not found' });

    const permissions = await pool.query(
      `SELECT p.name, p.module FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN roles r ON rp.role_id = r.id WHERE r.name = $1`,
      [user.rows[0].role_name]
    );

    res.json({
      success: true,
      data: { ...user.rows[0], role: user.rows[0].role_name, permissions: permissions.rows.map(p => p.name) },
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.register = async (req, res) => {
  const client = await pool.connect();
  try {
    const { first_name, last_name, email, phone, username, password, role, role_name } = req.body;
    const effectiveRole = role || role_name;
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Missing required fields: first_name, last_name, email, password' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username || email.split('@')[0]]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'User with this email or username already exists' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    let role_id = null;
    let roleName = 'client';
    const validRoles = ['admin', 'superadmin', 'driver', 'mechanic', 'farm_client', 'client'];
    if (effectiveRole && validRoles.includes(effectiveRole)) {
      const roleResult = await client.query('SELECT id, name FROM roles WHERE name = $1', [effectiveRole]);
      if (roleResult.rows.length) {
        role_id = roleResult.rows[0].id;
        roleName = roleResult.rows[0].name;
      }
    }

    const result = await client.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, first_name, last_name, phone, is_active, is_verified, role_id, avatar_url, created_at`,
      [sanitize(username) || sanitize(email.split('@')[0]), sanitize(email), password_hash, sanitize(first_name), sanitize(last_name), phone || null, role_id]
    );
    const user = result.rows[0];

    // Auto-create driver/mechanic profile records for FK integrity
    if (roleName === 'driver') {
      const licNum = 'TMP-' + user.id.substring(0, 8).toUpperCase();
      await client.query(
        'INSERT INTO drivers (id, license_number, license_type, hire_date, is_available) VALUES ($1,$2,$3,$4,true) ON CONFLICT (id) DO NOTHING',
        [user.id, licNum, 'Pending', new Date().toISOString().split('T')[0]]
      );
    } else if (roleName === 'mechanic') {
      await client.query(
        'INSERT INTO mechanics (id, specialization, certification_level, hire_date, is_available) VALUES ($1,$2,$3,$4,true) ON CONFLICT (id) DO NOTHING',
        [user.id, 'General', 'Entry Level', new Date().toISOString().split('T')[0]]
      );
    }

    user.role_name = roleName;
    const tokens = generateTokens(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await client.query('INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)', [user.id, tokens.refreshToken, expiresAt]);
    await client.query("INSERT INTO activity_logs (user_id, action, description, table_name) VALUES ($1, 'REGISTER', 'New user registered', 'users')", [user.id]);
    await client.query('COMMIT');

    res.status(201).json({ success: true, data: { user: { ...user, role: roleName }, tokens }, message: 'Registration successful' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    logAuthError('REGISTER_EXCEPTION', { error: err.message, stack: err.stack, email: req.body?.email });
    res.status(500).json({ success: false, error: err.message || 'Server error during registration' });
  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, remember } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });

    const result = await client.query(
      `SELECT u.*, COALESCE(r.name, 'client') as role_name FROM users u
       LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = $1`,
      [email]
    );
    if (!result.rows.length) {
      logAuthError('LOGIN_USER_NOT_FOUND', { email, ip: req.ip });
      try {
        await client.query("INSERT INTO activity_logs (action, description, table_name, ip_address) VALUES ('LOGIN_FAILED', 'Login attempt for non-existent email', 'users', $1)", [req.ip || null]);
      } catch (logErr) { /* ignore logging errors */ }
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    
    // Validate user object has required fields
    if (!user.id) {
      logAuthError('LOGIN_INVALID_USER_OBJECT', { email, user });
      return res.status(500).json({ success: false, error: 'Authentication error. Please contact support.' });
    }
    
    if (!user.is_active) {
      logAuthError('LOGIN_ACCOUNT_DISABLED', { userId: user.id, email, ip: req.ip });
      return res.status(403).json({ success: false, error: 'Account is disabled. Contact administrator.' });
    }

    // Verify password with detailed error logging
    let valid = false;
    try {
      if (!user.password_hash) {
        logAuthError('LOGIN_MISSING_PASSWORD_HASH', { userId: user.id, email, ip: req.ip });
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }
      valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        logAuthError('LOGIN_INVALID_PASSWORD', { userId: user.id, email, hasPassword: !!user.password_hash, ip: req.ip });
        try {
          await client.query("INSERT INTO activity_logs (user_id, action, description, table_name) VALUES ($1, 'LOGIN_FAILED', 'Invalid password attempt', 'users')", [user.id]);
        } catch (logErr) { /* ignore logging errors */ }
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }
    } catch (compareErr) {
      logAuthError('LOGIN_PASSWORD_COMPARE_ERROR', { userId: user.id, error: compareErr.message, ip: req.ip });
      return res.status(500).json({ success: false, error: 'Authentication error. Please try again.' });
    }

    // Generate tokens with error handling
    let tokens;
    try {
      tokens = generateTokens(user);
    } catch (tokenErr) {
      logAuthError('LOGIN_TOKEN_GENERATION_ERROR', { userId: user.id, error: tokenErr.message });
      return res.status(500).json({ success: false, error: 'Authentication error. Please try again.' });
    }

    const expiresAt = remember
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      await client.query('INSERT INTO sessions (user_id, refresh_token, ip_address, expires_at) VALUES ($1, $2, $3, $4)', [user.id, tokens.refreshToken, req.ip || null, expiresAt]);
      await client.query('UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
      await client.query("INSERT INTO activity_logs (user_id, action, description, table_name) VALUES ($1, 'LOGIN', 'User logged in successfully', 'users')", [user.id]);
    } catch (dbErr) {
      logAuthError('LOGIN_DATABASE_UPDATE_ERROR', { userId: user.id, error: dbErr.message });
      // Continue anyway - login was successful, just logging failed
    }

    res.json({
      success: true,
      data: {
        user: { id: user.id, username: user.username, email: user.email, first_name: user.first_name, last_name: user.last_name, phone: user.phone, avatar_url: user.avatar_url, is_active: user.is_active, is_verified: user.is_verified, role: user.role_name || 'client' },
        tokens,
      },
      message: `Welcome back, ${user.first_name}!`,
    });
  } catch (err) {
    logAuthError('LOGIN_EXCEPTION', { error: err.message, stack: err.stack, ip: req.ip });
    res.status(500).json({ success: false, error: 'Server error during login' });
  } finally {
    try {
      client.release();
    } catch (releaseErr) {
      logAuthError('LOGIN_CLIENT_RELEASE_ERROR', { error: releaseErr.message });
    }
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = await pool.query('SELECT id, email, first_name FROM users WHERE email = $1', [email]);
    if (!user.rows.length) return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false', [user.rows[0].id]);
    await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.rows[0].id, resetToken, expiresAt]);
    await sendEmail(user.rows[0].email, 'Password Reset Request',
      `<h1>Password Reset</h1><p>Hello ${user.rows[0].first_name},</p><p>Click <a href="${CLIENT_URL}/reset-password/${resetToken}">here</a> to reset your password. This link expires in 1 hour.</p>`);

    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const client = await pool.connect();
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) return res.status(400).json({ success: false, error: 'Password and confirmation are required' });
    if (password !== confirmPassword) return res.status(400).json({ success: false, error: 'Passwords do not match' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });

    await client.query('BEGIN');
    const resetRecord = await client.query('SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()', [token]);
    if (!resetRecord.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, resetRecord.rows[0].user_id]);
    await client.query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [token]);
    await client.query('UPDATE sessions SET is_active = false WHERE user_id = $1', [resetRecord.rows[0].user_id]);
    await client.query('COMMIT');

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.changePassword = async (req, res) => {
  const client = await pool.connect();
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'All password fields are required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });

    await client.query('BEGIN');
    const userResult = await client.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!userResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);
    await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, userId]);
    await client.query('UPDATE sessions SET is_active = false WHERE user_id = $1', [userId]);
    await client.query("INSERT INTO activity_logs (user_id, action, description, table_name) VALUES ($1, 'PASSWORD_CHANGE', 'User changed their password', 'users')", [userId]);
    await client.query('COMMIT');

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    const session = await pool.query(
      'SELECT * FROM sessions WHERE user_id = $1 AND refresh_token = $2 AND is_active = true AND expires_at > NOW()',
      [decoded.userId, refreshToken]
    );
    if (!session.rows.length) return res.status(401).json({ success: false, error: 'Session expired. Please login again.' });

    const user = await pool.query(
      `SELECT u.*, COALESCE(r.name, 'client') as role_name FROM users u
       LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );
    if (!user.rows.length) return res.status(401).json({ success: false, error: 'User not found' });

    const accessToken = jwt.sign(
      { userId: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role_name, firstName: user.rows[0].first_name, lastName: user.rows[0].last_name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  const client = await pool.connect();
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token);
      if (decoded?.userId) {
        await client.query('UPDATE sessions SET is_active = false WHERE user_id = $1', [decoded.userId]);
        await client.query("INSERT INTO activity_logs (user_id, action, description, table_name) VALUES ($1, 'LOGOUT', 'User logged out', 'users')", [decoded.userId]);
      }
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
};
