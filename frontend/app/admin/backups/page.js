'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Field, Loading, PageHeader, Toggle, thCls, tdCls } from '@/components/admin/ui';
import { api, downloadFile } from '@/lib/client';
import { fmtDate } from '@/lib/format';

const size = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function Backups() {
  const { toast } = useAdmin();
  const [data, setData] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState('');
  const load = () => api('/admin/backups').then((d) => { setData(d.data); setCfg((c) => c || d.settings); }).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setBusy('create');
    try { const b = await api('/admin/backups', { method: 'POST' }); toast(`Backup created (${size(b.size || 0)})`); load(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };
  const download = async (b) => {
    setBusy(b.file);
    try { await downloadFile(`/admin/backups/${encodeURIComponent(b.file)}`, b.file); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };
  const del = async (b) => {
    if (!confirm(`Delete backup ${b.file}?`)) return;
    try { await api(`/admin/backups/${encodeURIComponent(b.file)}`, { method: 'DELETE' }); toast('Backup deleted'); load(); } catch (e) { toast(e.message, 'error'); }
  };
  const saveCfg = async () => {
    setBusy('cfg');
    try { setCfg(await api('/admin/settings/backup', { method: 'PUT', body: cfg })); toast('Backup settings saved'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  return (
    <>
      <PageHeader title="Backups" subtitle="A copy of your whole database — orders, products, customers and settings" actions={<button type="button" className="btn btn-primary" disabled={busy === 'create'} onClick={create}><Icon name="database" className="h-4 w-4" /> {busy === 'create' ? 'Backing up…' : 'Back up now'}</button>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card title="Saved backups" bodyClass="">
          {!data ? <Loading /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className={thCls}>Backup</th><th className={`${thCls} text-right`}>Size</th><th className={`${thCls} text-right`}>Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((b) => (
                    <tr key={b.file} className="hover:bg-slate-50">
                      <td className={tdCls}><p className="font-medium">{fmtDate(b.created_at, true)}</p><p className="font-mono text-[11px] text-slate-500">{b.file}</p></td>
                      <td className={`${tdCls} text-right`}>{size(b.size)}</td>
                      <td className={`${tdCls} whitespace-nowrap text-right`}>
                        <button type="button" className="btn btn-sm btn-outline" disabled={busy === b.file} onClick={() => download(b)}><Icon name="download" className="h-4 w-4" /> {busy === b.file ? 'Downloading…' : 'Download'}</button>
                        <button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={() => del(b)} aria-label="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {!data.length ? <tr><td colSpan={3} className="py-12 text-center text-slate-500">No backups yet. Click “Back up now” to make the first one.</td></tr> : null}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card title="Automatic backup">
            {!cfg ? <Loading /> : (
              <div className="space-y-4">
                <Toggle checked={!!Number(cfg.auto_backup)} onChange={(v) => setCfg((c) => ({ ...c, auto_backup: v ? 1 : 0 }))} label="Back up every day" />
                <Field label="Time of day (Bangladesh)">
                  <select className="input" value={cfg.backup_hour} onChange={(e) => setCfg((c) => ({ ...c, backup_hour: Number(e.target.value) }))}>
                    {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{`${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`}</option>)}
                  </select>
                </Field>
                <Field label="Keep backups for (days)" hint="Older backups are deleted automatically"><input type="number" min="1" max="90" className="input" value={cfg.keep_days} onChange={(e) => setCfg((c) => ({ ...c, keep_days: e.target.value }))} /></Field>
                <button type="button" className="btn btn-primary w-full" disabled={busy === 'cfg'} onClick={saveCfg}>Save</button>
              </div>
            )}
          </Card>
          <Card title="Good to know">
            <ul className="list-disc space-y-1.5 pl-4 text-sm text-slate-600">
              <li>Download a backup now and then and keep it on your computer or Google Drive — if the server is lost, copies on it are lost too.</li>
              <li>On cPanel the backup is a <b>.sql.gz</b> file you can import in phpMyAdmin.</li>
              <li>Product images are not included; they stay in the <code>uploads</code> folder.</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return <Guard perm="settings"><Backups /></Guard>;
}
