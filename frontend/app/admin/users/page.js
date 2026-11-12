'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Field, Loading, Modal, PageHeader, Pager, SearchInput, Toggle, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate, qs } from '@/lib/format';

const BLANK = { name: '', phone: '', email: '', role_id: '', password: '', status: 1 };

export default function UsersPage() {
  const { meta, toast, loadMeta } = useAdmin();
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = () => api(`/admin/users${qs({ role, search, page })}`).then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [role, search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = { ...edit };
      if (!body.password) delete body.password;
      if (edit.id) await api(`/admin/users/${edit.id}`, { method: 'PUT', body });
      else await api('/admin/users', { method: 'POST', body });
      toast('User saved');
      setEdit(null);
      load();
      loadMeta();
    } catch (err) { toast(err.message, 'error'); }
  };
  const del = async (u) => {
    if (!confirm(`Delete ${u.name}?`)) return;
    try { await api(`/admin/users/${u.id}`, { method: 'DELETE' }); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const block = async (u) => {
    if (!confirm(`Block ${u.phone} from placing orders?`)) return;
    try { await api('/admin/blocklists', { method: 'POST', body: { phone: u.phone, note: `Blocked user ${u.name}` } }); toast('Phone blocked'); } catch (e) { toast(e.message, 'error'); }
  };

  const tabs = [['', 'All'], ['customer', 'Customer'], ['staff', 'Staff'], ...(meta?.roles || []).map((r) => [String(r.id), r.name])];
  return (
    <Guard perm="users">
      <PageHeader title="All Users" actions={<button type="button" className="btn btn-primary" onClick={() => setEdit({ ...BLANK })}><Icon name="plus" className="h-4 w-4" /> Add New</button>} />
      <div className="mb-3 flex flex-wrap gap-1">
        {tabs.map(([k, l]) => <button key={k} type="button" onClick={() => { setPage(1); setRole(k); }} className={`rounded-full px-4 py-1.5 text-sm font-medium ${role === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}`}>{l}</button>)}
      </div>
      <div className="mb-4"><SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Name, phone or email…" /></div>
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>Name</th><th className={thCls}>Role</th><th className={thCls}>Phone</th><th className={thCls}>Email</th><th className={thCls}>Orders</th><th className={thCls}>Joined</th><th className={`${thCls} text-right`}>Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((u) => (
                  <tr key={u.id}>
                    <td className={`${tdCls} font-medium`}>{u.name}{!Number(u.status) ? <span className="badge ml-1 bg-rose-100 text-rose-700">disabled</span> : null}</td>
                    <td className={tdCls}>{u.is_staff ? <span className="badge bg-violet-100 text-violet-700">{u.role_name || 'Staff'}</span> : <span className="badge bg-slate-100 text-slate-600">Customer</span>}</td>
                    <td className={tdCls}>{u.phone}</td>
                    <td className={`${tdCls} text-slate-500`}>{u.email || '—'}</td>
                    <td className={tdCls}>{u.orders_count}</td>
                    <td className={`${tdCls} text-xs text-slate-500`}>{fmtDate(u.created_at)}</td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      {!u.is_staff ? <button type="button" className="btn btn-sm btn-ghost" title="Block phone" onClick={() => block(u)}><Icon name="ban" className="h-4 w-4" /></button> : null}
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEdit({ ...BLANK, ...u, role_id: u.role_id || '', password: '' })}><Icon name="edit" className="h-4 w-4" /></button>
                      <button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={() => del(u)}><Icon name="trash" className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {!data.data.length ? <tr><td colSpan={7} className="py-12 text-center text-slate-500">No users found.</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={setPage} />
          </div>
        )}
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit User' : 'Add New User'} footer={<button type="submit" form="user-form" className="btn btn-primary">Save</button>}>
        {edit ? (
          <form id="user-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
            <Field label="Phone" required><input className="input" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} required /></Field>
            <Field label="Email"><input type="email" className="input" value={edit.email || ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
            <Field label="Role" hint="Staff roles can log in to the admin panel">
              <select className="input" value={edit.role_id || ''} onChange={(e) => setEdit({ ...edit, role_id: e.target.value })}>
                <option value="">Customer</option>
                {(meta?.roles || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label={edit.id ? 'New password (leave empty to keep)' : 'Password'} required={!edit.id}><input type="password" className="input" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} required={!edit.id} minLength={6} /></Field>
            <Field label="Status"><Toggle checked={!!Number(edit.status)} onChange={(v) => setEdit({ ...edit, status: v ? 1 : 0 })} label="Active" /></Field>
          </form>
        ) : null}
      </Modal>
    </Guard>
  );
}
