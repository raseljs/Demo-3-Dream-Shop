'use client';
import Image from 'next/image';
import { useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { api, upload } from '@/lib/client';
import { imgUrl } from '@/lib/format';
import { Spinner } from './ui';

const isVideo = (src) => /\.(mp4|webm)$/i.test(src || '');

/** Single image / video uploader. value = '/uploads/…' */
export function ImageUpload({ value, onChange, accept = 'image/*', label = 'Upload image', aspect = 'aspect-square', className = 'w-36' }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    setErr('');
    try { onChange(await upload(file)); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className={className}>
      <div
        className={`group relative ${aspect} cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-primary`}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
        role="button"
        tabIndex={0}
      >
        {value ? (
          isVideo(value) ? <video src={imgUrl(value)} className="h-full w-full object-cover" muted /> : <Image src={imgUrl(value)} alt="" fill sizes="200px" className="object-contain" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-xs text-slate-500">
            <Icon name="upload" className="h-6 w-6" /> {label}
          </div>
        )}
        {busy ? <div className="absolute inset-0 grid place-items-center bg-white/70"><Spinner /></div> : null}
        {value ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); }} className="absolute right-1.5 top-1.5 hidden rounded-full bg-white p-1 text-rose-600 shadow group-hover:block" aria-label="Remove">
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      {err ? <p className="mt-1 text-xs text-rose-600">{err}</p> : null}
    </div>
  );
}

/** Multiple images (gallery) with reorder & remove */
export function MultiImageUpload({ value = [], onChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const add = async (files) => {
    setBusy(true);
    setErr('');
    const urls = [];
    try {
      for (const f of files) urls.push(await upload(f));
    } catch (e) { setErr(e.message); }
    onChange([...value, ...urls]);
    setBusy(false);
  };
  const [link, setLink] = useState('');
  const addLink = async () => {
    const url = link.trim();
    if (!url) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api('/admin/upload/url', { method: 'POST', body: { url } });
      onChange([...value, r.url]);
      setLink('');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const move = (i, d) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((src, i) => (
          <div key={src + i} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <Image src={imgUrl(src)} alt="" fill sizes="120px" className="object-contain" />
            <div className="absolute inset-x-0 bottom-0 hidden justify-between bg-black/50 p-1 group-hover:flex">
              <button type="button" onClick={() => move(i, -1)} className="text-white" aria-label="Move left"><Icon name="chevron-left" className="h-4 w-4" /></button>
              <button type="button" onClick={() => onChange(value.filter((_, x) => x !== i))} className="text-white" aria-label="Remove"><Icon name="trash" className="h-4 w-4" /></button>
              <button type="button" onClick={() => move(i, 1)} className="text-white" aria-label="Move right"><Icon name="chevron-right" className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => ref.current?.click()} className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-primary hover:text-primary">
          {busy ? <Spinner /> : <span className="flex flex-col items-center gap-1 text-xs"><Icon name="plus" /> Add images</span>}
        </button>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => { add([...e.target.files]); e.target.value = ''; }} />
      <div className="mt-2 flex gap-2">
        <input className="input input-sm" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} placeholder="Or paste an image link (https://…)" />
        <button type="button" className="btn btn-sm btn-outline shrink-0" disabled={busy || !link.trim()} onClick={addLink}>Add from link</button>
      </div>
      {err ? <p className="mt-1 text-xs text-rose-600">{err}</p> : null}
    </div>
  );
}
