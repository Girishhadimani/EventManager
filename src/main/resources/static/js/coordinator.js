// coordinator.js — Logic for Coordinator Dashboard & Multi-Step Event Wizard
'use strict';

if (!requireRole('COORDINATOR')) { /* redirected */ }
else { init(); }

let myClubId   = localStorage.getItem('clubId');
let myClubName = localStorage.getItem('clubName');
let myEvents = [];
let editingEventId = null;

// Wizard State
let currentStep = 1;
let catalog = { eventTypes: [], allTools: [] };
let selectedEventType = 'CODING';
let selectedTools = new Set(['CODE_EDITOR', 'CODE_COMPILER', 'TEST_CASES', 'TIMER', 'LEADERBOARD']);

async function init() {
  await syncUserProfile();
  myClubId   = localStorage.getItem('clubId');
  myClubName = localStorage.getItem('clubName');

  document.getElementById('user-name').textContent         = getUserName() || 'Coordinator';
  document.getElementById('user-avatar').textContent       = (getUserName() || 'C')[0].toUpperCase();
  document.getElementById('club-label').textContent        = myClubName || 'My Club';
  document.getElementById('club-name-display').textContent = myClubName || 'your club';
  document.getElementById('club-name-card').textContent    = myClubName || 'My Club';

  await loadCatalog();
  await loadEvents();

  // Attach live conflict check listeners
  ['wz-date', 'wz-venue', 'wz-start-time', 'wz-end-time'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', triggerConflictCheck);
      el.addEventListener('change', triggerConflictCheck);
    }
  });
}

// ============================================================
// Load Tools & Types Catalog
// ============================================================
async function loadCatalog() {
  try {
    catalog = await apiFetch('/api/tools/types-and-defaults');
    renderEventTypeCards();
    renderToolTiles();
  } catch (err) {
    console.error('Failed to load tool catalog:', err);
  }
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

  if (name === 'registrations') populateRegEventSelect();
  if (name === 'analytics') initAnalyticsTab();
}

