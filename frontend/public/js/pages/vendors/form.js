// js/pages/vendors/form.js
function openVendorForm(v = null) {
  openModal({
    size: 'lg', title: v ? `Edit Vendor — ${v.name}` : 'New Vendor',
    body: `
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label req">Vendor Name</label><input class="form-input" id="vf-name" value="${esc(v?.name||'')}"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="vf-email" value="${esc(v?.email||'')}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="vf-phone" value="${esc(v?.phone||'')}"></div>
        <div class="form-group"><label class="form-label">Company</label><input class="form-input" id="vf-company" value="${esc(v?.company_name||'')}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">GSTIN</label><input class="form-input" id="vf-gstin" value="${esc(v?.gstin||'')}" style="text-transform:uppercase"></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="vf-status"><option value="active"${v?.status==='active'?' selected':''}>Active</option><option value="inactive"${v?.status==='inactive'?' selected':''}>Inactive</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">Address</label><textarea class="form-input" id="vf-address" rows="2">${esc(v?.address||'')}</textarea></div>`,
    onSave: async () => {
      const data = {
        name: document.getElementById('vf-name').value.trim(),
        email: document.getElementById('vf-email').value.trim(),
        phone: document.getElementById('vf-phone').value.trim(),
        company_name: document.getElementById('vf-company').value.trim(),
        gstin: document.getElementById('vf-gstin').value.trim().toUpperCase(),
        status: document.getElementById('vf-status').value,
        address: document.getElementById('vf-address').value.trim(),
      };
      if (!data.name) { toast('Name is required', 'error'); return false; }
      if (v) await API.updateVendor(v.id, data);
      else await API.createVendor(data);
      toast(v ? 'Vendor updated' : 'Vendor added');
      _vendors = await API.getVendors();
      _renderVendorTable(document.querySelector('.page-content'));
    }
  });
}
