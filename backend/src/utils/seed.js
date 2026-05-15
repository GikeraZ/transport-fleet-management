require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const pool = require('../../db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('\n🌱 Starting database seed...\n');

    await client.query('BEGIN');

    // Clear existing data
    await client.query('DELETE FROM maintenance_inventory_usage');
    await client.query('DELETE FROM activity_logs');
    await client.query('DELETE FROM sessions');
    await client.query('DELETE FROM password_reset_tokens');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM trip_attendance');
    await client.query('DELETE FROM maintenance_tasks');
    await client.query('DELETE FROM trips');
    await client.query('DELETE FROM inventory');
    await client.query('DELETE FROM mechanics');
    await client.query('DELETE FROM drivers');
    await client.query('DELETE FROM farms');
    await client.query('DELETE FROM vehicles');
    await client.query('DELETE FROM role_permissions');
    await client.query('DELETE FROM permissions');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM roles');

    // Reset sequences
    await client.query("ALTER SEQUENCE roles_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE permissions_id_seq RESTART WITH 1");
    await client.query("ALTER SEQUENCE role_permissions_id_seq RESTART WITH 1");

    // Insert roles
    const roles = ['admin', 'superadmin', 'driver', 'mechanic', 'farm_client', 'client'];
    const roleIds = {};
    for (const name of roles) {
      const r = await client.query(
        'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id',
        [name, `${name} role`]
      );
      roleIds[name] = r.rows[0].id;
    }
    console.log('  ✓ Roles created:', roles.join(', '));

    // Hash passwords
    const [adminHash, driverHash, mechanicHash, clientHash] = await Promise.all([
      bcrypt.hash('admin123', 12),
      bcrypt.hash('driver123', 12),
      bcrypt.hash('mechanic123', 12),
      bcrypt.hash('client123', 12),
    ]);

    // Create admin user
    const admin = await client.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,true) RETURNING id`,
      ['admin', 'admin@fleetmgmt.com', adminHash, 'System', 'Administrator', '+1-555-000-0001', roleIds.admin]
    );
    console.log('  ✓ Admin created (admin@fleetmgmt.com / admin123)');

    // Create drivers
    const driverData = [
      { username: 'j.wilson', email: 'j.wilson@example.com', first: 'James', last: 'Wilson', phone: '+1-555-0101', lic: 'CDL-A-987654', licType: 'CDL Class A', licExp: '2028-06-15', hire: '2020-01-01', emergName: 'Sarah Wilson', emergPhone: '+1-555-0102' },
      { username: 'm.garcia', email: 'm.garcia@example.com', first: 'Maria', last: 'Garcia', phone: '+1-555-0201', lic: 'CDL-B-876543', licType: 'CDL Class B', licExp: '2027-11-20', hire: '2021-07-15', emergName: 'Carlos Garcia', emergPhone: '+1-555-0202' },
      { username: 'a.brown', email: 'a.brown@example.com', first: 'Amanda', last: 'Brown', phone: '+1-555-0401', lic: 'CDL-C-654321', licType: 'CDL Class C', licExp: '2026-12-31', hire: '2022-02-14', emergName: 'David Brown', emergPhone: '+1-555-0402' },
    ];
    for (const d of driverData) {
      const u = await client.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,true) RETURNING id`,
        [d.username, d.email, driverHash, d.first, d.last, d.phone, roleIds.driver]
      );
      await client.query(
        `INSERT INTO drivers (id, license_number, license_type, license_expiry, hire_date, emergency_contact_name, emergency_contact_phone, is_available)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [u.rows[0].id, d.lic, d.licType, d.licExp, d.hire, d.emergName, d.emergPhone]
      );
    }
    console.log('  ✓ Drivers created (password: driver123)');

    // Create mechanics
    const mechanicData = [
      { username: 'd.patel', email: 'd.patel@example.com', first: 'David', last: 'Patel', phone: '+1-555-0601', spec: 'Engine Repair', cert: 'Master Technician', hire: '2018-01-01' },
      { username: 'e.johansson', email: 'e.johansson@example.com', first: 'Emily', last: 'Johansson', phone: '+1-555-0602', spec: 'Electrical Systems', cert: 'Senior Technician', hire: '2019-03-15' },
      { username: 'g.kim', email: 'g.kim@example.com', first: 'Grace', last: 'Kim', phone: '+1-555-0603', spec: 'Transmission', cert: 'Master Technician', hire: '2020-06-01' },
    ];
    for (const m of mechanicData) {
      const u = await client.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role_id, is_active, is_verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,true) RETURNING id`,
        [m.username, m.email, mechanicHash, m.first, m.last, m.phone, roleIds.mechanic]
      );
      await client.query(
        `INSERT INTO mechanics (id, specialization, certification_level, hire_date, is_available)
         VALUES ($1,$2,$3,$4,true)`,
        [u.rows[0].id, m.spec, m.cert, m.hire]
      );
    }
    console.log('  ✓ Mechanics created (password: mechanic123)');

    // Create farms
    const farmData = [
      { name: 'Green Valley Farm', contact: 'John Smith', email: 'john@greenvalley.com', phone: '+1-555-100-0001', address: '123 Farm Road, Springfield' },
      { name: 'Sunrise Plantation', contact: 'Maria Garcia', email: 'maria@sunrise.com', phone: '+1-555-100-0002', address: '456 Plantation Ave, Riverside' },
      { name: 'Hilltop Ranch', contact: 'Bob Johnson', email: 'bob@hilltop.com', phone: '+1-555-100-0003', address: '789 Ranch Blvd, Mountainview' },
      { name: 'Meadow Fields', contact: 'Alice Brown', email: 'alice@meadow.com', phone: '+1-555-100-0004', address: '321 Meadow Lane, Valley' },
      { name: 'Creek Side Farms', contact: 'Tom Wilson', email: 'tom@creekside.com', phone: '+1-555-100-0005', address: '654 Creek Road, Brookfield' },
    ];
    for (const f of farmData) {
      await client.query(
        `INSERT INTO farms (name, contact_person, email, phone, address, is_active) VALUES ($1,$2,$3,$4,$5,true)`,
        [f.name, f.contact, f.email, f.phone, f.address]
      );
    }
    console.log('  ✓ Farms created');

    // Create farm client users
    for (const f of farmData) {
      const username = f.name.toLowerCase().replace(/\s+/g, '');
      await client.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, is_active, is_verified)
         VALUES ($1,$2,$3,$4,$5,$6,true,true)
         ON CONFLICT (email) DO NOTHING`,
        [username, `${username}@example.com`, clientHash, f.name.split(' ')[0], 'Client', roleIds.farm_client]
      );
    }
    console.log('  ✓ Farm clients created (password: client123)');

    // Create vehicles
    const vehicleData = [
      { plate: 'ABC-1234', make: 'Toyota', model: 'Coaster', year: 2022, type: 'Bus', cap: 30, status: 'active', service: '2026-03-15', nextService: '2026-09-15', miles: 45000, vin: 'JT2DB1DV8A0000001' },
      { plate: 'XYZ-5678', make: 'Mercedes', model: 'Sprinter', year: 2021, type: 'Van', cap: 12, status: 'under_maintenance', service: '2026-01-10', nextService: '2026-04-10', miles: 78000, vin: 'WDB9066491R123456' },
      { plate: 'DEF-9012', make: 'Volvo', model: 'FH16', year: 2023, type: 'Truck', cap: 3, status: 'active', service: '2026-04-20', nextService: '2026-10-20', miles: 12000, vin: 'YV1RH5055R1000001' },
      { plate: 'GHI-3456', make: 'Ford', model: 'Transit', year: 2020, type: 'Van', cap: 8, status: 'active', service: '2026-02-28', nextService: '2026-08-28', miles: 95000, vin: '1FMJK1HT5CEA12345' },
      { plate: 'JKL-7890', make: 'MAN', model: "Lion's City", year: 2022, type: 'Bus', cap: 45, status: 'inactive', service: '2025-12-01', nextService: '2026-06-01', miles: 62000, vin: 'WME4966971R123456' },
      { plate: 'STU-0123', make: 'Scania', model: 'R 500', year: 2024, type: 'Truck', cap: 3, status: 'active', service: '2026-04-15', nextService: '2026-10-15', miles: 8500, vin: 'YS2R4X20005123456' },
    ];
    for (const v of vehicleData) {
      await client.query(
        `INSERT INTO vehicles (license_plate, make, model, year, vehicle_type, capacity, status, last_service_date, next_service_date, mileage, vin)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (license_plate) DO NOTHING`,
        [v.plate, v.make, v.model, v.year, v.type, v.cap, v.status, v.service, v.nextService, v.miles, v.vin]
      );
    }
    console.log('  ✓ Vehicles created');

    // Insert default permissions
    const permissionDefs = [
      ['users.view', 'users'], ['users.create', 'users'], ['users.edit', 'users'], ['users.delete', 'users'], ['users.activate', 'users'], ['users.roles', 'users'],
      ['vehicles.view', 'vehicles'], ['vehicles.create', 'vehicles'], ['vehicles.edit', 'vehicles'], ['vehicles.delete', 'vehicles'],
      ['drivers.view', 'drivers'], ['drivers.create', 'drivers'], ['drivers.edit', 'drivers'], ['drivers.delete', 'drivers'], ['drivers.assign', 'drivers'],
      ['mechanics.view', 'mechanics'], ['mechanics.create', 'mechanics'], ['mechanics.edit', 'mechanics'], ['mechanics.delete', 'mechanics'], ['mechanics.assign', 'mechanics'],
      ['trips.view', 'trips'], ['trips.create', 'trips'], ['trips.edit', 'trips'], ['trips.delete', 'trips'], ['trips.approve', 'trips'], ['trips.assign', 'trips'],
      ['maintenance.view', 'maintenance'], ['maintenance.create', 'maintenance'], ['maintenance.edit', 'maintenance'], ['maintenance.delete', 'maintenance'], ['maintenance.approve', 'maintenance'],
      ['inventory.view', 'inventory'], ['inventory.manage', 'inventory'], ['inventory.create', 'inventory'], ['inventory.edit', 'inventory'], ['inventory.delete', 'inventory'],
      ['reports.view', 'reports'], ['reports.export', 'reports'],
      ['notifications.view', 'notifications'], ['notifications.manage', 'notifications'],
      ['profile.view', 'profile'], ['profile.edit', 'profile'], ['profile.upload', 'profile'],
      ['settings.view', 'settings'], ['settings.edit', 'settings'],
      ['dashboard.admin', 'dashboard'], ['dashboard.driver', 'dashboard'], ['dashboard.mechanic', 'dashboard'], ['dashboard.client', 'dashboard'],
    ];
    for (const [name, module] of permissionDefs) {
      await client.query(
        'INSERT INTO permissions (name, module, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [name, module, `${name} permission`]
      );
    }
    console.log('  ✓ Permissions created');

    // Assign permissions to admin and superadmin (all)
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r, permissions p
       WHERE r.name IN ('admin', 'superadmin')
       ON CONFLICT DO NOTHING`
    );

    // Driver permissions
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r, permissions p
       WHERE r.name = 'driver' AND p.name IN ('trips.view','trips.assign','profile.view','profile.edit','profile.upload','notifications.view','dashboard.driver')
       ON CONFLICT DO NOTHING`
    );

    // Mechanic permissions
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r, permissions p
       WHERE r.name = 'mechanic' AND p.name IN ('maintenance.view','maintenance.edit','maintenance.approve','profile.view','profile.edit','profile.upload','notifications.view','dashboard.mechanic')
       ON CONFLICT DO NOTHING`
    );

    // Client permissions
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r, permissions p
       WHERE r.name IN ('client', 'farm_client') AND p.name IN ('trips.view','profile.view','profile.edit','profile.upload','notifications.view','dashboard.client')
       ON CONFLICT DO NOTHING`
    );
    console.log('  ✓ Role-permissions assigned');

    await client.query('COMMIT');
    console.log('\n✅ Database seed completed successfully!\n');
    console.log('   Credentials:');
    console.log('   ┌──────────────────┬──────────────────────────────┬──────────────┐');
    console.log('   │ Role             │ Email                        │ Password     │');
    console.log('   ├──────────────────┼──────────────────────────────┼──────────────┤');
    console.log('   │ Admin            │ admin@fleetmgmt.com          │ admin123     │');
    console.log('   │ Driver (James)   │ j.wilson@example.com         │ driver123    │');
    console.log('   │ Driver (Maria)   │ m.garcia@example.com         │ driver123    │');
    console.log('   │ Driver (Amanda)  │ a.brown@example.com          │ driver123    │');
    console.log('   │ Mechanic (D.)    │ d.patel@example.com          │ mechanic123  │');
    console.log('   │ Mechanic (E.)    │ e.johansson@example.com      │ mechanic123  │');
    console.log('   │ Mechanic (G.)    │ g.kim@example.com            │ mechanic123  │');
    console.log('   │ Client           │ greenvalleyfarm@example.com  │ client123    │');
    console.log('   └──────────────────┴──────────────────────────────┴──────────────┘\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
