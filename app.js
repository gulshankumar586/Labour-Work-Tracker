
/* ═══════════════════════════════════════════════
   WORKLEDGER — Production-Grade Labour Tracker
   Architecture: Modular Vanilla JS with clean separation
   ═══════════════════════════════════════════════ */

/* ─── Storage Layer ─── */
const Storage = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e) { console.error('Storage write failed:', e); return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};

/* ─── Auth Service ─── */
const Auth = {
  getCurrentUser() { return Storage.get('currentUser'); },
  login(email, password) {
    const users = Storage.get('wl_users', {});
    const user = users[email.toLowerCase()];
    if (!user) return { ok: false, error: 'No account found with this email.' };
    if (user.password !== password) return { ok: false, error: 'Incorrect password.' };
    Storage.set('currentUser', { email: user.email, name: user.name });
    return { ok: true, user };
  },
  register(name, email, password) {
    const users = Storage.get('wl_users', {});
    const key = email.toLowerCase();
    if (users[key]) return { ok: false, error: 'An account with this email already exists.' };
    users[key] = { name, email: key, password };
    Storage.set('wl_users', users);
    Storage.set('currentUser', { email: key, name });
    return { ok: true };
  },
  logout() { Storage.remove('currentUser'); }
};

/* ─── Work Session Service ─── */
const WorkService = {
  _key(email) { return `works_${email}`; },
  getAll(email) { return Storage.get(this._key(email), []); },
  save(email, works) { Storage.set(this._key(email), works); },
  add(email, work) {
    const works = this.getAll(email);
    const newWork = {
      id: `w_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      workerName: work.workerName,
      ownerName: work.ownerName,
      address: work.address,
      startDate: work.startDate,
      pricePerDay: Number(work.pricePerDay),
      status: 'active',
      attendance: [],
      createdAt: new Date().toISOString(),
      endDate: null
    };
    works.unshift(newWork);
    this.save(email, works);
    return newWork;
  },
  getById(email, id) { return this.getAll(email).find(w => w.id === id) || null; },
  update(email, id, updates) {
    const works = this.getAll(email);
    const idx = works.findIndex(w => w.id === id);
    if (idx === -1) return false;
    works[idx] = { ...works[idx], ...updates };
    this.save(email, works);
    return works[idx];
  },
  delete(email, id) {
    const works = this.getAll(email).filter(w => w.id !== id);
    this.save(email, works);
  },
  addAttendance(email, workId, date, status) {
    const works = this.getAll(email);
    const work = works.find(w => w.id === workId);
    if (!work) return { ok: false, error: 'Session not found.' };
    if (work.attendance.some(a => a.date === date))
      return { ok: false, error: 'Attendance already marked for this date.' };
    work.attendance.push({ date, status, id: `a_${Date.now()}` });
    work.attendance.sort((a, b) => b.date.localeCompare(a.date));
    this.save(email, works);
    return { ok: true };
  },
  updateAttendance(email, workId, attId, status) {
    const works = this.getAll(email);
    const work = works.find(w => w.id === workId);
    if (!work) return false;
    const att = work.attendance.find(a => a.id === attId);
    if (att) { att.status = status; this.save(email, works); return true; }
    return false;
  },
  deleteAttendance(email, workId, attId) {
    const works = this.getAll(email);
    const work = works.find(w => w.id === workId);
    if (!work) return false;
    work.attendance = work.attendance.filter(a => a.id !== attId);
    this.save(email, works);
    return true;
  },
  calcStats(work) {
    const present = work.attendance.filter(a => a.status === 'present').length;
    const absent = work.attendance.filter(a => a.status === 'absent').length;
    return { present, absent, total: work.attendance.length, earnings: present * work.pricePerDay };
  },
  complete(email, workId) {
    return this.update(email, workId, { status: 'completed', endDate: new Date().toISOString() });
  }
};

/* ─── UI Utilities ─── */
const UI = {
  $: id => document.getElementById(id),
  show: id => document.getElementById(id)?.classList.remove('hidden'),
  hide: id => document.getElementById(id)?.classList.add('hidden'),
  val: id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; },
  set: (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; },
  setHTML: (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; },
  showErr: (id, msg) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg; el.classList.remove('hidden');
  },
  clearErr: id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  },
  toast(msg, type = 'default', duration = 3000) {
    const cont = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${msg}</span>`;
    cont.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(16px)'; el.style.transition = 'all 0.3s'; setTimeout(() => el.remove(), 300); }, duration);
  }
};

const fmt = {
  date: d => { if (!d) return '—'; const [y,m,day] = d.split('-'); return `${day}/${m}/${y}`; },
  currency: n => `₹${Number(n).toLocaleString('en-IN')}`,
  dayName: d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' }); } catch { return ''; } },
  initials: name => name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0,2),
  greeting: () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }
};

