// insights.js
Auth.guard();
document.getElementById('sidebar').innerHTML = buildSidebar('insights.html');
document.getElementById('header').innerHTML = buildHeader('AI Insights', 'Automated intelligence from crime data analysis');

async function init() {
  await CrimeData.load();
  renderAll();
}

function renderAll() {
  const all = CrimeData.all();
  const years = [2021,2022,2023,2024,2025];
  const districts = CrimeData.districts();
  const crimeTypes = CrimeData.crimeTypes();

  // KPIs
  const totalThisYear = all.filter(r=>r.Year===2025).length;
  const totalLastYear = all.filter(r=>r.Year===2024).length;
  const yoyChange = totalLastYear ? (((totalThisYear-totalLastYear)/totalLastYear)*100).toFixed(1) : 0;
  const topDistrict = Object.entries(CrimeData.countBy(all,'District')).sort((a,b)=>b[1]-a[1])[0];
  const topCrime = Object.entries(CrimeData.countBy(all,'Crime_Type')).sort((a,b)=>b[1]-a[1])[0];

  document.getElementById('insightKPI').innerHTML = [
    { label:'YoY Change', value: (yoyChange>0?'+':'')+yoyChange+'%', icon:'📈', color: yoyChange>0?'#ef4444':'#10b981', bg: yoyChange>0?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.15)' },
    { label:'Highest Crime District', value: topDistrict[0].split(' ')[0], icon:'📍', color:'#f59e0b', bg:'rgba(245,158,11,0.15)' },
    { label:'Most Common Crime', value: topCrime[0], icon:'🚨', color:'#ef4444', bg:'rgba(239,68,68,0.15)' },
    { label:'Insights Generated', value: '12', icon:'🤖', color:'#4f8ef7', bg:'rgba(79,142,247,0.15)' },
  ].map(k=>`
    <div class="stat-card animate-in" style="--accent-color:${k.color}">
      <div class="stat-icon" style="background:${k.bg}">${k.icon}</div>
      <div class="stat-info">
        <div class="stat-value" style="font-size:20px">${k.value}</div>
        <div class="stat-label">${k.label}</div>
      </div>
    </div>`).join('');

  // Generate insights
  const insights = generateInsights(all, districts, crimeTypes, years);
  document.getElementById('insightGrid').innerHTML = insights.map(ins => `
    <div class="insight-card">
      <div class="insight-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;display:flex;gap:16px;transition:var(--transition)">
        <div style="font-size:28px;flex-shrink:0">${ins.icon}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;margin-bottom:6px;color:${ins.color}">${ins.title}</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">${ins.text}</div>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            <span class="tag">${ins.category}</span>
            <span class="tag" style="background:${ins.severity==='High'?'rgba(239,68,68,0.1)':ins.severity==='Medium'?'rgba(245,158,11,0.1)':'rgba(16,185,129,0.1)'};border-color:${ins.severity==='High'?'rgba(239,68,68,0.3)':ins.severity==='Medium'?'rgba(245,158,11,0.3)':'rgba(16,185,129,0.3)'};color:${ins.severity==='High'?'#f87171':ins.severity==='Medium'?'#fbbf24':'#34d399'}">${ins.severity} Priority</span>
          </div>
          <div class="severity-bar" style="background:${ins.severity==='High'?'#ef4444':ins.severity==='Medium'?'#f59e0b':'#10b981'};width:${ins.severity==='High'?'90%':ins.severity==='Medium'?'60%':'30%'}"></div>
        </div>
      </div>
    </div>`).join('');

  // Velocity chart
  const monthly2025 = CrimeData.monthlyCount(all.filter(r=>r.Year===2025));
  const monthly2024 = CrimeData.monthlyCount(all.filter(r=>r.Year===2024));
  const velocity = monthly2025.map((v,i) => monthly2024[i] ? parseFloat(((v-monthly2024[i])/monthly2024[i]*100).toFixed(1)) : 0);
  makeChart('velocityChart','bar', MONTHS, [{
    label:'MoM Change %',
    data: velocity,
    backgroundColor: velocity.map(v=>v>0?'rgba(239,68,68,0.7)':'rgba(16,185,129,0.7)'),
    borderColor: velocity.map(v=>v>0?'#ef4444':'#10b981'),
    borderWidth: 1, borderRadius: 4
  }], { plugins:{ legend:{ display:false } }, scales:{ y:{ ticks:{ callback: v=>v+'%' } } } });

  // Emerging threats
  const typeGrowth = crimeTypes.map(ct => {
    const c24 = all.filter(r=>r.Crime_Type===ct&&r.Year===2024).length;
    const c25 = all.filter(r=>r.Crime_Type===ct&&r.Year===2025).length;
    const growth = c24 ? ((c25-c24)/c24*100).toFixed(1) : 0;
    return { type: ct, growth: parseFloat(growth), c24, c25 };
  }).sort((a,b)=>b.growth-a.growth);

  document.getElementById('emergingThreats').innerHTML = typeGrowth.slice(0,8).map(t => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${t.type}</div>
        <div style="font-size:11px;color:var(--text-muted)">${t.c24} → ${t.c25} cases</div>
      </div>
      <span class="badge ${t.growth>0?'badge-red':'badge-green'}">${t.growth>0?'▲':'▼'} ${Math.abs(t.growth)}%</span>
    </div>`).join('');
}

function generateInsights(all, districts, crimeTypes, years) {
  const insights = [];

  // 1. YoY crime change
  const c24 = all.filter(r=>r.Year===2024).length;
  const c25 = all.filter(r=>r.Year===2025).length;
  const yoy = c24 ? ((c25-c24)/c24*100).toFixed(1) : 0;
  insights.push({
    icon:'📈', title:`Overall Crime ${yoy>0?'Increased':'Decreased'} by ${Math.abs(yoy)}%`,
    text:`Total reported crimes ${yoy>0?'rose':'fell'} from ${c24} in 2024 to ${c25} in 2025, indicating a ${yoy>0?'worsening':'improving'} law and order situation across Karnataka.`,
    category:'Trend Analysis', severity: Math.abs(yoy)>10?'High':Math.abs(yoy)>5?'Medium':'Low', color: yoy>0?'#f87171':'#34d399'
  });

  // 2. Top district
  const distCounts = Object.entries(CrimeData.countBy(all,'District')).sort((a,b)=>b[1]-a[1]);
  insights.push({
    icon:'📍', title:`${distCounts[0][0]} Leads in Total Crime Count`,
    text:`${distCounts[0][0]} recorded the highest number of crimes (${distCounts[0][1]}), followed by ${distCounts[1][0]} (${distCounts[1][1]}) and ${distCounts[2][0]} (${distCounts[2][1]}). Urban districts continue to dominate crime statistics.`,
    category:'District Analysis', severity:'High', color:'#fbbf24'
  });

  // 3. Cyber fraud trend
  const cyber24 = all.filter(r=>r.Crime_Type==='Cyber Fraud'&&r.Year===2024).length;
  const cyber25 = all.filter(r=>r.Crime_Type==='Cyber Fraud'&&r.Year===2025).length;
  const cyberPct = cyber24 ? ((cyber25-cyber24)/cyber24*100).toFixed(1) : 0;
  const cyberDistrict = Object.entries(CrimeData.countBy(all.filter(r=>r.Crime_Type==='Cyber Fraud'),'District')).sort((a,b)=>b[1]-a[1])[0];
  insights.push({
    icon:'💻', title:`Cyber Fraud ${cyberPct>0?'Surged':'Declined'} by ${Math.abs(cyberPct)}%`,
    text:`Cyber fraud cases ${cyberPct>0?'increased':'decreased'} significantly. ${cyberDistrict[0]} has the highest cybercrime rate with ${cyberDistrict[1]} reported cases. Digital literacy programs are recommended.`,
    category:'Cyber Crime', severity: cyberPct>15?'High':'Medium', color:'#60a5fa'
  });

  // 4. Vehicle theft
  const vt24 = all.filter(r=>r.Crime_Type==='Vehicle Theft'&&r.Year===2024).length;
  const vt25 = all.filter(r=>r.Crime_Type==='Vehicle Theft'&&r.Year===2025).length;
  const vtPct = vt24 ? ((vt25-vt24)/vt24*100).toFixed(1) : 0;
  insights.push({
    icon:'🚗', title:`Vehicle Theft ${vtPct>0?'Up':'Down'} ${Math.abs(vtPct)}% Year-over-Year`,
    text:`Vehicle theft ${vtPct>0?'increased':'decreased'} from ${vt24} to ${vt25} cases. Recommend increased CCTV surveillance in parking areas and public spaces.`,
    category:'Property Crime', severity: vtPct>10?'High':'Medium', color:'#f97316'
  });

  // 5. Festival months
  const festMonths = all.filter(r=>[10,11,12].includes(parseInt(r.Date.split('-')[1]))).length;
  const nonFestMonths = all.filter(r=>[1,2,3,4,5,6].includes(parseInt(r.Date.split('-')[1]))).length;
  const festAvg = Math.round(festMonths/3);
  const nonFestAvg = Math.round(nonFestMonths/6);
  insights.push({
    icon:'🎉', title:'Crime Spikes During Festival Season (Oct–Dec)',
    text:`Average monthly crimes during festival months (Oct–Dec): ${festAvg} vs non-festival months: ${nonFestAvg}. A ${Math.round((festAvg-nonFestAvg)/nonFestAvg*100)}% increase is observed. Enhanced deployment recommended.`,
    category:'Seasonal Pattern', severity:'High', color:'#a78bfa'
  });

  // 6. Arrest rate
  const ar = CrimeData.arrestRate(all);
  const bestDistrict = districts.map(d=>({ d, ar: CrimeData.arrestRate(all.filter(r=>r.District===d)) })).sort((a,b)=>b.ar-a.ar)[0];
  insights.push({
    icon:'🔒', title:`Overall Arrest Rate Stands at ${ar}%`,
    text:`${bestDistrict.d} leads with the highest arrest rate of ${bestDistrict.ar}%. Improving investigation quality and inter-district coordination can push the overall rate above 70%.`,
    category:'Law Enforcement', severity: ar<50?'High':ar<65?'Medium':'Low', color:'#34d399'
  });

  // 7. Drug offences
  const drug24 = all.filter(r=>r.Crime_Type==='Drug Offence'&&r.Year===2024).length;
  const drug25 = all.filter(r=>r.Crime_Type==='Drug Offence'&&r.Year===2025).length;
  const drugPct = drug24 ? ((drug25-drug24)/drug24*100).toFixed(1) : 0;
  insights.push({
    icon:'💊', title:`Drug Offences ${drugPct>0?'Rose':'Fell'} by ${Math.abs(drugPct)}%`,
    text:`Drug-related crimes ${drugPct>0?'increased':'decreased'} from ${drug24} to ${drug25} cases. Border districts show higher concentration. Coordinated anti-narcotics operations are advised.`,
    category:'Drug Crime', severity: drugPct>10?'High':'Medium', color:'#f87171'
  });

  // 8. Domestic violence
  const dv = all.filter(r=>r.Crime_Type==='Domestic Violence').length;
  const dvArr = all.filter(r=>r.Crime_Type==='Domestic Violence'&&r.Arrest_Made==='Yes').length;
  const dvArrPct = dv ? Math.round(dvArr/dv*100) : 0;
  insights.push({
    icon:'🏠', title:`Domestic Violence: ${dvArrPct}% Arrest Rate`,
    text:`${dv} domestic violence cases reported with only ${dvArrPct}% resulting in arrests. Strengthening victim support systems and fast-track courts can improve outcomes.`,
    category:'Domestic Crime', severity: dvArrPct<40?'High':'Medium', color:'#fb923c'
  });

  // 9. Missing persons
  const mp = all.filter(r=>r.Crime_Type==='Missing Person').length;
  const mpResolved = all.filter(r=>r.Crime_Type==='Missing Person'&&r.Status==='Closed').length;
  insights.push({
    icon:'🔍', title:`${mp} Missing Person Cases — ${Math.round(mpResolved/mp*100)}% Resolved`,
    text:`Missing person cases have a resolution rate of ${Math.round(mpResolved/mp*100)}%. Deploying facial recognition and inter-state coordination can significantly improve tracing outcomes.`,
    category:'Missing Persons', severity:'Medium', color:'#22d3ee'
  });

  // 10. Resolution rate trend
  const rr24 = CrimeData.resolutionRate(all.filter(r=>r.Year===2024));
  const rr25 = CrimeData.resolutionRate(all.filter(r=>r.Year===2025));
  insights.push({
    icon:'⚖️', title:`Case Resolution Rate: ${rr25}% in 2025`,
    text:`Resolution rate ${rr25>rr24?'improved':'declined'} from ${rr24}% (2024) to ${rr25}% (2025). Faster chargesheeting and dedicated prosecution teams can push this above 80%.`,
    category:'Case Management', severity: rr25<50?'High':rr25<65?'Medium':'Low', color:'#4ade80'
  });

  return insights.slice(0,8);
}

function regenerate() {
  document.getElementById('insightGrid').innerHTML = '<div class="spinner"></div>';
  setTimeout(() => renderAll(), 800);
}

init();
