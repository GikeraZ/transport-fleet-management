require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: isProd ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 20000,
    };
  }
  return {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'fleet_management',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    connectionTimeoutMillis: 20000,
  };
}

async function initDatabase() {
  const pool = new Pool(getPoolConfig());

  try {
    const result = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles')`
    );
    const initialized = result.rows[0].exists;

    if (!initialized) {
      console.log('Applying database schema...');
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('Database schema applied.');
    } else {
      console.log('Database schema already exists, skipping.');
    }

    console.log('Applying migration additions...');
    try {
      const migrationPath = path.join(__dirname, '../../database/migration_additions.sql');
      if (fs.existsSync(migrationPath)) {
        const migration = fs.readFileSync(migrationPath, 'utf8');
        await pool.query(migration);
        console.log('Migration additions applied.');
      }
    } catch (migErr) {
      console.error('Migration warning (non-fatal):', migErr.message);
    }

    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const needsSeed = parseInt(userCount.rows[0].count, 10) === 0;

    await pool.end();

    if (needsSeed) {
      console.log('Seeding database with initial data...');
      require('../src/utils/seed');
      return;
    }

    console.log('Database already seeded, skipping.');
  } catch (err) {
    console.error('Database initialization error:', err.message);
    console.error('Server will start, but DB queries may fail.');
    await pool.end().catch(() => {});
  }
}

initDatabase();
