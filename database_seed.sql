/**
 * Database Seeding Script
 * Run with: psql -U postgres -d fleet_management -f database_seed.sql
 * Or use: node backend/src/utils/seed.js
 */

-- First run database_schema.sql to create tables, then run this script.

-- Clear existing data
TRUNCATE TABLE activity_logs, sessions, password_reset_tokens, notifications, maintenance_inventory_usage
  RESTART IDENTITY CASCADE;
TRUNCATE TABLE trips, maintenance_tasks, vehicles, drivers, mechanics, farms, users
  RESTART IDENTITY CASCADE;

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'System administrator with full access'),
  ('driver', 'Driver who operates vehicles for transport'),
  ('mechanic', 'Mechanic who performs maintenance and repairs'),
  ('farm_client', 'Farm client who requests services')
ON CONFLICT (name) DO NOTHING;

-- Create default admin user with password: admin123
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@fleetmgmt.com') THEN
    INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified)
    VALUES (
      'admin',
      'admin@fleetmgmt.com',
      '$2a$12$eBI4dDkoCo97nCBprrSgJOJ5oW8rEL5qIXL7zVyPshmvhlDd2BQCG',
      'System',
      'Administrator',
      '+1-555-000-0001',
      (SELECT id FROM roles WHERE name = 'admin'),
      TRUE,
      TRUE
    );
    RAISE NOTICE 'Default admin user created (username: admin, email: admin@fleetmgmt.com, password: admin123)';
  END IF;
END $$;

-- Create driver users first (so we get their IDs for the drivers table)
DO $$
DECLARE
  driver1_id UUID;
  driver2_id UUID;
  driver3_id UUID;
  driver_role_id INTEGER;
BEGIN
  SELECT id INTO driver_role_id FROM roles WHERE name = 'driver';

  -- Driver 1: James Wilson - password: driver123
  INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified)
  VALUES ('j.wilson', 'j.wilson@example.com', '$2a$12$z9dhlStsfQFfY6OK7vB2suRVLvjvfFijY/fCF6pABl7dznqUJ/o/u', 'James', 'Wilson', '+1-555-0101', driver_role_id, TRUE, TRUE)
  RETURNING id INTO driver1_id;

  INSERT INTO drivers (id, license_number, license_type, license_expiry, hire_date, emergency_contact_name, emergency_contact_phone, is_available)
  VALUES (driver1_id, 'CDL-A-987654', 'CDL Class A', '2028-06-15', '2020-01-01', 'Sarah Wilson', '+1-555-0102', TRUE);

  -- Driver 2: Maria Garcia - password: driver123
  INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified)
  VALUES ('m.garcia', 'm.garcia@example.com', '$2a$12$z9dhlStsfQFfY6OK7vB2suRVLvjvfFijY/fCF6pABl7dznqUJ/o/u', 'Maria', 'Garcia', '+1-555-0201', driver_role_id, TRUE, TRUE)
  RETURNING id INTO driver2_id;

  INSERT INTO drivers (id, license_number, license_type, license_expiry, hire_date, emergency_contact_name, emergency_contact_phone, is_available)
  VALUES (driver2_id, 'CDL-B-876543', 'CDL Class B', '2027-11-20', '2021-07-15', 'Carlos Garcia', '+1-555-0202', TRUE);

  -- Driver 3: Amanda Brown - password: driver123
  INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified)
  VALUES ('a.brown', 'a.brown@example.com', '$2a$12$z9dhlStsfQFfY6OK7vB2suRVLvjvfFijY/fCF6pABl7dznqUJ/o/u', 'Amanda', 'Brown', '+1-555-0401', driver_role_id, TRUE, TRUE)
  RETURNING id INTO driver3_id;

  INSERT INTO drivers (id, license_number, license_type, license_expiry, hire_date, emergency_contact_name, emergency_contact_phone, is_available)
  VALUES (driver3_id, 'CDL-C-654321', 'CDL Class C', '2026-12-31', '2022-02-14', 'David Brown', '+1-555-0402', TRUE);

  RAISE NOTICE 'Sample drivers created (password: driver123)';
END $$;

-- Create mechanic users first
DO $$
DECLARE
  mech1_id UUID;
  mech2_id UUID;
  mech3_id UUID;
  mech_role_id INTEGER;
BEGIN
  SELECT id INTO mech_role_id FROM roles WHERE name = 'mechanic';

  -- Mechanic 1: David Patel - password: mechanic123
  INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified)
  VALUES ('d.patel', 'd.patel@example.com', '$2a$12$2xoWlRZvMmioUP/p0ZUgbOspBR1F1NbSw8eBoU1e7Jgrw62/CR/1u', 'David', 'Patel', '+1-555-0601', mech_role_id, TRUE, TRUE)
  RETURNING id INTO mech1_id;

  INSERT INTO mechanics (id, specialization, certification_level, hire_date, is_available)
  VALUES (mech1_id, 'Engine Repair', 'Master Technician', '2018-01-01', TRUE);

  -- Mechanic 2: Emily Johansson - password: mechanic123
  INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified)
  VALUES ('e.johansson', 'e.johansson@example.com', '$2a$12$2xoWlRZvMmioUP/p0ZUgbOspBR1F1NbSw8eBoU1e7Jgrw62/CR/1u', 'Emily', 'Johansson', '+1-555-0602', mech_role_id, TRUE, TRUE)
  RETURNING id INTO mech2_id;

  INSERT INTO mechanics (id, specialization, certification_level, hire_date, is_available)
  VALUES (mech2_id, 'Electrical Systems', 'Senior Technician', '2019-03-15', TRUE);

  -- Mechanic 3: Grace Kim - password: mechanic123
  INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified)
  VALUES ('g.kim', 'g.kim@example.com', '$2a$12$2xoWlRZvMmioUP/p0ZUgbOspBR1F1NbSw8eBoU1e7Jgrw62/CR/1u', 'Grace', 'Kim', '+1-555-0603', mech_role_id, TRUE, TRUE)
  RETURNING id INTO mech3_id;

  INSERT INTO mechanics (id, specialization, certification_level, hire_date, is_available)
  VALUES (mech3_id, 'Transmission', 'Master Technician', '2020-06-01', TRUE);

  RAISE NOTICE 'Sample mechanics created (password: mechanic123)';
