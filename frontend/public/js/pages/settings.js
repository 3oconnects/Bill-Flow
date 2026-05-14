// js/pages/settings.js — Enhanced Settings (InvenPilot-style tabs)
let _settingsOrg = null, _settingsTeam = [], _settingsActiveTab = 'organization';
let _customForms = [], _editingForm = null;

async function renderSettings(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  document.getElementById('topbar-actions').innerHTML = '';
  [_settingsOrg, _settingsTeam] = await Promise.all([
    API.getOrg(),
    APP.currentUser?.role !== 'member' ? API.getTeam() : Promise.resolve([])
  ]);
  _renderSettingsLayout(el);
}

function _renderSettingsLayout(el) {
  const tabs = [
    { id: 'organization',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`, label: 'Organization' },
    { id: 'invoice',       icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`, label: 'Invoice Settings' },
    { id: 'custom_forms',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`, label: 'Custom Forms' },
    { id: 'localization',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`, label: 'Localization' },
    { id: 'security',      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, label: 'Security' },
    { id: 'notifications', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`, label: 'Notifications' },
    { id: 'appearance',    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`, label: 'Appearance' },
    ...((['owner','admin'].includes(APP.currentUser?.role)) ? [
      { id: 'team', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, label: 'Team Members' }
    ] : []),
    { id: 'roles', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`, label: 'Roles & Permissions' },
    { id: 'profile', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`, label: 'My Profile' },
  ];

  el.innerHTML = `
    <div class="settings-layout">
      <div class="settings-sidenav">
        ${tabs.map(t => `
          <button class="settings-sidenav-btn${_settingsActiveTab === t.id ? ' active' : ''}"
            onclick="switchSettingsTab('${t.id}')">
            ${t.icon}
            <span>${t.label}</span>
          </button>`).join('')}
      </div>
      <div class="settings-content" id="settings-content-area">
        ${_renderSettingsTab(_settingsActiveTab)}
      </div>
    </div>`;
}

