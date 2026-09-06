// user.js — Student Portal & Integrated Tool Engines Workspace
'use strict';

// Local safety fallback for escapeHtml
if (typeof window.escapeHtml !== 'function') {
  window.escapeHtml = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
}
const escapeHtml = window.escapeHtml;

if (!requireRole('USER')) { /* redirected */ }
else { init(); }

let allEvents = [];
let myRegistrations = [];
let allClubs = [];
let activeWorkspaceEvent = null;
let activeRegFilter = 'ALL';
let activeRegSearch = '';

// Coding Engine State
const codeTemplates = {
  python: `def two_sum(nums, target):
    # Hash map solution for O(n) runtime
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test with example
print(two_sum([2, 7, 11, 15], 9))
`,
  java: `import java.util.*;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[]{};
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(twoSum(new int[]{2, 7, 11, 15}, 9)));
    }
}
`,
  cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int comp = target - nums[i];
        if (seen.count(comp)) return {seen[comp], i};
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    vector<int> nums = {2, 7, 11, 15};
    vector<int> res = twoSum(nums, 9);
    cout << "[" << res[0] << ", " << res[1] << "]" << endl;
    return 0;
}
`,
  javascript: `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}

console.log(twoSum([2, 7, 11, 15], 9));
`
};

// Quiz Engine State
let quizQuestions = [];
let currentQuestionIndex = 0;
let userQuizAnswers = {};
let quizTimerInterval = null;
let quizSecondsLeft = 30;

// Canvas State
let canvas, ctx;
let canvasElements = [];

let eventsLoadingTimer = null;
let regsLoadingTimer = null;

async function init() {
  document.getElementById('user-name').textContent   = getUserName() || 'Student';
  document.getElementById('user-avatar').textContent = (getUserName() || 'S')[0].toUpperCase();

  // Load events, registrations, and clubs concurrently so one slow endpoint doesn't block others
  Promise.allSettled([
    loadEvents(),
    loadMyRegistrations(),
    loadClubs()
  ]).then(() => {
    if (typeof initCanvas === 'function') {
      initCanvas();
    }
  });

  // Check URL query param registerEventId or pendingEventRegisterId in storage
  const urlParams = new URLSearchParams(window.location.search);
  const regEventId = urlParams.get('registerEventId') || sessionStorage.getItem('pendingEventRegisterId') || localStorage.getItem('pendingEventRegisterId');
  if (regEventId) {
    sessionStorage.removeItem('pendingEventRegisterId');
    localStorage.removeItem('pendingEventRegisterId');
    const parsedId = parseInt(regEventId, 10);
    showSection('events');
    const tryOpen = (attempts = 0) => {
      if (allEvents && allEvents.some(e => e.id == parsedId || String(e.id) === String(regEventId))) {
        openRegistrationModal(parsedId);
      } else if (attempts < 20) {
        setTimeout(() => tryOpen(attempts + 1), 150);
      }
    };
    setTimeout(tryOpen, 100);
  }
}

// ============================================================
// Section Switching & Mobile Nav
// ============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}
window.toggleSidebar = toggleSidebar;

function showSection(name) {
  // Always close any active modals and restore scrolling
  if (typeof closeAllModals === 'function') {
    closeAllModals();
  } else {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
    document.body.style.overflow = '';
  }

  // Close mobile sidebar drawer if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');

  document.querySelectorAll('[id^="section-"]').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const sectionEl = document.getElementById(`section-${name}`);
  if (sectionEl) sectionEl.style.display = '';

  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('onclick')?.includes(name)) item.classList.add('active');
  });

  const titleMap = {
    'events': ['Browse Events', 'Discover, register, and participate using integrated event tools'],
    'clubs': ['Student Clubs', 'Explore active campus clubs and leadership'],
    'my-registrations': ['My Registrations', 'Your upcoming event schedule, entry ticket passes, and workspaces'],
    'certificates': ['Certificates & Verification', 'View your earned certificates and verify academic credentials'],
    'vtu-points': ['VTU AICTE Activity Points', 'Official 100-Point Activity Tracker & Digital Evaluation Transcript']
  };

  if (titleMap[name]) {
    document.getElementById('page-title').textContent    = titleMap[name][0];
    document.getElementById('page-subtitle').textContent = titleMap[name][1];
  }

  if (name === 'my-registrations') {
    loadMyRegistrations();
  } else if (name === 'certificates') {
    loadMyCertificatesTab();
  } else if (name === 'vtu-points') {
    loadVtuPointsTab();
  }
}

// ============================================================
// Load Events & Registrations
// ============================================================
async function loadEvents() {
  const grid = document.getElementById('events-grid');
  if (grid && (!allEvents || allEvents.length === 0)) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 48px 20px;">
        <div style="font-size: 2.2rem; margin-bottom: 12px; animation: spin 1s linear infinite; display: inline-block;">⏳</div>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Loading campus events...</h3>
        <p style="color: var(--text-muted); font-size: 0.875rem;" id="events-loading-hint">Connecting to KLS GIT Event Registry</p>
      </div>
    `;

    // If still loading after 4 seconds, inform user that server is waking up
    clearTimeout(eventsLoadingTimer);
    eventsLoadingTimer = setTimeout(() => {
      const hint = document.getElementById('events-loading-hint');
      if (hint) {
        hint.innerHTML = `
          <div style="margin-top: 12px; padding: 14px 18px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 8px; max-width: 480px; margin-left: auto; margin-right: auto; text-align: left;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom: 6px;">
              <span style="font-size: 1.2rem;">⚡</span>
              <strong style="color: var(--accent-cyan); font-size: 0.95rem;">Cloud server waking up</strong>
            </div>
            <div style="font-size: 0.825rem; color: var(--text-secondary); line-height: 1.45;">
              Render cloud servers hibernate when inactive. The initial spin-up can take <strong>30–50 seconds</strong>. Your dashboard will appear automatically once ready!
            </div>
          </div>
        `;
      }
    }, 4000);
  }

  try {
    allEvents = await apiFetch('/api/events/approved');
    clearTimeout(eventsLoadingTimer);
    renderEvents(allEvents);
  } catch (err) {
    clearTimeout(eventsLoadingTimer);
    console.error('Failed to load events:', err);
    if (grid) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 48px 24px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">⚠️</div>
          <h3 style="font-weight: 700; color: var(--accent-red); margin-bottom: 6px;">Unable to load events</h3>
          <p style="font-size: 0.875rem; color: var(--text-muted); max-width: 460px; margin: 0 auto 18px;">
            ${escapeHtml(err.message || 'The server took longer than usual to respond or is still starting.')}
          </p>
          <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="loadEvents()" style="font-weight: 600; padding: 9px 24px;">
              🔄 Retry Loading Events
            </button>
            <button class="btn btn-secondary" onclick="showSection('my-registrations')" style="padding: 9px 20px;">
              📋 View My Registrations
            </button>
          </div>
        </div>
      `;
    }
    showToast('Failed to load events: ' + (err.message || 'Server waking up. Click Retry.'), 'error');
  }
}

async function loadMyRegistrations() {
  const tbody = document.getElementById('my-reg-tbody');
  if (tbody && (!myRegistrations || myRegistrations.length === 0)) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:36px 16px;">
          <div style="font-size:2rem; margin-bottom:8px; animation: spin 1s linear infinite; display:inline-block;">⏳</div>
          <div style="font-weight:600; color:var(--text-primary);">Loading your event registrations...</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;" id="reg-loading-hint">Connecting to KLS GIT Event Registry</div>
        </td>
      </tr>
    `;

    clearTimeout(regsLoadingTimer);
    regsLoadingTimer = setTimeout(() => {
      const hint = document.getElementById('reg-loading-hint');
      if (hint) {
        hint.innerHTML = `<span style="color:var(--accent-cyan); font-weight:600;">⚡ Server is waking up (cold start can take ~30-50s)...</span>`;
      }
    }, 4000);
  }
  try {
    myRegistrations = await apiFetch('/api/registrations/my');
    clearTimeout(regsLoadingTimer);
    updateRegNavBadge();
    renderMyRegistrations();
  } catch (err) {
    clearTimeout(regsLoadingTimer);
    console.error('Failed to load registrations:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:32px 16px;">
            <div style="font-size:2rem; margin-bottom:8px;">⚠️</div>
            <div style="font-weight:700; color:var(--accent-red); margin-bottom:4px;">Unable to load registrations</div>
            <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:14px;">${escapeHtml(err.message || 'Server connection error')}</div>
            <button class="btn btn-secondary btn-sm" onclick="loadMyRegistrations()">🔄 Retry Loading</button>
          </td>
        </tr>
      `;
    }
  }
}

function updateRegNavBadge() {
  const badge = document.getElementById('nav-reg-count');
  if (!badge) return;
  const count = Array.isArray(myRegistrations) ? myRegistrations.filter(r => r.status !== 'CANCELLED').length : 0;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

async function loadClubs() {
  const grid = document.getElementById('clubs-grid');
  try {
    allClubs = await apiFetch('/api/clubs');
    renderClubs(allClubs);
  } catch (err) {
    console.error('Failed to load clubs:', err);
    if (grid && (!allClubs || allClubs.length === 0)) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🏛️</div>
          <p style="color: var(--text-muted); margin-bottom: 12px;">Unable to load clubs right now.</p>
          <button class="btn btn-secondary btn-sm" onclick="loadClubs()">🔄 Retry</button>
        </div>
      `;
    }
  }
}

// ============================================================
// Render Events Grid
// ============================================================
// ============================================================
// Render Events Grid with Registration State & Clean Layout
// ============================================================
let activeRegisteringEvent = null;

