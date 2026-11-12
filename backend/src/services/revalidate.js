// Tells the Next.js storefront to refresh cached pages after admin changes.
const config = require('../config');

let pending = new Set();
let timer = null;

function revalidate(...tags) {
  if (!config.revalidateSecret) return;
  tags.flat().filter(Boolean).forEach((t) => pending.add(t));
  if (timer) return;
  // Batch several quick changes into one request
  timer = setTimeout(async () => {
    const list = [...pending];
    pending = new Set();
    timer = null;
    try {
      await fetch(`${config.frontendUrl}/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: config.revalidateSecret, tags: list }),
        signal: AbortSignal.timeout(8000),
      });
    } catch (e) {
      console.warn('[revalidate] storefront not reachable:', e.message);
    }
  }, 300);
}

module.exports = { revalidate };
