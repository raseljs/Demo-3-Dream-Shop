'use client';
import { use, useEffect, useState } from 'react';
import { Guard, useAdmin } from '@/components/admin/AdminShell';
import { FieldInput } from '@/components/admin/ResourcePage';
import { Card, Field, Loading, PageHeader } from '@/components/admin/ui';
import { api } from '@/lib/client';

const ON_OFF = [{ id: 1, name: 'Active' }, { id: 0, name: 'Inactive' }];
const MODE = [{ id: 'sandbox', name: 'Sandbox (testing)' }, { id: 'live', name: 'Live' }];

const FORMS = {
  general: {
    title: 'Site Settings',
    sections: [
      { title: 'Brand', fields: [
        { name: 'site_title', label: 'Site Title' }, { name: 'tagline', label: 'Tagline' },
        { name: 'logo', label: 'Logo (shown on the coloured header)', type: 'image' }, { name: 'favicon', label: 'Favicon', type: 'image' },
        { name: 'primary_color', label: 'Primary (button) colour', type: 'color' }, { name: 'header_color', label: 'Header colour', type: 'color' },
      ] },
      { title: 'Contact', fields: [
        { name: 'phone', label: 'Phone' }, { name: 'whatsapp', label: 'Whatsapp' }, { name: 'email', label: 'Email' }, { name: 'address', label: 'Address' },
        { name: 'fb_link', label: 'Facebook Link' }, { name: 'x_link', label: 'X (Twitter) Link' }, { name: 'yt_link', label: 'YouTube Link' }, { name: 'insta_link', label: 'Instagram Link' },
      ] },
      { title: 'Home page "About" block', fields: [
        { name: 'about_title', label: 'Title' }, { name: 'about_image', label: 'Image', type: 'image' }, { name: 'about_text', label: 'Text', type: 'textarea', wide: true },
      ] },
      { title: 'Store', fields: [
        { name: 'guest_checkout', label: 'Allow Guest Checkout (order without account)', type: 'toggle' },
        { name: 'low_stock_alert', label: 'Low stock alert at (qty)', type: 'number' },
        { name: 'order_prefix', label: 'Order number prefix (optional, e.g. MS-)' },
        { name: 'bdcourier_api', label: 'BD Courier API key (fraud check)', hint: 'From bdcourier.com' },
        { name: 'copyright', label: 'Copyright Text', type: 'textarea' },
        { name: 'meta_description', label: 'SEO description (home page)', type: 'textarea' },
        { name: 'custom_code', label: 'Custom Code (Facebook Pixel, Google Analytics, chat widget…)', type: 'textarea', wide: true, mono: true },
      ] },
    ],
  },
  shipping: {
    title: 'Shipping Settings',
    sections: [{ title: 'Delivery charges', fields: [
      { name: 'shipping_inside_dhaka', label: 'Shipping Inside Dhaka (৳)', type: 'number' }, { name: 'shipping_outside_dhaka', label: 'Shipping Outside Dhaka (৳)', type: 'number' },
      { name: 'inside_label', label: 'Inside label' }, { name: 'outside_label', label: 'Outside label' },
      { name: 'inside_time', label: 'Inside delivery time text' }, { name: 'outside_time', label: 'Outside delivery time text' },
    ] }],
  },
  courier: {
    title: 'Courier Settings',
    sections: [
      { title: 'Pathao Courier', fields: [
        { name: 'pathao.status', label: 'Status', type: 'select', options: ON_OFF },
        { name: 'pathao.base_url', label: 'Base URL', hint: 'Live: https://api-hermes.pathao.com · Sandbox: https://courier-api-sandbox.pathao.com' },
        { name: 'pathao.client_id', label: 'Client ID' }, { name: 'pathao.client_secret', label: 'Client Secret' },
        { name: 'pathao.username', label: 'Username (email)' }, { name: 'pathao.password', label: 'Password' },
        { name: 'pathao.store_id', label: 'Store ID' },
      ] },
      { title: 'Steadfast Courier', fields: [
        { name: 'steadfast.status', label: 'Status', type: 'select', options: ON_OFF },
        { name: 'steadfast.base_url', label: 'Base URL' },
        { name: 'steadfast.api_key', label: 'API Key' }, { name: 'steadfast.secret_key', label: 'Secret Key' },
      ] },
    ],
  },
  payment: {
    title: 'Payment Settings',
    sections: [
      { title: 'COD', fields: [
        { name: 'cod.status', label: 'Status', type: 'select', options: ON_OFF }, { name: 'cod.label', label: 'Label' }, { name: 'cod.description', label: 'Description' },
      ] },
      { title: 'BKASH (Tokenized Checkout)', fields: [
        { name: 'bkash.status', label: 'Status', type: 'select', options: ON_OFF }, { name: 'bkash.mode', label: 'Mode', type: 'select', options: MODE },
        { name: 'bkash.app_key', label: 'APP KEY' }, { name: 'bkash.app_secret', label: 'APP SECRET' },
        { name: 'bkash.username', label: 'USERNAME' }, { name: 'bkash.password', label: 'PASSWORD' },
        { name: 'bkash.label', label: 'Label' }, { name: 'bkash.description', label: 'Description' },
      ] },
      { title: 'SSLCOMMERZ', fields: [
        { name: 'sslcommerz.status', label: 'Status', type: 'select', options: ON_OFF }, { name: 'sslcommerz.mode', label: 'Mode', type: 'select', options: MODE },
        { name: 'sslcommerz.store_id', label: 'STORE ID' }, { name: 'sslcommerz.store_password', label: 'STORE PASSWORD' },
        { name: 'sslcommerz.label', label: 'Label' }, { name: 'sslcommerz.description', label: 'Description' },
      ] },
    ],
  },
  sms: {
    title: 'SMS Gateway Settings',
    sections: [
      { title: 'Gateway', fields: [
        { name: 'sms_provider', label: 'SMS Provider', type: 'select', options: [{ id: 'none', name: 'None' }, { id: 'bulksmsbd', name: 'BulkSMSBD' }, { id: 'custom', name: 'Custom URL' }] },
        { name: 'api_key', label: 'API Key' }, { name: 'sender_id', label: 'Sender ID' },
        { name: 'custom_url', label: 'Custom URL', wide: true, hint: 'GET URL with {phone} and {message}, e.g. https://sms.example.com/send?to={phone}&text={message}&key={api_key}' },
      ] },
      { title: 'When to send', fields: [
        { name: 'otp_verification', label: 'OTP Verification on registration', type: 'toggle' },
        { name: 'order_sms', label: 'SMS to customer when an order is placed', type: 'toggle' },
        { name: 'status_sms', label: 'SMS to customer when order status changes', type: 'toggle' },
        { name: 'order_template', label: 'Order placed message', type: 'textarea', hint: 'Use {name} {order_no} {total}' },
        { name: 'status_template', label: 'Status changed message', type: 'textarea', hint: 'Use {name} {order_no} {status}' },
      ] },
    ],
  },
};

