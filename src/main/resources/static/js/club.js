// ============================================================
// club.js — Digital Club Profile Logic
// ============================================================

let currentClubProfile = null;
const urlParams = new URLSearchParams(window.location.search);
const clubId = urlParams.get('id') || '1';

document.addEventListener('DOMContentLoaded', async () => {
    updateNavAuthUI();
    await loadClubProfile();
});

// Update navbar authentication buttons
function updateNavAuthUI() {
    const navAuthContainer = document.getElementById('nav-auth-container');
    if (!navAuthContainer) return;

    const token = getToken();
    const role = getRole();
    const name = getUserName() || 'User';

    if (token && role) {
        navAuthContainer.innerHTML = `
            <div style="display:flex; align-items:center; gap: 12px;">
                <span class="badge badge-purple" style="font-size:0.8rem; padding: 5px 10px;">👋 ${name}</span>
                <button class="btn btn-primary btn-sm" onclick="redirectByRole()">
                    📊 My Dashboard
                </button>
                <button class="btn btn-secondary btn-sm" onclick="logout()">
                    Sign Out
                </button>
            </div>
        `;
    } else {
        navAuthContainer.innerHTML = `
            <div style="display:flex; align-items:center; gap: 10px;">
                <button class="btn btn-primary btn-sm" onclick="openModal('loginModal')">
                    🔐 Sign In
                </button>
            </div>
        `;
    }
}

// Fetch Profile data
async function loadClubProfile() {
    try {
        const res = await fetch(`/api/clubs/${clubId}/profile`);
        if (!res.ok) throw new Error('Club profile not found');
        currentClubProfile = await res.json();
        renderClubDetails();
    } catch (err) {
        document.getElementById('club-name').textContent = 'Club Not Found';
        document.getElementById('club-desc').textContent = 'The requested campus club profile does not exist or has been modified.';
    }
}

// Rich metadata profiles for clubs at KLS GIT Belgaum
const CLUB_CATALOG_METADATA = {
    'literary': {
        category: 'Literary & Oratory Society',
        avatar: '📚',
        headline: 'Debating, Model UN, creative writing, elocution, and public speaking at KLS GIT Belgaum.',
        detailedDesc: 'The Literary Society at KLS Gogte Institute of Technology is dedicated to nurturing articulate, analytical, and persuasive communicators. We host parliamentary debates, Model United Nations (MUN) delegations, creative writing workshops, and poetry slams, empowering students to lead with rhetorical excellence and intellectual rigor. Our members represent the college across premier national debate leagues, youth parliaments, and literary anthologies.',
        pillars: [
            '🗣️ Parliamentary Debates & Youth Parliament',
            '🌐 Model United Nations (GIT MUN Delegations)',
            '✍️ Creative Writing, Editorial & Campus Chronicle',
            '🎙️ Public Speaking & Toastmasters Workshops',
            '📜 Spoken Word, Slam Poetry & Book Discussions'
        ],
        schedule: 'Every Wednesday, 5:00 PM – 6:30 PM',
        venue: 'Silver Jubilee Auditorium / Seminar Hall 2',
        eligibility: 'Open to all undergraduate & postgraduate students across all branches and years at KLS GIT Belgaum.'
    },
    'coding': {
        category: 'Technology & AI Society',
        avatar: '💻',
        headline: 'Official Computer Science, Competitive Programming, and Full-Stack Software Engineering Hub.',
        detailedDesc: 'The Coding Club at KLS GIT Belgaum is an active technical community bridging curriculum theory and real-world software engineering. We organize 24-hour hackathons, algorithmic sprints, open-source bootcamps, and technical interview preparation workshops to build industry-ready developers and innovators.',
        pillars: [
            '💻 Competitive Programming & Algorithmic Sprints',
            '🚀 24-Hour Campus Hackathons & Product Builds',
            '🌐 Full-Stack Web, Cloud & DevOps Workshops',
            '🤖 Open Source Bootcamps & Git Mastery',
            '💼 Technical Interview Prep & DSA Masterclasses'
        ],
        schedule: 'Every Tuesday & Thursday, 5:30 PM – 7:00 PM',
        venue: 'Advanced Computing Lab / CSE Department',
        eligibility: 'Open to all students interested in programming, software engineering, and technology.'
    },
    'robotics': {
        category: 'Robotics & Hardware Engineering',
        avatar: '🤖',
        headline: 'Autonomous robotics, aerial drone systems, combat bots, and rapid 3D prototyping.',
        detailedDesc: 'The Robotics Club at KLS GIT Belgaum is an interdisciplinary innovation lab where mechanical, electronics, and CS students build real hardware. Members design autonomous rovers, battle-hardened combat bots, IoT sensor networks, and racing drones for collegiate competitions across India.',
        pillars: [
            '🤖 Autonomous Mobile Robotics & Line Followers',
            '🛸 Aerial Drone Systems & Quadcopters',
            '⚔️ Robo-Wars Combat Bots & Battle Arenas',
            '🔌 Embedded Systems, IoT, Arduino & ESP32',
            '🦾 3D Printing, CAD Design & Rapid Prototyping'
        ],
        schedule: 'Every Friday, 4:30 PM – 6:30 PM',
        venue: 'Robotics & Mechatronics Lab, Mechanical Block',
        eligibility: 'Open to all engineering students passionate about robotics, hardware, and automation.'
    },
    'design': {
        category: 'Creative Arts & Digital Media',
        avatar: '🎨',
        headline: 'UI/UX product design, digital media, branding, graphic design, and fine arts.',
        detailedDesc: 'The Design & Arts Club is the visual heartbeat of KLS GIT Belgaum. We fuse modern digital product design (Figma UI/UX) with traditional fine arts, typography, motion graphics, and campus media, cultivating creative designers and visual storytellers.',
        pillars: [
            '🎨 UI/UX Design & High-Fidelity Figma Prototyping',
            '🖌️ Graphic Design, Typography & Visual Identity',
            '🎬 Motion Graphics, Video Production & Campus Media',
            '🖼️ Fine Arts, Canvas Painting & Traditional Murals',
            '💡 Design Thinking Sprints & Creative Direction'
        ],
        schedule: 'Every Monday, 5:00 PM – 6:30 PM',
        venue: 'Design Studio & Digital Media Lab, KLS GIT',
        eligibility: 'Open to all students with a passion for digital or traditional arts and design.'
    },
    'sports': {
        category: 'Sports & Fitness Society',
        avatar: '⚽',
        headline: 'Inter-collegiate sports, athletics, campus tournaments, and physical wellness.',
        detailedDesc: 'The Sports & Fitness Club promotes competitive athletic achievement, physical health, and sportsmanship. We manage varsity teams in cricket, football, basketball, badminton, volleyball, and track & field athletics, hosting campus leagues and representing KLS GIT at VTU tournaments.',
        pillars: [
            '⚽ Inter-Departmental Football & Futsal Tournaments',
            '🏏 GIT Cricket Championship & Box Cricket',
            '🏀 Basketball, Volleyball & Badminton Leagues',
            '🏃 Track & Field Athletics & Sprint Relays',
            '🧘 Physical Conditioning, Yoga & Campus Wellness'
        ],
        schedule: 'Daily Morning & Evening Practice Sessions',
        venue: 'GIT Sports Complex, Gymnasium & Athletic Grounds',
        eligibility: 'Open to all enrolled students, athletes, and fitness enthusiasts at KLS GIT Belgaum.'
    }
};

