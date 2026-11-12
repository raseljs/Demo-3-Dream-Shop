'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Field, Loading, Modal, PageHeader } from '@/components/admin/ui';
import { api } from '@/lib/client';

const LABELS = {
  dashboard: 'Dashboard', pos: 'POS', products: 'Products & labels', catalog: 'Brands, categories, attributes, size charts',
  orders: 'Online & incomplete orders', returns: 'Returns', expenses: 'Expenses', reports: 'Reports', marketing: 'Landing pages & coupons',
  users: 'Users, blocklist & roles', reviews: 'Product reviews', appearance: 'Menus, sliders & pages', settings: 'Settings',
};

export default function RolesPage() {
  const { meta, toast, loadMeta } = useAdmin();
  const [roles, setRoles] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = () => api('/admin/roles?per_page=100').then((r) => setRoles(r.data)).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    try {
      if (edit.id) await api(`/admin/roles/${edit.id}`, { method: 'PUT', body: { name: edit.name, permissions: edit.permissions } });
      else await api('/admin/roles', { method: 'POST', body: { name: edit.name, permissions: edit.permissions } });
      toast('Role saved');
      setEdit(null);
      load();
      loadMeta();
    } catch (e) { toast(e.message, 'error'); }
  };
  const del = async (r) => {
    if (!confirm(`Delete role "${r.name}"?`)) return;
    try { await api(`/admin/roles/${r.id}`, { method: 'DELETE' }); load(); loadMeta(); } catch (e) { toast(e.message, 'error'); }
  };
  const perms = meta?.permissions || Object.keys(LABELS);

  return (
    <Guard perm="users">
      <PageHeader title="Roles & Permissions" actions={<button type="button" className="btn btn-primary" onClick={() => setEdit({ name: '', permissions: ['dashboard'] })}><Icon name="plus" className="h-4 w-4" /> New Role</button>} />
      {!roles ? <Loading /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => {
            const all = r.permissions.includes('*');
            return (
              <Card key={r.id} title={r.name} actions={<span className="text-xs text-slate-500">{r.users_count} user(s)</span>}>
                <div className="flex min-h-16 flex-wrap gap-1.5">
                  {all ? <span className="badge bg-emerald-100 text-emerald-700">Full access</span> : r.permissions.map((p) => <span key={p} className="badge bg-slate-100 text-slate-700">{p}</span>)}
                </div>
                {!all ? (
                  <div className="mt-4 flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => setEdit({ ...r })}><Icon name="edit" className="h-4 w-4" /> Edit</button>
                    <button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={() => del(r)}><Icon name="trash" className="h-4 w-4" /></button>
                  </div>
                ) : <p className="mt-4 text-xs text-slate-500">The main Admin role always has every permission.</p>}
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit Role' : 'New Role'} footer={<button type="button" className="btn btn-primary" onClick={save}>Save</button>}>
        {edit ? (
          <div className="space-y-4">
            <Field label="Role name" required><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div className="grid gap-2 sm:grid-cols-2">
              {perms.map((p) => (
                <label key={p} className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm hover:border-primary">
                  <input type="checkbox" className="mt-0.5 accent-[var(--primary)]" checked={edit.permissions.includes(p)}
                    onChange={() => setEdit({ ...edit, permissions: edit.permissions.includes(p) ? edit.permissions.filter((x) => x !== p) : [...edit.permissions, p] })} />
                  <span><b className="capitalize">{p}</b><span className="block text-xs text-slate-500">{LABELS[p]}</span></span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </Guard>
  );
}
