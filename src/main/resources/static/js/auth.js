// ============================================================
// auth.js — Shared auth utilities used by all pages
// ============================================================

const API = '';  // Same-origin — Spring Boot serves both API and static files

// ---- Token helpers ----

function saveAuth(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('userName', data.name);
    localStorage.setItem('userEmail', data.email);
    if (data.clubId) {
        localStorage.setItem('clubId', data.clubId);
    } else {
        localStorage.removeItem('clubId');
    }
    if (data.clubName) {
        localStorage.setItem('clubName', data.clubName);
    } else {
        localStorage.removeItem('clubName');
    }
}

// ---- String & HTML Utilities ----

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;

// ---- Global Modal Controls (Used across all panels) ----

function openModal(id) {
    const el = (typeof id === 'string') ? document.getElementById(id) : id;
    if (!el) {
        console.warn(`Modal #${id} not found.`);
        return;
    }
    el.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(target) {
    if (typeof target === 'string') {
        const el = document.getElementById(target);
        if (el) el.classList.remove('show');
    } else if (target && target.classList) {
        target.classList.remove('show');
    }
    const openModals = document.querySelectorAll('.modal-overlay.show');
    if (openModals.length === 0) {
        document.body.style.overflow = '';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
    document.body.style.overflow = '';
}
window.closeAllModals = closeAllModals;

// Close modal on Escape key & backdrop click
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAllModals();
        if (typeof closeMobileNav === 'function') {
            closeMobileNav();
        }
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal-overlay') && e.target.classList.contains('show')) {
        closeModal(e.target);
    }
});

// Sync user profile from server
async function syncUserProfile() {
    if (!getToken()) return null;
    try {
        const profile = await apiFetch('/api/auth/me');
        if (profile) {
            if (profile.name) localStorage.setItem('userName', profile.name);
            if (profile.email) localStorage.setItem('userEmail', profile.email);
            if (profile.role) localStorage.setItem('role', profile.role);
            if (profile.clubId) localStorage.setItem('clubId', profile.clubId);
            if (profile.clubName) localStorage.setItem('clubName', profile.clubName);
            return profile;
        }
    } catch (err) {
        console.warn('Profile sync failed:', err.message);
    }
    return null;
}

function getToken()  { return localStorage.getItem('token'); }
function getRole()   { return localStorage.getItem('role'); }
function getUserId() { return localStorage.getItem('userId'); }
function getUserName() { return localStorage.getItem('userName'); }

function clearAuth() {
    ['token','role','userId','userName','userEmail','clubId','clubName'].forEach(k => localStorage.removeItem(k));
}

function logout() {
    clearAuth();
    window.location.href = '/index.html';
}

// Guard: redirect to login if not authenticated
function requireAuth() {
    if (!getToken()) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Guard: ensure correct role on dashboard pages
function requireRole(expected) {
    if (!requireAuth()) return false;
    if (getRole() !== expected) {
        alert('Access denied. You do not have permission to view this page.');
        redirectByRole();
        return false;
    }
    return true;
}

// Redirect to correct dashboard based on role
function redirectByRole() {
    const role = getRole();
    const map = {
        'DEVELOPER':           '/developer.html',
        'COORDINATOR':         '/coordinator.html',
        'FACULTY_COORDINATOR': '/faculty.html',
        'USER':                '/user.html',
    };

    // If student has a pending event registration:
    if (String(role).toUpperCase() === 'USER') {
        const pendingEventId = sessionStorage.getItem('pendingEventRegisterId') || localStorage.getItem('pendingEventRegisterId');
        if (pendingEventId) {
            sessionStorage.removeItem('pendingEventRegisterId');
            localStorage.removeItem('pendingEventRegisterId');
            // If on a page with #event-registration-modal, stay and open modal
            if (document.getElementById('event-registration-modal') && typeof openPublicEventRegistrationModal === 'function') {
                closeLoginModal();
                if (typeof updateNavAuthUI === 'function') updateNavAuthUI();
                setTimeout(() => openPublicEventRegistrationModal(pendingEventId), 180);
                return;
            }
            window.location.href = `/user.html?registerEventId=${pendingEventId}`;
            return;
        }
    }

    window.location.href = map[role] || '/index.html';
}

// ---- Password visibility toggle ----

/**
 * Toggle password input visibility.
 * @param {string} inputId - The ID of the password <input> element.
 * @param {HTMLElement} btn - The toggle button element (shows 👁️ / 🙈 emoji).
 */
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '\uD83D\uDE48'; // 🙈
        btn.title = 'Hide password';
    } else {
        input.type = 'password';
        btn.textContent = '\uD83D\uDC41\uFE0F'; // 👁️
        btn.title = 'Show password';
    }
}

