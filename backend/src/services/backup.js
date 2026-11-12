// Database backups: one compressed file per backup in backend/backups/, the newest kept, older removed.
//  - SQLite (local): an exact copy of the database file (.sqlite.gz)
//  - MySQL (cPanel): a SQL dump that can be imported in phpMyAdmin (.sql.gz)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const config = require('../config');
const db = require('../db');
const { getSettings } = require('./settings');

const DIR = path.join(__dirname, '..', '..', 'backups');
const NAME = /^backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.(sqlite|sql)\.gz$/;

function list() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => NAME.test(f)).map((f) => {
    const st = fs.statSync(path.join(DIR, f));
    return { file: f, size: st.size, created_at: f.slice(7, 26).replace('_', ' ').replace(/-(\d{2})-(\d{2})$/, ':$1:$2') };
  }).sort((a, b) => (a.file < b.file ? 1 : -1));
}

const fileFor = (name) => {
  if (!NAME.test(name)) return null;
  const p = path.join(DIR, name);
  return fs.existsSync(p) ? p : null;
};

function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (Buffer.isBuffer(v)) return `X'${v.toString('hex')}'`;
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\0/g, '\\0')}'`;
}

async function mysqlDump(out) {
  out.write(`-- Shop database backup ${db.now()}\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`);
  const tables = (await db.query('SHOW TABLES')).map((r) => Object.values(r)[0]);
  for (const t of tables) {
    const create = await db.one(`SHOW CREATE TABLE \`${t}\``);
    out.write(`DROP TABLE IF EXISTS \`${t}\`;\n${create['Create Table']};\n\n`);
    for (let offset = 0; ; offset += 500) {
      const rows = await db.query(`SELECT * FROM \`${t}\` LIMIT 500 OFFSET ${offset}`);
      if (!rows.length) break;
      const cols = Object.keys(rows[0]).map((c) => `\`${c}\``).join(', ');
      out.write(`INSERT INTO \`${t}\` (${cols}) VALUES\n${rows.map((r) => `(${Object.values(r).map(sqlValue).join(', ')})`).join(',\n')};\n`);
      if (rows.length < 500) break;
    }
    out.write('\n');
  }
  out.write('SET FOREIGN_KEY_CHECKS = 1;\n');
}

async function prune(keepDays) {
  const keep = Math.max(1, Number(keepDays) || 7);
  for (const b of list().slice(keep)) fs.unlinkSync(path.join(DIR, b.file));
}

async function createBackup() {
  fs.mkdirSync(DIR, { recursive: true });
  const stamp = db.now().replace(' ', '_').replace(/:/g, '-');
  const isSqlite = config.dbClient === 'sqlite';
  const file = path.join(DIR, `backup-${stamp}.${isSqlite ? 'sqlite' : 'sql'}.gz`);
  if (isSqlite) {
    const tmp = path.join(DIR, `tmp-${Date.now()}.sqlite`);
    await db.query(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    await new Promise((ok, bad) => fs.createReadStream(tmp).pipe(zlib.createGzip()).pipe(fs.createWriteStream(file)).on('finish', ok).on('error', bad));
    fs.unlinkSync(tmp);
  } else {
    const gz = zlib.createGzip();
    const done = new Promise((ok, bad) => gz.pipe(fs.createWriteStream(file)).on('finish', ok).on('error', bad));
    await mysqlDump(gz);
    gz.end();
    await done;
  }
  const { backup } = await getSettings();
  await prune(backup.keep_days);
  return list().find((b) => file.endsWith(b.file));
}

/** Called every few minutes: makes the daily backup once the chosen hour has passed. */
async function dailyCheck() {
  const { backup } = await getSettings();
  if (!Number(backup.auto_backup)) return;
  const nowStr = db.now();
  const hour = Number(nowStr.slice(11, 13));
  if (hour < Number(backup.backup_hour || 3)) return;
  const today = nowStr.slice(0, 10);
  if (list().some((b) => b.created_at.startsWith(today))) return;
  await createBackup();
  console.log('[backup] daily backup created');
}

module.exports = { list, fileFor, createBackup, dailyCheck, DIR };
