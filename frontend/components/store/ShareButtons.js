'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';

export default function ShareButtons({ name }) {
  const [copied, setCopied] = useState(false);
  const url = () => (typeof window !== 'undefined' ? window.location.href : '');
  const btn = 'grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary hover:text-primary';
  return (
    <div className="mt-5 flex items-center gap-2 text-sm text-slate-600">
      <span className="font-medium">Share:</span>
      <button type="button" className={btn} aria-label="Share on Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`, '_blank', 'width=600,height=500')}>
        <Icon name="facebook" className="h-4 w-4" />
      </button>
      <button type="button" className={btn} aria-label="Share on WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${name} ${url()}`)}`, '_blank')}>
        <Icon name="whatsapp" className="h-4 w-4" />
      </button>
      <button type="button" className={btn} aria-label="Copy link" onClick={async () => { await navigator.clipboard?.writeText(url()); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
      </button>
      {copied ? <span className="text-xs text-emerald-600">Link copied</span> : null}
    </div>
  );
}