function openLoginModal(tab) {
    openModal('loginModal');
    const roleSelect = document.getElementById('role');
    if (roleSelect && !roleSelect.value) {
        roleSelect.value = 'USER';
    }
    if (tab === 'register') switchAuthTab('register');
}

function closeLoginModal() {
    closeModal('loginModal');
    window._emailVerified = false;
    window._currentVerifiedEmail = '';
    const otpRow = document.getElementById('otp-verify-row');
    if (otpRow) otpRow.style.display = 'none';
    const badge = document.getElementById('otp-verified-badge');
    if (badge) badge.style.display = 'none';
    const emailInput = document.getElementById('reg-email');
    if (emailInput) emailInput.readOnly = false;
    const sendBtn = document.getElementById('otp-send-btn');
    if (sendBtn) {
        sendBtn.style.display = '';
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send OTP';
    }
}



// ---- API fetch wrapper ----

async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const timeout = options.timeout || 35000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response;
    try {
        response = await fetch(API + path, {
            ...options,
            headers,
            signal: options.signal || controller.signal,
        });
    } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
            throw new Error('Connection timed out. The server might still be waking up. Please retry.');
        }
        throw fetchErr;
    } finally {
        clearTimeout(timeoutId);
    }

    if (response.status === 401) {
        clearAuth();
        window.location.href = '/index.html';
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(err.message || `Error ${response.status}`);
    }

    if (response.status === 204) return null;  // No Content
    return response.json();
}

// ---- Toast notifications ----

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'none';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ---- Date formatting ----

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

// ---- Status badge ----

function statusBadge(status) {
    const map = {
        'PENDING':                ['badge-amber',  '⏳ Pending'],
        'PENDING_APPROVAL':       ['badge-amber',  '⏳ Pending'],
        'APPROVED':               ['badge-green',  '✅ Approved'],
        'PUBLISHED':              ['badge-blue',   '📢 Published'],
        'REGISTRATION_OPEN':      ['badge-green',  '🟢 Reg Open'],
        'REGISTRATION_CLOSED':    ['badge-amber',  '🔒 Reg Closed'],
        'ONGOING':                ['badge-purple', '⚡ Live Now'],
        'COMPLETED':              ['badge-blue',   '🏁 Completed'],
        'RESULTS_PUBLISHED':      ['badge-purple', '🏆 Results Out'],
        'CERTIFICATES_GENERATED': ['badge-green',  '🎓 Certs Issued'],
        'REJECTED':               ['badge-red',    '❌ Rejected'],
        'CANCELLED':              ['badge-red',    '🚫 Cancelled'],
        'CONFIRMED':              ['badge-green',  '✅ Confirmed'],
        'WAITLISTED':             ['badge-amber',  '⏳ Waitlisted'],
        'ATTENDED':               ['badge-purple', '🎯 Attended'],
        'ACTIVE':                 ['badge-green',  'Active'],
    };
    const [cls, label] = map[status] || ['badge-blue', status || ''];
    return `<span class="badge ${cls}">${label}</span>`;
}

// ---- Role badge ----

function roleBadge(role) {
    const map = {
        'DEVELOPER':           ['badge-purple', '🛠 Developer'],
        'COORDINATOR':         ['badge-blue',   '📋 Coordinator'],
        'FACULTY_COORDINATOR': ['badge-green',  '🎓 Faculty Coord.'],
        'USER':                ['badge-amber',  '👤 User'],
    };
    const [cls, label] = map[role] || ['badge-amber', role];
    return `<span class="badge ${cls}">${label}</span>`;
}

// ---- Login form handler (used only on index.html) ----

