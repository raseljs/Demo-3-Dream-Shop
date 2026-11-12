# E-Shop — Next.js + Node.js ই-কমার্স (স্টোরফ্রন্ট + অ্যাডমিন প্যানেল + POS)

originalemart-এর ডিজাইন ও সব ফিচারের ক্লোন, কিন্তু **Next.js (ISR ক্যাশিং)** দিয়ে বানানো, তাই পেজ খুব দ্রুত খোলে।
নিজের/ক্লায়েন্টের নাম, লোগো, রঙ আর প্রোডাক্ট অ্যাডমিন প্যানেল থেকেই বসানো যায় (কোড বদলাতে হয় না)।

```
eshop/
├── backend/    → Express + MySQL REST API (Node.js app #1)
└── frontend/   → Next.js 15 স্টোরফ্রন্ট + /admin প্যানেল (Node.js app #2)
```

---

## ১. কম্পিউটারে চালানো (লোকাল টেস্ট)

দরকার: **Node.js 22.13+ (বা 24)**। লোকালে MySQL লাগবে না — কোনো DB সেট না থাকলে (বা `DB_CLIENT=sqlite`) ব্যাকএন্ড
`backend/database/local.sqlite` ফাইলে ডাটা রাখে, আর প্রথমবার চালু হওয়ার সময় নিজে থেকেই টেবিল + ডেমো ডাটা বানায়।

```bash
# ---- Backend ----
cd backend
npm install                   # লোকালে .env লাগবে না — DB সেট না থাকলে অটো SQLite
npm run dev                   # http://localhost:5000  (প্রথমবার ২০–৩০ সেকেন্ড লাগতে পারে)

# ---- Frontend (নতুন টার্মিনালে) ----
cd frontend
npm install                   # লোকালে .env.local ছাড়াই http://localhost:5000-এ কানেক্ট করে
npm run dev                   # http://localhost:3000
```

MySQL দিয়ে লোকালে চালাতে চাইলে (XAMPP): `DB_CLIENT=mysql`, DB তথ্য বসিয়ে `npm run migrate` আর `npm run seed`।

অ্যাডমিন লগইন: **http://localhost:3000/login** → `.env`-এর `ADMIN_PHONE` / `ADMIN_PASSWORD`
(ডিফল্ট `01700000000` / `admin12345` — লগইনের পর অবশ্যই বদলাবেন)। লগইনের পর অটো **/admin**-এ যাবে।

---- Backend ----
cd backend
copy .env.example .env        # (Mac/Linux: cp .env.example .env) → DB নাম/ইউজার/পাসওয়ার্ড বসান
npm install
npm run migrate               # টেবিল + Admin ইউজার তৈরি
npm run seed                  # (ঐচ্ছিক) ডেমো প্রোডাক্ট, স্লাইডার, ক্যাটাগরি
npm run dev                   # http://localhost:5000

# ---- Frontend (নতুন টার্মিনালে) ----
cd frontend
copy .env.example .env.local  # API_URL=http://localhost:5000, NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev                   # http://localhost:3000
```

অ্যাডমিন লগইন: **http://localhost:3000/login** → `.env`-এর `ADMIN_PHONE` / `ADMIN_PASSWORD`
(ডিফল্ট `01700000000` / `admin12345` — লগইনের পর অবশ্যই বদলাবেন)। লগইনের পর অটো **/admin**-এ যাবে।

---

## ২. cPanel-এ ডিপ্লয় (দুটো Node.js App)

**ক) ডাটাবেস:** cPanel → MySQL Databases → নতুন DB + ইউজার বানিয়ে ALL PRIVILEGES দিন।

**খ) Backend (যেমন `api.yourshop.com`):**
1. `backend` ফোল্ডার আপলোড করুন (যেমন `/home/USER/eshop/backend`)।
2. cPanel → **Setup Node.js App** → Create: Application root = `eshop/backend`, URL = `api.yourshop.com`, Startup file = `server.js`, Node 20+।
3. Environment variables-এ `.env.example`-এর সব ভ্যারিয়েবল বসান (`DB_CLIENT=mysql`, DB, `JWT_SECRET`, `REVALIDATE_SECRET`, `BACKEND_URL=https://api.yourshop.com`, `FRONTEND_URL=https://yourshop.com`, `NODE_ENV=production`)।
4. **Run NPM Install** → তারপর Terminal-এ (app-এর virtualenv কমান্ড দিয়ে ঢুকে) `npm run migrate` আর চাইলে `npm run seed` → **Restart**।
5. `https://api.yourshop.com/api/health` খুললে `{"ok":true}` দেখাবে।

**গ) Frontend (`yourshop.com`):**
1. `frontend` ফোল্ডার আপলোড → Setup Node.js App: root = `eshop/frontend`, URL = `yourshop.com`, Startup file = `server.js`।
2. Environment variables: `API_URL=https://api.yourshop.com`, `NEXT_PUBLIC_API_URL=https://api.yourshop.com`, `NEXT_PUBLIC_SITE_URL=https://yourshop.com`, `REVALIDATE_SECRET=` (backend-এর সাথে একই), `NODE_ENV=production`।
3. **Run NPM Install** → Terminal-এ `npm run build` → **Restart**।
   - শেয়ার্ড হোস্টিং-এ RAM কম হলে build আটকে যেতে পারে। তখন নিজের কম্পিউটারে একই `.env.local` দিয়ে `npm run build` করে পুরো `.next` ফোল্ডার আপলোড করুন।
   - `NEXT_PUBLIC_*` ভ্যারিয়েবল build-এর সময় কোডে বসে যায় — বদলালে আবার build করতে হবে।
