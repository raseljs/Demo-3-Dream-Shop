# E-Shop — Next.js + Node.js E-commerce (Storefront + Admin Panel + POS)

A clone of originalemart's design and all its features, but built with **Next.js (ISR caching)**, so pages open very fast.
Your own or your client's name, logo, colours and products can all be set from the admin panel (no code changes needed).

```
eshop/
├── backend/    → Express + MySQL REST API (Node.js app #1)
└── frontend/   → Next.js 15 storefront + /admin panel (Node.js app #2)
```

---

## 1. Running on your computer (local testing)

Requirements: **Node.js 22.13+ (or 24)**. MySQL is not needed locally — if no database is configured (or `DB_CLIENT=sqlite`),
the backend stores its data in `backend/database/local.sqlite`, and on first start it creates the tables + demo data automatically.

```bash
# ---- Backend ----
cd backend
npm install                   # no .env needed locally — uses SQLite automatically if no DB is set
npm run dev                   # http://localhost:5000  (first start can take 20–30 seconds)

# ---- Frontend (in a new terminal) ----
cd frontend
npm install                   # connects to http://localhost:5000 without a .env.local
npm run dev                   # http://localhost:3000
```

### Running locally with MySQL (XAMPP)

Set `DB_CLIENT=mysql`, fill in the database details, then run `npm run migrate` and `npm run seed`:

```bash
# ---- Backend ----
cd backend
copy .env.example .env        # (Mac/Linux: cp .env.example .env) → fill in DB name/user/password
npm install
npm run migrate               # creates the tables + Admin user
npm run seed                  # (optional) demo products, slider, categories
npm run dev                   # http://localhost:5000

# ---- Frontend (in a new terminal) ----
cd frontend
copy .env.example .env.local  # API_URL=http://localhost:5000, NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev                   # http://localhost:3000
```

### Admin login

**http://localhost:3000/login** → `ADMIN_PHONE` / `ADMIN_PASSWORD` from `.env`
(default `01700000000` / `admin12345` — be sure to change it after logging in). After login you are redirected to **/admin** automatically.

---

## 2. Deploying on cPanel (two Node.js apps)

**a) Database:** cPanel → MySQL Databases → create a new database + user and grant ALL PRIVILEGES.

**b) Backend (e.g. `api.yourshop.com`):**
1. Upload the `backend` folder (e.g. `/home/USER/eshop/backend`).
2. cPanel → **Setup Node.js App** → Create: Application root = `eshop/backend`, URL = `api.yourshop.com`, Startup file = `server.js`, Node 20+.
3. Under Environment variables, add every variable from `.env.example` (`DB_CLIENT=mysql`, DB details, `JWT_SECRET`, `REVALIDATE_SECRET`, `BACKEND_URL=https://api.yourshop.com`, `FRONTEND_URL=https://yourshop.com`, `NODE_ENV=production`).
4. **Run NPM Install** → then in the Terminal (after entering the app's virtualenv command) run `npm run migrate`, and `npm run seed` if you want demo data → **Restart**.
5. Opening `https://api.yourshop.com/api/health` should show `{"ok":true}`.

**c) Frontend (`yourshop.com`):**
1. Upload the `frontend` folder → Setup Node.js App: root = `eshop/frontend`, URL = `yourshop.com`, Startup file = `server.js`.
2. Environment variables: `API_URL=https://api.yourshop.com`, `NEXT_PUBLIC_API_URL=https://api.yourshop.com`, `NEXT_PUBLIC_SITE_URL=https://yourshop.com`, `REVALIDATE_SECRET=` (same as the backend's), `NODE_ENV=production`.
3. **Run NPM Install** → run `npm run build` in the Terminal → **Restart**.
   - On shared hosting with little RAM the build may get stuck. In that case, run `npm run build` on your own computer with the same `.env.local` and upload the whole `.next` folder.
   - `NEXT_PUBLIC_*` variables are baked into the code at build time — if you change them, you have to build again.
4. Build while the backend is running, so the first pages are generated with real data.

> **Why it's fast:** Each page is generated once on the server and then cached (ISR). When you change something in the admin panel,
> the backend automatically calls `/revalidate` to refresh only the affected pages. Images are automatically converted to WebP and
> resized to the right size (next/image), and there is no jQuery or other heavy library — very little JavaScript reaches the browser.

---

## 3. Feature list

**Storefront:** Hero slider (separate desktop/mobile images, video), promo banners, trust bar, featured categories,
category-based product sections, live search, shop page (category/brand/price filters, sorting, 16/24/36 per page),
product page (gallery + zoom, size/colour variations, stock, "Order now", Add to Cart, Call/WhatsApp ordering, size chart,
reviews, related products, SEO schema), cart drawer, checkout (Inside/Outside Dhaka delivery charges, coupons, COD/bKash/SSLCommerz),
order success/invoice, order tracking (by order number or phone), customer login/register (optional OTP), customer dashboard,
static pages, landing pages (`/campaign/...`), sitemap.xml, robots.txt, Custom Code for Facebook Pixel/GA.

**Admin (`/admin`):** Dashboard (date filter, 30-day chart), **POS** (barcode/SKU search, walk-in/delivery, invoice printing),
brands, categories (with sub-categories), products (Simple/Variable, Generate Variations, gallery, video, shipping/VAT, SEO, Duplicate),
attributes, size charts, **label printing (Code128 barcodes)**, orders (status tabs, bulk status change/assign, send to Pathao/Steadfast,
fraud check, CSV export, bulk invoices), **Incomplete orders** (customers who entered a phone number at checkout but didn't place an order),
returns (restock + refund), expenses and expense categories, reports (Profit & Loss, Sales, City-wise, Products), landing page builder,
coupons, users, blocklist, role permissions, product review moderation, menu builder, slider, page editor,
settings (General, Shipping, Courier, Payment, SMS).

---

## 4. Things to test with your own accounts

The code follows each service's documented API, but these could not be tested without real credentials — check them in sandbox mode first:
- **Pathao / Steadfast** (Settings → Courier) — Steadfast's default base URL is `https://portal.packzy.com/api/v1`
- **bKash Tokenized / SSLCommerz** (Settings → Payment)
- **BulkSMSBD / Custom SMS** (Settings → SMS) and the **BD Courier fraud check** API key (Settings → General)

---

## 5. Useful information
- Images are uploaded to `backend/uploads/` (JPG/PNG/WEBP/GIF, plus MP4 for the slider). Keep this folder in your backups.
- `backend/uploads/demo/` contains demo images only — you can delete it once you've added real products.
- To change colours: Settings → General → Primary colour / Header colour.
- To add staff: Users → Add New → choose a Role (use the Roles page to set which sections each role can see).
