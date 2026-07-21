// hotspots.js
Auth.guard();
document.getElementById('sidebar').innerHTML = buildSidebar('hotspots.html');
document.getElementById('header').innerHTML = buildHeader('Crime Hotspots', 'Interactive map with risk-level markers');

let map, markersLayer;

async function init() {
  await CrimeData.load();
  populateSelect('hsDistrict', CrimeData.districts());
  populateSelect('hsCrimeType', CrimeData.crimeTypes());
  populateSelect('hsYear', CrimeData.years().map(String));

  // Init Leaflet map centered on Karnataka
  map = L.map('map', { zoomControl: true }).setView([14.5, 75.7], 7);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 18
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  applyFilters();
}

function getColor(count) {
  if (count >= 5) return '#ef4444';
  if (count >= 2) return '#f59e0b';
  return '#10b981';
}

function getRisk(count) {
  if (count >= 5) return '<span class="badge badge-red">High</span>';
  if (count >= 2) return '<span class="badge badge-orange">Medium</span>';
  return '<span class="badge badge-green">Low</span>';
}

function applyFilters() {
  const district = document.getElementById('hsDistrict').value;
  const crimeType = document.getElementById('hsCrimeType').value;
  const year = document.getElementById('hsYear').value;

  const filtered = CrimeData.filter({ district, crimeType, year });
  renderMap(filtered);
  renderStats(filtered);
  renderTable(filtered);
}

function renderMap(records) {
  markersLayer.clearLayers();

  // Cluster nearby points by rounding coords
  const clusters = {};
  records.forEach(r => {
    const key = `${(r.Latitude).toFixed(2)}_${(r.Longitude).toFixed(2)}`;
    if (!clusters[key]) clusters[key] = { lat: r.Latitude, lng: r.Longitude, count: 0, types: {}, district: r.District };
    clusters[key].count++;
    clusters[key].types[r.Crime_Type] = (clusters[key].types[r.Crime_Type] || 0) + 1;
  });

  Object.values(clusters).forEach(c => {
    const color = getColor(c.count);
    const radius = Math.min(6 + c.count * 2, 22);
    const topType = Object.entries(c.types).sort((a,b)=>b[1]-a[1])[0];
    const marker = L.circleMarker([c.lat, c.lng], {
      radius,
      fillColor: color,
      color: '#fff',
      weight: 1.5,
      opacity: 0.9,
      fillOpacity: 0.75
    });
    marker.bindPopup(`
      <strong>${c.district}</strong><br>
      Total Crimes: <strong>${c.count}</strong><br>
      Top Crime: <strong>${topType ? topType[0] : 'N/A'}</strong><br>
      Risk: <strong style="color:${color}">${c.count>=5?'High':c.count>=2?'Medium':'Low'}</strong>
    `);
    markersLayer.addLayer(marker);
  });
}

function renderStats(records) {
  const high = records.filter(r => {
    const key = `${r.Latitude.toFixed(2)}_${r.Longitude.toFixed(2)}`;
    return true; // simplified
  });
  const arrests = records.filter(r=>r.Arrest_Made==='Yes').length;
  const pct = records.length ? Math.round(arrests/records.length*100) : 0;
  document.getElementById('hsStats').innerHTML = `
    <div class="hs-stat"><div class="val" style="color:#ef4444">${records.length}</div><div class="lbl">Total Incidents</div></div>
    <div class="hs-stat"><div class="val" style="color:#f59e0b">${arrests}</div><div class="lbl">Arrests Made</div></div>
    <div class="hs-stat"><div class="val" style="color:#10b981">${pct}%</div><div class="lbl">Arrest Rate</div></div>
  `;
}

function renderTable(records) {
  // Group by district + crime type
  const groups = {};
  records.forEach(r => {
    const key = `${r.District}||${r.Crime_Type}`;
    if (!groups[key]) groups[key] = { district: r.District, type: r.Crime_Type, count: 0, lat: r.Latitude, lng: r.Longitude };
    groups[key].count++;
  });
  const sorted = Object.values(groups).sort((a,b)=>b.count-a.count).slice(0,30);
  document.getElementById('hsCount').textContent = `Showing ${sorted.length} hotspot clusters`;
  document.querySelector('#hsTable tbody').innerHTML = sorted.map(g => `
    <tr>
      <td>${g.district}</td><td>${g.type}</td><td>${g.count}</td>
      <td>${getRisk(g.count)}</td><td>${g.lat.toFixed(4)}</td><td>${g.lng.toFixed(4)}</td>
    </tr>`).join('');
}

function resetFilters() {
  document.getElementById('hsDistrict').value = 'all';
  document.getElementById('hsCrimeType').value = 'all';
  document.getElementById('hsYear').value = 'all';
  applyFilters();
}

init();
