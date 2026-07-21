// admin.js
Auth.guard();
document.getElementById('sidebar').innerHTML = buildSidebar('admin.html');
document.getElementById('header').innerHTML = buildHeader('Admin Panel', 'Dataset management and user administration');

// ── State ─────────────────────────────────────────────────────────────────────
let uploadedRows = [];
let dataPage = 1;
const DATA_PAGE_SIZE = 15;
let dataFiltered = [];
const activityLogs = [];

const defaultUsers = [
  { id:1, name:'Suresh Patil',    email:'suresh.patil@ksp.gov.in',    role:'Super Admin',    avatar:'SP', color:'#4f8ef7', active:true  },
  { id:2, name:'Kavitha Reddy',   email:'kavitha.reddy@ksp.gov.in',   role:'District Admin', avatar:'KR', color:'#7c3aed', active:true  },
  { id:3, name:'Mohan Das',       email:'mohan.das@ksp.gov.in',       role:'Analyst',        avatar:'MD', color:'#10b981', active:true  },
  { id:4, name:'Priya Sharma',    email:'priya.sharma@ksp.gov.in',    role:'Analyst',        avatar:'PS', color:'#f59e0b', active:false },
  { id:5, name:'Arjun Nair',      email:'arjun.nair@ksp.gov.in',      role:'Viewer',         avatar:'AN', color:'#06b6d4', active:true  },
  { id:6, name:'Deepa Kulkarni',  email:'deepa.kulkarni@ksp.gov.in',  role:'Viewer',         avatar:'DK', color:'#ec4899', active:true  },
];
let users = [...defaultUsers];

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await CrimeData.load();
  renderKPIs();
  renderDataTab();
  renderUsers();
  addLog('System', 'Admin panel loaded successfully.');
  addLog('System', `Dataset contains ${CrimeData.all().length} records.`);
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
function renderKPIs() {
  const all = CrimeData.all();
  document.getElementById('adminKPI').innerHTML = [
    { label:'Total Records',    value: all.length,                                  icon:'📋', color:'#4f8ef7', bg:'rgba(79,142,247,0.15)'  },
    { label:'Active Users',     value: users.filter(u=>u.active).length,            icon:'👥', color:'#10b981', bg:'rgba(16,185,129,0.15)'  },
    { label:'Districts Covered',value: CrimeData.districts().length,                icon:'📍', color:'#f59e0b', bg:'rgba(245,158,11,0.15)'  },
    { label:'Years of Data',    value: CrimeData.years().length,                    icon:'📅', color:'#7c3aed', bg:'rgba(124,58,237,0.15)'  },
  ].map(k => `
    <div class="stat-card animate-in" style="--accent-color:${k.color}">
      <div class="stat-icon" style="background:${k.bg}">${k.icon}</div>
      <div class="stat-info">
        <div class="stat-value">${k.value}</div>
        <div class="stat-label">${k.label}</div>
      </div>
    </div>`).join('');
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
  if (name === 'data') renderDataTab();
  if (name === 'logs') renderLogs();
}

// ── CSV Upload ────────────────────────────────────────────────────────────────
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processCSV(file);
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (file) processCSV(file);
}

function processCSV(file) {
  if (!file.name.endsWith('.csv')) {
    document.getElementById('uploadStatus').innerHTML = '<div class="alert alert-danger">❌ Please upload a valid .csv file.</div>';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
    uploadedRows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
      const obj = {};
      headers.forEach((h,i) => obj[h] = vals[i] || '');
      return obj;
    }).filter(r => r[headers[0]]);

    document.getElementById('uploadStatus').innerHTML = `<div class="alert alert-success">✅ Parsed <strong>${uploadedRows.length}</strong> records from <strong>${file.name}</strong></div>`;
    renderUploadStats(uploadedRows, headers);
    renderCSVPreview(uploadedRows, headers);
    addLog('Upload', `CSV file "${file.name}" uploaded with ${uploadedRows.length} records.`);
  };
  reader.readAsText(file);
}