/* ─── State ─── */
let currentWorkId = null;

/* ─── Auth Tab ─── */
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', isLogin ? i === 0 : i === 1);
  });
  UI.$('login-form').classList.toggle('hidden', !isLogin);
  UI.$('register-form').classList.toggle('hidden', isLogin);
  UI.$('auth-heading').textContent = isLogin ? 'Welcome back' : 'Create account';
  UI.$('auth-sub').textContent = isLogin ? 'Sign in to manage your work sessions' : 'Start tracking your labour today';
}

/* ─── Auth Handlers ─── */
function handleLogin() {
  const email = UI.val('login-email'), pass = UI.val('login-pass');
  ['login-email-err','login-pass-err','login-err'].forEach(UI.clearErr);
  let valid = true;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { UI.showErr('login-email-err', 'Enter a valid email address.'); valid = false; }
  if (!pass) { UI.showErr('login-pass-err', 'Password is required.'); valid = false; }
  if (!valid) return;
  const res = Auth.login(email, pass);
  if (!res.ok) { UI.showErr('login-err', res.error); return; }
  initApp();
}

function handleRegister() {
  const name = UI.val('reg-name'), email = UI.val('reg-email'), pass = UI.val('reg-pass');
  ['reg-name-err','reg-email-err','reg-pass-err','reg-err'].forEach(UI.clearErr);
  let valid = true;
  if (!name || name.length < 2) { UI.showErr('reg-name-err', 'Enter your full name.'); valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { UI.showErr('reg-email-err', 'Enter a valid email address.'); valid = false; }
  if (!pass || pass.length < 6) { UI.showErr('reg-pass-err', 'Password must be at least 6 characters.'); valid = false; }
  if (!valid) return;
  const res = Auth.register(name, email, pass);
  if (!res.ok) { UI.showErr('reg-err', res.error); return; }
  UI.toast('Account created! Welcome to WorkLedger.', 'success');
  initApp();
}

function handleLogout() {
  Auth.logout();
  UI.hide('app-screen');
  UI.show('auth-screen');
  UI.$('login-email').value = '';
  UI.$('login-pass').value = '';
  currentWorkId = null;
}

/* ─── App Init ─── */
function initApp() {
  const user = Auth.getCurrentUser();
  if (!user) return;
  UI.hide('auth-screen');
  UI.show('app-screen');

  // Set user UI
  const initials = fmt.initials(user.name);
  UI.setHTML('user-avatar', initials);
  UI.set('user-name-display', user.name.split(' ')[0]);
  UI.setHTML('greeting-avatar', initials);
  UI.$('user-avatar').style.background = stringToColor(user.name);
  UI.$('greeting-avatar').style.background = stringToColor(user.name);

  // Set today as default date
  const today = new Date().toISOString().split('T')[0];
  UI.$('att-date').value = today;
  UI.$('new-start').value = today;

  showSection('list');
}

function stringToColor(str) {
  const colors = ['#d4541e','#1a7a4a','#2563eb','#7c3aed','#b45309','#0f766e'];
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

/* ─── Section Navigation ─── */
function showSection(section) {
  ['section-list','section-new','section-detail'].forEach(s => {
    const el = UI.$(s);
    if (el) { el.classList.add('hidden'); }
  });

  const target = UI.$(`section-${section}`);
  if (target) { target.classList.remove('hidden'); target.classList.remove('section-animate'); void target.offsetWidth; target.classList.add('section-animate'); }

  if (section === 'list') renderWorkList();
  if (section === 'detail' && currentWorkId) renderDetail(currentWorkId);
}

/* ─── Work List ─── */
function renderWorkList() {
  const user = Auth.getCurrentUser();
  if (!user) return;
  const works = WorkService.getAll(user.email);
  const cont = UI.$('works-list');
  const active = works.filter(w => w.status === 'active').length;

  // Greeting
  UI.set('greeting-hi', `${fmt.greeting()}, ${user.name.split(' ')[0]}!`);
  UI.set('greeting-sub', active > 0 ? `You have ${active} active work session${active > 1 ? 's' : ''}.` : 'No active sessions. Start a new one!');
  UI.set('session-count-sub', `${works.length} total session${works.length !== 1 ? 's' : ''} — ${active} active`);

  if (!works.length) {
    cont.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-title">No sessions yet</div>
      <div class="empty-desc">Create your first work session to start tracking attendance and earnings.</div>
      <button class="btn btn-primary" onclick="showSection('new')">Create First Session</button>
    </div>`;
    return;
  }

  cont.innerHTML = works.map(work => {
    const stats = WorkService.calcStats(work);
    return `<div class="work-card" onclick="openWork('${work.id}')">
      <div>
        <div class="work-card-name">${esc(work.workerName)}</div>
        <div class="work-card-meta">
          <div class="work-card-meta-item">Owner: <strong>${esc(work.ownerName)}</strong></div>
          <div class="work-card-meta-item">📍 ${esc(work.address)}</div>
          <div class="work-card-meta-item">From ${fmt.date(work.startDate)}</div>
          <div class="work-card-meta-item">${fmt.currency(work.pricePerDay)}/day</div>
        </div>
      </div>
      <div class="work-card-right">
        <span class="badge ${work.status === 'active' ? 'badge-active' : 'badge-completed'}">
          <span class="badge-dot"></span>
          ${work.status === 'active' ? 'Active' : 'Completed'}
        </span>
        <div class="work-earnings" style="margin-top:8px;">${fmt.currency(stats.earnings)}</div>
        <div class="work-days">${stats.present} present · ${stats.absent} absent</div>
      </div>
    </div>`;
  }).join('');
}

function openWork(id) {
  currentWorkId = id;
  showSection('detail');
}

/* ─── New Work ─── */
function createWork() {
  const user = Auth.getCurrentUser();
  if (!user) return;
  const worker = UI.val('new-worker'), owner = UI.val('new-owner'),
        address = UI.val('new-address'), start = UI.val('new-start'), price = UI.val('new-price');
  ['new-worker','new-owner','new-address','new-start','new-price'].forEach(f => UI.clearErr(`${f}-err`));
  let valid = true;
  if (!worker) { UI.showErr('new-worker-err', 'Worker name is required.'); valid = false; }
  if (!owner) { UI.showErr('new-owner-err', 'Owner name is required.'); valid = false; }
  if (!address) { UI.showErr('new-address-err', 'Address is required.'); valid = false; }
  if (!start) { UI.showErr('new-start-err', 'Start date is required.'); valid = false; }
  if (!price || isNaN(price) || Number(price) <= 0) { UI.showErr('new-price-err', 'Enter a valid price per day.'); valid = false; }
  if (!valid) return;
  const work = WorkService.add(user.email, { workerName: worker, ownerName: owner, address, startDate: start, pricePerDay: price });
  UI.toast('Work session created!', 'success');
  currentWorkId = work.id;
  showSection('detail');
}

/* ─── Work Detail ─── */
function renderDetail(id) {
  const user = Auth.getCurrentUser();
  if (!user) return;
  const work = WorkService.getById(user.email, id);
  if (!work) { showSection('list'); return; }
  const stats = WorkService.calcStats(work);
  const isActive = work.status === 'active';

  UI.set('detail-breadcrumb', work.workerName);
  UI.set('detail-name', work.workerName);
  UI.set('detail-owner', work.ownerName);
  UI.set('detail-address', work.address);
  UI.set('detail-start', fmt.date(work.startDate));
  UI.set('detail-price', fmt.currency(work.pricePerDay));
  UI.setHTML('detail-status-badge', `<span class="badge-dot"></span> ${isActive ? 'Active' : 'Completed'}`, );
  UI.$('detail-status-badge').className = `badge ${isActive ? 'badge-active' : 'badge-completed'}`;

  UI.set('stat-days', stats.total);
  UI.set('stat-present', stats.present);
  UI.set('stat-absent', stats.absent);
  UI.set('stat-earnings', fmt.currency(stats.earnings));

  // Action buttons
  const actionsEl = UI.$('detail-actions');
  if (isActive) {
    actionsEl.innerHTML = `
      <button class="btn btn-success btn-sm" onclick="showCompleteModal()">Mark as Complete</button>
      <button class="btn btn-ghost btn-sm" onclick="showDeleteModal()">Delete Session</button>
    `;
  } else {
    actionsEl.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="showDeleteModal()">Delete Session</button>`;
  }

  // Report section
  if (!isActive) {
    UI.show('report-section');
    UI.set('report-amount', stats.earnings.toLocaleString('en-IN'));
    UI.set('report-present', stats.present);
    UI.set('report-absent', stats.absent);
    UI.set('report-rate', fmt.currency(work.pricePerDay));
    const endStr = work.endDate ? new Date(work.endDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' }) : '';
    UI.set('report-period', `${fmt.date(work.startDate)} — ${endStr}`);
  } else {
    UI.hide('report-section');
  }

  // Add attendance visibility
  if (isActive) { UI.show('add-attendance-row'); } else { UI.hide('add-attendance-row'); }

  renderAttendanceList(work, isActive);
}

function renderAttendanceList(work, isActive) {
  const list = UI.$('attendance-list');
  const count = work.attendance.length;
  UI.setHTML('attendance-count-badge', count > 0 ? `<span class="badge badge-active">${count} entries</span>` : '');

  if (!count) {
    list.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--ink-muted); font-size:14px;">No attendance records yet.</div>`;
    return;
  }

  list.innerHTML = work.attendance.map(att => `
    <div class="attendance-row">
      <div>
        <div class="attendance-date">${fmt.date(att.date)}</div>
        <div class="attendance-day">${fmt.dayName(att.date)}</div>
      </div>
      <div class="attendance-actions">
        ${isActive ? `
        <div class="toggle-btn">
          <button class="toggle-opt ${att.status === 'present' ? 'active present' : ''}" onclick="toggleAtt('${att.id}','present')">Present</button>
          <button class="toggle-opt ${att.status === 'absent' ? 'active absent' : ''}" onclick="toggleAtt('${att.id}','absent')">Absent</button>
        </div>
        <button class="icon-btn" onclick="removeAtt('${att.id}')" title="Delete">✕</button>
        ` : `<span class="badge ${att.status === 'present' ? 'badge-present' : 'badge-absent'}">${att.status === 'present' ? 'Present' : 'Absent'}</span>`}
      </div>
    </div>
  `).join('');
}

function addAttendance() {
  const user = Auth.getCurrentUser();
  if (!user || !currentWorkId) return;
  const date = UI.$('att-date').value;
  const status = UI.$('att-status').value;
  if (!date) { UI.toast('Please select a date.', 'error'); return; }
  const res = WorkService.addAttendance(user.email, currentWorkId, date, status);
  if (!res.ok) { UI.toast(res.error, 'error'); return; }
  UI.toast(`${status === 'present' ? 'Present' : 'Absent'} marked for ${fmt.date(date)}.`, 'success');
  renderDetail(currentWorkId);
}

function toggleAtt(attId, newStatus) {
  const user = Auth.getCurrentUser();
  if (!user || !currentWorkId) return;
  WorkService.updateAttendance(user.email, currentWorkId, attId, newStatus);
  renderDetail(currentWorkId);
}

function removeAtt(attId) {
  const user = Auth.getCurrentUser();
  if (!user || !currentWorkId) return;
  WorkService.deleteAttendance(user.email, currentWorkId, attId);
  UI.toast('Attendance entry removed.', 'default');
  renderDetail(currentWorkId);
}

/* ─── Modals ─── */
function showCompleteModal() {
  const user = Auth.getCurrentUser();
  if (!user || !currentWorkId) return;
  const work = WorkService.getById(user.email, currentWorkId);
  if (!work) return;
  const stats = WorkService.calcStats(work);
  UI.set('cp-present', stats.present);
  UI.set('cp-absent', stats.absent);
  UI.set('cp-earnings', fmt.currency(stats.earnings));
  UI.show('modal-complete');
}

function showDeleteModal() { UI.show('modal-delete'); }
function closeModal(id) { UI.hide(id); }

function confirmComplete() {
  const user = Auth.getCurrentUser();
  if (!user || !currentWorkId) return;
  WorkService.complete(user.email, currentWorkId);
  closeModal('modal-complete');
  UI.toast('Work session completed!', 'success');
  renderDetail(currentWorkId);
}

function confirmDelete() {
  const user = Auth.getCurrentUser();
  if (!user || !currentWorkId) return;
  WorkService.delete(user.email, currentWorkId);
  closeModal('modal-delete');
  UI.toast('Session deleted.', 'default');
  currentWorkId = null;
  showSection('list');
}

/* ─── Helpers ─── */
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Keyboard shortcuts ─── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['modal-complete','modal-delete'].forEach(closeModal);
  }
});

/* ─── Enter key on auth ─── */
['login-email','login-pass'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
});
['reg-name','reg-email','reg-pass'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });
});

/* ─── Bootstrap ─── */
(function init() {
  const user = Auth.getCurrentUser();
  if (user) { initApp(); }
  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  const startEl = document.getElementById('new-start');
  const attEl = document.getElementById('att-date');
  if (startEl) startEl.value = today;
  if (attEl) attEl.value = today;
})();