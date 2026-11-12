'use client';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { api } from '@/lib/client';
import { fmtDate, qs, taka } from '@/lib/format';
import { useAdmin } from './AdminShell';
import { ImageUpload } from './Media';
import RichEditor from './RichEditor';
import { Card, Field, Modal, PageHeader, Pager, SearchInput, Thumb, Toggle, Loading, thCls, tdCls, ProductPicker } from './ui';

function TagsInput({ value = [], onChange }) {
  const [v, setV] = useState('');
  const addTag = () => {
    const t = v.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setV('');
  };
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2 py-1.5">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs">
          {t}<button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label="Remove"><Icon name="x" className="h-3 w-3" /></button>
        </span>
      ))}
      <input className="min-w-24 flex-1 px-1 text-sm outline-none" value={v} onChange={(e) => setV(e.target.value)} onBlur={addTag}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} placeholder="Add value…" />
    </div>
  );
}

function ProductsInput({ value = [], onChange }) {
  const [names, setNames] = useState({});
  useEffect(() => {
    const missing = value.filter((id) => !names[id]);
    if (!missing.length) return;
    Promise.all(missing.map((id) => api(`/admin/products/${id}`).then((p) => [id, p.name]).catch(() => [id, `#${id}`])))
      .then((pairs) => setNames((n) => ({ ...n, ...Object.fromEntries(pairs) })));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-2">
      <ProductPicker onPick={(p) => { if (!value.includes(p.id)) { setNames((n) => ({ ...n, [p.id]: p.name })); onChange([...value, p.id]); } }} />
      <div className="flex flex-wrap gap-1.5">
        {value.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs">
            {names[id] || `#${id}`}<button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label="Remove"><Icon name="x" className="h-3 w-3" /></button>
          </span>
        ))}
        {!value.length ? <span className="text-xs text-slate-500">All products</span> : null}
      </div>
    </div>
  );
}

