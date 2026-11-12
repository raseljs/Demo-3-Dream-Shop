'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Loading, PageHeader, Thumb, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate } from '@/lib/format';

export default function CampaignsPage() {
  const { toast } = useAdmin();
  const [data, setData] = useState(null);
  const load = () => api('/admin/campaigns?per_page=200').then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const del = async (c) => {
    if (!confirm(`Delete landing page "${c.title}"?`)) return;
    await api(`/admin/campaigns/${c.id}`, { method: 'DELETE' });
    load();
  };
  const copy = (c) => { navigator.clipboard?.writeText(`${location.origin}/campaign/${c.slug}`); toast('Link copied'); };

  return (
    <Guard perm="marketing">
      <PageHeader title="Landing Pages (Campaigns)" subtitle="Single-product sales pages for Facebook ads" actions={<Link href="/admin/campaigns/new" className="btn btn-primary"><Icon name="plus" className="h-4 w-4" /> Create</Link>} />
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className={thCls}>Campaign</th><th className={thCls}>Product</th><th className={thCls}>Status</th><th className={thCls}>Created</th><th className={`${thCls} text-right`}>Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.data.map((c) => (
                <tr key={c.id}>
                  <td className={tdCls}><div className="flex items-center gap-3"><Thumb src={c.image} size={48} /><div><p className="font-medium">{c.title}</p><p className="text-xs text-slate-500">/campaign/{c.slug}</p></div></div></td>
                  <td className={tdCls}>{c.product_name || '—'}</td>
                  <td className={tdCls}>{Number(c.status) ? <span className="badge bg-emerald-100 text-emerald-700">Active</span> : <span className="badge bg-slate-100">Off</span>}</td>
                  <td className={`${tdCls} text-xs text-slate-500`}>{fmtDate(c.created_at)}</td>
                  <td className={`${tdCls} whitespace-nowrap text-right`}>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => copy(c)} title="Copy link"><Icon name="copy" className="h-4 w-4" /></button>
                    <a href={`/campaign/${c.slug}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" title="View"><Icon name="eye" className="h-4 w-4" /></a>
                    <Link href={`/admin/campaigns/${c.id}`} className="btn btn-sm btn-ghost" title="Edit"><Icon name="edit" className="h-4 w-4" /></Link>
                    <button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={() => del(c)} title="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {!data.data.length ? <tr><td colSpan={5} className="py-12 text-center text-slate-500">No landing pages yet.</td></tr> : null}
            </tbody>
          </table>
        )}
      </Card>
    </Guard>
  );
}
