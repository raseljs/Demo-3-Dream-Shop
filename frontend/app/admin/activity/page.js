'use client';
import { useEffect, useState } from 'react';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Loading, PageHeader, Pager, SearchInput, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate, qs } from '@/lib/format';

const ACTIONS = {
  create: { label: 'Created', cls: 'bg-emerald-50 text-emerald-700' },
  update: { label: 'Updated', cls: 'bg-blue-50 text-blue-700' },
  delete: { label: 'Deleted', cls: 'bg-rose-50 text-rose-700' },
  login: { label: 'Signed in', cls: 'bg-slate-100 text-slate-600' },
};
const label = (e) => String(e || '').replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function Activity() {
  const { toast, meta } = useAdmin();
  const [f, setF] = useState({ search: '', user_id: '', action: '', entity: '', from_date: '', to_date: '', page: 1 });
  const [data, setData] = useState(null);
  useEffect(() => { api(`/admin/activity${qs(f)}`).then(setData).catch((e) => toast(e.message, 'error')); }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const setFilter = (k, v) => setF((x) => ({ ...x, [k]: v, page: 1 }));

  return (
    <>
      <PageHeader title="Activity log" subtitle="Who changed what in the admin panel" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={f.search} onChange={(v) => setFilter('search', v)} placeholder="Search activity…" />
        <select className="input h-10 w-auto" value={f.user_id} onChange={(e) => setFilter('user_id', e.target.value)} aria-label="Staff member">
          <option value="">All staff</option>
          {(meta?.staff || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="input h-10 w-auto" value={f.action} onChange={(e) => setFilter('action', e.target.value)} aria-label="Action">
          <option value="">All actions</option>
          {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input h-10 w-auto" value={f.entity} onChange={(e) => setFilter('entity', e.target.value)} aria-label="Section">
          <option value="">All sections</option>
          {(data?.entities || []).map((e) => <option key={e} value={e}>{label(e)}</option>)}
        </select>
        <input type="date" className="input h-10 w-auto" value={f.from_date} onChange={(e) => setFilter('from_date', e.target.value)} aria-label="From date" />
        <input type="date" className="input h-10 w-auto" value={f.to_date} onChange={(e) => setFilter('to_date', e.target.value)} aria-label="To date" />
      </div>
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>When</th><th className={thCls}>Staff</th><th className={thCls}>Action</th><th className={thCls}>What happened</th><th className={thCls}>IP</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((a) => {
                  const act = ACTIONS[a.action] || { label: a.action, cls: 'bg-slate-100' };
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className={`${tdCls} whitespace-nowrap text-xs text-slate-500`}>{fmtDate(a.created_at, true)}</td>
                      <td className={`${tdCls} font-medium`}>{a.user_name || '—'}</td>
                      <td className={tdCls}><span className={`badge ${act.cls}`}>{act.label}</span></td>
                      <td className={tdCls}>{a.summary}</td>
                      <td className={`${tdCls} font-mono text-[11px] text-slate-400`}>{a.ip}</td>
                    </tr>
                  );
                })}
                {!data.data.length ? <tr><td colSpan={5} className="py-12 text-center text-slate-500">No activity recorded yet.</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={(page) => setF((x) => ({ ...x, page }))} />
          </div>
        )}
      </Card>
    </>
  );
}

export default function Page() {
  return <Guard perm="settings"><Activity /></Guard>;
}
