// developer.js — Logic for the Developer Dashboard
'use strict';

// --- Auth guard ---
if (!requireRole('DEVELOPER')) { /* redirected */ }
else { init(); }

let allClubs = [];
let currentSection = 'dashboard';

async function init() {
  document.getElementById('user-name').textContent = getUserName() || 'Developer';
  document.getElementById('user-avatar').textContent = (getUserName() || 'D')[0].toUpperCase();
  await loadDashboard();
  setupForms();
}

// ============================================================
// Section switching
// ============================================================
function showSection(name) {
  document.querySelectorAll('[id^="section-"]').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const section = document.getElementById(`section-${name}`);
  if (section) section.style.display = '';

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.textContent.toLowerCase().includes(name)) item.classList.add('active');
  });

  currentSection = name;

  const titleMap = {
    dashboard: ['Dashboard Overview', 'Full system access'],
    clubs:     ['Clubs Management', 'Add, edit and delete clubs'],
    events:    ['Events Management', 'Manage all events'],
    users:        ['User Management', 'Create, edit and manage user accounts'],
    faculty:      ['Faculty Management', 'Manage faculty members and advisors'],
    'site-content': ['Website Content & Branding', 'Administer institutional branding, hero banner, and announcement ticker'],
  };
  const [title, sub] = titleMap[name] || ['Dashboard', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = sub;

  const actionBtn = document.getElementById('primary-action-btn');
  if (actionBtn) {
    if (['clubs', 'events', 'users', 'faculty'].includes(name)) {
      actionBtn.style.display = 'inline-block';
      actionBtn.textContent = name === 'clubs' ? '+ Add Club' : (name === 'events' ? '+ Add Event' : (name === 'users' ? '+ Add User' : '+ Add Faculty'));
    } else {
      actionBtn.style.display = 'none';
    }
  }

  switch (name) {
    case 'clubs':        loadClubs();        break;
    case 'events':       loadEvents();       break;
    case 'users':        loadUsers();        break;
    case 'faculty':      loadFaculty();      break;
    case 'site-content': loadSiteSettings(); break;
  }
}

function openCreateModal() {
  if (currentSection === 'clubs') openAddClubModal();
  else if (currentSection === 'events') openAddEventModal();
  else if (currentSection === 'users') openAddUserModal();
  else if (currentSection === 'faculty') openAddFacultyModal();
}
window.openCreateModal = openCreateModal;

