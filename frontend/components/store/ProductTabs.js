'use client';
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { api, getUser } from '@/lib/client';
import { fmtDate } from '@/lib/format';

export function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function StarsInput({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} stars`} className="text-amber-400">
          <Icon name={i <= value ? 'star-fill' : 'star'} className={`h-7 w-7 ${i <= value ? '' : 'text-slate-300'}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ productId }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const user = typeof window !== 'undefined' ? getUser() : null;

  if (!user) {
    return (
      <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
        Please <Link href={`/login?next=${typeof window !== 'undefined' ? encodeURIComponent(location.pathname) : '/'}`} className="font-semibold text-primary">log in</Link> to write a review.
      </div>
    );
  }
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api('/reviews', { method: 'POST', body: { product_id: productId, rating, comment } });
      setMsg({ ok: true, text: r.message });
      setComment('');
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-slate-50 p-5">
      <p className="font-semibold">Write a review</p>
      <StarsInput value={rating} onChange={setRating} />
      <textarea className="input" required value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience with this product" />
      {msg ? <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p> : null}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit Review'}</button>
    </form>
  );
}

export default function ProductTabs({ description, video, reviews, productId, rating }) {
  const [tab, setTab] = useState('info');
  const vid = youtubeId(video);
  const tabCls = (t) => `px-5 py-3 text-sm font-semibold border-b-2 transition ${tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`;
  return (
    <section className="mt-10 rounded-2xl border border-slate-200">
      <div className="flex border-b border-slate-200">
        <button type="button" className={tabCls('info')} onClick={() => setTab('info')}>Information</button>
        <button type="button" className={tabCls('reviews')} onClick={() => setTab('reviews')}>Reviews ({reviews.length})</button>
      </div>
      <div className="p-4 md:p-6">
        {tab === 'info' ? (
          <>
            {description ? <div className="prose-content" dangerouslySetInnerHTML={{ __html: description }} /> : <p className="text-slate-500">No description yet.</p>}
            {vid ? (
              <div className="mt-6 aspect-video overflow-hidden rounded-2xl">
                <iframe src={`https://www.youtube.com/embed/${vid}`} title="Product video" loading="lazy" allowFullScreen className="h-full w-full" />
              </div>
            ) : null}
          </>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-lg font-semibold">Customer Reviews</h3>
              <p className="mb-4 text-sm text-slate-500">{reviews.length ? `${Number(rating).toFixed(1)} out of 5 · ${reviews.length} reviews` : 'No reviews yet.'}</p>
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.user_name || 'Customer'}</span>
                      <span className="text-xs text-slate-400">{fmtDate(r.created_at)}</span>
                    </div>
                    <div className="mt-1 flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name={i <= r.rating ? 'star-fill' : 'star'} className={`h-4 w-4 ${i <= r.rating ? '' : 'text-slate-300'}`} />)}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
                  </li>
                ))}
              </ul>
            </div>
            <ReviewForm productId={productId} />
          </div>
        )}
      </div>
    </section>
  );
}
