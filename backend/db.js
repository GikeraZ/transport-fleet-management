require('dotenv').config();
const { Pool } = require('pg');

const DB_USER = process.env.DB_USER || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME || 'fleet_management';
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 5432;

if (!DB_PASSWORD) {
  console.warn('⚠ DB_PASSWORD is not set in .env. Using default (not recommended for production).');
}

const pool = new Pool({
  user: DB_USER,
  host: DB_HOST,
  database: DB_NAME,
  password: DB_PASSWORD || 'postgres',
  port: DB_PORT,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
  allowExitOnIdle: true,
  statement_timeout: 30000,
  query_timeout: 30000,
});

pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database connection error:', err.message);
});

// Test connection immediately (non-fatal)
pool.query('SELECT NOW() as db_time', (err, res) => {
  if (err) {
    console.error('❌ Database connection test FAILED:', err.message);
    console.error('   Ensure PostgreSQL is running and credentials in .env are correct.');
    console.error('   Server will start but database queries will fail until PostgreSQL is available.');
  } else {
    console.log(`✓ Database connection test PASSED at ${res.rows[0].db_time}`);
    console.log(`  Database: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}`);
  }
});

module.exports = pool;