// js/pages/reports.js

async function renderReports(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div> Loading reports…</div>`;
  document.getElementById('topbar-actions').innerHTML = '';

  const summary = await API.getReportSummary();

  const totalRev    = summary.totalRevenue   || 0;
  const totalExp    = summary.totalExpenses  || 0;
  const net         = totalRev - totalExp;
  const outstanding = summary.outstanding    || 0;
  const overdue     = summary.overdue        || 0;
  const invStatuses = summary.invoicesByStatus   || [];
  const topCust     = summary.topCustomers       || [];
  const expCats     = summary.expenseByCategory  || [];

  // 12-month data
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const rev = (summary.monthlyRevenue  || []).find(m => m.month === key)?.revenue  || 0;
    const exp = (summary.monthlyExpenses || []).find(m => m.month === key)?.expenses || 0;
    months.push({ label, rev, exp });
  }
  const maxM = Math.max(...months.map(m => Math.max(m.rev, m.exp)), 1);
  const CAT_COLORS = ['#1a6be8','#0a8754','#d97706','#6b3fd4','#d63d3d','#06b6d4'];

  // Store for download function
  window._reportData = { summary, months, maxM, CAT_COLORS, net, totalRev, totalExp, outstanding, overdue, invStatuses, topCust, expCats, now };

  // Download button
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary" onclick="downloadFullReport()" style="display:flex;align-items:center;gap:7px">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Download Excel Report
    </button>`;

  el.innerHTML = `
    <div id="report-screen">
      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:22px">
        <div class="kpi-card green">
          <div class="kpi-label">Total Revenue</div>
          <div class="kpi-value">${fmt(totalRev)}</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-label">Total Expenses</div>
          <div class="kpi-value">${fmt(totalExp)}</div>
        </div>
        <div class="kpi-card ${net >= 0 ? 'green' : 'red'}">
          <div class="kpi-label">Net Profit / Loss</div>
          <div class="kpi-value">${fmt(net)}</div>
          <div class="kpi-sub">Margin: ${totalRev > 0 ? ((net/totalRev)*100).toFixed(1) : 0}%</div>
        </div>
        <div class="kpi-card blue">
          <div class="kpi-label">Total Receivables</div>
          <div class="kpi-value">${fmt(outstanding + overdue)}</div>
          <div class="kpi-sub">Overdue: <span class="amt-red">${fmt(overdue)}</span></div>
        </div>
      </div>

      <!-- Bar chart with filter -->
      <div style="margin-bottom:22px">
        <div class="card">
          <div class="card-header" style="flex-wrap:wrap;gap:8px;align-items:flex-start">
            <div class="card-title" id="chart-title-rpt" style="flex:1;min-width:160px">Revenue vs Expenses — Month-wise</div>
            ${chartFilterHTML('rpt')}
          </div>
          <div class="card-body">
            <div id="chart-bars-rpt" style="height:140px"></div>
            <div style="display:flex;gap:20px;margin-top:12px">
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--c-text2)"><div style="width:12px;height:12px;background:var(--c-primary);border-radius:2px;opacity:.8"></div>Revenue</div>
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--c-text2)"><div style="width:12px;height:12px;background:var(--c-red);border-radius:2px;opacity:.55"></div>Expenses</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail grid -->
      <div class="report-grid">
        <div class="card">
          <div class="card-header"><div class="card-title">Invoice Summary</div></div>
          <div class="card-body">
            ${['draft','sent','paid','overdue','cancelled'].map(status => {
              const row = invStatuses.find(r => r.status === status) || { count: 0, total: 0 };
              return `<div class="stat-row">
                <span class="stat-lbl">${statusBadge(status)}</span>
                <span class="stat-val">${row.count} invoice${row.count !== 1 ? 's' : ''} — ${fmt(row.total)}</span>
              </div>`;
            }).join('')}
            <div class="stat-row" style="border-top:2px solid var(--c-border);margin-top:6px;padding-top:8px">
              <span style="font-weight:700">Total Invoiced</span>
              <span style="font-weight:700">${invStatuses.reduce((a,r)=>a+r.count,0)} — ${fmt(invStatuses.reduce((a,r)=>a+r.total,0))}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Top Customers by Revenue</div></div>
          <div class="card-body">
            ${topCust.filter(c=>c.revenue>0).length === 0
              ? '<p style="color:var(--c-text2);font-size:13px">No revenue data yet</p>'
              : topCust.filter(c=>c.revenue>0).map((c,i) => `
                <div class="stat-row">
                  <span class="stat-lbl" style="display:flex;align-items:center;gap:8px">
                    <div style="width:26px;height:26px;border-radius:50%;background:var(--c-primary-lt);color:var(--c-primary);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(c.name||'?')[0].toUpperCase()}</div>
                    ${esc(c.name)}${i===0?` <span class="badge badge-paid" style="font-size:9px">Top</span>`:''}
                  </span>
                  <span class="stat-val amt-green">${fmt(c.revenue)}</span>
                </div>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Expense by Category</div></div>
          <div class="card-body">
            ${expCats.length === 0
              ? '<p style="color:var(--c-text2);font-size:13px">No expenses yet</p>'
              : (() => {
                  const tot = expCats.reduce((a,c)=>a+c.total,0)||1;
                  const legendHTML = expCats.map((c,i) =>
                    '<div style="display:flex;align-items:center;gap:5px;font-size:11px">' +
                    '<div style="width:10px;height:10px;border-radius:50%;background:' + CAT_COLORS[i%CAT_COLORS.length] + ';flex-shrink:0"></div>' +
                    '<span style="color:var(--c-text2)">' + (EXP_CATS[c.category]||c.category) + '</span>' +
                    '</div>'
                  ).join('');
                  const barsHTML = expCats.map((c,i) =>
                    '<div style="margin-bottom:10px">' +
                    '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px">' +
                    '<span style="color:var(--c-text2)">' + (EXP_CATS[c.category]||c.category) + '</span>' +
                    '<span style="font-weight:600">' + fmt(c.total) + ' (' + ((c.total/tot)*100).toFixed(0) + '%)</span>' +
                    '</div>' +
                    '<div class="progress-bar">' +
                    '<div class="progress-fill" style="width:' + (c.total/tot)*100 + '%;background:' + CAT_COLORS[i%CAT_COLORS.length] + '"></div>' +
                    '</div></div>'
                  ).join('');
                  return '<div style="display:flex;justify-content:center;margin-bottom:16px">' +
                    '<canvas id="exp-pie-chart" width="200" height="200" style="max-width:200px;max-height:200px"></canvas>' +
                    '</div>' +
                    '<div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:14px">' + legendHTML + '</div>' +
                    barsHTML;
                })()}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Profit &amp; Loss Summary</div></div>
          <div class="card-body">
            <div class="stat-row"><span class="stat-lbl">Gross Revenue (Paid Invoices)</span><span class="stat-val amt-green">${fmt(totalRev)}</span></div>
            <div class="stat-row"><span class="stat-lbl">Total Expenses</span><span class="stat-val amt-red">${fmt(totalExp)}</span></div>
            <div class="stat-row" style="border-top:2px solid var(--c-border);margin-top:6px;padding-top:8px">
              <span style="font-weight:700">Net ${net>=0?'Profit':'Loss'}</span>
              <span style="font-weight:700;font-size:16px" class="${net>=0?'amt-green':'amt-red'}">${fmt(Math.abs(net))}</span>
            </div>
            <div class="stat-row"><span class="stat-lbl">Profit Margin</span><span class="stat-val">${totalRev>0?((net/totalRev)*100).toFixed(1):0}%</span></div>
            <div class="stat-row"><span class="stat-lbl">Outstanding Receivables</span><span class="stat-val amt-blue">${fmt(outstanding)}</span></div>
            <div class="stat-row"><span class="stat-lbl">Overdue Receivables</span><span class="stat-val amt-red">${fmt(overdue)}</span></div>
            <div class="stat-row"><span class="stat-lbl">Total Customers</span><span class="stat-val">${summary.customerCount||0}</span></div>
            <div class="stat-row"><span class="stat-lbl">Total Invoices</span><span class="stat-val">${summary.invoiceCount||0}</span></div>
          </div>
        </div>
      </div>
    </div>`;

  // Initialise chart with default mode (month-wise) after DOM is ready
  window._cfMode['rpt'] = 'month';
  // Set the month button as active visually
  setTimeout(function() {
    var btns = document.querySelectorAll('#cf-rpt .cf-btn');
    btns.forEach(function(b) {
      var active = b.dataset.mode === 'month';
      b.style.background = active ? 'var(--c-primary)' : 'var(--c-surface2)';
      b.style.color = active ? '#fff' : 'var(--c-text2)';
    });
    cfLoadChart('rpt', 'month', null, null);
    // Draw pie chart for expense by category
    _drawExpPieChart();
  }, 0);
}

function _drawExpPieChart() {
  const canvas = document.getElementById('exp-pie-chart');
  if (!canvas || !window._reportData) return;
  const { expCats, CAT_COLORS } = window._reportData;
  if (!expCats || expCats.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 8;
  const total = expCats.reduce((a, c) => a + c.total, 0) || 1;
  let startAngle = -Math.PI / 2;
  // Draw slices
  expCats.forEach((c, i) => {
    const slice = (c.total / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = CAT_COLORS[i % CAT_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // % label inside slice if big enough
    if (slice > 0.3) {
      const midAngle = startAngle + slice / 2;
      const lx = cx + (r * 0.65) * Math.cos(midAngle);
      const ly = cy + (r * 0.65) * Math.sin(midAngle);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(((c.total / total) * 100).toFixed(0) + '%', lx, ly);
    }
    startAngle += slice;
  });
  // Center donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.42, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  // Center label
  ctx.fillStyle = '#1a6be8';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(expCats.length + ' Categories', cx, cy);
}

// ============================================================
//  FULL-PAGE DOWNLOAD
//  Builds a complete, self-contained HTML document with ALL
//  report sections rendered top-to-bottom and opens it in a
//  new window for Save as PDF (covers every section, multi-page).
// ============================================================
function downloadFullReport() {
  if (!window._reportData) { alert('Report not loaded yet. Please wait.'); return; }

  const { summary, months, net, totalRev, totalExp,
          outstanding, overdue, invStatuses, topCust, expCats, now } = window._reportData;

  const orgName   = (typeof APP !== 'undefined' && APP.org && APP.org.name) ? APP.org.name : 'BillFlow Pro';
  const printDate = now.toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });

  const EXP_LABELS = {
    travel:'Travel', food:'Food & Beverage', office_supplies:'Office Supplies',
    utilities:'Utilities', software:'Software & Subscriptions', marketing:'Marketing',
    payroll:'Payroll', rent:'Rent', equipment:'Equipment',
    professional_services:'Professional Services', insurance:'Insurance',
    taxes:'Taxes & Fees', maintenance:'Maintenance', other:'Other',
  };

  function _doExport() {
    const XLSX = window.XLSX;

    // ── Helper: style a cell ──
    const cs = (v, s) => ({ v, s, t: typeof v === 'number' ? 'n' : 's' });

    // Style presets
    const TITLE  = { font:{bold:true,sz:14,color:{rgb:'1a6be8'}}, fill:{fgColor:{rgb:'EEF4FD'}}, alignment:{horizontal:'left'} };
    const META   = { font:{sz:10,color:{rgb:'5a6478'}}, alignment:{horizontal:'left'} };
    const SEC    = { font:{bold:true,sz:10,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1a6be8'}}, alignment:{horizontal:'left'} };
    const HDR    = { font:{bold:true,sz:10,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1a6be8'}}, alignment:{horizontal:'center'} };
    const HDR_L  = { font:{bold:true,sz:10,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1a6be8'}}, alignment:{horizontal:'left'} };
    const LBL    = { font:{sz:10,color:{rgb:'5a6478'}}, alignment:{horizontal:'left'} };
    const VAL    = { font:{bold:true,sz:10}, alignment:{horizontal:'right'} };
    const VAL_G  = { font:{bold:true,sz:10,color:{rgb:'0a8754'}}, alignment:{horizontal:'right'} };
    const VAL_R  = { font:{bold:true,sz:10,color:{rgb:'d63d3d'}}, alignment:{horizontal:'right'} };
    const VAL_B  = { font:{bold:true,sz:10,color:{rgb:'1a6be8'}}, alignment:{horizontal:'right'} };
    const TOT    = { font:{bold:true,sz:10}, fill:{fgColor:{rgb:'EEF4FD'}}, alignment:{horizontal:'right'} };
    const TOT_L  = { font:{bold:true,sz:10}, fill:{fgColor:{rgb:'EEF4FD'}}, alignment:{horizontal:'left'} };
    const TOT_G  = { font:{bold:true,sz:10,color:{rgb:'0a8754'}}, fill:{fgColor:{rgb:'EEF4FD'}}, alignment:{horizontal:'right'} };
    const TOT_R  = { font:{bold:true,sz:10,color:{rgb:'d63d3d'}}, fill:{fgColor:{rgb:'EEF4FD'}}, alignment:{horizontal:'right'} };
    const ROW_A  = { font:{sz:10}, fill:{fgColor:{rgb:'F9FAFB'}}, alignment:{horizontal:'left'} };
    const ROW_B  = { font:{sz:10}, fill:{fgColor:{rgb:'FFFFFF'}}, alignment:{horizontal:'left'} };
    const NUM_A  = { font:{sz:10}, fill:{fgColor:{rgb:'F9FAFB'}}, alignment:{horizontal:'right'} };
    const NUM_B  = { font:{sz:10}, fill:{fgColor:{rgb:'FFFFFF'}}, alignment:{horizontal:'right'} };
    const NUM_AG = { font:{sz:10,color:{rgb:'0a8754'}}, fill:{fgColor:{rgb:'F9FAFB'}}, alignment:{horizontal:'right'} };
    const NUM_BG = { font:{sz:10,color:{rgb:'0a8754'}}, fill:{fgColor:{rgb:'FFFFFF'}}, alignment:{horizontal:'right'} };
    const NUM_AR = { font:{sz:10,color:{rgb:'d63d3d'}}, fill:{fgColor:{rgb:'F9FAFB'}}, alignment:{horizontal:'right'} };
    const NUM_BR = { font:{sz:10,color:{rgb:'d63d3d'}}, fill:{fgColor:{rgb:'FFFFFF'}}, alignment:{horizontal:'right'} };
    const EMPTY  = { font:{sz:10}, fill:{fgColor:{rgb:'FFFFFF'}} };

    // Currency format string
    const INR = '"₹"#,##0.00';

    // Helper to apply currency number format
    const inr = (v, s) => ({ v: v||0, t:'n', s, z: INR });

    // ================================================================
    //  SHEET 1 — FULL REPORT (mirrors the page top to bottom)
    // ================================================================
    const expTot = expCats.reduce((a,c) => a + c.total, 0) || 1;
    const invTotalCount = invStatuses.reduce((a,r) => a + r.count, 0);
    const invTotalAmt   = invStatuses.reduce((a,r) => a + r.total, 0);
    const margin = totalRev > 0 ? +((net/totalRev)*100).toFixed(1) : 0;

    // We build rows as arrays of cells
    const R = []; // rows array

    // ── Header ──
    R.push([cs(orgName + ' — Financial Report', TITLE)]);
    R.push([cs('Generated: ' + printDate + '   |   Period: Last 12 Months', META)]);
    R.push([cs('', EMPTY)]);

    // ── Section 1: KPIs ──
    R.push([cs('KEY PERFORMANCE INDICATORS', SEC), cs('',SEC), cs('',SEC), cs('',SEC)]);
    R.push([cs('Total Revenue', HDR_L), cs('Total Expenses', HDR_L), cs('Net ' + (net>=0?'Profit':'Loss'), HDR_L), cs('Total Receivables', HDR_L)]);
    R.push([
      inr(totalRev, VAL_G),
      inr(totalExp, VAL_R),
      inr(Math.abs(net), net>=0 ? VAL_G : VAL_R),
      inr(outstanding + overdue, VAL_B),
    ]);
    R.push([
      cs('From paid invoices', LBL),
      cs('All categories', LBL),
      cs('Margin: ' + margin + '%', LBL),
      cs('Overdue: ' + (overdue||0).toLocaleString('en-IN',{style:'currency',currency:'INR'}), LBL),
    ]);
    R.push([cs('', EMPTY)]);

    // ── Section 2: Revenue vs Expenses — Monthly (chart data) ──
    R.push([cs('REVENUE vs EXPENSES — LAST 12 MONTHS', SEC), cs('',SEC), cs('',SEC), cs('',SEC)]);
    R.push([cs('Month', HDR_L), cs('Revenue (₹)', HDR), cs('Expenses (₹)', HDR), cs('Net (₹)', HDR)]);
    months.forEach((m, i) => {
      const even = i % 2 === 0;
      const netM = m.rev - m.exp;
      R.push([
        cs(m.label, even ? ROW_A : ROW_B),
        inr(m.rev,  even ? NUM_AG : NUM_BG),
        inr(m.exp,  even ? NUM_AR : NUM_BR),
        inr(netM,   netM>=0 ? (even?NUM_AG:NUM_BG) : (even?NUM_AR:NUM_BR)),
      ]);
    });
    R.push([
      cs('Total (12 months)', TOT_L),
      inr(months.reduce((a,m)=>a+m.rev,0), TOT_G),
      inr(months.reduce((a,m)=>a+m.exp,0), TOT_R),
      inr(months.reduce((a,m)=>a+(m.rev-m.exp),0), net>=0?TOT_G:TOT_R),
    ]);
    R.push([cs('', EMPTY)]);

    // ── Section 3: Invoice Summary ──
    R.push([cs('INVOICE SUMMARY', SEC), cs('',SEC), cs('',SEC)]);
    R.push([cs('Status', HDR_L), cs('Count', HDR), cs('Total Amount (₹)', HDR)]);
    ['draft','sent','paid','overdue','cancelled'].forEach((status, i) => {
      const row = invStatuses.find(r => r.status === status) || { count:0, total:0 };
      const even = i % 2 === 0;
      R.push([
        cs(status.charAt(0).toUpperCase()+status.slice(1), even?ROW_A:ROW_B),
        cs(row.count, even?NUM_A:NUM_B),
        inr(row.total, even?NUM_A:NUM_B),
      ]);
    });
    R.push([cs('Grand Total', TOT_L), cs(invTotalCount, TOT), inr(invTotalAmt, TOT)]);
    R.push([cs('', EMPTY)]);

    // ── Section 4: Top Customers ──
    R.push([cs('TOP CUSTOMERS BY REVENUE', SEC), cs('',SEC), cs('',SEC)]);
    R.push([cs('#', HDR), cs('Customer Name', HDR_L), cs('Revenue (₹)', HDR)]);
    const custFiltered = topCust.filter(c => c.revenue > 0);
    if (custFiltered.length === 0) {
      R.push([cs('—', ROW_A), cs('No revenue data yet', ROW_A), inr(0, ROW_A)]);
    } else {
      custFiltered.forEach((c, i) => {
        const even = i % 2 === 0;
        R.push([cs(i+1, even?NUM_A:NUM_B), cs(c.name||(c.name||''), even?ROW_A:ROW_B), inr(c.revenue, even?NUM_AG:NUM_BG)]);
      });
    }
    R.push([cs('', EMPTY)]);

    // ── Section 5: Expense by Category ──
    R.push([cs('EXPENSE BREAKDOWN BY CATEGORY', SEC), cs('',SEC), cs('',SEC)]);
    R.push([cs('Category', HDR_L), cs('Amount (₹)', HDR), cs('Share (%)', HDR)]);
    if (expCats.length === 0) {
      R.push([cs('No expenses recorded yet', ROW_A), inr(0, ROW_A), cs('0%', ROW_A)]);
    } else {
      expCats.forEach((c, i) => {
        const even = i % 2 === 0;
        const pct  = +((c.total/expTot)*100).toFixed(1);
        R.push([cs(EXP_LABELS[c.category]||c.category, even?ROW_A:ROW_B), inr(c.total, even?NUM_AR:NUM_BR), cs(pct+'%', even?NUM_A:NUM_B)]);
      });
      R.push([cs('Total', TOT_L), inr(totalExp, TOT_R), cs('100%', TOT)]);
    }
    R.push([cs('', EMPTY)]);

    // ── Section 6: P&L Summary ──
    R.push([cs('PROFIT & LOSS SUMMARY', SEC), cs('',SEC)]);
    R.push([cs('Item', HDR_L), cs('Amount (₹)', HDR)]);
    const plRows = [
      ['Gross Revenue (Paid Invoices)', totalRev,    VAL_G],
      ['Total Operating Expenses',      totalExp,    VAL_R],
      ['Net ' + (net>=0?'Profit':'Loss'), Math.abs(net), net>=0?VAL_G:VAL_R],
      ['Profit Margin',                  margin+'%', VAL],
      ['Outstanding Receivables',        outstanding, VAL_B],
      ['Overdue Receivables',            overdue,    VAL_R],
      ['Total Customers',                summary.customerCount||0, VAL],
      ['Total Invoices Raised',          summary.invoiceCount||0, VAL],
    ];
    plRows.forEach(([lbl, val, style], i) => {
      const even = i % 2 === 0;
      const isAmt = typeof val === 'number' && !lbl.includes('Customers') && !lbl.includes('Invoices') && !lbl.includes('Margin');
      R.push([cs(lbl, even?ROW_A:ROW_B), isAmt ? inr(val, style) : cs(val, style)]);
    });
    R.push([cs('', EMPTY)]);

    // ── Footer ──
    R.push([cs(orgName + ' — Confidential Financial Report  |  Generated by BillFlow Pro', META)]);

    // ── Build worksheet ──
    const ws1 = XLSX.utils.aoa_to_sheet(R);
    ws1['!cols'] = [{ wch: 36 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

    // Merge title row across 4 cols
    ws1['!merges'] = [
      { s:{r:0,c:0}, e:{r:0,c:3} },  // title
      { s:{r:1,c:0}, e:{r:1,c:3} },  // meta
      { s:{r:3,c:0}, e:{r:3,c:3} },  // KPI section header
      { s:{r:8,c:0}, e:{r:8,c:3} },  // monthly section header
    ];

    // ================================================================
    //  SHEET 2 — Monthly Chart Data (clean table for charting in Excel)
    // ================================================================
    const chartRows = [
      ['Month', 'Revenue', 'Expenses', 'Net'],
      ...months.map(m => [m.label, m.rev, m.exp, m.rev - m.exp]),
      [],
      ['Total', months.reduce((a,m)=>a+m.rev,0), months.reduce((a,m)=>a+m.exp,0), months.reduce((a,m)=>a+(m.rev-m.exp),0)],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(chartRows);
    ws2['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];

    // ── Build workbook ──
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Full Report');
    XLSX.utils.book_append_sheet(wb, ws2, 'Monthly Chart Data');

    const fileName = `Financial_Report_${orgName.replace(/\s+/g,'_')}_${now.toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // Load SheetJS (with styles support) from CDN if not present
  if (window.XLSX) {
    _doExport();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = _doExport;
    script.onerror = () => alert('Failed to load Excel library. Please check your internet connection.');
    document.head.appendChild(script);
  }

}