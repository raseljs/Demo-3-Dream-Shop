// Remembers the basics of a product (name, price, photo) when its card is clicked, so the product
// page can show them instantly while the full page is still loading.
const KEY = 'product_preview_v1';
const mem = new Map();

const norm = (slug) => { try { return decodeURIComponent(String(slug || '')); } catch { return String(slug || ''); } };

export function savePreview(slug, data) {
  const key = norm(slug);
  mem.set(key, data);
  try {
    const all = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    all[key] = data;
    const keys = Object.keys(all);
    if (keys.length > 40) delete all[keys[0]];
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage full or blocked — memory copy is enough */ }
}

/** Returns the same object for the same slug (safe for useSyncExternalStore). */
export function readPreview(slug) {
  const key = norm(slug);
  if (mem.has(key)) return mem.get(key);
  try {
    const found = JSON.parse(sessionStorage.getItem(KEY) || '{}')[key] || null;
    mem.set(key, found);
    return found;
  } catch {
    return null;
  }
}