export function FieldInput({ field, value, onChange, meta }) {
  const opts = typeof field.options === 'string' ? meta?.[field.options] || [] : field.options || [];
  switch (field.type) {
    case 'textarea': return <textarea className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'rich': return <RichEditor value={value || ''} onChange={onChange} />;
    case 'number': return <input type="number" step="any" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'date': return <input type="date" className="input" value={value ? String(value).slice(0, 10) : ''} onChange={(e) => onChange(e.target.value)} />;
    case 'datetime': return <input type="datetime-local" className="input" value={value ? String(value).slice(0, 16).replace(' ', 'T') : ''} onChange={(e) => onChange(e.target.value)} />;
    case 'color': return <input type="color" className="h-11 w-20 rounded-xl border border-slate-300" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />;
    case 'toggle': return <Toggle checked={!!Number(value)} onChange={(v) => onChange(v ? 1 : 0)} />;
    case 'image': return <ImageUpload value={value} onChange={onChange} className={field.wide ? 'w-full max-w-md' : 'w-36'} aspect={field.wide ? 'aspect-video' : 'aspect-square'} />;
    case 'media': return <ImageUpload value={value} onChange={onChange} accept="image/*,video/mp4,video/webm" className="w-full max-w-sm" aspect="aspect-[20/7]" label="Upload image or video" />;
    case 'tags': return <TagsInput value={value || []} onChange={onChange} />;
    case 'products': return <ProductsInput value={value || []} onChange={onChange} />;
    case 'select':
      return (
        <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {field.empty !== undefined ? <option value="">{field.empty}</option> : null}
          {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      );
    default: return <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

function Cell({ col, row }) {
  const v = row[col.key];
  if (col.render) return col.render(row);
  switch (col.type) {
    case 'image': return <Thumb src={v} size={col.size || 40} />;
    case 'bool': return Number(v) ? <span className="badge bg-emerald-100 text-emerald-700">Yes</span> : <span className="badge bg-slate-100 text-slate-500">No</span>;
    case 'money': return taka(v);
    case 'date': return v ? fmtDate(v) : '—';
    case 'tags': return <span className="flex flex-wrap gap-1">{(v || []).map((t) => <span key={t} className="badge bg-slate-100 text-slate-700">{t}</span>)}</span>;
    default: return v ?? '—';
  }
}

export default function ResourcePage({ name, config }) {
  const { meta, loadMeta, toast } = useAdmin();
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} (new) | row
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => qs({ ...filters, page, per_page: config.perPage || 50 }), [filters, page, config.perPage]);
  const load = () => api(`/admin/${name}${query}`).then(setData).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (row) => {
    const init = {};
    for (const f of config.fields) init[f.name] = row ? row[f.name] : f.default ?? (f.type === 'tags' || f.type === 'products' ? [] : '');
    setForm(init);
    setEditing(row || {});
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form };
      if (body.slug === '') delete body.slug;
      if (editing.id) await api(`/admin/${name}/${editing.id}`, { method: 'PUT', body });
      else await api(`/admin/${name}`, { method: 'POST', body });
      toast('Saved');
      setEditing(null);
      load();
      if (config.afterSave === 'meta') loadMeta();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const del = async (row) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    try {
      await api(`/admin/${name}/${row.id}`, { method: 'DELETE' });
      toast('Deleted');
      load();
      if (config.afterSave === 'meta') loadMeta();
    } catch (err) { toast(err.message, 'error'); }
  };

  const quick = async (row, body) => {
    try { await api(`/admin/${name}/${row.id}`, { method: 'PUT', body }); load(); } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={!config.noCreate ? <button type="button" className="btn btn-primary" onClick={() => open(null)}><Icon name="plus" className="h-4 w-4" /> Add New</button> : null}
      />
      {config.search || config.filters ? (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          {config.search ? <SearchInput value={filters.search} onChange={(v) => { setPage(1); setFilters((f) => ({ ...f, search: v })); }} /> : null}
          {(config.filters || []).map((f) => (
            <div key={f.name} className="w-44">
              <label className="mb-1 block text-xs font-medium text-slate-500">{f.label}</label>
              <FieldInput field={f} meta={meta} value={filters[f.name]} onChange={(v) => { setPage(1); setFilters((x) => ({ ...x, [f.name]: v })); }} />
            </div>
          ))}
        </div>
      ) : null}
      {config.summary && data?.summary ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Total</p><p className="text-xl font-bold">{taka(data.summary.total)}</p></div>
          {data.summary.by_category.slice(0, 3).map((c) => (
            <div key={c.name} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">{c.name}</p><p className="text-xl font-bold">{taka(c.amount)}</p></div>
          ))}
        </div>
      ) : null}
      <Card bodyClass="">
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {config.columns.map((c) => <th key={c.key} className={thCls}>{c.label || ''}</th>)}
                  <th className={`${thCls} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    {config.columns.map((c) => (
                      <td key={c.key} className={`${tdCls} ${c.strong ? 'font-semibold' : ''} ${c.muted ? 'text-slate-500' : ''} ${c.clamp ? 'max-w-xs truncate' : ''}`}><Cell col={c} row={row} /></td>
                    ))}
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      {(config.quickActions || []).filter((a) => a.when(row)).map((a) => (
                        <button key={a.label} type="button" className="btn btn-sm btn-success mr-1" onClick={() => quick(row, a.body)}>{a.label}</button>
                      ))}
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => open(row)} aria-label="Edit"><Icon name="edit" className="h-4 w-4" /></button>
                      <button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={() => del(row)} aria-label="Delete"><Icon name="trash" className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {!data.data.length ? <tr><td colSpan={config.columns.length + 1} className="px-4 py-12 text-center text-slate-500">Nothing here yet.</td></tr> : null}
              </tbody>
            </table>
            <Pager page={data.page} lastPage={data.last_page} total={data.total} onChange={setPage} />
          </div>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${config.title.replace(/s$/, '')}` : `Add ${config.title.replace(/s$/, '')}`}
        size={config.modalSize || 'max-w-2xl'}
        footer={<><button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button><button type="submit" form="resource-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}
      >
        <form id="resource-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {config.fields.map((f) => (
            <Field key={f.name} label={f.label} hint={f.hint} required={f.required}
              className={f.wide || ['rich', 'textarea', 'tags', 'products', 'media', 'toggle'].includes(f.type) ? 'sm:col-span-2' : ''}>
              <FieldInput field={f} meta={meta} value={form[f.name]} onChange={(v) => setForm((x) => ({ ...x, [f.name]: v }))} />
            </Field>
          ))}
        </form>
      </Modal>
    </>
  );
}
