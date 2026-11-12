// Starter catalog used by `npm run seed`: real products sold in Bangladesh (brand, model, key specs).
// Prices were checked against Bangladeshi retailers in November 2026 — update them from the admin panel
// before going live. Product photos are illustrations; replace them with your own/supplier photos in
// Admin → Products → Edit.
const categories = [
  { name: 'Electronics', slug: 'electronics', featured: 1, children: [
    { name: 'Television', slug: 'television', featured: 1, show_on_home: 1 },
    { name: 'Fan & Cooler', slug: 'fan-cooler', featured: 1, show_on_home: 1 },
    { name: 'Refrigerator', slug: 'refrigerator', featured: 1, show_on_home: 1 },
  ] },
  { name: 'Kitchen Appliance', slug: 'kitchen-appliance', featured: 1, children: [
    { name: 'Rice Cooker', slug: 'rice-cooker', featured: 1 },
    { name: 'Gas Stove', slug: 'gas-stove', featured: 1, show_on_home: 1 },
    { name: 'Blender & Mixer', slug: 'blender-mixer', featured: 1, show_on_home: 1 },
  ] },
  { name: 'Fashion', slug: 'fashion', featured: 1, children: [
    { name: 'Men Shoes', slug: 'men-shoes', featured: 1, show_on_home: 1 },
  ] },
  { name: 'Health & Beauty', slug: 'health-beauty', featured: 1 },
];

const brands = ['Walton', 'Xiaomi', 'Samsung', 'Sony', 'Vision', 'Miyako', 'Gazi', 'Jaipan', 'Philips', 'Apex'];

/*
 * name, category (slug), brand, sku (model), regular / sale price (sale 0 = no discount), qty,
 * art + color (illustration), summary, features, specs.
 * Products with `options` are variable products (one variant per size/colour combination).
 */
