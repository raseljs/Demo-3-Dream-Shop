'use client';
import { use } from 'react';
import { RESOURCES } from '@/lib/admin-resources';
import ResourcePage from '@/components/admin/ResourcePage';
import { Guard } from '@/components/admin/AdminShell';

export default function ResourceRoute({ params }) {
  const { resource } = use(params);
  const config = RESOURCES[resource];
  if (!config) return <p className="p-8 text-center text-slate-500">Unknown section.</p>;
  return (
    <Guard perm={config.perm}>
      <ResourcePage key={resource} name={resource} config={config} />
    </Guard>
  );
}