let _isLoggingIn = false;
async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (_isLoggingIn) return false;

    const emailEl    = document.getElementById('email');
    const passEl     = document.getElementById('password');
    const roleEl     = document.getElementById('role');
    const errEl      = document.getElementById('error-msg');
    const btn        = document.getElementById('login-btn');

    const email    = emailEl ? emailEl.value.trim() : '';
    const password = passEl ? passEl.value : '';
    const role     = roleEl ? roleEl.value : '';

    // Client-side: ensure role is selected
    if (!role) {
        if (errEl) {
            errEl.textContent = 'Please select your role before signing in.';
            errEl.classList.add('show');
        }
        return false;
    }

    _isLoggingIn = true;
    if (errEl) errEl.classList.remove('show');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Signing in...';
    }

    try {
        // Send email + password + role to backend.
        // Backend verifies ALL THREE against the database.
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, role }),
        });

        saveAuth(data);

        // Small delay for smooth UX
        await new Promise(r => setTimeout(r, 200));

        // If user was on the home page and clicked Register for an event,
        // stay right here on the home page, close the sign-in modal, update navbar,
        // and immediately open the registration popup for that event!
        const pendingEventId = sessionStorage.getItem('pendingEventRegisterId') || localStorage.getItem('pendingEventRegisterId');
        const hasHomeModal = !!document.getElementById('event-registration-modal') && (typeof openPublicEventRegistrationModal === 'function');
        const isStudent = (String(data.role || getRole()).toUpperCase() === 'USER');

        console.log('[handleLogin] Success:', { pendingEventId, hasHomeModal, isStudent });

        if (hasHomeModal && pendingEventId && isStudent) {
            sessionStorage.removeItem('pendingEventRegisterId');
            localStorage.removeItem('pendingEventRegisterId');
            closeLoginModal();
            if (typeof updateNavAuthUI === 'function') updateNavAuthUI();
            showToast(`Welcome back, ${data.name || 'Student'}! Complete your registration below. 👇`, 'success');
            setTimeout(() => {
                openPublicEventRegistrationModal(pendingEventId);
            }, 180);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Sign In →';
            }
            return false;
        }

        // Redirect is based on the DB role returned in the response
        redirectByRole();

    } catch (err) {
        // Server sends specific messages like "Invalid role selected for this account"
        if (errEl) {
            errEl.textContent = err.message || 'Login failed. Please check your credentials and role.';
            errEl.classList.add('show');
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Sign In →';
        }
    } finally {
        _isLoggingIn = false;
    }
    return false;
}

// ============================================================
// Student Registration & OTP Verification
// ============================================================

window._emailVerified = false;
window._currentVerifiedEmail = '';

function switchAuthTab(tab) {
    const signinTab = document.getElementById('tab-signin');
    const registerTab = document.getElementById('tab-register');
    const signinPanel = document.getElementById('auth-panel-signin');
    const registerPanel = document.getElementById('auth-panel-register');
    const modalTitle = document.getElementById('auth-modal-title');

    if (tab === 'signin') {
        if (signinTab) {
            signinTab.style.color = 'var(--accent-purple)';
            signinTab.style.borderBottom = '2px solid var(--accent-purple)';
        }
        if (registerTab) {
            registerTab.style.color = 'var(--text-muted)';
            registerTab.style.borderBottom = '2px solid transparent';
        }
        if (signinPanel) signinPanel.style.display = 'block';
        if (registerPanel) registerPanel.style.display = 'none';
        if (modalTitle) modalTitle.textContent = 'KLS GIT — Campus Access';
    } else {
        if (registerTab) {
            registerTab.style.color = 'var(--accent-purple)';
            registerTab.style.borderBottom = '2px solid var(--accent-purple)';
        }
        if (signinTab) {
            signinTab.style.color = 'var(--text-muted)';
            signinTab.style.borderBottom = '2px solid transparent';
        }
        if (signinPanel) signinPanel.style.display = 'none';
        if (registerPanel) registerPanel.style.display = 'block';
        if (modalTitle) modalTitle.textContent = 'Student Account Registration';
    }
}

