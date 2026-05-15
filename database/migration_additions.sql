-- Add assigned driver to vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;

-- Fuel usage tracking
CREATE TABLE IF NOT EXISTS fuel_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    liters DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    mileage_at_fill INTEGER,
    fuel_type VARCHAR(20) DEFAULT 'diesel',
    station_name VARCHAR(100),
    notes TEXT,
    filled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fuel_usage_vehicle ON fuel_usage(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_usage_date ON fuel_usage(filled_at);

-- Driver performance stats (materialized for speed)
CREATE TABLE IF NOT EXISTS driver_performance (
    driver_id UUID PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    on_time_trips INTEGER DEFAULT 0,
    total_distance_km DECIMAL(10,2) DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permissions for new features
INSERT INTO permissions (name, module, description) VALUES
('fuel.view', 'fuel', 'View fuel usage records'),
('fuel.create', 'fuel', 'Record fuel usage'),
('fuel.edit', 'fuel', 'Edit fuel records'),
('fuel.delete', 'fuel', 'Delete fuel records'),
('trips.create_own', 'trips', 'Create own trip requests (clients)'),
('maintenance.request', 'maintenance', 'Request maintenance (clients)'),
('reports.driver_performance', 'reports', 'View driver performance reports'),
('reports.operational', 'reports', 'View operational summary')
ON CONFLICT (name) DO NOTHING;

-- Assign new permissions to admin/superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('admin', 'superadmin')
AND p.name IN ('fuel.view', 'fuel.create', 'fuel.edit', 'fuel.delete',
               'reports.driver_performance', 'reports.operational')
ON CONFLICT DO NOTHING;

-- Assign fuel view + create, maintenance.request, trips.create_own to driver
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'driver'
AND p.name IN ('fuel.view', 'fuel.create')
ON CONFLICT DO NOTHING;

-- Assign maintenance.request, trips.create_own to clients
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name IN ('client', 'farm_client')
AND p.name IN ('maintenance.request', 'trips.create_own')
ON CONFLICT DO NOTHING;
