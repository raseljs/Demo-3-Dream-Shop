-- E-commerce schema (MySQL 5.7+ / MariaDB 10.3+)
-- Run with: npm run migrate   (or import this file in phpMyAdmin)

CREATE TABLE IF NOT EXISTS settings (
  name VARCHAR(100) NOT NULL PRIMARY KEY,
  value LONGTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  permissions LONGTEXT NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  password VARCHAR(255) NOT NULL,
  role_id INT UNSIGNED NULL,
  is_staff TINYINT(1) NOT NULL DEFAULT 0,
  is_verified TINYINT(1) NOT NULL DEFAULT 1,
  status TINYINT(1) NOT NULL DEFAULT 1,
  address VARCHAR(500) NULL,
  created_at DATETIME NULL,
  UNIQUE KEY users_phone_unique (phone),
  KEY users_email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otps (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at DATETIME NOT NULL,
  KEY otps_phone_idx (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blocklists (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NULL,
  KEY blocklists_phone_idx (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS brands (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  logo VARCHAR(255) NULL,
  meta_title VARCHAR(255) NULL,
  meta_description TEXT NULL,
  meta_keywords VARCHAR(255) NULL,
  created_at DATETIME NULL,
  UNIQUE KEY brands_slug_unique (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  parent_id INT UNSIGNED NULL,
  image VARCHAR(255) NULL,
  description TEXT NULL,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  show_on_home TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  UNIQUE KEY categories_slug_unique (slug),
  KEY categories_parent_idx (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attributes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  options LONGTEXT NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS size_charts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  image VARCHAR(255) NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'simple',
  short_des TEXT NULL,
  long_des LONGTEXT NULL,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  regular_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  qty INT NOT NULL DEFAULT 0,
  brand_id INT UNSIGNED NULL,
  size_chart_id INT UNSIGNED NULL,
  vat_type VARCHAR(10) NOT NULL DEFAULT 'percent',
  vat DECIMAL(10,2) NOT NULL DEFAULT 0,
  free_shipping TINYINT(1) NOT NULL DEFAULT 0,
  shipping_inside DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_outside DECIMAL(10,2) NOT NULL DEFAULT 0,
  thumbnail VARCHAR(255) NULL,
  images LONGTEXT NULL,
  video VARCHAR(255) NULL,
  attributes LONGTEXT NULL,
  meta_title VARCHAR(255) NULL,
  meta_description TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY products_slug_unique (slug),
  KEY products_status_idx (status),
  KEY products_brand_idx (brand_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_categories (
  product_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (product_id, category_id),
  KEY pc_category_idx (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  attrs LONGTEXT NULL,
  sku VARCHAR(100) NULL,
  qty INT NOT NULL DEFAULT 0,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  regular_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  image VARCHAR(255) NULL,
  KEY variants_product_idx (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  rating TINYINT NOT NULL DEFAULT 5,
  comment TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME NULL,
  KEY reviews_product_idx (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  type VARCHAR(10) NOT NULL DEFAULT 'fixed',
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_purchase DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_date DATETIME NULL,
  end_date DATETIME NULL,
  product_ids LONGTEXT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NULL,
  UNIQUE KEY coupons_code_unique (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(30) NULL,
  access_key VARCHAR(40) NULL,
  user_id INT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NULL,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NULL,
  area VARCHAR(20) NOT NULL DEFAULT 'inside',
  note VARCHAR(500) NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'web',
  campaign_id INT UNSIGNED NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  coupon_code VARCHAR(50) NULL,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'cod',
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  transaction_id VARCHAR(100) NULL,
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  assigned_to INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  courier VARCHAR(30) NULL,
  courier_tracking VARCHAR(100) NULL,
  admin_note VARCHAR(500) NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  KEY orders_no_idx (order_no),
  KEY orders_phone_idx (phone),
  KEY orders_status_idx (delivery_status),
  KEY orders_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  variant_id INT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(255) NULL,
  sku VARCHAR(100) NULL,
  image VARCHAR(255) NULL,
  qty INT NOT NULL DEFAULT 1,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  returned_qty INT NOT NULL DEFAULT 0,
  KEY order_items_order_idx (order_id),
  KEY order_items_product_idx (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incomplete_orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(64) NOT NULL,
  name VARCHAR(150) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(150) NULL,
  address VARCHAR(500) NULL,
  items LONGTEXT NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY incomplete_token_unique (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS returns (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  items LONGTEXT NULL,
  refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  note VARCHAR(500) NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NULL,
  KEY returns_order_idx (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expense_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NULL,
  details VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  expense_date DATE NULL,
  created_at DATETIME NULL,
  KEY expenses_date_idx (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaigns (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  product_id INT UNSIGNED NULL,
  image VARCHAR(255) NULL,
  content LONGTEXT NULL,
  carousel LONGTEXT NULL,
  reviews LONGTEXT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NULL,
  UNIQUE KEY campaigns_slug_unique (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menus (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(50) NOT NULL,
  items LONGTEXT NULL,
  created_at DATETIME NULL,
  UNIQUE KEY menus_location_unique (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sliders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(10) NOT NULL DEFAULT 'image',
  position VARCHAR(20) NOT NULL DEFAULT 'hero',
  title VARCHAR(255) NULL,
  link VARCHAR(255) NULL,
  desktop_media VARCHAR(255) NULL,
  mobile_media VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  content LONGTEXT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NULL,
  UNIQUE KEY pages_slug_unique (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────── Inventory: suppliers, purchases (stock in), stock history ─────────
CREATE TABLE IF NOT EXISTS suppliers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  company VARCHAR(150) NULL,
  address VARCHAR(500) NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchases (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT UNSIGNED NULL,
  invoice_no VARCHAR(60) NULL,
  purchase_date DATE NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  note VARCHAR(500) NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NULL,
  KEY purchases_supplier_idx (supplier_id),
  KEY purchases_date_idx (purchase_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  variant_id INT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(255) NULL,
  qty INT NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  KEY purchase_items_purchase_idx (purchase_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT UNSIGNED NOT NULL,
  purchase_id INT UNSIGNED NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  method VARCHAR(40) NULL,
  note VARCHAR(500) NULL,
  paid_at DATE NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NULL,
  KEY supplier_payments_supplier_idx (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NULL,
  variant_id INT UNSIGNED NULL,
  name VARCHAR(255) NULL,
  change_qty INT NOT NULL DEFAULT 0,
  balance INT NULL,
  reason VARCHAR(30) NOT NULL,
  ref_type VARCHAR(30) NULL,
  ref_id INT UNSIGNED NULL,
  ref_label VARCHAR(60) NULL,
  user_id INT UNSIGNED NULL,
  created_at DATETIME NULL,
  KEY stock_movements_product_idx (product_id),
  KEY stock_movements_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────── Courier cash-on-delivery settlement ─────────
CREATE TABLE IF NOT EXISTS courier_settlements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  cod_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  courier_charge DECIMAL(12,2) NOT NULL DEFAULT 0,
  received_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  settled_at DATE NULL,
  note VARCHAR(500) NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NULL,
  UNIQUE KEY courier_settlements_order_unique (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────── Flash sales ─────────
CREATE TABLE IF NOT EXISTS flash_sales (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  state VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flash_sale_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  flash_sale_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  flash_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_sale_price DECIMAL(12,2) NULL,
  original_variants LONGTEXT NULL,
  KEY flash_sale_items_sale_idx (flash_sale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────── Bulk SMS campaigns ─────────
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  audience VARCHAR(40) NOT NULL,
  message TEXT NOT NULL,
  total INT NOT NULL DEFAULT 0,
  sent INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'sending',
  created_by INT UNSIGNED NULL,
  created_at DATETIME NULL,
  finished_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ───────── Activity log (who changed what) ─────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  user_name VARCHAR(150) NULL,
  action VARCHAR(20) NOT NULL,
  entity VARCHAR(60) NULL,
  entity_id VARCHAR(40) NULL,
  summary VARCHAR(255) NULL,
  details TEXT NULL,
  ip VARCHAR(60) NULL,
  created_at DATETIME NULL,
  KEY activity_logs_created_idx (created_at),
  KEY activity_logs_user_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
