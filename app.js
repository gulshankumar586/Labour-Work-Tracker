// === Auth (localStorage, fake for demo purposes) ===

function getUser() {
  return JSON.parse(localStorage.getItem('currentUser'));
}

function setUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem('currentUser');
}

function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email) return alert('Enter your email to login');
  setUser({email: email, password: password});
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('main-section').classList.remove('hidden');
  renderWorkList();
  showGreeting();
}

function logout() {
  clearUser();
  location.reload();
}

// === Work Data Storage ===

function getWorks() {
  const user = getUser();
  if (!user) return [];
  return JSON.parse(localStorage.getItem('works_' + user.email)) || [];
}

function saveWorks(works) {
  const user = getUser();
  if (!user) return;
  localStorage.setItem('works_' + user.email, JSON.stringify(works));
}

// === UI Logic ===

function addWork() {
  const workerName = document.getElementById('workerName').value.trim();
  const ownerName = document.getElementById('ownerName').value.trim();
  const address = document.getElementById('address').value.trim();
  const startDate = document.getElementById('startDate').value;
  const pricePerDay = Number(document.getElementById('pricePerDay').value);

  if(!workerName || !ownerName || !address || !startDate || !pricePerDay) {
    alert('Please fill all the fields!');
    return;
  }

  const works = getWorks();
  works.push({
    id: Date.now(),
    workerName, ownerName, address, startDate, pricePerDay,
    attendance: [], // Entries: {date, status}
    status: 'active'
  });
  saveWorks(works);

  document.getElementById('workerName').value = '';
  document.getElementById('ownerName').value = '';
  document.getElementById('address').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('pricePerDay').value = '';

  renderWorkList();
}

// Show all work sessions
function renderWorkList() {
  const works = getWorks();
  const listDiv = document.getElementById('workList');
  listDiv.innerHTML = '';
  if(works.length === 0) {
    listDiv.innerHTML = '<p>No work schedules. Add one above!</p>';
    return;
  }
  works.forEach(work => {
    const statColor = work.status === 'completed' ? 'style="color:green;"':'';
    const el = document.createElement('div');
    el.className = 'attendance-row';
    el.innerHTML = `
      <span>
        <strong ${statColor}>${work.ownerName} (${work.address})</strong>
        <br/>
        <small>Started: ${work.startDate}, Status: ${work.status}</small>
      </span>
      <button onclick="viewWorkDetail(${work.id})">View / Update</button>
    `;
    listDiv.appendChild(el);
  });
}

// View/Update a specific work session
let currentWorkID = null;

function viewWorkDetail(id) {
  currentWorkID = id;
  document.getElementById('work-list-section').classList.add('hidden');
  document.getElementById('work-detail-section').classList.remove('hidden');
  renderWorkDetail();
}

function closeWorkDetail() {
  currentWorkID = null;
  document.getElementById('work-detail-section').classList.add('hidden');
  document.getElementById('work-list-section').classList.remove('hidden');
  renderWorkList();
}

// Add attendance for today
function markAttendance(status) {
  if (currentWorkID == null) return;
  const works = getWorks();
  const work = works.find(w => w.id === currentWorkID);
  if(!work) return;

  const today = new Date().toISOString().substr(0,10);
  if(work.attendance.find(a => a.date === today)) {
    alert('Today already marked!');
    return;
  }
  work.attendance.push({date: today, status}); // status: 'present' or 'absent'
  saveWorks(works);
  renderWorkDetail();
}

// Mark work as completed, show report
function completeWork() {
  if (currentWorkID == null) return;
  const works = getWorks();
  const work = works.find(w => w.id === currentWorkID);
  if (!work) return;
  work.status = 'completed';
  work.endDate = new Date().toISOString().substr(0,10);
  saveWorks(works);
  renderWorkDetail();
}

// function renderWorkDetail() {
//   const works = getWorks();
//   const work = works.find(w => w.id === currentWorkID);
//   if(!work) return;
//   let html = `
//     <h2>Work Schedule: ${work.ownerName} (${work.address})</h2>
//     <div>
//       <strong>Worker</strong>: ${work.workerName}<br>
//       <strong>Owner</strong>: ${work.ownerName}<br>
//       <strong>Address</strong>: ${work.address}<br>
//       <strong>Started On</strong>: ${work.startDate}<br>
//       <strong>Price/Day</strong>: ₹${work.pricePerDay}<br>
//       <strong>Status</strong>: <span ${work.status==='completed'?'style="color:green;"':''}>${work.status.toUpperCase()}</span>
//       <br/>
//     </div>
//   `;