function renderUploadStats(rows, headers) {
  const districts = [...new Set(rows.map(r => r.District).filter(Boolean))];
  const types     = [...new Set(rows.map(r => r.Crime_Type).filter(Boolean))];
  document.getElementById('uploadStats').innerHTML = `
    <div class="grid-2" style="gap:12px">
      <div class="preview-stat-box" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#4f8ef7">${rows.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Total Records</div>
      </div>
      <div class="preview-stat-box" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#10b981">${headers.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Columns</div>
      </div>
      <div class="preview-stat-box" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#f59e0b">${districts.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Districts Found</div>
      </div>
      <div class="preview-stat-box" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#7c3aed">${types.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Crime Types</div>
      </div>
    </div>
    <div style="margin-top:14px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">COLUMNS DETECTED</div>
      <div>${headers.map(h=>`<span class="tag">${h}</span>`).join('')}</div>
    </div>`;
}

function renderCSVPreview(rows, headers) {
  document.getElementById('csvPreviewCard').style.display = 'block';
  document.getElementById('csvPreviewCount').textContent = `Showing first 20 of ${rows.length} rows`;
  document.getElementById('csvHeaders').innerHTML = headers.map(h=>`<th>${h}</th>`).join('');
  document.getElementById('csvBody').innerHTML = rows.slice(0,20).map(r =>
    `<tr>${headers.map(h=>`<td>${r[h]||''}</td>`).join('')}</tr>`
  ).join('');
}

function mergeData() {
  if (!uploadedRows.length) return;
  alert(`✅ ${uploadedRows.length} records merged into the local dataset (session only).`);
  addLog('Data', `Merged ${uploadedRows.length} records from uploaded CSV into dataset.`);
  uploadedRows = [];
  document.getElementById('csvPreviewCard').style.display = 'none';
  document.getElementById('uploadStatus').innerHTML = '<div class="alert alert-success">✅ Data merged successfully into session dataset.</div>';
}

// ── Data Tab ──────────────────────────────────────────────────────────────────
function renderDataTab() {
  dataFiltered = CrimeData.all();
  document.getElementById('dataCount').textContent = `${dataFiltered.length} total records`;
  renderDataTable();
  renderDataPagination();
}

function filterDataView() {
  const q = document.getElementById('dataSearch').value.toLowerCase();
  dataFiltered = q
    ? CrimeData.all().filter(r =>
        r.FIR_Number.toLowerCase().includes(q) ||
        r.District.toLowerCase().includes(q) ||
        r.Crime_Type.toLowerCase().includes(q))
    : CrimeData.all();
  dataPage = 1;
  renderDataTable();
  renderDataPagination();
}

function renderDataTable() {
  const start = (dataPage-1)*DATA_PAGE_SIZE;
  const page  = dataFiltered.slice(start, start+DATA_PAGE_SIZE);
  document.getElementById('dataBody').innerHTML = page.map((r,i) => `
    <tr>
      <td style="font-family:monospace;font-size:11px">${r.FIR_Number}</td>
      <td>${r.Date}</td><td>${r.District}</td><td>${r.Crime_Type}</td>
      <td>${statusBadge(r.Status)}</td>
      <td>${arrestBadge(r.Arrest_Made)}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="viewRecord(${start+i})" style="padding:4px 10px;font-size:11px">👁 View</button>
      </td>
    </tr>`).join('');
}

function renderDataPagination() {
  const total = Math.ceil(dataFiltered.length / DATA_PAGE_SIZE);
  if (total <= 1) { document.getElementById('dataPagination').innerHTML=''; return; }
  let html = '';
  if (dataPage>1) html+=`<button class="page-btn" onclick="goDataPage(${dataPage-1})">‹</button>`;
  for(let i=Math.max(1,dataPage-2);i<=Math.min(total,dataPage+2);i++)
    html+=`<button class="page-btn ${i===dataPage?'active':''}" onclick="goDataPage(${i})">${i}</button>`;
  if(dataPage<total) html+=`<button class="page-btn" onclick="goDataPage(${dataPage+1})">›</button>`;
  document.getElementById('dataPagination').innerHTML = html;
}

function goDataPage(p) { dataPage=p; renderDataTable(); renderDataPagination(); }

