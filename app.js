// ===== DATA CACHE =====
let Cache = {
  packages: [],
  sales: [],
  invoices: [],
  expenses: [],
  guides: [],
  alerts: [],
  filters: { dateRange: '30', startDate: '', endDate: '', packageId: '' },
};
let currentSaleId = null;
let currentSaleData = null;

// ===== UTILITIES =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const currency = (n) => {
  if (isNaN(n) || n === null || n === undefined) return '$0';
  return (n < 0 ? '-$' : '$') + Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

function dateInRange(dateStr) {
  const f = Cache.filters;
  if (f.dateRange === 'all') return true;
  const d = new Date(dateStr);
  if (f.dateRange === 'custom') {
    if (f.startDate && d < new Date(f.startDate)) return false;
    if (f.endDate && d > new Date(f.endDate)) return false;
    return true;
  }
  const days = parseInt(f.dateRange);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}


function filteredSales() {
  const f = Cache.filters;
  return Cache.sales.filter(s => {
    const inDateRange = dateInRange(s.date);
    const inPackageRange = !f.packageId || s.package_id == f.packageId;
    return inDateRange && inPackageRange;
  });
}


function filteredExpenses() {
  const f = Cache.filters;
  return Cache.expenses.filter(e => {
    const inDateRange = dateInRange(e.date);
    const inPackageRange = !f.packageId || true; // Always true for expenses
    return inDateRange && inPackageRange;
  });
}

function filteredInvoices() {
  const f = Cache.filters;
  return Cache.invoices.filter(inv => {
    const inDateRange = dateInRange(inv.issue_date);
    const inPackageRange = !f.packageId || inv.sale_id && Cache.sales.find(s => s.id == inv.sale_id && s.package_id == f.packageId);
    return inDateRange && inPackageRange;
  });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ===== LOAD DATA FROM API =====
async function loadAllData() {
  Cache.packages = await apiClient.get('/packages');
  Cache.sales = await apiClient.get('/sales');
  Cache.invoices = await apiClient.get('/invoices');
  Cache.expenses = await apiClient.get('/expenses');
  Cache.guides = await apiClient.get('/guides');
  console.log('Data loaded from API - packages:', Cache.packages.length);
  console.log('Sample package:', Cache.packages[0]);
}

// ===== NAVIGATION =====
function initNav() {
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      $$('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.page').forEach(p => p.classList.remove('active'));
      $(`#page-${page}`).classList.add('active');
      refreshPage(page);
    });
  });
  $('#menuToggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
    $('#overlay').classList.toggle('show');
  });
  $('#overlay').addEventListener('click', closeMobileMenu);
}

function closeMobileMenu() {
  $('#sidebar').classList.remove('open');
  $('#overlay').classList.remove('show');
}

// ===== NOTIFICATION SYSTEM =====
function generateAlerts() {
  Cache.alerts = [];
  const today = new Date();

  // Overdue invoices
  Cache.invoices.filter(inv => inv.status === 'overdue' || (inv.status === 'unpaid' && new Date(inv.due_date) < today)).forEach(inv => {
    Cache.alerts.push({
      type: 'red',
      title: 'Overdue Invoice',
      desc: `Invoice ${inv.id} from ${inv.customer} is overdue`,
      time: formatDate(inv.due_date)
    });
  });

  // High expense warning
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();
  const monthlyExp = Cache.expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).reduce((s, e) => s + e.amount, 0);

  if (monthlyExp > 10000) {
    Cache.alerts.push({
      type: 'yellow',
      title: 'High Monthly Expenses',
      desc: `Expenses this month (${currency(monthlyExp)}) exceed $10k threshold`,
      time: 'This month'
    });
  }

  // Pending payments
  Cache.invoices.filter(inv => inv.status === 'unpaid').forEach(inv => {
    Cache.alerts.push({
      type: 'yellow',
      title: 'Payment Pending',
      desc: `${inv.customer} owes ${currency(inv.amount)}`,
      time: formatDate(inv.issue_date)
    });
  });

  renderNotifications();
}

function renderNotifications() {
  const badge = $('#notifBadge');
  const count = Cache.alerts.length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
  if (count > 0) badge.classList.add('pulse');
  else badge.classList.remove('pulse');

  const list = $('#notifList');
  if (count === 0) {
    list.innerHTML = '<div class="notif-empty">No notifications</div>';
    return;
  }
  list.innerHTML = Cache.alerts.map(a => `
    <div class="notif-item">
      <div class="notif-dot ${a.type}"></div>
      <div class="notif-text">
        <div class="notif-title">${a.title}</div>
        <div class="notif-desc">${a.desc}</div>
        <div class="notif-time">${a.time}</div>
      </div>
    </div>
  `).join('');
}

function initNotifications() {
  const bell = $('#notifBell');
  const panel = $('#notifPanel');
  const overlay = $('#overlay');

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !bell.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  $('#notifClear').addEventListener('click', () => {
    Cache.alerts = [];
    renderNotifications();
  });
}

