'use client';
import { useParams } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { readPreview } from '@/lib/productPreview';
import ProductPreviewView from '@/components/store/ProductPreviewView';

const noop = () => () => {};

// Shown while a product page loads: the photo, name and price remembered from the clicked card
// appear in the same layout as the product page, and the rest fills in when the page arrives.
export default function ProductLoading() {
  const params = useParams();
  const p = useSyncExternalStore(noop, () => readPreview(params?.slug || ''), () => null);
  return <ProductPreviewView p={p} />;
}
