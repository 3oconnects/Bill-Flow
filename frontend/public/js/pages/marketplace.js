// js/pages/marketplace.js — Marketplace (ported from InvenPiolot)

const MARKETPLACE_EXTENSIONS = [
  {
    id: 'pencarrie',
    name: 'Pencarrie',
    description: 'Enterprise-grade supplier integration — sync inventory, automate ordering, and eliminate manual catalog management with Pencarrie\'s live API.',
    icon: '📦',
    iconColor: '#1a6be8',
    status: 'available',
    category: 'Suppliers',
    author: 'Pencarrie Inc.',
    version: '2.4.1',
    rating: 5.0,
    capabilities: ['Catalog Sync', 'Live Stock Updates', 'Direct PO Creation', 'Price Auto-Update'],
    isExclusive: true,
  },
  {
    id: 'royal-mail',
    name: 'Royal Mail',
    description: 'Official Royal Mail integration for automated label generation, manifest submission, and real-time parcel tracking within BillFlow.',
    icon: '🚚',
    iconColor: '#d63d3d',
    status: 'available',
    category: 'Shipping',
    author: 'Royal Mail Group',
    version: '1.9.0',
    rating: 4.8,
    capabilities: ['Label Generation', 'Manifesting', 'Real-time Tracking', 'Returns Management'],
    isExclusive: false,
  },
  {
    id: 'aura-ai',
    name: 'Aura AI',
    description: 'AI-powered billing intelligence, revenue forecasting, and natural language insights — ask questions about your finances and get instant answers.',
    icon: '🧠',
    iconColor: '#6b3fd4',
    status: 'available',
    category: 'Intelligence',
    author: 'Aura Labs',
    version: '3.1.0',
    rating: 4.9,
    capabilities: ['Predictive Revenue Analysis', 'AI Forecasting', 'NLP Insights', 'Anomaly Detection'],
    isExclusive: true,
  },
  {
    id: 'shopify-bridge',
    name: 'Shopify Bridge',
    description: 'Two-way Shopify sync — orders flow into BillFlow automatically and invoice statuses push back to your storefront in real time.',
    icon: '🛒',
    iconColor: '#0a8754',
    status: 'available',
    category: 'Infrastructure',
    author: 'BillFlow',
    version: '2.0.3',
    rating: 4.7,
    capabilities: ['Order Sync', 'Invoice Push', 'Product Mapping', 'Refund Handling'],
    isExclusive: false,
  },
  {
    id: 'slack-alerts',
    name: 'Slack Alerts',
    description: 'Push critical invoice alerts, payment reminders, and overdue notifications directly to your Slack workspace channels.',
    icon: '💬',
    iconColor: '#d63d3d',
    status: 'available',
    category: 'Communication',
    author: 'BillFlow',
    version: '1.2.0',
    rating: 4.5,
    capabilities: ['Overdue Alerts', 'Payment Notifications', 'Channel Routing', 'Custom Triggers'],
    isExclusive: false,
  },
  {
    id: 'analytics-hub',
    name: 'Analytics Hub',
    description: 'Connect your business intelligence tools — export live BillFlow data to Tableau, Power BI, or Google Looker in structured format.',
    icon: '🗄️',
    iconColor: '#1a6be8',
    status: 'available',
    category: 'Intelligence',
    author: 'DataBridge Co.',
    version: '1.5.2',
    rating: 4.6,
    capabilities: ['Tableau Export', 'Power BI Connector', 'Scheduled Reports', 'Custom Schemas'],
    isExclusive: false,
  },
  {
    id: 'stripe-payments',
    name: 'Stripe Payments',
    description: 'Accept online payments directly from your invoices. Send payment links and auto-reconcile when customers pay via card or bank transfer.',
    icon: '💳',
    iconColor: '#6b3fd4',
    status: 'available',
    category: 'Infrastructure',
    author: 'Stripe Inc.',
    version: '3.0.1',
    rating: 4.9,
    capabilities: ['Payment Links', 'Auto-Reconcile', 'Card & ACH', 'Webhook Events'],
    isExclusive: false,
  },
  {
    id: 'dhl-express',
    name: 'DHL Express',
    description: 'Seamlessly book DHL shipments from within BillFlow — generate AWBs, track parcels, and attach shipping details to invoices automatically.',
    icon: '✈️',
    iconColor: '#c97b10',
    status: 'available',
    category: 'Shipping',
    author: 'DHL Group',
    version: '1.4.0',
    rating: 4.6,
    capabilities: ['AWB Generation', 'Live Tracking', 'Rate Calculator', 'Bulk Booking'],
    isExclusive: false,
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Sync WooCommerce orders directly into BillFlow as invoices, auto-map customers, and keep payment statuses in sync across both platforms.',
    icon: '🌐',
    iconColor: '#0a8754',
    status: 'available',
    category: 'Infrastructure',
    author: 'BillFlow',
    version: '1.8.0',
    rating: 4.4,
    capabilities: ['Order Import', 'Customer Sync', 'Status Webhooks', 'Tax Mapping'],
    isExclusive: false,
  },
];

