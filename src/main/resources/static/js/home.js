// ============================================================
// home.js — Public College Activity Hub Logic
// ============================================================

let allEvents = [];
let allClubs = [];
let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();
let activeCategoryFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
    updateNavAuthUI();
    loadLiveSiteSettings();
    await Promise.all([loadPublicEvents(), loadPublicClubs()]);
    renderCalendar();

    // If user loaded the page with a pending event registration request, pop up the modal!
    const pendingId = sessionStorage.getItem('pendingEventRegisterId') || localStorage.getItem('pendingEventRegisterId');
    if (pendingId && getToken() && String(getRole()).toUpperCase() === 'USER') {
        sessionStorage.removeItem('pendingEventRegisterId');
        localStorage.removeItem('pendingEventRegisterId');
        setTimeout(() => {
            openPublicEventRegistrationModal(pendingId);
        }, 350);
    }

    // Global keyboard search shortcut (Ctrl+K or Cmd+K)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            const sInput = document.getElementById('search-input');
            if (sInput) {
                sInput.focus();
                sInput.select();
            }
        }
    });
});

async function loadLiveSiteSettings() {
    try {
        const res = await fetch('/api/site-settings');
        if (!res.ok) return;
        const s = await res.json();
        if (!s) return;

        // Apply dynamic branding to hero & elements
        const brandTitle = document.querySelector('.public-nav-brand span');
        if (brandTitle && s.collegeName) brandTitle.textContent = s.collegeName;

        const heroH1 = document.querySelector('.public-hero h1');
        if (heroH1 && s.heroTitle) heroH1.textContent = s.heroTitle;

        const heroP = document.querySelector('.public-hero p');
        if (heroP && s.heroSubtitle) heroP.textContent = s.heroSubtitle;

        // Announcement banner if present
        const annTicker = document.getElementById('announcement-ticker');
        if (annTicker && s.announcementText) annTicker.textContent = s.announcementText;
    } catch (err) {
        console.warn('Could not load dynamic site settings:', err);
    }
}

// Update top navbar according to user login state
function updateNavAuthUI() {
    if (typeof syncPublicNavAuth === 'function') {
        syncPublicNavAuth();
        return;
    }
}

// Fetch approved events
async function loadPublicEvents() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/events/approved');
        if (!res.ok) throw new Error('Status ' + res.status);
        allEvents = await res.json();
        renderEventCards();
        updateStats();
    } catch (err) {
        grid.innerHTML = `<div class="empty-state"><p>Could not load campus events at this time.</p><button class="btn btn-secondary btn-sm" onclick="loadPublicEvents()" style="margin-top:10px;">🔄 Retry</button></div>`;
    }
}

// Fetch clubs
async function loadPublicClubs() {
    const grid = document.getElementById('clubs-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/clubs');
        if (!res.ok) throw new Error('Status ' + res.status);
        allClubs = await res.json();
        renderClubCards();
        updateStats();
    } catch (err) {
        grid.innerHTML = `<div class="empty-state"><p>Could not load campus clubs at this time.</p><button class="btn btn-secondary btn-sm" onclick="loadPublicClubs()" style="margin-top:10px;">🔄 Retry</button></div>`;
    }
}

function updateStats() {
    const statEvents = document.getElementById('stat-events-count');
    const statClubs = document.getElementById('stat-clubs-count');
    if (statEvents) statEvents.textContent = allEvents.length + '+';
    if (statClubs) statClubs.textContent = allClubs.length;
}

// Event Category & Public Registration Status Helpers (No internal APPROVED badges)
function getPublicEventBadge(e) {
    if (e.status === 'REGISTRATION_CLOSED') {
        return '<span class="badge badge-amber">🔒 Reg Closed</span>';
    } else if (e.status === 'ONGOING' || e.toolsOpened) {
        return '<span class="badge badge-purple">⚡ Live Now</span>';
    } else if (e.status === 'COMPLETED') {
        return '<span class="badge badge-blue">🏁 Concluded</span>';
    } else if (e.status === 'CANCELLED') {
        return '<span class="badge badge-red">🚫 Cancelled</span>';
    }
    return '<span class="badge badge-green">🟢 Open for Registration</span>';
}

function formatEventTypeBadge(type) {
    const icons = {
        CODING: '💻 Coding',
        HACKATHON: '🚀 Hackathon',
        QUIZ: '🧠 Quiz',
        DESIGN: '🎨 Design & UI/UX',
        WORKSHOP: '🛠️ Workshop',
        PROJECT_EXHIBITION: '💡 Project Expo',
        DEBATE: '🗣️ Debate',
        CULTURAL: '🎭 Cultural Fest',
        SPORTS: '⚽ Sports',
        OTHER: '📅 Campus Event'
    };
    const label = icons[type] || (type ? type.replace(/_/g, ' ') : 'Campus Event');
    return `<span class="event-type-badge">${label}</span>`;
}