async function sendOTP() {
    const emailInput = document.getElementById('reg-email');
    const email = emailInput ? emailInput.value.trim() : '';
    const errEl = document.getElementById('reg-error-msg');
    const sendBtn = document.getElementById('otp-send-btn');
    const verifyRow = document.getElementById('otp-verify-row');
    const statusText = document.getElementById('otp-status-text');

    if (!email || !email.includes('@')) {
        if (errEl) {
            errEl.textContent = 'Please enter a valid college email address first.';
            errEl.classList.add('show');
        }
        return;
    }

    if (errEl) errEl.classList.remove('show');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
    }

    try {
        const res = await apiFetch('/api/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        if (verifyRow) verifyRow.style.display = 'block';
        if (statusText && res.otp) {
            statusText.textContent = `(Code: ${res.otp})`;
        }
        showToast(`Verification code sent to ${email}`, 'success');
        if (sendBtn) {
            sendBtn.textContent = 'Resend OTP';
            sendBtn.disabled = false;
        }
    } catch (err) {
        if (errEl) {
            errEl.textContent = 'Failed to send OTP: ' + err.message;
            errEl.classList.add('show');
        }
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send OTP';
        }
    }
}

async function verifyOTP() {
    const emailInput = document.getElementById('reg-email');
    const otpInput = document.getElementById('reg-otp');
    const errEl = document.getElementById('reg-error-msg');
    const badge = document.getElementById('otp-verified-badge');
    const email = emailInput ? emailInput.value.trim() : '';
    const otp = otpInput ? otpInput.value.trim() : '';

    if (!otp || otp.length < 4) {
        if (errEl) {
            errEl.textContent = 'Please enter the 6-digit verification code.';
            errEl.classList.add('show');
        }
        return;
    }

    if (errEl) errEl.classList.remove('show');

    try {
        const res = await apiFetch('/api/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp })
        });

        window._emailVerified = true;
        window._currentVerifiedEmail = email;

        if (badge) badge.style.display = 'block';
        if (emailInput) emailInput.readOnly = true;
        const sendBtn = document.getElementById('otp-send-btn');
        if (sendBtn) sendBtn.style.display = 'none';

        showToast('Email verified successfully! ✓', 'success');
    } catch (err) {
        if (errEl) {
            errEl.textContent = err.message || 'Invalid OTP code.';
            errEl.classList.add('show');
        }
    }
}

let _isRegistering = false;
async function handleStudentRegister(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (_isRegistering) return false;

    const name = document.getElementById('reg-name')?.value.trim();
    const usn = document.getElementById('reg-usn')?.value.trim().toUpperCase();
    const email = document.getElementById('reg-email')?.value.trim();
    const mobile = document.getElementById('reg-mobile')?.value.trim();
    const year = document.getElementById('reg-year')?.value;
    const dept = document.getElementById('reg-dept')?.value;
    const password = document.getElementById('reg-password')?.value;
    const errEl = document.getElementById('reg-error-msg');
    const btn = document.getElementById('register-btn');

    if (!name || !usn || !email || !mobile || !year || !dept || !password) {
        if (errEl) {
            errEl.textContent = 'Please fill in all required fields marked with *.';
            errEl.classList.add('show');
        }
        return false;
    }

    if (mobile.length < 10) {
        if (errEl) {
            errEl.textContent = 'Please enter a valid 10-digit mobile number.';
            errEl.classList.add('show');
        }
        return false;
    }

    if (password.length < 6) {
        if (errEl) {
            errEl.textContent = 'Password must be at least 6 characters long.';
            errEl.classList.add('show');
        }
        return false;
    }

    if (!window._emailVerified || window._currentVerifiedEmail !== email) {
        if (errEl) {
            errEl.textContent = 'Please complete email OTP verification before creating your account.';
            errEl.classList.add('show');
        }
        return false;
    }

    _isRegistering = true;
    if (errEl) errEl.classList.remove('show');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Creating Account...';
    }

    try {
        const payload = {
            name,
            email,
            password,
            usn,
            mobileNumber: mobile,
            yearOfStudy: parseInt(year),
            department: dept
        };

        const data = await apiFetch('/api/auth/register-student', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        saveAuth(data);
        showToast('Account created successfully! Welcome to KLS GIT 🎉', 'success');

        await new Promise(r => setTimeout(r, 200));

        // If user clicked Register on home page, stay on home page and open registration popup
        const pendingEventId = sessionStorage.getItem('pendingEventRegisterId') || localStorage.getItem('pendingEventRegisterId');
        const hasHomeModal = !!document.getElementById('event-registration-modal') && (typeof openPublicEventRegistrationModal === 'function');
        const isStudent = (String(data.role || getRole()).toUpperCase() === 'USER');

        console.log('[handleStudentRegister] Success:', { pendingEventId, hasHomeModal, isStudent });

        if (hasHomeModal && pendingEventId && isStudent) {
            sessionStorage.removeItem('pendingEventRegisterId');
            localStorage.removeItem('pendingEventRegisterId');
            closeLoginModal();
            if (typeof updateNavAuthUI === 'function') updateNavAuthUI();
            showToast('Account ready! Opening event registration...', 'success');
            setTimeout(() => {
                openPublicEventRegistrationModal(pendingEventId);
            }, 180);
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Create Account →';
            }
            return false;
        }

        redirectByRole();
    } catch (err) {
        if (errEl) {
            errEl.textContent = err.message || 'Registration failed. Please try again.';
            errEl.classList.add('show');
        }
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Create Account →';
        }
    } finally {
        _isRegistering = false;
    }
    return false;
}

