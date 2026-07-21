// dashboard.js
Auth.guard();
document.getElementById('sidebar').innerHTML = buildSidebar('index.html');
document.getElementById('header').innerHTML = buildHeader('Dashboard', 'Crime Analytics Overview — Karnataka');
document.getElementById('lastUpdate').textContent = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

async function init() {
  await CrimeData.load();
  const all = CrimeData.all();
  const cur = all.filter(r => r.Year === 2025);
  const prev = all.filter(r => r.Year === 2024);

  // KPIs
  const kpis = [
    { label:'Total Crimes', value: all.length, change: '+8.2%', up: true, icon:'🚨', color:'#ef4444', bg:'rgba(239,68,68,0.15)' },
    { label:'Arrests Made', value: all.filter(r=>r.Arrest_Made==='Yes').length, change: '+3.1%', up: true, icon:'🔒', color:'#f59e0b', bg:'rgba(245,158,11,0.15)' },
    { label:'Cases Resolved', value: all.filter(r=>r.Status==='Closed'||r.Status==='Chargesheeted').length, change: '+5.4%', up: false, icon:'✅', color:'#10b981', bg:'rgba(16,185,129,0.15)' },
    { label:'Under Investigation', value: all.filter(r=>r.Status==='Under Investigation').length, change: '-2.3%', up: false, icon:'🔍', color:'#4f8ef7', bg:'rgba(79,142,247,0.15)' },
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(k => `
    <div class="stat-card animate-in" style="--accent-color:${k.color}">
      <div class="stat-icon" style="background:${k.bg}">${k.icon}</div>
      <div class="stat-info">
        <div class="stat-value">${k.value.toLocaleString()}</div>
        <div class="stat-label">${k.label}</div>
        <div class="stat-change ${k.up?'up':'down'}">${k.up?'▲':'▼'} ${k.change} vs last year</div>
      </div>
    </div>`).join('');

  // Trend chart (monthly 2025)
  const monthly2025 = CrimeData.monthlyCount(cur);
  const monthly2024 = CrimeData.monthlyCount(prev);
  makeChart('trendChart','line', MONTHS, [
    { label:'2025', data: monthly2025, borderColor:'#4f8ef7', backgroundColor:'rgba(79,142,247,0.1)', tension:0.4, fill:true, pointRadius:4 },
    { label:'2024', data: monthly2024, borderColor:'#7c3aed', backgroundColor:'rgba(124,58,237,0.05)', tension:0.4, fill:true, pointRadius:4, borderDash:[5,5] }
  ]);

  // Category doughnut
  const catData = CrimeData.countBy(all, 'Crime_Category');
  makeChart('categoryChart','doughnut', Object.keys(catData), [{
    data: Object.values(catData),
    backgroundColor: CHART_COLORS,
    borderWidth: 2,
    borderColor: '#0a0e1a'
  }], { plugins: { legend: { position:'right' } } });

  // Monthly bar (multi-year)
  const years = [2023,2024,2025];
  const colors = ['#06b6d4','#7c3aed','#4f8ef7'];
  makeChart('monthlyChart','bar', MONTHS, years.map((y,i) => ({
    label: String(y),
    data: CrimeData.monthlyCount(all.filter(r=>r.Year===y)),
    backgroundColor: colors[i]+'99',
    borderColor: colors[i],
    borderWidth: 1,
    borderRadius: 4
  })));

  // Top districts
  const distData = CrimeData.countBy(all, 'District');
  const sorted = Object.entries(distData).sort((a,b)=>b[1]-a[1]);
  const maxVal = sorted[0][1];
  document.getElementById('topDistricts').innerHTML = sorted.slice(0,6).map(([name,count],i) => `
    <div class="district-rank">
      <div class="rank-num">${i+1}</div>
      <div class="rank-info">
        <div class="rank-name">${name}</div>
        <div class="rank-count">${count} crimes</div>
      </div>
      <div class="rank-bar">
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(count/maxVal*100)}%;background:${CHART_COLORS[i]}"></div></div>
      </div>
    </div>`).join('');

  // Radar chart
  const top6 = sorted.slice(0,6).map(([n])=>n);
  const crimeTypeList = ['Theft','Vehicle Theft','Robbery','Assault','Cyber Fraud','Drug Offence'];
  makeChart('radarChart','radar', top6, crimeTypeList.map((ct,i) => ({
    label: ct,
    data: top6.map(d => all.filter(r=>r.District===d&&r.Crime_Type===ct).length),
    borderColor: CHART_COLORS[i],
    backgroundColor: CHART_COLORS[i]+'22',
    pointRadius: 3
  })), { scales: { r: { grid: { color:'rgba(255,255,255,0.06)' }, ticks: { color:'#64748b', backdropColor:'transparent' }, pointLabels: { color:'#94a3b8', font:{size:11} } } } });

  // Crime type bar
  const typeData = CrimeData.countBy(all, 'Crime_Type');
  const typeSorted = Object.entries(typeData).sort((a,b)=>b[1]-a[1]);
  makeChart('typeChart','bar', typeSorted.map(([k])=>k), [{
    label:'Crimes',
    data: typeSorted.map(([,v])=>v),
    backgroundColor: CHART_COLORS,
    borderRadius: 6
  }], { indexAxis:'y', plugins:{ legend:{ display:false } } });

  // Recent table
  const recent = [...all].sort((a,b)=>b.Date.localeCompare(a.Date)).slice(0,20);
  document.querySelector('#recentTable tbody').innerHTML = recent.map(r => `
    <tr>
      <td>${r.FIR_Number}</td>
      <td>${r.Date}</td>
      <td>${r.District}</td>
      <td>${r.Crime_Type}</td>
      <td>${statusBadge(r.Status)}</td>
      <td>${arrestBadge(r.Arrest_Made)}</td>
    </tr>`).join('');
}

init();
