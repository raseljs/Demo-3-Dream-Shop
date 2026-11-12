// Config for simple admin CRUD screens (/admin/r/[resource])
// Field types: text, number, textarea, rich, image, media, select, toggle, date, datetime, tags, products, color
// `options` may be an array or a key of the /admin/meta response.

export const RESOURCES = {
  brands: {
    title: 'Brands', perm: 'catalog', search: true,
    columns: [
      { key: 'logo', type: 'image' },
      { key: 'name', label: 'Name' },
      { key: 'slug', label: 'Slug', muted: true },
      { key: 'products_count', label: 'Products' },
    ],
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'logo', label: 'Logo', type: 'image' },
      { name: 'meta_title', label: 'Meta Title' },
      { name: 'meta_description', label: 'Meta Description', type: 'textarea' },
      { name: 'meta_keywords', label: 'Meta Keywords (comma separated)' },
    ],
  },
  categories: {
    title: 'Categories', perm: 'catalog', search: true, perPage: 500,
    columns: [
      { key: 'image', type: 'image' },
      { key: 'name', label: 'Name' },
      { key: 'parent_name', label: 'Parent', muted: true },
      { key: 'products_count', label: 'Products' },
      { key: 'featured', label: 'Featured', type: 'bool' },
      { key: 'show_on_home', label: 'Home section', type: 'bool' },
      { key: 'sort_order', label: 'Order' },
    ],
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'parent_id', label: 'Parent Category', type: 'select', options: 'categories', empty: '— None (top level) —' },
      { name: 'image', label: 'Image', type: 'image' },
      { name: 'description', label: 'Short description', type: 'textarea' },
      { name: 'featured', label: 'Show in “Featured Categories”', type: 'toggle' },
      { name: 'show_on_home', label: 'Show as a product section on the home page', type: 'toggle' },
      { name: 'sort_order', label: 'Sort order', type: 'number', default: 0 },
      { name: 'slug', label: 'URL slug (optional)', hint: 'Leave empty to keep the current / auto slug' },
    ],
    afterSave: 'meta',
  },
  attributes: {
    title: 'Attributes', perm: 'catalog',
    columns: [{ key: 'name', label: 'Name' }, { key: 'options', label: 'Values', type: 'tags' }],
    fields: [
      { name: 'name', label: 'Name (e.g. Size, Color)', required: true },
      { name: 'options', label: 'Values', type: 'tags', hint: 'Type a value and press Enter' },
    ],
    afterSave: 'meta',
  },
  'size-charts': {
    title: 'Size Charts', perm: 'catalog',
    columns: [{ key: 'image', type: 'image' }, { key: 'name', label: 'Name' }],
    fields: [{ name: 'name', label: 'Name', required: true }, { name: 'image', label: 'Chart image', type: 'image', wide: true }],
    afterSave: 'meta',
  },
  coupons: {
    title: 'Coupons', perm: 'marketing', search: true,
    columns: [
      { key: 'code', label: 'Code', strong: true },
      { key: 'discount', label: 'Discount', render: (r) => (r.type === 'percent' ? `${r.discount}%` : `৳${r.discount}`) },
      { key: 'min_purchase', label: 'Min purchase', type: 'money' },
      { key: 'end_date', label: 'Expire at', type: 'date' },
      { key: 'status', label: 'Active', type: 'bool' },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true },
      { name: 'type', label: 'Discount type', type: 'select', options: [{ id: 'fixed', name: 'Fixed amount (৳)' }, { id: 'percent', name: 'Percentage (%)' }], default: 'fixed' },
      { name: 'discount', label: 'Discount', type: 'number', required: true },
      { name: 'max_discount', label: 'Max discount amount (৳) — for % coupons', type: 'number' },
      { name: 'min_purchase', label: 'Min purchase amount (৳)', type: 'number' },
      { name: 'start_date', label: 'Start date', type: 'datetime' },
      { name: 'end_date', label: 'End date', type: 'datetime' },
      { name: 'product_ids', label: 'Only for these products (optional)', type: 'products', wide: true },
      { name: 'status', label: 'Active', type: 'toggle', default: 1 },
    ],
  },
  expenses: {
    title: 'Expenses', perm: 'expenses', search: true, summary: true,
    filters: [
      { name: 'from', label: 'From', type: 'date' },
      { name: 'to', label: 'To', type: 'date' },
      { name: 'category', label: 'Category', type: 'select', options: 'expense_categories', empty: 'All categories' },
    ],
    columns: [
      { key: 'expense_date', label: 'Date', type: 'date' },
      { key: 'details', label: 'Details' },
      { key: 'category_name', label: 'Category', muted: true },
      { key: 'amount', label: 'Amount', type: 'money', strong: true },
    ],
    fields: [
      { name: 'details', label: 'Details', required: true },
      { name: 'amount', label: 'Amount (৳)', type: 'number', required: true },
      { name: 'expense_date', label: 'Date', type: 'date' },
      { name: 'category_id', label: 'Category', type: 'select', options: 'expense_categories', empty: '— Select —' },
    ],
  },
  'expense-categories': {
    title: 'Expense Categories', perm: 'expenses',
    columns: [{ key: 'name', label: 'Name' }],
    fields: [{ name: 'name', label: 'Name', required: true }],
    afterSave: 'meta',
  },
  blocklists: {
    title: 'Blocklists', subtitle: 'Orders from these phone numbers will be rejected', perm: 'users', search: true,
    columns: [{ key: 'phone', label: 'Phone', strong: true }, { key: 'note', label: 'Reason', muted: true }, { key: 'created_at', label: 'Added', type: 'date' }],
    fields: [{ name: 'phone', label: 'Phone number', required: true }, { name: 'note', label: 'Reason (optional)' }],
  },
  pages: {
    title: 'Pages', perm: 'appearance', search: true,
    columns: [{ key: 'title', label: 'Title', strong: true }, { key: 'slug', label: 'URL', render: (r) => `/${r.slug}` }, { key: 'status', label: 'Published', type: 'bool' }],
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'slug', label: 'URL slug', hint: 'e.g. about-us → yoursite.com/about-us' },
      { name: 'content', label: 'Content', type: 'rich', wide: true },
      { name: 'status', label: 'Published', type: 'toggle', default: 1 },
    ],
    modalSize: 'max-w-4xl',
  },
  sliders: {
    title: 'Slider Management', subtitle: 'Hero slider (1600×560) & promo banners (900×360)', perm: 'appearance',
    columns: [
      { key: 'desktop_media', type: 'image', size: 72 },
      { key: 'title', label: 'Title' },
      { key: 'position', label: 'Position', render: (r) => (r.position === 'banner' ? 'Promo banner' : 'Hero slider') },
      { key: 'type', label: 'Type' },
      { key: 'sort_order', label: 'Order' },
      { key: 'status', label: 'Active', type: 'bool' },
    ],
    fields: [
      { name: 'position', label: 'Position', type: 'select', options: [{ id: 'hero', name: 'Hero slider (top)' }, { id: 'banner', name: 'Promo banner (below slider)' }], default: 'hero' },
      { name: 'type', label: 'Media type', type: 'select', options: [{ id: 'image', name: 'Image' }, { id: 'video', name: 'Video (mp4)' }], default: 'image' },
      { name: 'title', label: 'Title' },
      { name: 'link', label: 'Link (optional)', hint: 'e.g. /category/television or /product/…' },
      { name: 'desktop_media', label: 'Desktop file (jpg/png/webp/mp4)', type: 'media', required: true },
      { name: 'mobile_media', label: 'Mobile file (optional, 800×600)', type: 'media' },
      { name: 'sort_order', label: 'Sort order', type: 'number', default: 0 },
      { name: 'status', label: 'Active', type: 'toggle', default: 1 },
    ],
  },
  reviews: {
    title: 'Product Reviews', perm: 'reviews', noCreate: true,
    filters: [{ name: 'status', label: 'Status', type: 'select', options: [{ id: 'pending', name: 'Pending' }, { id: 'approved', name: 'Approved' }, { id: 'hidden', name: 'Hidden' }], empty: 'All' }],
    columns: [
      { key: 'product_name', label: 'Product', strong: true },
      { key: 'user_name', label: 'User' },
      { key: 'rating', label: 'Rating', render: (r) => '★'.repeat(r.rating) },
      { key: 'comment', label: 'Review', muted: true, clamp: true },
      { key: 'status', label: 'Status', render: (r) => r.status },
    ],
    quickActions: [
      { label: 'Approve', when: (r) => r.status !== 'approved', body: { status: 'approved' } },
      { label: 'Hide', when: (r) => r.status === 'approved', body: { status: 'hidden' } },
    ],
    fields: [
      { name: 'status', label: 'Status', type: 'select', options: [{ id: 'pending', name: 'Pending' }, { id: 'approved', name: 'Approved' }, { id: 'hidden', name: 'Hidden' }] },
      { name: 'rating', label: 'Rating (1-5)', type: 'number' },
      { name: 'comment', label: 'Review', type: 'textarea' },
    ],
  },
};
