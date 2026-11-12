'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { imgUrl, taka } from '@/lib/format';

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        setResults(res.ok ? await res.json() : []);
        setOpen(true);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    setOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form onSubmit={submit} className="relative w-full" role="search">
      <div className="flex h-10 overflow-hidden rounded-full bg-white md:h-11">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search for something..."
          className="min-w-0 flex-1 bg-transparent px-5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          aria-label="Search products"
        />
        <button type="submit" className="grid w-14 place-items-center bg-primary text-white" aria-label="Search">
          <Icon name="search" className="h-5 w-5" />
        </button>
      </div>
      {open && q.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xl">
          {results.length ? (
            <>
              {results.map((p) => (
                <Link key={p.id} href={`/product/${p.slug}`} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50" onClick={() => setOpen(false)}>
                  <Image src={imgUrl(p.thumbnail)} alt="" width={44} height={44} className="h-11 w-11 rounded-lg bg-slate-50 object-contain" />
                  <span className="line-clamp-1 flex-1 text-sm">{p.name}</span>
                  <span className="text-sm font-semibold text-primary">{taka(p.price)}</span>
                </Link>
              ))}
              <button type="submit" className="block w-full border-t border-slate-100 px-3 py-2.5 text-center text-sm font-medium text-primary hover:bg-slate-50">
                See all results for “{q}”
              </button>
            </>
          ) : (
            <p className="px-4 py-3 text-sm text-slate-500">No products found</p>
          )}
        </div>
      ) : null}
    </form>
  );
}