const MARKET_CATEGORIES = ['All', 'Suppliers', 'Shipping', 'Intelligence', 'Communication', 'Infrastructure'];

let _mktSearch = '';
let _mktCategory = 'All';
let _mktInstalledIds = new Set(JSON.parse(localStorage.getItem('_bf_mkt_installed') || '[]'));

async function renderMarketplace(el) {
  document.getElementById('topbar-actions').innerHTML = '';
  _renderMarketplaceContent(el);
}

function _renderMarketplaceContent(el) {
  const filtered = MARKETPLACE_EXTENSIONS.filter(ext => {
    const matchSearch = !_mktSearch ||
      ext.name.toLowerCase().includes(_mktSearch.toLowerCase()) ||
      ext.description.toLowerCase().includes(_mktSearch.toLowerCase());
    const matchCat = _mktCategory === 'All' || ext.category === _mktCategory;
    return matchSearch && matchCat;
  });

  // Update installed status from localStorage
  const extensions = MARKETPLACE_EXTENSIONS.map(e => ({
    ...e,
    status: _mktInstalledIds.has(e.id) ? 'installed' : 'available'
  }));
  const filteredWithStatus = extensions.filter(ext => {
    const matchSearch = !_mktSearch ||
      ext.name.toLowerCase().includes(_mktSearch.toLowerCase()) ||
      ext.description.toLowerCase().includes(_mktSearch.toLowerCase());
    const matchCat = _mktCategory === 'All' || ext.category === _mktCategory;
    return matchSearch && matchCat;
  });

  const availableCount = extensions.filter(e => e.status === 'available').length;
  const activeCount = extensions.filter(e => e.status === 'installed').length;

  el.innerHTML = `
    <!-- Market Hero Banner -->
    <div class="mkt-hero">
      <div class="mkt-hero-bg"></div>
      <div class="mkt-hero-inner">
        <div class="mkt-hero-left">
          <div class="mkt-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Marketplace
          </div>
          <h2 class="mkt-hero-title">Fleet <span>Extensions</span></h2>
          <p class="mkt-hero-sub">Modular integrations for payments, shipping and analytics. Connect your tools to BillFlow.</p>
        </div>
        <div class="mkt-stats">
          <div class="mkt-stat">
            <div class="mkt-stat-num">${availableCount}</div>
            <div class="mkt-stat-label">Available</div>
          </div>
          <div class="mkt-stat-divider"></div>
          <div class="mkt-stat">
            <div class="mkt-stat-num mkt-stat-active">${activeCount}</div>
            <div class="mkt-stat-label">Active</div>
          </div>
        </div>
      </div>
      <div class="mkt-hero-search">
        <svg class="mkt-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          class="mkt-search-input"
          placeholder="Search extensions..."
          value="${esc(_mktSearch)}"
          oninput="_mktSearchChange(this.value)"
        >
      </div>
    </div>

    <!-- Category Filters -->
    <div class="mkt-filters">
      ${MARKET_CATEGORIES.map(cat => `
        <button class="mkt-filter-btn${_mktCategory === cat ? ' active' : ''}" onclick="_mktCategoryChange('${cat}')">
          ${cat}
        </button>
      `).join('')}
    </div>

    <!-- Extensions Grid -->
    <div class="mkt-grid">
      ${filteredWithStatus.length === 0
        ? `<div class="empty-state" style="grid-column:1/-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <h3>No extensions found</h3>
            <p>Try adjusting your search or category filter</p>
          </div>`
        : filteredWithStatus.map(ext => _renderExtCard(ext)).join('')
      }
    </div>
  `;
}

