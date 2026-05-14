// js/pages/settings/org.js
function _renderOrgTab() {
  const org = _settingsOrg || {};
  return `
    <div class="settings-card">
      <div class="settings-card-head">${ICONS.home} Entity Metadata</div>
      <div class="settings-card-body">
        <div class="settings-row">
          <div class="settings-label-wrap"><div class="settings-label">Business Identity</div><div class="settings-desc">This name will appear on all your invoices and communications.</div></div>
          <div class="settings-ctrl"><label>Legal Business Name</label><input type="text" id="s-bname" value="${esc(org.name||'')}"></div>
        </div>
        <div class="settings-row">
          <div class="settings-label-wrap"><div class="settings-label">Contact Details</div><div class="settings-desc">Provide your primary contact number for customer inquiries.</div></div>
          <div class="settings-ctrl"><label>Primary Phone</label><input type="text" id="s-phone" value="${esc(org.phone||'')}"></div>
        </div>
        <div class="settings-row">
          <div class="settings-label-wrap"><div class="settings-label">Operating Address</div><div class="settings-desc">The physical address that will be displayed in the invoice footer.</div></div>
          <div class="settings-ctrl"><label>Full Address</label><textarea id="s-address" rows="3">${esc(org.address||'')}</textarea></div>
        </div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" onclick="saveBizInfo()">Save Information</button></div>
      </div>
    </div>`;
}

async function saveBizInfo() {
  const payload = {
    name: document.getElementById('s-bname').value.trim(),
    phone: document.getElementById('s-phone').value.trim(),
    address: document.getElementById('s-address').value.trim(),
  };
  await API.updateOrg(payload);
  toast('Business info saved successfully');
  _settingsOrg = await API.getOrg();
}

function _renderInvoiceTab() {
  const org = _settingsOrg || {};
  return `
    <div class="settings-card">
      <div class="settings-card-head">${ICONS.invoice} Invoice Customization</div>
      <div class="settings-card-body">
        <div class="settings-row">
          <div class="settings-label-wrap"><div class="settings-label">Naming Pattern</div><div class="settings-desc">Configure how your invoices are numbered and prefixed.</div></div>
          <div class="settings-input-grid">
            <div class="settings-ctrl"><label>Sequence Prefix</label><input type="text" id="s-prefix" value="${esc(org.inv_prefix||'INV-')}"></div>
            <div class="settings-ctrl"><label>Starting Number</label><input type="number" id="s-nextnum" value="${org.next_inv_no||1}"></div>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" onclick="saveInvoiceSettings()">Update Sequence</button></div>
      </div>
    </div>`;
}

async function saveInvoiceSettings() {
  const payload = {
    inv_prefix: document.getElementById('s-prefix').value.trim(),
    next_inv_no: parseInt(document.getElementById('s-nextnum').value, 10),
  };
  await API.updateOrg(payload);
  toast('Invoice settings saved');
}
