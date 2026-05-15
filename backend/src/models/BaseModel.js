const pool = require('../../db');

class BaseModel {
  constructor(table) {
    this.table = table;
  }

  async findById(id) {
    const result = await pool.query(`SELECT * FROM ${this.table} WHERE id = $1`, [id]);
    return result.rows[0];
  }

  async findAll(filters = {}) {
    let query = `SELECT * FROM ${this.table} WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }
    if (filters.search) {
      const search = `%${filters.search}%`;
      query += ` AND (license_plate ILIKE $${paramIndex} OR make ILIKE $${paramIndex} OR model ILIKE $${paramIndex})`;
      values.push(search);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(filters.limit);
      paramIndex++;
    }
    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(filters.offset);
      paramIndex++;
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const result = await pool.query(
      `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const updates = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    const result = await pool.query(
      `UPDATE ${this.table} SET ${updates}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }

  async delete(id) {
    const result = await pool.query(`DELETE FROM ${this.table} WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0];
  }

  async count(filters = {}) {
    let query = `SELECT COUNT(*) FROM ${this.table} WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }
}

module.exports = BaseModel;