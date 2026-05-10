// js/pages/dashboard.js

// ── Shared chart filter widget (used by both dashboard & reports) ──
function chartFilterHTML(chartId) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0, 10);
  return `
    <div class="chart-filter" id="cf-${chartId}" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <div style="display:flex;gap:0;border:1px solid var(--c-border);border-radius:6px;overflow:hidden">
        <button class="cf-btn active" data-chart="${chartId}" data-mode="day"    onclick="cfSetMode(this,'day')"    style="padding:4px 10px;font-size:11px;font-weight:600;border:none;cursor:pointer;background:var(--c-primary);color:#fff">Day</button>
        <button class="cf-btn"        data-chart="${chartId}" data-mode="month"  onclick="cfSetMode(this,'month')"  style="padding:4px 10px;font-size:11px;font-weight:600;border:none;cursor:pointer;background:var(--c-surface2);color:var(--c-text2)">Month</button>
        <button class="cf-btn"        data-chart="${chartId}" data-mode="year"   onclick="cfSetMode(this,'year')"   style="padding:4px 10px;font-size:11px;font-weight:600;border:none;cursor:pointer;background:var(--c-surface2);color:var(--c-text2)">Year</button>
        <button class="cf-btn"        data-chart="${chartId}" data-mode="custom" onclick="cfSetMode(this,'custom')" style="padding:4px 10px;font-size:11px;font-weight:600;border:none;cursor:pointer;background:var(--c-surface2);color:var(--c-text2)">Custom</button>
      </div>
      <div id="cf-custom-${chartId}" style="display:none;align-items:center;gap:4px">
        <input type="date" id="cf-from-${chartId}" value="${monthAgo}" max="${today}" style="padding:3px 6px;font-size:11px;border:1px solid var(--c-border);border-radius:5px;background:var(--c-surface2);color:var(--c-text)">
        <span style="font-size:11px;color:var(--c-text2)">to</span>
        <input type="date" id="cf-to-${chartId}"   value="${today}"    max="${today}" style="padding:3px 6px;font-size:11px;border:1px solid var(--c-border);border-radius:5px;background:var(--c-surface2);color:var(--c-text)">
        <button onclick="cfApplyCustom('${chartId}')" style="padding:3px 10px;font-size:11px;font-weight:600;border:none;border-radius:5px;background:var(--c-primary);color:#fff;cursor:pointer">Apply</button>
      </div>
    </div>`;
}

window._cfMode = {};

function cfSetMode(btn, mode) {
  const chartId = btn.dataset.chart;
  window._cfMode[chartId] = mode;
  btn.closest('.chart-filter').querySelectorAll('.cf-btn').forEach(b => {
    const active = b === btn;
    b.style.background = active ? 'var(--c-primary)' : 'var(--c-surface2)';
    b.style.color = active ? '#fff' : 'var(--c-text2)';
  });
  const customRow = document.getElementById('cf-custom-' + chartId);
  customRow.style.display = (mode === 'custom') ? 'flex' : 'none';
  if (mode !== 'custom') cfLoadChart(chartId, mode, null, null);
}

