import { notFound } from 'next/navigation';
import { getPage } from '@/lib/api';
import { stripHtml } from '@/lib/format';
import { Breadcrumb } from '@/components/store/Bits';

export const revalidate = 3600;
export async function generateStaticParams() { return []; }

const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await getPage(decode(slug));
  return page ? { title: page.title, description: stripHtml(page.content) } : {};
}

export default async function StaticPage({ params }) {
  const { slug } = await params;
  const page = await getPage(decode(slug));
  if (!page) notFound();
  return (
    <div className="container-x py-6">
      <Breadcrumb items={[{ name: 'Home', href: '/' }, { name: page.title }]} />
      <article className="mx-auto mt-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{page.title}</h1>
        <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: page.content || '' }} />
      </article>
    </div>
  );
}