const MORE_FORMS = {
  marketing: {
    title: 'Facebook Pixel & Conversions API',
    sections: [
      { title: 'Facebook Pixel', fields: [
        { name: 'fb_pixel_id', label: 'Pixel ID', hint: 'Events Manager → Data sources → your pixel → the number under its name. If you pasted the pixel code in General Settings → Custom Code before, remove it from there.' },
      ] },
      { title: 'Conversions API (server-side)', fields: [
        { name: 'fb_capi_enabled', label: 'Send purchases from the server too (recommended — works even with ad blockers)', type: 'toggle' },
        { name: 'fb_capi_token', label: 'Access token', wide: true, hint: 'Events Manager → Settings → Conversions API → Generate access token' },
        { name: 'fb_test_event_code', label: 'Test event code', hint: 'Only while testing (e.g. TEST12345) — clear it when done' },
      ] },
    ],
    test: { label: 'Send a test event', path: '/admin/marketing/test-capi', hint: 'Saves, then sends a test PageView. Check Events Manager → Test events.' },
  },
  notifications: {
    title: 'New Order Alerts',
    sections: [
      { title: 'Telegram', fields: [
        { name: 'telegram_enabled', label: 'Send every new order to Telegram', type: 'toggle' },
        { name: 'telegram_bot_token', label: 'Bot token', wide: true, hint: 'Open @BotFather in Telegram → /newbot → copy the token it gives you' },
        { name: 'telegram_chat_id', label: 'Chat ID', hint: 'Send any message to your bot, then open @userinfobot to see your ID. For a group, add the bot and use the group ID (starts with -).' },
      ] },
      { title: 'SMS to you', fields: [
        { name: 'sms_alert_enabled', label: 'Send me an SMS for every new order', type: 'toggle' },
        { name: 'sms_alert_phone', label: 'Your phone number', hint: 'Uses the SMS gateway from SMS Settings' },
      ] },
    ],
    note: 'The admin panel also beeps and shows a pop-up when a new order arrives while it is open.',
    test: { label: 'Send a test alert', path: '/admin/notifications/test', hint: 'Saves, then sends a test message to Telegram and SMS.' },
  },
};
Object.assign(FORMS, MORE_FORMS);