// ===== GLOBAL FILTERS =====
function initGlobalFilters() {
  const dateRange = $('#globalDateRange');
  const customGroup = $('#customDateGroup');
  const customGroupTo = $('#customDateGroupTo');

  dateRange.addEventListener('change', () => {
    if (dateRange.value === 'custom') {
      customGroup.style.display = 'flex';
      customGroupTo.style.display = 'flex';
    } else {
      customGroup.style.display = 'none';
      customGroupTo.style.display = 'none';
    }
  });


  $('#btnApplyGlobalFilter').addEventListener('click', () => {
    const activePage = $('.nav-btn.active')?.dataset.page;
    applyGlobalFilters();
    if (activePage) {
      updatePageFilterVisibility(activePage);
      refreshPageContent(activePage);
    }
  });

  $('#btnResetGlobalFilter').addEventListener('click', () => {
    Cache.filters = { dateRange: '30', startDate: '', endDate: '', packageId: '' };
    $('#globalDateRange').value = '30';
    $('#globalDateFrom').value = '';
    $('#globalDateTo').value = '';
    $('#globalPackageFilter').value = '';
    const activePage = $('.nav-btn.active')?.dataset.page;
    if (activePage) {
      updatePageFilterVisibility(activePage);
      refreshPageContent(activePage);
    } else {
      refreshAll();
    }
  });

  populateGlobalPackageFilter();
}

function applyGlobalFilters() {
  Cache.filters.dateRange = $('#globalDateRange').value;
  Cache.filters.startDate = $('#globalDateFrom').value;
  Cache.filters.endDate = $('#globalDateTo').value;
  Cache.filters.packageId = $('#globalPackageFilter').value;
}

function populateGlobalPackageFilter() {
  const sel = $('#globalPackageFilter');
  sel.innerHTML = '<option value="">All Packages</option>' +
    Cache.packages.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

// ===== DASHBOARD STATS =====
function updateStats() {
  const sales = filteredSales();
  const expenses = filteredExpenses();
  const allInvoices = Cache.invoices || [];
  const invoices = filteredInvoices();

  const paidInvoices = allInvoices.filter(i => i.status === 'paid');
  const totalRevenue = paidInvoices.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalExpensesAmount = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpensesAmount;
  const outstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const packagesSold = sales.length;
  const cashBalance = totalRevenue - totalExpensesAmount;

  animateValue('statRevenue', totalRevenue, true);
  animateValue('statExpenses', totalExpensesAmount, true);
  animateValue('statProfit', netProfit, true);
  animateValue('statOutstanding', outstanding, true);
  animateValue('statSold', packagesSold, false);
  animateValue('statBalance', cashBalance, true);

  const profitEl = $('#statProfit');
  profitEl.classList.remove('positive', 'negative');
  profitEl.classList.add(netProfit >= 0 ? 'positive' : 'negative');
}

function animateValue(id, target, isCurrency) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent.replace(/[$,\-]/g, '')) || 0;
  const duration = 600;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.round(start + (target - start) * progress);
    el.textContent = isCurrency ? currency(value) : value;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ===== REVENUE CHART =====
let revenueChart = null;
function renderRevenueChart(months = 6) {
  const labels = [];
  const data = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthRevenue = Cache.invoices.filter(inv => {
      const invDate = new Date(inv.paid_date || inv.issue_date);
      return inv.status === 'paid' && invDate >= monthStart && invDate <= monthEnd;
    }).reduce((sum, inv) => sum + inv.amount, 0);
    data.push(monthRevenue);
    data.push(monthSales);
  }
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;
  if (revenueChart) revenueChart.destroy();
  revenueChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue (USD)',
        data,
        backgroundColor: 'rgba(26, 58, 92, 0.75)',
        borderColor: '#1a3a5c',
        borderWidth: 1,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: '#2a5a8c',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => currency(c.parsed.y) },
          backgroundColor: '#1a3a5c',
          cornerRadius: 8,
          padding: 12,
          titleFont: { family: 'Inter' },
          bodyFont: { family: 'Inter' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k', font: { family: 'Inter', size: 12 }, color: '#94a3b8' },
          grid: { color: '#f1f5f9' }
        },
        x: { ticks: { font: { family: 'Inter', size: 12 }, color: '#94a3b8' }, grid: { display: false } }
      },
      animation: { duration: 800, easing: 'easeOutQuart' }
    }
  });
}

function initChartFilters() {
  $$('.filter-btn[data-months]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.filter-btn[data-months]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderRevenueChart(parseInt(btn.dataset.months));
    });
  });
}

// ===== REVENUE BY PACKAGE =====
let revByPkgChart = null;
function renderRevenueByPackage() {
  const sales = filteredSales();
  const pkgRevenue = {};
  sales.forEach(s => {
    const pkg = Cache.packages.find(p => p.id === s.package_id);
    if (pkg) pkgRevenue[pkg.name] = (pkgRevenue[pkg.name] || 0) + s.price;
  });
  const sorted = Object.entries(pkgRevenue).sort((a, b) => b[1] - a[1]);
  const ctx = document.getElementById('revenueByPackageChart');
  if (!ctx) return;
  if (revByPkgChart) revByPkgChart.destroy();
  const colors = ['#1a3a5c', '#2a5a8c', '#3a7abc', '#0ea5e9', '#7dd3fc', '#bae6fd'];
  revByPkgChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: sorted.map(([name]) => name.length > 20 ? name.substring(0, 18) + '…' : name),
      datasets: [{
        data: sorted.map(([, rev]) => rev),
        backgroundColor: sorted.map((_, i) => colors[i % colors.length]),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => currency(c.parsed.x) }, backgroundColor: '#1a3a5c', cornerRadius: 8 }
      },
      scales: {
        x: { beginAtZero: true, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k', font: { family: 'Inter', size: 11 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
        y: { ticks: { font: { family: 'Inter', size: 11 }, color: '#475569' }, grid: { display: false } }
      },
      animation: { duration: 800 }
    }
  });
}

