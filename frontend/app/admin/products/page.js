'use client';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Loading, PageHeader, Pager, SearchInput, Thumb, Toggle, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { qs, taka } from '@/lib/format';

export default function ProductsPage({ searchParams }) {
  const sp = use(searchParams);
  const { meta, toast } = useAdmin();
  const [f, setF] = useState({ search: '', category_id: '', brand_id: '', status: '', stock: sp.stock || '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = () => api(`/admin/products${qs({ ...f, page, per_page: 25 })}`).then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [f, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const setFilter = (k, v) => { setPage(1); setF((x) => ({ ...x, [k]: v })); };

  const patch = async (p, body) => {
    try { await api(`/admin/products/${p.id}`, { method: 'PATCH', body }); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const duplicate = async (p) => {
    try { const r = await api(`/admin/products/${p.id}/duplicate`, { method: 'POST' }); toast('Duplicated as draft'); window.location.href = `/admin/products/${r.id}`; } catch (e) { toast(e.message, 'error'); }
  };
  const del = async (p) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await api(`/admin/products/${p.id}`, { method: 'DELETE' }); toast('Product deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <Guard perm="products">
      <PageHeader title="All Products" subtitle={data ? `${data.total} products` : ''}
        actions={<><Link href="/admin/products/tools" className="btn btn-outline"><Icon name="upload" className="h-4 w-4" /> Import / Bulk price</Link><Link href="/admin/products/new" className="btn btn-primary"><Icon name="plus" className="h-4 w-4" /> Add New</Link></>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={f.search} onChange={(v) => setFilter('search', v)} placeholder="Search name or SKU…" />
        <select className="input h-10 w-auto" value={f.category_id} onChange={(e) => setFilter('category_id', e.target.value)}>
          <option value="">All categories</option>
          {(meta?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input h-10 w-auto" value={f.brand_id} onChange={(e) => setFilter('brand_id', e.target.value)}>
          <option value="">All brands</option>
          {(meta?.brands || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="input h-10 w-auto" value={f.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">Any status</option><option value="published">Published</option><option value="draft">Draft</option>
        </select>
        <select className="input h-10 w-auto" value={f.stock} onChange={(e) => setFilter('stock', e.target.value)}>
          <option value="">Any stock</option><option value="low">Low stock</option><option value="out">Out of stock</option>
        </select>
      </div>
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr><th className={thCls}>Product</th><th className={thCls}>Price</th><th className={thCls}>Stock</th><th className={thCls}>Published</th><th className={`${thCls} text-right`}>Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <Thumb src={p.thumbnail} size={48} />
                        <div className="min-w-0">
                          <Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-medium hover:text-primary">{p.name}</Link>
                          <p className="text-xs text-slate-500">
                            {p.sku ? `SKU: ${p.sku} · ` : ''}{p.categories?.join(', ') || 'No category'}
                            {p.type === 'variable' ? <span className="badge ml-1 bg-violet-100 text-violet-700">{p.variants_count} variations</span> : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      {Number(p.sale_price) > 0 ? <><p className="font-semibold">{taka(p.sale_price)}</p><p className="text-xs text-slate-400 line-through">{taka(p.regular_price)}</p></> : <p className="font-semibold">{taka(p.regular_price)}</p>}
                    </td>
                    <td className={tdCls}><span className={`font-semibold ${p.qty <= 0 ? 'text-rose-600' : p.qty <= 5 ? 'text-amber-600' : ''}`}>{p.qty}</span></td>
                    <td className={tdCls}><Toggle checked={p.status === 'published'} onChange={(v) => patch(p, { status: v ? 'published' : 'draft' })} /></td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" title="View"><Icon name="eye" className="h-4 w-4" /></a>
                      <Link href={`/admin/products/${p.id}`} className="btn btn-sm btn-ghost" title="Edit"><Icon name="edit" className="h-4 w-4" /></Link>
                      <button type="button" onClick={() => duplicate(p)} className="btn btn-sm btn-ghost" title="Duplicate"><Icon name="copy" className="h-4 w-4" /></button>
                      <button type="button" onClick={() => del(p)} className="btn btn-sm btn-ghost text-rose-600" title="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {!data.data.length ? <tr><td colSpan={5} className="py-12 text-center text-slate-500">No products found.</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={setPage} />
          </div>
        )}
      </Card>
    </Guard>
  );
}