4. Backend চালু থাকা অবস্থায় build করুন, যাতে প্রথম পেজগুলো ডাটা সহ তৈরি হয়।

> **কেন দ্রুত:** প্রতিটা পেজ একবার সার্ভারে তৈরি হয়ে ক্যাশ থাকে (ISR)। অ্যাডমিনে কিছু বদলালে backend নিজে থেকে
> `/revalidate` কল করে শুধু সংশ্লিষ্ট পেজগুলো রিফ্রেশ করে। ছবি অটো WebP/সঠিক সাইজে রিসাইজ হয় (next/image),
> কোনো jQuery/বড় লাইব্রেরি নেই — ব্রাউজারে খুব কম JavaScript যায়।

---

## ৩. ফিচার লিস্ট

**স্টোরফ্রন্ট:** হিরো স্লাইডার (ডেস্কটপ/মোবাইল আলাদা ছবি, ভিডিও), প্রোমো ব্যানার, ট্রাস্ট বার, ফিচার্ড ক্যাটাগরি,
ক্যাটাগরি-ভিত্তিক প্রোডাক্ট সেকশন, লাইভ সার্চ, শপ পেজ (ক্যাটাগরি/ব্র্যান্ড/দাম ফিল্টার, সর্ট, ১৬/২৪/৩৬ প্রতি পেজ),
প্রোডাক্ট পেজ (গ্যালারি+জুম, সাইজ/কালার ভ্যারিয়েশন, স্টক, “অর্ডার করুন”, Add to Cart, Call/WhatsApp অর্ডার, সাইজ চার্ট,
রিভিউ, রিলেটেড প্রোডাক্ট, SEO schema), কার্ট ড্রয়ার, চেকআউট (Inside/Outside Dhaka চার্জ, কুপন, COD/bKash/SSLCommerz),
অর্ডার সাকসেস/ইনভয়েস, অর্ডার ট্র্যাক (অর্ডার নং বা ফোন), কাস্টমার লগইন/রেজিস্টার (OTP ঐচ্ছিক), কাস্টমার ড্যাশবোর্ড,
স্ট্যাটিক পেজ, ল্যান্ডিং পেজ (`/campaign/...`), sitemap.xml, robots.txt, Facebook Pixel/GA-এর জন্য Custom Code।

**অ্যাডমিন (`/admin`):** ড্যাশবোর্ড (তারিখ ফিল্টার, ৩০ দিনের চার্ট), **POS** (বারকোড/SKU সার্চ, ওয়াক-ইন/ডেলিভারি, ইনভয়েস প্রিন্ট),
ব্র্যান্ড, ক্যাটাগরি (সাব-ক্যাটাগরি), প্রোডাক্ট (Simple/Variable, Generate Variations, গ্যালারি, ভিডিও, শিপিং/VAT, SEO, Duplicate),
অ্যাট্রিবিউট, সাইজ চার্ট, **লেবেল প্রিন্ট (Code128 বারকোড)**, অর্ডার (স্ট্যাটাস ট্যাব, বাল্ক স্ট্যাটাস/অ্যাসাইন, Pathao/Steadfast-এ পাঠানো,
ফ্রড চেক, CSV এক্সপোর্ট, বাল্ক ইনভয়েস), **Incomplete orders** (চেকআউটে ফোন দিয়ে অর্ডার না করা কাস্টমার), রিটার্ন (রিস্টক+রিফান্ড),
খরচ ও খরচের ক্যাটাগরি, রিপোর্ট (Profit & Loss, Sales, City-wise, Products), ল্যান্ডিং পেজ বিল্ডার, কুপন, ইউজার, ব্লকলিস্ট,
রোল-পারমিশন, প্রোডাক্ট রিভিউ মডারেশন, মেনু বিল্ডার, স্লাইডার, পেজ এডিটর, সেটিংস (General, Shipping, Courier, Payment, SMS)।

---

## ৪. যেগুলো আপনার নিজের অ্যাকাউন্ট দিয়ে টেস্ট করতে হবে

কোড ডকুমেন্টেড API অনুযায়ী লেখা, কিন্তু আসল credential ছাড়া এগুলো টেস্ট করা যায়নি — প্রথমে sandbox মোডে চেক করুন:
- **Pathao / Steadfast** (Settings → Courier) — Steadfast-এর base URL ডিফল্ট `https://portal.packzy.com/api/v1`
- **bKash Tokenized / SSLCommerz** (Settings → Payment)
- **BulkSMSBD / Custom SMS** (Settings → SMS) এবং **BD Courier fraud check** API key (Settings → General)

---

## ৫. দরকারি তথ্য
- ছবি আপলোড হয় `backend/uploads/`-এ (JPG/PNG/WEBP/GIF, স্লাইডারে MP4)। এই ফোল্ডার ব্যাকআপে রাখুন।
- `backend/uploads/demo/` শুধু ডেমো ছবি — আসল প্রোডাক্ট দেওয়ার পর মুছে ফেলতে পারেন।
- রঙ বদলাতে: Settings → General → Primary colour / Header colour।
- নতুন স্টাফ: Users → Add New → Role বেছে দিন (Roles পেজে কে কোন সেকশন দেখবে ঠিক করুন)।