const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
const setPath = (o, p, v) => {
  const keys = p.split('.');
  const next = { ...o };
  let cur = next;
  keys.slice(0, -1).forEach((k) => { cur[k] = { ...(cur[k] || {}) }; cur = cur[k]; });
  cur[keys[keys.length - 1]] = v;
  return next;
};

function SettingsForm({ group }) {
  const { toast } = useAdmin();
  const form = FORMS[group];
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => { api('/admin/settings').then((s) => setValues(s[group])).catch((e) => toast(e.message, 'error')); }, [group]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return <p className="p-8 text-center">Unknown settings page.</p>;
  if (!values) return <Loading />;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      setValues(await api(`/admin/settings/${group}`, { method: 'PUT', body: values }));
      toast('Settings saved');
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };
  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      setValues(await api(`/admin/settings/${group}`, { method: 'PUT', body: values }));
      setTestResult({ ok: true, data: await api(form.test.path, { method: 'POST' }) });
    } catch (err) { setTestResult({ ok: false, data: err.message }); } finally { setTesting(false); }
  };

  return (
    <form onSubmit={save}>
      <PageHeader title={form.title} actions={<button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>} />
      <div className="space-y-5">
        {form.sections.map((sec) => (
          <Card key={sec.title} title={sec.title}>
            <div className="grid gap-4 md:grid-cols-2">
              {sec.fields.map((f) => (
                <Field key={f.name} label={f.label} hint={f.hint} className={f.wide || f.type === 'textarea' || f.type === 'toggle' ? 'md:col-span-2' : ''}>
                  {f.mono ? (
                    <textarea className="input min-h-36 font-mono text-xs" value={getPath(values, f.name) ?? ''} onChange={(e) => setValues((v) => setPath(v, f.name, e.target.value))} />
                  ) : (
                    <FieldInput field={f} value={getPath(values, f.name)} onChange={(v) => setValues((x) => setPath(x, f.name, f.type === 'select' && /^\d+$/.test(String(v)) ? Number(v) : v))} />
                  )}
                </Field>
              ))}
            </div>
          </Card>
        ))}
        {form.note ? <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{form.note}</p> : null}
        {form.test ? (
          <Card title="Test">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-outline" disabled={testing} onClick={runTest}>{testing ? 'Sending…' : form.test.label}</button>
              <p className="text-sm text-slate-500">{form.test.hint}</p>
            </div>
            {testResult ? (
              <div className={`mt-3 rounded-lg p-3 text-sm ${testResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                {typeof testResult.data === 'string' ? testResult.data : Object.entries(testResult.data || {}).map(([k, v]) => <p key={k}><b className="capitalize">{k.replace(/_/g, ' ')}:</b> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>)}
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
      <div className="mt-5 flex justify-end"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button></div>
    </form>
  );
}

export default function SettingsPage({ params }) {
  const { group } = use(params);
  return <Guard perm="settings"><SettingsForm key={group} group={group} /></Guard>;
}
