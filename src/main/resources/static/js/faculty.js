// faculty.js — Logic for Faculty Coordinator Dashboard & Event Review & Judging
'use strict';

if (!requireRole('FACULTY_COORDINATOR')) { /* redirected */ }
else { init(); }

let allClubs = [];
let allEvents = [];
let pendingEventsList = [];
let approvedEventsList = [];
let currentJudgingEventId = null;

async function init() {
  document.getElementById('user-name').textContent   = getUserName() || 'Faculty Coordinator';
  document.getElementById('user-avatar').textContent = (getUserName() || 'F')[0].toUpperCase();
  await Promise.all([loadClubs(), loadPendingEvents()]);
  setupForms();
}

// ============================================================
// Section switching
// ============================================================
function showSection(name) {
  document.querySelectorAll('[id^="section-"]').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`section-${name}`).style.display = '';
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('onclick')?.includes(name)) item.classList.add('active');
  });

  const titles = {
    pending:  ['⏳ Pending Review',         'Events awaiting your review & tool authorization'],
    approved: ['✅ Approved Events',       'Live campus events visible to students'],
    judging:  ['⚖️ Judging & Evaluations',  'Score participant projects, designs, and hackathons'],
    registrations: ['📊 Registration Overview', 'Live capacity monitoring and attendance tracking across all active club events'],
    events:   ['📅 All Events',            'All events across campus clubs'],
    faculty:  ['👨‍🏫 Faculty Members',      'View and add faculty coordinators'],
  };
  const [title, sub] = titles[name] || ['Dashboard', ''];
  document.getElementById('page-title').textContent    = title;
  document.getElementById('page-subtitle').textContent = sub;

  if (name === 'pending')       loadPendingEvents();
  if (name === 'approved')      loadApprovedEvents();
  if (name === 'judging')       loadJudgingSection();
  if (name === 'registrations') loadRegistrationOverview();
  if (name === 'events')        loadAllEvents();
  if (name === 'faculty')       loadFaculty();
}

// ============================================================
// Clubs
// ============================================================
async function loadClubs() {
  try { allClubs = await apiFetch('/api/clubs'); } catch (err) { /* silent */ }
}

// ============================================================
// PENDING events — Approval Workflow with Event Types & Tools
// ============================================================
async function loadPendingEvents() {
  try {
    pendingEventsList = await apiFetch('/api/events/pending');

    const badge = document.getElementById('pending-badge');
    if (badge) badge.textContent = pendingEventsList.length > 0 ? pendingEventsList.length : '';

    const container = document.getElementById('pending-container');

    if (!pendingEventsList.length) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>All clear!</h3>
        <p>No events are waiting for your approval right now.</p>
      </div>`;
      return;
    }

    container.innerHTML = pendingEventsList.map(e => {
      const typeBadge = formatTypeBadge(e.eventType);
      const toolChips = (e.tools && e.tools.length)
        ? e.tools.map(t => `<span class="tool-badge-chip">${formatToolName(t)}</span>`).join('')
        : '<span style="font-size:0.75rem; color:var(--text-muted);">Standard</span>';

      return `
        <div class="card" style="margin-bottom: 18px; border-left: 4px solid var(--accent-amber);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                ${typeBadge}
                <span style="font-size:0.75rem; color:var(--accent-cyan); font-weight:600; text-transform:uppercase;">
                  🏛️ ${e.club?.name || '—'}
                </span>
              </div>
              <div style="font-size:1.15rem; font-weight:700; color:var(--text-primary); margin-bottom:6px;">${e.title}</div>
              
              <div style="margin: 8px 0;">
                <div style="font-size:0.725rem; color:var(--text-muted); font-weight:700; margin-bottom:4px;">REQUESTED DIGITAL TOOLS:</div>
                <div class="tool-chips-container">${toolChips}</div>
              </div>

              <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:0.8rem; color:var(--text-muted); margin-top:8px;">
                <span>📅 ${e.date}${e.startTime ? ' (' + e.startTime + (e.endTime ? ' - ' + e.endTime : '') + ')' : ''}</span>
                ${e.venue ? `<span>📍 ${e.venue}</span>` : ''}
                <span>👤 Created by: ${e.createdBy?.name || '—'}</span>
              </div>
              ${e.description ? `<p style="font-size:0.85rem; color:var(--text-secondary); margin-top:10px; line-height:1.6;">${e.description}</p>` : ''}
            </div>

            <div style="display:flex; gap:8px; flex-shrink:0;">
              <button class="btn btn-success btn-sm" onclick="approveEvent(${e.id})">✅ Approve Event</button>
              <button class="btn btn-danger btn-sm" onclick="openRejectModalById(${e.id})">❌ Reject with Reason</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showToast('Failed to load pending events: ' + err.message, 'error');
  }
}

