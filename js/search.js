// search.js
Auth.guard();
document.getElementById('sidebar').innerHTML = buildSidebar('search.html');
document.getElementById('header').innerHTML = buildHeader('Search', 'Search and filter crime records');

const PAGE_SIZE = 20;
let currentPage = 1;
let filteredData = [];

async function init() {
  await CrimeData.load();
  populateSelect('fDistrict', CrimeData.districts());
  populateSelect('fCrimeType', CrimeData.crimeTypes());
  populateSelect('fYear', CrimeData.years().map(String));
  populateSelect('fStatus', CrimeData.statuses());
  doSearch();
}

function doSearch() {
  currentPage = 1;
  const q = document.getElementById('globalSearch').value.toLowerCase().trim();
  const district = document.getElementById('fDistrict').value;
  const crimeType = document.getElementById('fCrimeType').value;
  const year = document.getElementById('fYear').value;
  const status = document.getElementById('fStatus').value;
  const dateFrom = document.getElementById('fDateFrom').value;
  const dateTo = document.getElementById('fDateTo').value;

  filteredData = CrimeData.filter({ district, crimeType, year, status, dateFrom, dateTo });

  if (q) {
    filteredData = filteredData.filter(r =>
      r.FIR_Number.toLowerCase().includes(q) ||
      r.District.toLowerCase().includes(q) ||
      r.Crime_Type.toLowerCase().includes(q) ||
      r.Police_Station.toLowerCase().includes(q) ||
      r.Crime_Category.toLowerCase().includes(q)
    );
  }

  renderTable();
  renderPagination();
}

function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filteredData.slice(start, start + PAGE_SIZE);
  document.getElementById('resultCount').textContent = `${filteredData.length} records found`;
  document.getElementById('searchBody').innerHTML = page.length
    ? page.map(r => `<tr>
        <td style="font-family:monospace;font-size:12px">${r.FIR_Number}</td>
        <td>${r.Date}</td><td>${r.District}</td><td>${r.Police_Station}</td>
        <td>${r.Crime_Type}</td>
        <td><span class="badge badge-blue">${r.Crime_Category}</span></td>
        <td>${statusBadge(r.Status)}</td>
        <td>${arrestBadge(r.Arrest_Made)}</td>
        <td>${r.Victims}</td>
      </tr>`).join('')
    : '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">No records found matching your criteria.</td></tr>';
}

function renderPagination() {
  const total = Math.ceil(filteredData.length / PAGE_SIZE);
  if (total <= 1) { document.getElementById('pagination').innerHTML = ''; return; }
  let html = '';
  if (currentPage > 1) html += `<button class="page-btn" onclick="goPage(${currentPage-1})">‹ Prev</button>`;
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(total, currentPage + 2);
  if (start > 1) html += `<button class="page-btn" onclick="goPage(1)">1</button>${start>2?'<span style="color:var(--text-muted)">…</span>':''}`;
  for (let i = start; i <= end; i++) html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
  if (end < total) html += `${end<total-1?'<span style="color:var(--text-muted)">…</span>':''}<button class="page-btn" onclick="goPage(${total})">${total}</button>`;
  if (currentPage < total) html += `<button class="page-btn" onclick="goPage(${currentPage+1})">Next ›</button>`;
  document.getElementById('pagination').innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  renderTable();
  renderPagination();
  document.getElementById('searchTable').scrollIntoView({ behavior:'smooth' });
}

function resetSearch() {
  document.getElementById('globalSearch').value = '';
  ['fDistrict','fCrimeType','fYear','fStatus'].forEach(id => document.getElementById(id).value = 'all');
  document.getElementById('fDateFrom').value = '';
  document.getElementById('fDateTo').value = '';
  doSearch();
}

function exportCSV() {
  const headers = ['FIR_Number','Date','Year','District','Police_Station','Crime_Type','Crime_Category','Status','Arrest_Made','Victims'];
  const rows = filteredData.map(r => headers.map(h => `"${r[h]}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'crime_records_export.csv';
  a.click();
}

init();
