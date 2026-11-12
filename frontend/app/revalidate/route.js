// Called by the backend after admin changes → refreshes cached pages instantly
import { revalidateTag } from 'next/cache';

// Without REVALIDATE_SECRET (testing on one computer) the backend sends a built-in key.
// It is only accepted from this same computer, never through a proxy.
const LOCAL_KEY = 'local-revalidate';

function allowed(request, secret) {
  if (process.env.REVALIDATE_SECRET) return secret === process.env.REVALIDATE_SECRET;
  const host = (request.headers.get('host') || '').replace(/:\d+$/, '');
  return secret === LOCAL_KEY && (host === 'localhost' || host === '127.0.0.1') && !request.headers.get('x-forwarded-for');
}

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* ignore */ }
  if (!allowed(request, body.secret)) {
    return Response.json({ ok: false, message: 'Invalid secret' }, { status: 401 });
  }
  const tags = Array.isArray(body.tags) ? body.tags.slice(0, 20) : [];
  for (const tag of tags) revalidateTag(String(tag));
  return Response.json({ ok: true, revalidated: tags });
}