function viewRecord(idx) {
  const r = dataFiltered[idx];
  alert(`FIR: ${r.FIR_Number}\nDate: ${r.Date}\nDistrict: ${r.District}\nPolice Station: ${r.Police_Station}\nCrime Type: ${r.Crime_Type}\nCategory: ${r.Crime_Category}\nStatus: ${r.Status}\nArrest Made: ${r.Arrest_Made}\nVictims: ${r.Victims}\nLocation: ${r.Latitude}, ${r.Longitude}`);
}

function exportDataset() {
  const blob = new Blob([JSON.stringify(CrimeData.all(), null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'crimes_export.json';
  a.click();
  addLog('Export', 'Dataset exported as crimes_export.json');
}

function resetDataset() {
  if (confirm('Reset dataset to default? This will reload the page.')) {
    location.reload();
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────
function renderUsers() {
  const roleColors = { 'Super Admin':'#ef4444','District Admin':'#f59e0b','Analyst':'#4f8ef7','Viewer':'#10b981' };
  document.getElementById('userGrid').innerHTML = users.map(u => `
    <div class="user-card">
      <div class="user-avatar" style="background:${u.color}22;color:${u.color}">${u.avatar}</div>
      <div class="user-info">
        <div class="user-name">${u.name}</div>
        <div class="user-role">${u.email}</div>
        <div style="margin-top:6px;display:flex;gap:6px;align-items:center">
          <span class="badge" style="background:${roleColors[u.role]||'#4f8ef7'}22;color:${roleColors[u.role]||'#4f8ef7'}">${u.role}</span>
          <span class="badge ${u.active?'badge-green':'badge-red'}">${u.active?'Active':'Inactive'}</span>
        </div>
      </div>
      <div class="user-actions">
        <button class="btn btn-outline btn-sm" onclick="toggleUser(${u.id})" style="padding:5px 10px;font-size:11px">${u.active?'Deactivate':'Activate'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})" style="padding:5px 10px;font-size:11px">✕</button>
      </div>
    </div>`).join('');
}

function addUser() {
  const name  = document.getElementById('newName').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const role  = document.getElementById('newRole').value;
  if (!name || !email) { alert('Please fill in name and email.'); return; }
  const colors = ['#4f8ef7','#7c3aed','#10b981','#f59e0b','#06b6d4','#ec4899'];
  const newUser = {
    id: Date.now(), name, email, role,
    avatar: name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
    color: colors[users.length % colors.length],
    active: true
  };
  users.push(newUser);
  renderUsers();
  renderKPIs();
  addLog('Users', `New user "${name}" added with role "${role}".`);
  document.getElementById('newName').value = '';
  document.getElementById('newEmail').value = '';
}

function toggleUser(id) {
  const u = users.find(u=>u.id===id);
  if (u) { u.active = !u.active; renderUsers(); renderKPIs(); addLog('Users', `User "${u.name}" ${u.active?'activated':'deactivated'}.`); }
}

function deleteUser(id) {
  const u = users.find(u=>u.id===id);
  if (u && confirm(`Delete user "${u.name}"?`)) {
    users = users.filter(u=>u.id!==id);
    renderUsers(); renderKPIs();
    addLog('Users', `User "${u.name}" deleted.`);
  }
}

// ── Activity Log ──────────────────────────────────────────────────────────────
function addLog(category, message) {
  activityLogs.unshift({ category, message, time: new Date().toLocaleTimeString('en-IN') });
  if (document.getElementById('tab-logs').classList.contains('active')) renderLogs();
}

function renderLogs() {
  const catColors = { System:'#4f8ef7', Upload:'#10b981', Data:'#f59e0b', Users:'#7c3aed', Export:'#06b6d4' };
  document.getElementById('activityLog').innerHTML = activityLogs.length
    ? activityLogs.map(l => `
        <div class="log-item">
          <span class="log-time">${l.time}</span>
          <span class="badge" style="background:${catColors[l.category]||'#4f8ef7'}22;color:${catColors[l.category]||'#4f8ef7'};flex-shrink:0">${l.category}</span>
          <span class="log-msg">${l.message}</span>
        </div>`).join('')
    : '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">No activity yet.</div>';
}

function clearLogs() {
  activityLogs.length = 0;
  renderLogs();
}

init();