function switchSettingsTab(tab) {
  _settingsActiveTab = tab;
  document.querySelectorAll('.settings-sidenav-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${tab}'`));
  });
  const content = document.getElementById('settings-content-area');
  if (content) content.innerHTML = _renderSettingsTab(tab);
}

function _renderSettingsTab(tab) {
  switch(tab) {
    case 'organization':  return _renderOrgTab();
    case 'invoice':       return _renderInvoiceTab();
    case 'custom_forms':  return _renderCustomFormsTab();
    case 'localization':  return _renderLocalizationTab();
    case 'security':      return _renderSecurityTab();
    case 'notifications': return _renderNotificationsTab();
    case 'appearance':    return _renderAppearanceTab();
    case 'team':          return _renderTeamTab();
    case 'profile':       return _renderProfileTab();
    case 'roles':         return renderRolesTab();
    default: return '';
  }
}

// ── Organization Tab ───────────────────────────
function _renderOrgTab() {
  const org = _settingsOrg || {};
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Entity Metadata
      </div>
      <div class="settings-card-body">
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label req">Business Name</label>
            <input class="form-input" id="s-bname" value="${esc(org.name||'')}">
          </div>
          <div class="form-group"><label class="form-label">Entity Type</label>
            <select class="form-input" id="s-entity-type">
              ${['Enterprise','SMB','Startup','Freelancer','Partnership','LLP','Pvt Ltd'].map(t=>`<option value="${t}"${(org.entity_type||'SMB')===t?' selected':''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label">Business Email</label>
            <input class="form-input" id="s-email" type="email" value="${esc(org.email||'')}">
          </div>
          <div class="form-group"><label class="form-label">Phone</label>
            <input class="form-input" id="s-phone" value="${esc(org.phone||'')}">
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label">GSTIN (Tax ID)</label>
            <input class="form-input" id="s-gstin" value="${esc(org.gstin||'')}" style="text-transform:uppercase" placeholder="22AAAAA0000A1Z5">
          </div>
          <div class="form-group"><label class="form-label">PAN</label>
            <input class="form-input" id="s-pan" value="${esc(org.pan||'')}" style="text-transform:uppercase" placeholder="AAAAA0000A">
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label">State / Location</label>
            <select class="form-input" id="s-state">
              <option value="">— Select State —</option>
              ${INDIAN_STATES.map(s=>`<option value="${esc(s)}"${org.state===s?' selected':''}>${esc(s)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">City</label>
            <input class="form-input" id="s-city" value="${esc(org.city||'')}">
          </div>
        </div>
        <div class="form-group"><label class="form-label">Headquarters / Address</label>
          <textarea class="form-input" id="s-address" rows="2">${esc(org.address||'')}</textarea>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label">PIN Code</label>
            <input class="form-input" id="s-pin" value="${esc(org.pincode||'')}">
          </div>
          <div class="form-group"><label class="form-label">Country</label>
            <input class="form-input" value="India" disabled>
          </div>
        </div>
        <button class="btn btn-primary" onclick="saveBizInfo()">Save Organization Info</button>
      </div>
    </div>

    <div class="settings-card" style="background:var(--c-surface2);border-style:dashed">
      <div class="settings-card-body" style="display:flex;align-items:flex-start;gap:16px;padding:20px">
        <div style="width:44px;height:44px;background:var(--c-surface);border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow);flex-shrink:0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div>
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">Admin Privileges</div>
          <div style="font-size:12px;color:var(--c-text2);margin-bottom:14px">Certain settings require elevated permissions. Verify your identity to proceed with sensitive operations.</div>
          <button class="btn btn-secondary btn-sm">Verify Identity</button>
        </div>
      </div>
    </div>`;
}

// ── Invoice Tab ────────────────────────────────
function _renderInvoiceTab() {
  const org = _settingsOrg || {};
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Invoice Preferences
      </div>
      <div class="settings-card-body">
        <div class="form-row cols-3">
          <div class="form-group"><label class="form-label">Invoice Number Prefix</label>
            <input class="form-input" id="s-prefix" value="${esc(org.inv_prefix||'INV-')}" placeholder="INV-">
          </div>
          <div class="form-group"><label class="form-label">Next Invoice Number</label>
            <input class="form-input" id="s-nextnum" type="number" min="1" value="${org.next_inv_no||1}">
          </div>
          <div class="form-group"><label class="form-label">Default Currency</label>
            <select class="form-input" id="s-currency">
              ${CURRENCIES.map(c=>`<option value="${c}"${org.currency===c?' selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Default Invoice Notes</label>
          <textarea class="form-input" id="s-notes" rows="2">${esc(org.default_notes||'')}</textarea>
        </div>
        <div class="form-group"><label class="form-label">Default Terms & Conditions</label>
          <textarea class="form-input" id="s-terms" rows="3">${esc(org.default_terms||'')}</textarea>
        </div>
        <button class="btn btn-primary" onclick="saveInvoiceSettings()">Save Invoice Settings</button>
      </div>
    </div>`;
}

// ── Localization Tab ───────────────────────────
function _renderLocalizationTab() {
  const langs = [
    { code: 'en', label: 'English',   region: 'United States' },
    { code: 'hi', label: 'हिन्दी',      region: 'India' },
    { code: 'ta', label: 'தமிழ்',       region: 'Tamil Nadu' },
    { code: 'fr', label: 'Français',   region: 'France' },
  ];
  const currencies = ['INR','USD','EUR','GBP','AED','SGD','JPY','AUD'];
  const savedLang     = localStorage.getItem('bf_lang') || 'en';
  const savedCurrency = localStorage.getItem('bf_disp_currency') || (_settingsOrg?.currency || 'INR');
  const savedDateFmt  = localStorage.getItem('bf_date_fmt') || 'medium';
  const dateFmts = ['short','medium','long','full'];
  const sampleDate = new Date();

  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Localization Settings
        <span style="font-size:11px;font-weight:400;color:var(--c-text2);margin-left:8px">Preferences are saved locally in your browser</span>
      </div>
      <div class="settings-card-body">
        <div class="form-row cols-2" style="align-items:flex-start">
          <div>
            <div class="form-group" style="margin-bottom:20px">
              <label class="form-label">Display Language</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
                ${langs.map(l=>`
                  <button onclick="setLocale('${l.code}')"
                    style="padding:12px;border-radius:10px;border:2px solid ${savedLang===l.code?'var(--c-primary)':'var(--c-border)'};background:${savedLang===l.code?'var(--c-primary-lt)':'var(--c-surface)'};cursor:pointer;text-align:left;transition:all .15s;width:100%">
                    <div style="font-weight:700;font-size:13px;color:${savedLang===l.code?'var(--c-primary)':'var(--c-text)'}">${l.label}</div>
                    <div style="font-size:10px;color:var(--c-text2);margin-top:2px">${l.region}</div>
                  </button>`).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Display Currency</label>
              <select class="form-input" id="loc-currency" onchange="setDisplayCurrency(this.value)">
                ${currencies.map(c=>`<option value="${c}"${savedCurrency===c?' selected':''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="settings-card" style="margin:0;background:var(--c-bg);border-style:dashed">
            <div class="settings-card-head" style="background:transparent;border-bottom:1px solid var(--c-border);font-size:11px">
              Region Format Preview
            </div>
            <div class="settings-card-body" style="padding:14px">
              <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:8px">Date Format</div>
              ${dateFmts.map(fmt=>`
                <div onclick="setDateFormat('${fmt}')"
                  style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-radius:8px;border:1px solid ${savedDateFmt===fmt?'var(--c-primary)':'var(--c-border)'};background:${savedDateFmt===fmt?'var(--c-primary-lt)':'var(--c-surface)'};margin-bottom:6px;cursor:pointer;transition:all .15s">
                  <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text2)">${fmt}</span>
                  <span style="font-size:12px;font-weight:600;color:${savedDateFmt===fmt?'var(--c-primary)':'var(--c-text)'}">
                    ${sampleDate.toLocaleDateString('en-IN', { dateStyle: fmt })}
                  </span>
                </div>`).join('')}
              <div style="margin-top:8px;padding:9px 12px;border-radius:8px;border:1px solid var(--c-border);background:var(--c-surface);display:flex;justify-content:space-between">
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text2)">Currency</span>
                <span style="font-size:12px;font-weight:600;color:var(--c-text)" id="curr-preview">
                  ${new Intl.NumberFormat('en-IN', { style:'currency', currency: savedCurrency }).format(1234.56)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function setLocale(code) {
  localStorage.setItem('bf_lang', code);
  switchSettingsTab('localization');
  toast('Language preference saved');
}
function setDateFormat(fmt) {
  localStorage.setItem('bf_date_fmt', fmt);
  switchSettingsTab('localization');
  toast('Date format updated');
}
function setDisplayCurrency(val) {
  localStorage.setItem('bf_disp_currency', val);
  const el = document.getElementById('curr-preview');
  if (el) el.textContent = new Intl.NumberFormat('en-IN', { style:'currency', currency: val }).format(1234.56);
  toast('Display currency updated');
}

// ── Custom Forms Tab ───────────────────────────
function _renderCustomFormsTab() {
  if (_editingForm) return _renderFormEditor();
  const forms = _customForms;
  return `
    <div class="settings-card">
      <div class="settings-card-head" style="display:flex;justify-content:space-between;align-items:center">
        <span style="display:flex;align-items:center;gap:8px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Custom Form Templates
        </span>
        <button class="btn btn-primary btn-sm" onclick="openNewCustomForm()">${ICONS.plus} New Form</button>
      </div>
      <div class="settings-card-body" style="padding:${forms.length ? '0' : '20px'}">
        ${forms.length === 0 ? `
          <div class="settings-placeholder">
            <div class="settings-placeholder-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </div>
            <h4 style="font-weight:700;font-size:15px;margin-bottom:6px">No Form Templates Yet</h4>
            <p style="font-size:12px;color:var(--c-text2);margin-bottom:16px;max-width:280px;line-height:1.6">Create reusable form templates for invoices, purchase orders, and custom documents.</p>
            <button class="btn btn-primary" onclick="openNewCustomForm()">${ICONS.plus} Create First Form</button>
          </div>` :
          `<div class="table-wrap"><table>
            <thead><tr><th>Form Name</th><th>Fields</th><th>Status</th><th>Last Updated</th><th>Actions</th></tr></thead>
            <tbody>
              ${forms.map(f=>`<tr>
                <td>
                  <strong>${esc(f.name)}</strong>
                  ${f.description?`<div style="font-size:11px;color:var(--c-text2)">${esc(f.description)}</div>`:''}
                </td>
                <td style="color:var(--c-text2);font-size:12px">${f.fields?.length || 0} fields</td>
                <td><span class="badge ${f.status==='Active'?'badge-paid':'badge-draft'}">${f.status}</span></td>
                <td style="font-size:12px;color:var(--c-text2)">${f.lastUpdated || '—'}</td>
                <td>
                  <div class="tbl-actions">
                    <button class="btn btn-ghost btn-icon btn-sm" title="Edit" onclick="editCustomForm('${f.id}')">${ICONS.edit}</button>
                    <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteCustomForm('${f.id}','${esc(f.name)}')">${ICONS.trash}</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}
      </div>
    </div>`;
}

function _renderFormEditor() {
  const f = _editingForm;
  const fieldTypes = [
    { type: 'text',     label: 'Single Line', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>` },
    { type: 'number',   label: 'Number',      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>` },
    { type: 'textarea', label: 'Multi Line',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>` },
    { type: 'dropdown', label: 'Dropdown',    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>` },
    { type: 'date',     label: 'Date',        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
    { type: 'checkbox', label: 'Checkbox',    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>` },
  ];

  return `
    <div class="settings-card">
      <div class="settings-card-head" style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px">
          <button onclick="_editingForm=null;switchSettingsTab('custom_forms')" class="btn btn-ghost btn-icon btn-sm" title="Back">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <span>${f.id === 'new' ? 'New Form Template' : `Edit: ${esc(f.name)}`}</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="_editingForm=null;switchSettingsTab('custom_forms')">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="saveCustomForm()">Save Form</button>
        </div>
      </div>
      <div class="settings-card-body">
        <div class="form-row cols-2" style="margin-bottom:20px">
          <div class="form-group"><label class="form-label req">Form Name</label>
            <input class="form-input" id="cf-name" value="${esc(f.name||'')}" placeholder="e.g. Purchase Order">
          </div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-input" id="cf-status">
              <option value="Draft"${(f.status||'Draft')==='Draft'?' selected':''}>Draft</option>
              <option value="Active"${f.status==='Active'?' selected':''}>Active</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:24px"><label class="form-label">Description</label>
          <input class="form-input" id="cf-desc" value="${esc(f.description||'')}" placeholder="Brief description of this form">
        </div>
        <div style="display:grid;grid-template-columns:190px 1fr;gap:20px;align-items:flex-start">
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--c-text2);margin-bottom:10px">Field Types</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              ${fieldTypes.map(ft=>`
                <button class="field-type-btn" onclick="addCustomFormField('${ft.type}')">
                  ${ft.icon}
                  <span>${ft.label}</span>
                </button>`).join('')}
            </div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--c-text2);margin-bottom:10px">Form Fields <span style="color:var(--c-text3);font-weight:400">(${(f.fields||[]).length})</span></div>
            <div id="cf-fields-list">
              ${(f.fields||[]).length === 0 ?
                `<div style="border:2px dashed var(--c-border);border-radius:10px;padding:36px 20px;text-align:center;color:var(--c-text3);font-size:12px;line-height:1.6">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 8px;display:block;opacity:.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Click a field type on the left to add fields to this form
                </div>` :
                (f.fields||[]).map((field, i) => `
                  <div class="custom-form-field" style="display:flex;align-items:center;gap:10px;background:var(--c-surface2);border:1px solid var(--c-border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px">
                    <div style="flex:1">
                      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                        <span style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.05em;background:var(--c-border);padding:2px 6px;border-radius:4px">${field.type}</span>
                        <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--c-text2);cursor:pointer;margin-left:auto">
                          <input type="checkbox" ${field.required?'checked':''} onchange="toggleCFRequired(${i},this.checked)"> Required
                        </label>
                      </div>
                      <input class="form-input" style="font-size:12px;padding:6px 10px" value="${esc(field.label||'')}" placeholder="Field label" oninput="updateCFLabel(${i},this.value)">
                    </div>
                    <button class="btn btn-ghost btn-icon btn-sm" onclick="removeCFField(${i})" style="color:var(--c-red)">${ICONS.trash}</button>
                  </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function addCustomFormField(type) {
  if (!_editingForm) return;
  _editingForm.fields = _editingForm.fields || [];
  _editingForm.fields.push({ type, label: '', required: false });
  switchSettingsTab('custom_forms');
}
function removeCFField(i) {
  if (!_editingForm) return;
  _editingForm.fields.splice(i, 1);
  switchSettingsTab('custom_forms');
}
function updateCFLabel(i, val) {
  if (_editingForm && _editingForm.fields[i]) _editingForm.fields[i].label = val;
}
function toggleCFRequired(i, val) {
  if (_editingForm && _editingForm.fields[i]) _editingForm.fields[i].required = val;
}
function openNewCustomForm() {
  _editingForm = { id: 'new', name: 'New Form', description: '', fields: [], status: 'Draft', lastUpdated: 'Just now' };
  switchSettingsTab('custom_forms');
}
function editCustomForm(id) {
  _editingForm = { ..._customForms.find(f => f.id === id) };
  if (_editingForm) _editingForm.fields = [...(_editingForm.fields || [])];
  switchSettingsTab('custom_forms');
}
function saveCustomForm() {
  const name = document.getElementById('cf-name')?.value.trim();
  if (!name) { toast('Form name is required', 'error'); return; }
  _editingForm.name        = name;
  _editingForm.description = document.getElementById('cf-desc')?.value.trim() || '';
  _editingForm.status      = document.getElementById('cf-status')?.value || 'Draft';
  _editingForm.lastUpdated = new Date().toLocaleDateString();
  if (_editingForm.id === 'new') {
    _editingForm.id = 'form_' + Date.now();
    _customForms.push({ ..._editingForm });
  } else {
    const idx = _customForms.findIndex(f => f.id === _editingForm.id);
    if (idx >= 0) _customForms[idx] = { ..._editingForm };
  }
  _editingForm = null;
  toast('Form template saved');
  switchSettingsTab('custom_forms');
}
function deleteCustomForm(id, name) {
  confirmDel(`Delete form "${name}"?`, () => {
    _customForms = _customForms.filter(f => f.id !== id);
    toast('Form deleted');
    switchSettingsTab('custom_forms');
  });
}

// ── Security Tab ───────────────────────────────
function _renderSecurityTab() {
  const sessions = [
    { device: 'Chrome on Windows', location: 'Chennai, IN', last: 'Active now', current: true },
    { device: 'Safari on iPhone', location: 'Mumbai, IN', last: '2 hours ago', current: false },
    { device: 'Firefox on MacOS', location: 'Bengaluru, IN', last: '3 days ago', current: false },
  ];
  const twoFAEnabled = localStorage.getItem('bf_2fa') === 'on';
  const loginAlerts  = localStorage.getItem('bf_login_alerts') !== 'off';
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Password &amp; Authentication
      </div>
      <div class="settings-card-body">
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label req">Current Password</label>
            <input class="form-input" type="password" id="sec-cur-pw" placeholder="Enter current password">
          </div>
          <div></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label req">New Password</label>
            <input class="form-input" type="password" id="sec-new-pw" placeholder="Min 8 characters" oninput="checkPwStrength(this.value)">
            <div id="sec-pw-bar" style="height:4px;border-radius:2px;margin-top:6px;background:var(--c-border);transition:all .3s;width:0"></div>
            <div id="sec-pw-label" style="font-size:11px;color:var(--c-text2);margin-top:4px"></div>
          </div>
          <div class="form-group"><label class="form-label req">Confirm New Password</label>
            <input class="form-input" type="password" id="sec-confirm-pw" placeholder="Repeat new password">
          </div>
        </div>
        <button class="btn btn-primary" onclick="saveNewPassword()">Update Password</button>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1"/></svg>
        Two-Factor Authentication (2FA)
      </div>
      <div class="settings-card-body">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--c-surface2);border:1px solid var(--c-border);border-radius:8px;margin-bottom:14px">
          <div>
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">Authenticator App (TOTP)</div>
            <div style="font-size:12px;color:var(--c-text2)">Use Google Authenticator, Authy, or any TOTP app</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="sec-2fa" ${twoFAEnabled ? 'checked' : ''} onchange="toggle2FA(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--c-surface2);border:1px solid var(--c-border);border-radius:8px">
          <div>
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">Login Alert Emails</div>
            <div style="font-size:12px;color:var(--c-text2)">Get an email when a new device logs into your account</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="sec-login-alerts" ${loginAlerts ? 'checked' : ''} onchange="toggleLoginAlerts(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-card-head" style="display:flex;justify-content:space-between;align-items:center">
        <span style="display:flex;align-items:center;gap:8px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          Active Sessions
        </span>
        <button class="btn btn-danger btn-sm" onclick="revokeAllSessions()">Revoke All Other Sessions</button>
      </div>
      <div class="settings-card-body" style="padding:0">
        ${sessions.map(s => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--c-border)">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;background:var(--c-surface2);border-radius:8px;display:flex;align-items:center;justify-content:center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <div>
                <div style="font-weight:600;font-size:13px;margin-bottom:2px">${s.device} ${s.current ? '<span style="font-size:10px;background:var(--c-green-lt);color:var(--c-green);padding:2px 6px;border-radius:20px;margin-left:6px">Current</span>' : ''}</div>
                <div style="font-size:11px;color:var(--c-text2)">${s.location} · ${s.last}</div>
              </div>
            </div>
            ${!s.current ? '<button class="btn btn-ghost btn-sm" onclick="toast(\'Session revoked\')">Revoke</button>' : ''}
          </div>`).join('')}
      </div>
    </div>
    <div class="settings-card" style="border-color:var(--c-red);background:#fff8f8">
      <div class="settings-card-head" style="color:var(--c-red)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Danger Zone
      </div>
      <div class="settings-card-body">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">Delete Account</div>
            <div style="font-size:12px;color:var(--c-text2)">Permanently delete your account and all associated data. This cannot be undone.</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="confirmDel('Delete your account permanently? All data will be lost.',()=>toast('Account deletion requested','info'))">Delete Account</button>
        </div>
      </div>
    </div>`;
}

// Password/Security functions are in roles.js (_renderSecuritySection)

// ── Notifications Tab ──────────────────────────
function _renderNotificationsTab() {
  const prefs = JSON.parse(localStorage.getItem('bf_notif_prefs') || '{}');
  const def = (key, fallback = true) => prefs[key] !== undefined ? prefs[key] : fallback;
  const notifMethod = localStorage.getItem('bf_notif_method') || 'both';
  const groups = [
    {
      title: 'Invoice Alerts', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      items: [
        { key: 'inv_overdue', label: 'Invoice Overdue', desc: 'Alert when an invoice passes its due date' },
        { key: 'inv_sent', label: 'Invoice Sent', desc: 'Confirmation when invoice is emailed to customer' },
        { key: 'inv_viewed', label: 'Invoice Viewed', desc: 'Notify when customer opens the invoice link' },
      ]
    },
    {
      title: 'Payment Alerts', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
      items: [
        { key: 'pay_received', label: 'Payment Received', desc: 'Alert when a payment is recorded against an invoice' },
        { key: 'pay_partial', label: 'Partial Payment', desc: 'Notify when only a portion of the invoice is paid' },
        { key: 'pay_reminder', label: 'Payment Reminders', desc: 'Send reminder 3 days before invoice due date' },
      ]
    },
    {
      title: 'Team & System', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
      items: [
        { key: 'team_join', label: 'Team Member Joins', desc: 'Alert when a new member is added to your organization' },
        { key: 'team_activity', label: 'Team Activity Digest', desc: 'Weekly summary of team actions and changes' },
        { key: 'sys_updates', label: 'Product Updates', desc: 'Get notified about new features and improvements' },
      ]
    },
  ];
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        Notification Delivery
      </div>
      <div class="settings-card-body">
        <div style="font-size:12px;font-weight:600;color:var(--c-text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">Receive notifications via</div>
        <div style="display:flex;gap:10px;margin-bottom:4px">
          ${[['email','Email Only'],['in_app','In-App Only'],['both','Email & In-App']].map(([v,l]) => `
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:500;padding:8px 14px;border:1px solid ${notifMethod===v?'var(--c-primary)':'var(--c-border)'};border-radius:8px;background:${notifMethod===v?'var(--c-primary-lt)':'var(--c-surface)'}">
              <input type="radio" name="notif-method" value="${v}" ${notifMethod===v?'checked':''} onchange="saveNotifMethod('${v}')" style="accent-color:var(--c-primary)">
              ${l}
            </label>`).join('')}
        </div>
      </div>
    </div>
    ${groups.map(g => `
    <div class="settings-card">
      <div class="settings-card-head">${g.icon} ${g.title}</div>
      <div class="settings-card-body" style="padding:0">
        ${g.items.map(item => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--c-border)">
            <div>
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">${item.label}</div>
              <div style="font-size:12px;color:var(--c-text2)">${item.desc}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${def(item.key)?'checked':''} onchange="saveNotifPref('${item.key}',this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>`).join('')}
      </div>
    </div>`).join('')}
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Quiet Hours
      </div>
      <div class="settings-card-body">
        <div style="font-size:12px;color:var(--c-text2);margin-bottom:12px">Pause in-app notifications during specified hours</div>
        <div class="form-row cols-2">
          <div class="form-group"><label class="form-label">Quiet From</label>
            <input class="form-input" type="time" id="notif-quiet-from" value="${localStorage.getItem('bf_quiet_from')||'22:00'}" onchange="saveQuietHours()">
          </div>
          <div class="form-group"><label class="form-label">Quiet Until</label>
            <input class="form-input" type="time" id="notif-quiet-until" value="${localStorage.getItem('bf_quiet_until')||'08:00'}" onchange="saveQuietHours()">
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveQuietHours();toast('Quiet hours saved')">Save Quiet Hours</button>
      </div>
    </div>`;
}

function saveNotifPref(key, val) {
  const prefs = JSON.parse(localStorage.getItem('bf_notif_prefs') || '{}');
  prefs[key] = val;
  localStorage.setItem('bf_notif_prefs', JSON.stringify(prefs));
  toast(val ? 'Notification enabled' : 'Notification disabled');
}

function saveNotifMethod(method) {
  localStorage.setItem('bf_notif_method', method);
  toast('Notification method updated');
}

function saveQuietHours() {
  const from  = document.getElementById('notif-quiet-from')?.value;
  const until = document.getElementById('notif-quiet-until')?.value;
  if (from)  localStorage.setItem('bf_quiet_from', from);
  if (until) localStorage.setItem('bf_quiet_until', until);
}

// ── Appearance Tab ─────────────────────────────
function _renderAppearanceTab() {
  const savedTheme  = localStorage.getItem('bf_theme')  || 'light';
  const savedAccent = localStorage.getItem('bf_accent') || '#1a6be8';
  const savedFont   = localStorage.getItem('bf_font')   || 'dm-sans';
  const savedCompact= localStorage.getItem('bf_compact')=== 'on';
  const savedRadius = localStorage.getItem('bf_radius') || '8';
  const accents = [
    { name: 'Indigo Blue', value: '#1a6be8' },
    { name: 'Emerald',     value: '#0ab584' },
    { name: 'Violet',      value: '#7c3aed' },
    { name: 'Rose',        value: '#e11d48' },
    { name: 'Amber',       value: '#d97706' },
    { name: 'Slate',       value: '#475569' },
  ];
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        Theme Mode
      </div>
      <div class="settings-card-body">
        <div style="display:flex;gap:12px">
          ${[['light','☀️ Light'],['dark','🌙 Dark'],['system','💻 System']].map(([v,l]) => `
            <button onclick="applyTheme('${v}')" style="flex:1;padding:14px;border:2px solid ${savedTheme===v?'var(--c-primary)':'var(--c-border)'};border-radius:10px;background:${savedTheme===v?'var(--c-primary-lt)':'var(--c-surface)'};cursor:pointer;font-size:13px;font-weight:${savedTheme===v?'700':'500'};color:${savedTheme===v?'var(--c-primary)':'var(--c-text)'}">
              ${l}
            </button>`).join('')}
        </div>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
        Accent Color
      </div>
      <div class="settings-card-body">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          ${accents.map(a => `
            <button title="${a.name}" onclick="applyAccent('${a.value}')" style="width:36px;height:36px;border-radius:50%;background:${a.value};border:3px solid ${savedAccent===a.value?'var(--c-text)':'transparent'};cursor:pointer;transition:all .2s"></button>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <label style="font-size:12px;color:var(--c-text2);font-weight:600">Custom Color:</label>
          <input type="color" value="${savedAccent}" oninput="applyAccent(this.value)" style="width:36px;height:36px;border:none;border-radius:6px;cursor:pointer;padding:0">
        </div>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
        Typography &amp; Density
      </div>
      <div class="settings-card-body">
        <div class="form-row cols-2">
          <div class="form-group">
            <label class="form-label">Interface Font</label>
            <select class="form-input" id="app-font" onchange="applyFont(this.value)">
              <option value="dm-sans" ${savedFont==='dm-sans'?'selected':''}>DM Sans (Default)</option>
              <option value="inter"   ${savedFont==='inter'  ?'selected':''}>Inter</option>
              <option value="system"  ${savedFont==='system' ?'selected':''}>System Font</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Border Radius</label>
            <select class="form-input" id="app-radius" onchange="applyRadius(this.value)">
              <option value="4"  ${savedRadius==='4' ?'selected':''}>Compact (4px)</option>
              <option value="8"  ${savedRadius==='8' ?'selected':''}>Default (8px)</option>
              <option value="12" ${savedRadius==='12'?'selected':''}>Rounded (12px)</option>
            </select>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--c-surface2);border:1px solid var(--c-border);border-radius:8px">
          <div>
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">Compact Mode</div>
            <div style="font-size:12px;color:var(--c-text2)">Reduce spacing and padding for a denser layout</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="app-compact" ${savedCompact?'checked':''} onchange="applyCompact(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        Sidebar &amp; Navigation
      </div>
      <div class="settings-card-body">
        ${[
          ['bf_sidebar_collapsed','Collapse sidebar by default'],
          ['bf_show_shortcuts','Show keyboard shortcuts in sidebar'],
          ['bf_anim_enabled','Enable interface animations'],
        ].map(([key, label]) => {
          const checked = localStorage.getItem(key) === 'on';
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--c-border)">' +
            '<span style="font-size:13px;font-weight:500">' + label + '</span>' +
            '<label class="toggle-switch"><input type="checkbox" ' + (checked?'checked':'') + ' onchange="toggleAppPref(\'' + key + '\',this.checked)"><span class="toggle-slider"></span></label>' +
            '</div>';
        }).join('')}
        <div style="margin-top:14px">
          <button class="btn btn-secondary btn-sm" onclick="resetAppearance()">Reset to Defaults</button>
        </div>
      </div>
    </div>`;
}

function applyTheme(theme) {
  localStorage.setItem('bf_theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  switchSettingsTab('appearance');
  toast('Theme updated');
}

function applyAccent(color) {
  localStorage.setItem('bf_accent', color);
  document.documentElement.style.setProperty('--c-primary', color);
  switchSettingsTab('appearance');
}

function applyFont(font) {
  localStorage.setItem('bf_font', font);
  const fontMap = { 'dm-sans': '"DM Sans",sans-serif', 'inter': '"Inter",sans-serif', 'system': 'system-ui,sans-serif' };
  document.documentElement.style.setProperty('--font', fontMap[font] || fontMap['dm-sans']);
  toast('Font updated');
}

function applyRadius(r) {
  localStorage.setItem('bf_radius', r);
  document.documentElement.style.setProperty('--radius', r + 'px');
  toast('Border radius updated');
}

function applyCompact(on) {
  localStorage.setItem('bf_compact', on ? 'on' : 'off');
  document.body.classList.toggle('compact-mode', on);
  toast(on ? 'Compact mode on' : 'Compact mode off');
}

function toggleAppPref(key, val) {
  localStorage.setItem(key, val ? 'on' : 'off');
  toast('Preference saved');
}

function resetAppearance() {
  ['bf_theme','bf_accent','bf_font','bf_compact','bf_radius','bf_sidebar_collapsed','bf_show_shortcuts','bf_anim_enabled'].forEach(k => localStorage.removeItem(k));
  document.documentElement.style.removeProperty('--c-primary');
  document.documentElement.style.removeProperty('--font');
  document.documentElement.style.removeProperty('--radius');
  switchSettingsTab('appearance');
  toast('Appearance reset to defaults');
}


// ── Placeholder Tab ────────────────────────────
function _renderPlaceholderTab(title, iconSvg, desc) {
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <span style="display:inline-flex;width:15px;height:15px;align-items:center">${iconSvg}</span>
        ${title}
      </div>
      <div class="settings-card-body">
        <div class="settings-placeholder">
          <div class="settings-placeholder-icon">${iconSvg}</div>
          <h4 style="font-weight:700;font-size:15px;margin-bottom:8px">Work in Progress</h4>
          <p style="font-size:12px;color:var(--c-text2);max-width:340px;line-height:1.6;margin-bottom:20px">${desc}</p>
          <div style="padding:10px 16px;background:var(--c-primary-lt);border:1px solid #c8dcf8;border-radius:8px;font-size:12px;color:var(--c-primary)">
            🚀 This feature is coming soon. Stay tuned for updates!
          </div>
        </div>
      </div>
    </div>`;
}

// ── Team Tab ───────────────────────────────────
function _renderTeamTab() {
  const team = _settingsTeam || [];
  return `
    <div class="settings-card">
      <div class="settings-card-head" style="display:flex;justify-content:space-between;align-items:center">
        <span style="display:flex;align-items:center;gap:8px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Team Members
        </span>
        ${APP.currentUser?.role === 'owner' ? `<button class="btn btn-primary btn-sm" onclick="openAddMemberForm()">${ICONS.plus} Add Member</button>` : ''}
      </div>
      <div class="settings-card-body" style="padding:0">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last Login</th><th>Joined</th>${APP.currentUser?.role==='owner'?'<th>Actions</th>':''}</tr></thead>
            <tbody>
              ${(team||[]).map(u => `<tr>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:28px;height:28px;border-radius:50%;background:var(--c-primary-lt);color:var(--c-primary);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">${(u.name||'?')[0].toUpperCase()}</div>
                    <span style="font-weight:500">${esc(u.name)}</span>
                    ${u.id === APP.currentUser?.id ? '<span class="badge badge-sent" style="font-size:9px">You</span>' : ''}
                  </div>
                </td>
                <td>${esc(u.email)}</td>
                <td>${roleBadge(u.role)}</td>
                <td style="font-size:12px;color:var(--c-text2)">${u.last_login ? fmtDate(u.last_login.slice(0,10)) : 'Never'}</td>
                <td style="font-size:12px;color:var(--c-text2)">${fmtDate((u.created_at||'').slice(0,10))}</td>
                ${APP.currentUser?.role === 'owner' ? `<td>
                  ${u.id !== APP.currentUser?.id ? `<div class="tbl-actions" style="opacity:1;gap:6px">
                    <select class="form-input" style="padding:3px 6px;font-size:12px;height:auto" onchange="changeMemberRole('${u.id}',this.value)" ${u.role==='owner'?'disabled':''}>
                      <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                      <option value="staff" ${u.role==='staff'?'selected':''}>Staff</option>
                      <option value="member" ${u.role==='member'?'selected':''}>Member</option>
                    </select>
                    <button class="btn btn-danger btn-icon btn-sm" onclick="deleteMember('${u.id}','${esc(u.name)}')">${ICONS.trash}</button>
                  </div>` : '—'}
                </td>` : ''}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// ── Profile Tab ────────────────────────────────
function _renderProfileTab() {
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        My Profile
      </div>
      <div class="settings-card-body">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:16px;background:var(--c-surface2);border-radius:8px;border:1px solid var(--c-border)">
          <div style="width:52px;height:52px;border-radius:50%;background:var(--c-primary);color:white;font-size:20px;font-weight:700;display:flex;align-items:center;justify-content:center">${(APP.currentUser?.name||'U')[0].toUpperCase()}</div>
          <div>
            <div style="font-weight:600;font-size:15px">${esc(APP.currentUser?.name||'')}</div>
            <div style="font-size:12px;color:var(--c-text2)">${esc(APP.currentUser?.email||'')}</div>
            <div style="margin-top:4px">${roleBadge(APP.currentUser?.role||'member')}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-card">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Change Password
      </div>
      <div class="settings-card-body">
        <div style="max-width:400px">
          <div class="form-group"><label class="form-label req">Current Password</label>
            <input class="form-input" type="password" id="pw-current" placeholder="Enter current password">
          </div>
          <div class="form-group"><label class="form-label req">New Password</label>
            <input class="form-input" type="password" id="pw-new" placeholder="At least 8 characters">
          </div>
          <div class="form-group"><label class="form-label req">Confirm New Password</label>
            <input class="form-input" type="password" id="pw-confirm" placeholder="Repeat new password">
          </div>
          <button class="btn btn-primary" onclick="changePassword()">Update Password</button>
        </div>
      </div>
    </div>`;
}

// ── Save Functions ─────────────────────────────
async function saveBizInfo() {
  const org = _settingsOrg || {};
  const data = {
    name: document.getElementById('s-bname').value.trim() || 'My Business',
    email: document.getElementById('s-email').value.trim(),
    phone: document.getElementById('s-phone').value.trim(),
    address: document.getElementById('s-address').value.trim(),
    city: document.getElementById('s-city').value.trim(),
    state: document.getElementById('s-state').value,
    pincode: document.getElementById('s-pin').value.trim(),
    gstin: document.getElementById('s-gstin').value.trim().toUpperCase(),
    pan: document.getElementById('s-pan').value.trim().toUpperCase(),
    currency: org.currency || 'INR',
    inv_prefix: org.inv_prefix || 'INV-',
    next_inv_no: org.next_inv_no || 1,
    default_notes: org.default_notes || '',
    default_terms: org.default_terms || '',
  };
  try {
    await API.updateOrg(data);
    APP.org = { ...APP.org, ...data };
    _settingsOrg = { ..._settingsOrg, ...data };
    document.getElementById('org-name-display').textContent = data.name;
    document.getElementById('org-avatar').textContent = data.name[0].toUpperCase();
    toast('Organization info saved');
  } catch(e) { toast(e.message, 'error'); }
}

async function saveInvoiceSettings() {
  const org = _settingsOrg || {};
  const data = {
    name: org.name || 'My Business',
    email: org.email || '', phone: org.phone || '',
    address: org.address || '', city: org.city || '',
    state: org.state || '', pincode: org.pincode || '',
    gstin: org.gstin || '', pan: org.pan || '',
    currency: document.getElementById('s-currency').value,
    inv_prefix: document.getElementById('s-prefix').value.trim() || 'INV-',
    next_inv_no: parseInt(document.getElementById('s-nextnum').value) || 1,
    default_notes: document.getElementById('s-notes').value.trim(),
    default_terms: document.getElementById('s-terms').value.trim(),
  };
  try {
    await API.updateOrg(data);
    APP.org = { ...APP.org, ...data };
    _settingsOrg = { ..._settingsOrg, ...data };
    toast('Invoice settings saved');
  } catch(e) { toast(e.message, 'error'); }
}

async function changePassword() {
  const cur = document.getElementById('pw-current').value;
  const nw  = document.getElementById('pw-new').value;
  const cf  = document.getElementById('pw-confirm').value;
  if (!cur || !nw || !cf) { toast('All fields required', 'error'); return; }
  if (nw !== cf) { toast('New passwords do not match', 'error'); return; }
  if (nw.length < 8) { toast('New password must be at least 8 characters', 'error'); return; }
  try {
    await API.changePassword(cur, nw);
    toast('Password updated successfully');
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
  } catch(e) { toast(e.message, 'error'); }
}

function openAddMemberForm() {
  openModal({
    size: 'sm', title: 'Add Team Member',
    body: `
      <div class="form-group"><label class="form-label req">Full Name</label>
        <input class="form-input" id="tm-name" placeholder="Jane Smith">
      </div>
      <div class="form-group"><label class="form-label req">Email Address</label>
        <input class="form-input" id="tm-email" type="email" placeholder="jane@company.com">
      </div>
      <div class="form-group"><label class="form-label req">Temporary Password</label>
        <input class="form-input" id="tm-pass" type="password" placeholder="Min 8 characters">
      </div>
      <div class="form-group"><label class="form-label">Role</label>
        <select class="form-input" id="tm-role">
          <option value="staff">Staff — View and create invoices/expenses</option>
          <option value="member">Member — Can view and create</option>
          <option value="admin">Admin — Full access except team mgmt</option>
        </select>
      </div>
      <div style="background:var(--c-orange-lt);border:1px solid #f5dba8;border-radius:6px;padding:10px;font-size:12px;color:var(--c-orange)">
        ⚠️ Share the temporary password with the new member. They can change it after logging in.
      </div>`,
    onSave: async () => {
      const name  = document.getElementById('tm-name').value.trim();
      const email = document.getElementById('tm-email').value.trim();
      const pass  = document.getElementById('tm-pass').value;
      const role  = document.getElementById('tm-role').value;
      if (!name || !email || !pass) { toast('All fields required', 'error'); return false; }
      if (pass.length < 8) { toast('Password must be at least 8 characters', 'error'); return false; }
      try {
        await API.addMember({ name, email, password: pass, role });
        toast(`${name} added to the team`);
        navigateTo('settings');
      } catch(e) { toast(e.message, 'error'); return false; }
    }
  });
}

async function deleteMember(id, name) {
  confirmDel(`Remove ${name} from the team?`, async () => {
    try {
      await API.deleteMember(id);
      toast(`${name} removed`);
      navigateTo('settings');
    } catch(e) { toast(e.message, 'error'); }
  });
}

async function changeMemberRole(id, role) {
  try {
    await API.patch(`/api/team/${id}/role`, { role });
    toast(`Role updated to ${role}`);
    navigateTo('settings');
  } catch(e) { toast(e.message, 'error'); }
}
