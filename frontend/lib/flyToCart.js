// "Fly to cart": a copy of the product photo travels along a curved path into the cart icon,
// shrinking as it goes; the cart icon then bounces. Works with any element marked
// data-cart-target ("header" is preferred, otherwise the first one that is on screen).

const DURATION = 720; // ms
const END_SIZE = 26; // px — size of the photo when it reaches the cart
const STEPS = 16;

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

function onScreen(el) {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const st = window.getComputedStyle(el);
  if (st.visibility === 'hidden' || st.display === 'none') return false;
  return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
}

export function findCartTarget() {
  const all = Array.from(document.querySelectorAll('[data-cart-target]')).filter(onScreen);
  return all.find((el) => el.dataset.cartTarget === 'header') || all[0] || null;
}

/** Replays the little "landing" bounce on the cart icon. */
export function bounceCart(el = findCartTarget()) {
  if (!el) return;
  el.classList.remove('cart-landing');
  void el.offsetWidth; // restart the CSS animation
  el.classList.add('cart-landing');
  el.addEventListener('animationend', () => el.classList.remove('cart-landing'), { once: true });
}

// point on a quadratic Bézier curve
const bez = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

/**
 * @param {Element} source  the product photo (or an element containing it)
 * @param {{ onLand?: () => void }} opts  onLand runs once when the photo reaches the cart
 *        (immediately if animation is not possible), so the cart count updates on arrival.
 */
export function flyToCart(source, { onLand } = {}) {
  const target = typeof document === 'undefined' ? null : findCartTarget();
  const img = source instanceof HTMLImageElement ? source : source?.querySelector?.('img') || null;
  const from = (img || source)?.getBoundingClientRect?.();

  let landed = false;
  const land = () => {
    if (landed) return;
    landed = true;
    bounceCart(target);
    onLand?.();
  };

  if (!target || !from || !from.width || reducedMotion()) { land(); return; }

  const to = target.getBoundingClientRect();
  const size = Math.min(Math.max(Math.min(from.width, from.height), 48), 180);
  const sx = from.left + from.width / 2;
  const sy = from.top + from.height / 2;
  const ex = to.left + to.width / 2;
  const ey = to.top + to.height / 2;
  // control point: a little way towards the cart and lifted above both ends → a nice arc
  const cx = sx + (ex - sx) * 0.35;
  const cy = Math.min(sy, ey) - Math.max(90, Math.abs(ex - sx) * 0.25);

  let ghost;
  if (img) {
    ghost = img.cloneNode(false);
    ghost.removeAttribute('id');
    ghost.removeAttribute('loading');
    ghost.removeAttribute('style');
    ghost.alt = '';
  } else {
    ghost = document.createElement('div');
    ghost.style.background = 'var(--primary)';
  }
  ghost.className = 'fly-to-cart-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;
  document.body.appendChild(ghost);

  const endScale = END_SIZE / size;
  const frames = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const x = bez(sx, cx, ex, t) - size / 2;
    const y = bez(sy, cy, ey, t) - size / 2;
    const s = 1 + (endScale - 1) * t;
    frames.push({ transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`, opacity: t < 0.85 ? 1 : 1 - (t - 0.85) * 3, offset: t });
  }

  const finish = () => {
    ghost.remove();
    land();
  };
  try {
    const anim = ghost.animate(frames, { duration: DURATION, easing: 'cubic-bezier(0.45, 0.05, 0.35, 1)', fill: 'forwards' });
    anim.onfinish = finish;
    anim.oncancel = finish;
  } catch {
    finish();
    return;
  }
  window.setTimeout(finish, DURATION + 400); // safety net (e.g. tab hidden mid-flight)
}
