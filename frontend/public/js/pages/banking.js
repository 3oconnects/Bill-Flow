// js/pages/banking.js
async function renderBanking(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${ICONS.card} Banking Module</h3>
      </div>
      <div class="card-body">
        <div class="empty-state">
          <div style="font-size:40px;margin-bottom:15px">🏦</div>
          <h4>Bank Connections</h4>
          <p>Securely connect your bank accounts to sync transactions and automate reconciliation.</p>
          <button class="btn btn-primary" style="margin-top:20px" onclick="toast('Banking integration coming soon!')">Connect Bank Account</button>
        </div>
      </div>
    </div>`;
}
