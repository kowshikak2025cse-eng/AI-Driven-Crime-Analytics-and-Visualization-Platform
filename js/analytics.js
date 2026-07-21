// analytics.js
Auth.guard();
document.getElementById('sidebar').innerHTML = buildSidebar('analytics.html');
document.getElementById('header').innerHTML = buildHeader('Analytics', 'Deep-dive crime statistics and comparisons');

async function init() {
  await CrimeData.load();
  const all = CrimeData.all();
  const districts = CrimeData.districts();
  const years = [2021,2022,2023,2024,2025];

  // KPIs
  const arrestRate = CrimeData.arrestRate(all);
  const resRate = CrimeData.resolutionRate(all);
  const totalVictims = all.reduce((s,r)=>s+r.Victims,0);
  const avgPerDistrict = Math.round(all.length / districts.length);
  document.getElementById('analyticsKPI').innerHTML = [
    { label:'Overall Arrest Rate', value: arrestRate+'%', icon:'🔒', color:'#f59e0b', bg:'rgba(245,158,11,0.15)' },
    { label:'Case Resolution Rate', value: resRate+'%', icon:'✅', color:'#10b981', bg:'rgba(16,185,129,0.15)' },
    { label:'Total Victims', value: totalVictims.toLocaleString(), icon:'👥', color:'#ef4444', bg:'rgba(239,68,68,0.15)' },
    { label:'Avg per District', value: avgPerDistrict, icon:'📍', color:'#4f8ef7', bg:'rgba(79,142,247,0.15)' },
  ].map(k=>`
    <div class="stat-card animate-in" style="--accent-color:${k.color}">
      <div class="stat-icon" style="background:${k.bg}">${k.icon}</div>
      <div class="stat-info">
        <div class="stat-value">${k.value}</div>
        <div class="stat-label">${k.label}</div>
      </div>
    </div>`).join('');

  // Year-wise bar
  const yearCounts = years.map(y => all.filter(r=>r.Year===y).length);
  makeChart('yearChart','bar', years.map(String), [{
    label:'Total Crimes',
    data: yearCounts,
    backgroundColor: CHART_COLORS.slice(0,5),
    borderRadius: 6
  }], { plugins:{ legend:{ display:false } } });

  // District-wise horizontal bar
  const distCounts = districts.map(d => all.filter(r=>r.District===d).length);
  makeChart('districtChart','bar', districts, [{
    label:'Crimes',
    data: distCounts,
    backgroundColor: CHART_COLORS,
    borderRadius: 4
  }], { indexAxis:'y', plugins:{ legend:{ display:false } } });

  // Category polar
  const catData = CrimeData.countBy(all, 'Crime_Category');
  makeChart('catAnalysisChart','polarArea', Object.keys(catData), [{
    data: Object.values(catData),
    backgroundColor: CHART_COLORS.map(c=>c+'bb'),
    borderColor: CHART_COLORS,
    borderWidth: 1
  }]);

  // Arrest rate by district
  const arrestRates = districts.map(d => {
    const sub = all.filter(r=>r.District===d);
    return CrimeData.arrestRate(sub);
  });
  makeChart('arrestChart','bar', districts, [{
    label:'Arrest Rate %',
    data: arrestRates,
    backgroundColor: arrestRates.map(v => v>=60?'#10b98199':v>=40?'#f59e0b99':'#ef444499'),
    borderColor: arrestRates.map(v => v>=60?'#10b981':v>=40?'#f59e0b':'#ef4444'),
    borderWidth: 1,
    borderRadius: 4
  }], { plugins:{ legend:{ display:false } }, scales:{ y:{ max:100, ticks:{ callback: v=>v+'%' } } } });

  // Resolution by year
  const resRates = years.map(y => {
    const sub = all.filter(r=>r.Year===y);
    return CrimeData.resolutionRate(sub);
  });
  makeChart('resolutionChart','line', years.map(String), [{
    label:'Resolution %',
    data: resRates,
    borderColor:'#10b981',
    backgroundColor:'rgba(16,185,129,0.1)',
    tension:0.4, fill:true, pointRadius:5
  }], { scales:{ y:{ max:100, ticks:{ callback: v=>v+'%' } } } });

  // Heatmap table
  const crimeTypes = ['Theft','Vehicle Theft','Robbery','Assault','Cyber Fraud','Drug Offence'];
  let html = '<table style="width:100%;font-size:12px;border-collapse:collapse">';
  html += '<thead><tr><th style="padding:8px;text-align:left;color:#64748b">Year</th>' + crimeTypes.map(t=>`<th style="padding:8px;color:#64748b;white-space:nowrap">${t}</th>`).join('') + '</tr></thead><tbody>';
  years.forEach(y => {
    html += `<tr><td style="padding:8px;font-weight:600;color:#94a3b8">${y}</td>`;
    crimeTypes.forEach(ct => {
      const count = all.filter(r=>r.Year===y&&r.Crime_Type===ct).length;
      const intensity = Math.min(count/20, 1);
      const bg = `rgba(79,142,247,${(intensity*0.7+0.05).toFixed(2)})`;
      html += `<td style="padding:8px;text-align:center;background:${bg};border-radius:4px;color:#e2e8f0;font-weight:600">${count}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('heatmapTable').innerHTML = html;

  // Performance table
  document.querySelector('#perfTable tbody').innerHTML = districts.map(d => {
    const sub = all.filter(r=>r.District===d);
    const arrests = sub.filter(r=>r.Arrest_Made==='Yes').length;
    const resolved = sub.filter(r=>r.Status==='Closed'||r.Status==='Chargesheeted').length;
    const pending = sub.filter(r=>r.Status==='Under Investigation'||r.Status==='Pending Trial').length;
    const ar = CrimeData.arrestRate(sub);
    const rr = CrimeData.resolutionRate(sub);
    return `<tr>
      <td>${d}</td><td>${sub.length}</td><td>${arrests}</td>
      <td><span class="badge ${ar>=60?'badge-green':ar>=40?'badge-orange':'badge-red'}">${ar}%</span></td>
      <td>${resolved}</td>
      <td><span class="badge ${rr>=60?'badge-green':rr>=40?'badge-orange':'badge-red'}">${rr}%</span></td>
      <td>${pending}</td>
    </tr>`;
  }).join('');
}

init();
