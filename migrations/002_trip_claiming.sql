ALTER TABLE trips ALTER COLUMN scheduled_arrival DROP NOT NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE trips ALTER COLUMN status SET DEFAULT 'available';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES users(id);

UPDATE trips SET client_id = created_by WHERE client_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_trips_client ON trips(client_id);
CREATE INDEX IF NOT EXISTS idx_trips_available ON trips(status) WHERE status = 'available';