function getClubMetaMatch(name) {
    const n = (name || '').toLowerCase();
    for (const [key, meta] of Object.entries(CLUB_CATALOG_METADATA)) {
        if (n.includes(key)) return meta;
    }
    return {
        category: 'Student Chapter & Society',
        avatar: '🏛',
        headline: 'Official student chapter at KLS Gogte Institute of Technology, Belgaum.',
        detailedDesc: 'An active collegiate society dedicated to student excellence, collaborative leadership, hands-on workshops, and community events across the campus.',
        pillars: [
            '🎯 Hands-on Collegiate Workshops',
            '🏆 Campus Competitions & Contests',
            '👥 Peer Mentorship & Collaboration',
            '📜 Official Certified Activities'
        ],
        schedule: 'Every Wednesday, 5:00 PM – 6:30 PM',
        venue: 'Central Seminar Hall, KLS GIT',
        eligibility: 'Open to all enrolled students at KLS GIT Belgaum.'
    };
}

// Render data onto the UI
function renderClubDetails() {
    const p = currentClubProfile;
    if (!p) return;

    const meta = getClubMetaMatch(p.name);

    // Header
    document.title = `${p.name} — KLS GIT Belgaum`;
    document.getElementById('club-name').textContent = p.name;
    document.getElementById('club-desc').textContent = p.description || meta.headline;
    document.getElementById('club-category').textContent = p.category && p.category !== 'Technical & Innovation' && !p.name.toLowerCase().includes('literary') 
        ? p.category 
        : meta.category;
    document.getElementById('stat-club-events').textContent = p.totalEvents || '0';
    document.getElementById('stat-club-followers').textContent = p.followerCount || '355';
    document.getElementById('club-avatar').textContent = meta.avatar || '🏛';

    // Tab 0: About & Overview
    const aboutTitle = document.getElementById('about-club-title');
    if (aboutTitle) aboutTitle.textContent = p.name;

    const aboutIcon = document.getElementById('about-section-icon');
    if (aboutIcon) aboutIcon.textContent = meta.avatar || '📖';

    const aboutDesc = document.getElementById('about-detailed-desc');
    if (aboutDesc) {
        aboutDesc.textContent = p.detailedDescription || meta.detailedDesc;
    }

    const pillarsGrid = document.getElementById('about-pillars-grid');
    if (pillarsGrid) {
        const rawPillars = (p.pillars && p.pillars.length) ? p.pillars : meta.pillars;
        pillarsGrid.innerHTML = rawPillars.map(pill => {
            return `
                <div style="background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:10px; padding:12px 14px; display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.1rem;">⚡</span>
                    <span style="font-size:0.88rem; font-weight:600; color:var(--text-primary); line-height:1.4;">${escapeHtml(pill)}</span>
                </div>
            `;
        }).join('');
    }

    const schedEl = document.getElementById('about-schedule');
    if (schedEl) schedEl.textContent = p.meetingSchedule || meta.schedule;

    const venueEl = document.getElementById('about-venue');
    if (venueEl) venueEl.textContent = p.venue || meta.venue;

    const eligEl = document.getElementById('about-eligibility');
    if (eligEl) eligEl.textContent = p.eligibility || meta.eligibility;

    const fNameEl = document.getElementById('about-faculty-name');
    if (fNameEl) fNameEl.textContent = p.facultyCoordinatorName || 'Dr. Rajesh Kulkarni';

    const fEmailEl = document.getElementById('about-faculty-email');
    if (fEmailEl) fEmailEl.textContent = p.facultyCoordinatorEmail || 'faculty@college.edu';

    // Upcoming Events
    const upGrid = document.getElementById('club-upcoming-grid');
    if (upGrid) {
        if (!p.upcomingEvents || p.upcomingEvents.length === 0) {
            upGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
                    <div class="empty-state-icon" style="font-size:3rem; margin-bottom:12px;">📅</div>
                    <h3 style="font-size:1.2rem; color:var(--text-primary); margin:0 0 8px 0;">No upcoming events currently scheduled</h3>
                    <p style="color:var(--text-muted); max-width:480px; margin:0 auto 20px; font-size:0.92rem; line-height:1.5;">
                        The coordinators are planning new workshops and contests. Check out our club focus areas or browse our past achievements.
                    </p>
                    <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
                        <button class="btn btn-primary btn-sm" onclick="switchClubTab('about', document.querySelectorAll('.tab-btn')[0])">
                            📖 Read About the Club
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="switchClubTab('past', document.querySelectorAll('.tab-btn')[2])">
                            🏁 View Past Archives
                        </button>
                    </div>
                </div>
            `;
        } else {
            upGrid.innerHTML = p.upcomingEvents.map(e => renderEventCard(e)).join('');
        }
    }

    // Past Events
    const pastGrid = document.getElementById('club-past-grid');
    if (pastGrid) {
        if (!p.pastEvents || p.pastEvents.length === 0) {
            pastGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">🏁</div>
                    <h3>No past events recorded yet</h3>
                </div>
            `;
        } else {
            pastGrid.innerHTML = p.pastEvents.map(e => renderEventCard(e)).join('');
        }
    }

    // Leadership
    const lGrid = document.getElementById('leadership-grid');
    if (lGrid) {
        let lHtml = `
            <div class="leadership-card">
                <div class="leadership-icon">🎓</div>
                <div>
                    <span class="badge badge-green" style="font-size:0.72rem;">Faculty Coordinator</span>
                    <h4 style="margin:4px 0 2px 0; font-size:1.1rem; color:var(--text-primary);">${escapeHtml(p.facultyCoordinatorName || 'Dr. Rajesh Kulkarni')}</h4>
                    <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">${escapeHtml(p.facultyCoordinatorEmail || 'faculty@college.edu')}</p>
                </div>
            </div>
        `;

        if (p.studentCoordinators && p.studentCoordinators.length > 0) {
            p.studentCoordinators.forEach(sc => {
                lHtml += `
                    <div class="leadership-card">
                        <div class="leadership-icon">⭐</div>
                        <div>
                            <span class="badge badge-blue" style="font-size:0.72rem;">Student Lead Coordinator</span>
                            <h4 style="margin:4px 0 2px 0; font-size:1.1rem; color:var(--text-primary);">${escapeHtml(sc)}</h4>
                            <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">Executive Student Committee</p>
                        </div>
                    </div>
                `;
            });
        }
        lGrid.innerHTML = lHtml;
    }

    // Announcements
    const aList = document.getElementById('announcements-list');
    if (aList) {
        if (!p.announcements || p.announcements.length === 0) {
            aList.innerHTML = `<div class="empty-state"><p>No active announcements.</p></div>`;
        } else {
            aList.innerHTML = p.announcements.map((ann, idx) => `
                <div style="background:var(--bg-card); border-left: 4px solid var(--primary); padding: 16px 20px; border-radius: 8px; border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                        <span style="font-weight:700; color:var(--primary); font-size:0.85rem;">Official Notice #${idx + 1}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">Active Circular</span>
                    </div>
                    <p style="margin:0; color:var(--text-secondary); line-height:1.5;">${escapeHtml(ann)}</p>
                </div>
            `).join('');
        }
    }

    // Achievements
    const achList = document.getElementById('achievements-list');
    if (achList) {
        if (!p.achievements || p.achievements.length === 0) {
            achList.innerHTML = `<div class="empty-state"><p>No recorded achievements.</p></div>`;
        } else {
            achList.innerHTML = p.achievements.map((ach, idx) => `
                <div class="card" style="padding: 20px; border-left: 3px solid var(--accent);">
                    <div style="font-size: 1.8rem; margin-bottom: 10px;">🏆</div>
                    <h4 style="margin: 0 0 6px 0; font-size: 1.05rem; font-weight:700;">Club Milestone</h4>
                    <p style="margin:0; color:var(--text-secondary); font-size: 0.9rem; line-height:1.5;">${escapeHtml(ach)}</p>
                </div>
            `).join('');
        }
    }
}

