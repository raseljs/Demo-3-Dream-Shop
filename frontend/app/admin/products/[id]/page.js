'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { ImageUpload, MultiImageUpload } from '@/components/admin/Media';
import RichEditor from '@/components/admin/RichEditor';
import { Card, Field, Loading, PageHeader, Toggle, thCls } from '@/components/admin/ui';
import { api } from '@/lib/client';

const EMPTY = {
  name: '', slug: '', sku: '', type: 'simple', short_des: '', long_des: '', purchase_price: '', regular_price: '', sale_price: '', qty: '',
  brand_id: '', size_chart_id: '', vat_type: 'percent', vat: '', free_shipping: 0, shipping_inside: '', shipping_outside: '',
  thumbnail: '', images: [], video: '', attributes: [], meta_title: '', meta_description: '', status: 'published', sort_order: 0,
  category_ids: [], variants: [],
};

function CategoryTree({ categories, value, onChange }) {
  const tree = useMemo(() => {
    const byParent = {};
    for (const c of categories) (byParent[c.parent_id || 0] ||= []).push(c);
    const build = (pid, depth) => (byParent[pid] || []).flatMap((c) => [{ ...c, depth }, ...build(c.id, depth + 1)]);
    return build(0, 0);
  }, [categories]);
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="max-h-64 space-y-1 overflow-y-auto">
      {tree.map((c) => (
        <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm" style={{ paddingLeft: c.depth * 16 }}>
          <input type="checkbox" checked={value.includes(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4 accent-[var(--primary)]" />
          {c.name}
        </label>
      ))}
      {!tree.length ? <p className="text-xs text-slate-500">No categories yet. <Link href="/admin/r/categories" className="text-primary">Create one</Link></p> : null}
    </div>
  );
}

function AttributesEditor({ attributes, setAttributes, library }) {
  const [pick, setPick] = useState('');
  const [custom, setCustom] = useState({});
  const add = () => {
    const lib = library.find((a) => String(a.id) === pick);
    if (!lib || attributes.some((a) => a.name === lib.name)) return;
    setAttributes([...attributes, { name: lib.name, values: [] }]);
    setPick('');
  };
  const setValues = (i, values) => setAttributes(attributes.map((a, x) => (x === i ? { ...a, values } : a)));
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select className="input h-10" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Choose attribute (Size, Color…)</option>
          {library.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button type="button" className="btn btn-sm btn-dark h-10" onClick={add}>Add</button>
        <button type="button" className="btn btn-sm btn-outline h-10" onClick={() => { const n = prompt('New attribute name (e.g. Weight)'); if (n) setAttributes([...attributes, { name: n.trim(), values: [] }]); }}>Custom</button>
      </div>
      {attributes.map((a, i) => {
        const options = [...new Set([...(library.find((l) => l.name === a.name)?.options || []), ...a.values])];
        return (
          <div key={a.name} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">{a.name}</p>
              <button type="button" className="text-xs text-rose-600" onClick={() => setAttributes(attributes.filter((_, x) => x !== i))}>Remove</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {options.map((v) => {
                const on = a.values.includes(v);
                return <button key={v} type="button" onClick={() => setValues(i, on ? a.values.filter((x) => x !== v) : [...a.values, v])}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${on ? 'border-primary bg-primary text-white' : 'border-slate-300 hover:border-primary'}`}>{v}</button>;
              })}
              <input className="w-28 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-xs outline-none" placeholder="+ value" value={custom[a.name] || ''}
                onChange={(e) => setCustom({ ...custom, [a.name]: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = (custom[a.name] || '').trim(); if (v && !a.values.includes(v)) setValues(i, [...a.values, v]); setCustom({ ...custom, [a.name]: '' }); } }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProductFormPage({ params }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const router = useRouter();
  const { meta, toast } = useAdmin();
  const [p, setP] = useState(isNew ? EMPTY : null);
  const [tab, setTab] = useState('general');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api(`/admin/products/${id}`).then((d) => setP({ ...EMPTY, ...d, slug: d.slug, attributes: d.attributes || [], variants: d.variants || [] }))
      .catch((e) => toast(e.message, 'error'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <Loading />;
  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v && v.target ? (v.target.type === 'checkbox' ? v.target.checked : v.target.value) : v }));

  const generate = () => {
    const attrs = p.attributes.filter((a) => a.values.length);
    if (!attrs.length) return toast('Choose attribute values first', 'error');
    const combos = attrs.reduce((acc, a) => acc.flatMap((c) => a.values.map((v) => ({ ...c, [a.name]: v }))), [{}]);
    const same = (x, y) => attrs.every((a) => x?.[a.name] === y?.[a.name]);
    const variants = combos.map((attrsObj) => p.variants.find((v) => same(v.attrs, attrsObj)) || {
      attrs: attrsObj,
      name: Object.values(attrsObj).join(' / '),
      sku: p.sku ? `${p.sku}-${Object.values(attrsObj).join('-').toUpperCase().replace(/\s+/g, '')}` : '',
      qty: 0, purchase_price: p.purchase_price, regular_price: p.regular_price, sale_price: p.sale_price, image: '',
    });
    setP((x) => ({ ...x, variants }));
    toast(`${variants.length} variations ready`);
  };
  const setVariant = (i, k, v) => setP((x) => ({ ...x, variants: x.variants.map((row, j) => (j === i ? { ...row, [k]: v } : row)) }));

  const save = async (status) => {
    setSaving(true);
    try {
      const body = { ...p, status: status || p.status };
      if (isNew) {
        const r = await api('/admin/products', { method: 'POST', body });
        toast('Product created');
        router.replace(`/admin/products/${r.id}`);
      } else {
        await api(`/admin/products/${id}`, { method: 'PUT', body });
        toast('Product saved');
        const d = await api(`/admin/products/${id}`);
        setP({ ...EMPTY, ...d, attributes: d.attributes || [], variants: d.variants || [] });
      }
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [['general', 'General'], ['inventory', 'Inventory'], ['shipping', 'Shipping'], ['tax', 'Tax'], ...(p.type === 'variable' ? [['variations', 'Attributes & Variations']] : [])];
  const num = (k, label, hint) => <Field label={label} hint={hint}><input type="number" step="any" className="input" value={p[k] ?? ''} onChange={set(k)} /></Field>;

  return (
    <Guard perm="products">
      <PageHeader
        title={isNew ? 'Add New Product' : 'Edit Product'}
        actions={!isNew && p.slug ? <><a href={`/admin/stock?product_id=${p.id}`} className="btn btn-outline"><Icon name="history" className="h-4 w-4" /> Stock history</a><a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className="btn btn-outline"><Icon name="eye" className="h-4 w-4" /> View</a></> : null}
      />
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <Field label="Product name" required><input className="input text-base" value={p.name} onChange={set('name')} required /></Field>
            <div className="mt-4"><Field label="Product description"><RichEditor value={p.long_des} onChange={set('long_des')} minHeight={260} /></Field></div>
          </Card>

          <Card bodyClass="">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 md:px-5">
              <span className="font-semibold">Product data —</span>
              <select className="input input-sm h-9 w-auto" value={p.type} onChange={set('type')}>
                <option value="simple">Simple product</option>
                <option value="variable">Variable product (size / color…)</option>
              </select>
            </div>
            <div className="md:flex">
              <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50 md:w-48 md:flex-col md:border-b-0 md:border-r">
                {tabs.map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setTab(k)} className={`whitespace-nowrap px-4 py-2.5 text-left text-sm ${tab === k ? 'bg-white font-semibold text-primary' : 'text-slate-600 hover:bg-white'}`}>{l}</button>
                ))}
              </div>
              <div className="flex-1 p-4 md:p-5">
                {tab === 'general' ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {num('purchase_price', 'Purchase price (৳)', 'For profit reports')}
                    {num('regular_price', 'Regular price (৳)')}
                    {num('sale_price', 'Sale price (৳)', 'Leave empty if no discount')}
                    <Field label="Size chart" className="sm:col-span-3">
                      <select className="input" value={p.size_chart_id || ''} onChange={set('size_chart_id')}>
                        <option value="">— None —</option>
                        {(meta?.size_charts || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </Field>
                  </div>
                ) : null}
                {tab === 'inventory' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="SKU / Model No"><input className="input" value={p.sku || ''} onChange={set('sku')} /></Field>
                    {p.type === 'simple' ? num('qty', 'Stock quantity') : <p className="self-end text-sm text-slate-500">Stock is managed per variation.</p>}
                  </div>
                ) : null}
                {tab === 'shipping' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Toggle checked={!!Number(p.free_shipping)} onChange={(v) => set('free_shipping')(v ? 1 : 0)} label="Free shipping for this product" /></div>
                    {num('shipping_inside', 'Shipping inside Dhaka (৳)', 'Empty = default from Shipping Settings')}
                    {num('shipping_outside', 'Shipping outside Dhaka (৳)', 'Empty = default from Shipping Settings')}
                  </div>
                ) : null}
                {tab === 'tax' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="VAT type"><select className="input" value={p.vat_type} onChange={set('vat_type')}><option value="percent">Percentage (%)</option><option value="fixed">Fixed per item (৳)</option></select></Field>
                    {num('vat', 'VAT')}
                  </div>
                ) : null}
                {tab === 'variations' ? (
                  <div className="space-y-4">
                    <AttributesEditor attributes={p.attributes} setAttributes={set('attributes')} library={meta?.attributes || []} />
                    <button type="button" onClick={generate} className="btn btn-primary"><Icon name="layers" className="h-4 w-4" /> Generate Variations</button>
                    {p.variants.length ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50"><tr>{['Variation', 'Model No', 'Quantity', 'Purchase Price', 'Regular Price', 'Sale Price', 'Image', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                          <tbody className="divide-y divide-slate-100">
                            {p.variants.map((v, i) => (
                              <tr key={v.id || v.name}>
                                <td className="px-3 py-2 font-medium whitespace-nowrap">{v.name}</td>
                                <td className="px-2 py-2"><input className="input input-sm w-28" value={v.sku || ''} onChange={(e) => setVariant(i, 'sku', e.target.value)} /></td>
                                {['qty', 'purchase_price', 'regular_price', 'sale_price'].map((k) => (
                                  <td key={k} className="px-2 py-2"><input type="number" step="any" className="input input-sm w-24" value={v[k] ?? ''} onChange={(e) => setVariant(i, k, e.target.value)} /></td>
                                ))}
                                <td className="px-2 py-2"><ImageUpload value={v.image} onChange={(url) => setVariant(i, 'image', url)} className="w-14" label="" /></td>
                                <td className="px-2 py-2"><button type="button" className="text-rose-600" onClick={() => setP((x) => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }))} aria-label="Remove"><Icon name="trash" className="h-4 w-4" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="text-sm text-slate-500">Choose attributes & values above, then click “Generate Variations”.</p>}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          <Card title="Product short description"><RichEditor value={p.short_des} onChange={set('short_des')} minHeight={120} /></Card>

          <Card title="SEO">
            <div className="grid gap-4">
              <Field label="URL slug" hint={`yoursite.com/product/${p.slug || 'auto-from-name'}`}><input className="input" value={p.slug || ''} onChange={set('slug')} placeholder="auto" /></Field>
              <Field label="Meta title"><input className="input" value={p.meta_title || ''} onChange={set('meta_title')} /></Field>
              <Field label="Meta description"><textarea className="input" value={p.meta_description || ''} onChange={set('meta_description')} /></Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Publish">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={p.status === 'published'} onChange={() => set('status')('published')} className="accent-[var(--primary)]" /> Published</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={p.status === 'draft'} onChange={() => set('status')('draft')} className="accent-[var(--primary)]" /> Draft (hidden from shop)</label>
              <button className="btn btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</button>
            </div>
          </Card>
          <Card title="Categories"><CategoryTree categories={meta?.categories || []} value={(p.category_ids || []).map(Number)} onChange={set('category_ids')} /></Card>
          <Card title="Product Brand">
            <select className="input" value={p.brand_id || ''} onChange={set('brand_id')}>
              <option value="">— No brand —</option>
              {(meta?.brands || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Card>
          <Card title="Product image"><ImageUpload value={p.thumbnail} onChange={set('thumbnail')} className="w-full" label="Main image (square, 800×800)" /></Card>
          <Card title="Product gallery"><MultiImageUpload value={p.images || []} onChange={set('images')} /></Card>
          <Card title="Video"><input className="input" value={p.video || ''} onChange={set('video')} placeholder="YouTube link" /></Card>
        </div>
      </form>
    </Guard>
  );
}