const products = [
  // ── Television ──────────────────────────────────────────────
  {
    name: 'Walton W32S3EG 32" HD Google TV', category: 'television', brand: 'Walton', sku: 'W32S3EG',
    regular: 23500, sale: 22490, qty: 15, art: 'tv', color: '#1d4ed8',
    summary: 'A 32-inch HD smart TV from Walton running Google TV, with Dolby Audio sound. A good size for bedrooms and small living rooms.',
    features: ['Google TV with streaming apps built in', 'Dolby Audio sound', 'HD LED display', 'Official Walton warranty'],
    specs: [['Brand', 'Walton'], ['Model', 'W32S3EG'], ['Screen size', '32 inch'], ['Resolution', 'HD'], ['Smart platform', 'Google TV'], ['Audio', 'Dolby Audio']],
  },
  {
    name: 'Xiaomi TV A 43" FHD 2025 Google TV', category: 'television', brand: 'Xiaomi', sku: 'TV-A43-FHD-2025',
    regular: 39990, sale: 32990, qty: 10, art: 'tv', color: '#ea580c',
    summary: 'Xiaomi\'s 2025 TV A in 43 inches: a Full HD Google TV with a bezel-less metal frame and Dolby Audio + DTS sound.',
    features: ['Full HD (1920 × 1080) LED panel', 'Google TV with Netflix, YouTube and Play Store apps', 'Dolby Audio and DTS sound', 'Bezel-less metallic frame'],
    specs: [['Brand', 'Xiaomi'], ['Model', 'TV A 43 FHD (2025)'], ['Screen size', '43 inch'], ['Resolution', '1920 × 1080 (Full HD)'], ['Refresh rate', '60 Hz'], ['Colours', '1.07 billion'], ['Viewing angle', '178°'], ['Smart platform', 'Google TV']],
  },
  {
    name: 'Samsung 43U8000F 43" 4K UHD Smart TV', category: 'television', brand: 'Samsung', sku: '43U8000F',
    regular: 53900, sale: 48510, qty: 8, art: 'tv', color: '#0f766e',
    summary: 'Samsung\'s 43-inch 4K UHD smart TV, powered by the Crystal Processor 4K for sharp, colourful pictures.',
    features: ['4K UHD resolution (3840 × 2160)', 'Crystal Processor 4K', 'Slim, minimalist design', 'Official Samsung warranty'],
    specs: [['Brand', 'Samsung'], ['Model', '43U8000F'], ['Screen size', '43 inch'], ['Resolution', '3840 × 2160 (4K UHD)'], ['Refresh rate', '50 Hz'], ['Processor', 'Crystal Processor 4K']],
  },
  {
    name: 'Sony BRAVIA 3 K-55S30 55" 4K Google TV', category: 'television', brand: 'Sony', sku: 'K-55S30',
    regular: 119000, sale: 109000, qty: 4, art: 'tv', color: '#7c3aed',
    summary: 'A 55-inch Sony BRAVIA 3 with 4K HDR Processor X1 and Google TV: big-screen 4K for the living room.',
    features: ['55-inch 4K UHD display', '4K HDR Processor X1', 'Google TV', 'Dolby Audio and Dolby Atmos support'],
    specs: [['Brand', 'Sony'], ['Model', 'K-55S30 (BRAVIA 3)'], ['Screen size', '55 inch'], ['Resolution', '3840 × 2160 (4K UHD)'], ['Processor', '4K HDR Processor X1'], ['Smart platform', 'Google TV']],
  },

  // ── Fan & Cooler ────────────────────────────────────────────
  {
    name: 'Walton WCF5601 EM 56" Ceiling Fan', category: 'fan-cooler', brand: 'Walton', sku: 'WCF5601-EM',
    regular: 4225, sale: 3735, qty: 40, art: 'ceilingfan', color: '#cbd5e1',
    summary: 'A classic 56-inch Walton ceiling fan for medium to large rooms.',
    features: ['56-inch (1400 mm) sweep', '310 RPM', 'Air delivery up to 240 m³/min', 'Official Walton warranty'],
    specs: [['Brand', 'Walton'], ['Model', 'WCF5601 EM'], ['Size', '56 inch (1400 mm)'], ['Speed', '310 RPM'], ['Voltage', '220 V'], ['Air delivery', '240 m³/min']],
  },
  {
    name: 'Walton Super Saver-IR 56" BLDC Ceiling Fan', category: 'fan-cooler', brand: 'Walton', sku: 'SUPER-SAVER-IR',
    regular: 6490, sale: 5511, qty: 25, art: 'ceilingfan', color: '#a16207',
    summary: 'Energy-saving 56-inch ceiling fan with a BLDC motor that runs on a wide voltage range.',
    features: ['BLDC motor uses far less power than a regular fan', 'Works from 90–300 V AC', 'Power factor 0.996', 'Class H insulation'],
    specs: [['Brand', 'Walton'], ['Model', 'Super Saver-IR'], ['Size', '56 inch'], ['Motor', 'BLDC (90–300 V AC)'], ['Frequency', '50 Hz'], ['Power factor', '0.996'], ['Service value', '6.5 m³/min/W']],
  },
  {
    name: 'Vision 16" Rechargeable Table Fan', category: 'fan-cooler', brand: 'Vision', sku: 'VIS-RTF-16',
    regular: 6050, sale: 5203, qty: 30, art: 'tablefan', color: '#0284c7',
    summary: 'A 16-inch rechargeable table fan from Vision that keeps running during load-shedding, with solar input and a USB output.',
    features: ['4-step speed control', '5 V USB output to charge a phone', '12 V solar input', '30-minute timer'],
    specs: [['Brand', 'Vision'], ['Size', '16 inch'], ['Colour', 'White'], ['Speed control', '4 step'], ['USB output', '5 V'], ['Solar input', '12 V'], ['Timer', '30 min']],
  },
  {
    name: 'Walton Air Cooler 40L', category: 'fan-cooler', brand: 'Walton', sku: 'WALTON-AC-40L',
    regular: 15990, sale: 14780, qty: 6, art: 'cooler', color: '#0e7490',
    summary: 'A Walton evaporative air cooler with a large 40-litre water tank for long cooling sessions.',
    features: ['40-litre water tank', 'Evaporative cooling with much lower power use than an AC', 'Suitable for rooms and small offices', 'Official Walton warranty'],
    specs: [['Brand', 'Walton'], ['Type', 'Evaporative air cooler'], ['Water tank', '40 L']],
  },

  // ── Refrigerator ────────────────────────────────────────────
  {
    name: 'Walton WFC-3F5-GDEL-XX 380L Inverter Refrigerator', category: 'refrigerator', brand: 'Walton', sku: 'WFC-3F5-GDEL-XX',
    regular: 53090, sale: 47781, qty: 6, art: 'fridge', color: '#9f1239',
    summary: 'A large 380-litre Walton direct-cool refrigerator with an inverter compressor and a tempered glass door.',
    features: ['Intelligent inverter compressor saves electricity', 'Real tempered glass door', 'Eco-friendly R600a refrigerant', '5-star energy rating'],
    specs: [['Brand', 'Walton'], ['Model', 'WFC-3F5-GDEL-XX (Inverter)'], ['Type', 'Direct cool'], ['Gross volume', '380 L'], ['Net volume', '365 L'], ['Refrigerant', 'R600a'], ['Dimensions', '650 × 650 × 1860 mm'], ['Weight', '67 kg']],
  },
  {
    name: 'Walton WFC-3X7-GDEH-XX 307L Refrigerator', category: 'refrigerator', brand: 'Walton', sku: 'WFC-3X7-GDEH-XX',
    regular: 47190, sale: 42470, qty: 7, art: 'fridge', color: '#1e3a8a',
    summary: 'A 307-litre Walton top-freezer refrigerator with an inverter compressor and wide-voltage design.',
    features: ['Inverter technology', 'Runs from 150–260 V, no stabiliser needed', 'Tempered glass door', 'CFC/HCFC-free (CycloPentane insulation)'],
    specs: [['Brand', 'Walton'], ['Model', 'WFC-3X7-GDEH-XX'], ['Type', 'Direct cool, top freezer'], ['Gross volume', '307 L'], ['Net volume', '301 L'], ['Voltage range', '150–260 V'], ['Refrigerant', 'R600a']],
  },
  {
    name: 'Samsung RT35CG5420B1D2 348L Top Mount Refrigerator', category: 'refrigerator', brand: 'Samsung', sku: 'RT35CG5420B1D2',
    regular: 99360, sale: 92000, qty: 3, art: 'fridge2', color: '#334155',
    summary: 'A 348-litre two-door Samsung top-mount refrigerator with all-around cooling.',
    features: ['348-litre capacity for a family of 4–5', 'All-around cooling', 'Two-door top-mount design', 'Official Samsung warranty'],
    specs: [['Brand', 'Samsung'], ['Model', 'RT35CG5420B1D2'], ['Type', 'Top mount, 2 door'], ['Capacity', '348 L']],
  },

  // ── Rice Cooker ─────────────────────────────────────────────
  {
    name: 'Miyako MRC-1280 JPN Rice Cooker 2.8L', category: 'rice-cooker', brand: 'Miyako', sku: 'MRC-1280-JPN',
    regular: 4500, sale: 3700, qty: 35, art: 'rice', color: '#b91c1c',
    summary: 'A 2.8-litre Miyako rice cooker, enough for a large family, with automatic keep-warm.',
    features: ['2.8-litre capacity', 'One-touch cooking with keep-warm', 'Easy-clean inner pot', '12 months official warranty'],
    specs: [['Brand', 'Miyako'], ['Model', 'MRC-1280 JPN'], ['Capacity', '2.8 L'], ['Warranty', '12 months']],
  },
  {
    name: 'Miyako ASL-1280-KND-SS Rice Cooker 2.8L', category: 'rice-cooker', brand: 'Miyako', sku: 'ASL-1280-KND-SS',
    regular: 4700, sale: 3900, qty: 20, art: 'rice', color: '#94a3b8',
    summary: 'Miyako 2.8-litre rice cooker with a steel-finish body.',
    features: ['2.8-litre capacity', 'Automatic cook and keep-warm', 'Steel-finish body', 'Official Miyako warranty'],
    specs: [['Brand', 'Miyako'], ['Model', 'ASL-1280-KND-SS'], ['Capacity', '2.8 L']],
  },

  // ── Gas Stove ───────────────────────────────────────────────
  {
    name: 'Walton WGS-ZENFLAME Glass Top Double Burner Gas Stove', category: 'gas-stove', brand: 'Walton', sku: 'WGS-ZENFLAME',
    regular: 5890, sale: 5150, qty: 20, art: 'stove', color: '#111827',
    summary: 'A double-burner Walton gas stove with a tempered glass top that works with both LPG and line gas.',
    features: ['Two burners', 'Tempered glass top', 'Works with LPG or natural gas (NG)', '12 months brand warranty'],
    specs: [['Brand', 'Walton'], ['Model', 'WGS-ZENFLAME'], ['Burners', '2'], ['Top', 'Tempered glass'], ['Gas type', 'LPG / NG']],
  },
  {
    name: 'Walton WGS-Sweety Double Glass Top Gas Stove', category: 'gas-stove', brand: 'Walton', sku: 'WGS-SWEETY-DOUBLE',
    regular: 4390, sale: 3949, qty: 25, art: 'stove', color: '#7f1d1d',
    summary: 'An affordable Walton double-burner gas stove with a tempered glass top and dual-fuel support.',
    features: ['Two burners', 'Tempered glass top', 'LPG or NG', 'Easy to clean'],
    specs: [['Brand', 'Walton'], ['Model', 'WGS-Sweety Double'], ['Burners', '2'], ['Top', 'Tempered glass'], ['Gas type', 'LPG / NG']],
  },
  {
    name: 'Gazi Smiss TG-202 Tempered Glass Double Burner Gas Stove', category: 'gas-stove', brand: 'Gazi', sku: 'TG-202',
    regular: 9600, sale: 8159, qty: 10, art: 'stove', color: '#1e293b',
    summary: 'Gazi Smiss double-burner LPG stove with a tempered glass top and auto ignition.',
    features: ['Auto ignition', 'Tempered glass top', 'Two burners', 'For LPG cylinders'],
    specs: [['Brand', 'Gazi'], ['Model', 'Smiss TG-202'], ['Burners', '2'], ['Top', 'Tempered glass'], ['Gas type', 'LPG'], ['Ignition', 'Auto']],
  },

  // ── Blender & Mixer ─────────────────────────────────────────
  {
    name: 'Jaipan Family Mate 1000W 3 Jar Mixer Grinder', category: 'blender-mixer', brand: 'Jaipan', sku: 'JFMMG-2020',
    regular: 6000, sale: 4799, qty: 18, art: 'mixer', color: '#15803d',
    summary: 'Jaipan Family Mate: a 1000-watt mixer grinder with three jars, including a juicer, for spices, pastes and juice.',
    features: ['1000 W motor', '3 jars including a juicer jar', '2-litre jar capacity', '12 months warranty'],
    specs: [['Brand', 'Jaipan'], ['Model', 'JFMMG-2020'], ['Power', '1000 W'], ['Jars', '3'], ['Capacity', '2 L'], ['Colour', 'Green']],
  },
  {
    name: 'Jaipan Fruttica 1000W 4-in-1 Mixer Grinder', category: 'blender-mixer', brand: 'Jaipan', sku: 'FRUTTICA-1000',
    regular: 7200, sale: 5599, qty: 12, art: 'mixer', color: '#c2410c',
    summary: 'Jaipan Fruttica 4-in-1 mixer grinder with stainless steel jars and a juicer: one machine for grinding, blending and juicing.',
    features: ['1000 W motor', '4-in-1 with juicer', 'Stainless steel jars', '1 year warranty'],
    specs: [['Brand', 'Jaipan'], ['Model', 'Fruttica'], ['Power', '1000 W'], ['Jars', '4-in-1 (with juicer)']],
  },
  {
    name: 'Philips HL7757/01 750W 3 Jar Mixer Grinder', category: 'blender-mixer', brand: 'Philips', sku: 'HL7757/01',
    regular: 7020, sale: 6500, qty: 14, art: 'mixer', color: '#1d4ed8',
    summary: 'Philips HL7757 mixer grinder with a 750 W turbo motor and three jars for everyday cooking.',
    features: ['750 W turbo motor', '3 jars', '3 speeds plus pulse', 'Up to 18,000 RPM'],
    specs: [['Brand', 'Philips'], ['Model', 'HL7757/01'], ['Power', '750 W'], ['Jars', '3'], ['Large jar', '1.5 L'], ['Speed', '3 + pulse'], ['Voltage', '230 V']],
  },

  // ── Men Shoes (variable products) ───────────────────────────
  {
    name: 'Apex Men\'s Leather Casual Loafer', category: 'men-shoes', brand: 'Apex', sku: '91315A72',
    regular: 3990, sale: 0, art: 'loafer', color: '#1f2937',
    summary: 'An everyday leather loafer from Apex: a clean slip-on style that works with both casual and regular wear.',
    features: ['Premium leather upper', 'Rubber sole for grip', 'Comfortable fit for daily wear', 'Sizes 39–44'],
    specs: [['Brand', 'Apex'], ['Article', '91315A72'], ['Style', 'Loafer'], ['Upper', 'Leather'], ['Sole', 'Rubber']],
    options: { Size: ['39', '40', '41', '42', '43', '44'], Color: ['Black', 'Dark Brown'] }, perVariantQty: 4,
  },
  {
    name: 'Apex Men\'s Slip-on Casual Shoe', category: 'men-shoes', brand: 'Apex', sku: '91313A62',
    regular: 3490, sale: 0, art: 'slipon', color: '#111827',
    summary: 'A laceless Apex casual shoe with a leather upper and light EVA sole for relaxed everyday comfort.',
    features: ['Leather upper', 'Lightweight EVA sole', 'Laceless slip-on design', 'Sizes 39–44'],
    specs: [['Brand', 'Apex'], ['Article', '91313A62'], ['Style', 'Casual slip-on'], ['Upper', 'Leather'], ['Sole', 'EVA'], ['Colour', 'Black']],
    options: { Size: ['39', '40', '41', '42', '43', '44'], Color: ['Black'] }, perVariantQty: 5,
  },

  // ── Health & Beauty ─────────────────────────────────────────
  {
    name: 'Philips BHD308 1600W Hair Dryer', category: 'health-beauty', brand: 'Philips', sku: 'BHD308',
    regular: 5200, sale: 4125, qty: 20, art: 'dryer', color: '#111827',
    summary: 'Philips 3000 Series hair dryer with 1600 W of drying power and a ThermoProtect attachment for gentler drying.',
    features: ['1600 W drying power', 'ThermoProtect attachment', '3 speed/heat settings', '14 mm concentrator nozzle'],
    specs: [['Brand', 'Philips'], ['Model', 'BHD308 (3000 Series)'], ['Power', '1600 W'], ['Settings', '3 speed/heat combinations'], ['Nozzle', '14 mm'], ['Colour', 'Black']],
  },
  {
    name: 'Philips BT1232/18 Cordless Beard Trimmer', category: 'health-beauty', brand: 'Philips', sku: 'BT1232/18',
    regular: 1825, sale: 1690, qty: 30, art: 'trimmer', color: '#1d4ed8',
    summary: 'Compact Philips Series 1000 cordless beard trimmer with USB charging and a SkinProtect comb.',
    features: ['Up to 30 minutes cordless use', 'USB charging (8 hours full charge)', 'Trim lengths 3–7 mm', '2 years official warranty'],
    specs: [['Brand', 'Philips'], ['Model', 'BT1232/18'], ['Runtime', 'Up to 30 min'], ['Charging', 'USB, 8 hours'], ['Trim length', '3–7 mm'], ['Cutter width', '32 mm'], ['Battery', 'NiMH']],
  },
];

// Shared helpers so the seed script and the admin import build products the same way.
const slugify = (t) => String(t || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'item';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function describe(p) {
  return `<h3>Product Description</h3>
<p>${esc(p.summary)}</p>
<h3>Key Features</h3>
<ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
<h3>Specifications</h3>
<table><tbody>${p.specs.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
}

/** Variants for a variable product: every combination of its options. */
function variantsOf(p) {
  const keys = Object.keys(p.options || {});
  if (!keys.length) return [];
  let combos = [{}];
  for (const k of keys) combos = combos.flatMap((c) => p.options[k].map((v) => ({ ...c, [k]: v })));
  return combos.map((attrs) => ({
    name: Object.values(attrs).join(' / '),
    attrs,
    sku: `${p.sku}-${Object.values(attrs).map((v) => String(v).replace(/\s+/g, '').slice(0, 3).toUpperCase()).join('-')}`,
    qty: p.perVariantQty || 5,
    regular_price: p.regular,
    sale_price: p.sale,
  }));
}

module.exports = { categories, brands, products, slugify, describe, variantsOf };