function renderEvents(events) {
  const grid = document.getElementById('events-grid');
  if (!events || !events.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1; padding:48px 20px;">
        <div class="empty-icon">📅</div>
        <h3>No approved events available</h3>
        <p style="color:var(--text-muted); margin-bottom:14px;">Check back soon for new club competitions and activities.</p>
        <button class="btn btn-secondary btn-sm" onclick="loadEvents()">🔄 Refresh Events</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = events.map(e => {
    const reg = myRegistrations.find(r => (r.eventId === e.id || (r.event && r.event.id === e.id)) && r.status !== 'CANCELLED');
    const typeBadge = formatTypeBadge(e.eventType);
    const toolChips = (e.tools && e.tools.length)
      ? e.tools.map(t => `<span class="tool-badge-chip">${formatToolName(t)}</span>`).join('')
      : '<span style="font-size:0.75rem; color:var(--text-muted);">Standard Entry</span>';

    const maxCap = e.maxParticipants ? `${e.maxParticipants} Seats Max` : 'Open Capacity';
    const timeDisplay = e.startTime
      ? `${e.date} (${e.startTime}${e.endTime ? ' - ' + e.endTime : ''})`
      : (e.time ? `${e.date} (${e.time})` : e.date);

    return `
      <div class="event-card" onclick="openEventDetails(${e.id})" style="cursor:pointer; position:relative;" title="Click to view event details">
        <div class="event-card-stripe"></div>
        <div class="event-card-body">
          <div class="event-card-badges">
            ${typeBadge}
            <span class="event-card-club">🏗️ ${e.club ? e.club.name : 'College Club'}</span>
          </div>

          <h3 class="event-card-title" title="Click to view full event details">
            ${e.title}
          </h3>

          <p class="event-card-desc">
            ${e.description || 'Join this exciting college club activity and participate in competitions.'}
          </p>

          <div class="event-card-tools">
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-bottom:4px;">AVAILABLE TOOLS:</div>
            <div class="tool-chips-container">${toolChips}</div>
          </div>

          <div class="event-card-meta">
            <div>📅 ${timeDisplay}</div>
            <div>📍 ${e.venue || 'Campus Center'} • 👥 ${maxCap}</div>
          </div>

          <div class="event-card-footer">
            <button class="btn btn-secondary" style="flex:1;" onclick="event.stopPropagation(); openEventDetails(${e.id})">
              🔍 Details
            </button>
            ${reg
              ? `
                <button class="btn btn-primary" style="flex:1.2;" onclick="event.stopPropagation(); openWorkspace(${e.id})">
                  🚀 Workspace
                </button>
              `
              : `
                <button class="btn btn-primary" style="flex:1.2;" onclick="event.stopPropagation(); openRegistrationModal(${e.id})">
                  🎟️ Register
                </button>
              `
            }
          </div>
          ${reg ? `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); border-radius:6px; padding:5px 10px; margin-top:2px;" onclick="event.stopPropagation()">
              <span style="font-size:0.75rem; font-weight:700; color:var(--accent-green);">✓ ${reg.status}</span>
              <span style="font-size:0.75rem; font-family:monospace; color:var(--accent-cyan); cursor:pointer;" onclick="viewTicketPassById(${reg.id})">🎫 ${reg.registrationNumber || 'PASS'}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// Comprehensive Event Details Modal
// ============================================================
function openEventDetails(eventId) {
  const event = allEvents.find(e => e.id === eventId);
  if (!event) return;

  const reg = myRegistrations.find(r => (r.eventId === eventId || (r.event && r.event.id === eventId)) && r.status !== 'CANCELLED');

  document.getElementById('detail-type-badge').innerHTML = formatTypeBadge(event.eventType);
  document.getElementById('detail-club-badge').textContent = event.club ? event.club.name : 'College Club';

  const timeDisplay = event.startTime
    ? `${event.date} (${event.startTime}${event.endTime ? ' - ' + event.endTime : ''})`
    : (event.time ? `${event.date} (${event.time})` : event.date);

  const maxCap = event.maxParticipants || 100;
  const deadline = event.registrationDeadline ? formatDate(event.registrationDeadline) : 'Open until event start';

  // Format tools list with descriptions
  const toolsHtml = (event.tools && event.tools.length)
    ? event.tools.map(t => {
        return `
          <div class="detail-tool-card">
            <span style="font-size:1.4rem;">${getToolIcon(t)}</span>
            <div>
              <div style="font-weight:600; font-size:0.875rem; color:var(--text-primary);">${formatToolName(t)}</div>
              <div style="font-size:0.75rem; color:var(--text-secondary);">${getToolDescription(t)}</div>
            </div>
          </div>
        `;
      }).join('')
    : '<div style="font-size:0.85rem; color:var(--text-muted);">Standard event entry. No specialized digital tools required.</div>';

  // Status banner
  let statusBannerHtml = '';
  if (reg) {
    statusBannerHtml = `
      <div style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:var(--radius-md); padding:14px 18px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--accent-green);">Your Registration Status</div>
            <div style="font-size:1.1rem; font-weight:800; color:#fff; margin-top:2px;">${formatRegStatusBadge(reg.status)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.75rem; color:var(--text-muted);">Ticket Pass #</div>
            <div style="font-family:monospace; font-weight:700; color:var(--accent-cyan); font-size:0.95rem;">${reg.registrationNumber || 'REG-' + reg.id}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    statusBannerHtml = `
      <div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.2); border-radius:var(--radius-md); padding:14px 18px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:700; color:var(--text-primary); font-size:0.9rem;">Registration is Open</div>
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">Review the requirements above and proceed to register.</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="closeModal('event-detail-modal'); openRegistrationModal(${event.id});">
          🎟️ Register Now
        </button>
      </div>
    `;
  }

  const contentEl = document.getElementById('detail-modal-content');
  contentEl.innerHTML = `
    <div class="detail-hero-box">
      <h2 style="font-size:1.45rem; font-weight:800; color:#fff; margin-bottom:6px;">${event.title}</h2>
      <div style="font-size:0.85rem; color:var(--accent-cyan); font-weight:600;">
        Organized by ${event.club ? event.club.name : 'College Club'}
      </div>
    </div>

    ${statusBannerHtml}

    <div class="detail-meta-grid">
      <div class="detail-meta-item">
        <span class="meta-icon">📅</span>
        <div>
          <div class="meta-label">Date & Timing</div>
          <div class="meta-val">${timeDisplay}</div>
        </div>
      </div>
      <div class="detail-meta-item">
        <span class="meta-icon">📍</span>
        <div>
          <div class="meta-label">Venue Location</div>
          <div class="meta-val">${event.venue || 'Campus Center'}</div>
        </div>
      </div>
      <div class="detail-meta-item">
        <span class="meta-icon">👥</span>
        <div>
          <div class="meta-label">Seat Capacity</div>
          <div class="meta-val">${maxCap} Seats</div>
        </div>
      </div>
      <div class="detail-meta-item">
        <span class="meta-icon">⏳</span>
        <div>
          <div class="meta-label">Registration Deadline</div>
          <div class="meta-val">${deadline}</div>
        </div>
      </div>
    </div>

    <div style="margin-bottom:20px;">
      <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:8px;">About This Event</h4>
      <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.7; white-space:pre-line;">
        ${event.description || 'No detailed description available.'}
      </p>
    </div>

    <div style="margin-bottom:20px;">
      <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:10px;">Integrated Event Tools & Features</h4>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px;">
        ${toolsHtml}
      </div>
    </div>
  `;

  const footerEl = document.getElementById('detail-modal-footer');
  if (reg) {
    footerEl.innerHTML = `
      <button type="button" class="btn btn-secondary" onclick="closeModal('event-detail-modal')">Close</button>
      <button type="button" class="btn btn-danger btn-sm" onclick="closeModal('event-detail-modal'); cancelReg(${event.id});">✕ Cancel Registration</button>
      <button type="button" class="btn btn-secondary" onclick="closeModal('event-detail-modal'); viewTicketPassById(${reg.id});">🎫 Digital Ticket Pass</button>
      <button type="button" class="btn btn-primary" onclick="closeModal('event-detail-modal'); openWorkspace(${event.id});">🚀 Open Workspace</button>
    `;
  } else {
    footerEl.innerHTML = `
      <button type="button" class="btn btn-secondary" onclick="closeModal('event-detail-modal')">Close</button>
      <button type="button" class="btn btn-primary" onclick="closeModal('event-detail-modal'); openRegistrationModal(${event.id});">
        🎟️ Proceed to Registration Form →
      </button>
    `;
  }

  openModal('event-detail-modal');
}

function getToolIcon(tool) {
  const icons = {
    CODE_EDITOR: '💻', CODE_COMPILER: '⚙️', TEST_CASES: '🧪',
    QUIZ_ENGINE: '🧠', DESIGN_EDITOR: '🎨', TEAM_FORMATION: '👥',
    FILE_SUBMISSION: '📁', GITHUB_INTEGRATION: '🐙', JUDGE_PANEL: '⚖️',
    TIMER: '⏱️', LEADERBOARD: '🏆', ATTENDANCE: '📋', CERTIFICATE: '📜'
  };
  return icons[tool] || '⚙️';
}

function getToolDescription(tool) {
  const desc = {
    CODE_EDITOR: 'In-browser syntax-highlighted IDE for Python, Java, C++, and JS.',
    CODE_COMPILER: 'Online cloud compiler executing automated unit test cases.',
    TEST_CASES: 'Real-time test runner checking edge cases and time limits.',
    QUIZ_ENGINE: 'Timed multiple-choice engine with auto-grading.',
    DESIGN_EDITOR: 'HTML5 Vector canvas for digital poster and flyer creations.',
    TEAM_FORMATION: 'Collaborative team registration with member credentials.',
    FILE_SUBMISSION: 'Project artifact and demo link submissions repository.',
    GITHUB_INTEGRATION: 'Live GitHub repo verification and clone testing.',
    JUDGE_PANEL: '100-point rubric evaluation criteria scoring.',
    TIMER: 'Synchronized live competition countdown timer.',
    LEADERBOARD: 'Real-time dynamic ranking of participant scores.',
    ATTENDANCE: 'Venue check-in and attendee verification.',
    CERTIFICATE: 'Cryptographically verifiable digital certificates.'
  };
  return desc[tool] || 'Event capability module.';
}


// ============================================================
// Render My Registrations Table with Filtering & Search
// ============================================================
function setRegFilter(filter) {
  activeRegFilter = filter;
  document.querySelectorAll('.reg-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
  });
  renderMyRegistrations();
}
window.setRegFilter = setRegFilter;

function filterRegistrationsInput(query) {
  activeRegSearch = (query || '').toLowerCase().trim();
  renderMyRegistrations();
}
window.filterRegistrationsInput = filterRegistrationsInput;

function renderMyRegistrations() {
  const tbody = document.getElementById('my-reg-tbody');
  if (!tbody) return;

  if (!myRegistrations || !myRegistrations.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:48px 16px;">
          <div class="empty-state">
            <div style="font-size:2.4rem; margin-bottom:10px;">📋</div>
            <h3 style="margin:0 0 6px; font-size:1.15rem; color:var(--text-primary);">No Event Registrations Yet</h3>
            <p style="margin:0 0 16px; font-size:0.85rem; color:var(--text-muted);">You have not registered for any campus competitions or workshops yet.</p>
            <button class="btn btn-primary btn-sm" onclick="showSection('events')">🎯 Browse Events & Register</button>
          </div>
        </td>
      </tr>
    `;
    const countLabel = document.getElementById('my-reg-count-label');
    if (countLabel) countLabel.textContent = '0 Registrations';
    return;
  }

  let list = myRegistrations;

  // Filter by status tab
  if (activeRegFilter && activeRegFilter !== 'ALL') {
    list = list.filter(r => {
      const s = String(r.status || '').toUpperCase();
      if (activeRegFilter === 'UPCOMING') return s === 'CONFIRMED' || s === 'REGISTERED';
      if (activeRegFilter === 'ATTENDED') return s === 'ATTENDED';
      if (activeRegFilter === 'WAITLISTED') return s === 'WAITLISTED';
      if (activeRegFilter === 'CANCELLED') return s === 'CANCELLED';
      return true;
    });
  }

  // Filter by search query
  if (activeRegSearch) {
    list = list.filter(r => {
      const title = (r.eventTitle || (r.event ? r.event.title : '')).toLowerCase();
      const club = (r.clubName || (r.event && r.event.club ? r.event.club.name : '')).toLowerCase();
      const num = (r.registrationNumber || ('REG-' + r.id)).toLowerCase();
      return title.includes(activeRegSearch) || club.includes(activeRegSearch) || num.includes(activeRegSearch);
    });
  }

  const countLabel = document.getElementById('my-reg-count-label');
  if (countLabel) {
    countLabel.textContent = `${list.length} of ${myRegistrations.length} Registrations`;
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:36px 16px;">
          <div style="color:var(--text-muted); font-size:0.9rem;">No registrations match your current filter.</div>
          <button class="btn btn-secondary btn-sm" style="margin-top:10px;" onclick="setRegFilter('ALL'); const inp = document.getElementById('my-reg-search-input'); if (inp) inp.value=''; filterRegistrationsInput('');">Clear Filters</button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((r, i) => {
    const title = r.eventTitle || (r.event ? r.event.title : 'Campus Event');
    const club = r.clubName || (r.event && r.event.club ? r.event.club.name : 'College Club');
    const date = r.eventDate || (r.event ? r.event.date : '—');
    const time = r.eventTime ? String(r.eventTime).substring(0, 5) : '';
    const venue = r.eventVenue || (r.event ? r.event.venue : 'Campus Center');
    const eventId = r.eventId || (r.event ? r.event.id : null);
    const regNum = r.registrationNumber || ('REG-' + r.id);

    const statusBadgeHtml = formatRegStatusBadge(r.status);

    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <span style="font-family:monospace; font-weight:700; color:var(--accent-cyan); font-size:0.88rem;">${escapeHtml(regNum)}</span>
          ${r.checkedInAt ? '<br><small style="color:var(--accent-green); font-weight:600;">✓ Checked-In</small>' : ''}
        </td>
        <td>
          <div style="font-weight:600; color:#fff; font-size:0.95rem;">${escapeHtml(title)}</div>
          ${r.teamName ? `<div style="font-size:0.75rem; color:#c7d2fe; margin-top:2px;">👥 Team: <strong>${escapeHtml(r.teamName)}</strong></div>` : ''}
          <small style="color:var(--text-muted);">${r.usnOrStudentId ? 'USN: ' + escapeHtml(r.usnOrStudentId) : ''}</small>
        </td>
        <td><span style="font-size:0.85rem; color:var(--text-secondary);">${escapeHtml(club)}</span></td>
        <td>
          <div style="font-size:0.85rem; font-weight:500;">📅 ${escapeHtml(date)} ${time ? '⏰ ' + time : ''}</div>
          <small style="color:var(--text-muted);">📍 ${escapeHtml(venue)}</small>
        </td>
        <td>${statusBadgeHtml}</td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <button class="btn btn-sm btn-secondary" onclick="viewTicketPassById(${r.id})" title="View Scannable QR Ticket Pass">
              🎫 Pass & QR
            </button>
            ${(r.status === 'ATTENDED' && eventId) ? `
              <button class="btn btn-sm btn-success" onclick="viewCertificateGated(${eventId})" title="View / Download Official Certificate">
                🎓 Certificate
              </button>
            ` : ''}
            ${eventId ? `
              <button class="btn btn-sm btn-primary" onclick="openWorkspace(${eventId})" title="Open Competition & Event Tools">
                🚀 Tools
              </button>
            ` : ''}
            ${r.status !== 'CANCELLED' && eventId ? `
              <button class="btn btn-sm btn-danger" onclick="cancelReg(${eventId})" title="Cancel Registration">
                ✕
              </button>
            ` : ''}
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
// Dynamic Event Registration Form Workflow
// ============================================================
function openRegistrationModal(eventId) {
  const event = allEvents.find(e => e.id === eventId);
  if (!event) return;

  activeRegisteringEvent = event;

  // Title & Type Badges
  document.getElementById('reg-event-title').textContent = event.title;
  document.getElementById('reg-club-badge').textContent  = event.club ? event.club.name : 'College Club';
  document.getElementById('reg-event-type-badge').innerHTML = formatTypeBadge(event.eventType);

  // Student Profile Pre-population
  document.getElementById('reg-name').value  = getUserName() || 'Student';
  document.getElementById('reg-email').value = localStorage.getItem('userEmail') || localStorage.getItem('user_email') || 'student@college.edu';

  // Capacity & Deadline Banner
  const capText = event.maxParticipants ? `Max ${event.maxParticipants} Seats` : 'Unlimited Capacity';
  const deadline = event.registrationDeadline ? `Cutoff: ${event.registrationDeadline}` : 'Open Registration';
  document.getElementById('reg-capacity-count').textContent = `👥 ${capText}`;
  document.getElementById('reg-deadline-text').textContent   = `📅 ${deadline}`;

  // Team Registration Reset & Auto-Suggest
  const isHackathon = (event.eventType === 'HACKATHON');
  const teamCheck = document.getElementById('reg-is-team-checkbox');
  if (teamCheck) {
    teamCheck.checked = isHackathon;
    toggleTeamRegistrationFields();
  }
  const teamNameInput = document.getElementById('reg-team-name');
  if (teamNameInput) teamNameInput.value = '';
  const teamList = document.getElementById('reg-teammates-list');
  if (teamList) {
    teamList.innerHTML = '';
    if (isHackathon) addTeammateInput();
  }

  // Populate Event-Type Dynamic Section
  renderDynamicQuestions(event.eventType);

  openModal('registration-modal');
}

function renderDynamicQuestions(eventType) {
  const container = document.getElementById('dynamic-questions-container');
  const type = eventType || 'OTHER';

  let html = '';

  switch (type) {
    case 'CODING':
      html = `
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Preferred Programming Languages *</label>
          <div class="choice-chips-grid">
            <label class="choice-chip"><input type="checkbox" name="dyn_lang" value="Python" checked /> Python</label>
            <label class="choice-chip"><input type="checkbox" name="dyn_lang" value="Java" checked /> Java</label>
            <label class="choice-chip"><input type="checkbox" name="dyn_lang" value="C++" /> C++</label>
            <label class="choice-chip"><input type="checkbox" name="dyn_lang" value="JavaScript" /> JavaScript</label>
            <label class="choice-chip"><input type="checkbox" name="dyn_lang" value="Go" /> Go</label>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
          <div class="form-group">
            <label class="form-label">Experience Level *</label>
            <select class="form-control" id="dyn-experience" required>
              <option value="Beginner">Beginner (0 - 1 years)</option>
              <option value="Intermediate" selected>Intermediate (1 - 3 years)</option>
              <option value="Advanced">Advanced (3+ years)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">GitHub / Portfolio URL</label>
            <input type="url" class="form-control" id="dyn-github" placeholder="https://github.com/username" />
          </div>
        </div>
      `;
      break;

    case 'HACKATHON':
      html = `
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Registration Type *</label>
          <div style="display:flex; gap:16px; margin-top:6px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="dyn_hack_type" value="TEAM" checked onchange="toggleHackTeamFields(true)" /> Create / Join Team
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="dyn_hack_type" value="INDIVIDUAL" onchange="toggleHackTeamFields(false)" /> Individual Participant
            </label>
          </div>
        </div>

        <div id="hack-team-fields" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
          <div class="form-group">
            <label class="form-label">Team Name *</label>
            <input type="text" class="form-control" id="dyn-team-name" placeholder="e.g. ByteStorm" />
          </div>
          <div class="form-group">
            <label class="form-label">Team Members (Names / USNs)</label>
            <input type="text" class="form-control" id="dyn-team-members" placeholder="e.g. Rahul (4XX22CS01), Priya (4XX22CS02)" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
          <div class="form-group">
            <label class="form-label">GitHub Repository / Profile</label>
            <input type="url" class="form-control" id="dyn-hack-github" placeholder="https://github.com/team" />
          </div>
          <div class="form-group">
            <label class="form-label">College / Institute Name</label>
            <input type="text" class="form-control" id="dyn-college" placeholder="College Campus" value="Institute of Technology" />
          </div>
        </div>
      `;
      break;

    case 'CULTURAL':
      html = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
          <div class="form-group">
            <label class="form-label">Performance Category *</label>
            <select class="form-control" id="dyn-cult-category" required>
              <option value="Singing (Classical / Western)">Singing (Classical / Western)</option>
              <option value="Dance (Solo / Group)">Dance (Solo / Group)</option>
              <option value="Drama / Skit">Drama / Skit</option>
              <option value="Instrumental Music">Instrumental Music</option>
              <option value="Fine Arts / Painting">Fine Arts / Painting</option>
              <option value="Photography">Photography</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Participation Type *</label>
            <select class="form-control" id="dyn-cult-type" required>
              <option value="Solo">Solo</option>
              <option value="Duet">Duet</option>
              <option value="Group">Group</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Estimated Performance Duration</label>
          <input type="text" class="form-control" id="dyn-cult-duration" placeholder="e.g. 4 - 5 minutes" />
        </div>
      `;
      break;

    case 'SPORTS':
      html = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
          <div class="form-group">
            <label class="form-label">Sport / Event Category *</label>
            <input type="text" class="form-control" id="dyn-sport-name" placeholder="e.g. Football / Badminton / Chess" required />
          </div>
          <div class="form-group">
            <label class="form-label">Playing Position / Weight Category</label>
            <input type="text" class="form-control" id="dyn-sport-pos" placeholder="e.g. Striker / Singles / 65kg" />
          </div>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Department / House Team</label>
          <input type="text" class="form-control" id="dyn-sport-team" placeholder="e.g. CS Warriors / Red House" />
        </div>
      `;
      break;

    default: // WORKSHOP, QUIZ, DESIGN, OTHER
      html = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
          <div class="form-group">
            <label class="form-label">Prior Experience with this Domain</label>
            <select class="form-control" id="dyn-general-exp">
              <option value="None">None (First time)</option>
              <option value="Basic">Basic Familiarity</option>
              <option value="Experienced">Hands-on Experience</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Key Topic of Interest</label>
            <input type="text" class="form-control" id="dyn-general-interest" placeholder="e.g. Cloud AI, UI/UX, Trivia" />
          </div>
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">What do you hope to learn or achieve?</label>
          <textarea class="form-control" id="dyn-general-goals" rows="2" placeholder="Briefly describe your expectations..."></textarea>
        </div>
      `;
  }

  // Dynamically append custom questionnaire configured by coordinator
  if (activeRegisteringEvent && activeRegisteringEvent.registrationFormSchema) {
    try {
      const customFields = typeof activeRegisteringEvent.registrationFormSchema === 'string'
        ? JSON.parse(activeRegisteringEvent.registrationFormSchema)
        : activeRegisteringEvent.registrationFormSchema;

      if (Array.isArray(customFields) && customFields.length > 0) {
        let customHtml = `
          <div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--border);">
            <div style="font-weight:700; color:var(--accent-blue); font-size:0.85rem; margin-bottom:10px;">
              📋 Event Organizer Questionnaire
            </div>
        `;
        customFields.forEach((f, idx) => {
          const fid = `custom_q_${idx}`;
          const req = f.required ? 'required' : '';
          const reqStar = f.required ? ' *' : '';
          customHtml += `<div class="form-group" style="margin-bottom:12px;">`;
          customHtml += `<label class="form-label">${escapeHtml(f.label || f.name)}${reqStar}</label>`;
          if (f.type === 'select' && Array.isArray(f.options)) {
            customHtml += `<select class="form-control" id="${fid}" data-fieldname="${escapeHtml(f.name)}" ${req}>`;
            customHtml += `<option value="" disabled selected>Select an option</option>`;
            f.options.forEach(opt => {
              customHtml += `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`;
            });
            customHtml += `</select>`;
          } else if (f.type === 'textarea') {
            customHtml += `<textarea class="form-control" id="${fid}" data-fieldname="${escapeHtml(f.name)}" rows="2" placeholder="Your answer..." ${req}></textarea>`;
          } else {
            customHtml += `<input type="${f.type || 'text'}" class="form-control" id="${fid}" data-fieldname="${escapeHtml(f.name)}" placeholder="Your answer..." ${req} />`;
          }
          customHtml += `</div>`;
        });
        customHtml += `</div>`;
        html += customHtml;
      }
    } catch (err) {
      console.warn('Failed to parse registrationFormSchema:', err);
    }
  }

  container.innerHTML = html;
}

function toggleHackTeamFields(isTeam) {
  const el = document.getElementById('hack-team-fields');
  if (el) el.style.display = isTeam ? 'grid' : 'none';
}

// ============================================================
// Submit Dynamic Registration
// ============================================================
async function submitDynamicRegistration(e) {
  e.preventDefault();
  if (!activeRegisteringEvent) return;

  const btn = document.getElementById('confirm-reg-btn');
  btn.disabled = true;
  btn.textContent = 'Processing Registration...';

  try {
    const phone      = document.getElementById('reg-phone').value.trim();
    const usn        = document.getElementById('reg-usn').value.trim();
    const department = document.getElementById('reg-dept').value;
    const year       = document.getElementById('reg-year').value;

    // Gather event-specific custom data
    const customDataObj = {
      submittedAt: new Date().toISOString()
    };

    const eventType = activeRegisteringEvent.eventType || 'OTHER';
    if (eventType === 'CODING') {
      const langs = Array.from(document.querySelectorAll('input[name="dyn_lang"]:checked')).map(cb => cb.value);
      customDataObj.languages = langs;
      customDataObj.experienceLevel = document.getElementById('dyn-experience')?.value || 'Intermediate';
      customDataObj.githubUrl = document.getElementById('dyn-github')?.value.trim() || '';
    } else if (eventType === 'HACKATHON') {
      const hackType = document.querySelector('input[name="dyn_hack_type"]:checked')?.value || 'TEAM';
      customDataObj.registrationType = hackType;
      customDataObj.teamName = document.getElementById('dyn-team-name')?.value.trim() || '';
      customDataObj.teamMembers = document.getElementById('dyn-team-members')?.value.trim() || '';
      customDataObj.githubUrl = document.getElementById('dyn-hack-github')?.value.trim() || '';
      customDataObj.college = document.getElementById('dyn-college')?.value.trim() || '';
    } else if (eventType === 'CULTURAL') {
      customDataObj.category = document.getElementById('dyn-cult-category')?.value || '';
      customDataObj.participationType = document.getElementById('dyn-cult-type')?.value || '';
      customDataObj.duration = document.getElementById('dyn-cult-duration')?.value.trim() || '';
    } else if (eventType === 'SPORTS') {
      customDataObj.sport = document.getElementById('dyn-sport-name')?.value.trim() || '';
      customDataObj.position = document.getElementById('dyn-sport-pos')?.value.trim() || '';
      customDataObj.team = document.getElementById('dyn-sport-team')?.value.trim() || '';
    } else {
      customDataObj.priorExperience = document.getElementById('dyn-general-exp')?.value || '';
      customDataObj.topicInterest = document.getElementById('dyn-general-interest')?.value.trim() || '';
      customDataObj.goals = document.getElementById('dyn-general-goals')?.value.trim() || '';
    }

    // Validate and collect organizer custom questionnaire responses
    for (const reqEl of document.querySelectorAll('[id^="custom_q_"][required]')) {
      if (!reqEl.value || !reqEl.value.trim()) {
        const lbl = reqEl.previousElementSibling ? reqEl.previousElementSibling.textContent.replace('*', '').trim() : 'field';
        showToast(`Please complete the required question: "${lbl}"`, 'error');
        btn.disabled = false;
        btn.textContent = '🎟️ Confirm Registration & Get Pass';
        return;
      }
    }

    const customFieldResponses = {};
    document.querySelectorAll('[id^="custom_q_"]').forEach(el => {
      const fieldName = el.getAttribute('data-fieldname') || el.id;
      customFieldResponses[fieldName] = el.value ? el.value.trim() : '';
    });
    if (Object.keys(customFieldResponses).length > 0) {
      customDataObj.organizerQuestionnaire = customFieldResponses;
    }

    // Process Team Registration
    let teamName = null;
    let teamMembers = null;
    if (document.getElementById('reg-is-team-checkbox')?.checked) {
      teamName = document.getElementById('reg-team-name')?.value.trim();
      if (!teamName) {
        showToast('Please enter your Squad / Team Name.', 'warning');
        btn.disabled = false;
        btn.textContent = '🎟️ Confirm Registration & Get Pass';
        return;
      }
      const memberInputs = Array.from(document.querySelectorAll('.teammate-input-val'))
        .map(input => input.value.trim())
        .filter(val => val.length > 0);
      teamMembers = JSON.stringify(memberInputs);
    }

    const payload = {
      phone,
      usnOrStudentId: usn,
      department,
      year,
      teamName,
      teamMembers,
      customData: JSON.stringify(customDataObj)
    };

    const res = await apiFetch(`/api/events/${activeRegisteringEvent.id}/register`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    closeModal('registration-modal');
    showToast(`Registered successfully! Status: ${res.status} 🎉`, 'success');

    // Refresh state
    await loadMyRegistrations();
    renderEvents(allEvents);

    // Open Digital Holographic Ticket Pass
    displayTicketPass(res);
  } catch (err) {
    showToast('Registration failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🎟️ Confirm Registration & Get Pass';
  }
}

// ============================================================
// Holographic Digital Ticket Pass & QR Code Rendering
// ============================================================
function viewTicketPassById(registrationId) {
  let reg = myRegistrations.find(r => r.id == registrationId);
  if (!reg) {
    // If not currently in memory array, fetch fresh from server
    apiFetch(`/api/registrations/${registrationId}`).then(data => {
      if (data) displayTicketPass(data);
      else showToast('Registration record not found.', 'warning');
    }).catch(err => {
      showToast('Could not load ticket pass: ' + err.message, 'error');
    });
    return;
  }
  displayTicketPass(reg);
}

function displayTicketPass(reg) {
  if (!reg) return;

  const titleEl = document.getElementById('ticket-event-title');
  if (titleEl) titleEl.textContent = reg.eventTitle || (reg.event ? reg.event.title : 'Event Pass');

  const clubEl = document.getElementById('ticket-club-name');
  if (clubEl) clubEl.textContent = (reg.clubName || (reg.event && reg.event.club ? reg.event.club.name : 'COLLEGE CLUB')).toUpperCase();

  const typeEl = document.getElementById('ticket-event-type-badge');
  if (typeEl) typeEl.innerHTML = formatTypeBadge(reg.eventType || (reg.event ? reg.event.eventType : 'OTHER'));

  const dateEl = document.getElementById('ticket-date');
  if (dateEl) dateEl.textContent = `📅 ${reg.eventDate || (reg.event ? reg.event.date : 'TBA')}`;

  const timeEl = document.getElementById('ticket-time');
  if (timeEl) {
    const timeStr = reg.eventTime ? String(reg.eventTime).substring(0, 5) : '10:00 AM';
    timeEl.textContent = `⏰ ${timeStr}`;
  }

  const venueEl = document.getElementById('ticket-venue');
  if (venueEl) venueEl.textContent = `📍 ${reg.eventVenue || (reg.event ? reg.event.venue : 'Campus Center')}`;

  const nameEl = document.getElementById('ticket-student-name');
  if (nameEl) nameEl.textContent = reg.studentName || getUserName() || 'Student';

  const usnEl = document.getElementById('ticket-student-usn');
  if (usnEl) usnEl.textContent = reg.usnOrStudentId || 'USN REGISTERED';

  const deptEl = document.getElementById('ticket-dept');
  if (deptEl) deptEl.textContent = `${reg.department || 'Engineering'} (${reg.year || '2026'})`;

  const regNumEl = document.getElementById('ticket-reg-number');
  if (regNumEl) regNumEl.textContent = reg.registrationNumber || `REG-${reg.id}`;

  const statusBadgeEl = document.getElementById('ticket-status-badge');
  if (statusBadgeEl) {
    statusBadgeEl.innerHTML = formatRegStatusBadge(reg.status);
  }

  // Render Team Banner if group registration
  const teamBanner = document.getElementById('ticket-team-banner');
  if (teamBanner) {
    if (reg.teamName) {
      document.getElementById('ticket-team-name').textContent = reg.teamName;
      let membersText = '';
      if (reg.teamMembers) {
        try {
          const arr = JSON.parse(reg.teamMembers);
          if (Array.isArray(arr) && arr.length) {
            membersText = 'Squad: ' + arr.join(' • ');
          }
        } catch (e) {
          membersText = 'Squad: ' + reg.teamMembers;
        }
      }
      document.getElementById('ticket-team-members').textContent = membersText;
      teamBanner.style.display = 'block';
    } else {
      teamBanner.style.display = 'none';
    }
  }

  // Render dynamic scannable ZXing QR Code
  const qrString = reg.qrCodeData || reg.registrationNumber || `REG-${reg.id}`;
  const qrBox = document.getElementById('ticket-qr-box');
  if (qrBox) {
    const escapedQr = escapeHtml(qrString);
    qrBox.innerHTML = `
      <img src="/api/registrations/${reg.id}/qr-code" 
           alt="Entry Ticket QR Pass" 
           style="width:160px; height:160px; border-radius:10px; background:#fff; padding:6px; box-shadow:0 4px 14px rgba(0,0,0,0.3); object-fit:contain;"
           onerror="this.onerror=null; this.parentElement.innerHTML = generateQRCodeSVG('${escapedQr}', 140);" />
    `;
  }

  // Update Download QR link
  const downloadLink = document.getElementById('ticket-download-btn');
  if (downloadLink) {
    downloadLink.href = `/api/registrations/${reg.id}/qr-code`;
    downloadLink.setAttribute('download', `Ticket-${reg.registrationNumber || reg.id}-QR.png`);
  }

  openModal('ticket-pass-modal');
}

// ============================================================
// Offline Scalable Vector QR Code Generator
// ============================================================
function generateQRCodeSVG(text, size = 140) {
  const dim = 25; // 25x25 matrix
  const matrix = Array.from({ length: dim }, () => Array(dim).fill(0));

  function setFinder(r, c) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          matrix[r + i][c + j] = 1;
        }
      }
    }
  }
  setFinder(0, 0);
  setFinder(0, dim - 7);
  setFinder(dim - 7, 0);

  // Timing patterns
  for (let i = 8; i < dim - 8; i++) {
    matrix[6][i] = (i % 2 === 0) ? 1 : 0;
    matrix[i][6] = (i % 2 === 0) ? 1 : 0;
  }

  // Generate deterministic bit pattern from text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      const inTopLeft = (r < 8 && c < 8);
      const inTopRight = (r < 8 && c >= dim - 8);
      const inBottomLeft = (r >= dim - 8 && c < 8);
      const onTiming = (r === 6 || c === 6);
      if (inTopLeft || inTopRight || inBottomLeft || onTiming) continue;

      const charCode = text.charCodeAt(bitIdx % text.length) || 42;
      const bit = ((hash ^ (r * 31 + c * 17 + charCode)) >>> (bitIdx % 16)) & 1;
      matrix[r][c] = bit;
      bitIdx++;
    }
  }

  const cellSize = (size / dim).toFixed(2);
  let rects = '';
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if (matrix[r][c] === 1) {
        rects += `<rect x="${(c * cellSize)}" y="${(r * cellSize)}" width="${cellSize}" height="${cellSize}" fill="#0f172a" />`;
      }
    }
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="border-radius:6px; background:#ffffff;">${rects}</svg>`;
}

async function cancelReg(eventId) {
  if (!confirm('Are you sure you want to cancel your registration? (Your spot will be released or offered to waitlisted students)')) return;
  try {
    await apiFetch(`/api/registrations/${eventId}`, { method: 'DELETE' });
    showToast('Registration cancelled. Spot updated.', 'info');
    await loadMyRegistrations();
    renderEvents(allEvents);
  } catch (err) {
    showToast('Could not cancel registration: ' + err.message, 'error');
  }
}

// ============================================================
// Clubs & Follow Management
// ============================================================
let activeClubFilter = 'ALL';

function getFollowedClubIds() {
  try {
    return JSON.parse(localStorage.getItem('kls_followed_clubs') || '[]');
  } catch (e) {
    return [];
  }
}

function toggleFollowClub(clubId) {
  let ids = getFollowedClubIds();
  const idNum = parseInt(clubId);
  const idx = ids.indexOf(idNum);
  let followed = false;
  if (idx > -1) {
    ids.splice(idx, 1);
    followed = false;
  } else {
    ids.push(idNum);
    followed = true;
  }
  localStorage.setItem('kls_followed_clubs', JSON.stringify(ids));
  const club = allClubs.find(c => c.id === idNum);
  const name = club ? club.name : 'Club';
  showToast(followed ? `You are now following ${name}! ⭐` : `Unfollowed ${name}.`, 'info');
  renderClubs(allClubs);

  // If modal is open, update modal button too
  const modalFollowBtn = document.getElementById('club-detail-follow-btn');
  if (modalFollowBtn) {
    modalFollowBtn.innerHTML = followed ? '✓ Following Club' : '⭐ Follow Club';
    modalFollowBtn.className = followed ? 'btn btn-primary' : 'btn btn-secondary';
  }
}

let activeModalClubId = null;
function toggleFollowClubModal() {
  if (activeModalClubId) toggleFollowClub(activeModalClubId);
}

function resolveClubIcon(c, idx) {
  const defaults = ['💻', '🤖', '🎨', '⚽', '📚', '🚀', '🔬', '⚡', '🏆', '🎭'];
  if (!c) return defaults[idx % defaults.length];

  // Match by club name for guaranteed perfect emojis
  const name = (c.name || '').toLowerCase();
  if (name.includes('coding') || name.includes('computer') || name.includes('code')) return '💻';
  if (name.includes('robotics') || name.includes('drone')) return '🤖';
  if (name.includes('design') || name.includes('arts') || name.includes('media')) return '🎨';
  if (name.includes('sport') || name.includes('fitness') || name.includes('athletics')) return '⚽';
  if (name.includes('literary') || name.includes('debate') || name.includes('book')) return '📚';
  if (name.includes('acm') || name.includes('ieee') || name.includes('ai')) return '🚀';

  if (c.logo) {
    const l = (c.logo + '').trim().toLowerCase();
    if (l.startsWith('http://') || l.startsWith('https://') || l.startsWith('/images/')) {
      return `<img src="${c.logo}" alt="${c.name}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;" />`;
    }
    const slugMap = {
      'tech-club': '💻', 'code-tech': '💻', 'coding': '💻', 'coding club': '💻',
      'robotics': '🤖', 'robotics club': '🤖',
      'palette': '🎨', 'design': '🎨', 'design & arts club': '🎨',
      'sports': '⚽', 'fitness': '⚽', 'sports & fitness club': '⚽',
      'book-open': '📚', 'literary': '📚', 'literary society': '📚',
      'acm': '🚀', 'acm student chapter': '🚀', 'ieee': '⚡', 'cultural': '🎭'
    };
    if (slugMap[l]) return slugMap[l];
    if (c.logo.length <= 4 && !/^[a-zA-Z0-9?._-]+$/.test(c.logo) && !c.logo.includes('?')) return c.logo;
  }
  return defaults[idx % defaults.length];
}

function renderClubs(clubs) {
  const grid = document.getElementById('clubs-grid');
  if (!grid) return;

  if (!clubs || clubs.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🏗️</div>
        <h3>No clubs available</h3>
        <p>Campus clubs will appear here once created by administrators.</p>
      </div>`;
    return;
  }

  const followedIds = getFollowedClubIds();
  let displayClubs = clubs;
  if (activeClubFilter === 'FOLLOWED') {
    displayClubs = clubs.filter(c => followedIds.includes(c.id));
  }

  const categoryColors = {
    'Technical': '#6366f1', 'Technology': '#6366f1', 'Robotics': '#f59e0b',
    'Creative': '#ec4899', 'Cultural': '#8b5cf6', 'Literary': '#10b981',
    'Sports': '#ef4444', 'Social': '#06b6d4'
  };

  function getCategoryColor(cat) {
    if (!cat) return '#6366f1';
    for (const [key, val] of Object.entries(categoryColors)) {
      if (cat.includes(key)) return val;
    }
    return '#6366f1';
  }

  // Filter toolbar
  const filterToolbar = `
    <div style="grid-column: 1 / -1; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
      <div style="display:flex; gap:8px;">
        <button class="btn btn-sm ${activeClubFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}" onclick="setClubTab('ALL')">
          🏛️ All Clubs (${clubs.length})
        </button>
        <button class="btn btn-sm ${activeClubFilter === 'FOLLOWED' ? 'btn-primary' : 'btn-secondary'}" onclick="setClubTab('FOLLOWED')">
          ⭐ My Followed Clubs (${followedIds.length})
        </button>
      </div>
      <div style="font-size:0.8rem; color:var(--text-muted);">
        Click any club card to view its full activities, mentors, and schedule.
      </div>
    </div>
  `;

  if (displayClubs.length === 0 && activeClubFilter === 'FOLLOWED') {
    grid.innerHTML = filterToolbar + `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">⭐</div>
        <h3>No Followed Clubs Yet</h3>
        <p>You haven't followed any campus clubs yet. Click the <strong>⭐ Follow</strong> button on any club to pin it here.</p>
        <button class="btn btn-primary btn-sm" style="margin-top:10px;" onclick="setClubTab('ALL')">Browse All Clubs</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filterToolbar + displayClubs.map((c, idx) => {
    const icon = resolveClubIcon(c, idx);
    const cat = c.category || 'Technical & Innovation';
    const accentColor = getCategoryColor(cat);
    const desc = c.description || 'A vibrant student society at KLS GIT Belgaum. Fostering innovation, skill-building, workshops, and competitions.';
    const detailedDesc = c.detailedDescription || '';
    const faculty = c.facultyCoordinatorName || 'Dr. Faculty Mentor (KLS GIT)';
    const studentLead = c.studentCoordinatorName || 'Student President';
    const schedule = c.meetingSchedule || 'Every Wednesday, 5:00 PM';
    const venue = c.venue || 'Campus Innovation Lab';
    const eligibility = c.eligibility || 'Open to all enrolled students at KLS GIT';
    const isFollowed = followedIds.includes(c.id);

    return `
      <div class="card event-card" style="padding:0; overflow:hidden; cursor:pointer; position:relative; transition:transform 0.2s, box-shadow 0.2s;"
           onclick="openClubDetails(${c.id})" title="Click anywhere to view full club profile and activities">
        <!-- Category color bar -->
        <div style="height:4px; background:${accentColor};"></div>
        <div style="padding:22px;">
          <!-- Header row -->
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="
                width:54px; height:54px; border-radius:14px; flex-shrink:0;
                background:linear-gradient(135deg, ${accentColor}22, ${accentColor}44);
                display:flex; align-items:center; justify-content:center;
                font-size:1.7rem; border:1px solid ${accentColor}55;
                box-shadow:0 4px 12px ${accentColor}30;
              ">${icon}</div>
              <div style="min-width:0;">
                <h3 style="margin:0 0 4px; font-size:1.08rem; font-weight:700; color:var(--text-primary);">${c.name}</h3>
                <span style="font-size:0.72rem; color:${accentColor}; font-weight:600; background:${accentColor}1a; padding:2px 8px; border-radius:20px; border:1px solid ${accentColor}40;">${cat}</span>
              </div>
            </div>
            ${isFollowed ? `<span class="badge badge-purple" style="font-size:0.72rem; padding:3px 8px;">⭐ Followed</span>` : ''}
          </div>

          <!-- Tagline -->
          <p style="font-size:0.86rem; color:var(--text-primary); font-weight:500; line-height:1.5; margin-bottom:8px;">
            ${desc}
          </p>

          <!-- Descriptive Mission -->
          ${detailedDesc ? `
          <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.55; margin-bottom:14px; border-left:3px solid ${accentColor}; padding-left:10px; background:rgba(255,255,255,0.02); padding-top:4px; padding-bottom:4px; border-radius:0 6px 6px 0;
            display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
            ${detailedDesc}
          </p>` : ''}

          <!-- Info rows -->
          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:16px; font-size:0.78rem; color:var(--text-muted); background:var(--bg-input); padding:10px 12px; border-radius:var(--radius-md); border:1px solid var(--border);">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>🎓</span>
              <span><strong style="color:var(--text-secondary);">Faculty Advisor:</strong> ${faculty}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span>👨‍💻</span>
              <span><strong style="color:var(--text-secondary);">Student Lead:</strong> ${studentLead}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span>🕐</span>
              <span><strong style="color:var(--text-secondary);">Schedule:</strong> ${schedule}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span>📍</span>
              <span><strong style="color:var(--text-secondary);">Venue:</strong> ${venue}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span>📋</span>
              <span><strong style="color:var(--text-secondary);">Eligibility:</strong> ${eligibility}</span>
            </div>
          </div>

          <!-- Action buttons (with stopPropagation) -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; border-top:1px solid rgba(255,255,255,0.07); padding-top:12px;">
            <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="event.stopPropagation(); openClubDetails(${c.id})">
              📖 Details
            </button>
            <button class="btn ${isFollowed ? 'btn-primary' : 'btn-secondary'} btn-sm" style="flex:1;" onclick="event.stopPropagation(); toggleFollowClub(${c.id})">
              ${isFollowed ? '✓ Following' : '⭐ Follow'}
            </button>
            <a href="/club.html?id=${c.id}" class="btn btn-secondary btn-sm" onclick="event.stopPropagation()" style="text-decoration:none; font-size:0.75rem; padding:6px 10px;" title="Open standalone club portal">
              🌐 Web
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setClubTab(tab) {
  activeClubFilter = tab;
  renderClubs(allClubs);
}

// ============================================================
// Comprehensive Club Details Modal
// ============================================================
function openClubDetails(clubId) {
  const club = allClubs.find(c => c.id === clubId);
  if (!club) return;
  activeModalClubId = clubId;

  const idx = allClubs.findIndex(c => c.id === clubId);
  const icon = resolveClubIcon(club, idx);
  const cat = club.category || 'Technical & Innovation';
  const desc = club.description || 'A vibrant student society at KLS GIT Belgaum.';
  const detailedDesc = club.detailedDescription ||
    'The club serves as a central hub for student innovation, technical projects, collaborative research, and national competitions. Members regularly participate in hands-on workshops, peer-mentored coding challenges, and collegiate exhibitions.';

  const faculty = club.facultyCoordinatorName || 'Dr. Faculty Mentor';
  const facultyEmail = club.facultyCoordinatorEmail || 'faculty@kls.ac.in';
  const studentLead = club.studentCoordinatorName || 'Student President';
  const studentEmail = club.studentCoordinatorEmail || 'lead@kls.ac.in';
  const schedule = club.meetingSchedule || 'Every Wednesday, 5:00 PM - 6:30 PM';
  const venue = club.venue || 'Advanced Innovation Lab, KLS GIT Belgaum';
  const eligibility = club.eligibility || 'Open to all enrolled undergraduate & postgraduate students at KLS GIT';

  // Set modal header
  document.getElementById('club-detail-icon').innerHTML = icon;
  document.getElementById('club-detail-name').textContent = club.name;
  document.getElementById('club-detail-category').textContent = cat;

  // Find club's events
  const clubEvents = allEvents.filter(e => e.club && e.club.id === clubId);
  const eventsHtml = clubEvents.length
    ? clubEvents.map(e => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-input); border:1px solid var(--border); border-radius:var(--radius-md); padding:10px 14px; margin-bottom:8px;">
          <div>
            <div style="font-weight:700; color:var(--text-primary); font-size:0.9rem;">${e.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
              📅 ${e.date} • 📍 ${e.venue || 'Campus Center'}
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="closeModal('club-detail-modal'); openEventDetails(${e.id});">
            View Event →
          </button>
        </div>
      `).join('')
    : '<div style="font-size:0.82rem; color:var(--text-muted); font-style:italic;">No upcoming events scheduled right now. Check back soon!</div>';

  // Content
  const contentEl = document.getElementById('club-detail-content');
  contentEl.innerHTML = `
    <!-- Mission Hero -->
    <div style="background:linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.06)); border:1px solid rgba(99,102,241,0.25); border-radius:var(--radius-md); padding:16px 20px; margin-bottom:18px;">
      <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--accent-cyan); letter-spacing:0.06em; margin-bottom:4px;">Official Society Tagline</div>
      <div style="font-size:1.05rem; font-weight:700; color:#fff; line-height:1.4;">${desc}</div>
      <div style="font-size:0.83rem; color:var(--text-secondary); line-height:1.6; margin-top:10px; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">
        ${detailedDesc}
      </div>
    </div>

    <!-- Leadership Grid -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px;">
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 16px;">
        <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; color:var(--accent-green);">🎓 Faculty Advisor</div>
        <div style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-top:2px;">${faculty}</div>
        <div style="font-size:0.78rem; color:var(--text-muted); font-family:monospace; margin-top:2px;">${facultyEmail}</div>
      </div>
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 16px;">
        <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; color:var(--accent-cyan);">👨‍💻 Student Lead</div>
        <div style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-top:2px;">${studentLead}</div>
        <div style="font-size:0.78rem; color:var(--text-muted); font-family:monospace; margin-top:2px;">${studentEmail}</div>
      </div>
    </div>

    <!-- Logistics Details -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px;">
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 16px;">
        <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; color:var(--accent-amber);">🕐 Regular Meetings</div>
        <div style="font-size:0.85rem; color:var(--text-primary); font-weight:600; margin-top:4px;">${schedule}</div>
      </div>
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 16px;">
        <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; color:var(--accent-amber);">📍 Club Venue / Lab</div>
        <div style="font-size:0.85rem; color:var(--text-primary); font-weight:600; margin-top:4px;">${venue}</div>
      </div>
    </div>

    <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 16px; margin-bottom:18px;">
      <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; color:var(--accent-blue);">📋 Membership Eligibility</div>
      <div style="font-size:0.85rem; color:var(--text-primary); margin-top:4px;">${eligibility}</div>
    </div>

    <!-- Upcoming Events by this Club -->
    <div>
      <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
        <span>📅</span> Upcoming Events by ${club.name} (${clubEvents.length})
      </div>
      ${eventsHtml}
    </div>
  `;

  // Follow button in footer
  const isFollowed = getFollowedClubIds().includes(clubId);
  const followBtn = document.getElementById('club-detail-follow-btn');
  if (followBtn) {
    followBtn.innerHTML = isFollowed ? '✓ Following Club' : '⭐ Follow Club';
    followBtn.className = isFollowed ? 'btn btn-primary' : 'btn btn-secondary';
  }

  // Events button in footer
  const eventsBtn = document.getElementById('club-detail-events-btn');
  if (eventsBtn) {
    eventsBtn.onclick = () => {
      closeModal('club-detail-modal');
      showSection('events');
      const searchEl = document.getElementById('search-input');
      if (searchEl) {
        searchEl.value = club.name;
        filterEvents();
      }
    };
  }

  openModal('club-detail-modal');
}

function filterEvents() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const filtered = allEvents.filter(e =>
    e.title.toLowerCase().includes(q) ||
    (e.description && e.description.toLowerCase().includes(q)) ||
    (e.club && e.club.name.toLowerCase().includes(q)) ||
    (e.eventType && e.eventType.toLowerCase().includes(q))
  );
  renderEvents(filtered);
}


// ============================================================
// EVENT WORKSPACE ORCHESTRATOR & TOOL GATING
// ============================================================
let waitingRoomInterval = null;
let currentWaitingEventId = null;

async function openWorkspace(eventId) {
  let event = allEvents.find(e => e.id == eventId);
  if (!event) {
    try {
      event = await apiFetch(`/api/events/${eventId}`);
    } catch (err) {
      showToast('Could not load event workspace: ' + err.message, 'error');
      return;
    }
  }
  if (!event) {
    showToast('Event details not found for workspace.', 'warning');
    return;
  }

  // Real-time Tool Gating Check with Server
  try {
    const statusRes = await fetch(`/api/events/${eventId}/tools-status`);
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (!statusData.toolsOpened) {
        openWaitingRoom(event, statusData);
        return;
      }
    }
  } catch (err) {
    console.warn('Could not verify tool status, fallback to event property', err);
    if (event.toolsOpened === false) {
      openWaitingRoom(event, null);
      return;
    }
  }

  activeWorkspaceEvent = event;
  document.getElementById('ws-event-title').textContent      = event.title;
  document.getElementById('ws-club-badge').textContent       = event.club ? event.club.name : 'KLS GIT Club';
  document.getElementById('ws-event-type-badge').innerHTML   = formatTypeBadge(event.eventType);

  // Setup visible tabs according to tools
  const tools = new Set(event.tools || []);
  const type = event.eventType;

  // Determine initial active tab
  let initialTab = 'coding';
  if (type === 'CODING' || tools.has('CODE_EDITOR') || tools.has('CODE_COMPILER')) {
    initialTab = 'coding';
  } else if (type === 'QUIZ' || tools.has('QUIZ_ENGINE')) {
    initialTab = 'quiz';
  } else if (type === 'DESIGN' || tools.has('DESIGN_EDITOR')) {
    initialTab = 'design';
  } else if (type === 'HACKATHON' || type === 'PROJECT_EXHIBITION' || tools.has('TEAM_FORMATION') || tools.has('GITHUB_INTEGRATION')) {
    initialTab = 'hackathon';
  } else {
    initialTab = 'leaderboard';
  }

  // Load editor default
  changeCodeLanguage();

  // Load quiz if applicable
  if (initialTab === 'quiz' || tools.has('QUIZ_ENGINE')) {
    await loadQuizQuestions(event.id);
  }

  switchWsTab(initialTab);
  openModal('event-workspace-modal');
}

function openWaitingRoom(event, statusData) {
  currentWaitingEventId = event.id;
  document.getElementById('waiting-event-title').textContent = event.title;
  document.getElementById('waiting-club-name').textContent = event.club ? event.club.name : 'KLS GIT Student Club';
  document.getElementById('waiting-event-date').textContent = event.date || 'Event Day';
  
  const timeWindow = (event.startTime || event.time || '09:00') + (event.endTime ? ' - ' + event.endTime : '');
  document.getElementById('waiting-event-time').textContent = timeWindow;
  document.getElementById('waiting-sync-status').textContent = '📡 Waiting for coordinator to unlock tools...';

  openModal('waiting-room-modal');

  // Start polling every 4 seconds
  if (waitingRoomInterval) clearInterval(waitingRoomInterval);
  waitingRoomInterval = setInterval(async () => {
    await checkWaitingRoomStatusNow();
  }, 4000);
}

async function checkWaitingRoomStatusNow() {
  if (!currentWaitingEventId) return;
  const syncLabel = document.getElementById('waiting-sync-status');
  if (syncLabel) syncLabel.textContent = '🔄 Checking server status...';

  try {
    const res = await fetch(`/api/events/${currentWaitingEventId}/tools-status`);
    if (res.ok) {
      const data = await res.json();
      if (data.toolsOpened) {
        if (waitingRoomInterval) clearInterval(waitingRoomInterval);
        waitingRoomInterval = null;
        closeModal('waiting-room-modal');
        showToast('🎉 Coordinator has opened competition tools! Entering workspace...', 'success');
        const evId = currentWaitingEventId;
        currentWaitingEventId = null;
        setTimeout(() => openWorkspace(evId), 400);
        return;
      }
    }
  } catch (e) {
    console.error(e);
  }
  if (syncLabel) syncLabel.textContent = '📡 Live polling coordinator signal (Locked)...';
}

function closeWaitingRoom() {
  if (waitingRoomInterval) {
    clearInterval(waitingRoomInterval);
    waitingRoomInterval = null;
  }
  currentWaitingEventId = null;
  closeModal('waiting-room-modal');
}

function switchWsTab(tabName) {
  document.querySelectorAll('.ws-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.ws-panel').forEach(p => p.style.display = 'none');

  const btn = document.getElementById(`tab-btn-${tabName}`);
  if (btn) btn.classList.add('active');

  const panel = document.getElementById(`ws-panel-${tabName}`);
  if (panel) panel.style.display = 'block';

  if (tabName === 'leaderboard' && activeWorkspaceEvent) {
    loadLeaderboard(activeWorkspaceEvent.id);
  } else if (tabName === 'quiz' && activeWorkspaceEvent && !quizQuestions.length) {
    loadQuizQuestions(activeWorkspaceEvent.id);
  } else if (tabName === 'design') {
    renderCanvas();
  }
}

// ============================================================
// 1. CODING ENGINE LOGIC
// ============================================================
function changeCodeLanguage() {
  const lang = document.getElementById('code-lang-select').value;
  const editor = document.getElementById('code-editor');
  if (codeTemplates[lang]) {
    editor.value = codeTemplates[lang];
  }
}

async function runCode(isSubmission) {
  if (!activeWorkspaceEvent) return;
  const lang = document.getElementById('code-lang-select').value;
  const code = document.getElementById('code-editor').value;
  const consoleEl = document.getElementById('code-console');

  consoleEl.textContent = isSubmission
    ? '⏳ Running test cases and submitting to Leaderboard...'
    : '⏳ Compiling code and executing sample test cases...';

  try {
    const endpoint = isSubmission ? '/api/coding/submit' : '/api/coding/run';
    const res = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        eventId: activeWorkspaceEvent.id,
        language: lang,
        code: code,
        submission: isSubmission
      })
    });

    consoleEl.textContent = res.output + '\n\n' + res.feedback;

    if (isSubmission) {
      showToast(`Solution Submitted! Score: ${res.score}/100 🏆`, res.score >= 80 ? 'success' : 'info');
      switchWsTab('leaderboard');
    }
  } catch (err) {
    consoleEl.textContent = '❌ Error executing code: ' + err.message;
  }
}

// ============================================================
// 2. QUIZ ENGINE LOGIC
// ============================================================
async function loadQuizQuestions(eventId) {
  try {
    quizQuestions = await apiFetch(`/api/quiz/${eventId}`);
    currentQuestionIndex = 0;
    userQuizAnswers = {};
    document.getElementById('quiz-q-total').textContent = quizQuestions.length;
    document.getElementById('quiz-results-container').style.display = 'none';
    showQuizQuestion(0);
    startQuizTimer();
  } catch (err) {
    console.error('Failed to load quiz:', err);
  }
}

function showQuizQuestion(index) {
  if (!quizQuestions.length || index < 0 || index >= quizQuestions.length) return;
  currentQuestionIndex = index;

  const q = quizQuestions[index];
  document.getElementById('quiz-q-num').textContent = index + 1;
  document.getElementById('quiz-q-text').textContent = q.question;

  const container = document.getElementById('quiz-options-container');
  container.innerHTML = q.options.map((opt, optIdx) => {
    const isSelected = userQuizAnswers[index] === optIdx;
    return `
      <div class="quiz-option ${isSelected ? 'selected' : ''}" onclick="selectQuizOption(${index}, ${optIdx})">
        <input type="radio" name="q_${index}" ${isSelected ? 'checked' : ''} />
        <span style="font-weight:500;">${String.fromCharCode(65 + optIdx)}. ${opt}</span>
      </div>
    `;
  }).join('');

  document.getElementById('quiz-prev-btn').style.display = (index > 0) ? 'inline-block' : 'none';
  document.getElementById('quiz-next-btn').style.display = (index < quizQuestions.length - 1) ? 'inline-block' : 'none';
}

function selectQuizOption(qIdx, optIdx) {
  userQuizAnswers[qIdx] = optIdx;
  showQuizQuestion(qIdx);
}

function quizNextQuestion() {
  if (currentQuestionIndex < quizQuestions.length - 1) {
    showQuizQuestion(currentQuestionIndex + 1);
  }
}

function quizPrevQuestion() {
  if (currentQuestionIndex > 0) {
    showQuizQuestion(currentQuestionIndex - 1);
  }
}

function startQuizTimer() {
  if (quizTimerInterval) clearInterval(quizTimerInterval);
  quizSecondsLeft = 120; // 2 mins total
  updateQuizTimerDisplay();

  quizTimerInterval = setInterval(() => {
    quizSecondsLeft--;
    updateQuizTimerDisplay();
    if (quizSecondsLeft <= 0) {
      clearInterval(quizTimerInterval);
      showToast('Time is up! Submitting answers automatically...', 'warning');
      submitQuizAnswers();
    }
  }, 1000);
}

function updateQuizTimerDisplay() {
  const m = Math.floor(quizSecondsLeft / 60);
  const s = quizSecondsLeft % 60;
  document.getElementById('quiz-timer').textContent =
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function submitQuizAnswers() {
  if (quizTimerInterval) clearInterval(quizTimerInterval);

  try {
    const res = await apiFetch(`/api/quiz/${activeWorkspaceEvent.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        eventId: activeWorkspaceEvent.id,
        answers: userQuizAnswers,
        timeSpentSeconds: 120 - quizSecondsLeft
      })
    });

    const resultsEl = document.getElementById('quiz-results-container');
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `
      <div style="text-align:center; padding:16px;">
        <div style="font-size:2.5rem; margin-bottom:8px;">${res.rankBadge.split(' ')[0]}</div>
        <h2>Quiz Completed! Score: ${res.score}/100</h2>
        <p style="color:var(--text-secondary); margin-bottom:16px;">
          ${res.correctAnswers} of ${res.totalQuestions} questions correct (${res.percentage}%)
        </p>
        <span class="badge badge-purple" style="font-size:0.85rem; padding:6px 14px;">Badge Earned: ${res.rankBadge}</span>
      </div>
      <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:16px;">
        <h4>Question Review</h4>
        ${res.reviews.map(r => `
          <div style="padding:10px; margin-top:8px; border-radius:6px; background:${r.isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; border:1px solid ${r.isCorrect ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'};">
            <strong>Q${r.questionIndex}:</strong> ${r.question} —
            <span style="color:${r.isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight:600;">
              ${r.isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </span>
          </div>
        `).join('')}
      </div>
    `;

    showToast(`Quiz Submitted! Final Score: ${res.score}/100`, 'success');
  } catch (err) {
    showToast('Failed to submit quiz: ' + err.message, 'error');
  }
}

// ============================================================
// 3. POSTER / DESIGN CANVAS STUDIO
// ============================================================
function initCanvas() {
  canvas = document.getElementById('poster-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  canvasElements = [
    { type: 'rect', x: 40, y: 40, w: 720, h: 400, color: 'rgba(255,255,255,0.03)', stroke: '#38bdf8' },
    { type: 'text', text: 'CAMPUS INNOVATION FEST', x: 400, y: 140, size: 34, color: '#f8fafc', font: 'bold 34px Inter, sans-serif' },
    { type: 'text', text: 'Create • Innovate • Compete', x: 400, y: 190, size: 20, color: '#38bdf8', font: '20px Inter, sans-serif' },
    { type: 'badge', x: 400, y: 280, color: '#f59e0b' }
  ];

  renderCanvas();
}

function renderCanvas() {
  if (!ctx || !canvas) return;
  const bgColor = document.getElementById('canvas-bg-color')?.value || '#0f172a';

  // Fill Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw background gradient grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Draw Elements
  canvasElements.forEach(el => {
    if (el.type === 'text') {
      ctx.font = el.font || `${el.size || 24}px Inter, sans-serif`;
      ctx.fillStyle = el.color || '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(el.text, el.x, el.y);
    } else if (el.type === 'rect') {
      ctx.fillStyle = el.color;
      ctx.fillRect(el.x, el.y, el.w, el.h);
      if (el.stroke) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = 2;
        ctx.strokeRect(el.x, el.y, el.w, el.h);
      }
    } else if (el.type === 'circle') {
      ctx.beginPath();
      ctx.arc(el.x, el.y, el.r || 40, 0, Math.PI * 2);
      ctx.fillStyle = el.color;
      ctx.fill();
    } else if (el.type === 'badge') {
      ctx.beginPath();
      ctx.arc(el.x, el.y, 35, 0, Math.PI * 2);
      ctx.fillStyle = el.color;
      ctx.fill();
      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('⭐', el.x, el.y + 8);
    }
  });
}

function addCanvasText(defaultText, size, color) {
  const text = prompt('Enter text for poster:', defaultText);
  if (!text) return;
  canvasElements.push({
    type: 'text',
    text: text,
    x: 400,
    y: 200 + canvasElements.length * 30,
    size: size,
    color: color,
    font: `${size}px Inter, sans-serif`
  });
  renderCanvas();
}

function addCanvasShape(shape) {
  if (shape === 'rect') {
    canvasElements.push({ type: 'rect', x: 250, y: 320, w: 300, h: 60, color: 'rgba(59, 130, 246, 0.25)', stroke: '#3b82f6' });
  } else if (shape === 'circle') {
    canvasElements.push({ type: 'circle', x: 150, y: 240, r: 45, color: 'rgba(16, 185, 129, 0.4)' });
  } else if (shape === 'badge') {
    canvasElements.push({ type: 'badge', x: 650, y: 120, color: '#ec4899' });
  }
  renderCanvas();
}

function setCanvasBackground(color) {
  renderCanvas();
}

function clearCanvas() {
  canvasElements = [];
  renderCanvas();
}

function downloadPoster() {
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `${activeWorkspaceEvent ? activeWorkspaceEvent.title.replace(/\s+/g, '_') : 'poster'}_design.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Poster image downloaded (PNG) 🎨', 'success');
}

async function submitPosterDesign() {
  if (!canvas || !activeWorkspaceEvent) return;
  const dataUrl = canvas.toDataURL('image/png');

  try {
    await apiFetch(`/api/design/submit/${activeWorkspaceEvent.id}`, {
      method: 'POST',
      body: JSON.stringify({
        eventId: activeWorkspaceEvent.id,
        submissionType: 'DESIGN',
        title: activeWorkspaceEvent.title + ' — Poster Entry',
        description: 'Submitted from EventManager Built-in Canvas Studio',
        dataUrl: dataUrl,
        content: JSON.stringify(canvasElements)
      })
    });

    showToast('Poster design submitted to competition judges! 🎨🚀', 'success');
  } catch (err) {
    showToast('Failed to submit poster: ' + err.message, 'error');
  }
}

// ============================================================
// 4. HACKATHON & PROJECT SUBMISSION
// ============================================================
async function submitHackathonProject() {
  if (!activeWorkspaceEvent) return;

  const teamName    = document.getElementById('hk-team-name').value.trim();
  const teamMembers = document.getElementById('hk-team-members').value.trim();
  const title       = document.getElementById('hk-project-title').value.trim();
  const description = document.getElementById('hk-project-desc').value.trim();
  const githubUrl   = document.getElementById('hk-github-url').value.trim();
  const demoUrl     = document.getElementById('hk-demo-url').value.trim();
  const videoUrl    = document.getElementById('hk-video-url').value.trim();

  try {
    await apiFetch(`/api/submissions/${activeWorkspaceEvent.id}`, {
      method: 'POST',
      body: JSON.stringify({
        eventId: activeWorkspaceEvent.id,
        submissionType: 'HACKATHON',
        teamName,
        teamMembers,
        title,
        description,
        githubUrl,
        demoUrl,
        videoUrl
      })
    });

    showToast('Project submitted successfully! Awaiting judge scoring. 🚀', 'success');
    switchWsTab('leaderboard');
  } catch (err) {
    showToast('Submission error: ' + err.message, 'error');
  }
}

// ============================================================
// 5. LEADERBOARD LOGIC
// ============================================================
async function loadLeaderboard(eventId) {
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading scores...</td></tr>';

  try {
    const list = await apiFetch(`/api/leaderboard/${eventId}`);

    // Update podium
    document.getElementById('podium-1-name').textContent  = list[0] ? list[0].participantName : '—';
    document.getElementById('podium-1-score').textContent = list[0] ? `${list[0].score} Pts` : '—';
    document.getElementById('podium-2-name').textContent  = list[1] ? list[1].participantName : '—';
    document.getElementById('podium-2-score').textContent = list[1] ? `${list[1].score} Pts` : '—';
    document.getElementById('podium-3-name').textContent  = list[2] ? list[2].participantName : '—';
    document.getElementById('podium-3-score').textContent = list[2] ? `${list[2].score} Pts` : '—';

    tbody.innerHTML = list.length
      ? list.map(item => `
          <tr>
            <td><strong>#${item.rank}</strong></td>
            <td>
              <div style="font-weight:600;">${item.participantName}</div>
              <small style="color:var(--text-muted);">${item.teamName || item.participantEmail}</small>
            </td>
            <td>${item.title}</td>
            <td><span class="badge badge-blue">${item.submissionType}</span></td>
            <td><strong style="color:var(--accent-green); font-size:1rem;">${item.score}</strong></td>
            <td><span class="badge badge-purple">${item.status}</span></td>
          </tr>
        `).join('')
      : '<tr><td colspan="6"><div class="empty-state"><p>No submissions recorded for this event yet.</p></div></td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--accent-red);">Failed to load leaderboard: ${err.message}</td></tr>`;
  }
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
// CERTIFICATES & VERIFICATION MODULE (Inside User Dashboard)
// ============================================================
let myCertificatesList = [];

async function loadMyCertificatesTab() {
  const container = document.getElementById('my-certificates-container');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <p>Fetching your official certificates from KLS GIT registry...</p>
    </div>
  `;

  try {
    myCertificatesList = await apiFetch('/api/certificates/my');
    if (!myCertificatesList || myCertificatesList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎓</div>
          <h3>No Certificates Issued Yet</h3>
          <p>Participate in campus events and hackathons to earn verified credentials and merit certificates from KLS GIT Belgaum.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
        ${myCertificatesList.map(cert => `
          <div class="card" style="border: 1px solid rgba(99, 102, 241, 0.3); background: rgba(30, 27, 75, 0.25); display:flex; flex-direction:column; justify-content:space-between; padding:20px;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                <span style="font-size:2rem;">🎓</span>
                <span class="badge badge-green">VERIFIED RECORD</span>
              </div>
              <h3 style="margin:0 0 6px; font-size:1.1rem; color:var(--text-primary);">${escapeHtml(cert.eventName || 'Event')}</h3>
              <p style="margin:0 0 10px; font-size:0.8rem; color:var(--text-muted);">${escapeHtml(cert.clubName || 'KLS GIT Club')}</p>
              
              <div style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:14px; display:flex; flex-direction:column; gap:4px;">
                <div><strong>Category:</strong> ${escapeHtml(cert.title || 'Certificate of Participation')}</div>
                <div><strong>Issue Date:</strong> ${cert.issueDate || '—'}</div>
                <div><strong>Credential ID:</strong> <span style="font-family:monospace; color:#a5b4fc;">${escapeHtml(cert.certificateId)}</span></div>
              </div>
            </div>

            <div style="display:flex; gap:6px; margin-top:12px; flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" style="flex:1;" onclick="viewMyCertificate('${escapeHtml(cert.certificateId)}')">
                👁️ View
              </button>
              <button class="btn btn-success btn-sm" style="flex:1; background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff;" onclick="downloadCertificatePdfDirectly('${escapeHtml(cert.certificateId)}')">
                📥 PDF
              </button>
              <button class="btn btn-secondary btn-sm" onclick="printMyCertificateDirectly('${escapeHtml(cert.certificateId)}')">
                🖨️ Print
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Failed to Load Certificates</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

async function verifyCertificateInDashboard() {
  const input = document.getElementById('dash-cert-hash-input');
  const resultDiv = document.getElementById('dash-cert-result');
  if (!input || !resultDiv) return;

  const hash = input.value.trim();
  if (!hash) {
    showToast('Please enter a certificate identifier or hash to verify.', 'error');
    return;
  }

  resultDiv.style.display = 'block';
  resultDiv.innerHTML = `
    <div style="text-align:center; padding:20px; color:var(--text-muted);">
      <span class="spinner"></span> Querying KLS GIT Academic Registry...
    </div>
  `;

  try {
    const res = await fetch(`/api/certificates/verify/${encodeURIComponent(hash)}`);
    const data = await res.json();

    if (data.valid) {
      resultDiv.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; margin-top: 10px;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
            <span style="font-size:2rem;">✅</span>
            <div>
              <h3 style="margin:0; color:#34d399; font-size:1.15rem;">Authentic & Verified Credential</h3>
              <p style="margin:2px 0 0; font-size:0.8rem; color:var(--text-muted);">
                Officially stamped in KLS Gogte Institute of Technology Academic & Club Registry.
              </p>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; font-size:0.85rem; margin-bottom:18px;">
            <div><span style="color:var(--text-muted);">Recipient:</span> <strong>${escapeHtml(data.studentName)}</strong></div>
            <div><span style="color:var(--text-muted);">Student ID / USN:</span> <strong>${escapeHtml(data.usnOrStudentId)}</strong></div>
            <div><span style="color:var(--text-muted);">Event:</span> <strong>${escapeHtml(data.eventTitle)}</strong></div>
            <div><span style="color:var(--text-muted);">Organizing Club:</span> <strong>${escapeHtml(data.clubName)}</strong></div>
            <div><span style="color:var(--text-muted);">Certificate Type:</span> <strong>${escapeHtml(data.certificateType)}</strong></div>
            <div><span style="color:var(--text-muted);">Issue Date:</span> <strong>${data.issueDate}</strong></div>
            <div><span style="color:var(--text-muted);">Record ID:</span> <span style="font-family:monospace; color:#a5b4fc;">${escapeHtml(data.certificateHash)}</span></div>
            <div><span style="color:var(--text-muted);">Status:</span> <span style="color:#10b981; font-weight:700;">CRYPTOGRAPHICALLY VALID</span></div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" id="btn-view-verified-cert">
              📜 View Certificate
            </button>
            <a href="/api/certificates/verify/${encodeURIComponent(data.certificateHash)}/pdf" target="_blank" class="btn btn-primary btn-sm">
              📥 Download Official PDF
            </a>
          </div>
        </div>
      `;
      document.getElementById('btn-view-verified-cert').onclick = () => renderCertModalHtml(data);
    } else {
      resultDiv.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 20px; text-align:center; margin-top: 10px;">
          <div style="font-size:2rem; margin-bottom:8px;">❌</div>
          <h4 style="margin:0 0 6px; color:#f87171;">Verification Check Failed</h4>
          <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">
            ${escapeHtml(data.remarks || 'No certificate record matched this identifier in the KLS GIT ledger.')}
          </p>
        </div>
      `;
    }
  } catch (err) {
    resultDiv.innerHTML = `
      <div style="padding:16px; color:#f87171; text-align:center;">
        Failed to connect to verification server: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

let currentViewingCertHash = null;

function viewMyCertificate(certId) {
  const cert = myCertificatesList.find(c => c.certificateId === certId);
  if (!cert) return;

  if (cert.feedbackRequired) {
    promptEventFeedbackModal(cert);
    return;
  }

  renderCertModalHtml({
    certificateType: cert.title,
    studentName: cert.recipientName,
    eventTitle: cert.eventName,
    clubName: cert.clubName,
    issueDate: cert.issueDate,
    studentEmail: cert.recipientEmail,
    certificateHash: cert.certificateId,
    usnOrStudentId: cert.usn || 'KLS-GIT-STU'
  });
}

function printMyCertificateDirectly(certId) {
  viewMyCertificate(certId);
  setTimeout(() => window.print(), 350);
}

function downloadCertificatePdfDirectly(certId) {
  window.open(`/api/certificates/verify/${encodeURIComponent(certId)}/pdf`, '_blank');
}

function downloadCurrentCertPdf() {
  if (!currentViewingCertHash) {
    showToast('No active certificate selected.', 'warning');
    return;
  }
  window.open(`/api/certificates/verify/${encodeURIComponent(currentViewingCertHash)}/pdf`, '_blank');
}

function renderCertModalHtml(data) {
  currentViewingCertHash = data.certificateHash;
  const container = document.getElementById('certificate-viewer-body');
  if (!container) return;

  container.innerHTML = `
    <div class="cert-display-card" id="printable-certificate">
      <div style="display:flex; justify-content:center; margin-bottom:10px;">
        <img src="/images/kls_git_logo.png" alt="KLS GIT Emblem" style="width:72px; height:72px; border-radius:50%; object-fit:contain; background:#fff; padding:2px; box-shadow:0 4px 14px rgba(0,0,0,0.15);" />
      </div>
      <div style="font-size:0.85rem; font-weight:800; text-transform:uppercase; letter-spacing:0.12em; color:#1e1b4b; margin-bottom:4px;">
        KLS Gogte Institute of Technology, Belgaum
      </div>
      <div style="font-size:0.75rem; color:#475569; margin-bottom:16px;">
        Autonomous Institute Affiliated to VTU Belagavi • NAAC A+ & NBA Accredited
      </div>
      <div style="font-size: 1.35rem; font-weight: 800; color: #312e81; margin: 12px 0 6px;">
        ${escapeHtml(data.certificateType || 'CERTIFICATE OF PARTICIPATION')}
      </div>
      <p style="color:#64748b; font-size:0.92rem; margin: 0;">This official institutional credential is presented to</p>
      <div class="cert-recipient-name">${escapeHtml(data.studentName || 'Student')}</div>
      <p style="color:#334155; font-size:0.95rem; line-height:1.6; max-width: 600px; margin: 0 auto 20px auto;">
        for outstanding participation and performance in <strong>${escapeHtml(data.eventTitle || 'Campus Event')}</strong> conducted by <strong>${escapeHtml(data.clubName || 'KLS GIT Student Club')}</strong>.
      </p>

      <div style="border-top: 1px dashed #cbd5e1; padding-top: 18px; display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; text-align: left; font-size:0.82rem; color:#475569;">
        <div><strong>Recipient USN/ID:</strong> ${escapeHtml(data.usnOrStudentId || 'N/A')}</div>
        <div><strong>Issue Date:</strong> ${escapeHtml(data.issueDate || '—')}</div>
        <div><strong>Record Identifier:</strong> <span style="font-family:monospace; font-weight:bold;">${escapeHtml(data.certificateHash || 'N/A')}</span></div>
        <div><strong>Institutional Seal:</strong> <span style="color:#16a34a; font-weight:bold;">VERIFIED IMMUTABLE</span></div>
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; font-size:0.76rem; color:#64748b;">
        <span>Faculty Coordinator</span>
        <span style="font-family:monospace; color:#312e81; font-weight:700;">KLS GIT VERIFIED REGISTRY</span>
        <span>Dean of Student Affairs</span>
      </div>
    </div>
  `;

  openModal('certificate-viewer-modal');
}

function printCertificate() {
  window.print();
}

// ============================================================
// Team / Group Registration Helpers
// ============================================================
function toggleTeamRegistrationFields() {
  const isTeam = document.getElementById('reg-is-team-checkbox')?.checked;
  const fields = document.getElementById('reg-team-fields');
  if (fields) fields.style.display = isTeam ? 'block' : 'none';
  if (isTeam && document.getElementById('reg-teammates-list')?.children.length === 0) {
    addTeammateInput();
  }
}

function addTeammateInput() {
  const list = document.getElementById('reg-teammates-list');
  if (!list) return;
  if (list.children.length >= 3) {
    showToast('Maximum 3 additional squad members (Team of 4).', 'info');
    return;
  }
  const idx = list.children.length + 2;
  const row = document.createElement('div');
  row.style = 'display:flex; gap:8px; align-items:center;';
  row.innerHTML = `
    <input type="text" class="form-control teammate-input-val" placeholder="Member ${idx}: USN & Name (e.g. 2GI22CS045 - Alice)" style="flex:1;" />
    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding:6px 10px;">✕</button>
  `;
  list.appendChild(row);
}

// ============================================================
// Post-Event Feedback & Rating Gate (for Certificates)
// ============================================================
let currentFeedbackRating = 5;

function selectStarRating(val) {
  currentFeedbackRating = val;
  updateStarDisplay(val);
}

function hoverStarRating(val) {
  updateStarDisplay(val);
}

function resetStarHover() {
  updateStarDisplay(currentFeedbackRating);
}

function updateStarDisplay(val) {
  const stars = document.querySelectorAll('#feedback-star-picker span');
  const labels = ['', '1 - Needs Improvement', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Outstanding'];
  stars.forEach((s, idx) => {
    const starVal = idx + 1;
    if (starVal <= val) {
      s.style.color = '#f59e0b';
      s.textContent = '★';
    } else {
      s.style.color = '#475569';
      s.textContent = '☆';
    }
  });
  const lbl = document.getElementById('feedback-rating-label');
  if (lbl) lbl.textContent = labels[val] || `${val} Stars`;
}

function promptEventFeedbackModal(certOrEvent) {
  const eventId = certOrEvent.eventId || (certOrEvent.event ? certOrEvent.event.id : null) || certOrEvent.id;
  const title = certOrEvent.eventName || certOrEvent.eventTitle || (certOrEvent.event ? certOrEvent.event.title : 'Event');
  document.getElementById('feedback-event-id').value = eventId;
  document.getElementById('feedback-event-title').textContent = title;
  document.getElementById('feedback-comments-input').value = '';
  selectStarRating(5);
  openModal('event-feedback-modal');
}

async function submitEventFeedback(e) {
  e.preventDefault();
  const eventId = document.getElementById('feedback-event-id').value;
  const comments = document.getElementById('feedback-comments-input').value.trim();
  const btn = document.getElementById('submit-feedback-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting Feedback...';

  try {
    await apiFetch(`/api/events/${eventId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({
        rating: currentFeedbackRating,
        comments: comments
      })
    });

    closeModal('event-feedback-modal');
    showToast('⭐ Thank you for your feedback! Certificate unlocked.', 'success');

    // Reload certificates tab and open this certificate
    await loadMyCertificatesTab();
    const cert = myCertificatesList.find(c => c.certificateId && c.certificateId.includes(`-${eventId}-`));
    if (cert) {
      renderCertModalHtml({
        certificateType: cert.title,
        studentName: cert.recipientName,
        eventTitle: cert.eventName,
        clubName: cert.clubName,
        issueDate: cert.issueDate,
        studentEmail: cert.recipientEmail,
        certificateHash: cert.certificateId,
        usnOrStudentId: cert.usn || 'KLS-GIT-STU'
      });
    }
  } catch (err) {
    showToast('Failed to submit feedback: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit & Unlock Certificate 🎓';
  }
}

async function viewCertificateGated(eventId) {
  try {
    const cert = await apiFetch(`/api/certificates/event/${eventId}`);
    if (cert.feedbackRequired) {
      promptEventFeedbackModal({ ...cert, eventId });
      return;
    }
    renderCertModalHtml({
      certificateType: cert.title,
      studentName: cert.recipientName,
      eventTitle: cert.eventName,
      clubName: cert.clubName,
      issueDate: cert.issueDate,
      studentEmail: cert.recipientEmail,
      certificateHash: cert.certificateId,
      usnOrStudentId: cert.usn || 'KLS-GIT-STU'
    });
  } catch (err) {
    showToast('Certificate not available: ' + err.message, 'warning');
  }
}

// ============================================================
// VTU AICTE 100 Activity Points Tracker & Digital Transcript
// ============================================================
let currentVtuData = null;

async function loadVtuPointsTab() {
  const container = document.getElementById('vtu-category-cards');
  const tbody = document.getElementById('vtu-ledger-tbody');
  if (!container || !tbody) return;

  try {
    currentVtuData = await apiFetch('/api/certificates/vtu-activity-points');
    const d = currentVtuData;

    // Stats
    document.getElementById('vtu-total-pts-display').textContent = d.totalPointsEarned;
    document.getElementById('vtu-pct-display').textContent = `${d.progressPercentage}%`;
    document.getElementById('vtu-progress-fill').style.width = `${Math.min(100, d.progressPercentage)}%`;

    const statusBadge = document.getElementById('vtu-status-badge');
    if (statusBadge) {
      if (d.totalPointsEarned >= 100) {
        statusBadge.className = 'badge badge-green';
        statusBadge.textContent = '✓ DEGREE ELIGIBLE (100+ Pts)';
      } else if (d.totalPointsEarned >= 50) {
        statusBadge.className = 'badge badge-blue';
        statusBadge.textContent = '● ON TRACK (50+ Pts)';
      } else {
        statusBadge.className = 'badge badge-amber';
        statusBadge.textContent = '⏳ IN PROGRESS';
      }
    }

    // Category Cards
    const icons = {
      'Technical & Workshops': '💻',
      'Hackathons & Innovations': '🚀',
      'Cultural & Sports': '🎨',
      'Community & Leadership': '🤝'
    };

    container.innerHTML = Object.entries(d.categoryPoints || {}).map(([cat, pts]) => {
      const maxCatTarget = 30; // nominal guideline
      const catPct = Math.min(100, Math.round((pts * 100) / maxCatTarget));
      return `
        <div style="background:rgba(255,255,255,0.025); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:1.6rem;">${icons[cat] || '📋'}</span>
            <span style="font-weight:800; font-size:1.3rem; color:var(--accent-cyan);">${pts} <small style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">pts</small></span>
          </div>
          <div style="font-weight:600; font-size:0.9rem; color:var(--text-primary); margin-bottom:6px;">${cat}</div>
          <div class="capacity-bar-track" style="height:6px;">
            <div style="width:${catPct}%; height:100%; border-radius:3px; background:var(--accent-blue);"></div>
          </div>
        </div>
      `;
    }).join('');

    // Activity Ledger Table
    if (!d.activities || d.activities.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);"><p>No activity points recorded yet. Attend sanctioned events and get checked in to earn points.</p></td></tr>';
      return;
    }

    tbody.innerHTML = d.activities.map((a, i) => {
      const isAttended = (a.status === 'VERIFIED_ATTENDED' || a.status === 'ATTENDED');
      const statusHtml = isAttended
        ? '<span class="badge badge-green">✓ Verified Attended</span>'
        : `<span class="badge badge-amber">${a.status}</span>`;

      return `
        <tr>
          <td>${i + 1}</td>
          <td>
            <div style="font-weight:600; color:#fff;">${escapeHtml(a.eventName)}</div>
            <small style="color:var(--text-muted); font-family:monospace;">${escapeHtml(a.registrationNumber || '')}</small>
          </td>
          <td><span class="badge badge-purple" style="font-size:0.72rem;">${escapeHtml(a.category)}</span></td>
          <td>${escapeHtml(a.clubName)}</td>
          <td>${a.eventDate}</td>
          <td style="font-weight:800; color:${isAttended ? 'var(--accent-green)' : 'var(--text-muted)'}; font-size:1rem;">
            +${a.activityPoints} pts
          </td>
          <td><code style="color:var(--accent-cyan); font-size:0.75rem;">${a.verificationCode}</code></td>
          <td>${statusHtml}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load VTU Activity Points:', err);
    showToast('Failed to load activity points: ' + err.message, 'error');
  }
}

function openVtuTranscriptModal() {
  if (!currentVtuData) {
    loadVtuPointsTab().then(() => renderVtuTranscriptModal());
  } else {
    renderVtuTranscriptModal();
  }
}

function renderVtuTranscriptModal() {
  const d = currentVtuData;
  if (!d) return;

  document.getElementById('trans-student-name').textContent = d.studentName || getUserName() || 'Student';
  document.getElementById('trans-student-usn').textContent  = d.usn;
  document.getElementById('trans-student-dept').textContent = d.department;
  document.getElementById('trans-student-year').textContent = d.academicYear;
  document.getElementById('trans-issue-date').textContent   = d.generatedAt || new Date().toISOString().substring(0, 10);
  document.getElementById('trans-hash').textContent         = d.verificationHash;

  const tbody = document.getElementById('trans-table-body');
  const activities = (d.activities || []).filter(a => a.status === 'VERIFIED_ATTENDED' || a.status === 'ATTENDED');

  if (!activities.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:16px; text-align:center; color:#64748b;">No verified event attendances yet recorded on this student's transcript.</td></tr>`;
  } else {
    tbody.innerHTML = activities.map((a, i) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:6px 8px; border:1px solid #cbd5e1; text-align:center;">${i + 1}</td>
        <td style="padding:6px 8px; border:1px solid #cbd5e1; font-weight:600;">${escapeHtml(a.eventName)}</td>
        <td style="padding:6px 8px; border:1px solid #cbd5e1;">${escapeHtml(a.category)}</td>
        <td style="padding:6px 8px; border:1px solid #cbd5e1;">${escapeHtml(a.clubName)}</td>
        <td style="padding:6px 8px; border:1px solid #cbd5e1;">${a.eventDate}</td>
        <td style="padding:6px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; color:#16a34a;">${a.activityPoints}</td>
        <td style="padding:6px 8px; border:1px solid #cbd5e1; font-family:monospace; font-size:0.75rem;">${a.verificationCode}</td>
      </tr>
    `).join('');
  }

  document.getElementById('trans-total-pts').textContent = `${d.totalPointsEarned} / 100`;
  const isComplete = d.totalPointsEarned >= 100;
  document.getElementById('trans-status-text').innerHTML = isComplete
    ? '<span style="color:#16a34a; font-weight:800;">✓ REQUIREMENTS MET (ELIGIBLE)</span>'
    : `<span style="color:#2563eb; font-weight:700;">ON TRACK (${100 - d.totalPointsEarned} pts needed)</span>`;

  openModal('vtu-transcript-modal');
}

function printVtuTranscript() {
  window.print();
}
