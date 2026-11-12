'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Loading, PageHeader, Pager, SearchInput, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate, qs, taka, waLink } from '@/lib/format';

export default function IncompletePage() {
  const router = useRouter();
  const { toast, can } = useAdmin();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const load = () => api(`/admin/incomplete${qs({ search, page })}`).then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const convert = (r) => {
    sessionStorage.setItem('pos_prefill', JSON.stringify(r));
    router.push('/admin/pos');
  };
  const del = async (r) => {
    if (!confirm('Delete this incomplete order?')) return;
    await api(`/admin/incomplete/${r.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <Guard perm="orders">
      <PageHeader title="Incomplete Orders" subtitle="Customers who filled the checkout form but did not confirm — call them to recover the sale" />
      <div className="mb-4"><SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Name or phone…" /></div>
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>Customer Info</th><th className={thCls}>Items</th><th className={thCls}>Total</th><th className={thCls}>Last activity</th><th className={`${thCls} text-right`}>Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className={tdCls}><p className="font-medium">{r.name || '—'}</p><p className="text-xs">{r.phone}</p><p className="text-xs text-slate-500">{r.address}</p></td>
                    <td className={`${tdCls} text-xs`}>{r.items.map((i, x) => <p key={x}>{i.name}{i.variant_name ? ` (${i.variant_name})` : ''} × {i.qty}</p>)}</td>
                    <td className={`${tdCls} font-semibold`}>{taka(r.total)}</td>
                    <td className={`${tdCls} text-xs text-slate-500`}>{fmtDate(r.updated_at, true)}</td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      <a href={`tel:${r.phone}`} className="btn btn-sm btn-ghost" title="Call"><Icon name="phone" className="h-4 w-4" /></a>
                      <a href={waLink(r.phone.replace(/^0/, '880'), `Hello ${r.name || ''}, you started an order on our website. Can we help you complete it?`)} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost text-emerald-600" title="WhatsApp"><Icon name="whatsapp" className="h-4 w-4" /></a>
                      {can('pos') ? <button type="button" className="btn btn-sm btn-primary" onClick={() => convert(r)}>Create Order</button> : null}
                      <button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={() => del(r)} title="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {!data.data.length ? <tr><td colSpan={5} className="py-12 text-center text-slate-500">No incomplete orders 🎉</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={setPage} />
          </div>
        )}
      </Card>
    </Guard>
  );
}