// -- Add this helper for date string formatting --
function pad(n) { return n < 10 ? '0' + n : n; }
function toISO(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

// Call this to add or update attendance for any date:
function setAttendanceForDate(date, status) {
  if (currentWorkID == null) return;
  const works = getWorks();
  const work = works.find(w => w.id === currentWorkID);
  if (!work) return;
  let entry = work.attendance.find(a => a.date === date);
  if (entry) {
    entry.status = status;
  } else {
    work.attendance.push({ date, status });
    // Optional: sort by date descending
    work.attendance.sort((a, b) => a.date.localeCompare(b.date));
  }
  saveWorks(works);
  renderWorkDetail();
}

function deleteAttendanceForDate(date) {
  if (currentWorkID == null) return;
  const works = getWorks();
  const work = works.find(w => w.id === currentWorkID);
  if (!work) return;
  work.attendance = work.attendance.filter(a => a.date !== date);
  saveWorks(works);
  renderWorkDetail();
}

function renderWorkDetail() {
  const works = getWorks();
  const work = works.find(w => w.id === currentWorkID);
  if (!work) return;

  let html = `
    <h2>Work Schedule: ${work.ownerName} (${work.address})</h2>
    <div>
      <strong>Worker</strong>: ${work.workerName}<br>
      <strong>Owner</strong>: ${work.ownerName}<br>
      <strong>Address</strong>: ${work.address}<br>
      <strong>Started On</strong>: ${work.startDate}<br>
      <strong>Price/Day</strong>: ₹${work.pricePerDay}<br>
      <strong>Status</strong>: <span ${work.status==='completed'?'style="color:green;"':''}>${work.status.toUpperCase()}</span>
      <br/>
    </div>
  `;

  // ---- NEW: Manual attendance entry ----
  if (work.status === 'active') {
    html += `
      <div style="margin-top:15px; margin-bottom:10px; background: #f9f7ff; padding:15px; border-radius: 8px;">
        <label><strong>Add/Edit Attendance: </strong></label><br>
        <input type="date" id="attendanceDate" value="${toISO(new Date())}" />
        <select id="attendanceStatus">
          <option value="present">Present</option>
          <option value="absent">Absent</option>
        </select>
        <button onclick="manualAttendance()">Save Attendance</button>
      </div>
    `;
  }

  // ---- Attendance Table (with edit/delete) ----
  html += `
    <h3>Attendance</h3>
    <div>
      ${
        work.attendance.length > 0 ?
        work.attendance.map((a, i) => `
          <div class="attendance-row">
            <span>${i+1}. ${a.date}</span>
            <span class="${a.status}">${a.status}</span>
            <span>${a.status==='present' ? '₹' + work.pricePerDay : '₹0'}</span>
            ${work.status === 'active'
              ? `<button style="margin-left:12px;background:#d55;" onclick="deleteAttendanceForDate('${a.date}')">Delete</button>`
              : ""}
          </div>
        `).join('') :
        '<p>No attendance data yet.</p>'
      }
    </div>
  `;

  if(work.status === 'active') {
    html += `<button style="margin-top:10px;background:green;" onclick="completeWork()">Mark Completed & Show Report</button>`;
  }

  // Show summary if completed
  if(work.status === 'completed') {
    const presentDays = work.attendance.filter(a => a.status === 'present').length;
    const absentDays = work.attendance.filter(a => a.status === 'absent').length;
    const amount = presentDays * work.pricePerDay;
    html += `
      <div class="report-section">
        <h3>Completed Report</h3>
        <p>
          <strong>Started:</strong> ${work.startDate}<br/>
          <strong>Completed:</strong> ${work.endDate || ''}<br/>
          <strong>Total Days Present:</strong> ${presentDays}<br/>
          <strong>Total Days Absent:</strong> ${absentDays}<br/>
          <strong>Total Amount:</strong> ₹${amount}
        </p>
      </div>
    `;
  }

  document.getElementById('workDetail').innerHTML = html;
 }

  // --- Add this function globally in script.js ---
  function manualAttendance() {
    const dateValue = document.getElementById('attendanceDate').value;
    const statusValue = document.getElementById('attendanceStatus').value;
    if (!dateValue) return alert('Please select a date');
    setAttendanceForDate(dateValue, statusValue);
  }

  // Attendance marking only if not completed
  if(work.status === 'active') {
    html += `
      <div style="margin-top:15px;">
        <button onclick="markAttendance('present')" style="margin-right:7px;">Mark Present</button>
        <button onclick="markAttendance('absent')">Mark Absent</button>
      </div>
    `;
  }

  // Attendance details
  html += `
    <h3>Attendance</h3>
    <div>
      ${
        work.attendance.length > 0 ?
        work.attendance.map((a, i) => `
          <div class="attendance-row">
            <span>${i+1}. ${a.date}</span>
            <span class="${a.status}">${a.status}</span>
            <span>${a.status==='present' ? '₹' + work.pricePerDay : '₹0'}</span>
          </div>
        `).join('') :
        '<p>No attendance data yet.</p>'
      }
    </div>
  `;

  if(work.status === 'active') {
    html += `<button style="margin-top:10px;background:green;" onclick="completeWork()">Mark Completed & Show Report</button>`;
  }

  // Show summary if completed
  if(work.status === 'completed') {
    const presentDays = work.attendance.filter(a=>a.status==='present').length;
    const absentDays = work.attendance.filter(a=>a.status==='absent').length;
    const amount = presentDays * work.pricePerDay;
    html += `
      <div class="report-section">
        <h3>Completed Report</h3>
        <p>
          <strong>Started:</strong> ${work.startDate}<br/>
          <strong>Completed:</strong> ${work.endDate || ''}<br/>
          <strong>Total Days Present:</strong> ${presentDays}<br/>
          <strong>Total Days Absent:</strong> ${absentDays}<br/>
          <strong>Total Amount:</strong> ₹${amount}
        </p>
      </div>
    `;
  }

  document.getElementById('workDetail').innerHTML = html;


// === Session restore on reload ===

window.onload = function() {
  if(getUser()) {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('main-section').classList.remove('hidden');
    renderWorkList();
    showGreeting();
  }
}


// At top: Keep existing getUser(), setUser() code

// At bottom (or after window.onload):
function showGreeting() {
  const user = getUser();
  let username = "";
  if (user && user.email) {
    // Optionally, capture the name part before @ for username
    username = user.email.split('@')[0];
  }
  // Try to get real worker name from last session if one exists:
  const works = getWorks();
  if (works.length > 0 && works[0].workerName) {
    username = works[0].workerName;
  }
  // Show greeting only if username exists
  if (username) {
    const greetingDiv = document.getElementById('greeting');
    greetingDiv.textContent = `Welcome, ${username}!`;
    greetingDiv.classList.remove('hidden');
    // Animate slide-in
    setTimeout(() => greetingDiv.classList.add('show'), 150); // Start animation after a very short delay
  }
}










