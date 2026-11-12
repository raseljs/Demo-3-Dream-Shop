'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { Card, Field, PageHeader, Spinner, thCls, tdCls } from '@/components/admin/ui';
import { api } from '@/lib/client';
import { fmtDate } from '@/lib/format';

const AUDIENCES = [
  { id: 'all', label: 'All customers', hint: 'Everyone who has ever ordered' },
  { id: 'delivered', label: 'Received an order', hint: 'At least one delivered order' },
  { id: 'repeat', label: 'Repeat buyers', hint: 'Several delivered orders' },
  { id: 'inactive', label: 'Not ordered lately', hint: 'Bring old customers back' },
  { id: 'abandoned', label: 'Left checkout', hint: 'Filled the form but did not order' },
  { id: 'custom', label: 'My own list', hint: 'Paste phone numbers' },
];
const NAMES = Object.fromEntries(AUDIENCES.map((a) => [a.id, a.label]));

/** SMS length: Bangla/Unicode texts fit 70 characters per SMS (67 when split), English 160 (153). */
function segments(text) {
  const unicode = /[^\x00-\x7F]/.test(text);
  const len = [...text].length;
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return { len, unicode, count: len === 0 ? 0 : len <= single ? 1 : Math.ceil(len / multi), per: len <= single ? single : multi };
}

