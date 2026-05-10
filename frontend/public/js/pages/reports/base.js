// js/pages/reports/base.js
async function renderReports(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div> Loading reports…</div>`;
  document.getElementById('topbar-actions').innerHTML = '';
  const summary = await API.getReportSummary();
  const totalRev = summary.totalRevenue || 0, totalExp = summary.totalExpenses || 0, net = totalRev - totalExp;
  const outstanding = summary.outstanding || 0, overdue = summary.overdue || 0;
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const rev = (summary.monthlyRevenue || []).find(m => m.month === key)?.revenue || 0;
    const exp = (summary.monthlyExpenses || []).find(m => m.month === key)?.expenses || 0;
    months.push({ label, rev, exp });
  }
  const maxM = Math.max(...months.map(m => Math.max(m.rev, m.exp)), 1);
  const CAT_COLORS = ['#1a6be8','#0a8754','#d97706','#6b3fd4','#d63d3d','#06b6d4'];
  window._reportData = { summary, months, maxM, CAT_COLORS, net, totalRev, totalExp, outstanding, overdue, invStatuses: summary.invoicesByStatus || [], topCust: summary.topCustomers || [], expCats: summary.expenseByCategory || [], now };
  _renderReportUI(el);
}

function _renderReportUI(el) {
  const { summary, months, maxM, CAT_COLORS, net, totalRev, totalExp, outstanding, overdue, topCust, expCats } = window._reportData;
  el.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card blue"><div class="kpi-icon">${ICONS.chart}</div><div class="kpi-label">Total Revenue</div><div class="kpi-value">${fmt(totalRev)}</div><div class="kpi-sub">Total sales recorded</div></div>
      <div class="kpi-card red"><div class="kpi-icon">${ICONS.dollar}</div><div class="kpi-label">Total Expenses</div><div class="kpi-value">${fmt(totalExp)}</div><div class="kpi-sub">Operating costs</div></div>
      <div class="kpi-card ${net >= 0 ? 'green' : 'red'}"><div class="kpi-icon">${ICONS.shield}</div><div class="kpi-label">Net Profit</div><div class="kpi-value">${fmt(net)}</div><div class="kpi-sub">Revenue - Expenses</div></div>
      <div class="kpi-card orange"><div class="kpi-icon">${ICONS.alert}</div><div class="kpi-label">Outstanding</div><div class="kpi-value">${fmt(outstanding)}</div><div class="kpi-sub">${fmt(overdue)} Overdue</div></div>
    </div>

    <div class="card" style="margin-bottom:24px">
      <div class="card-header"><h3 class="card-title">${ICONS.chart} Monthly Revenue vs Expenses</h3></div>
      <div class="card-body">
        <div class="bar-chart" style="height:180px">
          ${months.map(m => {
            const hRev = (m.rev / maxM) * 100;
            const hExp = (m.exp / maxM) * 100;
            return `
              <div class="bar-col">
                <div class="bar-col-inner">
                  <div class="bar" style="height:${hRev}%;background:var(--c-primary)" data-tip="Rev: ${fmt(m.rev)}"></div>
                  <div class="bar" style="height:${hExp}%;background:#fca5a5" data-tip="Exp: ${fmt(m.exp)}"></div>
                </div>
                <span class="bar-lbl">${m.label}</span>
              </div>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:center;gap:20px;margin-top:25px;font-size:11px;font-weight:600;color:var(--c-text2)">
          <div style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;background:var(--c-primary);border-radius:2px"></span> Revenue</div>
          <div style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;background:#fca5a5;border-radius:2px"></span> Expenses</div>
        </div>
      </div>
    </div>

    <div class="report-grid">
      <div class="card">
        <div class="card-header"><h3 class="card-title">${ICONS.user} Top Customers</h3></div>
        <div class="card-body-p0">
          <table>
            <thead><tr><th>Customer</th><th style="text-align:right">Revenue</th></tr></thead>
            <tbody>
              ${topCust.length ? topCust.map(c => `<tr><td>${esc(c.customer_name)}</td><td style="text-align:right;font-weight:600">${fmt(c.total_revenue)}</td></tr>`).join('') : '<tr><td colspan="2" class="empty-state">No data</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title">${ICONS.dollar} Expenses by Category</h3></div>
        <div class="card-body-p0">
          <table>
            <thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>
              ${expCats.length ? expCats.map((c, i) => `<tr>
                <td><div style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[i % CAT_COLORS.length]}"></span> ${esc(EXP_CATS[c.category] || c.category)}</div></td>
                <td style="text-align:right;font-weight:600">${fmt(c.total_amount)}</td>
              </tr>`).join('') : '<tr><td colspan="2" class="empty-state">No data</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}