// ============================================================
// MOBILE NAVIGATION DRAWER & AUTH CONTROLS
// ============================================================

function toggleMobileNav() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const toggleBtn = document.getElementById('nav-toggle-btn');
    if (!drawer) return;

    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
        closeMobileNav();
    } else {
        drawer.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
        if (toggleBtn) toggleBtn.classList.add('active');
        document.body.classList.add('mobile-nav-open');
    }
}

function closeMobileNav() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const toggleBtn = document.getElementById('nav-toggle-btn');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    if (toggleBtn) toggleBtn.classList.remove('active');
    document.body.classList.remove('mobile-nav-open');
}

// Global update for Nav & Mobile Drawer Auth UI
function syncPublicNavAuth() {
    const navAuthContainer = document.getElementById('nav-auth-container');
    const mobileAuthContainer = document.getElementById('mobile-nav-auth');

    if (!navAuthContainer && !mobileAuthContainer) return;

    const token = getToken();
    const role = getRole();
    const name = getUserName() || 'Student';

    if (token && role) {
        if (navAuthContainer) {
            navAuthContainer.innerHTML = `
                <div class="nav-auth-logged-in">
                    <span class="badge badge-purple nav-user-badge">👋 ${name}</span>
                    <button class="btn btn-primary btn-sm" onclick="redirectByRole()">
                        📊 Dashboard
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="logout()" title="Sign Out">
                        Sign Out
                    </button>
                </div>
            `;
        }
        if (mobileAuthContainer) {
            mobileAuthContainer.innerHTML = `
                <div class="drawer-user-card">
                    <div class="drawer-user-info">
                        <div class="drawer-user-avatar">👤</div>
                        <div>
                            <div class="drawer-user-name">${name}</div>
                            <div class="drawer-user-role">${role}</div>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="closeMobileNav(); redirectByRole();" style="margin-bottom:8px;">
                        📊 Open Dashboard
                    </button>
                    <button class="btn btn-secondary btn-block" onclick="logout()">
                        🚪 Sign Out
                    </button>
                </div>
            `;
        }
    } else {
        if (navAuthContainer) {
            navAuthContainer.innerHTML = `
                <button class="btn btn-primary btn-sm nav-signin-btn" onclick="if (typeof openLoginModal === 'function') openLoginModal(); else if (typeof openModal === 'function') openModal('loginModal'); else window.location.href='/index.html';">
                    🔐 Sign In
                </button>
            `;
        }
        if (mobileAuthContainer) {
            mobileAuthContainer.innerHTML = `
                <button class="btn btn-primary btn-block" onclick="closeMobileNav(); if (typeof openLoginModal === 'function') openLoginModal(); else if (typeof openModal === 'function') openModal('loginModal'); else window.location.href='/index.html';">
                    🔐 Sign In to Portal
                </button>
                <div style="font-size:0.75rem; color:var(--text-muted); text-align:center; margin-top:8px;">
                    Access registrations, QR tickets & certificates
                </div>
            `;
        }
    }
}

// Auto-initialize nav auth on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    syncPublicNavAuth();
});