// ===== REVENUE BY DESTINATION =====
let revByDestChart = null;
function renderRevenueByDestination() {
  const sales = filteredSales();
  const destRevenue = {};
  sales.forEach(s => {
    const pkg = Cache.packages.find(p => p.id === s.package_id);
    if (pkg) destRevenue[pkg.destination] = (destRevenue[pkg.destination] || 0) + s.price;
  });
  const sorted = Object.entries(destRevenue).sort((a, b) => b[1] - a[1]);
  const ctx = document.getElementById('revenueByDestChart');
  if (!ctx) return;
  if (revByDestChart) revByDestChart.destroy();
  const colors = ['#1a3a5c', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#7c3aed'];
  revByDestChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: sorted.map(([dest]) => dest),
      datasets: [{ data: sorted.map(([, rev]) => rev), backgroundColor: colors.slice(0, sorted.length), borderWidth: 0, borderRadius: 4 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 }, padding: 16, usePointStyle: true } },
        tooltip: { callbacks: { label: c => c.label + ': ' + currency(c.parsed) }, backgroundColor: '#1a3a5c', cornerRadius: 8 }
      }
    }
  });
}

// ===== TRAVEL INSIGHTS =====
function renderTravelInsights() {
  const sales = filteredSales();
  const expenses = filteredExpenses();

  const pkgRevenue = {};
  sales.forEach(s => {
    if (!pkgRevenue[s.package_id]) pkgRevenue[s.package_id] = 0;
    pkgRevenue[s.package_id] += s.price;
  });

  const totalRev = Object.values(pkgRevenue).reduce((a, b) => a + b, 0) || 1;
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);

  const pkgProfits = Cache.packages.map(p => ({
    name: p.name,
    destination: p.destination,
    revenue: pkgRevenue[p.id] || 0,
    cost: ((pkgRevenue[p.id] || 0) / totalRev) * totalExp,
    profit: (pkgRevenue[p.id] || 0) - (((pkgRevenue[p.id] || 0) / totalRev) * totalExp)
  })).sort((a, b) => b.profit - a.profit);

  const destProfit = {};
  pkgProfits.forEach(p => {
    destProfit[p.destination] = (destProfit[p.destination] || 0) + p.profit;
  });
  const topDest = Object.entries(destProfit).sort((a, b) => b[1] - a[1]);

  const guideEarnings = Cache.guides.map(g => ({
    name: g.name,
    earnings: (Cache.sales.filter(s => g.assigned_packages && g.assigned_packages.includes(String(s.package_id))).reduce((s, p) => s + p.price, 0) * g.commission / 100)
  })).sort((a, b) => b.earnings - a.earnings);

  const container = $('#travelInsights');
  if (!container) return;

  const bestPkg = pkgProfits[0];
  const bestDest = topDest[0];
  const bestGuide = guideEarnings[0];
  const costPerTour = pkgProfits.length > 0 ? Math.round(pkgProfits.reduce((s, p) => s + p.cost, 0) / pkgProfits.filter(p => p.revenue > 0).length || 1) : 0;

  container.innerHTML = `
    <div class="insight-card">
      <div class="insight-label">Most Profitable Package</div>
      <div class="insight-value">${bestPkg ? bestPkg.name : 'N/A'}</div>
      <div class="insight-sub">${bestPkg ? 'Profit: ' + currency(bestPkg.profit) : ''}</div>
    </div>
    <div class="insight-card">
      <div class="insight-label">Most Profitable Destination</div>
      <div class="insight-value">${bestDest ? bestDest[0] : 'N/A'}</div>
      <div class="insight-sub">${bestDest ? 'Total Profit: ' + currency(bestDest[1]) : ''}</div>
    </div>
    <div class="insight-card">
      <div class="insight-label">Avg. Cost per Tour</div>
      <div class="insight-value">${currency(costPerTour)}</div>
      <div class="insight-sub">Estimated from total expenses</div>
    </div>
    <div class="insight-card">
      <div class="insight-label">Top Earning Guide</div>
      <div class="insight-value">${bestGuide ? bestGuide.name : 'N/A'}</div>
      <div class="insight-sub">${bestGuide ? 'Commission: ' + currency(bestGuide.earnings) : ''}</div>
    </div>
  `;
}

// ===== PACKAGE PERFORMANCE =====
function renderPerformance() {
  const sales = filteredSales();
  const salesCount = {};
  sales.forEach(s => { salesCount[s.package_id] = (salesCount[s.package_id] || 0) + 1; });
  const ranked = Cache.packages.map(p => ({ ...p, count: salesCount[p.id] || 0 })).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...ranked.map(r => r.count), 1);
  const container = $('#performanceList');
  container.innerHTML = ranked.map((pkg, i) => `
    <div class="perf-item">
      <div class="perf-rank">${i + 1}</div>
      <div class="perf-info">
        <div class="perf-name">${pkg.name}</div>
        <div class="perf-bar-track"><div class="perf-bar-fill" style="width:${(pkg.count / maxCount) * 100}%"></div></div>
      </div>
      <div class="perf-pct">${pkg.count} sales</div>
    </div>
  `).join('');
}

