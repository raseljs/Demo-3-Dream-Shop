'use client';
import { useState } from 'react';
import { taka } from '@/lib/format';

/** Minimal responsive SVG bar chart. data: [{ label, value, sub? }] */
export function BarChart({ data, height = 220, format = taka }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / Math.max(1, data.length);
  return (
    <div className="relative">
      <svg viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1="0" x2="100" y1={(height / 3) * (1 - g)} y2={(height / 3) * (1 - g)} stroke="#e2e8f0" strokeWidth="0.15" />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (height / 3 - 2);
          return (
            <rect
              key={i}
              x={i * w + w * 0.15}
              width={w * 0.7}
              y={height / 3 - h}
              height={Math.max(h, d.value ? 0.4 : 0)}
              rx="0.6"
              style={{ fill: hover === i ? 'var(--brand)' : 'var(--primary)' }}
              opacity={hover === null || hover === i ? 1 : 0.55}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      {hover !== null && data[hover] ? (
        <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow">
          <b>{data[hover].label}</b> · {format(data[hover].value)}{data[hover].sub ? ` · ${data[hover].sub}` : ''}
        </div>
      ) : null}
    </div>
  );
}

/** Horizontal bars for "top N" lists */
export function HBars({ data, format = taka }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between text-xs"><span className="truncate font-medium text-slate-700">{d.label}</span><span className="text-slate-500">{format(d.value)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