// ============================================================
// Events List & Display
// ============================================================
async function loadEvents() {
  if (!myClubId) {
    showToast('No club assigned to your account. Contact a Developer.', 'error');
    return;
  }

  try {
    myEvents = await apiFetch(`/api/events/club/${myClubId}`);

    // Stats
    document.getElementById('stat-total').textContent     = myEvents.length;
    document.getElementById('stat-pending').textContent   = myEvents.filter(e => e.status === 'PENDING').length;
    document.getElementById('stat-approved').textContent  = myEvents.filter(e => e.status === 'APPROVED').length;
    document.getElementById('stat-rejected').textContent  = myEvents.filter(e => e.status === 'REJECTED').length;

    const tbody = document.getElementById('events-tbody');
    tbody.innerHTML = myEvents.length
      ? myEvents.map((e, i) => {
          const typeBadge = formatTypeBadge(e.eventType);
          const toolChips = (e.tools && e.tools.length)
            ? e.tools.map(t => `<span class="tool-badge-chip">${formatToolName(t)}</span>`).join('')
            : '<span style="color:var(--text-muted); font-size:0.75rem;">Standard</span>';

          const timeDisplay = e.startTime
            ? `${e.date} (${e.startTime}${e.endTime ? ' - ' + e.endTime : ''})`
            : (e.time ? `${e.date} (${e.time})` : e.date);

          const toolActionBtn = (['APPROVED', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING'].includes(e.status))
            ? (e.toolsOpened
                ? `<button class="btn btn-sm btn-danger" onclick="toggleEventTools(${e.id}, false)" title="Lock tools for participants">🔒 Lock Tools</button>`
                : `<button class="btn btn-sm btn-success" onclick="toggleEventTools(${e.id}, true)" title="Open competition tools on event day">⚡ Open Tools</button>`)
            : '';

          return `
          <tr>
            <td>${i + 1}</td>
            <td>
              <div style="font-weight:600; color:var(--text-primary);">${e.title}</div>
              <div style="margin-top:4px;">${typeBadge}</div>
            </td>
            <td>
              <div class="tool-chips-container" style="max-width:280px;">${toolChips}</div>
            </td>
            <td>${timeDisplay}</td>
            <td>${e.venue || 'TBD'}</td>
            <td>
              ${statusBadge(e.status)}
              ${e.toolsOpened ? '<div style="margin-top:4px;"><span class="badge badge-green" style="font-size:0.68rem;">🔓 Tools Live</span></div>' : ''}
            </td>
            <td>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                ${toolActionBtn}
                <button class="btn btn-sm btn-secondary" onclick="openEditWizard(${e.id})">
                  ${e.status === 'REJECTED' ? '⚠️ Edit & Resubmit' : '✏️ Edit'}
                </button>
                <button class="btn btn-sm btn-secondary" onclick="openEventHistory(${e.id})" title="View lifecycle history">
                  📜 History
                </button>
              </div>
            </td>
          </tr>
        `;
        }).join('')
      : `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📅</div><h3>No events yet</h3><p>Click "Create Event Wizard" to create your first event.</p></div></td></tr>`;

    populateRegEventSelect();
  } catch (err) {
    showToast('Failed to load events: ' + err.message, 'error');
  }
}

async function toggleEventTools(eventId, open) {
  const confirmMsg = open
    ? "Are you sure you want to OPEN competition tools (Coding IDE, Quiz, Design, Submissions) right now for participants?"
    : "Are you sure you want to LOCK competition tools for participants?";
  if (!confirm(confirmMsg)) return;

  try {
    await apiFetch(`/api/events/${eventId}/toggle-tools?open=${open}`, { method: 'PATCH' });
    showToast(open ? '🎉 Competition tools are now OPEN to participants!' : '🔒 Competition tools are now LOCKED.', 'success');
    await loadEvents();
  } catch (err) {
    showToast('Failed to update tools status: ' + err.message, 'error');
  }
}

function formatTypeBadge(type) {
  if (!type) return '<span class="badge badge-blue">📦 OTHER</span>';
  const icons = {
    CODING: '💻', HACKATHON: '🚀', QUIZ: '🧠', DESIGN: '🎨',
    WORKSHOP: '🛠️', PROJECT_EXHIBITION: '💡', DEBATE: '🗣️',
    CULTURAL: '🎭', SPORTS: '🏆', OTHER: '📦'
  };
  const icon = icons[type] || '📦';
  return `<span class="badge badge-purple" style="font-size:0.725rem;">${icon} ${type}</span>`;
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
// MULTI-STEP EVENT CREATION WIZARD LOGIC
// ============================================================

function openCreateWizard() {
  editingEventId = null;
  document.getElementById('wizard-event-id').value = '';
  document.getElementById('wizard-modal-title').textContent = 'Create Event Wizard';
  document.getElementById('wizard-form').reset();
  document.getElementById('wz-max-participants').value = 100;
  document.getElementById('wz-reg-deadline').value = '';
  document.getElementById('wizard-rejection-note').style.display = 'none';
  const alertEl = document.getElementById('wz-conflict-alert');
  if (alertEl) alertEl.style.display = 'none';

  resetCustomFields();
  selectedEventType = 'CODING';
  resetToolsToDefault();
  goToStep(1);
  openModal('event-wizard-modal');
}

function openEditWizard(id) {
  const event = myEvents.find(e => e.id === id);
  if (!event) return;

  editingEventId = id;
  document.getElementById('wizard-event-id').value = id;
  document.getElementById('wizard-modal-title').textContent = event.status === 'REJECTED'
    ? 'Revise & Resubmit Rejected Event'
    : 'Edit Event';

  // Fill details
  document.getElementById('wz-title').value            = event.title;
  document.getElementById('wz-description').value      = event.description || '';
  document.getElementById('wz-date').value             = event.date;
  document.getElementById('wz-venue').value            = event.venue || '';
  document.getElementById('wz-start-time').value       = event.startTime || event.time || '10:00';
  document.getElementById('wz-end-time').value         = event.endTime || '17:00';
  document.getElementById('wz-max-participants').value = event.maxParticipants || 100;
  document.getElementById('wz-reg-deadline').value     = event.registrationDeadline || '';

  // Show rejection note if any
  const rejEl = document.getElementById('wizard-rejection-note');
  if (event.status === 'REJECTED' && event.rejectionReason) {
    rejEl.style.display = 'block';
    rejEl.innerHTML = `<strong>⚠️ Rejection Feedback from Faculty:</strong><br/>${event.rejectionReason}<br/><small style="color:var(--text-muted);">Addressing this feedback will submit the event as PENDING for fresh review.</small>`;
  } else {
    rejEl.style.display = 'none';
  }

  // Load custom registration form schema if saved
  resetCustomFields();
  if (event.registrationFormSchema) {
    try {
      customFormFields = JSON.parse(event.registrationFormSchema);
      renderCustomFieldsBuilder();
    } catch (e) {
      customFormFields = [];
    }
  }

  const alertEl = document.getElementById('wz-conflict-alert');
  if (alertEl) alertEl.style.display = 'none';

  selectedEventType = event.eventType || 'CODING';
  selectedTools = new Set(event.tools && event.tools.length
    ? event.tools
    : getDefaultToolsForType(selectedEventType));

  renderEventTypeCards();
  renderToolTiles();
  goToStep(1);
  openModal('event-wizard-modal');
  triggerConflictCheck();
}

function renderEventTypeCards() {
  const container = document.getElementById('wz-event-type-container');
  if (!container || !catalog.eventTypes) return;

  container.innerHTML = catalog.eventTypes.map(t => {
    const isSelected = t.type === selectedEventType;
    return `
      <div class="event-type-card ${isSelected ? 'selected' : ''}" onclick="selectEventType('${t.type}')">
        <div class="event-type-header">
          <span class="event-type-icon">${t.icon}</span>
          <span class="event-type-title">${t.label}</span>
        </div>
        <div class="event-type-desc">${t.description}</div>
        <div class="type-recommended-badge">
          Tools: ${t.defaultTools ? t.defaultTools.map(dt => formatToolName(dt).split(' ')[0]).join(' ') : 'Default'}
        </div>
      </div>
    `;
  }).join('');
}

function selectEventType(type) {
  selectedEventType = type;
  renderEventTypeCards();
  resetToolsToDefault();
}

function getDefaultToolsForType(type) {
  const found = catalog.eventTypes.find(t => t.type === type);
  return found ? found.defaultTools : ['FILE_SUBMISSION'];
}

function resetToolsToDefault() {
  const defaults = getDefaultToolsForType(selectedEventType);
  selectedTools = new Set(defaults);
  document.getElementById('wz-selected-type-label').textContent = formatTypeBadge(selectedEventType).replace(/<[^>]*>?/gm, '');
  renderToolTiles();
}

function renderToolTiles() {
  const container = document.getElementById('wz-tools-container');
  if (!container || !catalog.allTools) return;

  container.innerHTML = catalog.allTools.map(t => {
    const isChecked = selectedTools.has(t.tool);
    return `
      <label class="tool-tile ${isChecked ? 'checked' : ''}">
        <input type="checkbox" value="${t.tool}" ${isChecked ? 'checked' : ''} onchange="toggleTool('${t.tool}', this.checked)" />
        <span class="tool-tile-label">${formatToolName(t.tool)}</span>
      </label>
    `;
  }).join('');
}

function toggleTool(tool, checked) {
  if (checked) selectedTools.add(tool);
  else selectedTools.delete(tool);
  renderToolTiles();
}

// Step navigation
function goToStep(step) {
  currentStep = step;

  // Update step contents
  for (let s = 1; s <= 5; s++) {
    const el = document.getElementById(`wizard-step-${s}`);
    if (el) el.style.display = (s === step) ? 'block' : 'none';

    const nav = document.getElementById(`step-nav-${s}`);
    if (nav) {
      nav.classList.remove('active', 'done');
      if (s === step) nav.classList.add('active');
      else if (s < step) nav.classList.add('done');
    }
  }

  // Update navigation buttons
  document.getElementById('wz-prev-btn').style.display = (step > 1) ? 'inline-block' : 'none';

  const nextBtn = document.getElementById('wz-next-btn');
  if (step === 5) {
    nextBtn.textContent = editingEventId ? 'Resubmit for Approval 🚀' : 'Submit for Faculty Approval 🚀';
    populatePreview();
  } else {
    nextBtn.textContent = 'Continue →';
  }

  if (step === 4) populateConfigPanel();
}

function wizardNextStep() {
  // Validate current step
  if (currentStep === 1) {
    const title = document.getElementById('wz-title').value.trim();
    const date  = document.getElementById('wz-date').value;
    const venue = document.getElementById('wz-venue').value.trim();
    if (!title || !date || !venue) {
      showToast('Please fill in Event Title, Date, and Venue.', 'error');
      return;
    }
  }

  if (currentStep === 5) {
    submitEventWizard();
    return;
  }

  goToStep(currentStep + 1);
}

function wizardPrevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

function populateConfigPanel() {
  const panel = document.getElementById('wz-config-dynamic-panel');
  if (!panel) return;

  if (selectedEventType === 'CODING') {
    panel.innerHTML = `
      <div style="background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px;">
        <h3 style="font-size:0.95rem; margin-bottom:12px; color:var(--text-primary);">💻 Coding Competition Engine Settings</h3>
        <div class="form-group">
          <label>Supported Programming Languages</label>
          <div style="display:flex; gap:16px; margin-top:8px;">
            <label><input type="checkbox" checked disabled /> Python 3</label>
            <label><input type="checkbox" checked disabled /> Java 21</label>
            <label><input type="checkbox" checked disabled /> C++ 17</label>
            <label><input type="checkbox" checked disabled /> JavaScript</label>
          </div>
        </div>
        <div class="two-col">
          <div class="form-group">
            <label>Contest Duration (Minutes)</label>
            <input type="number" id="cfg-duration" value="120" min="15" max="480" />
          </div>
          <div class="form-group">
            <label>Scoring Scheme</label>
            <input type="text" value="+100 per accepted problem" disabled />
          </div>
        </div>
        <div class="form-group">
          <label>Problem Title</label>
          <input type="text" id="cfg-problem-title" value="Two Sum Target Challenge" />
        </div>
      </div>
    `;
  } else if (selectedEventType === 'QUIZ') {
    panel.innerHTML = `
      <div style="background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px;">
        <h3 style="font-size:0.95rem; margin-bottom:12px; color:var(--text-primary);">🧠 Quiz Engine Settings</h3>
        <div class="two-col">
          <div class="form-group">
            <label>Question Count</label>
            <input type="number" id="cfg-qcount" value="5" min="1" max="50" />
          </div>
          <div class="form-group">
            <label>Time per Question (Seconds)</label>
            <input type="number" id="cfg-qtime" value="30" min="10" max="180" />
          </div>
        </div>
        <div class="form-group">
          <label>Question Bank Category</label>
          <input type="text" value="Computer Science & Web Architecture" disabled />
        </div>
      </div>
    `;
  } else if (selectedEventType === 'DESIGN') {
    panel.innerHTML = `
      <div style="background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px;">
        <h3 style="font-size:0.95rem; margin-bottom:12px; color:var(--text-primary);">🎨 Poster & Design Canvas Settings</h3>
        <div class="two-col">
          <div class="form-group">
            <label>Canvas Dimension</label>
            <input type="text" value="800 x 500 (Landscape)" disabled />
          </div>
          <div class="form-group">
            <label>Export Formats Allowed</label>
            <input type="text" value="PNG & Direct Submission" disabled />
          </div>
        </div>
        <div class="form-group">
          <label>Judging Focus</label>
          <input type="text" value="Color harmony, Typography, Theme relevance, Visual balance" disabled />
        </div>
      </div>
    `;
  } else {
    panel.innerHTML = `
      <div style="background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px;">
        <h3 style="font-size:0.95rem; margin-bottom:12px; color:var(--text-primary);">⚙️ Event Engine Guidelines</h3>
        <div class="two-col">
          <div class="form-group">
            <label>Max Team Size</label>
            <input type="number" id="cfg-teamsize" value="4" min="1" max="10" />
          </div>
          <div class="form-group">
            <label>Submission Format</label>
            <input type="text" value="GitHub Repository, Live Demo URL, Video Link" disabled />
          </div>
        </div>
        <div class="form-group">
          <label>Judging Evaluation Criteria</label>
          <input type="text" value="100-point Rubric (Innovation, Technical, UI/UX, Impact, Presentation, Demo)" disabled />
        </div>
      </div>
    `;
  }
}

function populatePreview() {
  document.getElementById('prev-title').textContent = document.getElementById('wz-title').value;
  document.getElementById('prev-desc').textContent  = document.getElementById('wz-description').value;

  const date  = document.getElementById('wz-date').value;
  const start = document.getElementById('wz-start-time').value;
  const end   = document.getElementById('wz-end-time').value;
  document.getElementById('prev-datetime').textContent = `${date} (${start} - ${end})`;
  document.getElementById('prev-venue').textContent    = document.getElementById('wz-venue').value;
  document.getElementById('prev-type-badge').innerHTML = formatTypeBadge(selectedEventType);

  const toolsContainer = document.getElementById('prev-tools-container');
  toolsContainer.innerHTML = Array.from(selectedTools)
    .map(t => `<span class="tool-badge-chip" style="background:rgba(59,130,246,0.15); color:var(--accent-blue); border-color:rgba(59,130,246,0.3);">${formatToolName(t)}</span>`)
    .join('');

  const cfPreview = document.getElementById('prev-custom-fields-preview');
  const cfList = document.getElementById('prev-custom-fields-list');
  if (cfPreview && cfList) {
    if (customFormFields.length > 0) {
      cfPreview.style.display = 'block';
      cfList.innerHTML = customFormFields.map((f, i) => `
        <div>• <strong>${escapeHtml(f.label || f.name)}</strong> (${f.type}${f.required ? ', Required' : ''})</div>
      `).join('');
    } else {
      cfPreview.style.display = 'none';
    }
  }
}

async function submitEventWizard() {
  const title       = document.getElementById('wz-title').value.trim();
  const description = document.getElementById('wz-description').value.trim();
  const date        = document.getElementById('wz-date').value;
  const startTime   = document.getElementById('wz-start-time').value;
  const endTime     = document.getElementById('wz-end-time').value;
  const venue       = document.getElementById('wz-venue').value.trim();

  const parsedClubId = myClubId ? parseInt(myClubId, 10) : null;

  const maxCap = parseInt(document.getElementById('wz-max-participants')?.value, 10) || 100;
  const deadline = document.getElementById('wz-reg-deadline')?.value || null;

  const payload = {
    title,
    description,
    date,
    time: startTime || '10:00:00',
    startTime: startTime || '10:00:00',
    endTime: endTime || '17:00:00',
    venue,
    ...(parsedClubId ? { clubId: parsedClubId } : {}),
    eventType: selectedEventType,
    tools: Array.from(selectedTools),
    toolConfig: JSON.stringify({ eventType: selectedEventType, tools: Array.from(selectedTools) }),
    maxParticipants: maxCap,
    registrationDeadline: deadline,
    registrationFormSchema: customFormFields.length ? JSON.stringify(customFormFields) : null
  };

  try {
    if (editingEventId) {
      await apiFetch(`/api/events/${editingEventId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Event updated and resubmitted for Faculty Approval! ⏳', 'success');
    } else {
      await apiFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Event created and submitted for Faculty Approval! ⏳', 'success');
    }

    closeModal('event-wizard-modal');
    await loadEvents();
  } catch (err) {
    showToast('Failed to save event: ' + err.message, 'error');
  }
}

// ============================================================
// Conflict Detection & Custom Registration Builder Helpers
// ============================================================

let conflictDebounceTimer = null;
function triggerConflictCheck() {
  clearTimeout(conflictDebounceTimer);
  conflictDebounceTimer = setTimeout(async () => {
    const date = document.getElementById('wz-date')?.value;
    const venue = document.getElementById('wz-venue')?.value?.trim();
    const startTime = document.getElementById('wz-start-time')?.value;
    const endTime = document.getElementById('wz-end-time')?.value;
    const alertEl = document.getElementById('wz-conflict-alert');
    if (!alertEl) return;

    if (!date || !venue) {
      alertEl.style.display = 'none';
      return;
    }

    try {
      const resp = await apiFetch('/api/events/check-conflict', {
        method: 'POST',
        body: JSON.stringify({
          date,
          venue,
          startTime: startTime ? (startTime.length === 5 ? startTime + ':00' : startTime) : null,
          endTime: endTime ? (endTime.length === 5 ? endTime + ':00' : endTime) : null,
          excludeEventId: editingEventId || null
        })
      });

      if (resp.hasConflict) {
        alertEl.style.display = 'block';
        alertEl.style.background = 'rgba(239, 68, 68, 0.15)';
        alertEl.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        alertEl.style.color = '#fca5a5';
        alertEl.innerHTML = `⚠️ <strong>Venue Conflict Detected:</strong> ${escapeHtml(resp.conflictReason)}`;
      } else {
        alertEl.style.display = 'block';
        alertEl.style.background = 'rgba(16, 185, 129, 0.12)';
        alertEl.style.border = '1px solid rgba(16, 185, 129, 0.35)';
        alertEl.style.color = '#86efac';
        alertEl.innerHTML = `✓ <strong>Available:</strong> Venue '${escapeHtml(venue)}' is free on ${date}.`;
      }
    } catch (err) {
      console.warn('Conflict check error:', err);
    }
  }, 350);
}

let customFormFields = [];

function resetCustomFields() {
  customFormFields = [];
  renderCustomFieldsBuilder();
}

function addCustomRegistrationField(field = null) {
  const newField = field || {
    name: 'field_' + (customFormFields.length + 1),
    label: '',
    type: 'text',
    required: false,
    options: []
  };
  customFormFields.push(newField);
  renderCustomFieldsBuilder();
}

function removeCustomRegistrationField(idx) {
  customFormFields.splice(idx, 1);
  renderCustomFieldsBuilder();
}

function updateCustomField(idx, key, val) {
  if (customFormFields[idx]) {
    customFormFields[idx][key] = val;
    if (key === 'label') {
      customFormFields[idx].name = val.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
  }
}

function renderCustomFieldsBuilder() {
  const container = document.getElementById('custom-fields-builder-container');
  if (!container) return;

  if (customFormFields.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:16px; border:1px dashed var(--border); border-radius:var(--radius-sm); color:var(--text-muted); font-size:0.85rem;">
        No custom registration questions configured yet. Standard student name, email, department, and phone are collected by default.
      </div>
    `;
    return;
  }

  container.innerHTML = customFormFields.map((f, idx) => `
    <div style="background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px; display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:700; font-size:0.85rem; color:var(--accent-blue);">Field #${idx + 1}</span>
        <button type="button" class="btn btn-secondary btn-sm" style="color:var(--accent-red); padding:2px 8px;" onclick="removeCustomRegistrationField(${idx})">🗑 Remove</button>
      </div>
      <div class="two-col">
        <div>
          <label style="font-size:0.75rem;">Question / Label *</label>
          <input type="text" class="form-control" style="font-size:0.85rem; padding:6px 10px;" value="${escapeHtml(f.label || '')}" placeholder="e.g. GitHub Repository or Portfolio Link" oninput="updateCustomField(${idx}, 'label', this.value)" />
        </div>
        <div>
          <label style="font-size:0.75rem;">Field Type</label>
          <select class="form-control" style="font-size:0.85rem; padding:6px 10px;" onchange="updateCustomField(${idx}, 'type', this.value); renderCustomFieldsBuilder();">
            <option value="text" ${f.type === 'text' ? 'selected' : ''}>Single-line Text</option>
            <option value="textarea" ${f.type === 'textarea' ? 'selected' : ''}>Multi-line Paragraph</option>
            <option value="select" ${f.type === 'select' ? 'selected' : ''}>Dropdown Choices</option>
            <option value="url" ${f.type === 'url' ? 'selected' : ''}>URL Link</option>
            <option value="number" ${f.type === 'number' ? 'selected' : ''}>Number</option>
          </select>
        </div>
      </div>
      ${f.type === 'select' ? `
        <div>
          <label style="font-size:0.75rem;">Dropdown Choices (Comma-separated)</label>
          <input type="text" class="form-control" style="font-size:0.85rem; padding:6px 10px;" value="${escapeHtml(Array.isArray(f.options) ? f.options.join(', ') : (f.options || ''))}" placeholder="e.g. Beginner, Intermediate, Advanced" oninput="updateCustomField(${idx}, 'options', this.value.split(',').map(s=>s.trim()).filter(Boolean))" />
        </div>
      ` : ''}
      <div style="display:flex; align-items:center; gap:8px;">
        <label style="font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:6px;">
          <input type="checkbox" ${f.required ? 'checked' : ''} onchange="updateCustomField(${idx}, 'required', this.checked)" />
          Required Response (Mandatory for students)
        </label>
      </div>
    </div>
  `).join('');
}

// ============================================================
// Event Approval History Audit Viewer
// ============================================================

async function openEventHistory(eventId) {
  const event = myEvents.find(e => e.id === eventId);
  const titleEl = document.getElementById('history-modal-title');
  const bodyEl = document.getElementById('history-modal-body');
  if (!bodyEl) return;

  if (titleEl) titleEl.textContent = `Audit Trail: ${event ? event.title : 'Event #' + eventId}`;
  bodyEl.innerHTML = '<div class="spinner"></div> Loading event audit trail...';
  openModal('history-modal');

  try {
    const history = await apiFetch(`/api/events/${eventId}/history`);
    if (!history || history.length === 0) {
      bodyEl.innerHTML = '<div class="empty-state"><p>No history entries recorded yet for this event.</p></div>';
      return;
    }

    bodyEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px; position:relative; padding-left:24px; border-left:2px solid var(--border); margin:10px 0 10px 10px;">
        ${history.map(item => {
          const actionColors = {
            CREATED: 'badge-blue',
            RESUBMITTED: 'badge-cyan',
            UPDATED: 'badge-purple',
            APPROVED: 'badge-green',
            REJECTED: 'badge-red',
            CANCELLED: 'badge-red',
            STATUS_CHANGED: 'badge-amber'
          };
          const cls = actionColors[item.action] || 'badge-blue';
          const userName = item.performedBy ? item.performedBy.name : 'System';
          const userRole = item.performedBy ? item.performedBy.role : '';

          return `
            <div style="position:relative;">
              <div style="position:absolute; left:-31px; top:4px; width:12px; height:12px; border-radius:50%; background:var(--accent-blue); border:2px solid var(--bg-card);"></div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span class="badge ${cls}">${item.action}</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">${formatDate(item.createdAt)} ${new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div style="font-size:0.85rem; color:var(--text-primary); font-weight:600;">
                By ${escapeHtml(userName)} <span style="font-size:0.75rem; font-weight:normal; color:var(--text-muted);">(${userRole})</span>
              </div>
              <p style="margin:4px 0 0 0; font-size:0.82rem; color:var(--text-secondary); line-height:1.4; background:var(--bg-primary); padding:8px 12px; border-radius:6px; border:1px solid var(--border);">
                ${escapeHtml(item.comment || 'Action recorded successfully.')}
              </p>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    bodyEl.innerHTML = `<div class="empty-state" style="color:var(--danger);"><p>Failed to load history: ${err.message}</p></div>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// Registrations & Participant Management Section
// ============================================================
let currentEventRegistrations = [];

function populateRegEventSelect() {
  const sel = document.getElementById('reg-event-select');
  if (!sel) return;
  sel.innerHTML = myEvents.length
    ? myEvents.map(e => `<option value="${e.id}">${e.title} (${e.status})</option>`).join('')
    : '<option value="">No events found</option>';

  if (myEvents.length) onRegistrationEventChange();
}

function onRegistrationEventChange() {
  loadRegistrations();
}

async function loadRegistrations() {
  const eventId = document.getElementById('reg-event-select')?.value;
  const tbody = document.getElementById('registrations-tbody');
  if (!tbody) return;

  if (!eventId) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Select an event above.</td></tr>';
    return;
  }

  const event = myEvents.find(e => e.id == eventId);
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Loading participants...</td></tr>';

  try {
    currentEventRegistrations = await apiFetch(`/api/events/${eventId}/registrations`);

    // Compute metrics
    const total      = currentEventRegistrations.length;
    const confirmed  = currentEventRegistrations.filter(r => r.status === 'CONFIRMED' || r.status === 'REGISTERED').length;
    const waitlisted = currentEventRegistrations.filter(r => r.status === 'WAITLISTED').length;
    const attended   = currentEventRegistrations.filter(r => r.status === 'ATTENDED').length;

    document.getElementById('reg-stat-total').textContent      = total;
    document.getElementById('reg-stat-confirmed').textContent  = confirmed;
    document.getElementById('reg-stat-waitlisted').textContent = waitlisted;
    document.getElementById('reg-stat-attended').textContent   = attended;

    // Update capacity meter
    const maxCap = (event && event.maxParticipants) ? event.maxParticipants : 100;
    const activeSeats = confirmed + attended;
    const fillPct = Math.min(100, Math.round((activeSeats * 100) / maxCap));

    document.getElementById('coord-cap-text').textContent = `${activeSeats} / ${maxCap} Seats Filled (${fillPct}%)`;
    const fillEl = document.getElementById('coord-cap-fill');
    fillEl.style.width = `${fillPct}%`;
    fillEl.className = 'capacity-bar-fill' + (fillPct >= 100 ? ' full' : (fillPct >= 80 ? ' warning' : ''));

    filterRegistrations();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:var(--accent-red); text-align:center;">Failed to load participants: ${err.message}</td></tr>`;
  }
}

function filterRegistrations() {
  const tbody = document.getElementById('registrations-tbody');
  if (!tbody) return;

  const q = document.getElementById('reg-search-input')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('reg-status-filter')?.value || 'ALL';

  const filtered = currentEventRegistrations.filter(r => {
    const matchesQuery = !q ||
      (r.studentName && r.studentName.toLowerCase().includes(q)) ||
      (r.studentEmail && r.studentEmail.toLowerCase().includes(q)) ||
      (r.usnOrStudentId && r.usnOrStudentId.toLowerCase().includes(q)) ||
      (r.registrationNumber && r.registrationNumber.toLowerCase().includes(q)) ||
      (r.phone && r.phone.toLowerCase().includes(q));

    const matchesStatus = (statusFilter === 'ALL') || (r.status === statusFilter);
    return matchesQuery && matchesStatus;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><p>No participants match your criteria.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((r, i) => {
    const statusBadgeHtml = formatRegStatusBadge(r.status);
    const regDate = r.registeredAt ? r.registeredAt.substring(0, 16).replace('T', ' ') : '—';
    const checkedInDisplay = r.checkedInAt
      ? `<span style="color:var(--accent-green); font-size:0.8rem; font-weight:600;">✓ ${r.checkedInAt.substring(11, 16)}</span>`
      : '<span style="color:var(--text-muted); font-size:0.75rem;">Not Checked In</span>';

    // Parse customData details
    let customSummary = '—';
    if (r.customData) {
      try {
        const obj = JSON.parse(r.customData);
        const parts = [];
        if (obj.teamName) parts.push(`Team: <strong>${obj.teamName}</strong>`);
        if (obj.languages && Array.isArray(obj.languages)) parts.push(`Langs: ${obj.languages.join(', ')}`);
        if (obj.experienceLevel) parts.push(`Exp: ${obj.experienceLevel}`);
        if (obj.category) parts.push(`Cat: ${obj.category}`);
        if (obj.sport) parts.push(`Sport: ${obj.sport}`);
        if (r.githubUrl) parts.push(`<a href="${obj.githubUrl}" target="_blank" style="color:var(--accent-cyan);">GitHub</a>`);
        if (parts.length) customSummary = parts.join(' • ');
      } catch (ignored) {}
    }

    if (r.teamMembers) {
      try {
        const arr = JSON.parse(r.teamMembers);
        if (Array.isArray(arr) && arr.length) {
          customSummary = `Squad: <strong>${arr.join(', ')}</strong>` + (customSummary !== '—' ? ' • ' + customSummary : '');
        }
      } catch (ignored) {}
    }

    if (r.feedbackRating) {
      customSummary += ` • <span style="color:#f59e0b; font-weight:700;">⭐ ${r.feedbackRating}/5</span>`;
    }

    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <span style="font-family:monospace; font-weight:700; color:var(--accent-cyan); font-size:0.95rem;">${r.registrationNumber || 'REG-' + r.id}</span>
          <br><small style="color:var(--text-muted); font-size:0.7rem;">${regDate}</small>
        </td>
        <td>
          <div style="font-weight:600; color:#fff;">${r.studentName || 'Student'}</div>
          <small style="color:var(--accent-blue); font-family:monospace;">${r.usnOrStudentId || '—'}</small>
          ${r.teamName ? `<div style="margin-top:3px;"><span class="badge badge-purple" style="font-size:0.68rem;">🚀 Team: ${escapeHtml(r.teamName)}</span></div>` : ''}
        </td>
        <td>
          <div style="font-size:0.85rem;">${r.studentEmail || '—'}</div>
          <small style="color:var(--text-muted);">${r.phone || '—'}</small>
        </td>
        <td>
          <div style="font-size:0.85rem;">${r.department || '—'}</div>
          <small style="color:var(--text-muted);">${r.year || '—'}</small>
        </td>
        <td style="max-width:240px; font-size:0.8rem; line-height:1.4;">${customSummary}</td>
        <td>${statusBadgeHtml}</td>
        <td>${checkedInDisplay}</td>
        <td>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            ${r.status !== 'ATTENDED'
              ? `<button class="btn btn-sm btn-primary" onclick="markCheckInDirect(${r.id}, '${r.registrationNumber}')" title="Check In">🎯 Check-In</button>`
              : ''}
            ${r.status === 'WAITLISTED'
              ? `<button class="btn btn-sm btn-success" onclick="updateParticipantStatus(${r.id}, 'CONFIRMED')" title="Promote to Confirmed">✓ Confirm</button>`
              : ''}
            ${r.status === 'CONFIRMED'
              ? `<button class="btn btn-sm btn-secondary" onclick="updateParticipantStatus(${r.id}, 'WAITLISTED')" title="Move to Waitlist">⏳ Waitlist</button>`
              : ''}
            ${r.status !== 'CANCELLED'
              ? `<button class="btn btn-sm btn-danger" onclick="updateParticipantStatus(${r.id}, 'CANCELLED')" title="Cancel Spot">✕</button>`
              : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function formatRegStatusBadge(status) {
  switch (status) {
    case 'CONFIRMED':
    case 'REGISTERED':
      return '<span class="badge badge-green">✓ Confirmed</span>';
    case 'WAITLISTED':
      return '<span class="badge badge-amber">⏳ Waitlisted</span>';
    case 'ATTENDED':
      return '<span class="badge badge-purple">🎯 Attended</span>';
    case 'CANCELLED':
      return '<span class="badge badge-red">✕ Cancelled</span>';
    default:
      return `<span class="badge badge-blue">${status || 'Active'}</span>`;
  }
}

// ============================================================
// Actions: Status Updates & Event-Day Check-in
// ============================================================
async function updateParticipantStatus(regId, newStatus) {
  try {
    await apiFetch(`/api/registrations/${regId}/status?status=${newStatus}`, { method: 'PUT' });
    showToast(`Participant status updated to ${newStatus}!`, 'success');
    await loadRegistrations();
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

function focusQuickCheckIn() {
  const input = document.getElementById('quick-checkin-input');
  if (input) {
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function doQuickCheckIn() {
  const eventId = document.getElementById('reg-event-select')?.value;
  const input = document.getElementById('quick-checkin-input');
  const token = input?.value.trim();

  if (!eventId) {
    showToast('Please select an event first.', 'warning');
    return;
  }
  if (!token) {
    showToast('Please enter or scan a Registration Number.', 'warning');
    return;
  }

  try {
    const res = await apiFetch(`/api/events/${eventId}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ ticketOrRegNumber: token })
    });

    input.value = '';
    showToast(`Check-in Confirmed: ${res.studentName} (${res.usnOrStudentId}) 🎯`, 'success');

    // Show alert banner
    const alertBox = document.getElementById('checkin-recent-alert');
    const alertMsg = document.getElementById('checkin-recent-msg');
    if (alertBox && alertMsg) {
      alertMsg.innerHTML = `<strong>✓ Check-in Verified:</strong> ${res.studentName} (USN: ${res.usnOrStudentId || '—'}) • Ticket: <code>${res.registrationNumber}</code> • Status: <strong>ATTENDED</strong>`;
      alertBox.style.display = 'block';
    }

    await loadRegistrations();
  } catch (err) {
    showToast('Check-in failed: ' + err.message, 'error');
  }
}

async function markCheckInDirect(regId, regNumber) {
  const eventId = document.getElementById('reg-event-select')?.value;
  if (!eventId) return;

  try {
    const res = await apiFetch(`/api/events/${eventId}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ ticketOrRegNumber: regNumber || String(regId) })
    });
    showToast(`Checked-in: ${res.studentName} 🎯`, 'success');
    await loadRegistrations();
  } catch (err) {
    showToast('Check-in error: ' + err.message, 'error');
  }
}

// ============================================================
// Export Participant List to CSV
// ============================================================
function exportRegistrationsCSV() {
  const eventId = document.getElementById('reg-event-select')?.value;
  const event = myEvents.find(e => e.id == eventId);
  const eventTitle = event ? event.title.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Event';

  if (!currentEventRegistrations.length) {
    showToast('No participants to export.', 'warning');
    return;
  }

  const headers = [
    'Registration Number',
    'Student Name',
    'Email',
    'Phone',
    'USN / Student ID',
    'Department',
    'Academic Year',
    'Team Name',
    'Team Members',
    'Status',
    'Feedback Rating',
    'Feedback Review',
    'Registered At',
    'Checked In At',
    'Event Details'
  ];

  const rows = currentEventRegistrations.map(r => [
    `"${r.registrationNumber || ''}"`,
    `"${r.studentName || ''}"`,
    `"${r.studentEmail || ''}"`,
    `"${r.phone || ''}"`,
    `"${r.usnOrStudentId || ''}"`,
    `"${r.department || ''}"`,
    `"${r.year || ''}"`,
    `"${r.teamName || ''}"`,
    `"${(r.teamMembers || '').replace(/"/g, '""')}"`,
    `"${r.status || ''}"`,
    `"${r.feedbackRating || ''}"`,
    `"${(r.feedbackComments || '').replace(/"/g, '""')}"`,
    `"${r.registeredAt || ''}"`,
    `"${r.checkedInAt || ''}"`,
    `"${(r.customData || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${eventTitle}_Registrations.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported ${currentEventRegistrations.length} registrations to CSV! 📥`, 'success');
}

// ============================================================
// Event Analytics & Attendee Feedback Tab
// ============================================================
function initAnalyticsTab() {
  const sel = document.getElementById('analytics-event-select');
  if (!sel) return;

  if (!myEvents || !myEvents.length) {
    sel.innerHTML = '<option value="">No events found</option>';
    return;
  }

  const prev = sel.value;
  sel.innerHTML = myEvents.map(e => `
    <option value="${e.id}">${escapeHtml(e.title)} (${e.date}) [${e.status}]</option>
  `).join('');

  if (prev && myEvents.some(e => e.id == prev)) {
    sel.value = prev;
  } else {
    sel.value = myEvents[0].id;
  }

  loadEventAnalytics();
}

function onAnalyticsEventChange() {
  loadEventAnalytics();
}

async function loadEventAnalytics() {
  const sel = document.getElementById('analytics-event-select');
  const eventId = sel?.value;
  if (!eventId) return;

  try {
    const data = await apiFetch(`/api/events/${eventId}/analytics`);

    // KPI Cards
    document.getElementById('ana-stat-registered').textContent = data.totalRegistrations;
    document.getElementById('ana-stat-attended').textContent   = data.totalAttended;
    document.getElementById('ana-stat-turnout').textContent    = `${data.attendanceRate}%`;
    document.getElementById('ana-stat-avg-rating').textContent = `${data.averageRating} / 5.0`;

    // Big score block
    document.getElementById('ana-big-score').textContent = data.averageRating > 0 ? data.averageRating.toFixed(1) : '—';
    const starsCount = Math.round(data.averageRating);
    document.getElementById('ana-big-stars').textContent = '★'.repeat(starsCount) + '☆'.repeat(Math.max(0, 5 - starsCount));
    document.getElementById('ana-rating-count-sub').textContent = `Based on ${data.totalRatingsCount} verified student reviews`;

    // Rating Breakdown Bars
    const barsContainer = document.getElementById('ana-rating-bars');
    if (barsContainer) {
      const dist = data.ratingDistribution || {};
      const totalRatings = data.totalRatingsCount || 1;
      let barsHtml = '';
      for (let s = 5; s >= 1; s--) {
        const count = dist[s] || 0;
        const pct = data.totalRatingsCount > 0 ? Math.round((count * 100) / totalRatings) : 0;
        barsHtml += `
          <div style="display:flex; align-items:center; gap:10px; font-size:0.85rem;">
            <span style="width:34px; font-weight:700; color:#f59e0b;">${s} ★</span>
            <div class="capacity-bar-track" style="flex:1; height:8px;">
              <div style="width:${pct}%; height:100%; border-radius:4px; background:#f59e0b;"></div>
            </div>
            <span style="width:65px; text-align:right; color:var(--text-muted);">${count} (${pct}%)</span>
          </div>
        `;
      }
      barsContainer.innerHTML = barsHtml;
    }

    // Reviews Feed
    const reviewsContainer = document.getElementById('ana-reviews-container');
    if (reviewsContainer) {
      if (!data.reviews || data.reviews.length === 0) {
        reviewsContainer.innerHTML = '<div class="empty-state" style="padding:24px;"><p>No student reviews submitted for this event yet.</p></div>';
      } else {
        reviewsContainer.innerHTML = data.reviews.map(r => `
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px 18px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <div>
                <strong style="color:var(--text-primary); font-size:0.95rem;">${escapeHtml(r.studentName || 'Student')}</strong>
                <span style="color:var(--accent-cyan); font-family:monospace; font-size:0.8rem; margin-left:8px;">${escapeHtml(r.usn || '')}</span>
                <span style="color:var(--text-muted); font-size:0.8rem; margin-left:6px;">• ${escapeHtml(r.department || '')}</span>
              </div>
              <div style="color:#f59e0b; font-size:1.1rem; letter-spacing:1px;">
                ${'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}
              </div>
            </div>
            <p style="color:var(--text-secondary); font-size:0.88rem; margin:0; line-height:1.5;">
              ${escapeHtml(r.comments || 'Attended event and earned certificate.')}
            </p>
            ${r.submittedAt ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">📅 ${r.submittedAt.substring(0, 16).replace('T', ' ')}</div>` : ''}
          </div>
        `).join('');
      }
    }
  } catch(err) {
    showToast('Failed to load event analytics: ' + err.message, 'error');
  }
}