// ===== PACKAGES TABLE =====
function renderPackages() {
  const dest = $('#filterDestination').value;
  const status = $('#filterStatus').value;
  const minP = parseFloat($('#filterMinPrice').value) || 0;
  const maxP = parseFloat($('#filterMaxPrice').value) || Infinity;
  const filtered = Cache.packages.filter(p =>
    (!dest || p.destination === dest) &&
    (!status || p.status === status) &&
    p.price >= minP && p.price <= maxP
  );
  const tbody = $('#packagesBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No packages found</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(p => `<tr>
    <td><strong>${p.name}</strong></td><td>${p.destination}</td><td>${currency(p.price)}</td>
    <td>${p.duration} days</td><td>${p.slots} slots</td>
    <td><span class="badge badge-${p.status.replace(' ', '-')}">${p.status}</span></td>
    <td>
      <button class="action-btn edit" title="Edit" onclick="editPackage(${p.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button class="action-btn delete" title="Delete" onclick="deletePackage(${p.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg></button>
    </td></tr>`).join('');
}

function updateDestinationFilter() {
  const sel = $('#filterDestination');
  const current = sel.value;
  const dests = [...new Set(Cache.packages.map(p => p.destination))].sort();
  sel.innerHTML = '<option value="">All</option>' + dests.map(d => `<option value="${d}">${d}</option>`).join('');
  sel.value = current;
}

function initPackageFilters() {
  ['filterDestination', 'filterStatus', 'filterMinPrice', 'filterMaxPrice'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderPackages);
  });

  const filterDestination = $('#filterDestination');
  const filterStatus = $('#filterStatus');
  const filterMinPrice = $('#filterMinPrice');
  const filterMaxPrice = $('#filterMaxPrice');
  if (filterDestination) filterDestination.value = '';
  if (filterStatus) filterStatus.value = '';
  if (filterMinPrice) filterMinPrice.value = '';
  if (filterMaxPrice) filterMaxPrice.value = '';
  renderPackages();
}

// ===== PACKAGE MODAL =====
function openPackageModal(pkg = null) {
  const overlay = $('#modalOverlay');
  hideAllModals();
  $('#packageModal').style.display = '';
  overlay.classList.add('open');
  if (pkg) {
    $('#pkgName').value = pkg.name;
    $('#pkgDest').value = pkg.destination;
    $('#pkgPrice').value = pkg.price;
    $('#pkgDuration').value = pkg.duration;
    $('#pkgSlots').value = pkg.slots;
    $('#pkgStatus').value = pkg.status;
    $('#packageForm').dataset.id = pkg.id;
  } else {
    $('#packageForm').reset();
    delete $('#packageForm').dataset.id;
  }
}

function closeModal() {
  $('#modalOverlay').classList.remove('open');
  hideAllModals();
}

function hideAllModals() {
  ['packageModal', 'saleModal', 'invoiceModal', 'expenseModal', 'guideModal'].forEach(id => {
    const el = $(`#${id}`);
    if (el) el.style.display = 'none';
  });
}

function initPackageModal() {
  $('#btnAddPackage').addEventListener('click', () => openPackageModal());
  $('#modalClose').addEventListener('click', closeModal);
  $('#btnCancelPkg').addEventListener('click', closeModal);
  $('#modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
  $('#packageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#packageForm').dataset.id;
    const data = {
      name: $('#pkgName').value,
      destination: $('#pkgDest').value,
      price: parseFloat($('#pkgPrice').value),
      duration: parseInt($('#pkgDuration').value),
      slots: parseInt($('#pkgSlots').value),
      status: $('#pkgStatus').value
    };
    if (id) {
      await apiClient.put(`/packages/${id}`, data);
    } else {
      await apiClient.post('/packages', data);
    }
    closeModal();
    await loadAllData();
    renderPackages();
  });
}

window.editPackage = (id) => {
  const pkg = Cache.packages.find(p => p.id === id);
  if (pkg) openPackageModal(pkg);
};

window.deletePackage = async (id) => {
  if (confirm('Delete this package?')) {
    await apiClient.delete(`/packages/${id}`);
    await loadAllData();
    renderPackages();
  }
};

// ===== SALES TABLE =====
function renderSales() {
  const tbody = $('#salesBody');
  const sales = filteredSales();
  const sorted = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No sales found</td></tr>';
    return;
  }
  tbody.innerHTML = sorted.map(s => {
    const pkg = Cache.packages.find(p => p.id === s.package_id);
    return `<tr>
      <td>#${s.id}</td>
      <td>${s.buyer}</td>
      <td>${pkg ? pkg.name : 'Unknown'}</td>
      <td>${formatDate(s.date)}</td>
      <td>${currency(s.price)}</td>
      <td>
        <button class="action-btn invoice" title="Generate Invoice" onclick="generateInvoiceFromSale(${s.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </button>
        <button class="action-btn delete" title="Delete" onclick="deleteSale(${s.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg></button>
      </td>
    </tr>`;
  }).join('');
}

window.generateInvoiceFromSale = async (saleId) => {
  const sale = Cache.sales.find(s => s.id === saleId);
  if (!sale) return;
  const pkg = Cache.packages.find(p => p.id === sale.package_id);
  currentSaleId = saleId;
  currentSaleData = sale;
  openInvoiceModal();
  $('#invoiceCustomer').value = sale.buyer;
  $('#invoicePackage').value = pkg ? pkg.name : 'Unknown';
  $('#invoiceAmount').value = sale.price;
  $('#invoiceIssueDate').value = new Date().toISOString().split('T')[0];
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  $('#invoiceDueDate').value = dueDate.toISOString().split('T')[0];
};

