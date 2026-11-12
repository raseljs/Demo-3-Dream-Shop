// Creates all tables, the Admin role & first admin user, default menus and pages.
// Safe to run many times.  Usage: npm run migrate
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const db = require('../src/db');
const { hashPassword } = require('../src/utils/auth');

const DEFAULT_PAGES = [
  ['About Us', 'about-us'],
  ['Terms & Conditions', 'terms'],
  ['Privacy Policy', 'privacy-policy'],
  ['FAQs', 'faqs'],
  ['Refund Policy', 'refund-policy'],
  ['Store Locations', 'outlets'],
];

async function migrate({ close = true, quiet = false } = {}) {
  const log = (...a) => { if (!quiet) console.log(...a); };
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  for (const stmt of sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    await db.query(stmt);
  }
  log('✓ Tables ready');

  let admin = await db.one("SELECT id FROM roles WHERE permissions LIKE '%\"*\"%' LIMIT 1");
  if (!admin) {
    const id = await db.insert('roles', { name: 'Admin', permissions: JSON.stringify(['*']), created_at: db.now() });
    admin = { id };
    await db.insert('roles', { name: 'Manager', permissions: JSON.stringify(['dashboard', 'pos', 'products', 'catalog', 'orders', 'returns', 'reports', 'reviews']), created_at: db.now() });
    await db.insert('roles', { name: 'Order Executive', permissions: JSON.stringify(['dashboard', 'pos', 'orders']), created_at: db.now() });
    log('✓ Roles created (Admin, Manager, Order Executive)');
  }

  const hasStaff = await db.one('SELECT id FROM users WHERE is_staff = 1 LIMIT 1');
  if (!hasStaff) {
    await db.insert('users', {
      name: config.admin.name, phone: config.admin.phone, password: hashPassword(config.admin.password),
      role_id: admin.id, is_staff: 1, is_verified: 1, status: 1, created_at: db.now(),
    });
    console.log(`✓ Admin user created → phone: ${config.admin.phone}  password: ${config.admin.password}  (change it after login!)`);
  }

  for (const [title, slug] of DEFAULT_PAGES) {
    if (!(await db.one('SELECT id FROM pages WHERE slug = ?', [slug]))) {
      await db.insert('pages', { title, slug, content: `<p>Write your ${title} here from Admin → Pages.</p>`, status: 1, created_at: db.now() });
    }
  }

  const menus = [
    ['Header Menu', 'header', []],
    ['Footer — Know Us', 'footer_1', DEFAULT_PAGES.slice(0, 4).map(([label, slug]) => ({ label, url: `/${slug}` }))],
    ['Footer — Shopping Information', 'footer_2', [{ label: 'Refund Policy', url: '/refund-policy' }, { label: 'Store Locations', url: '/outlets' }, { label: 'Track Order', url: '/track-order' }]],
  ];
  for (const [name, location, items] of menus) {
    if (!(await db.one('SELECT id FROM menus WHERE location = ?', [location]))) {
      await db.insert('menus', { name, location, items: JSON.stringify(items), created_at: db.now() });
    }
  }
  if (!(await db.one('SELECT id FROM expense_categories LIMIT 1'))) {
    for (const n of ['Salary', 'Rent', 'Marketing', 'Utility', 'Others']) await db.insert('expense_categories', { name: n, created_at: db.now() });
  }
  log('✓ Default pages, menus & expense categories ready');
  if (close) await db.pool.end();
}

module.exports = migrate;

if (require.main === module) {
  migrate().catch((e) => {
    console.error('Migration failed:', e.message);
    process.exit(1);
  });
}