async function approveEvent(id) {
  try {
    await apiFetch(`/api/events/${id}/approve`, { method: 'PATCH' });
    showToast('Event approved and published to students! ✅', 'success');
    await loadPendingEvents();
  } catch (err) {
    showToast('Failed to approve event: ' + err.message, 'error');
  }
}

let rejectTargetId = null;

function openRejectModalById(id) {
  const ev = pendingEventsList.find(e => e.id === id);
  rejectTargetId = id;
  document.getElementById('reject-event-title').textContent = ev ? ev.title : `Event #${id}`;
  document.getElementById('reject-reason').value = '';
  openModal('reject-modal');
  setTimeout(() => {
    const el = document.getElementById('reject-reason');
    if (el) el.focus();
  }, 100);
}

async function confirmReject() {
  const reason = document.getElementById('reject-reason').value.trim();
  if (!reason) {
    showToast('Please provide a reason for rejection.', 'error');
    return;
  }

  try {
    await apiFetch(`/api/events/${rejectTargetId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejectionReason: reason })
    });
    closeModal('reject-modal');
    showToast('Event rejected. Coordinator has been notified with your reason. ❌', 'info');
    await loadPendingEvents();
  } catch (err) {
    showToast('Failed to reject event: ' + err.message, 'error');
  }
}

// ============================================================
// APPROVED events
// ============================================================
async function loadApprovedEvents() {
  try {
    approvedEventsList = await apiFetch('/api/events/approved');
    const tbody = document.getElementById('approved-tbody');

    if (!approvedEventsList.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>No approved events yet.</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = approvedEventsList.map((e, i) => {
      const typeBadge = formatTypeBadge(e.eventType);
      const toolChips = (e.tools && e.tools.length)
        ? e.tools.map(t => `<span class="tool-badge-chip">${formatToolName(t)}</span>`).join('')
        : '<span style="font-size:0.75rem; color:var(--text-muted);">Standard</span>';

      return `
        <tr>
          <td>${i + 1}</td>
          <td>
            <div style="font-weight:600;">${e.title}</div>
            <div style="margin-top:2px;">${typeBadge}</div>
          </td>
          <td>${e.club?.name || '—'}</td>
          <td><div class="tool-chips-container" style="max-width:240px;">${toolChips}</div></td>
          <td>${e.date} ${e.startTime ? '(' + e.startTime + ')' : ''}</td>
          <td>${e.venue || '—'}</td>
          <td><span class="badge badge-green">Approved</span></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    showToast('Failed to load approved events: ' + err.message, 'error');
  }
}

// ============================================================
// JUDGING & EVALUATION SECTION
// ============================================================
async function loadJudgingSection() {
  if (!approvedEventsList.length) {
    approvedEventsList = await apiFetch('/api/events/approved');
  }

  const sel = document.getElementById('judge-event-select');
  sel.innerHTML = approvedEventsList.length
    ? approvedEventsList.map(e => `<option value="${e.id}">${e.title} (${e.eventType || 'OTHER'})</option>`).join('')
    : '<option value="">No events available</option>';

  if (approvedEventsList.length) {
    loadSubmissionsForJudging();
  }
}

async function loadSubmissionsForJudging() {
  const eventId = document.getElementById('judge-event-select').value;
  const tbody = document.getElementById('judging-tbody');
  if (!eventId) return;

  currentJudgingEventId = eventId;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading submissions...</td></tr>';

  try {
    const list = await apiFetch(`/api/submissions/${eventId}`);

    tbody.innerHTML = list.length
      ? list.map((s, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>
              <div style="font-weight:600;">${s.user ? s.user.name : 'Student'}</div>
              <small style="color:var(--text-muted);">${s.teamName ? 'Team: ' + s.teamName : (s.user ? s.user.email : '')}</small>
            </td>
            <td><span class="badge badge-blue">${s.submissionType}</span></td>
            <td>
              <div style="font-weight:600;">${s.title || 'Untitled'}</div>
              <div style="display:flex; gap:8px; margin-top:4px; font-size:0.75rem;">
                ${s.githubUrl ? `<a href="${s.githubUrl}" target="_blank" style="color:var(--accent-cyan);">🐙 GitHub</a>` : ''}
                ${s.demoUrl ? `<a href="${s.demoUrl}" target="_blank" style="color:var(--accent-green);">🌐 Live Demo</a>` : ''}
                ${s.videoUrl ? `<a href="${s.videoUrl}" target="_blank" style="color:var(--accent-purple);">🎥 Video</a>` : ''}
                ${s.dataUrl ? `<a href="${s.dataUrl}" target="_blank" style="color:var(--accent-amber);">🎨 View Poster</a>` : ''}
              </div>
            </td>
            <td>${s.submittedAt ? s.submittedAt.substring(0, 10) : '—'}</td>
            <td><strong style="color:var(--accent-green); font-size:1rem;">${s.score} / 100</strong></td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="openJudgeModal(${s.id}, '${s.user ? s.user.name : 'Student'}', '${(s.title || '').replace(/'/g, "\\'")}')">
                ⚖️ Evaluate
              </button>
            </td>
          </tr>
        `).join('')
      : '<tr><td colspan="7"><div class="empty-state"><p>No participant submissions recorded for this event yet.</p></div></td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--accent-red);">Error: ${err.message}</td></tr>`;
  }
}

function openJudgeModal(submissionId, studentName, title) {
  document.getElementById('judge-submission-id').value = submissionId;
  document.getElementById('judge-target-label').textContent = `Grading: ${studentName} — ${title}`;

  document.getElementById('jd-innovation').value = 16;
  document.getElementById('jd-technical').value  = 17;
  document.getElementById('jd-ui').value         = 13;
  document.getElementById('jd-impact').value     = 16;
  document.getElementById('jd-presentation').value = 9;
  document.getElementById('jd-demo').value       = 14;
  document.getElementById('jd-remarks').value    = '';

  calcTotalScore();
  openModal('judge-score-modal');
}

function calcTotalScore() {
  const inno = parseInt(document.getElementById('jd-innovation').value || 0, 10);
  const tech = parseInt(document.getElementById('jd-technical').value || 0, 10);
  const ui   = parseInt(document.getElementById('jd-ui').value || 0, 10);
  const imp  = parseInt(document.getElementById('jd-impact').value || 0, 10);
  const pres = parseInt(document.getElementById('jd-presentation').value || 0, 10);
  const demo = parseInt(document.getElementById('jd-demo').value || 0, 10);

  const total = inno + tech + ui + imp + pres + demo;
  document.getElementById('jd-total-display').textContent = `${total} / 100`;
}

async function submitJudgeScore() {
  const submissionId = document.getElementById('judge-submission-id').value;
  const payload = {
    innovationScore:   parseInt(document.getElementById('jd-innovation').value, 10),
    technicalScore:    parseInt(document.getElementById('jd-technical').value, 10),
    uiScore:           parseInt(document.getElementById('jd-ui').value, 10),
    impactScore:       parseInt(document.getElementById('jd-impact').value, 10),
    presentationScore: parseInt(document.getElementById('jd-presentation').value, 10),
    demoScore:         parseInt(document.getElementById('jd-demo').value, 10),
    remarks:           document.getElementById('jd-remarks').value.trim()
  };

  try {
    await apiFetch(`/api/evaluations/${submissionId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    closeModal('judge-score-modal');
    showToast('Evaluation recorded and score published to Leaderboard! 🏆', 'success');
    loadSubmissionsForJudging();
  } catch (err) {
    showToast('Failed to save score: ' + err.message, 'error');
  }
}

// ============================================================
// All Events (read-only for Faculty)
// ============================================================
async function loadAllEvents() {
  try {
    allEvents = await apiFetch('/api/events/approved');
    const tbody = document.getElementById('events-tbody');
    tbody.innerHTML = allEvents.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${e.title}</strong><div style="margin-top:2px;">${formatTypeBadge(e.eventType)}</div></td>
        <td>${e.club?.name || '—'}</td>
        <td>${e.date}</td>
        <td>${statusBadge(e.status)}</td>
        <td><span class="badge badge-blue">Active</span></td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Failed to load events: ' + err.message, 'error');
  }
}

// ============================================================
// Faculty Members Directory
// ============================================================
async function loadFaculty() {
  try {
    const list = await apiFetch('/api/faculty');
    const tbody = document.getElementById('faculty-tbody');
    tbody.innerHTML = list.length
      ? list.map((f, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><strong>${f.name}</strong><br/><small style="color:var(--text-muted);">${f.email}</small></td>
            <td>${f.department || '—'}</td>
            <td>${f.designation || '—'}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4"><div class="empty-state"><p>No other faculty coordinators added yet.</p></div></td></tr>';
  } catch (err) {
    showToast('Failed to load faculty: ' + err.message, 'error');
  }
}

function setupForms() {
  document.getElementById('faculty-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name        = document.getElementById('fac-name').value.trim();
    const email       = document.getElementById('fac-email').value.trim();
    const department  = document.getElementById('fac-department').value.trim();
    const designation = document.getElementById('fac-designation').value.trim();

    try {
      await apiFetch('/api/faculty', {
        method: 'POST',
        body: JSON.stringify({ name, email, department, designation })
      });
      showToast(`Faculty coordinator ${name} added!`, 'success');
      document.getElementById('faculty-form').reset();
      loadFaculty();
    } catch (err) {
      showToast('Failed to add faculty: ' + err.message, 'error');
    }
  });
}

// --- Helpers ---
function formatTypeBadge(type) {
  if (!type) return '<span class="badge badge-blue">📦 OTHER</span>';
  const icons = {
    CODING: '💻', HACKATHON: '🚀', QUIZ: '🧠', DESIGN: '🎨',
    WORKSHOP: '🛠️', PROJECT_EXHIBITION: '💡', DEBATE: '🗣️',
    CULTURAL: '🎭', SPORTS: '🏆', OTHER: '📦'
  };
  const icon = icons[type] || '📦';
  return `<span class="badge badge-purple" style="font-size:0.75rem;">${icon} ${type}</span>`;
}

function formatToolName(tool) {
  const map = {
    CODE_EDITOR: '💻 Code Editor',
    CODE_COMPILER: '⚙️ Compiler',
    TEST_CASES: '🧪 Test Cases',
    QUIZ_ENGINE: '🧠 Quiz Engine',
    DESIGN_EDITOR: '🎨 Canvas Studio',
    TEAM_FORMATION: '👥 Teams',
    FILE_SUBMISSION: '📁 Submissions',
    GITHUB_INTEGRATION: '🐙 GitHub',
    JUDGE_PANEL: '⚖️ Judging',
    TIMER: '⏱️ Timer',
    LEADERBOARD: '🏆 Leaderboard',
    ATTENDANCE: '📋 Attendance',
    CERTIFICATE: '📜 Certificate'
  };
  return map[tool] || tool;
}

// ============================================================
// Registration Overview Section
// ============================================================
async function loadRegistrationOverview() {
  const tbody = document.getElementById('faculty-reg-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Loading registration metrics...</td></tr>';

  try {
    const overviewList = await apiFetch('/api/registrations/overview');

    let totalReg = 0;
    let totalConf = 0;
    let totalWait = 0;
    let totalAtt = 0;

    overviewList.forEach(item => {
      totalReg += item.totalRegistered || 0;
      totalConf += item.confirmed || 0;
      totalWait += item.waitlisted || 0;
      totalAtt += item.attended || 0;
    });

    document.getElementById('fac-reg-total').textContent      = totalReg;
    document.getElementById('fac-reg-confirmed').textContent  = totalConf;
    document.getElementById('fac-reg-waitlisted').textContent = totalWait;
    document.getElementById('fac-reg-attended').textContent   = totalAtt;

    if (!overviewList.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><p>No active event registrations recorded yet.</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = overviewList.map((item, i) => {
      const typeBadge = formatTypeBadge(item.eventType);
      const maxCap = item.maxCapacity || 100;
      const active = (item.confirmed || 0) + (item.attended || 0);
      const fillPct = Math.min(100, Math.round((active * 100) / maxCap));

      return `
        <tr>
          <td>${i + 1}</td>
          <td>
            <div style="font-weight:700; color:#fff;">${item.eventTitle}</div>
            <small style="color:var(--accent-blue);">🏛️ ${item.clubName}</small>
          </td>
          <td>${typeBadge}</td>
          <td>${item.eventDate || '—'}</td>
          <td style="min-width:180px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
              <span><strong>${active}</strong> / ${maxCap} Seats</span>
              <span style="color:var(--accent-cyan);">${fillPct}%</span>
            </div>
            <div class="capacity-bar-track">
              <div class="capacity-bar-fill ${fillPct >= 100 ? 'full' : (fillPct >= 80 ? 'warning' : '')}" style="width:${fillPct}%;"></div>
            </div>
          </td>
          <td><strong style="color:var(--accent-green); font-size:0.95rem;">${item.confirmed}</strong></td>
          <td><span style="color:var(--accent-amber); font-weight:600;">${item.waitlisted}</span></td>
          <td><strong style="color:var(--accent-purple); font-size:0.95rem;">${item.attended}</strong></td>
          <td>
            <span class="badge ${item.attendanceRate >= 75 ? 'badge-green' : (item.attendanceRate >= 40 ? 'badge-blue' : 'badge-amber')}">
              ${item.attendanceRate}%
            </span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:var(--accent-red); text-align:center;">Failed to load overview: ${err.message}</td></tr>`;
  }
}

function openAddModal() {
  showToast('Faculty coordinators review and approve submitted events in the Pending Review queue.', 'info');
}
window.openAddModal = openAddModal;
