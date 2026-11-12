'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import Barcode from '@/components/admin/Barcode';
import { Card, PageHeader, ProductPicker, thCls, tdCls } from '@/components/admin/ui';
import { taka } from '@/lib/format';

export default function LabelsPage() {
  const { toast } = useAdmin();
  const [rows, setRows] = useState([]);
  const [size, setSize] = useState('50x30');

  const addProduct = (p) => {
    const list = p.type === 'variable' && p.variants?.length
      ? p.variants.map((v) => ({ key: `v${v.id}`, name: p.name, variant: v.name, sku: v.sku || p.sku || `P${p.id}-${v.id}`, regular: v.regular_price, sale: v.sale_price, copies: 1 }))
      : [{ key: `p${p.id}`, name: p.name, variant: '', sku: p.sku || `P${p.id}`, regular: p.regular_price, sale: p.sale_price, copies: 1 }];
    setRows((r) => [...r, ...list.filter((x) => !r.some((y) => y.key === x.key))]);
  };
  const upd = (key, patch) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const labels = rows.flatMap((r) => Array.from({ length: Math.max(0, Number(r.copies) || 0) }, (_, i) => ({ ...r, i })));
  const [w, h] = size.split('x').map(Number);

  return (
    <Guard perm="products">
      <div className="no-print">
        <PageHeader title="Product Label Printer" actions={<>
          <select className="input h-10 w-auto" value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="50x30">50 × 30 mm</option><option value="38x25">38 × 25 mm</option><option value="60x40">60 × 40 mm</option>
          </select>
          <button type="button" className="btn btn-primary" disabled={!labels.length} onClick={() => (labels.length ? window.print() : toast('Add products first', 'error'))}><Icon name="print" className="h-4 w-4" /> Generate & Print Labels</button>
        </>} />
        <Card>
          <ProductPicker withVariants onPick={addProduct} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><th className={thCls}>Product Name (SKU & Variant)</th><th className={thCls}>Reg. Price</th><th className={thCls}>Sale Price</th><th className={thCls}>Num of Copy</th><th className={thCls}>Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className={tdCls}><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.sku}{r.variant ? ` · ${r.variant}` : ''}</p></td>
                    <td className={tdCls}><input type="number" className="input input-sm w-24" value={r.regular} onChange={(e) => upd(r.key, { regular: e.target.value })} /></td>
                    <td className={tdCls}><input type="number" className="input input-sm w-24" value={r.sale} onChange={(e) => upd(r.key, { sale: e.target.value })} /></td>
                    <td className={tdCls}><input type="number" min="0" className="input input-sm w-20" value={r.copies} onChange={(e) => upd(r.key, { copies: e.target.value })} /></td>
                    <td className={tdCls}><button type="button" className="text-rose-600" onClick={() => setRows(rows.filter((x) => x.key !== r.key))}><Icon name="trash" className="h-4 w-4" /></button></td>
                  </tr>
                ))}
                {!rows.length ? <tr><td colSpan={5} className="py-10 text-center text-slate-500">Search and add products above.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>
        {labels.length ? <p className="mt-5 mb-2 text-sm font-semibold">Preview ({labels.length} labels)</p> : null}
      </div>
      <div className="flex flex-wrap gap-2 print:gap-0">
        {labels.map((l) => (
          <div key={`${l.key}-${l.i}`} className="flex flex-col items-center justify-between overflow-hidden border border-dashed border-slate-300 bg-white p-1 text-center print:border-0" style={{ width: `${w}mm`, height: `${h}mm`, breakInside: 'avoid' }}>
            <p className="line-clamp-1 w-full text-[8px] font-semibold leading-tight">{l.name}{l.variant ? ` (${l.variant})` : ''}</p>
            <Barcode value={l.sku} className="h-[45%] w-full" height={30} />
            <p className="text-[9px] font-bold leading-none">
              {Number(l.sale) > 0 && Number(l.sale) < Number(l.regular) ? <><span className="mr-1 font-normal line-through">{taka(l.regular)}</span>{taka(l.sale)}</> : taka(Number(l.sale) > 0 ? l.sale : l.regular)}
            </p>
          </div>
        ))}
      </div>
    </Guard>
  );
}