function BulkSms() {
  const { toast } = useAdmin();
  const [a, setA] = useState({ audience: 'all', min_orders: 2, days: 60, numbers: '' });
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(null);
  const [counting, setCounting] = useState(false);
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState([]);

  const loadCampaigns = () => api('/admin/sms/campaigns').then(setCampaigns).catch(() => {});
  useEffect(() => { loadCampaigns(); }, []);
  // keep progress fresh while a campaign is sending
  useEffect(() => {
    if (!campaigns.some((c) => c.status === 'sending')) return;
    const t = setTimeout(loadCampaigns, 3000);
    return () => clearTimeout(t);
  }, [campaigns]);

  useEffect(() => {
    setCounting(true);
    const t = setTimeout(() => {
      api('/admin/sms/audience', { method: 'POST', body: a }).then(setPreview).catch((e) => { setPreview(null); toast(e.message, 'error'); }).finally(() => setCounting(false));
    }, 400);
    return () => clearTimeout(t);
  }, [a]); // eslint-disable-line react-hooks/exhaustive-deps

  const seg = segments(message.replace(/\{name\}/g, 'Customer'));
  const send = async () => {
    if (!message.trim()) return toast('Write the message first', 'error');
    if (!preview?.count) return toast('No customers match this audience', 'error');
    if (!confirm(`Send this SMS to ${preview.count} customer(s)? About ${preview.count * seg.count} SMS will be used.`)) return;
    setSending(true);
    try {
      const r = await api('/admin/sms/send', { method: 'POST', body: { ...a, message } });
      toast(`Sending to ${r.total} customers…`);
      setMessage('');
      loadCampaigns();
    } catch (e) { toast(e.message, 'error'); } finally { setSending(false); }
  };
  const set = (k) => (e) => setA((x) => ({ ...x, [k]: e.target.value }));

  return (
    <>
      <PageHeader title="Bulk SMS" subtitle="Send an offer or update to a group of customers" actions={<Link href="/admin/settings/sms" className="btn btn-outline">SMS gateway settings</Link>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card title="Who gets it">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {AUDIENCES.map((x) => (
                <button key={x.id} type="button" onClick={() => setA((v) => ({ ...v, audience: x.id }))} className={`rounded-xl border p-3 text-left transition ${a.audience === x.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className="text-sm font-semibold">{x.label}</p>
                  <p className="text-xs text-slate-500">{x.hint}</p>
                </button>
              ))}
            </div>
            <div className="mt-4">
              {a.audience === 'repeat' ? <Field label="At least this many delivered orders"><input type="number" min="2" className="input w-40" value={a.min_orders} onChange={set('min_orders')} /></Field> : null}
              {a.audience === 'inactive' ? <Field label="No order in the last … days"><input type="number" min="1" className="input w-40" value={a.days} onChange={set('days')} /></Field> : null}
              {a.audience === 'abandoned' ? <Field label="Left checkout in the last … days"><input type="number" min="1" className="input w-40" value={a.days} onChange={set('days')} /></Field> : null}
              {a.audience === 'custom' ? <Field label="Phone numbers" hint="One per line, or separated by commas"><textarea className="input min-h-32 font-mono text-xs" value={a.numbers} onChange={set('numbers')} placeholder={'01712345678\n01812345678'} /></Field> : null}
            </div>
          </Card>
          <Card title="Message">
            <textarea className="input min-h-36" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="প্রিয় {name}, আজ রাত ১২টা পর্যন্ত সব পণ্যে ১০% ছাড়! অর্ডার করুন: yourshop.com" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Write <code className="rounded bg-slate-100 px-1">{'{name}'}</code> to put each customer&apos;s name.</span>
              <span className={seg.count > 2 ? 'font-semibold text-amber-700' : ''}>{seg.len} characters · {seg.count} SMS each{seg.unicode ? ' (Bangla: 70 per SMS)' : ''}</span>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Summary">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon name="users" /></span>
              <div>
                <p className="text-2xl font-bold">{counting ? <Spinner className="h-5 w-5" /> : preview?.count ?? 0}</p>
                <p className="text-xs text-slate-500">customers will get this message</p>
              </div>
            </div>
            {preview?.sample?.length ? (
              <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                {preview.sample.map((s) => <li key={s.phone} className="flex justify-between gap-2"><span className="truncate">{s.name || '—'}</span><span className="font-mono">{s.phone}</span></li>)}
                {preview.count > preview.sample.length ? <li className="text-slate-400">and {preview.count - preview.sample.length} more…</li> : null}
              </ul>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">Blocked numbers and duplicates are skipped automatically.</p>
            {message.trim() && preview?.count ? <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs">About <b>{preview.count * seg.count}</b> SMS credits will be used.</p> : null}
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={sending || counting || !preview?.count || !message.trim()} onClick={send}><Icon name="send" className="h-4 w-4" /> {sending ? 'Starting…' : 'Send SMS'}</button>
          </Card>
          {message.trim() ? (
            <Card title="Preview">
              <div className="rounded-2xl rounded-bl-sm bg-slate-100 p-3 text-sm whitespace-pre-wrap">{message.replace(/\{name\}/g, preview?.sample?.[0]?.name || 'Customer')}</div>
            </Card>
          ) : null}
        </div>
      </div>

      <Card title="Sent campaigns" className="mt-5" bodyClass="">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className={thCls}>When</th><th className={thCls}>Audience</th><th className={thCls}>Message</th><th className={thCls}>Progress</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c) => {
                const done = Number(c.sent) + Number(c.failed);
                return (
                  <tr key={c.id}>
                    <td className={`${tdCls} whitespace-nowrap text-xs text-slate-500`}>{fmtDate(c.created_at, true)}<br />{c.user_name}</td>
                    <td className={tdCls}>{NAMES[c.audience] || c.audience}</td>
                    <td className={`${tdCls} max-w-sm`}><p className="line-clamp-2 text-xs">{c.message}</p></td>
                    <td className={`${tdCls} min-w-44`}>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-primary transition-all" style={{ width: `${c.total ? (done / c.total) * 100 : 0}%` }} /></div>
                      <p className="mt-1 text-xs"><b className="text-emerald-600">{c.sent} sent</b>{Number(c.failed) ? <b className="text-rose-600"> · {c.failed} failed</b> : null} <span className="text-slate-500">of {c.total}{c.status === 'sending' ? ' · sending…' : ''}</span></p>
                    </td>
                  </tr>
                );
              })}
              {!campaigns.length ? <tr><td colSpan={4} className="py-10 text-center text-slate-500">No SMS campaigns sent yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export default function Page() {
  return <Guard perm="marketing"><BulkSms /></Guard>;
}