// ===== SALE MODAL =====
function openSaleModal() {
  const overlay = $('#modalOverlay');
  hideAllModals();
  $('#saleModal').style.display = '';
  overlay.classList.add('open');
  const sel = $('#salePackage');
  sel.innerHTML = Cache.packages.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} — ${currency(p.price)}</option>`).join('');
  $('#saleForm').reset();
  $('#saleDate').value = new Date().toISOString().split('T')[0];
  if (Cache.packages.length > 0) sel.dispatchEvent(new Event('change'));
  sel.addEventListener('change', () => {
    const opt = sel.options[sel.selectedIndex];
    $('#salePrice').value = opt.dataset.price;
  });
}

function initSaleModal() {
  $('#btnAddSale').addEventListener('click', openSaleModal);
  $('#saleModalClose').addEventListener('click', closeModal);
  $('#btnCancelSale').addEventListener('click', closeModal);
  $('#saleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      package_id: parseInt($('#salePackage').value),
      buyer: $('#saleBuyer').value,
      date: $('#saleDate').value,
      price: parseFloat($('#salePrice').value)
    };
    await apiClient.post('/sales', data);
    closeModal();
    await loadAllData();
    renderSales();
    refreshAll();
  });
}

window.deleteSale = async (id) => {
  if (confirm('Delete this sale?')) {
    await apiClient.delete(`/sales/${id}`);
    await loadAllData();
    renderSales();
  }
};

// ===== INVOICES =====
function renderInvoiceStats() {
  const invoices = filteredInvoices();
  const total = invoices.length;
  const paid = invoices.filter(i => i.status === 'paid').length;
  const unpaid = invoices.filter(i => i.status === 'unpaid').length;
  const overdue = invoices.filter(i => i.status === 'overdue').length;
  $('#statTotalInvoices').textContent = total;
  $('#statPaidInvoices').textContent = paid;
  $('#statUnpaidInvoices').textContent = unpaid;
  $('#statOverdueInvoices').textContent = overdue;
}

function renderInvoicesTable() {
  const invoices = filteredInvoices();
  const sorted = [...invoices].sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
  const tbody = $('#invoicesBody');
  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No invoices found</td></tr>';
    return;
  }
  tbody.innerHTML = sorted.map(inv => `<tr class="${inv.status === 'overdue' ? 'overdue-row' : ''}">
    <td>${inv.id}</td>
    <td>${inv.sale_id || 'N/A'}</td>
    <td>${inv.customer}</td>
    <td>${inv.package_name}</td>
    <td>${currency(inv.amount)}</td>
    <td>${formatDate(inv.issue_date)}</td>
    <td>${formatDate(inv.due_date)}</td>
    <td><span class="badge badge-${inv.status}">${inv.status}</span></td>
    <td>
      ${inv.status !== 'paid' ? `<button class="action-btn pay" title="Mark Paid" onclick="markInvoicePaid(${inv.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></button>` : ''}
      <button class="action-btn delete" title="Delete" onclick="deleteInvoice(${inv.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg></button>
    </td>
  </tr>`).join('');
}

function renderAccountsReceivable() {
  const unpaid = Cache.invoices.filter(i => i.status !== 'paid');
  const totalPending = unpaid.reduce((s, i) => s + i.amount, 0);
  const overdueCount = unpaid.filter(i => i.status === 'overdue').length;

  $('#arSummary').innerHTML = `
    <div class="ar-stat"><span class="ar-stat-label">Total Pending</span><span class="ar-stat-value">${currency(totalPending)}</span></div>
    <div class="ar-stat"><span class="ar-stat-label">Overdue Invoices</span><span class="ar-stat-value danger">${overdueCount}</span></div>
    <div class="ar-stat"><span class="ar-stat-label">Customers Owing</span><span class="ar-stat-value">${unpaid.length}</span></div>
  `;

  const tbody = $('#arBody');
  if (unpaid.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No outstanding invoices</td></tr>';
    return;
  }
  const sorted = [...unpaid].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  tbody.innerHTML = sorted.map(inv => `<tr class="${inv.status === 'overdue' ? 'overdue-row' : ''}">
    <td>${inv.customer}</td>
    <td>${inv.sale_id || 'N/A'}</td>
    <td>${currency(inv.amount)}</td>
    <td>${formatDate(inv.due_date)}</td>
    <td><span class="badge badge-${inv.status}">${inv.status}</span></td>
    <td>
      <button class="action-btn delete" title="Delete Invoice" onclick="deleteInvoice(${inv.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg></button>
    </td>
  </tr>`).join('');
}

window.markInvoicePaid = async (id) => {
  await apiClient.patch(`/invoices/${id}/mark-paid`, {});
  await loadAllData();
  renderInvoicesTable();
  renderAccountsReceivable();
  refreshAll();
};



window.deleteInvoice = async (id) => {
  if (confirm('Delete this invoice?')) {
    await apiClient.delete(`/invoices/${id}`);
    await loadAllData();
    renderInvoicesTable();
    renderAccountsReceivable();
  }
};

function initInvoiceModal() {
  $('#btnCreateInvoice').addEventListener('click', () => openInvoiceModal());
  $('#invoiceModalClose').addEventListener('click', closeModal);
  $('#btnCancelInvoice').addEventListener('click', closeModal);
  $('#invoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      sale_id: currentSaleId || 0,
      customer: $('#invoiceCustomer').value,
      package_name: $('#invoicePackage').value,
      amount: parseFloat($('#invoiceAmount').value),
      issue_date: $('#invoiceIssueDate').value,
      due_date: $('#invoiceDueDate').value,
      status: 'unpaid'
    };
    currentSaleId = null;
    currentSaleData = null;
    await apiClient.post('/invoices', data);
    closeModal();
    await loadAllData();
    renderInvoicesTable();
  });
}

function openInvoiceModal() {
  hideAllModals();
  $('#invoiceModal').style.display = '';
  $('#modalOverlay').classList.add('open');
  $('#invoiceForm').reset();
  $('#invoiceIssueDate').value = new Date().toISOString().split('T')[0];
  if (currentSaleId) {
    const sale = currentSaleData;
    const pkg = Cache.packages.find(p => p.id === sale.package_id);
    $('#invoiceCustomer').value = sale.buyer;
    $('#invoicePackage').value = pkg ? pkg.name : 'Unknown';
    $('#invoiceAmount').value = sale.price;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    $('#invoiceDueDate').value = dueDate.toISOString().split('T')[0];
  }
}

// ===== EXPENSES =====
function renderExpenseStats() {
  const expenses = filteredExpenses();
  const byCategory = { transport: 0, hotel: 0, salary: 0, other: 0 };
  expenses.forEach(e => {
    const amt = Number(e.amount) || 0;
    if (byCategory.hasOwnProperty(e.category)) byCategory[e.category] += amt;
    else byCategory.other += amt;
  });
  animateValue('statTransport', byCategory.transport, true);
  animateValue('statHotels', byCategory.hotel, true);
  animateValue('statSalaries', byCategory.salary, true);
  animateValue('statOtherExp', byCategory.other, true);
}

function renderExpensesTable() {
  const expenses = filteredExpenses();
  const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  const tbody = $('#expensesBody');
  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No expenses found</td></tr>';
    return;
  }
  tbody.innerHTML = sorted.map(e => `<tr>
    <td>${formatDate(e.date)}</td>
    <td><span class="badge badge-${e.category}">${e.category}</span></td>
    <td>${e.description}</td><td>${currency(e.amount)}</td>
    <td style="font-size:.82rem;color:var(--text-secondary)">${e.notes || '—'}</td>
    <td>
      <button class="action-btn edit" title="Edit" onclick="editExpense(${e.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button class="action-btn delete" title="Delete" onclick="deleteExpense(${e.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg></button>
    </td>
  </tr>`).join('');
}

let expBreakdownChart = null;
function renderExpenseBreakdownChart() {
  const expenses = filteredExpenses();
  const byCategory = {};
  expenses.forEach(e => {
    const amt = Number(e.amount) || 0;
    byCategory[e.category] = (byCategory[e.category] || 0) + amt;
  });
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const ctx = document.getElementById('expenseBreakdownChart');
  if (!ctx) return;
  if (expBreakdownChart) expBreakdownChart.destroy();
  const colors = { transport: '#2563eb', hotel: '#db2777', salary: '#059669', marketing: '#7c3aed', equipment: '#d97706', other: '#64748b' };
  expBreakdownChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: entries.map(([cat]) => cat.charAt(0).toUpperCase() + cat.slice(1)),
      datasets: [{ data: entries.map(([, amt]) => Number(amt) || 0), backgroundColor: entries.map(([cat]) => colors[cat] || '#94a3b8'), borderWidth: 0, borderRadius: 4 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 }, padding: 14, usePointStyle: true } },
        tooltip: { callbacks: { label: c => c.label + ': ' + currency(c.parsed) }, backgroundColor: '#1a3a5c', cornerRadius: 8 }
      }
    }
  });
}

let monthlyExpChart = null;
function renderMonthlyExpenseChart() {
  const expenses = filteredExpenses();
  const months = 6;
  const labels = [];
  const data = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthExp = expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate >= monthStart && eDate <= monthEnd;
    }).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    data.push(monthExp);
  }
  const ctx = document.getElementById('monthlyExpenseChart');
  if (!ctx) return;
  if (monthlyExpChart) monthlyExpChart.destroy();
  monthlyExpChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Expenses',
        data,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,.1)',
        fill: true,
        tension: .4,
        pointRadius: 5,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => currency(c.parsed.y) }, backgroundColor: '#1a3a5c', cornerRadius: 8 }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k', font: { family: 'Inter', size: 11 }, color: '#94a3b8' },
          grid: { color: '#f1f5f9' }
        },
        x: { ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }, grid: { display: false } }
      }
    }
  });
}

function initExpenseModal() {
  $('#btnAddExpense').addEventListener('click', () => openExpenseModal());
  $('#expenseModalClose').addEventListener('click', closeModal);
  $('#btnCancelExp').addEventListener('click', closeModal);
  $('#expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#expenseForm').dataset.id;
    const data = {
      date: $('#expDate').value,
      category: $('#expCategory').value,
      description: $('#expDescription').value,
      amount: parseFloat($('#expAmount').value),
      notes: $('#expNotes').value
    };
    if (id) {
      await apiClient.put(`/expenses/${id}`, data);
    } else {
      await apiClient.post('/expenses', data);
    }
    closeModal();
    await loadAllData();
    renderExpensesTable();
  });
}

function openExpenseModal(expense = null) {
  hideAllModals();
  $('#expenseModal').style.display = '';
  $('#modalOverlay').classList.add('open');
  if (expense) {
    $('#expDate').value = expense.date;
    $('#expCategory').value = expense.category;
    $('#expDescription').value = expense.description;
    $('#expAmount').value = expense.amount;
    $('#expNotes').value = expense.notes || '';
    $('#expenseForm').dataset.id = expense.id;
  } else {
    $('#expenseForm').reset();
    $('#expDate').value = new Date().toISOString().split('T')[0];
    delete $('#expenseForm').dataset.id;
  }
}

window.editExpense = (id) => {
  const e = Cache.expenses.find(ex => ex.id === id);
  if (e) openExpenseModal(e);
};

window.deleteExpense = async (id) => {
  if (confirm('Delete this expense?')) {
    await apiClient.delete(`/expenses/${id}`);
    await loadAllData();
    renderExpensesTable();
  }
};

// ===== GUIDES =====
function renderGuideStats() {
  const totalGuides = Cache.guides.length;
  const totalCommission = Cache.guides.reduce((s, g) => s + parseFloat(g.commission), 0);
  document.getElementById('statTotalGuides').textContent = totalGuides;
  document.getElementById('statAvgCommission').textContent = totalGuides > 0 ? (totalCommission / totalGuides).toFixed(1) + '%' : '0%';
}

function renderGuidesTable() {
  const tbody = $('#guidesBody');
  if (Cache.guides.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No guides found</td></tr>';
    return;
  }
  tbody.innerHTML = Cache.guides.map(g => `<tr>
    <td>${g.name}</td>
    <td>${g.email || '—'}</td>
    <td>${g.phone || '—'}</td>
    <td>${g.commission}%</td>
    <td>${g.assigned_packages || '—'}</td>
    <td>$0</td>
    <td>
      <button class="action-btn edit" title="Edit" onclick="editGuide(${g.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button class="action-btn delete" title="Delete" onclick="deleteGuide(${g.id})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg></button>
    </td>
  </tr>`).join('');
}

function initGuideModal() {
  $('#btnAddGuide').addEventListener('click', () => openGuideModal());
  $('#guideModalClose').addEventListener('click', closeModal);
  $('#btnCancelGuide').addEventListener('click', closeModal);
  $('#guideForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#guideForm').dataset.id;
    const data = {
      name: $('#guideName').value,
      email: $('#guideEmail').value,
      phone: $('#guidePhone').value,
      commission: parseFloat($('#guideCommission').value),
      assigned_packages: $('#guidePackages').value
    };
    if (id) {
      await apiClient.put(`/guides/${id}`, data);
    } else {
      await apiClient.post('/guides', data);
    }
    closeModal();
    await loadAllData();
    renderGuidesTable();
  });
}

function openGuideModal(guide = null) {
  hideAllModals();
  $('#guideModal').style.display = 'block';
  $('#modalOverlay').classList.add('open');
  if (guide) {
    $('#guideName').value = guide.name;
    $('#guideEmail').value = guide.email || '';
    $('#guidePhone').value = guide.phone || '';
    $('#guideCommission').value = guide.commission;
    $('#guidePackages').value = guide.assigned_packages || '';
    $('#guideForm').dataset.id = guide.id;
  } else {
    $('#guideForm').reset();
    delete $('#guideForm').dataset.id;
  }
}
window.editGuide = (id) => {
  const g = Cache.guides.find(guide => guide.id === id);
  if (g) openGuideModal(g);
};

window.deleteGuide = async (id) => {
  if (confirm('Delete this guide?')) {
    await apiClient.delete(`/guides/${id}`);
    await loadAllData();
    renderGuidesTable();
  }
};
// ===== GUIDE EARNINGS & TOURS CHARTS =====
let guideEarningsChart = null;
function renderGuideEarningsChart() {
  const guideEarnings = Cache.guides.map(g => ({
    name: g.name,
    earnings: (Cache.sales.filter(s => g.assigned_packages && g.assigned_packages.includes(String(s.package_id))).reduce((s, p) => s + p.price, 0) * g.commission / 100)
  })).sort((a, b) => b.earnings - a.earnings).slice(0, 5);

  const ctx = document.getElementById('guideEarningsChart');
  if (!ctx) return;
  if (guideEarningsChart) guideEarningsChart.destroy();

  guideEarningsChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: guideEarnings.map(g => g.name),
      datasets: [{
        label: 'Earnings (USD)',
        data: guideEarnings.map(g => g.earnings),
        backgroundColor: 'rgba(26, 58, 92, 0.75)',
        borderColor: '#1a3a5c',
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => currency(c.parsed.x) }, backgroundColor: '#1a3a5c', cornerRadius: 8 }
      },
      scales: {
        x: { beginAtZero: true, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k', font: { family: 'Inter', size: 11 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
        y: { ticks: { font: { family: 'Inter', size: 11 }, color: '#475569' }, grid: { display: false } }
      }
    }
  });
}

let guideToursChart = null;
function renderGuideToursChart() {
  const guideTours = Cache.guides.map(g => ({
    name: g.name,
    tours: Cache.sales.filter(s => g.assigned_packages && g.assigned_packages.includes(String(s.package_id))).length
  })).sort((a, b) => b.tours - a.tours).slice(0, 5);

  const ctx = document.getElementById('guideToursChart');
  if (!ctx) return;
  if (guideToursChart) guideToursChart.destroy();

  guideToursChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: guideTours.map(g => g.name),
      datasets: [{
        data: guideTours.map(g => g.tours),
        backgroundColor: ['#1a3a5c', '#2a5a8c', '#3a7abc', '#0ea5e9', '#7dd3fc'],
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: c => c.label + ': ' + c.parsed + ' tours' }, backgroundColor: '#1a3a5c', cornerRadius: 8 }
      }
    }
  });
}

// ===== CASH FLOW =====
function renderCashFlowStats() {
  const paidInvoices = Cache.invoices.filter(i => i.status === 'paid');
  const totalInflow = paidInvoices.reduce((s, i) => s + i.amount, 0);
  const totalOutflow = Cache.expenses.reduce((s, e) => s + e.amount, 0);
  const netBalance = totalInflow - totalOutflow;
  animateValue('statInflow', totalInflow, true);
  animateValue('statOutflow', totalOutflow, true);
  animateValue('statNetBalance', netBalance, true);
}

let cashFlowChartObj = null;
function renderCashFlowChart() {
  const months = 6;
  const labels = [];
  const inflowData = [];
  const outflowData = [];
  const balanceData = [];
  const now = new Date();
  let runningBalance = 0;

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));

    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    const inflow = Cache.invoices.filter(inv => {
      const invDate = new Date(inv.paid_date || inv.issue_date);
      return invDate >= monthStart && invDate <= monthEnd && inv.status === 'paid';
    }).reduce((sum, inv) => sum + inv.amount, 0);

    const outflow = Cache.expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate >= monthStart && eDate <= monthEnd;
    }).reduce((sum, e) => sum + e.amount, 0);

    inflowData.push(inflow);
    outflowData.push(outflow);
    runningBalance += inflow - outflow;
    balanceData.push(runningBalance);
  }

  const ctx = document.getElementById('cashFlowChart');
  if (!ctx) return;
  if (cashFlowChartObj) cashFlowChartObj.destroy();

  cashFlowChartObj = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Inflow', data: inflowData, backgroundColor: 'rgba(16,185,129,.7)', borderRadius: 6, borderSkipped: false, order: 2 },
        { label: 'Outflow', data: outflowData, backgroundColor: 'rgba(239,68,68,.7)', borderRadius: 6, borderSkipped: false, order: 2 },
        { label: 'Balance', data: balanceData, type: 'line', borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,.1)', fill: true, tension: .4, pointRadius: 5, pointBackgroundColor: '#7c3aed', pointBorderColor: '#fff', pointBorderWidth: 2, order: 1, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 }, padding: 16, usePointStyle: true } },
        tooltip: { callbacks: { label: c => c.dataset.label + ': ' + currency(c.parsed.y) }, backgroundColor: '#1a3a5c', cornerRadius: 8 }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k', font: { family: 'Inter', size: 11 }, color: '#94a3b8' },
          grid: { color: '#f1f5f9' }
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k', font: { family: 'Inter', size: 11 }, color: '#7c3aed' },
          grid: { display: false }
        },
        x: { ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }, grid: { display: false } }
      },
      animation: { duration: 800 }
    }
  });
}

// ===== REFRESH ALL =====
function refreshAll() {
  updateStats();
  renderRevenueChart();
  renderRevenueByPackage();
  renderRevenueByDestination();
  renderTravelInsights();
  renderPerformance();
  generateAlerts();
}


function updatePageFilterVisibility(page) {
  if (page === 'packages' || page === 'guides') {
    $('.global-filter-bar').style.display = 'none';
    return;
  }
  $('.global-filter-bar').style.display = 'flex';
  const pkgGroup = $('#packageFilterGroup');
  if (pkgGroup) {
    pkgGroup.style.display = (page === 'expenses') ? 'none' : 'flex';
  }
}

function refreshPageContent(page) {
  if (page === 'dashboard') {
    refreshAll();
  } else if (page === 'packages') {
    updateDestinationFilter();
    renderPackages();
  } else if (page === 'sales') {
    renderSales();
  } else if (page === 'invoices') {
    renderInvoiceStats();
    renderInvoicesTable();
    renderAccountsReceivable();
  } else if (page === 'expenses') {
    renderExpenseStats();
    renderExpensesTable();
    renderExpenseBreakdownChart();
    renderMonthlyExpenseChart();
  } else if (page === 'guides') {
    renderGuideStats();
    renderGuidesTable();
    renderGuideEarningsChart();
    renderGuideToursChart();
  } else if (page === 'cashflow') {
    renderCashFlowStats();
    renderCashFlowChart();
  }
}

function refreshPage(page) {
  updatePageFilterVisibility(page);
  refreshPageContent(page);
}


// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log('App starting...');

  // Load data
  await loadAllData();

  // Initialize components
  initNav();
  initGlobalFilters();
  initNotifications();
  initPackageFilters();
  initPackageModal();
  initSaleModal();
  initInvoiceModal();
  initExpenseModal();
  initGuideModal();
  initChartFilters();

  // Initial render - show dashboard, load data first
  await loadAllData();
  const dashboardBtn = $('#nav-dashboard');
  if (dashboardBtn) {
    dashboardBtn.click();
  }
});