// Local-development database: SQLite through Node's built-in `node:sqlite` (Node 22.13+ / 24).
// Gives the same interface as mysql2's promise pool, so the rest of the code works unchanged.
// Production (cPanel) keeps using MySQL — set DB_CLIENT=mysql there.
const fs = require('fs');
const path = require('path');

function loadDriver() {
  try {
    return require('node:sqlite');
  } catch (e) {
    const err = new Error(
      `Local SQLite mode needs Node.js 22.13 or newer (you have ${process.version}). ` +
      'Install Node.js 22/24 LTS from nodejs.org, or install MySQL (XAMPP) and set DB_CLIENT=mysql in backend/.env.'
    );
    err.cause = e;
    throw err;
  }
}

/** MySQL CREATE TABLE → SQLite */
function convert(sql) {
  if (!/^\s*CREATE TABLE/i.test(sql)) return sql;
  return sql
    .replace(/INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/\)\s*ENGINE=[^;]*$/s, ')')
    .replace(/,\s*UNIQUE KEY \w+ \(([^)]+)\)/g, ', UNIQUE ($1)')
    .replace(/,\s*KEY \w+ \(([^)]+)\)/g, '')
    .replace(/INT UNSIGNED/g, 'INTEGER');
}

/** Expand `IN (?)` arrays and normalise values the way mysql2 does */
function expand(sql, params) {
  const out = [];
  let i = 0;
  const text = sql.replace(/\?/g, () => {
    const p = params[i++];
    if (Array.isArray(p)) {
      out.push(...p);
      return p.length ? p.map(() => '?').join(', ') : 'NULL';
    }
    if (p === undefined) out.push(null);
    else if (typeof p === 'boolean') out.push(p ? 1 : 0);
    else if (p instanceof Date) out.push(p.toISOString().slice(0, 19).replace('T', ' '));
    else if (p !== null && typeof p === 'object' && !Buffer.isBuffer(p)) out.push(JSON.stringify(p));
    else out.push(p);
    return '?';
  });
  return [text, out];
}

function createPool(file) {
  const { DatabaseSync } = loadDriver();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

  const run = (sql, params = []) => {
    const [text, values] = expand(convert(sql), params || []);
    if (/^\s*(SELECT|WITH|PRAGMA)/i.test(text)) {
      return [db.prepare(text).all(...values).map((r) => ({ ...r }))];
    }
    const r = db.prepare(text).run(...values);
    return [{ insertId: Number(r.lastInsertRowid), affectedRows: Number(r.changes) }];
  };

  // One connection; transactions are serialised with a small lock
  let lock = Promise.resolve();
  const getConnection = async () => {
    let release;
    const previous = lock;
    lock = new Promise((r) => { release = r; });
    await previous;
    return {
      query: async (sql, params) => run(sql, params),
      beginTransaction: async () => db.exec('BEGIN'),
      commit: async () => db.exec('COMMIT'),
      rollback: async () => db.exec('ROLLBACK'),
      release: () => release(),
    };
  };

  return {
    query: async (sql, params) => run(sql, params),
    getConnection,
    end: async () => db.close(),
    isSqlite: true,
    hasTable: (name) => !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name),
  };
}

module.exports = { createPool };
