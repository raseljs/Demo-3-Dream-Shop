'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Field, PageHeader, thCls, tdCls } from '@/components/admin/ui';
import { api, downloadFile } from '@/lib/client';
import { taka } from '@/lib/format';

function ImportResult({ r }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm">
      <p className="font-semibold">{r.dry_run ? 'Preview — nothing has changed yet' : 'Import finished'}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="badge bg-emerald-50 text-emerald-700">{r.created} new</span>
        <span className="badge bg-blue-50 text-blue-700">{r.updated} updated</span>
        <span className="badge bg-slate-100 text-slate-600">{r.unchanged} unchanged</span>
        {r.errors.length ? <span className="badge bg-rose-50 text-rose-700">{r.errors.length} problem{r.errors.length === 1 ? '' : 's'}</span> : null}
      </div>
      {r.errors.length ? (
        <ul className="mt-3 max-h-48 space-y-0.5 overflow-auto rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{r.errors.slice(0, 200).map((e) => <li key={e}>{e}</li>)}</ul>
      ) : null}
    </div>
  );
}

function ImportExport() {
  const { toast } = useAdmin();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');

  const exportCsv = async () => {
    setBusy('export');
    try { await downloadFile('/admin/product-tools/export', `products-${new Date().toISOString().slice(0, 10)}.csv`); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };
  const choose = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setResult(null);
    setFile({ name: f.name, csv: await f.text() });
  };
  const run = async (dry) => {
    setBusy(dry ? 'preview' : 'apply');
    try {
      const r = await api('/admin/product-tools/import', { method: 'POST', body: { csv: file.csv, dry_run: dry } });
      setResult(r);
      if (!dry) { toast(`Import done: ${r.created} new, ${r.updated} updated`); setFile(null); }
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  return (
    <Card title="Import & export (CSV)">
      <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>Download your products as a CSV file and open it in Excel or Google Sheets.</li>
        <li>Change prices, stock or SKUs — or add new rows for new products (name, category, regular_price).</li>
        <li>Save as CSV and upload it here. You&apos;ll see a preview before anything changes.</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={busy === 'export'}><Icon name="download" className="h-4 w-4" /> {busy === 'export' ? 'Preparing…' : 'Download products CSV'}</button>
        <button type="button" className="btn btn-outline" onClick={() => input.current?.click()}><Icon name="upload" className="h-4 w-4" /> Choose CSV to import</button>
        <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={choose} />
      </div>
      {file ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
          <Icon name="file" className="h-5 w-5 text-slate-500" />
          <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
          <button type="button" className="btn btn-sm btn-outline" disabled={!!busy} onClick={() => run(true)}>{busy === 'preview' ? 'Checking…' : 'Preview'}</button>
          {result?.dry_run ? <button type="button" className="btn btn-sm btn-primary" disabled={!!busy || !(result.created + result.updated)} onClick={() => run(false)}>{busy === 'apply' ? 'Importing…' : `Apply ${result.created + result.updated} change(s)`}</button> : null}
        </div>
      ) : null}
      {result ? <ImportResult r={result} /> : null}
      <p className="mt-4 text-xs text-slate-500">Rows are matched by SKU first, then by id. Variation rows (type “variant”) update that size/colour only. Leave a cell empty to keep the current value. Stock changes are saved in <Link href="/admin/stock" className="text-primary">stock history</Link>.</p>
    </Card>
  );
}

function BulkPrice() {
  const { toast, meta } = useAdmin();
  const [f, setF] = useState({ category_id: '', brand_id: '', field: 'both', mode: 'percent', direction: 'increase', value: '', round_to: '' });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const set = (k) => (e) => { setPreview(null); setF((x) => ({ ...x, [k]: e.target.value })); };
  const run = async (dry) => {
    if (!dry && !confirm(`Change prices of ${preview.count} product(s)? This can't be undone automatically.`)) return;
    setBusy(dry ? 'preview' : 'apply');
    try {
      const r = await api('/admin/product-tools/bulk-price', { method: 'POST', body: { ...f, dry_run: dry } });
      if (dry) setPreview(r);
      else { toast(`Prices updated for ${r.count} product(s)`); setPreview(null); }
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };
  const Price = ({ p }) => <>{p.sale_price > 0 ? <><b>{taka(p.sale_price)}</b> <s className="text-slate-400">{taka(p.regular_price)}</s></> : <b>{taka(p.regular_price)}</b>}</>;

  return (
    <Card title="Bulk price change">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Category"><select className="input" value={f.category_id} onChange={set('category_id')}><option value="">All categories</option>{(meta?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Brand"><select className="input" value={f.brand_id} onChange={set('brand_id')}><option value="">All brands</option>{(meta?.brands || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Which price"><select className="input" value={f.field} onChange={set('field')}><option value="both">Regular & sale price (keeps the discount)</option><option value="sale">Sale price only</option><option value="regular">Regular price only</option></select></Field>
        <Field label="Round to nearest" hint="e.g. 10 → ৳1,247 becomes ৳1,250"><input type="number" min="0" className="input" value={f.round_to} onChange={set('round_to')} placeholder="No rounding" /></Field>
        <Field label="Change"><select className="input" value={f.direction} onChange={set('direction')}><option value="increase">Increase</option><option value="decrease">Decrease</option></select></Field>
        <Field label="By"><select className="input" value={f.mode} onChange={set('mode')}><option value="percent">Percent (%)</option><option value="fixed">Fixed amount (৳)</option></select></Field>
        <Field label={f.mode === 'percent' ? 'Percent' : 'Amount'}><input type="number" min="0" className="input" value={f.value} onChange={set('value')} placeholder={f.mode === 'percent' ? '10' : '50'} /></Field>
        <div className="flex items-end"><button type="button" className="btn btn-outline w-full" disabled={!!busy || !f.value} onClick={() => run(true)}>{busy === 'preview' ? 'Checking…' : 'Preview'}</button></div>
      </div>
      {preview ? (
        <div className="mt-5">
          <p className="mb-2 text-sm"><b>{preview.count}</b> product(s) will change{preview.count > preview.preview.length ? ` — first ${preview.preview.length} shown` : ''}{preview.matched > preview.count ? ` (${preview.matched - preview.count} stay the same)` : ''}:</p>
          {preview.discount_removed ? <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"><b>{preview.discount_removed}</b> product(s) will lose their discount, because the new sale price would be higher than the regular price. To keep discounts, choose “Regular & sale price”.</p> : null}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>Product</th><th className={thCls}>Now</th><th className={thCls}>After</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {preview.preview.map((p) => <tr key={p.name}><td className={tdCls}>{p.name}</td><td className={tdCls}><Price p={p.before} /></td><td className={tdCls}><Price p={p.after} /></td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">Size/colour variations change by the same rule. If a sale price would be higher than the regular price, the discount is removed.</p>
          <button type="button" className="btn btn-primary mt-3" disabled={!!busy || !preview.count} onClick={() => run(false)}>{busy === 'apply' ? 'Updating…' : `Update ${preview.count} product(s)`}</button>
        </div>
      ) : null}
    </Card>
  );
}

export default function Page() {
  return (
    <Guard perm="products">
      <PageHeader title="Product tools" subtitle="Update many products at once" actions={<Link href="/admin/products" className="btn btn-outline">All products</Link>} />
      <div className="space-y-5">
        <ImportExport />
        <BulkPrice />
      </div>
    </Guard>
  );
}