function _renderExtCard(ext) {
  const isInstalled = ext.status === 'installed';
  const stars = Math.round(ext.rating);
  return `
    <div class="mkt-card" onclick="_openExtDetail('${ext.id}')">
      <div class="mkt-card-top">
        <div class="mkt-card-icon" style="background:${ext.iconColor}15">${ext.icon}</div>
        ${isInstalled
          ? `<div class="mkt-badge-active"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Active</div>`
          : ext.isExclusive
            ? `<div class="mkt-badge-excl"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Exclusive</div>`
            : `<span class="mkt-version">v${esc(ext.version)}</span>`
        }
      </div>
      <div class="mkt-card-body">
        <div class="mkt-card-name-row">
          <h3 class="mkt-card-name">${esc(ext.name)}</h3>
          <div class="mkt-rating">⭐ ${ext.rating.toFixed(1)}</div>
        </div>
        <p class="mkt-card-desc">${esc(ext.description)}</p>
        <div class="mkt-caps">
          ${ext.capabilities.slice(0, 2).map(c => `<span class="mkt-cap">${esc(c)}</span>`).join('')}
        </div>
      </div>
      <div class="mkt-card-footer">
        <div class="mkt-card-meta">
          <div class="mkt-card-cat">${esc(ext.category)}</div>
          <div class="mkt-card-author">${esc(ext.author)}</div>
        </div>
        ${isInstalled
          ? `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();_openExtDetail('${ext.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Configure
            </button>`
          : `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();_openIntegrateModal('${ext.id}')">
              Integrate
            </button>`
        }
      </div>
    </div>
  `;
}

function _mktSearchChange(v) {
  _mktSearch = v;
  _renderMarketplaceContent(document.querySelector('.page-content'));
}

function _mktCategoryChange(cat) {
  _mktCategory = cat;
  _renderMarketplaceContent(document.querySelector('.page-content'));
}

function _openExtDetail(extId) {
  const ext = MARKETPLACE_EXTENSIONS.find(e => e.id === extId);
  if (!ext) return;
  const isInstalled = _mktInstalledIds.has(ext.id);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.innerHTML = `
    <div class="modal modal-md">
      <div class="modal-header">
        <div class="modal-title">${esc(ext.name)}</div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <div style="width:60px;height:60px;border-radius:14px;background:${ext.iconColor}18;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${ext.icon}</div>
          <div>
            <div style="font-size:16px;font-weight:700;color:var(--c-text)">${esc(ext.name)}</div>
            <div style="font-size:12px;color:var(--c-text3);margin-top:2px">${esc(ext.author)} · v${esc(ext.version)}</div>
            <div style="margin-top:6px">
              ${isInstalled
                ? `<span style="background:var(--c-green-lt);color:var(--c-green);font-size:11px;font-weight:600;padding:2px 10px;border-radius:12px">✓ Active</span>`
                : ext.isExclusive
                  ? `<span style="background:var(--c-primary-lt);color:var(--c-primary);font-size:11px;font-weight:600;padding:2px 10px;border-radius:12px">★ Exclusive</span>`
                  : `<span style="background:var(--c-surface2);color:var(--c-text2);font-size:11px;font-weight:600;padding:2px 10px;border-radius:12px">${esc(ext.category)}</span>`
              }
            </div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--c-text2);line-height:1.65;margin-bottom:20px">${esc(ext.description)}</p>
        <div style="margin-bottom:20px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--c-text3);margin-bottom:10px">Capabilities</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${ext.capabilities.map(c => `<span style="background:var(--c-surface2);border:1px solid var(--c-border);color:var(--c-text2);font-size:12px;font-weight:500;padding:4px 10px;border-radius:20px">${esc(c)}</span>`).join('')}
          </div>
        </div>
        <div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:var(--radius);padding:12px;display:flex;justify-content:space-between;font-size:12px">
          <span style="color:var(--c-text3)">Rating</span>
          <strong>⭐ ${ext.rating.toFixed(1)} / 5.0</strong>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        ${isInstalled
          ? `<button class="btn btn-danger btn-sm" onclick="_uninstallExt('${ext.id}');this.closest('.modal-overlay').remove()">Disconnect</button>`
          : `<button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();_openIntegrateModal('${ext.id}')">Integrate Now</button>`
        }
      </div>
    </div>
  `;
  document.getElementById('modal-container').appendChild(overlay);
}

function _openIntegrateModal(extId) {
  const ext = MARKETPLACE_EXTENSIONS.find(e => e.id === extId);
  if (!ext) return;

  openModal({
    size: 'sm',
    title: `Integrate — ${ext.name}`,
    saveLabel: 'Authorize & Connect',
    body: `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:14px;background:var(--c-surface2);border:1px solid var(--c-border);border-radius:var(--radius)">
        <div style="width:44px;height:44px;border-radius:10px;background:${ext.iconColor}18;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${ext.icon}</div>
        <div>
          <div style="font-weight:600;font-size:14px">${esc(ext.name)}</div>
          <div style="font-size:11px;color:var(--c-text3)">by ${esc(ext.author)}</div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label req">Client ID / API Key</label>
        <input class="form-input" id="mkt-client-id" placeholder="Enter your Client ID or API Key">
      </div>
      <div class="form-group">
        <label class="form-label req">Secret Key</label>
        <input class="form-input" id="mkt-secret-key" type="password" placeholder="Enter your Secret Key">
      </div>
      <div style="background:var(--c-blue-lt);border:1px solid #c8dcf8;border-radius:var(--radius);padding:10px 12px;font-size:12px;color:var(--c-text2);display:flex;align-items:flex-start;gap:8px;margin-top:4px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-primary)" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Your credentials are stored locally and never shared. You can disconnect this integration at any time.
      </div>
    `,
    onSave: async () => {
      const clientId = document.getElementById('mkt-client-id').value.trim();
      const secretKey = document.getElementById('mkt-secret-key').value.trim();
      if (!clientId) { toast('Client ID is required', 'error'); return false; }
      if (!secretKey) { toast('Secret Key is required', 'error'); return false; }
      await new Promise(r => setTimeout(r, 800));
      _mktInstalledIds.add(extId);
      localStorage.setItem('_bf_mkt_installed', JSON.stringify([..._mktInstalledIds]));
      toast(`${ext.name} connected successfully`);
      _renderMarketplaceContent(document.querySelector('.page-content'));
    }
  });
}

function _uninstallExt(extId) {
  const ext = MARKETPLACE_EXTENSIONS.find(e => e.id === extId);
  if (!ext) return;
  confirmDel(`Disconnect ${ext.name}?`, () => {
    _mktInstalledIds.delete(extId);
    localStorage.setItem('_bf_mkt_installed', JSON.stringify([..._mktInstalledIds]));
    toast(`${ext.name} disconnected`);
    _renderMarketplaceContent(document.querySelector('.page-content'));
  });
}
