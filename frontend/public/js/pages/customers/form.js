// js/pages/customers/form.js
function openCustomerForm(c = null) {
  openModal({
    size: 'lg', title: c ? `Edit Customer — ${c.name}` : 'New Customer',
    body: `
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label req">Customer Name</label><input class="form-input" id="cf-name" value="${esc(c?.name||'')}"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="cf-email" type="email" value="${esc(c?.email||'')}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="cf-phone" value="${esc(c?.phone||'')}"></div>
        <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="cf-currency">${CURRENCIES.map(cu=>`<option value="${cu}"${(c?.currency||'INR')===cu?' selected':''}>${cu}</option>`).join('')}</select></div>
      </div>
      <div class="form-group"><label class="form-label">Address</label><textarea class="form-input" id="cf-address" rows="2">${esc(c?.address||'')}</textarea></div>
      <div class="form-row cols-3">
        <div class="form-group"><label class="form-label">City</label><input class="form-input" id="cf-city" value="${esc(c?.city||'')}"></div>
        <div class="form-group"><label class="form-label">State</label><select class="form-input" id="cf-state"><option value="">— Select —</option>${INDIAN_STATES.map(s=>`<option value="${esc(s)}"${c?.state===s?' selected':''}>${esc(s)}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">GSTIN</label><input class="form-input" id="cf-gstin" value="${esc(c?.gstin||'')}" style="text-transform:uppercase"></div>
      </div>`,
    onSave: async () => {
      const data = {
        name: document.getElementById('cf-name').value.trim(),
        email: document.getElementById('cf-email').value.trim(),
        phone: document.getElementById('cf-phone').value.trim(),
        currency: document.getElementById('cf-currency').value,
        address: document.getElementById('cf-address').value.trim(),
        city: document.getElementById('cf-city').value.trim(),
        state: document.getElementById('cf-state').value,
        gstin: document.getElementById('cf-gstin').value.trim().toUpperCase(),
      };
      if (!data.name) { toast('Name is required', 'error'); return false; }
      if (c) await API.updateCustomer(c.id, data);
      else await API.createCustomer(data);
      toast(c ? 'Customer updated' : 'Customer added');
      _customers = await API.getCustomers();
      _renderCustomerTable(document.querySelector('.page-content'));
    }
  });
}

function openWarrantyClaim(customerId, productName = '', modelNumber = '', invoiceId = '', invoiceNumber = '') {
  openModal({
    size: 'lg', title: '🔧 Submit Warranty Claim',
    body: `
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label req">Product Name</label><input class="form-input" id="wc-product" value="${esc(productName)}"></div>
        <div class="form-group"><label class="form-label">Invoice Number</label><input class="form-input" id="wc-inv-number" value="${esc(invoiceNumber)}"></div>
      </div>
      <div class="form-group"><label class="form-label req">Issue Description</label><textarea class="form-input" id="wc-issue" rows="3"></textarea></div>
    `,
    onSave: async () => {
      const payload = {
        customer_id: customerId,
        product_name: document.getElementById('wc-product').value.trim(),
        invoice_number: document.getElementById('wc-inv-number').value.trim(),
        issue_description: document.getElementById('wc-issue').value.trim(),
      };
      if (!payload.product_name || !payload.issue_description) { toast('Required fields missing', 'error'); return false; }
      await API.createWarrantyClaim(payload);
      toast('Claim submitted');
      if (_custDetailId === customerId) viewCustomerDetail(customerId);
    }
  });
}

async function deleteClaimFromDetail(claimId) {
  confirmDel('Delete this claim?', async () => {
    await API.deleteWarrantyClaim(claimId);
    toast('Claim deleted');
    if (_custDetailId) viewCustomerDetail(_custDetailId);
  });
}