// ============================================================
// Dashboard stats
// ============================================================
async function loadDashboard() {
  try {
    const [clubs, events, users, faculty] = await Promise.all([
      apiFetch('/api/clubs'),
      apiFetch('/api/events'),
      apiFetch('/api/users'),
      apiFetch('/api/faculty'),
    ]);
    allClubs = clubs;
    document.getElementById('stat-clubs').textContent   = clubs.length;
    document.getElementById('stat-events').textContent  = events.length;
    document.getElementById('stat-users').textContent   = users.length;
    document.getElementById('stat-faculty').textContent = faculty.length;

    // Recent 5 events
    const recent = events.slice(-5).reverse();
    document.getElementById('recent-events-list').innerHTML = recent.length
      ? `<div class="table-wrapper"><table>
          <thead><tr><th>Title</th><th>Club</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>${recent.map(e => `
            <tr>
              <td>${e.title}</td>
              <td>${e.club?.name || '—'}</td>
              <td>${formatDate(e.date)}</td>
              <td>${statusBadge(e.status)}</td>
            </tr>`).join('')}
          </tbody></table></div>`
      : '<div class="empty-state"><div class="empty-icon">📅</div><p>No events yet</p></div>';
  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
}

// ============================================================
// Clubs
// ============================================================
async function loadClubs() {
  try {
    allClubs = await apiFetch('/api/clubs');
    const tbody = document.getElementById('clubs-tbody');
    tbody.innerHTML = allClubs.length
      ? allClubs.map((c, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${c.name}</td>
            <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.description || '—'}</td>
            <td>${formatDate(c.createdAt)}</td>
            <td class="table-actions">
              <button class="btn btn-secondary btn-sm btn-icon" onclick="editClub(${c.id})">✏️</button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="deleteClub(${c.id})">🗑</button>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🏛</div><p>No clubs yet</p></div></td></tr>';
  } catch (err) {
    showToast('Failed to load clubs: ' + err.message, 'error');
  }
}

function editClub(id) {
  const club = allClubs.find(c => c.id === id);
  if (!club) return;
  document.getElementById('club-id').value = id;
  document.getElementById('club-name').value = club.name || '';
  document.getElementById('club-description').value = club.description || '';
  document.getElementById('club-category').value = club.category || '';
  document.getElementById('club-logo').value = club.logo || '';
  document.getElementById('club-banner-url').value = club.bannerUrl || '';
  document.getElementById('club-faculty-name').value = club.facultyCoordinatorName || '';
  document.getElementById('club-faculty-email').value = club.facultyCoordinatorEmail || '';
  document.getElementById('club-student-name').value = club.studentCoordinatorName || '';
  document.getElementById('club-student-email').value = club.studentCoordinatorEmail || '';
  document.getElementById('club-schedule').value = club.meetingSchedule || '';
  document.getElementById('club-venue').value = club.venue || '';
  document.getElementById('club-eligibility').value = club.eligibility || '';
  document.getElementById('club-detailed-description').value = club.detailedDescription || '';
  document.getElementById('club-modal-title').textContent = 'Edit Club';
  openModal('club-modal');
}

async function deleteClub(id) {
  if (!confirm('Delete this club? This will also remove all its events.')) return;
  try {
    await apiFetch(`/api/clubs/${id}`, { method: 'DELETE' });
    showToast('Club deleted.', 'success');
    loadClubs();
    loadDashboard();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ============================================================
// Events
// ============================================================
async function loadEvents() {
  try {
    const events = await apiFetch('/api/events');
    const tbody = document.getElementById('events-tbody');
    tbody.innerHTML = events.length
      ? events.map((e, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${e.title}</td>
            <td>${e.club?.name || '—'}</td>
            <td>${formatDate(e.date)}</td>
            <td>${e.venue || '—'}</td>
            <td>${statusBadge(e.status)}</td>
            <td class="table-actions">
              <button class="btn btn-secondary btn-sm btn-icon" onclick="editEvent(${e.id})">✏️</button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="deleteEvent(${e.id})">🗑</button>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📅</div><p>No events yet</p></div></td></tr>';
  } catch (err) {
    showToast('Failed to load events: ' + err.message, 'error');
  }
}

let editingEventId = null;

async function editEvent(id) {
  try {
    const e = await apiFetch(`/api/events/${id}`);
    editingEventId = id;
    document.getElementById('event-id').value = id;
    document.getElementById('event-title').value = e.title;
    document.getElementById('event-date').value = e.date;
    document.getElementById('event-time').value = e.time || '';
    document.getElementById('event-venue').value = e.venue || '';
    document.getElementById('event-description').value = e.description || '';
    await populateClubSelect('event-club');
    document.getElementById('event-club').value = e.club?.id || '';
    document.getElementById('event-modal-title').textContent = 'Edit Event';
    openModal('event-modal');
  } catch (err) {
    showToast('Failed to load event: ' + err.message, 'error');
  }
}

async function deleteEvent(id) {
  if (!confirm('Delete this event permanently?')) return;
  try {
    await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
    showToast('Event deleted.', 'success');
    loadEvents();
    loadDashboard();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ============================================================
// Users
// ============================================================
let allUsers = [];

async function loadUsers() {
  try {
    allUsers = await apiFetch('/api/users');
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = allUsers.length
      ? allUsers.map((u, i) => {
          const studentInfo = u.usn
            ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${u.usn}${u.department ? ' • ' + u.department : ''}${u.yearOfStudy ? ' • Yr' + u.yearOfStudy : ''}</div>`
            : '';
          const mobile = u.mobileNumber
            ? `<div style="font-size:0.72rem; color:var(--text-muted);">${u.mobileNumber}</div>`
            : '';
          return `
          <tr>
            <td>${i + 1}</td>
            <td>
              <div style="font-weight:600;">${u.name}</div>
              ${studentInfo}
            </td>
            <td style="color:var(--text-muted);">
              ${u.email}
              ${mobile}
            </td>
            <td>${roleBadge(u.role)}</td>
            <td>${u.club?.name || '—'}</td>
            <td><span class="badge ${u.enabled ? 'badge-green' : 'badge-red'}">${u.enabled ? 'Active' : 'Disabled'}</span></td>
            <td class="table-actions">
              <button class="btn btn-secondary btn-sm btn-icon" onclick="editUser(${u.id})" title="Edit User">✏️</button>
              <button class="btn btn-secondary btn-sm" onclick="toggleUser(${u.id})">${u.enabled ? 'Disable' : 'Enable'}</button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="deleteUser(${u.id})" title="Delete">🗑</button>
            </td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div><p>No users yet</p></div></td></tr>';
  } catch (err) {
    showToast('Failed to load users: ' + err.message, 'error');
  }
}

function editUser(id) {
  const u = allUsers.find(x => x.id === id);
  if (!u) return;
  document.getElementById('edit-user-id').value = id;
  document.getElementById('edit-user-name').value = u.name || '';
  document.getElementById('edit-user-email').value = u.email || '';
  document.getElementById('edit-user-role').value = u.role || 'USER';
  document.getElementById('edit-user-usn').value = u.usn || '';
  document.getElementById('edit-user-mobile').value = u.mobileNumber || '';
  document.getElementById('edit-user-year').value = u.yearOfStudy || '';
  document.getElementById('edit-user-dept').value = u.department || '';
  // Club assignment for coordinator
  const clubWrap = document.getElementById('edit-user-club-wrap');
  if (u.role === 'COORDINATOR') {
    clubWrap.style.display = '';
    populateClubSelect('edit-user-club');
    document.getElementById('edit-user-club').value = u.club?.id || '';
  } else {
    clubWrap.style.display = 'none';
  }
  document.getElementById('edit-user-modal-title').textContent = `Edit User — ${u.name}`;
  openModal('user-edit-modal');
}

document.addEventListener('DOMContentLoaded', () => {
  const roleSelect = document.getElementById('edit-user-role');
  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      const clubWrap = document.getElementById('edit-user-club-wrap');
      if (roleSelect.value === 'COORDINATOR') {
        clubWrap.style.display = '';
        populateClubSelect('edit-user-club');
      } else {
        clubWrap.style.display = 'none';
      }
    });
  }
});

async function toggleUser(id) {
  try {
    await apiFetch(`/api/users/${id}/toggle`, { method: 'PATCH' });
    showToast('User status updated.', 'success');
    loadUsers();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Delete this user account?')) return;
  try {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    showToast('User deleted.', 'success');
    loadUsers();
    loadDashboard();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

function toggleClubField() {
  const role = document.getElementById('new-user-role').value;
  document.getElementById('club-field').style.display = role === 'COORDINATOR' ? '' : 'none';
  if (role === 'COORDINATOR') populateClubSelect('new-user-club');
}

// ============================================================
// Faculty
// ============================================================
let allFaculty = [];

async function loadFaculty() {
  try {
    const fac = await apiFetch('/api/faculty');
    allFaculty = fac;
    const tbody = document.getElementById('faculty-tbody');
    tbody.innerHTML = fac.length
      ? fac.map((f, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${f.name}</strong></td>
            <td style="color:var(--text-muted);">${f.email}</td>
            <td>${f.department || '—'}</td>
            <td>${f.designation || '—'}</td>
            <td class="table-actions">
              <button class="btn btn-secondary btn-sm btn-icon" onclick="editFaculty(${f.id})" title="Edit Faculty">✏️</button>
              <button class="btn btn-danger btn-sm btn-icon" onclick="deleteFaculty(${f.id})" title="Delete">🗑</button>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🎓</div><p>No faculty yet</p></div></td></tr>';
  } catch (err) {
    showToast('Failed to load faculty: ' + err.message, 'error');
  }
}

function editFaculty(id) {
  const f = allFaculty.find(x => x.id === id);
  if (!f) return;
  document.getElementById('edit-fac-id').value = id;
  document.getElementById('edit-fac-name').value = f.name || '';
  document.getElementById('edit-fac-email').value = f.email || '';
  document.getElementById('edit-fac-dept').value = f.department || '';
  document.getElementById('edit-fac-designation').value = f.designation || '';
  openModal('faculty-edit-modal');
}

async function deleteFaculty(id) {
  if (!confirm('Remove this faculty member?')) return;
  try {
    await apiFetch(`/api/faculty/${id}`, { method: 'DELETE' });
    showToast('Faculty removed.', 'success');
    loadFaculty();
    loadDashboard();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ============================================================
// Site Settings & Content
// ============================================================
async function loadSiteSettings() {
  try {
    const s = await apiFetch('/api/site-settings');
    if (!s) return;
    document.getElementById('setting-college-name').value = s.collegeName || '';
    document.getElementById('setting-tagline').value = s.tagline || '';
    document.getElementById('setting-hero-title').value = s.heroTitle || '';
    document.getElementById('setting-hero-subtitle').value = s.heroSubtitle || '';
    document.getElementById('setting-announcement-text').value = s.announcementText || '';
    document.getElementById('setting-contact-email').value = s.contactEmail || '';
    document.getElementById('setting-contact-phone').value = s.contactPhone || '';
    document.getElementById('setting-footer-text').value = s.footerText || '';
  } catch (err) {
    console.warn('Could not load site settings:', err);
  }
}

// ============================================================
// Modal helpers
// ============================================================
function openModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.add('show'); 
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const el = (typeof id === 'string') ? document.getElementById(id) : id;
  if (el) el.classList.remove('show');
  const openModals = document.querySelectorAll('.modal-overlay.show');
  if (openModals.length === 0) {
    document.body.style.overflow = '';
  }
  editingEventId = null;
  // Reset club form fields
  const clubIdEl = document.getElementById('club-id');
  if (clubIdEl) clubIdEl.value = '';
  const clubTitleEl = document.getElementById('club-modal-title');
  if (clubTitleEl) clubTitleEl.textContent = 'Add New Club';
  // Clear all new detailed fields if present
  ['club-name','club-description','club-category','club-logo','club-banner-url',
   'club-faculty-name','club-faculty-email','club-student-name','club-student-email',
   'club-schedule','club-venue','club-eligibility','club-detailed-description'
  ].forEach(fid => {
    const el = document.getElementById(fid);
    if (el) el.value = '';
  });
  const eventTitleEl = document.getElementById('event-modal-title');
  if (eventTitleEl) eventTitleEl.textContent = 'Add New Event';
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
});

async function populateClubSelect(selectId) {
  if (!allClubs.length) allClubs = await apiFetch('/api/clubs');
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">Select Club</option>' +
    allClubs.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// ============================================================
// Form submissions
// ============================================================
function setupForms() {
  // Club form
  document.getElementById('club-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('club-id').value;
    const body = {
      name: document.getElementById('club-name').value.trim(),
      description: document.getElementById('club-description').value.trim(),
      category: document.getElementById('club-category').value.trim(),
      logo: document.getElementById('club-logo').value.trim(),
      bannerUrl: document.getElementById('club-banner-url').value.trim(),
      facultyCoordinatorName: document.getElementById('club-faculty-name').value.trim(),
      facultyCoordinatorEmail: document.getElementById('club-faculty-email').value.trim(),
      studentCoordinatorName: document.getElementById('club-student-name').value.trim(),
      studentCoordinatorEmail: document.getElementById('club-student-email').value.trim(),
      meetingSchedule: document.getElementById('club-schedule').value.trim(),
      venue: document.getElementById('club-venue').value.trim(),
      eligibility: document.getElementById('club-eligibility').value.trim(),
      detailedDescription: document.getElementById('club-detailed-description').value.trim(),
    };
    try {
      if (id) {
        await apiFetch(`/api/clubs/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast('Club updated!', 'success');
      } else {
        await apiFetch('/api/clubs', { method: 'POST', body: JSON.stringify(body) });
        showToast('Club created!', 'success');
      }
      closeModal('club-modal');
      loadClubs();
      loadDashboard();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  });

  // Event form
  document.getElementById('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editingEventId;
    const body = {
      title:       document.getElementById('event-title').value.trim(),
      date:        document.getElementById('event-date').value,
      time:        document.getElementById('event-time').value || null,
      venue:       document.getElementById('event-venue').value.trim(),
      clubId:      parseInt(document.getElementById('event-club').value),
      description: document.getElementById('event-description').value.trim(),
    };
    try {
      if (id) {
        await apiFetch(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast('Event updated!', 'success');
      } else {
        await apiFetch('/api/events', { method: 'POST', body: JSON.stringify(body) });
        showToast('Event created!', 'success');
      }
      closeModal('event-modal');
      loadEvents();
      loadDashboard();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  });

  // Pre-populate club select when opening event modal
  document.getElementById('event-modal').addEventListener('click', async () => {
    if (!document.getElementById('event-club').options.length) {
      await populateClubSelect('event-club');
    }
  }, { once: false });

  // User form
  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const role  = document.getElementById('new-user-role').value;
    const clubId = role === 'COORDINATOR' ? parseInt(document.getElementById('new-user-club').value) : null;
    const body = {
      name:     document.getElementById('new-user-name').value.trim(),
      email:    document.getElementById('new-user-email').value.trim(),
      password: document.getElementById('new-user-password').value,
      role, clubId,
    };
    try {
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(body) });
      showToast('User created!', 'success');
      closeModal('user-modal');
      loadUsers();
      loadDashboard();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  });

  // Faculty form
  document.getElementById('faculty-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name:        document.getElementById('fac-name').value.trim(),
      email:       document.getElementById('fac-email').value.trim(),
      department:  document.getElementById('fac-dept').value.trim(),
      designation: document.getElementById('fac-designation').value.trim(),
    };
    try {
      await apiFetch('/api/faculty', { method: 'POST', body: JSON.stringify(body) });
      showToast('Faculty added!', 'success');
      closeModal('faculty-modal');
      loadFaculty();
      loadDashboard();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  });

  // User Edit form
  const userEditForm = document.getElementById('user-edit-form');
  if (userEditForm) {
    userEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-user-id').value;
      const role = document.getElementById('edit-user-role').value;
      const clubVal = document.getElementById('edit-user-club').value;
      const yearVal = document.getElementById('edit-user-year').value;
      const pwdVal = document.getElementById('edit-user-password').value;

      const body = {
        name: document.getElementById('edit-user-name').value.trim(),
        email: document.getElementById('edit-user-email').value.trim(),
        role: role,
        clubId: role === 'COORDINATOR' && clubVal ? parseInt(clubVal) : null,
        usn: document.getElementById('edit-user-usn').value.trim(),
        mobileNumber: document.getElementById('edit-user-mobile').value.trim(),
        yearOfStudy: yearVal ? parseInt(yearVal) : null,
        department: document.getElementById('edit-user-dept').value.trim(),
      };
      if (pwdVal && pwdVal.trim().length > 0) {
        body.password = pwdVal.trim();
      }

      try {
        await apiFetch(`/api/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
        showToast('User account updated successfully!', 'success');
        closeModal('user-edit-modal');
        loadUsers();
      } catch (err) {
        showToast('Update failed: ' + err.message, 'error');
      }
    });
  }

  // Faculty Edit form
  const facultyEditForm = document.getElementById('faculty-edit-form');
  if (facultyEditForm) {
    facultyEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-fac-id').value;
      const body = {
        name: document.getElementById('edit-fac-name').value.trim(),
        email: document.getElementById('edit-fac-email').value.trim(),
        department: document.getElementById('edit-fac-dept').value.trim(),
        designation: document.getElementById('edit-fac-designation').value.trim(),
      };
      try {
        await apiFetch(`/api/faculty/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
        showToast('Faculty member updated successfully!', 'success');
        closeModal('faculty-edit-modal');
        loadFaculty();
      } catch (err) {
        showToast('Update failed: ' + err.message, 'error');
      }
    });
  }

  // Site Settings form
  const siteSettingsForm = document.getElementById('site-settings-form');
  if (siteSettingsForm) {
    siteSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        collegeName: document.getElementById('setting-college-name').value.trim(),
        tagline: document.getElementById('setting-tagline').value.trim(),
        heroTitle: document.getElementById('setting-hero-title').value.trim(),
        heroSubtitle: document.getElementById('setting-hero-subtitle').value.trim(),
        announcementText: document.getElementById('setting-announcement-text').value.trim(),
        contactEmail: document.getElementById('setting-contact-email').value.trim(),
        contactPhone: document.getElementById('setting-contact-phone').value.trim(),
        footerText: document.getElementById('setting-footer-text').value.trim(),
        bannerAlertEnabled: true
      };
      try {
        await apiFetch('/api/site-settings', {
          method: 'PUT',
          body: JSON.stringify(body)
        });
        showToast('Website content updated successfully! Live on campus hub.', 'success');
      } catch (err) {
        showToast('Failed to save settings: ' + err.message, 'error');
      }
    });
  }
}
