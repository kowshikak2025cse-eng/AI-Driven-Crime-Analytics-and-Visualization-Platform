// data.js — shared data layer
const CrimeData = (() => {
  let _records = [];

  async function load() {
    if (_records.length) return _records;
    // Try multiple paths to support opening from any location
    const paths = ['data/crimes.json', '../data/crimes.json', './data/crimes.json'];
    for (const path of paths) {
      try {
        const res = await fetch(path);
        if (res.ok) { _records = await res.json(); return _records; }
      } catch { /* try next */ }
    }
    console.error('Could not load crimes.json from any path');
    _records = [];
    return _records;
  }

  function all() { return _records; }

  function filter({ district, crimeType, year, category, status, dateFrom, dateTo, fir, station } = {}) {
    return _records.filter(r => {
      if (district && district !== 'all' && r.District !== district) return false;
      if (crimeType && crimeType !== 'all' && r.Crime_Type !== crimeType) return false;
      if (year && year !== 'all' && r.Year !== +year) return false;
      if (category && category !== 'all' && r.Crime_Category !== category) return false;
      if (status && status !== 'all' && r.Status !== status) return false;
      if (dateFrom && r.Date < dateFrom) return false;
      if (dateTo && r.Date > dateTo) return false;
      if (fir && !r.FIR_Number.toLowerCase().includes(fir.toLowerCase())) return false;
      if (station && !r.Police_Station.toLowerCase().includes(station.toLowerCase())) return false;
      return true;
    });
  }

  function groupBy(records, key) {
    return records.reduce((acc, r) => {
      const k = r[key];
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
  }

  function countBy(records, key) {
    return groupBy(records, key);
  }

  function districts() { return [...new Set(_records.map(r => r.District))].sort(); }
  function crimeTypes() { return [...new Set(_records.map(r => r.Crime_Type))].sort(); }
  function categories() { return [...new Set(_records.map(r => r.Crime_Category))].sort(); }
  function years() { return [...new Set(_records.map(r => r.Year))].sort(); }
  function statuses() { return [...new Set(_records.map(r => r.Status))].sort(); }

  function monthlyCount(records) {
    const months = Array(12).fill(0);
    records.forEach(r => {
      const m = parseInt(r.Date.split('-')[1]) - 1;
      if (m >= 0 && m < 12) months[m]++;
    });
    return months;
  }

  function yearlyCount(records) {
    return groupBy(records, 'Year');
  }

  function arrestRate(records) {
    if (!records.length) return 0;
    return Math.round((records.filter(r => r.Arrest_Made === 'Yes').length / records.length) * 100);
  }

  function resolutionRate(records) {
    if (!records.length) return 0;
    const resolved = records.filter(r => r.Status === 'Closed' || r.Status === 'Chargesheeted').length;
    return Math.round((resolved / records.length) * 100);
  }

  // Linear regression prediction
  function predict(districtName, crimeTypeName, targetYear) {
    const subset = _records.filter(r =>
      r.District === districtName && r.Crime_Type === crimeTypeName
    );
    const byYear = yearlyCount(subset);
    const knownYears = Object.keys(byYear).map(Number).sort();
    if (knownYears.length < 2) {
      const avg = knownYears.length === 1 ? byYear[knownYears[0]] : 5;
      return Math.max(1, Math.round(avg * (1 + (targetYear - 2025) * 0.05)));
    }
    // least squares
    const n = knownYears.length;
    const sumX = knownYears.reduce((a, b) => a + b, 0);
    const sumY = knownYears.reduce((a, y) => a + byYear[y], 0);
    const sumXY = knownYears.reduce((a, y) => a + y * byYear[y], 0);
    const sumX2 = knownYears.reduce((a, y) => a + y * y, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return Math.max(1, Math.round(slope * targetYear + intercept));
  }

  return { load, all, filter, groupBy, countBy, districts, crimeTypes, categories, years, statuses, monthlyCount, yearlyCount, arrestRate, resolutionRate, predict };
})();

// Chart.js default config
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
}

const CHART_COLORS = ['#4f8ef7','#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6','#f97316','#84cc16','#6366f1'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function makeChart(id, type, labels, datasets, options = {}) {
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  if (ctx._chartInstance) ctx._chartInstance.destroy();
  const chart = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 12 }, boxWidth: 12, padding: 16 } },
        tooltip: {
          backgroundColor: '#1e293b',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: type !== 'pie' && type !== 'doughnut' ? {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } }
      } : undefined,
      ...options
    }
  });
  ctx._chartInstance = chart;
  return chart;
}

