// js/pages/products/base.js
let _products = [], _prodSearch = '', _prodCategoryFilter = 'all', _prodStatusFilter = 'all', _prodView = 'table';
let _allVendors = [];

const PRODUCT_CATEGORIES = [
  'general','electronics','clothing','food','medicine','furniture',
  'stationery','software','hardware','services','spare parts','other'
];

const PRODUCT_UNITS = ['pcs','kg','g','litre','ml','metre','cm','box','pack','pair','set','dozen','unit'];

const WARRANTY_TYPES = [
  { value: 'none',         label: 'No Warranty' },
  { value: 'manufacturer', label: 'Manufacturer Warranty' },
  { value: 'seller',       label: 'Seller Warranty' },
  { value: 'extended',     label: 'Extended Warranty' },
];

const GUARANTEE_TYPES = [
  { value: 'none',         label: 'No Guarantee' },
  { value: 'money_back',   label: 'Money-Back Guarantee' },
  { value: 'satisfaction', label: 'Satisfaction Guarantee' },
  { value: 'performance',  label: 'Performance Guarantee' },
];

async function renderProducts(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  [_products, _allVendors] = await Promise.all([API.getProducts(), API.getVendors()]);
  _renderProductsPage(el);
}

function _prodStats() {
  const total = _products.length;
  const active = _products.filter(p => p.is_active).length;
  const lowStock = _products.filter(p => p.is_active && p.stock_qty <= p.low_stock_alert && p.stock_qty > 0).length;
  const outOfStock = _products.filter(p => p.is_active && p.stock_qty <= 0).length;
  const totalValue = _products.reduce((s, p) => s + (p.stock_qty * p.unit_price), 0);
  return { total, active, lowStock, outOfStock, totalValue };
}

function _prodSearchChange(val) {
  _prodSearch = val;
  _renderProductsPage(document.querySelector('.page-content'));
}

async function generateSKU(brand) {
  const b = (brand || 'PROD').toUpperCase().trim().replace(/[^A-Z0-9]/g, '') || 'PROD';
  try {
    const d = await API.get(`/api/products/sku/generate?brand=${encodeURIComponent(b)}`);
    if (d.sku) return d.sku;
  } catch(e) {}
  const prefix = `SKU-${b}-`;
  const existing = _products.filter(p => p.sku && p.sku.startsWith(prefix));
  let max = 0;
  existing.forEach(p => {
    const parts = (p.sku || '').split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > max) max = num;
  });
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}
