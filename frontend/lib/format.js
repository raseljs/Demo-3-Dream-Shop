// Shared helpers (safe for server & client components)
const PUBLIC_API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export const taka = (n) =>
  '৳' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Absolute URL for an uploaded file path like /uploads/2026/11/x.webp */
export function imgUrl(src) {
  if (!src) return '/placeholder.png';
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (src.startsWith('/uploads/') && PUBLIC_API) return PUBLIC_API + src;
  return src;
}

export const discountPct = (regular, sale) =>
  Number(regular) > 0 && Number(sale) > 0 && Number(sale) < Number(regular)
    ? Math.round((1 - Number(sale) / Number(regular)) * 100)
    : 0;

export const priceOf = (p) => (Number(p?.sale_price) > 0 ? Number(p.sale_price) : Number(p?.regular_price || 0));

export const STATUS = {
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-800' },
  on_the_way: { label: 'On the way', cls: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-800' },
  cancel: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700' },
};

export const PAYMENT_STATUS = {
  unpaid: { label: 'Unpaid', cls: 'bg-slate-100 text-slate-700' },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-800' },
  refunded: { label: 'Refunded', cls: 'bg-rose-100 text-rose-700' },
};

export function fmtDate(s, withTime = false) {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  if (isNaN(d)) return s;
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return withTime ? `${date}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : date;
}

export const stripHtml = (html, len = 160) =>
  String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, len);

export const telLink = (phone) => 'tel:' + String(phone || '').replace(/[^\d+]/g, '');
export const waLink = (phone, text = '') =>
  `https://wa.me/${String(phone || '').replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export function qs(params) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, v);
  const str = s.toString();
  return str ? `?${str}` : '';
}

export const DISTRICTS = [
  'Dhaka', 'Chattogram', 'Gazipur', 'Narayanganj', 'Cumilla', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh',
  'Bagerhat', 'Bandarban', 'Barguna', 'Bhola', 'Bogura', 'Brahmanbaria', 'Chandpur', 'Chapai Nawabganj', 'Chuadanga', "Cox's Bazar",
  'Dinajpur', 'Faridpur', 'Feni', 'Gaibandha', 'Gopalganj', 'Habiganj', 'Jamalpur', 'Jashore', 'Jhalokati', 'Jhenaidah', 'Joypurhat',
  'Khagrachhari', 'Kishoreganj', 'Kurigram', 'Kushtia', 'Lakshmipur', 'Lalmonirhat', 'Madaripur', 'Magura', 'Manikganj', 'Meherpur',
  'Moulvibazar', 'Munshiganj', 'Naogaon', 'Narail', 'Narsingdi', 'Natore', 'Netrokona', 'Nilphamari', 'Noakhali', 'Pabna', 'Panchagarh',
  'Patuakhali', 'Pirojpur', 'Rajbari', 'Rangamati', 'Satkhira', 'Shariatpur', 'Sherpur', 'Sirajganj', 'Sunamganj', 'Tangail', 'Thakurgaon',
];

export const isValidPhone = (p) => /^(?:\+?88)?01[3-9]\d{8}$/.test(String(p || '').replace(/[\s-]/g, ''));