// Public event status helpers (No internal APPROVED badges)
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

// Render individual event card
function renderEventCard(e) {
    const timeStr = e.startTime || e.time || '10:00 AM';
    const venueStr = e.venue || 'Campus Auditorium';

    return `
        <div class="event-card" onclick="showClubEventDetails(${e.id})" style="cursor:pointer; position:relative;" title="Click anywhere on card to view event details">
            <div class="event-card-stripe"></div>
            <div class="event-card-body">
                <div class="event-card-top-row">
                    ${formatEventTypeBadge(e.eventType)}
                    ${getPublicEventBadge(e)}
                </div>
                <h3 class="event-card-title">${escapeHtml(e.title)}</h3>
                <p class="event-card-desc">
                    ${escapeHtml(e.description || 'Join this exciting campus activity and gain recognized experience.')}
                </p>
                <div class="event-card-meta">
                    <span class="event-meta-item">📅 ${formatDate(e.date)}</span>
                    <span class="event-meta-item">⏰ ${timeStr}</span>
                    <span class="event-meta-item">📍 ${escapeHtml(venueStr)}</span>
                </div>
                <div class="event-card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); showClubEventDetails(${e.id})">
                        📄 Details
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); handleClubEventRegister(${e.id})">
                        ✍ Register
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Tab Switching
function switchClubTab(tabKey, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    if (btn) btn.classList.add('active');
    const target = document.getElementById(`tab-${tabKey}`);
    if (target) target.classList.add('active');
}

// Event Details popup
function showClubEventDetails(eventId) {
    const all = [...(currentClubProfile?.upcomingEvents || []), ...(currentClubProfile?.pastEvents || [])];
    const e = all.find(ev => ev.id === eventId);
    if (!e) return;

    document.getElementById('detailsModalTitle').textContent = e.title;
    document.getElementById('detailsModalBody').innerHTML = `
        <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
            ${formatEventTypeBadge(e.eventType)}
            ${getPublicEventBadge(e)}
        </div>
        <p style="color:var(--text-secondary); line-height:1.6; margin-bottom: 16px;">
            ${escapeHtml(e.description || 'No detailed description provided.')}
        </p>
        <div style="background:var(--bg-elevated); padding:16px; border-radius:10px; border:1px solid var(--border-color); display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.88rem;">
            <div><strong>📍 Venue:</strong> ${escapeHtml(e.venue || 'TBD')}</div>
            <div><strong>📅 Date:</strong> ${formatDate(e.date)}</div>
            <div><strong>⏰ Time:</strong> ${e.startTime || e.time || '10:00 AM'}</div>
            <div><strong>👥 Capacity:</strong> ${e.maxParticipants || 100} Seats</div>
        </div>
    `;

    document.getElementById('detailsModalActions').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('eventDetailsModal')">Close</button>
        <button class="btn btn-primary" onclick="closeModal('eventDetailsModal'); handleClubEventRegister(${e.id})">
            ✍ Register for this Event
        </button>
    `;

    openModal('eventDetailsModal');
}

function handleClubEventRegister(eventId) {
    const token = getToken();
    const role = getRole();

    if (!token) {
        sessionStorage.setItem('pendingEventRegisterId', String(eventId));
        localStorage.setItem('pendingEventRegisterId', String(eventId));
        showToast('Please sign in to register for events.', 'info');
        openModal('loginModal');
        const roleDropdown = document.getElementById('role');
        if (roleDropdown) roleDropdown.value = 'USER';
        return;
    }

    if (String(role).toUpperCase() === 'USER') {
        window.location.href = `/user.html?registerEventId=${eventId}`;
    } else {
        redirectByRole();
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