// Render Event Cards
function renderEventCards() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;

    let filtered = allEvents;
    if (activeCategoryFilter !== 'ALL') {
        filtered = allEvents.filter(e => {
            const type = (e.eventType || '').toUpperCase();
            if (activeCategoryFilter === 'CODING') return type.includes('CODING') || type.includes('HACKATHON');
            if (activeCategoryFilter === 'DESIGN') return type.includes('DESIGN');
            if (activeCategoryFilter === 'SPORTS') return type.includes('SPORTS');
            if (activeCategoryFilter === 'WORKSHOP') return type.includes('WORKSHOP') || type.includes('SEMINAR');
            if (activeCategoryFilter === 'QUIZ') return type.includes('QUIZ');
            return type === activeCategoryFilter;
        });
    }

    // Filter by search query
    const searchQuery = (document.getElementById('search-input')?.value || '').trim();
    if (searchQuery !== '') {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(e => {
            const titleMatch = (e.title || '').toLowerCase().includes(q);
            const descMatch = (e.description || '').toLowerCase().includes(q);
            const clubMatch = (e.club && e.club.name || '').toLowerCase().includes(q);
            const venueMatch = (e.venue || '').toLowerCase().includes(q);
            return titleMatch || descMatch || clubMatch || venueMatch;
        });
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">🔍</div>
                <h3>No Matching Campus Events</h3>
                <p>Try clearing filters or changing search keywords to explore other activities.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(e => {
        const clubName = e.club ? e.club.name : 'College Club';
        const clubId = e.club ? e.club.id : 1;
        const timeStr = e.startTime || e.time || '10:00 AM';
        const venueStr = e.venue || 'Campus Auditorium';

        return `
            <div class="event-card" id="public-event-${e.id}" onclick="showPublicEventDetails(${e.id})" style="cursor:pointer; position:relative;" title="Click anywhere on card to view event details">
                <div class="event-card-stripe"></div>
                <div class="event-card-body">
                    <div class="event-card-top-row">
                        ${formatEventTypeBadge(e.eventType)}
                        ${getPublicEventBadge(e)}
                    </div>
                    <h3 class="event-card-title">${escapeHtml(e.title)}</h3>
                    <p class="event-card-club">
                        🏛 Organized by <a href="/club.html?id=${clubId}" onclick="event.stopPropagation()" style="color:var(--primary); font-weight:600; text-decoration:none;">${escapeHtml(clubName)}</a>
                    </p>
                    <p class="event-card-desc">
                        ${escapeHtml(e.description || 'Join this exciting campus activity, meet club coordinators, and gain recognized experience.')}
                    </p>
                    <div class="event-card-meta">
                        <span class="event-meta-item">📅 ${formatDate(e.date)}</span>
                        <span class="event-meta-item">⏰ ${timeStr}</span>
                        <span class="event-meta-item">📍 ${escapeHtml(venueStr)}</span>
                    </div>
                    <div class="event-card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); showPublicEventDetails(${e.id})">
                            📄 Details
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); handlePublicRegister(${e.id})">
                            ✍ Register
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render Club Showcase Cards — Rich glassmorphic design
function renderClubCards() {
    const grid = document.getElementById('clubs-grid');
    if (!grid) return;

    if (allClubs.length === 0) {
        grid.innerHTML = `<div class="empty-state"><p>No clubs available at this time.</p></div>`;
        return;
    }

    const defaultIcons = ['💻', '🤖', '🎨', '⚡', '🏆', '🎭', '🔬', '🚀', '🎵', '⚽'];
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

    function resolveClubIcon(c, idx) {
        const defaults = ['💻', '🤖', '🎨', '⚽', '📚', '🚀', '🔬', '⚡', '🏆', '🎭'];
        if (!c) return defaults[idx % defaults.length];

        // Match by club name for guaranteed clean emojis
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

    grid.innerHTML = allClubs.map((club, idx) => {
        const icon = resolveClubIcon(club, idx);
        const cat = club.category || 'Student Society';
        const accentColor = getCategoryColor(cat);
        const desc = escapeHtml(club.description || 'A dynamic student community at KLS GIT Belgaum. Join us for workshops, competitions, mentorship sessions, and campus activities.');
        const schedule = club.meetingSchedule || '';
        const venue = club.venue || '';
        const facultyName = club.facultyCoordinatorName || '';
        const studentLead = club.studentCoordinatorName || '';

        return `
            <div class="card club-showcase-card" style="padding: 0; overflow: hidden;">
                <!-- Category color stripe -->
                <div style="height: 4px; background: ${accentColor};"></div>

                <div style="padding: 22px 22px 18px;">
                    <!-- Club Avatar & Name -->
                    <div style="display:flex; align-items:center; gap: 14px; margin-bottom: 14px;">
                        <div style="
                            width: 56px; height: 56px; border-radius: 14px; flex-shrink: 0;
                            background: linear-gradient(135deg, ${accentColor}22, ${accentColor}44);
                            display:flex; align-items:center; justify-content:center;
                            font-size: 1.7rem;
                            border: 1px solid ${accentColor}55;
                            box-shadow: 0 4px 12px ${accentColor}30;
                        ">${icon}</div>
                        <div style="min-width: 0;">
                            <h4 style="margin: 0 0 4px; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(club.name)}</h4>
                            <span style="font-size: 0.72rem; color: ${accentColor}; font-weight: 600; background: ${accentColor}1a; padding: 2px 8px; border-radius: 20px; border: 1px solid ${accentColor}40;">${escapeHtml(cat)}</span>
                        </div>
                    </div>

                    <!-- Description -->
                    <p style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.55; margin-bottom: 14px;
                        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                        ${desc}
                    </p>

                    <!-- Info rows -->
                    <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; font-size: 0.78rem; color: var(--text-muted);">
                        ${facultyName ? `<div style="display:flex; align-items:center; gap:6px;"><span style="font-size:0.9rem;">🎓</span> <span><strong style="color:var(--text-secondary);">Faculty:</strong> ${escapeHtml(facultyName)}</span></div>` : ''}
                        ${studentLead ? `<div style="display:flex; align-items:center; gap:6px;"><span style="font-size:0.9rem;">👨‍💻</span> <span><strong style="color:var(--text-secondary);">Student Lead:</strong> ${escapeHtml(studentLead)}</span></div>` : ''}
                        ${schedule ? `<div style="display:flex; align-items:center; gap:6px;"><span style="font-size:0.9rem;">🕐</span> <span>${escapeHtml(schedule)}</span></div>` : ''}
                        ${venue ? `<div style="display:flex; align-items:center; gap:6px;"><span style="font-size:0.9rem;">📍</span> <span>${escapeHtml(venue)}</span></div>` : ''}
                    </div>

                    <!-- Footer CTA -->
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid rgba(255,255,255,0.07); padding-top: 14px;">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">✅ Verified Chapter</span>
                        <a href="/club.html?id=${club.id}" class="btn btn-secondary btn-sm" style="text-decoration:none; font-size:0.78rem; padding: 6px 14px;">
                            🏛 Explore Club →
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Category filter handler
function filterCategory(cat, btn) {
    activeCategoryFilter = cat;
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderEventCards();
}

// Search handler
function onSearchChange() {
    renderEventCards();
}

// Public Event Details Modal
function showPublicEventDetails(eventId) {
    const e = allEvents.find(ev => ev.id === eventId);
    if (!e) return;

    const modalTitle = document.getElementById('detailsModalTitle');
    const modalBody = document.getElementById('detailsModalBody');
    const modalActions = document.getElementById('detailsModalActions');

    if (modalTitle) modalTitle.textContent = e.title;
    if (modalBody) {
        modalBody.innerHTML = `
            <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
                ${formatEventTypeBadge(e.eventType)}
                ${getPublicEventBadge(e)}
            </div>
            <p style="color:var(--text-secondary); line-height:1.6; margin-bottom: 16px;">
                ${escapeHtml(e.description || 'No detailed description provided.')}
            </p>
            <div style="background:var(--bg-elevated); padding:16px; border-radius:10px; border:1px solid var(--border-color); display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.88rem;">
                <div><strong>🏛 Organizing Club:</strong> ${e.club ? escapeHtml(e.club.name) : 'Campus Club'}</div>
                <div><strong>📍 Location/Venue:</strong> ${escapeHtml(e.venue || 'TBD')}</div>
                <div><strong>📅 Event Date:</strong> ${formatDate(e.date)}</div>
                <div><strong>⏰ Scheduled Time:</strong> ${e.startTime || e.time || '10:00 AM'}</div>
                <div><strong>👥 Capacity:</strong> ${e.maxParticipants || 100} Seats</div>
                <div><strong>⏳ Registration Deadline:</strong> ${formatDate(e.registrationDeadline) || 'Day of Event'}</div>
            </div>
        `;
    }

    if (modalActions) {
        modalActions.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('eventDetailsModal')">Close</button>
            <button class="btn btn-primary" onclick="closeModal('eventDetailsModal'); handlePublicRegister(${e.id})">
                ✍ Register for this Event
            </button>
        `;
    }

    openModal('eventDetailsModal');
}

// Handling Register Click
function handlePublicRegister(eventId) {
    const token = getToken();
    const role = getRole();

    if (!token) {
        // Save the event id so we can immediately pop up registration modal after login
        sessionStorage.setItem('pendingEventRegisterId', String(eventId));
        localStorage.setItem('pendingEventRegisterId', String(eventId));
        showToast('Please sign in with your student account to complete registration.', 'info');
        openLoginModal();
        const roleDropdown = document.getElementById('role');
        if (roleDropdown) roleDropdown.value = 'USER';
        return;
    }

    if (String(role).toUpperCase() === 'USER') {
        // Direct in-page registration popup right on the home page!
        openPublicEventRegistrationModal(eventId);
    } else {
        showToast('You are signed in as ' + role + '. Student account is required to register for events.', 'info');
        redirectByRole();
    }
}

// ============================================================
// In-Page Event Registration Workflow (Home Page Pop Up)
// ============================================================
let activePublicRegisteringEvent = null;

async function openPublicEventRegistrationModal(eventId) {
    if (!eventId) return;

    if (!allEvents || !allEvents.length) {
        await loadPublicEvents();
    }
    let event = allEvents.find(e => e.id == eventId || String(e.id) === String(eventId));
    if (!event) {
        // Fallback: try fetching event directly by ID
        try {
            const res = await fetch(`/api/events/${eventId}`);
            if (res.ok) {
                event = await res.json();
                if (event && !allEvents.some(e => e.id == event.id)) {
                    allEvents.push(event);
                }
            }
        } catch (fetchErr) {
            console.warn('Fallback event fetch error:', fetchErr);
        }
    }

    if (!event) {
        showToast('Event details not found.', 'warning');
        return;
    }

    activePublicRegisteringEvent = event;

    // Header & Badges
    const titleEl = document.getElementById('event-reg-title');
    if (titleEl) titleEl.textContent = event.title;

    const clubEl = document.getElementById('event-reg-club-badge');
    if (clubEl) clubEl.textContent = event.club ? event.club.name : 'College Club';

    const typeEl = document.getElementById('event-reg-type-badge');
    if (typeEl) typeEl.innerHTML = formatEventTypeBadge(event.eventType);

    // Capacity & Deadline
    const capText = event.maxParticipants ? `Max ${event.maxParticipants} Seats` : 'Unlimited Capacity';
    const deadline = event.registrationDeadline ? `Cutoff: ${event.registrationDeadline}` : 'Open Registration';
    const capCountEl = document.getElementById('event-reg-capacity-count');
    if (capCountEl) capCountEl.textContent = `👥 ${capText}`;
    const deadlineEl = document.getElementById('event-reg-deadline-text');
    if (deadlineEl) deadlineEl.textContent = `📅 ${deadline}`;

    // Student Profile Pre-fill
    const nameEl = document.getElementById('event-reg-student-name');
    if (nameEl) nameEl.value = getUserName() || 'Student';

    const emailEl = document.getElementById('event-reg-student-email');
    if (emailEl) emailEl.value = localStorage.getItem('userEmail') || 'student@college.edu';

    // Auto-fill phone, USN, dept, year if saved
    const savedPhone = localStorage.getItem('userMobile') || localStorage.getItem('userPhone') || '';
    const phoneEl = document.getElementById('event-reg-phone');
    if (phoneEl && !phoneEl.value) phoneEl.value = savedPhone;

    const savedUsn = localStorage.getItem('userUsn') || '';
    const usnEl = document.getElementById('event-reg-usn');
    if (usnEl && !usnEl.value) usnEl.value = savedUsn;

    // Team registration defaults
    const isHackathon = (event.eventType === 'HACKATHON');
    const teamCheck = document.getElementById('event-reg-is-team-checkbox');
    if (teamCheck) {
        teamCheck.checked = isHackathon;
        togglePublicTeamFields();
    }
    const teamNameInput = document.getElementById('event-reg-team-name');
    if (teamNameInput) teamNameInput.value = '';
    const teamList = document.getElementById('event-reg-teammates-list');
    if (teamList) {
        teamList.innerHTML = '';
        if (isHackathon) addPublicTeammateInput();
    }

    // Dynamic Questions
    renderPublicDynamicQuestions(event.eventType);

    openModal('event-registration-modal');
}

function renderPublicDynamicQuestions(eventType) {
    const container = document.getElementById('event-reg-dynamic-questions');
    if (!container) return;
    const type = eventType || 'OTHER';
    let html = '';

    switch (type) {
        case 'CODING':
            html = `
                <div class="form-group" style="margin-bottom:12px;">
                    <label class="form-label">Preferred Programming Languages *</label>
                    <div class="choice-chips-grid">
                        <label class="choice-chip"><input type="checkbox" name="pub_dyn_lang" value="Python" checked /> Python</label>
                        <label class="choice-chip"><input type="checkbox" name="pub_dyn_lang" value="Java" checked /> Java</label>
                        <label class="choice-chip"><input type="checkbox" name="pub_dyn_lang" value="C++" /> C++</label>
                        <label class="choice-chip"><input type="checkbox" name="pub_dyn_lang" value="JavaScript" /> JavaScript</label>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div class="form-group">
                        <label class="form-label">Experience Level *</label>
                        <select class="form-control" id="pub-dyn-experience" required>
                            <option value="Beginner">Beginner (0 - 1 yrs)</option>
                            <option value="Intermediate" selected>Intermediate (1 - 3 yrs)</option>
                            <option value="Advanced">Advanced (3+ yrs)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">GitHub / Portfolio URL</label>
                        <input type="url" class="form-control" id="pub-dyn-github" placeholder="https://github.com/username" />
                    </div>
                </div>
            `;
            break;
        case 'HACKATHON':
            html = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div class="form-group">
                        <label class="form-label">GitHub / Project Repository</label>
                        <input type="url" class="form-control" id="pub-dyn-hack-github" placeholder="https://github.com/team" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Preferred Tech Stack</label>
                        <input type="text" class="form-control" id="pub-dyn-stack" placeholder="e.g. React, Spring Boot, AI/ML" />
                    </div>
                </div>
            `;
            break;
        case 'CULTURAL':
            html = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div class="form-group">
                        <label class="form-label">Performance Category *</label>
                        <select class="form-control" id="pub-dyn-cult-category" required>
                            <option value="Singing (Classical / Western)">Singing</option>
                            <option value="Dance (Solo / Group)">Dance</option>
                            <option value="Drama / Skit">Drama / Skit</option>
                            <option value="Instrumental Music">Instrumental</option>
                            <option value="Fine Arts">Fine Arts</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Participation Type</label>
                        <select class="form-control" id="pub-dyn-cult-type">
                            <option value="Solo">Solo</option>
                            <option value="Duet">Duet</option>
                            <option value="Group">Group</option>
                        </select>
                    </div>
                </div>
            `;
            break;
        case 'SPORTS':
            html = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div class="form-group">
                        <label class="form-label">Sport / Event Category *</label>
                        <input type="text" class="form-control" id="pub-dyn-sport-name" placeholder="e.g. Football / Badminton / Chess" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Playing Position / Weight Category</label>
                        <input type="text" class="form-control" id="pub-dyn-sport-pos" placeholder="e.g. Striker / Singles / 65kg" />
                    </div>
                </div>
            `;
            break;
        default:
            html = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                    <div class="form-group">
                        <label class="form-label">Prior Experience with Topic</label>
                        <select class="form-control" id="pub-dyn-general-exp">
                            <option value="None">None (First time)</option>
                            <option value="Basic" selected>Basic Familiarity</option>
                            <option value="Experienced">Hands-on Experience</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Primary Learning Goal</label>
                        <input type="text" class="form-control" id="pub-dyn-general-goals" placeholder="e.g. Hands-on skills, networking" />
                    </div>
                </div>
            `;
            break;
    }

    container.innerHTML = html;
}

function togglePublicTeamFields() {
    const isTeam = document.getElementById('event-reg-is-team-checkbox')?.checked;
    const fields = document.getElementById('event-reg-team-fields');
    if (fields) fields.style.display = isTeam ? 'block' : 'none';
    if (isTeam && document.getElementById('event-reg-teammates-list')?.children.length === 0) {
        addPublicTeammateInput();
    }
}

function addPublicTeammateInput() {
    const list = document.getElementById('event-reg-teammates-list');
    if (!list) return;
    if (list.children.length >= 3) {
        showToast('Maximum 3 additional squad members (Team of 4).', 'info');
        return;
    }
    const idx = list.children.length + 2;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:8px; align-items:center;';
    row.innerHTML = `
        <span style="font-size:0.8rem; color:var(--accent-cyan); font-weight:700; width:70px;">Member #${idx}:</span>
        <input type="text" class="form-control pub-teammate-input-val" placeholder="e.g. Rahul Sharma (2KG22CS045)" style="flex:1;" required />
        <button type="button" onclick="this.parentElement.remove()" style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:var(--accent-red); border-radius:6px; padding:4px 8px; cursor:pointer; font-size:0.8rem;">✕</button>
    `;
    list.appendChild(row);
}

async function submitPublicEventRegistration(e) {
    e.preventDefault();
    if (!activePublicRegisteringEvent) return;

    const btn = document.getElementById('event-confirm-reg-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Submitting Registration...';
    }

    try {
        const phone = document.getElementById('event-reg-phone')?.value.trim();
        const usn = document.getElementById('event-reg-usn')?.value.trim().toUpperCase();
        const department = document.getElementById('event-reg-dept')?.value;
        const year = document.getElementById('event-reg-year')?.value;

        // Remember for next time in localStorage
        if (phone) localStorage.setItem('userMobile', phone);
        if (usn) localStorage.setItem('userUsn', usn);

        // Gather event-specific custom data
        const customDataObj = {
            submittedAt: new Date().toISOString()
        };

        const eventType = activePublicRegisteringEvent.eventType || 'OTHER';
        if (eventType === 'CODING') {
            const langs = Array.from(document.querySelectorAll('input[name="pub_dyn_lang"]:checked')).map(cb => cb.value);
            customDataObj.languages = langs;
            customDataObj.experienceLevel = document.getElementById('pub-dyn-experience')?.value || 'Intermediate';
            customDataObj.githubUrl = document.getElementById('pub-dyn-github')?.value.trim() || '';
        } else if (eventType === 'HACKATHON') {
            customDataObj.githubUrl = document.getElementById('pub-dyn-hack-github')?.value.trim() || '';
            customDataObj.stack = document.getElementById('pub-dyn-stack')?.value.trim() || '';
        } else if (eventType === 'CULTURAL') {
            customDataObj.category = document.getElementById('pub-dyn-cult-category')?.value || '';
            customDataObj.participationType = document.getElementById('pub-dyn-cult-type')?.value || '';
        } else if (eventType === 'SPORTS') {
            customDataObj.sport = document.getElementById('pub-dyn-sport-name')?.value.trim() || '';
            customDataObj.position = document.getElementById('pub-dyn-sport-pos')?.value.trim() || '';
        } else {
            customDataObj.priorExperience = document.getElementById('pub-dyn-general-exp')?.value || '';
            customDataObj.goals = document.getElementById('pub-dyn-general-goals')?.value.trim() || '';
        }

        // Process team registration
        let teamName = null;
        let teamMembers = null;
        if (document.getElementById('event-reg-is-team-checkbox')?.checked) {
            teamName = document.getElementById('event-reg-team-name')?.value.trim();
            if (!teamName) {
                showToast('Please enter your Squad / Team Name.', 'warning');
                if (btn) { btn.disabled = false; btn.textContent = '🎟️ Confirm Registration & Get Pass'; }
                return;
            }
            const memberInputs = Array.from(document.querySelectorAll('.pub-teammate-input-val'))
                .map(inp => inp.value.trim())
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

        const res = await apiFetch(`/api/events/${activePublicRegisteringEvent.id}/register`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        closeModal('event-registration-modal');
        showToast(`Registered successfully! Status: ${res.status || 'CONFIRMED'} 🎉`, 'success');

        // Display holographic pass
        displayPublicTicketPass(res);

    } catch (err) {
        showToast('Registration failed: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🎟️ Confirm Registration & Get Pass';
        }
    }
}

function displayPublicTicketPass(reg) {
    const evTitle = reg.eventTitle || (activePublicRegisteringEvent ? activePublicRegisteringEvent.title : 'Event Registration Pass');
    const clubName = (reg.clubName || (activePublicRegisteringEvent && activePublicRegisteringEvent.club ? activePublicRegisteringEvent.club.name : 'COLLEGE CLUB')).toUpperCase();
    const evType = reg.eventType || (activePublicRegisteringEvent ? activePublicRegisteringEvent.eventType : 'OTHER');

    const titleEl = document.getElementById('event-ticket-title');
    if (titleEl) titleEl.textContent = evTitle;

    const clubEl = document.getElementById('event-ticket-club-name');
    if (clubEl) clubEl.textContent = clubName;

    const typeEl = document.getElementById('event-ticket-type-badge');
    if (typeEl) typeEl.innerHTML = formatEventTypeBadge(evType);

    const dateEl = document.getElementById('event-ticket-date');
    if (dateEl) dateEl.textContent = `📅 ${reg.eventDate || (activePublicRegisteringEvent ? activePublicRegisteringEvent.date : 'Upcoming')}`;

    const timeEl = document.getElementById('event-ticket-time');
    if (timeEl) timeEl.textContent = `⏰ ${reg.eventTime || (activePublicRegisteringEvent ? (activePublicRegisteringEvent.startTime || activePublicRegisteringEvent.time) : '10:00 AM')}`;

    const venueEl = document.getElementById('event-ticket-venue');
    if (venueEl) venueEl.textContent = `📍 ${reg.eventVenue || (activePublicRegisteringEvent ? activePublicRegisteringEvent.venue : 'Campus Venue')}`;

    const studentEl = document.getElementById('event-ticket-student-name');
    if (studentEl) studentEl.textContent = reg.studentName || getUserName() || 'Student';

    const usnEl = document.getElementById('event-ticket-student-usn');
    if (usnEl) usnEl.textContent = reg.usnOrStudentId || 'USN REGISTERED';

    const deptEl = document.getElementById('event-ticket-dept');
    if (deptEl) deptEl.textContent = `${reg.department || 'Department'} (${reg.year || '2026'})`;

    const regNumEl = document.getElementById('event-ticket-reg-number');
    if (regNumEl) regNumEl.textContent = reg.registrationNumber || `REG-${reg.id}`;

    const statusBadgeEl = document.getElementById('event-ticket-status-badge');
    if (statusBadgeEl) statusBadgeEl.innerHTML = `<span class="badge badge-green">✓ ${reg.status || 'CONFIRMED'}</span>`;

    // Team banner
    const teamBanner = document.getElementById('event-ticket-team-banner');
    if (teamBanner) {
        if (reg.teamName) {
            const teamNameEl = document.getElementById('event-ticket-team-name');
            if (teamNameEl) teamNameEl.textContent = reg.teamName;

            let membersText = '';
            if (reg.teamMembers) {
                try {
                    const arr = JSON.parse(reg.teamMembers);
                    if (Array.isArray(arr) && arr.length) membersText = 'Squad: ' + arr.join(' • ');
                } catch (e) {
                    membersText = 'Squad: ' + reg.teamMembers;
                }
            }
            const membersEl = document.getElementById('event-ticket-team-members');
            if (membersEl) membersEl.textContent = membersText;
            teamBanner.style.display = 'block';
        } else {
            teamBanner.style.display = 'none';
        }
    }

    // QR Code
    const qrBox = document.getElementById('event-ticket-qr-box');
    if (qrBox) {
        const qrString = reg.qrCodeData || reg.registrationNumber || `REG-${reg.id}`;
        qrBox.innerHTML = generatePublicQRCodeSVG(qrString, 140);
    }

    openModal('event-ticket-modal');
}

function generatePublicQRCodeSVG(text, size = 140) {
    const dim = 25;
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

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
            const inFinder1 = (i < 8 && j < 8);
            const inFinder2 = (i < 8 && j >= dim - 8);
            const inFinder3 = (i >= dim - 8 && j < 8);
            if (!inFinder1 && !inFinder2 && !inFinder3) {
                const bit = Math.abs((hash ^ (i * 31 + j * 17))) % 3;
                matrix[i][j] = (bit === 0 || bit === 1) ? 1 : 0;
            }
        }
    }

    const cellSize = (size / dim).toFixed(2);
    let rects = '';
    for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
            if (matrix[i][j] === 1) {
                const x = (j * cellSize).toFixed(2);
                const y = (i * cellSize).toFixed(2);
                rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="#38bdf8" rx="1"/>`;
            }
        }
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:auto; background:rgba(15,23,42,0.95); padding:8px; border-radius:10px; border:1px solid rgba(56,189,248,0.3);">${rects}</svg>`;
}

// Calendar Engine & Interactive Agenda Inspector
let selectedCalendarDate = null;

function renderCalendar() {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // If no day selected yet, pick an event date in this month or today
    if (!selectedCalendarDate) {
        const firstEventInMonth = allEvents.find(e => {
            if (!e.date) return false;
            const parts = e.date.split('-');
            return parseInt(parts[0]) === currentCalendarYear && parseInt(parts[1]) === (currentCalendarMonth + 1);
        });
        selectedCalendarDate = firstEventInMonth ? firstEventInMonth.date : todayStr;
    }

    const firstDayIndex = new Date(currentCalendarYear, currentCalendarMonth, 1).getDay();
    const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();

    let calHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <h3 style="margin:0; font-size:1.3rem; font-weight:800; color:var(--text-primary);">
                    📅 ${monthNames[currentCalendarMonth]} ${currentCalendarYear}
                </h3>
                <span class="badge badge-blue" style="font-size:0.75rem;">Interactive Grid</span>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-secondary btn-sm" onclick="changeMonth(-1)">◀ Prev</button>
                <button class="btn btn-secondary btn-sm" onclick="jumpToToday()">Today</button>
                <button class="btn btn-secondary btn-sm" onclick="changeMonth(1)">Next ▶</button>
            </div>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-head">Sun</div>
            <div class="calendar-day-head">Mon</div>
            <div class="calendar-day-head">Tue</div>
            <div class="calendar-day-head">Wed</div>
            <div class="calendar-day-head">Thu</div>
            <div class="calendar-day-head">Fri</div>
            <div class="calendar-day-head">Sat</div>
    `;

    // Blank cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
        calHtml += `<div class="calendar-day empty"></div>`;
    }

    // Days of month
    for (let day = 1; day <= lastDay; day++) {
        const dStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = allEvents.filter(e => e.date === dStr);
        const isSelected = selectedCalendarDate === dStr;
        const isToday = todayStr === dStr;

        calHtml += `
            <div class="calendar-day ${dayEvents.length > 0 ? 'has-events' : ''} ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}" 
                 onclick="selectCalendarDate('${dStr}')"
                 title="Click to view agenda for ${dStr}">
                <div class="calendar-day-header">
                    <span class="day-number">${day}</span>
                    ${dayEvents.length > 0 ? `<span class="event-count-badge">${dayEvents.length}</span>` : ''}
                </div>
                ${dayEvents.slice(0, 2).map(e => `
                    <div class="calendar-event-pill" onclick="event.stopPropagation(); showPublicEventDetails(${e.id})" title="${escapeHtml(e.title)}">
                        <span>${getTypeIcon(e.eventType)}</span>
                        <span>${escapeHtml(e.title)}</span>
                    </div>
                `).join('')}
                ${dayEvents.length > 2 ? `<div class="calendar-event-more">+${dayEvents.length - 2} more</div>` : ''}
            </div>
        `;
    }

    calHtml += `</div>`;

    // Add Day Agenda Inspector
    calHtml += renderCalendarAgendaHtml(selectedCalendarDate);

    container.innerHTML = calHtml;
}

function getTypeIcon(type) {
    const icons = {
        CODING: '💻', HACKATHON: '🚀', QUIZ: '🧠', DESIGN: '🎨',
        WORKSHOP: '🛠️', PROJECT_EXHIBITION: '💡', DEBATE: '🗣️',
        CULTURAL: '🎭', SPORTS: '🏆', OTHER: '📦'
    };
    return icons[type] || '📅';
}

function selectCalendarDate(dStr) {
    selectedCalendarDate = dStr;
    renderCalendar();
}

function jumpToToday() {
    const today = new Date();
    currentCalendarMonth = today.getMonth();
    currentCalendarYear = today.getFullYear();
    selectedCalendarDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    renderCalendar();
}

function renderCalendarAgendaHtml(dateStr) {
    if (!dateStr) return '';
    const dayEvents = allEvents.filter(e => e.date === dateStr);
    
    // Format human date
    let formattedDate = dateStr;
    try {
        const parts = dateStr.split('-');
        const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        formattedDate = dObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch(e) {}

    let agendaHtml = `
        <div class="calendar-agenda-card">
            <div class="calendar-agenda-header">
                <div>
                    <h4 style="margin:0; font-size:1.15rem; font-weight:700; color:var(--text-primary);">
                        📋 Campus Agenda for ${formattedDate}
                    </h4>
                    <p style="margin:4px 0 0; font-size:0.85rem; color:var(--text-muted);">
                        ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'} scheduled on this day
                    </p>
                </div>
            </div>
    `;

    if (dayEvents.length === 0) {
        agendaHtml += `
            <div style="text-align:center; padding: 24px; color:var(--text-muted);">
                <div style="font-size:2rem; margin-bottom:8px;">☕</div>
                <p style="margin:0; font-size:0.95rem;">No campus events scheduled on this day.</p>
                <p style="margin:4px 0 0; font-size:0.82rem;">Select any highlighted day with a badge above to inspect scheduled events.</p>
            </div>
        `;
    } else {
        agendaHtml += dayEvents.map(e => `
            <div class="agenda-event-row">
                <div style="display:flex; align-items:center; gap:14px; min-width:240px;">
                    <span style="font-size:1.8rem;">${getTypeIcon(e.eventType)}</span>
                    <div>
                        <div style="font-weight:700; font-size:1rem; color:var(--text-primary); margin-bottom:2px;">
                            ${escapeHtml(e.title)}
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-muted); display:flex; gap:8px; align-items:center;">
                            <span>🏛️ ${e.club ? escapeHtml(e.club.name) : 'Student Club'}</span>
                            <span>•</span>
                            <span class="badge badge-blue" style="font-size:0.68rem;">${e.eventType}</span>
                        </div>
                    </div>
                </div>

                <div style="font-size:0.85rem; color:var(--text-secondary); display:flex; gap:16px; align-items:center;">
                    <span>⏰ ${e.startTime ? e.startTime : (e.time || 'TBD')} ${e.endTime ? '- ' + e.endTime : ''}</span>
                    <span>📍 ${escapeHtml(e.venue || 'Campus Auditorium')}</span>
                </div>

                <div>
                    <button class="btn btn-primary btn-sm" onclick="showPublicEventDetails(${e.id})">
                        View Details & Register →
                    </button>
                </div>
            </div>
        `).join('');
    }

    agendaHtml += `</div>`;
    return agendaHtml;
}

function changeMonth(delta) {
    currentCalendarMonth += delta;
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    } else if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }
    renderCalendar();
}

// Login Modal Handlers
function openLoginModal(tab) {
    openModal('loginModal');
    const roleDropdown = document.getElementById('role');
    if (roleDropdown && !roleDropdown.value) {
        roleDropdown.value = 'USER';
    }
    if (tab === 'register' && typeof switchAuthTab === 'function') {
        switchAuthTab('register');
    }
}

function closeLoginModal() {
    closeModal('loginModal');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
