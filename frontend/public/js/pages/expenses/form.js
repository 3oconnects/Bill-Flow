// js/pages/expenses/form.js
function openExpenseForm(e = null) {
  openModal({
    size: 'md', title: e ? 'Edit Expense' : 'Add Expense',
    body: `
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label req">Description</label><input class="form-input" id="ef-desc" value="${esc(e?.description||'')}"></div>
        <div class="form-group"><label class="form-label req">Amount</label><input class="form-input" id="ef-amount" type="number" step="0.01" value="${e?.amount||''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label req">Date</label><input class="form-input" type="date" id="ef-date" value="${e?.date || today()}"></div>
        <div class="form-group"><label class="form-label">Category</label><select class="form-input" id="ef-category">${EXP_CATS_HTML.replace(`value="${e?.category||'other'}"`, `value="${e?.category||'other'}" selected`)}</select></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">Vendor</label>
          <select class="form-input" id="ef-vendor">
            <option value="">— No vendor —</option>
            ${_vendors_exp.map(v => `<option value="${v.id}"${e?.vendor_id===v.id?' selected':''}>${esc(v.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Reference</label><input class="form-input" id="ef-ref" value="${esc(e?.reference||'')}"></div>
      </div>
    `,
    onSave: async () => {
      const payload = {
        description: document.getElementById('ef-desc').value.trim(),
        amount: parseFloat(document.getElementById('ef-amount').value),
        date: document.getElementById('ef-date').value,
        category: document.getElementById('ef-category').value,
        vendor_id: document.getElementById('ef-vendor').value || null,
        reference: document.getElementById('ef-ref').value.trim(),
      };
      if (!payload.description || !payload.amount) { toast('Required fields missing', 'error'); return false; }
      if (e) await API.updateExpense(e.id, payload);
      else await API.createExpense(payload);
      toast(e ? 'Expense updated' : 'Expense recorded');
      _expenses = await API.getExpenses();
      _renderExpenseTable(document.querySelector('.page-content'));
    }
  });
}

async function deleteExpense(id) {
  confirmDel('Delete this expense?', async () => {
    await API.deleteExpense(id);
    toast('Expense deleted');
    _expenses = await API.getExpenses();
    _renderExpenseTable(document.querySelector('.page-content'));
  });
}
