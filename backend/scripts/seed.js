// Fills the shop with categories, a starter catalog of real products, sliders and settings.
// Usage: npm run seed            (only runs when there are no products yet)
//        npm run seed -- --force (adds demo data anyway)
const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const { slugify } = require('../src/utils/helpers');
const { saveGroup } = require('../src/services/settings');
const demo = require('./demo-data');

// Looks for an image under uploads/<folder>/ and returns its public URL (or null if it isn't there).
const fileUrl = (folder, name) => {
  const file = path.join(__dirname, '..', 'uploads', folder, name);
  return fs.existsSync(file) ? `/uploads/${folder}/${name}` : null;
};
const img = (name) => fileUrl('demo', name);
const banner = (name) => fileUrl('banners', name);

async function seed({ close = true, force = process.argv.includes('--force') } = {}) {
  const count = (await db.one('SELECT COUNT(*) AS c FROM products')).c;
  if (count > 0 && !force) {
    console.log('Products already exist — skipping demo data (use --force to add anyway).');
    if (close) await db.pool.end();
    return;
  }
  const now = db.now();

  // Settings
  await saveGroup('general', {
    site_title: 'My Shop',
    tagline: 'Trusted Source for 100% Original Products',
    logo: img('logo.png') || '',
    phone: '+8801700000000',
    whatsapp: '+8801700000000',
    email: 'support@yourshop.com',
    address: 'House 1, Road 1, Dhanmondi, Dhaka-1205',
    fb_link: 'https://facebook.com/',
    copyright: '© My Shop. All rights reserved.',
    meta_description: 'Buy 100% original electronics, home & kitchen appliances and fashion at the best price in Bangladesh. Cash on delivery nationwide.',
    about_title: 'About My Shop',
    about_text: 'My Shop is an online and physical retailer specializing in authentic electronics, home appliances and lifestyle products. We deliver all over Bangladesh with cash on delivery, easy returns and after-sales service.',
    about_image: '', // empty → the home page shows a shelf of your products; upload a shop photo in Settings to replace it
  });

  // Brands
  const brandIds = {};
  for (const name of demo.brands) {
    brandIds[name] = await db.insert('brands', { name, slug: slugify(name), created_at: now });
  }

  // Categories
  const catIds = {};
  let order = 0;
  for (const c of demo.categories) {
    catIds[c.slug] = await db.insert('categories', {
      name: c.name, slug: c.slug, image: banner(`cat-${c.slug}-v2.webp`) || img(`c-${c.slug}.webp`), featured: c.featured || 0, show_on_home: c.show_on_home || 0, sort_order: order++, created_at: now,
    });
    for (const ch of c.children || []) {
      catIds[ch.slug] = await db.insert('categories', {
        name: ch.name, slug: ch.slug, parent_id: catIds[c.slug], image: banner(`cat-${ch.slug}-v2.webp`) || img(`c-${ch.slug}.webp`),
        featured: ch.featured || 0, show_on_home: ch.show_on_home || 0, sort_order: order++, created_at: now,
      });
    }
  }

  // Products (simple + variable) from the starter catalog
  const productIds = {};
  for (const p of demo.products) {
    const slug = demo.slugify(p.name);
    const photo = fileUrl('products', `${slug}.webp`);
    const variants = demo.variantsOf(p);
    const sell = p.sale > 0 ? p.sale : p.regular;
    const id = await db.insert('products', {
      name: p.name, slug, sku: p.sku, type: variants.length ? 'variable' : 'simple',
      short_des: p.summary, long_des: demo.describe(p),
      purchase_price: Math.round(sell * 0.88), regular_price: p.regular, sale_price: p.sale,
      qty: variants.length ? variants.reduce((t, v) => t + v.qty, 0) : p.qty,
      brand_id: brandIds[p.brand], thumbnail: photo, images: JSON.stringify([photo].filter(Boolean)),
      attributes: JSON.stringify(Object.entries(p.options || {}).map(([name, values]) => ({ name, values }))),
      meta_title: `${p.name} Price in Bangladesh`, meta_description: p.summary,
      status: 'published', created_at: now, updated_at: now,
    });
    await db.query('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)', [id, catIds[p.category]]);
    for (const v of variants) {
      await db.insert('product_variants', {
        product_id: id, name: v.name, attrs: JSON.stringify(v.attrs), sku: v.sku, qty: v.qty,
        purchase_price: Math.round(sell * 0.88), regular_price: v.regular_price, sale_price: v.sale_price,
      });
    }
    productIds[p.sku] = { id, slug, photo };
  }

  // Attributes
  await db.insert('attributes', { name: 'Size', options: JSON.stringify(['38', '39', '40', '41', '42', '43', '44', 'S', 'M', 'L', 'XL', 'XXL']), created_at: now });
  await db.insert('attributes', { name: 'Color', options: JSON.stringify(['Black', 'White', 'Red', 'Blue', 'Green']), created_at: now });

  // Sliders & banners
  const slugOf = (sku) => (productIds[sku] ? productIds[sku].slug : '');
  const heroes = [
    ['Smart TV Fest', 'tv', '/category/television'],
    ['Summer Cooling', 'cooling', '/category/fan-cooler'],
    ['Kitchen Essentials', 'kitchen', '/category/kitchen-appliance'],
  ];
  let pos = 1;
  for (const [title, key, link] of heroes) {
    const desktop = banner(`hero-${key}-v2.webp`) || img(`hero-${pos}.webp`);
    if (desktop) await db.insert('sliders', { type: 'image', position: 'hero', title, link, desktop_media: desktop, mobile_media: banner(`hero-${key}-v2-m.webp`) || img(`hero-${pos}-m.webp`), sort_order: pos, status: 1, created_at: now });
    pos++;
  }
  const promos = [
    ['Apex Leather Loafer', 'promo-loafer-v2.webp', `/product/${slugOf('91315A72')}`],
    ['Walton 380L Inverter Refrigerator', 'promo-fridge-v2.webp', `/product/${slugOf('WFC-3F5-GDEL-XX')}`],
  ];
  pos = 1;
  for (const [title, file, link] of promos) {
    const media = banner(file) || img(`banner-${pos}.webp`);
    if (media) await db.insert('sliders', { type: 'image', position: 'banner', title, link, desktop_media: media, sort_order: pos, status: 1, created_at: now });
    pos++;
  }

  // Header menu: top categories with children
  const items = demo.categories.map((c) => ({
    label: c.name, url: `/category/${c.slug}`,
    children: (c.children || []).map((ch) => ({ label: ch.name, url: `/category/${ch.slug}` })),
  }));
  await db.query('UPDATE menus SET items = ? WHERE location = ?', [JSON.stringify(items), 'header']);

  // Coupon & a landing page
  await db.insert('coupons', { code: 'WELCOME10', type: 'percent', discount: 10, max_discount: 500, min_purchase: 1000, status: 1, product_ids: '[]', created_at: now });
  await db.insert('campaigns', {
    title: 'Summer Offer — Vision 16" Rechargeable Table Fan', slug: 'summer-fan-offer', product_id: productIds['VIS-RTF-16'].id, image: banner('hero-cooling-v2.webp') || img('hero-2.webp'), status: 1, created_at: now,
    content: JSON.stringify({
      subtitle: 'Beat the heat even during load-shedding', regular_price: 'Regular price', offer_price: 'Offer price', order_now: 'অর্ডার করুন',
      gallery: { heading: 'See it in action', text: 'Runs up to 8 hours on a single charge.' },
      about: { heading: 'Why you will love it', body: 'Silent motor, 3 speed levels, LED light and USB charging.', video_url: '' },
      review_section_heading: 'Customer reviews', order_form_heading: 'অর্ডার করতে নিচের ফর্মটি পূরণ করুন',
      colors: { primary_color: '#FC6D04', primary_text: '#ffffff' },
    }),
    carousel: JSON.stringify([productIds['VIS-RTF-16'].photo].filter(Boolean)),
    reviews: JSON.stringify([{ name: 'Rahim', text: 'Excellent fan, battery backup is great!' }, { name: 'Karim', text: 'Fast delivery, original product.' }]),
  });

  console.log(`✓ Starter data added: ${demo.products.length} products, ${Object.keys(catIds).length} categories`);
  if (close) await db.pool.end();
}

module.exports = seed;

if (require.main === module) {
  seed().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
}
