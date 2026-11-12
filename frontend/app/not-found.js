import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <div style={{ minHeight: '70vh' }} className="flex flex-col items-center justify-center p-6 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
      <Link href="/" className="btn btn-primary mt-6">Go Home</Link>
    </div>
  );
}
