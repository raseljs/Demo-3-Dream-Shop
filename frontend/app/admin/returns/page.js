'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Loading, PageHeader, Pager, SearchInput, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate, qs, taka } from '@/lib/format';

export default function ReturnsPage() {
  const { toast } = useAdmin();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const load = () => api(`/admin/returns${qs({ search, page })}`).then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const del = async (r) => {
    if (!confirm('Delete this return? Returned quantities will be reverted.')) return;
    try { await api(`/admin/returns/${r.id}`, { method: 'DELETE' }); toast('Return deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <Guard perm="returns">
      <PageHeader title="Order Returns" subtitle="Create a return from an order's detail page" />
      <div className="mb-4"><SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Order #, name, phone…" /></div>
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>Customer Info</th><th className={thCls}>Returned Items</th><th className={thCls}>Refund Amount</th><th className={thCls}>Return Date</th><th className={`${thCls} text-right`}>Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className={tdCls}>
                      <Link href={`/admin/orders/${r.order_id}`} className="font-semibold text-primary">#{r.order_no}</Link>
                      <p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.phone}</p>
                    </td>
                    <td className={`${tdCls} text-xs`}>{r.items.map((i, x) => <p key={x}>{i.name}{i.variant_name ? ` (${i.variant_name})` : ''} × {i.qty}{i.restocked ? ' · restocked' : ''}</p>)}{r.note ? <p className="mt-1 italic text-slate-500">{r.note}</p> : null}</td>
                    <td className={`${tdCls} font-semibold`}>{taka(r.refund_amount)}</td>
                    <td className={`${tdCls} text-xs text-slate-500`}>{fmtDate(r.created_at, true)}</td>
                    <td className={`${tdCls} text-right`}><button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={() => del(r)}><Icon name="trash" className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {!data.data.length ? <tr><td colSpan={5} className="py-12 text-center text-slate-500">No returns yet.</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={setPage} />
          </div>
        )}
      </Card>
    </Guard>
  );
}
