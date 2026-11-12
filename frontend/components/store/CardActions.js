'use client';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { useCart } from './CartProvider';
import { flyToCart } from '@/lib/flyToCart';

export default function CardActions({ product: p }) {
  const router = useRouter();
  const { add } = useCart();
  const needsChoice = p.type === 'variable';

  const item = () => ({
    product_id: p.id, variant_id: null, name: p.name, variant_name: null, slug: p.slug, image: p.thumbnail,
    price: p.price, regular_price: p.regular_price, stock: p.in_stock ? 9999 : 0,
  });

  const onCart = (e) => {
    if (needsChoice) return router.push(`/product/${p.slug}`);
    const photo = e.currentTarget.closest('[data-product-card]')?.querySelector('img');
    // the photo flies into the cart; the item is added (and the badge pops) when it lands
    flyToCart(photo, { onLand: () => add(item(), 1, { open: false }) });
  };
  const onBuy = () => (needsChoice ? router.push(`/product/${p.slug}`) : router.push(`/checkout?buy=${p.id}&qty=1`));

  if (!p.in_stock) {
    return (
      <button type="button" disabled className="h-10 w-full rounded-xl bg-slate-100 text-sm font-medium text-slate-400">
        Out of Stock
      </button>
    );
  }
  return (
    <div className="flex gap-1.5 md:gap-2">
      <button type="button" onClick={onCart}
        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-primary hover:text-primary md:h-10">
        <Icon name="cart" className="h-4 w-4" />
        <span className="text-xs font-medium md:text-sm">Cart</span>
      </button>
      <button type="button" onClick={onBuy}
        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-white shadow-sm transition hover:opacity-90 hover:shadow-md md:h-10">
        <Icon name="package" className="h-4 w-4" />
        <span className="text-xs font-semibold md:text-sm">Buy</span>
      </button>
    </div>
  );
}
