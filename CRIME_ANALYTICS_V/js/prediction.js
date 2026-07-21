// prediction.js
Auth.guard();
document.getElementById('sidebar').innerHTML = buildSidebar('prediction.html');
document.getElementById('header').innerHTML = buildHeader('Crime Prediction', 'AI-powered forecasting using historical trends');

async function init() {
  await CrimeData.load();
  const districts = CrimeData.districts();
  const types = CrimeData.crimeTypes();
  populateSelect('predDistrict', districts, 'Select District');
  populateSelect('predCrimeType', types, 'Select Crime Type');
  document.getElementById('predDistrict').value = districts[0];
  document.getElementById('predCrimeType').value = types[0];
  buildSummaryTable();
}

function runPrediction() {
  const district = document.getElementById('predDistrict').value;
  const crimeType = document.getElementById('predCrimeType').value;
  const targetYear = parseInt(document.getElementById('predYear').value);

  if (district === 'all' || crimeType === 'all') {
    alert('Please select a specific district and crime type.');
    return;
  }

  const all = CrimeData.all();
  const years = [2021,2022,2023,2024,2025];
  const historicalData = years.map(y => all.filter(r => r.District===district && r.Crime_Type===crimeType && r.Year===y).length);
  const predicted = CrimeData.predict(district, crimeType, targetYear);
  const prev = CrimeData.predict(district, crimeType, targetYear - 1);
  const pct = prev > 0 ? (((predicted - prev) / prev) * 100).toFixed(1) : 0;

  document.getElementById('predResult').style.display = 'block';
  document.getElementById('predValue').textContent = predicted;
  document.getElementById('predLabel').textContent = `${crimeType} in ${district} (${targetYear})`;
  const changeEl = document.getElementById('predChange');
  changeEl.textContent = `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs ${targetYear-1}`;
  changeEl.className = 'stat-change ' + (pct > 0 ? 'up' : 'down');

  const insight = pct > 10
    ? `⚠️ High risk: ${crimeType} in ${district} is predicted to increase by ${pct}% in ${targetYear}. Recommend increased patrolling.`
    : pct < -5
    ? `✅ Positive trend: ${crimeType} in ${district} is expected to decrease by ${Math.abs(pct)}% in ${targetYear}.`
    : `ℹ️ ${crimeType} in ${district} is expected to remain relatively stable in ${targetYear}.`;
  document.getElementById('predInsight').textContent = insight;

  document.getElementById('chartSubtitle').textContent = `${crimeType} · ${district}`;

  // Build chart labels and data
  const allYears = [...years, targetYear];
  const allData = [...historicalData, null];
  const predData = [...Array(years.length).fill(null), predicted];

  // Fill predicted line from last known to target
  const lastKnown = historicalData[historicalData.length-1];
  const predLine = years.map((y,i) => {
    if (i === years.length-1) return lastKnown;
    return null;
  });
  predLine.push(predicted);

  makeChart('predChart','line', allYears.map(String), [
    {
      label:'Historical',
      data: [...historicalData, null],
      borderColor:'#4f8ef7',
      backgroundColor:'rgba(79,142,247,0.1)',
      tension:0.4, fill:true, pointRadius:5, pointBackgroundColor:'#4f8ef7'
    },
    {
      label:`Predicted (${targetYear})`,
      data: predLine,
      borderColor:'#f59e0b',
      backgroundColor:'rgba(245,158,11,0.1)',
      borderDash:[8,4],
      tension:0.4, fill:false, pointRadius:[0,0,0,0,5,8],
      pointBackgroundColor:'#f59e0b'
    }
  ]);
}

function buildSummaryTable() {
  const all = CrimeData.all();
  const districts = CrimeData.districts();
  const tbody = document.querySelector('#predTable tbody');
  tbody.innerHTML = districts.map((d,i) => {
    const y3 = all.filter(r=>r.District===d&&r.Year===2023).length;
    const y4 = all.filter(r=>r.District===d&&r.Year===2024).length;
    const y5 = all.filter(r=>r.District===d&&r.Year===2025).length;
    const pred = CrimeData.predict(d, null, 2026) || Math.round((y3+y4+y5)/3*1.05);
    // simple total prediction
    const totalPred = Math.round((y3+y4+y5)/3 * (1 + (y5-y3)/(y3||1)*0.1 + 0.03));
    const trend = totalPred > y5 ? '<span class="badge badge-red">▲ Rising</span>' : '<span class="badge badge-green">▼ Falling</span>';
    return `<tr>
      <td>${i+1}</td><td>${d}</td><td>${y3}</td><td>${y4}</td><td>${y5}</td>
      <td><strong style="color:#f59e0b">${totalPred}</strong></td><td>${trend}</td>
    </tr>`;
  }).join('');
}

init();