function cfApplyCustom(chartId) {
  const from = document.getElementById('cf-from-' + chartId).value;
  const to   = document.getElementById('cf-to-'   + chartId).value;
  if (!from || !to || from > to) { alert('Please select a valid date range (from must be before or equal to to).'); return; }
  // Auto-pick grouping based on range length: <=90 days = day, <=730 days = month, else year
  const diffDays = Math.round((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
  const autoMode = diffDays <= 90 ? 'day' : diffDays <= 730 ? 'month' : 'year';
  cfLoadChart(chartId, autoMode, from, to);
}

async function cfLoadChart(chartId, mode, from, to) {
  const barWrap = document.getElementById('chart-bars-' + chartId);
  const titleEl = document.getElementById('chart-title-' + chartId);
  if (!barWrap) return;

  barWrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:100px;color:var(--c-text2);font-size:13px"><div class="spinner spin-dark" style="width:18px;height:18px;margin-right:8px"></div> Loading chart…</div>';

  try {
    const data = await API.getChartData(mode, from, to);
    const pts  = data.points || [];
    const maxV = Math.max(...pts.map(p => Math.max(p.revenue, p.expenses)), 1);

    if (titleEl) {
      const modeLabel = { day:'Day-wise', month:'Month-wise', year:'Year-wise', custom:'Custom Range' }[mode] || mode;
      const range = (from && to) ? ' (' + from + ' → ' + to + ')' : '';
      titleEl.textContent = 'Revenue vs Expenses — ' + modeLabel + range;
    }

    if (pts.length === 0) {
      barWrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:80px;color:var(--c-text2);font-size:13px">No data for this period</div>';
      return;
    }

    const scrollWrap = pts.length > 20;
    barWrap.style.overflowX = scrollWrap ? 'auto' : 'hidden';
    const smallFont = pts.length > 15 ? 'font-size:9px' : 'font-size:11px';

    (function(){
      const W=520, H=130, pad=10, n=pts.length;
      const xStep=(W-pad*2)/(n-1||1);
      function px(i){return pad+i*xStep;}
      function py(v){return H-pad-(v/maxV)*(H-pad*2);}
      const revPts=pts.map((p,i)=>px(i)+','+py(p.revenue)).join(' ');
      const expPts=pts.map((p,i)=>px(i)+','+py(p.expenses)).join(' ');
      const revArea=pts.map((p,i)=>px(i)+','+py(p.revenue)).join(' L ');
      const expArea=pts.map((p,i)=>px(i)+','+py(p.expenses)).join(' L ');
      const skip=Math.ceil(n/18);
      const labels=pts.map((p,i)=>i%skip===0?'<text x="'+px(i)+'" y="'+(H+4)+'" text-anchor="middle" font-size="'+(n>20?7.5:9)+'" fill="var(--c-text3)">'+p.label+'</text>':'').join('');
      const revDots=n<=40?pts.map((p,i)=>'<circle cx="'+px(i)+'" cy="'+py(p.revenue)+'" r="3" fill="var(--c-primary)" stroke="white" stroke-width="1.5"><title>Rev: '+fmt(p.revenue)+'</title></circle>').join(''):'';
      const expDots=n<=40?pts.map((p,i)=>'<circle cx="'+px(i)+'" cy="'+py(p.expenses)+'" r="3" fill="var(--c-red)" stroke="white" stroke-width="1.5" opacity=".8"><title>Exp: '+fmt(p.expenses)+'</title></circle>').join(''):'';
      barWrap.style.overflowX = scrollWrap ? 'auto' : 'hidden';
      barWrap.innerHTML='<svg viewBox="0 0 '+(scrollWrap?Math.max(W,n*28):W)+' '+(H+16)+'" style="width:100%;min-width:'+(scrollWrap?n*28:0)+'px;height:'+(H+20)+'px;overflow:visible">'+
        '<defs>'+
          '<linearGradient id="lgDashRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--c-primary)" stop-opacity=".2"/><stop offset="100%" stop-color="var(--c-primary)" stop-opacity="0"/></linearGradient>'+
          '<linearGradient id="lgDashExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--c-red)" stop-opacity=".15"/><stop offset="100%" stop-color="var(--c-red)" stop-opacity="0"/></linearGradient>'+
        '</defs>'+
        '<path d="M '+revArea+' L '+px(n-1)+','+(H-pad)+' L '+px(0)+','+(H-pad)+' Z" fill="url(#lgDashRev)"/>'+
        '<path d="M '+expArea+' L '+px(n-1)+','+(H-pad)+' L '+px(0)+','+(H-pad)+' Z" fill="url(#lgDashExp)"/>'+
        '<polyline points="'+revPts+'" fill="none" stroke="var(--c-primary)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>'+
        '<polyline points="'+expPts+'" fill="none" stroke="var(--c-red)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" opacity=".75"/>'+
        revDots+expDots+labels+
      '</svg>'+
      '<div style="display:flex;gap:16px;margin-top:6px">'+
        '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--c-text2)"><div style="width:22px;height:2px;background:var(--c-primary);border-radius:2px"></div>Revenue</div>'+
        '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--c-text2)"><div style="width:22px;height:2px;background:var(--c-red);border-radius:2px;opacity:.75"></div>Expenses</div>'+
      '</div>';
    })();
  } catch(e) {
    barWrap.innerHTML = '<div style="color:var(--c-red);font-size:13px;padding:10px">Failed to load chart data.</div>';
  }
}


// ── Main dashboard renderer ──
async function renderDashboard(el) {
  el.innerHTML = '<div class="loading-page"><div class="spinner spin-dark"></div> Loading dashboard\u2026</div>';
  const [summary, payments, invoices] = await Promise.all([
    API.getReportSummary(),
    API.getPayments(),
    API.getInvoices()
  ]);

  const totalRev    = summary.totalRevenue  || 0;
  const outstanding = summary.outstanding   || 0;
  const overdue     = summary.overdue       || 0;
  const totalExp    = summary.totalExpenses || 0;
  const net         = totalRev - totalExp;

  const expCats  = summary.expenseByCategory || [];
  const expTotal = expCats.reduce(function(a,c){return a+c.total;}, 0) || 1;
  const CAT_COLORS = ['#1a6be8','#0a8754','#d97706','#6b3fd4','#d63d3d'];

  const recentPay    = (payments || []).slice(0, 6);
  const overdueCount = (invoices || []).filter(function(i){return i.status==='overdue';}).length;
  const draftCount   = (invoices || []).filter(function(i){return i.status==='draft';}).length;

  const insights = [];
  if (overdueCount > 0) insights.push({ icon: '⚠️', text: overdueCount + ' invoice' + (overdueCount>1?'s':'') + ' overdue — collect ' + fmt(overdue) + ' ASAP.' });
  if (draftCount   > 0) insights.push({ icon: '📝', text: draftCount + ' draft invoice' + (draftCount>1?'s':'') + ' not sent yet.' });
  if (outstanding  > 0) insights.push({ icon: '💰', text: fmt(outstanding) + ' awaiting payment from customers.' });
  insights.push({ icon: '📊', text: 'Net profit: ' + fmt(net) + ' | Margin: ' + (totalRev>0?((net/totalRev)*100).toFixed(1):0) + '%' });

  el.innerHTML =
    '<div class="card" style="margin-bottom:20px"><div class="card-header"><div class="card-title">Quick Actions</div></div><div class="card-body" style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button class="btn btn-primary" onclick="navigateTo(\'invoices\');setTimeout(()=>openInvoiceForm(),200)">' + ICONS.plus + ' New Invoice</button>' +
      '<button class="btn btn-secondary" onclick="navigateTo(\'customers\');setTimeout(()=>openCustomerForm(),200)">' + ICONS.plus + ' Add Customer</button>' +
      '<button class="btn btn-secondary" onclick="navigateTo(\'expenses\');setTimeout(()=>openExpenseForm(),200)">' + ICONS.plus + ' Record Expense</button>' +
      '<button class="btn btn-secondary" onclick="navigateTo(\'vendors\');setTimeout(()=>openVendorForm(),200)">' + ICONS.plus + ' Add Vendor</button>' +
    '</div></div>' +

    '<div class="kpi-grid">' +
      '<div class="kpi-card green"><div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="kpi-label">Total Revenue</div><div class="kpi-value">' + fmt(totalRev) + '</div><div class="kpi-sub">From paid invoices</div></div>' +
      '<div class="kpi-card blue"><div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="kpi-label">Outstanding</div><div class="kpi-value">' + fmt(outstanding) + '</div><div class="kpi-sub">Awaiting payment</div></div>' +
      '<div class="kpi-card red"><div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="kpi-label">Overdue</div><div class="kpi-value">' + fmt(overdue) + '</div><div class="kpi-sub">' + overdueCount + ' invoice' + (overdueCount!==1?'s':'') + ' past due</div></div>' +
      '<div class="kpi-card orange"><div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div><div class="kpi-label">Total Expenses</div><div class="kpi-value">' + fmt(totalExp) + '</div><div class="kpi-sub">Net: ' + fmt(net) + '</div></div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px">' +
      '<div class="card">' +
        '<div class="card-header" style="flex-wrap:wrap;gap:8px;align-items:flex-start">' +
          '<div class="card-title" id="chart-title-dash" style="flex:1;min-width:140px">Revenue vs Expenses — Day-wise</div>' +
          chartFilterHTML('dash') +
        '</div>' +
        '<div class="card-body">' +
          '<div id="chart-bars-dash" style="height:140px"></div>' +
          '' +
        '</div>' +
      '</div>' +
      '<div class="card"><div class="card-header"><div class="card-title">Expense Breakdown</div></div><div class="card-body">' +
        (expCats.length === 0
          ? '<p style="color:var(--c-text2);font-size:13px">No expenses recorded</p>'
          : expCats.slice(0,6).map(function(c,i){
              return '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span style="color:var(--c-text2)">' + (EXP_CATS[c.category]||c.category) + '</span><span style="font-weight:600">' + ((c.total/expTotal)*100).toFixed(0) + '%</span></div><div class="progress-bar"><div class="progress-fill" style="width:' + (c.total/expTotal)*100 + '%;background:' + CAT_COLORS[i%CAT_COLORS.length] + '"></div></div></div>';
            }).join('')) +
      '</div></div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 2fr;gap:20px;margin-bottom:20px">' +
      '<div class="card" style="border-color:var(--c-primary);background:linear-gradient(135deg,#f0f5ff,#e8f0fd)">' +
        '<div class="card-header" style="border-color:rgba(26,107,232,.15)"><div class="card-title" style="color:var(--c-primary)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Business Insights</div></div>' +
        '<div class="card-body">' + insights.map(function(ins){ return '<div style="display:flex;gap:9px;margin-bottom:10px;font-size:13px"><span>' + ins.icon + '</span><span style="color:var(--c-text)">' + esc(ins.text) + '</span></div>'; }).join('') + '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header"><div class="card-title">Recent Payments</div><button class="btn btn-ghost btn-sm" onclick="navigateTo(\'payments\')">View all →</button></div>' +
        '<div class="card-body-p0">' +
          (recentPay.length === 0
            ? '<div style="padding:20px;color:var(--c-text2);font-size:13px">No payments yet</div>'
            : '<div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
              recentPay.map(function(p){ return '<tr><td><span class="inv-num-link" onclick="navigateTo(\'invoices\')">' + esc(p.invoice_number||'—') + '</span></td><td>' + esc(p.customer_name||'—') + '</td><td>' + fmtDate(p.date) + '</td><td style="text-transform:capitalize">' + (p.method||'').replace(/_/g,' ') + '</td><td style="text-align:right" class="amt-green">' + fmt(p.amount,p.currency) + '</td></tr>'; }).join('') +
              '</tbody></table></div>') +
        '</div>' +
      '</div>' +
    '</div>' +

    ((summary.topCustomers||[]).some(function(c){return c.revenue>0;}) ?
      '<div class="card"><div class="card-header"><div class="card-title">Top Customers by Revenue</div></div><div class="card-body" style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px">' +
      (summary.topCustomers||[]).filter(function(c){return c.revenue>0;}).slice(0,5).map(function(c,i){
        return '<div style="text-align:center;padding:14px;background:var(--c-surface2);border-radius:8px;border:1px solid var(--c-border)"><div style="width:36px;height:36px;border-radius:50%;background:var(--c-primary-lt);color:var(--c-primary);font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px">' + (c.name||'?')[0].toUpperCase() + '</div><div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.name) + '</div><div class="amt-green" style="font-size:12px;margin-top:2px">' + fmt(c.revenue) + '</div>' + (i===0?'<span class="badge badge-paid" style="margin-top:4px;font-size:10px">Top</span>':'') + '</div>';
      }).join('') +
      '</div></div>' : '') +

    '';

  // Load chart with default mode (day-wise)
  window._cfMode['dash'] = 'day';
  cfLoadChart('dash', 'day', null, null);
}