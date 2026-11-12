'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { imgUrl } from '@/lib/format';

export default function ProductGallery({ images, name }) {
  const list = images.length ? images : [null];
  const [active, setActive] = useState(list[0]);
  const [zoom, setZoom] = useState(null);

  // Variant pickers broadcast their image
  useEffect(() => {
    const onVariant = (e) => e.detail && setActive(e.detail);
    window.addEventListener('variant-image', onVariant);
    return () => window.removeEventListener('variant-image', onVariant);
  }, []);

  return (
    <div className="md:sticky md:top-36 md:self-start">
      <div
        data-product-gallery
        className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <Image
          src={imgUrl(active)}
          alt={name}
          fill
          priority
          fetchPriority="high"
          sizes="(max-width: 768px) 100vw, 600px"
          className="object-contain transition-transform duration-200"
          style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
      </div>
      {list.length > 1 ? (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {list.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(src)}
              className={`relative h-18 w-18 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 transition ${active === src ? 'border-primary' : 'border-transparent hover:border-slate-300'}`}
              aria-label={`Image ${i + 1}`}
            >
              <Image src={imgUrl(src)} alt="" fill sizes="72px" className="object-contain" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
