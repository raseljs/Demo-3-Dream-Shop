'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Field, Loading, Modal, PageHeader } from '@/components/admin/ui';
import { api } from '@/lib/client';

const LOCATIONS = { header: 'Header (category bar & mobile menu)', footer_1: 'Footer column 1 — Know Us', footer_2: 'Footer column 2 — Shopping Information' };

function ItemRow({ item, onChange, onRemove, onMove, depth = 0 }) {
  const set = (k) => (e) => onChange({ ...item, [k]: e.target.value });
  const children = item.children || [];
  return (
    <div className={depth ? 'ml-8 mt-2' : ''}>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex flex-col">
          <button type="button" onClick={() => onMove(-1)} className="text-slate-400 hover:text-slate-800" aria-label="Up"><Icon name="chevron-up" className="h-4 w-4" /></button>
          <button type="button" onClick={() => onMove(1)} className="text-slate-400 hover:text-slate-800" aria-label="Down"><Icon name="chevron-down" className="h-4 w-4" /></button>
        </div>
        <input className="input input-sm h-9 flex-1 min-w-32" value={item.label} onChange={set('label')} placeholder="Label" />
        <input className="input input-sm h-9 flex-1 min-w-40" value={item.url} onChange={set('url')} placeholder="/category/…" />
        {depth === 0 ? <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange({ ...item, children: [...children, { label: 'New item', url: '/' }] })}><Icon name="plus" className="h-4 w-4" /> Sub</button> : null}
        <button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={onRemove} aria-label="Remove"><Icon name="trash" className="h-4 w-4" /></button>
      </div>
      {children.map((c, i) => (
        <ItemRow key={i} item={c} depth={1}
          onChange={(v) => onChange({ ...item, children: children.map((x, j) => (j === i ? v : x)) })}
          onRemove={() => onChange({ ...item, children: children.filter((_, j) => j !== i) })}
          onMove={(d) => { const n = [...children]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange({ ...item, children: n }); }} />
      ))}
    </div>
  );
}

export default function MenusPage() {
  const { meta, toast } = useAdmin();
  const [menus, setMenus] = useState(null);
  const [active, setActive] = useState(null);
  const [items, setItems] = useState([]);
  const [pages, setPages] = useState([]);
  const [creating, setCreating] = useState(null);
  const [saving, setSaving] = useState(false);
  // category slugs for links (meta only has ids/names)
  const [slugs, setSlugs] = useState({});
  useEffect(() => { api('/admin/categories?per_page=500').then((r) => setSlugs(Object.fromEntries(r.data.map((c) => [c.id, c.slug])))).catch(() => {}); }, []);
  const slugOf = (c) => slugs[c.id] || c.id;

  const load = async (pick) => {
    const r = await api('/admin/menus?per_page=100');
    setMenus(r.data);
    const m = r.data.find((x) => x.id === pick) || r.data[0];
    if (m) { setActive(m.id); setItems(m.items || []); }
  };
  useEffect(() => {
    load().catch((e) => toast(e.message, 'error'));
    api('/admin/pages?per_page=100').then((r) => setPages(r.data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!menus) return <Loading />;
  const current = menus.find((m) => m.id === active);
  const select = (m) => { setActive(m.id); setItems(m.items || []); };
  const save = async () => {
    setSaving(true);
    try { await api(`/admin/menus/${active}`, { method: 'PUT', body: { items } }); toast('Menu saved'); await load(active); } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  const create = async () => {
    try { const m = await api('/admin/menus', { method: 'POST', body: { ...creating, items: [] } }); setCreating(null); await load(m.id); } catch (e) { toast(e.message, 'error'); }
  };
  const del = async () => {
    if (!confirm('Delete this menu?')) return;
    await api(`/admin/menus/${active}`, { method: 'DELETE' });
    load();
  };
  const addCategory = (id) => {
    const cat = meta?.categories.find((c) => String(c.id) === id);
    if (!cat) return;
    const children = (meta.categories || []).filter((c) => c.parent_id === cat.id).map((c) => ({ label: c.name, url: `/category/${slugOf(c)}` }));
    setItems([...items, { label: cat.name, url: `/category/${slugOf(cat)}`, children }]);
  };

  return (
    <Guard perm="appearance">
      <PageHeader title="Manage Menus" actions={<button type="button" className="btn btn-outline" onClick={() => setCreating({ name: '', location: '' })}><Icon name="plus" className="h-4 w-4" /> Menu Creation</button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {menus.map((m) => (
          <button key={m.id} type="button" onClick={() => select(m)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${m.id === active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}`}>{m.name}</button>
        ))}
      </div>
      {current ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <Card title={`${current.name}`} actions={<span className="text-xs text-slate-500">{LOCATIONS[current.location] || `location: ${current.location}`}</span>}>
            <div className="space-y-2">
              {items.map((it, i) => (
                <ItemRow key={i} item={it}
                  onChange={(v) => setItems(items.map((x, j) => (j === i ? v : x)))}
                  onRemove={() => setItems(items.filter((_, j) => j !== i))}
                  onMove={(d) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setItems(n); }} />
              ))}
              {!items.length ? <p className="py-6 text-center text-sm text-slate-500">This menu is empty. Add links on the right.</p> : null}
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-2">
              <button type="button" className="btn btn-outline" onClick={() => setItems([...items, { label: 'New link', url: '/' }])}><Icon name="plus" className="h-4 w-4" /> Custom link</button>
              <div className="flex gap-2">
                {!LOCATIONS[current.location] ? <button type="button" className="btn btn-outline text-rose-600" onClick={del}>Delete menu</button> : null}
                <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Menu'}</button>
              </div>
            </div>
          </Card>
          <div className="space-y-5">
            <Card title="Add category">
              <select className="input" value="" onChange={(e) => addCategory(e.target.value)}>
                <option value="">Choose a category…</option>
                {(meta?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.parent_id ? '— ' : ''}{c.name}</option>)}
              </select>
              <p className="mt-2 text-xs text-slate-500">Sub-categories are added automatically.</p>
            </Card>
            <Card title="Add page">
              <div className="flex flex-wrap gap-1.5">
                {pages.map((p) => <button key={p.id} type="button" className="badge bg-slate-100 py-1.5 text-slate-700 hover:bg-primary hover:text-white" onClick={() => setItems([...items, { label: p.title, url: `/${p.slug}` }])}>{p.title}</button>)}
                <button type="button" className="badge bg-slate-100 py-1.5 text-slate-700 hover:bg-primary hover:text-white" onClick={() => setItems([...items, { label: 'Track Order', url: '/track-order' }])}>Track Order</button>
                <button type="button" className="badge bg-slate-100 py-1.5 text-slate-700 hover:bg-primary hover:text-white" onClick={() => setItems([...items, { label: 'Shop', url: '/shop' }])}>Shop</button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
      <Modal open={!!creating} onClose={() => setCreating(null)} title="Create menu" footer={<button type="button" className="btn btn-primary" onClick={create}>Create</button>}>
        <div className="grid gap-4">
          <Field label="Name"><input className="input" value={creating?.name || ''} onChange={(e) => setCreating({ ...creating, name: e.target.value })} /></Field>
          <Field label="Location key" hint="Used by the theme, e.g. footer_3"><input className="input" value={creating?.location || ''} onChange={(e) => setCreating({ ...creating, location: e.target.value })} /></Field>
        </div>
      </Modal>
    </Guard>
  );
}
