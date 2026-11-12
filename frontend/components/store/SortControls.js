'use client';
import { useRouter } from 'next/navigation';
import { qs } from '@/lib/format';

export default function SortControls({ base, query }) {
  const router = useRouter();
  const go = (patch) => router.push(base + qs({ ...query, ...patch, page: undefined }));
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="flex items-center gap-2">
        <span className="hidden text-slate-500 sm:inline">Sort By</span>
        <select className="input input-sm w-auto" value={query.sort || ''} onChange={(e) => go({ sort: e.target.value || undefined })}>
          <option value="">Default</option>
          <option value="latest">Latest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name: A to Z</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="hidden text-slate-500 sm:inline">Show</span>
        <select className="input input-sm w-auto" value={query.per_page || '16'} onChange={(e) => go({ per_page: e.target.value === '16' ? undefined : e.target.value })}>
          <option value="16">16</option>
          <option value="24">24</option>
          <option value="36">36</option>
        </select>
      </label>
    </div>
  );
}
