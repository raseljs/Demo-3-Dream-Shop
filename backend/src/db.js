const config = require('./config');

const pool = config.dbClient === 'sqlite'
  ? require('./sqlite').createPool(config.sqliteFile)
  : require('mysql2/promise').createPool({
    ...config.db,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    dateStrings: true,
    decimalNumbers: true,
    multipleStatements: false,
  });

/** Run a query. SELECT → rows array; INSERT/UPDATE/DELETE → { insertId, affectedRows } */
async function query(sql, params = [], conn = pool) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

async function one(sql, params = [], conn = pool) {
  const rows = await query(sql, params, conn);
  return rows[0] || null;
}

const col = (k) => '`' + k + '`';

async function insert(table, data, conn = pool) {
  const keys = Object.keys(data);
  const r = await query(
    `INSERT INTO ${table} (${keys.map(col).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
    keys.map((k) => data[k]),
    conn
  );
  return r.insertId;
}

async function update(table, id, data, conn = pool) {
  const keys = Object.keys(data);
  if (!keys.length) return 0;
  const r = await query(
    `UPDATE ${table} SET ${keys.map((k) => col(k) + ' = ?').join(', ')} WHERE id = ?`,
    [...keys.map((k) => data[k]), id],
    conn
  );
  return r.affectedRows;
}

async function remove(table, id, conn = pool) {
  const r = await query(`DELETE FROM ${table} WHERE id = ?`, [id], conn);
  return r.affectedRows;
}

/** Run fn(conn) inside a transaction. */
async function tx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    try { await conn.rollback(); } catch (_) { /* ignore */ }
    throw e;
  } finally {
    conn.release();
  }
}

/** Current local (Bangladesh) time as 'YYYY-MM-DD HH:MM:SS' */
function now(offsetDays = 0) {
  const d = new Date(Date.now() + config.tzOffsetHours * 3600e3 + offsetDays * 86400e3);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
const today = (offsetDays = 0) => now(offsetDays).slice(0, 10);

module.exports = { pool, query, one, insert, update, remove, tx, now, today };