END $$;

-- Insert farms
INSERT INTO farms (name, contact_person, email, phone, address, is_active) VALUES
  ('Green Valley Farm', 'John Smith', 'john@greenvalley.com', '+1-555-100-0001', '123 Farm Road, Springfield', TRUE),
  ('Sunrise Plantation', 'Maria Garcia', 'maria@sunrise.com', '+1-555-100-0002', '456 Plantation Ave, Riverside', TRUE),
  ('Hilltop Ranch', 'Bob Johnson', 'bob@hilltop.com', '+1-555-100-0003', '789 Ranch Blvd, Mountainview', TRUE),
  ('Meadow Fields', 'Alice Brown', 'alice@meadow.com', '+1-555-100-0004', '321 Meadow Lane, Valley', TRUE),
  ('Creek Side Farms', 'Tom Wilson', 'tom@creekside.com', '+1-555-100-0005', '654 Creek Road, Brookfield', TRUE)
ON CONFLICT DO NOTHING;

-- Create farm client users - password: client123
DO $$
DECLARE
  farm_rec RECORD;
  client_role_id INTEGER;
  client_user_id UUID;
BEGIN
  SELECT id INTO client_role_id FROM roles WHERE name = 'farm_client';

  FOR farm_rec IN SELECT id, name FROM farms LOOP
    INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, is_active, is_verified)
    VALUES (
      LOWER(REPLACE(farm_rec.name, ' ', '')),
      LOWER(REPLACE(farm_rec.name, ' ', '')) || '@example.com',
      '$2a$12$cXN/YLDQUUDs/sosG61aduRY7Wj8hN2LqXDsXsNRBGdtUPI72Sc6K',
      SPLIT_PART(farm_rec.name, ' ', 1),
      'Client',
      client_role_id,
      TRUE,
      TRUE
    ) ON CONFLICT (email) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Sample farm clients created (password: client123)';
END $$;

-- Insert vehicles
INSERT INTO vehicles (license_plate, make, model, year, vehicle_type, capacity, status, last_service_date, next_service_date, mileage, vin) VALUES
  ('ABC-1234', 'Toyota', 'Coaster', 2022, 'Bus', 30, 'active', '2026-03-15', '2026-09-15', 45000, 'JT2DB1DV8A0000001')
ON CONFLICT (license_plate) DO NOTHING;

INSERT INTO vehicles (license_plate, make, model, year, vehicle_type, capacity, status, last_service_date, next_service_date, mileage, vin) VALUES
  ('XYZ-5678', 'Mercedes', 'Sprinter', 2021, 'Van', 12, 'under_maintenance', '2026-01-10', '2026-04-10', 78000, 'WDB9066491R123456')
ON CONFLICT (license_plate) DO NOTHING;

INSERT INTO vehicles (license_plate, make, model, year, vehicle_type, capacity, status, last_service_date, next_service_date, mileage, vin) VALUES
  ('DEF-9012', 'Volvo', 'FH16', 2023, 'Truck', 3, 'active', '2026-04-20', '2026-10-20', 12000, 'YV1RH5055R1000001')
ON CONFLICT (license_plate) DO NOTHING;

INSERT INTO vehicles (license_plate, make, model, year, vehicle_type, capacity, status, last_service_date, next_service_date, mileage, vin) VALUES
  ('GHI-3456', 'Ford', 'Transit', 2020, 'Van', 8, 'active', '2026-02-28', '2026-08-28', 95000, '1FMJK1HT5CEA12345')
ON CONFLICT (license_plate) DO NOTHING;

INSERT INTO vehicles (license_plate, make, model, year, vehicle_type, capacity, status, last_service_date, next_service_date, mileage, vin) VALUES
  ('JKL-7890', 'MAN', 'Lion''s City', 2022, 'Bus', 45, 'inactive', '2025-12-01', '2026-06-01', 62000, 'WME4966971R123456')
ON CONFLICT (license_plate) DO NOTHING;

INSERT INTO vehicles (license_plate, make, model, year, vehicle_type, capacity, status, last_service_date, next_service_date, mileage, vin) VALUES
   ('STU-0123', 'Scania', 'R 500', 2024, 'Truck', 3, 'active', '2026-04-15', '2026-10-15', 8500, 'YS2R4X20005123456')
ON CONFLICT (license_plate) DO NOTHING;