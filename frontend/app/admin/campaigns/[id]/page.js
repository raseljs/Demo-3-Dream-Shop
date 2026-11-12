'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { ImageUpload, MultiImageUpload } from '@/components/admin/Media';
import { Card, Field, Loading, PageHeader, ProductPicker, Toggle } from '@/components/admin/ui';
import { api } from '@/lib/client';

const EMPTY = {
  title: '', slug: '', product_id: null, product_name: '', image: '', status: 1, carousel: [], reviews: [],
  content: {
    subtitle: '', regular_price: 'Regular price', offer_price: 'Offer price', order_now: 'অর্ডার করুন',
    gallery: { heading: '', text: '' }, about: { heading: '', body: '', video_url: '' },
    review_section_heading: 'Customer reviews', order_form_heading: 'অর্ডার করতে নিচের ফর্মটি পূরণ করুন',
    colors: { primary_color: '#FC6D04', primary_text: '#ffffff' },
  },
};

export default function CampaignFormPage({ params }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const router = useRouter();
  const { toast } = useAdmin();
  const [c, setC] = useState(isNew ? EMPTY : null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api(`/admin/campaigns/${id}`).then((d) => setC({ ...EMPTY, ...d, content: { ...EMPTY.content, ...(d.content || {}) } })).catch((e) => toast(e.message, 'error'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c) return <Loading />;

  const set = (k, v) => setC((x) => ({ ...x, [k]: v }));
  const setContent = (path, v) => setC((x) => {
    const content = { ...x.content };
    const [a, b] = path.split('.');
    if (b) content[a] = { ...(content[a] || {}), [b]: v };
    else content[a] = v;
    return { ...x, content };
  });
  const ct = c.content;
  const text = (path, label, area = false) => {
    const [a, b] = path.split('.');
    const v = b ? ct[a]?.[b] : ct[a];
    return <Field label={label}>{area ? <textarea className="input" value={v || ''} onChange={(e) => setContent(path, e.target.value)} /> : <input className="input" value={v || ''} onChange={(e) => setContent(path, e.target.value)} />}</Field>;
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { title: c.title, product_id: c.product_id, image: c.image, status: c.status, carousel: c.carousel, reviews: c.reviews, content: c.content, ...(c.slug ? { slug: c.slug } : {}) };
      if (isNew) {
        const r = await api('/admin/campaigns', { method: 'POST', body });
        toast('Landing page created');
        router.replace(`/admin/campaigns/${r.id}`);
      } else {
        const r = await api(`/admin/campaigns/${id}`, { method: 'PUT', body });
        setC({ ...EMPTY, ...r, content: { ...EMPTY.content, ...(r.content || {}) } });
        toast('Saved');
      }
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <Guard perm="marketing">
      <form onSubmit={save}>
        <PageHeader title={isNew ? 'Create Campaign' : 'Edit Campaign'}
          actions={<>
            <Link href="/admin/campaigns" className="btn btn-outline">Back</Link>
            {!isNew ? <a href={`/campaign/${c.slug}`} target="_blank" rel="noreferrer" className="btn btn-outline"><Icon name="eye" className="h-4 w-4" /> View</a> : null}
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>} />
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Card title="Hero">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Page Title (after logo)" required className="md:col-span-2"><input className="input" value={c.title} onChange={(e) => set('title', e.target.value)} required /></Field>
                {text('subtitle', 'Subtitle')}
                <Field label="URL slug" hint={`/campaign/${c.slug || 'auto'}`}><input className="input" value={c.slug || ''} onChange={(e) => set('slug', e.target.value)} placeholder="auto" /></Field>
                {text('regular_price', 'Regular Price Label')}
                {text('offer_price', 'Offer Price Label')}
                {text('order_now', 'Order Now Button Label')}
                {text('order_form_heading', 'Order Form Heading')}
              </div>
            </Card>
            <Card title="Gallery section">
              <div className="grid gap-4">{text('gallery.heading', 'Gallery Section Heading')}{text('gallery.text', 'Gallery Section Description', true)}
                <Field label="Gallery Images (Carousel)"><MultiImageUpload value={c.carousel || []} onChange={(v) => set('carousel', v)} /></Field>
              </div>
            </Card>
            <Card title="About section">
              <div className="grid gap-4">{text('about.heading', 'About Section Heading')}{text('about.body', 'About Section Description', true)}{text('about.video_url', 'YouTube / Facebook Video link')}</div>
            </Card>
            <Card title="Reviews" actions={<button type="button" className="btn btn-sm btn-outline" onClick={() => set('reviews', [...(c.reviews || []), { name: '', text: '', image: '' }])}><Icon name="plus" className="h-4 w-4" /> Add Review</button>}>
              {text('review_section_heading', 'Review Section Heading')}
              <div className="mt-4 space-y-3">
                {(c.reviews || []).map((r, i) => (
                  <div key={i} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                    <ImageUpload value={r.image} onChange={(v) => set('reviews', c.reviews.map((x, j) => (j === i ? { ...x, image: v } : x)))} className="w-20" label="Photo" />
                    <div className="flex-1 space-y-2">
                      <input className="input h-9" placeholder="Customer name" value={r.name} onChange={(e) => set('reviews', c.reviews.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                      <textarea className="input min-h-16" placeholder="Review text" value={r.text} onChange={(e) => set('reviews', c.reviews.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                    </div>
                    <button type="button" className="self-start text-rose-600" onClick={() => set('reviews', c.reviews.filter((_, j) => j !== i))} aria-label="Remove"><Icon name="trash" className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="space-y-5">
            <Card title="Publish"><Toggle checked={!!Number(c.status)} onChange={(v) => set('status', v ? 1 : 0)} label="Active" /></Card>
            <Card title="Select Product">
              <ProductPicker withVariants onPick={(p) => setC((x) => ({ ...x, product_id: p.id, product_name: p.name }))} />
              {c.product_id ? <p className="mt-3 flex items-center gap-2 text-sm"><Icon name="check-circle" className="h-4 w-4 text-emerald-600" /> {c.product_name || `Product #${c.product_id}`}</p> : <p className="mt-2 text-xs text-slate-500">The order form sells this product.</p>}
            </Card>
            <Card title="Banner Image"><ImageUpload value={c.image} onChange={(v) => set('image', v)} className="w-full" aspect="aspect-video" /></Card>
            <Card title="Color Settings (Optional)">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Primary Color"><input type="color" className="h-11 w-full rounded-xl border border-slate-300" value={ct.colors?.primary_color || '#FC6D04'} onChange={(e) => setContent('colors.primary_color', e.target.value)} /></Field>
                <Field label="Primary Text Color"><input type="color" className="h-11 w-full rounded-xl border border-slate-300" value={ct.colors?.primary_text || '#ffffff'} onChange={(e) => setContent('colors.primary_text', e.target.value)} /></Field>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </Guard>
  );
}