function buildSidebar(activePage) {
  const user = (typeof Auth !== 'undefined') ? Auth.currentUser() : null;
  const roleColors = { 'Super Admin':'#ef4444','District Admin':'#f59e0b','Analyst':'#4f8ef7','Viewer':'#10b981' };
  const roleColor  = user ? (roleColors[user.role] || '#4f8ef7') : '#4f8ef7';
  const nav = [
    { href: 'index.html',      icon: '🏠', label: 'Dashboard' },
    { href: 'prediction.html', icon: '🔮', label: 'Crime Prediction' },
    { href: 'hotspots.html',   icon: '🗺️', label: 'Crime Hotspots' },
    { href: 'analytics.html',  icon: '📊', label: 'Analytics' },
    { href: 'insights.html',   icon: '🤖', label: 'AI Insights' },
    { href: 'search.html',     icon: '🔍', label: 'Search' },
    { href: 'reports.html',    icon: '📄', label: 'Reports' },
    { href: 'admin.html',      icon: '⚙️', label: 'Admin' },
  ];
  const userBlock = user ? `
  <div style="margin:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;display:flex;align-items:center;gap:10px">
    <div style="width:38px;height:38px;border-radius:50%;background:${roleColor}22;color:${roleColor};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${user.avatar}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.name}</div>
      <div style="font-size:10px;color:${roleColor};margin-top:2px">${user.role}</div>
    </div>
  </div>` : '';
  return `
  <div class="sidebar-logo">
    <div class="logo-icon">🛡️</div>
    <div class="logo-text">CrimeAnalytics<span>Karnataka Police Intelligence</span></div>
  </div>
  ${userBlock}
  <nav class="sidebar-nav">
    <div class="nav-section-title">Main Menu</div>
    ${nav.map(n => `<a href="${n.href}" class="nav-item ${activePage === n.href ? 'active' : ''}"><span class="nav-icon">${n.icon}</span>${n.label}</a>`).join('')}
    <div class="nav-section-title" style="margin-top:8px">Account</div>
    <a href="login.html" class="nav-item" onclick="event.preventDefault();Auth.logout()"><span class="nav-icon">🚪</span>Logout</a>
  </nav>
  <div class="sidebar-footer">© 2025 Karnataka Police<br>Crime Intelligence Unit</div>`;
}

function buildHeader(title, subtitle = '') {
  const user = (typeof Auth !== 'undefined') ? Auth.currentUser() : null;
  const roleColors = { 'Super Admin':'#ef4444','District Admin':'#f59e0b','Analyst':'#4f8ef7','Viewer':'#10b981' };
  const roleColor  = user ? (roleColors[user.role] || '#4f8ef7') : '#4f8ef7';
  return `
  <button class="hamburger" onclick="toggleSidebar()">☰</button>
  <div class="header-left">
    <div>
      <div class="header-title">${title}</div>
      ${subtitle ? `<div class="header-subtitle">${subtitle}</div>` : ''}
    </div>
  </div>
  <div class="header-right">
    <div class="live-badge"><div class="status-dot"></div>Live</div>
    <button class="header-btn" onclick="window.print()">🖨️ Print</button>
    ${user ? `
    <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:6px 12px">
      <div style="width:32px;height:32px;border-radius:50%;background:${roleColor}22;color:${roleColor};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${user.avatar}</div>
      <div style="display:none" class="user-meta-desktop">
        <div style="font-size:13px;font-weight:600;color:#e2e8f0">${user.name}</div>
        <div style="font-size:10px;color:#64748b">${user.role}</div>
      </div>
      <button class="header-btn" onclick="Auth.logout()" style="padding:5px 10px;font-size:12px;margin:0;border:none">🚪 Logout</button>
    </div>` : ''}
  </div>`;
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('open');
}

function statusBadge(status) {
  const map = { 'Closed': 'badge-green', 'Under Investigation': 'badge-orange', 'Chargesheeted': 'badge-blue', 'Pending Trial': 'badge-purple' };
  return `<span class="badge ${map[status] || 'badge-blue'}">${status}</span>`;
}

function arrestBadge(v) {
  return `<span class="badge ${v === 'Yes' ? 'badge-green' : 'badge-red'}">${v}</span>`;
}

function populateSelect(id, options, allLabel = 'All') {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<option value="all">${allLabel}</option>` + options.map(o => `<option value="${o}">${o}</option>`).join('');
}
