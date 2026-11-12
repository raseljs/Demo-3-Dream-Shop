'use client';
import { useEffect, useRef, useState } from 'react';
import { upload } from '@/lib/client';
import { imgUrl } from '@/lib/format';

const TOOLS = [
  ['bold', 'B', 'font-bold'],
  ['italic', 'I', 'italic'],
  ['underline', 'U', 'underline'],
  ['formatBlock:h2', 'H2', 'font-semibold'],
  ['formatBlock:h3', 'H3', 'font-semibold'],
  ['formatBlock:p', '¶', ''],
  ['insertUnorderedList', '• List', ''],
  ['insertOrderedList', '1. List', ''],
  ['formatBlock:blockquote', '❝', ''],
];

/** Lightweight WYSIWYG editor (no external package). Value is HTML. */
export default function RichEditor({ value, onChange, minHeight = 220 }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const [html, setHtml] = useState(false);

  useEffect(() => {
    if (ref.current && !html && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || '';
  }, [value, html]);

  const exec = (cmd) => {
    ref.current?.focus();
    const [c, arg] = cmd.split(':');
    document.execCommand(c, false, arg ? `<${arg}>` : null);
    onChange(ref.current.innerHTML);
  };
  const link = () => {
    const url = prompt('Link URL');
    if (url) { ref.current?.focus(); document.execCommand('createLink', false, url); onChange(ref.current.innerHTML); }
  };
  const image = async (file) => {
    if (!file) return;
    try {
      const url = await upload(file);
      ref.current?.focus();
      document.execCommand('insertImage', false, imgUrl(url));
      onChange(ref.current.innerHTML);
    } catch (e) { alert(e.message); }
  };
  const table = () => {
    ref.current?.focus();
    document.execCommand('insertHTML', false, '<table><tbody><tr><td>Name</td><td>Value</td></tr><tr><td>Name</td><td>Value</td></tr></tbody></table><p></p>');
    onChange(ref.current.innerHTML);
  };

  const btn = 'rounded-md px-2 py-1 text-xs hover:bg-slate-200';
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-primary">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        {!html ? TOOLS.map(([cmd, label, cls]) => (
          <button key={cmd} type="button" className={`${btn} ${cls}`} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd)}>{label}</button>
        )) : null}
        {!html ? (
          <>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={link}>Link</button>
            <button type="button" className={btn} onClick={() => fileRef.current?.click()}>Image</button>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={table}>Table</button>
            <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => exec('removeFormat')}>Clear</button>
          </>
        ) : null}
        <button type="button" className={`${btn} ml-auto font-mono`} onClick={() => setHtml(!html)}>{html ? 'Visual' : '</> HTML'}</button>
      </div>
      {html ? (
        <textarea className="block w-full p-3 font-mono text-xs outline-none" style={{ minHeight }} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          className="prose-content max-w-none p-3 outline-none"
          style={{ minHeight }}
          onInput={(e) => onChange(e.currentTarget.innerHTML)}
          onBlur={(e) => onChange(e.currentTarget.innerHTML)}
        />
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { image(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
