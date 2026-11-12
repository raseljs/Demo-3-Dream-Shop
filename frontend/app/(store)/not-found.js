import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center py-20 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">The page you are looking for doesn&apos;t exist or has been moved.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn btn-primary">Go Home</Link>
        <Link href="/shop" className="btn btn-outline">Browse Products</Link>
      </div>
    </div>
  );
}
