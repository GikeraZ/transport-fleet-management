-- Database schema updates for authentication module
-- Run AFTER database_schema.sql to add additional features

-- 1. Add additional roles (only missing ones)
INSERT INTO roles (name, description) VALUES
  ('client', 'Farm client / customer')
ON CONFLICT (name) DO NOTHING;

-- 2. Add avatar and additional fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP WITH TIME ZONE;

-- 3. Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE;
  UPDATE sessions SET is_active = FALSE WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 4. Insert additional permissions beyond the base schema
INSERT INTO permissions (name, description, module) VALUES
  ('users.roles', 'Manage user roles', 'users'),
  ('drivers.assign', 'Assign drivers to trips', 'drivers'),
  ('mechanics.assign', 'Assign mechanics to tasks', 'mechanics'),
  ('trips.assign', 'Assign vehicles/drivers to trips', 'trips'),
  ('maintenance.approve', 'Approve maintenance work', 'maintenance'),
  ('inventory.create', 'Add inventory items', 'inventory'),
  ('inventory.edit', 'Edit inventory items', 'inventory'),
  ('inventory.delete', 'Delete inventory items', 'inventory'),
  ('reports.export', 'Export reports', 'reports'),
  ('notifications.manage', 'Manage notification settings', 'notifications'),
  ('profile.upload', 'Upload profile photo', 'profile'),
  ('settings.view', 'View system settings', 'settings'),
  ('settings.edit', 'Edit system settings', 'settings'),
  ('dashboard.admin', 'Access admin dashboard', 'dashboard'),
  ('dashboard.driver', 'Access driver dashboard', 'dashboard'),
  ('dashboard.mechanic', 'Access mechanic dashboard', 'dashboard'),
  ('dashboard.client', 'Access client dashboard', 'dashboard')
ON CONFLICT (name) DO NOTHING;

-- 5. Assign permissions to roles
-- Superadmin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- Admin gets most permissions (excluding user roles management)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.name NOT IN ('users.roles', 'settings.edit', 'dashboard.driver', 'dashboard.mechanic', 'dashboard.client')
ON CONFLICT DO NOTHING;

-- Driver permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'driver'
AND p.name IN ('trips.view', 'trips.assign', 'profile.view', 'profile.edit', 'profile.upload', 'notifications.view', 'dashboard.driver')
ON CONFLICT DO NOTHING;

-- Mechanic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'mechanic'
AND p.name IN ('maintenance.view', 'maintenance.edit', 'maintenance.approve', 'profile.view', 'profile.edit', 'profile.upload', 'notifications.view', 'dashboard.mechanic')
ON CONFLICT DO NOTHING;

-- Client permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'client'
AND p.name IN ('trips.view', 'profile.view', 'profile.edit', 'profile.upload', 'notifications.view', 'dashboard.client')
ON CONFLICT DO NOTHING;

-- Also assign matching permissions to farm_client role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'farm_client'
AND p.name IN ('trips.view', 'profile.view', 'profile.edit', 'profile.upload', 'notifications.view', 'dashboard.client')
ON CONFLICT DO NOTHING;

-- 6. Additional indexes (if not already created by main schema)
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);