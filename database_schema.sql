-- Database Schema for Transport and Fleet Management System
-- Using PostgreSQL syntax

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    make VARCHAR(50),
    model VARCHAR(50),
    year INTEGER,
    vehicle_type VARCHAR(50) NOT NULL,
    capacity INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    last_service_date DATE,
    next_service_date DATE,
    mileage INTEGER DEFAULT 0,
    vin VARCHAR(17) UNIQUE,
    insurance_expiry DATE,
    registration_expiry DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_type VARCHAR(20),
    license_expiry DATE,
    hire_date DATE,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mechanics table
CREATE TABLE mechanics (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    specialization VARCHAR(100),
    certification_level VARCHAR(50),
    hire_date DATE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Farms/Clients table
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trips table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES farms(id),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    route_name VARCHAR(100),
    pickup_location TEXT,
    dropoff_location TEXT,
    scheduled_departure TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_arrival TIMESTAMP WITH TIME ZONE,
    actual_departure TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'scheduled',
    passenger_count INTEGER,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trip attendance
CREATE TABLE trip_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    worker_name VARCHAR(100) NOT NULL,
    worker_id VARCHAR(50),
    pickup_time TIMESTAMP WITH TIME ZONE,
    dropoff_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'present',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance tasks table
CREATE TABLE maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id),
    mechanic_id UUID REFERENCES mechanics(id),
    task_type VARCHAR(50) NOT NULL,
    description TEXT,
    scheduled_date DATE,
    start_date DATE,
    completion_date DATE,
    status VARCHAR(20) DEFAULT 'scheduled',
    parts_used TEXT,
    labor_hours DECIMAL(5,2),
    cost DECIMAL(10,2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(100) NOT NULL,
    item_code VARCHAR(50) UNIQUE,
    category VARCHAR(50),
    quantity INTEGER DEFAULT 0,
    unit VARCHAR(20),
    min_threshold INTEGER DEFAULT 5,
    unit_cost DECIMAL(10,2),
    supplier VARCHAR(100),
    location VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance inventory usage
CREATE TABLE maintenance_inventory_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_task_id UUID REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory(id),
    quantity_used INTEGER NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table
CREATE TABLE activity_logs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     table_name VARCHAR(100) NOT NULL,
     record_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
     action VARCHAR(10) NOT NULL,
     description TEXT,
     user_id UUID REFERENCES users(id),
     changes JSONB,
     ip_address VARCHAR(45),
     user_agent TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
 );

-- Sessions table (for JWT refresh token management)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50),
    description TEXT
);

-- Role permissions junction table
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Indexes for performance
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_drivers_availability ON drivers(is_available);
CREATE INDEX idx_mechanics_availability ON mechanics(is_available);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_date ON trips(scheduled_departure);
CREATE INDEX idx_trips_farm ON trips(farm_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_route_name ON trips(route_name);
CREATE INDEX idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX idx_maintenance_tasks_date ON maintenance_tasks(scheduled_date);
CREATE INDEX idx_maintenance_tasks_vehicle ON maintenance_tasks(vehicle_id);
CREATE INDEX idx_maintenance_tasks_mechanic ON maintenance_tasks(mechanic_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_active ON sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_table ON activity_logs(table_name);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('admin', 'System administrator with full access'),
('superadmin', 'Super administrator with elevated privileges'),
('driver', 'Driver who operates vehicles for transport'),
('mechanic', 'Mechanic who performs maintenance and repairs'),
('farm_client', 'Farm client who requests services')
ON CONFLICT DO NOTHING;

-- Insert default permissions for admin
INSERT INTO permissions (name, module, description) VALUES
('users.view', 'users', 'View all users'),
('users.create', 'users', 'Create new users'),
('users.edit', 'users', 'Edit user information'),
('users.delete', 'users', 'Delete users'),
('users.activate', 'users', 'Activate/deactivate users'),
('vehicles.view', 'vehicles', 'View all vehicles'),
('vehicles.create', 'vehicles', 'Add new vehicles'),
('vehicles.edit', 'vehicles', 'Edit vehicle information'),
('vehicles.delete', 'vehicles', 'Delete vehicles'),
('drivers.view', 'drivers', 'View all drivers'),
('drivers.create', 'drivers', 'Add new drivers'),
('drivers.edit', 'drivers', 'Edit driver information'),
('drivers.delete', 'drivers', 'Delete drivers'),
('mechanics.view', 'mechanics', 'View all mechanics'),
('mechanics.create', 'mechanics', 'Add new mechanics'),
('mechanics.edit', 'mechanics', 'Edit mechanic information'),
('mechanics.delete', 'mechanics', 'Delete mechanics'),
('trips.view', 'trips', 'View all trips'),
('trips.create', 'trips', 'Create new trips'),
('trips.edit', 'trips', 'Edit trip information'),
('trips.delete', 'trips', 'Delete trips'),
('trips.approve', 'trips', 'Approve transport requests'),
('maintenance.view', 'maintenance', 'View all maintenance tasks'),
('maintenance.create', 'maintenance', 'Create maintenance tasks'),
('maintenance.edit', 'maintenance', 'Edit maintenance tasks'),
('maintenance.delete', 'maintenance', 'Delete maintenance tasks'),
('inventory.view', 'inventory', 'View inventory'),
('inventory.manage', 'inventory', 'Manage inventory items'),
('reports.view', 'reports', 'View reports and analytics'),
('notifications.view', 'notifications', 'View all notifications'),
('profile.view', 'profile', 'View own profile'),
('profile.edit', 'profile', 'Edit own profile')
ON CONFLICT DO NOTHING;

-- Assign all permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Assign all permissions to superadmin role as well
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- Driver permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'driver'
AND p.name IN ('trips.view', 'profile.view', 'profile.edit')
ON CONFLICT DO NOTHING;

-- Mechanic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'mechanic'
AND p.name IN ('maintenance.view', 'profile.view', 'profile.edit')
ON CONFLICT DO NOTHING;

-- Farm client permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'farm_client'
AND p.name IN ('trips.view', 'profile.view', 'profile.edit')
ON CONFLICT DO NOTHING;