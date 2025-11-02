/**
 * MyHealth Portal - Complete JavaScript Application
 * Clean rewrite with all original features (password-only authentication)
 */

// ============================================================================
// STORAGE KEYS & HELPERS
// ============================================================================

const KEYS = {
  fontSize: 'mh_font_size',
  contrast: 'mh_contrast',
  darkMode: 'mh_dark',
  users: 'mh_users_v1',
  currentUser: 'mh_current_user',
  currentPatient: 'mh_current_patient',
  adminLogged: 'mh_admin_logged',
  messagesPrefix: 'mh_msgs_',
  issuesPrefix: 'mh_issues_',
  adminTickets: 'mh_admin_tickets'
};

// DOM helpers
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

// Storage helpers
const storage = {
  get: key => localStorage.getItem(key) || '',
  set: (key, value) => localStorage.setItem(key, value),
  remove: key => localStorage.removeItem(key),
  getJSON: key => {
    try {
      const data = localStorage.getItem(key);
      console.log(`Getting ${key}:`, data);
      return JSON.parse(data || '[]');
    } catch {
      return [];
    }
  },
  setJSON: (key, data) => {
    console.log(`Setting ${key}:`, data);
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

const UserManager = {
  generateId() {
    return 'u_' + Math.random().toString(36).substr(2, 9);
  },

  getAll() {
    return storage.getJSON(KEYS.users);
  },

  save(users) {
    storage.setJSON(KEYS.users, users);
  },

  findById(id) {
    return this.getAll().find(user => user.id === id);
  },

  findByField(field, value) {
    return this.getAll().find(user => user[field] === value);
  },

  findByRole(role) {
    return this.getAll().filter(user => user.role === role);
  },

  update(updatedUser) {
    const users = this.getAll().map(user => 
      user.id === updatedUser.id ? updatedUser : user
    );
    this.save(users);
  },

  delete(userId) {
    const users = this.getAll().filter(user => user.id !== userId);
    this.save(users);
  },

  createOrUpdate(userData) {
    const users = this.getAll();
    const existing = this.findByField('username', userData.username);
    
    if (existing) {
      Object.assign(existing, userData);
      this.save(users);
      return existing;
    } else {
      const newUser = {
        id: this.generateId(),
        ...userData
      };
      users.push(newUser);
      this.save(users);
      return newUser;
    }
  }
};

// ============================================================================
// SEED DEMO DATA
// ============================================================================

function seedDemoData() {
  if (UserManager.getAll().length > 0) return;

  const demoUsers = [
    {
      id: UserManager.generateId(),
      role: 'admin',
      fullName: 'Site Admin',
      username: 'admin',
      password: 'admin123'
    },
    {
      id: UserManager.generateId(),
      role: 'caregiver',
      fullName: 'Caregiver One',
      username: 'caregiver',
      password: 'password123'
    },
    {
      id: UserManager.generateId(),
      role: 'patient',
      fullName: 'Patrick Tobe',
      username: 'ptobe',
      password: 'patient123',
      mrn: '00298371',
      dob: '2005-07-22',
      blood: 'O+',
      allergies: 'Penicillin',
      meds: [
        'Loratadine 10 mg — Take 1 tablet daily · 30 tabs · 2 refills',
        'Metformin 500 mg — Take 1 tablet twice daily'
      ]
    }
  ];

  UserManager.save(demoUsers);
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

const Auth = {
  checkPageAccess() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    // Public pages that don't require auth
    const publicPages = ['index.html', 'caregiver-login.html', 'patient-login.html', 'admin-login.html', '404.html', ''];
    
    // If no filename or it's a public page, allow access
    if (!filename || publicPages.includes(filename) || filename === path) {
      return;
    }

    // Check admin access
    if (filename === 'admin.html') {
      if (storage.get(KEYS.adminLogged) !== '1') {
        window.location.href = '404.html';
      }
      return;
    }

    // Check role-based access for other protected pages
    const userId = storage.get(KEYS.currentUser);
    const user = UserManager.findById(userId);

    if (filename === 'caregiver.html' && (!user || user.role !== 'caregiver')) {
      window.location.href = '404.html';
    }

    if (filename === 'patient.html' && (!user || user.role !== 'patient')) {
      window.location.href = '404.html';
    }
  },

  logout() {
    storage.remove(KEYS.currentUser);
    storage.remove(KEYS.currentPatient);
    storage.remove(KEYS.adminLogged);
    window.location.href = 'index.html';
  }
};

// ============================================================================
// MESSAGING SYSTEM
// ============================================================================

const Messaging = {
  getMessages(userId) {
    return storage.getJSON(KEYS.messagesPrefix + userId);
  },

  saveMessages(userId, messages) {
    storage.setJSON(KEYS.messagesPrefix + userId, messages);
  },

  addMessage(userId, sender, text) {
    const messages = this.getMessages(userId);
    messages.push({
      sender,
      text,
      timestamp: new Date().toISOString()
    });
    this.saveMessages(userId, messages);
  },

  renderMessages(userId, containerId) {
    const container = $(containerId);
    if (!container) return;

    const messages = this.getMessages(userId);
    
    if (messages.length === 0) {
      container.innerHTML = '<div class="chat-empty">No messages yet.</div>';
      return;
    }

    container.innerHTML = messages.slice().reverse().map(msg => `
      <div class="list__row">
        <div>
          <div class="list__title">${msg.sender === 'caregiver' ? 'Caregiver' : 'Patient'}</div>
          <div class="list__meta">${formatTimestamp(msg.timestamp)}</div>
        </div>
        <div>${escapeHTML(msg.text)}</div>
      </div>
    `).join('');
  }
};

// ============================================================================
// ISSUE REPORTING SYSTEM
// ============================================================================

const IssueSystem = {
  getIssues(userId) {
    return storage.getJSON(KEYS.issuesPrefix + userId);
  },

  saveIssues(userId, issues) {
    storage.setJSON(KEYS.issuesPrefix + userId, issues);
  },

  addIssue(userId, reporter, text) {
    const issues = this.getIssues(userId);
    issues.push({
      reporter,
      text,
      timestamp: new Date().toISOString()
    });
    this.saveIssues(userId, issues);
  },

  renderIssues(userId, containerId) {
    const container = $(containerId);
    if (!container) return;

    const issues = this.getIssues(userId);
    
    if (issues.length === 0) {
      container.innerHTML = '<div class="chat-empty">No issues reported.</div>';
      return;
    }

    container.innerHTML = issues.slice().reverse().map(issue => `
      <div class="list__row">
        <div>
          <div class="list__title">Issue</div>
          <div class="list__meta">${formatTimestamp(issue.timestamp)}</div>
        </div>
        <div>${escapeHTML(issue.text)}</div>
      </div>
    `).join('');
  }
};

// ============================================================================
// ADMIN TICKET SYSTEM
// ============================================================================

const TicketSystem = {
  getAll() {
    const tickets = storage.getJSON(KEYS.adminTickets);
    console.log('TicketSystem.getAll() returned:', tickets);
    return tickets;
  },

  save(tickets) {
    console.log('TicketSystem.save() saving:', tickets);
    storage.setJSON(KEYS.adminTickets, tickets);
  },

  add(ticketData) {
    console.log('TicketSystem.add() called with:', ticketData);
    const tickets = this.getAll();
    const newTicket = {
      id: 't_' + Math.random().toString(36).substr(2, 9),
      ...ticketData,
      timestamp: new Date().toISOString(),
      resolved: false
    };
    console.log('Creating new ticket:', newTicket);
    tickets.push(newTicket);
    this.save(tickets);
    console.log('Ticket saved. Total tickets now:', tickets.length);
  },

  toggleResolved(ticketId) {
    const tickets = this.getAll();
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.resolved = !ticket.resolved;
      this.save(tickets);
    }
  },

  delete(ticketId) {
    const tickets = this.getAll().filter(t => t.id !== ticketId);
    this.save(tickets);
  },

  render() {
    const container = $('#adm-ticket-list');
    if (!container) {
      console.log('TicketSystem.render() - container #adm-ticket-list not found');
      return;
    }

    const tickets = this.getAll();
    console.log('TicketSystem.render() rendering', tickets.length, 'tickets');
    
    if (tickets.length === 0) {
      container.innerHTML = '<div class="chat-empty">No tickets yet.</div>';
      return;
    }

    container.innerHTML = tickets.slice().reverse().map(ticket => `
      <div class="list__row ${ticket.resolved ? 'resolved' : ''}">
        <div>
          <div class="list__title">${escapeHTML(ticket.fromCaregiverName || 'Caregiver')} → ${escapeHTML(ticket.patientName || '')}</div>
          <div class="list__meta">${formatTimestamp(ticket.timestamp)}</div>
        </div>
        <div>${escapeHTML(ticket.text)}</div>
        <div style="display:flex;gap:.4rem;margin-top:.35rem;">
          <button class="btn btn--ghost" data-ticket-resolve="${ticket.id}" title="Mark resolved">✓</button>
          <button class="btn btn--ghost" data-ticket-delete="${ticket.id}" title="Delete">🗑</button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    container.querySelectorAll('[data-ticket-resolve]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.toggleResolved(btn.dataset.ticketResolve);
        this.render();
      });
    });

    container.querySelectorAll('[data-ticket-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.delete(btn.dataset.ticketDelete);
        this.render();
      });
    });
  }
};

// ============================================================================
// GLOBAL UI CONTROLS
// ============================================================================

const GlobalUI = {
  init() {
    this.initFontSize();
    this.initThemeToggles();
    this.initLogoutButtons();
  },

  initFontSize() {
    $$('.text-size').forEach(btn => {
      btn.addEventListener('click', () => {
        const currentSize = parseFloat(storage.get(KEYS.fontSize) || '18');
        const newSize = btn.dataset.size === 'up' 
          ? Math.min(currentSize + 1, 24)
          : Math.max(currentSize - 1, 14);
        
        storage.set(KEYS.fontSize, String(newSize));
        document.documentElement.style.setProperty('--base-font', `${newSize}px`);
      });
    });

    // Apply saved font size
    const savedSize = storage.get(KEYS.fontSize);
    if (savedSize) {
      document.documentElement.style.setProperty('--base-font', `${savedSize}px`);
    }
  },

  initThemeToggles() {
    const darkToggle = $('#dark-toggle');
    const contrastToggle = $('#contrast-toggle');

    if (darkToggle) {
      darkToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        darkToggle.setAttribute('aria-pressed', isDark);
      });
    }

    if (contrastToggle) {
      contrastToggle.addEventListener('click', () => {
        const isHighContrast = document.body.classList.toggle('contrast');
        contrastToggle.setAttribute('aria-pressed', isHighContrast);
      });
    }
  },

  initLogoutButtons() {
    $$('[data-logout]').forEach(btn => {
      btn.addEventListener('click', () => Auth.logout());
    });
  }
};

// ============================================================================
// LOGIN PAGES
// ============================================================================

const LoginPages = {
  initAdminLogin() {
    const form = $('#admin-login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const username = $('#ad-user')?.value.trim() || '';
      const password = $('#ad-pass')?.value.trim() || '';

      const admin = UserManager.getAll().find(user => 
        user.role === 'admin' && 
        user.username === username && 
        user.password === password
      );

      if (admin) {
        storage.set(KEYS.adminLogged, '1');
        window.location.href = 'admin.html';
      } else {
        this.showError('Invalid admin credentials.');
      }
    });
  },

  initCaregiverLogin() {
    const form = $('#cg-login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const username = $('#cg-user')?.value.trim() || '';
      const password = $('#cg-pass')?.value.trim() || '';

      const caregivers = UserManager.findByRole('caregiver');
      const caregiver = caregivers.find(user => 
        user.username === username && user.password === password
      );

      if (caregiver) {
        storage.set(KEYS.currentUser, caregiver.id);
        window.location.href = 'caregiver.html';
      } else {
        this.showError('Invalid caregiver credentials.');
      }
    });
  },

  initPatientLogin() {
    const form = $('#pt-login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const username = $('#pt-user')?.value.trim() || '';
      const password = $('#pt-pass')?.value.trim() || '';

      const patients = UserManager.findByRole('patient');
      const patient = patients.find(user => 
        user.username === username && user.password === password
      );

      if (patient) {
        storage.set(KEYS.currentUser, patient.id);
        storage.set(KEYS.currentPatient, patient.id);
        window.location.href = 'patient.html';
      } else {
        this.showError('Invalid patient credentials.');
      }
    });
  },

  showError(message) {
    const statusEl = $('#login-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.display = 'block';
    }
  }
};

// ============================================================================
// ADMIN PAGE
// ============================================================================

const AdminPage = {
  init() {
    const form = $('#user-form');
    if (!form) return; // Not on admin page
    
    if (storage.get(KEYS.adminLogged) !== '1') {
      window.location.href = '404.html';
      return;
    }

    this.initUserForm();
    this.initTicketPanel();
    this.renderUserList();
    this.renderRoleSummary();
  },

  initUserForm() {
    const form = $('#user-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const role = $('#role').value;
      const fullName = $('#fullName').value.trim();
      const username = $('#username').value.trim();
      const password = $('#password').value.trim();

      if (!fullName || !username) {
        alert('Please provide full name and username.');
        return;
      }

      if (!password) {
        alert('Please provide a password.');
        return;
      }

      const userData = {
        role,
        fullName,
        username,
        password
      };

      if (role === 'patient') {
        Object.assign(userData, {
          mrn: '',
          dob: '',
          blood: '',
          allergies: '',
          meds: []
        });
      }

      UserManager.createOrUpdate(userData);
      form.reset();
      alert('User saved successfully.');
      this.renderUserList();
      this.renderRoleSummary();
    });
  },

  renderUserList() {
    const container = $('#user-list');
    if (!container) return;

    const users = UserManager.getAll();
    container.innerHTML = '';

    users.forEach(user => {
      const row = document.createElement('div');
      row.className = 'list__row';
      row.innerHTML = `
        <div>
          <div class="list__title">${user.fullName} <span class="pill">${user.role}</span></div>
          <div class="list__meta">username: ${user.username || '(none)'}</div>
        </div>
        <div style="display:flex; gap:.4rem;">
          <button class="btn" data-edit="${user.id}">Edit</button>
          <button class="btn btn--ghost" data-delete="${user.id}">Delete</button>
        </div>
      `;
      container.appendChild(row);
    });

    // Attach event listeners
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        UserManager.delete(btn.dataset.delete);
        this.renderUserList();
        this.renderRoleSummary();
      });
    });

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = UserManager.findById(btn.dataset.edit);
        $('#role').value = user.role;
        $('#fullName').value = user.fullName || '';
        $('#username').value = user.username || '';
        $('#password').value = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  },

  renderRoleSummary() {
    const container = $('#role-summary');
    if (!container) return;

    const users = UserManager.getAll();
    const admin = users.find(u => u.role === 'admin');
    const caregiver = users.find(u => u.role === 'caregiver');
    const patient = users.find(u => u.role === 'patient');

    const chip = (label, value) => `
      <span class="pill" style="font-size:.85rem;">${label}</span>
      <span class="pill" style="background:var(--surface);border:1px solid var(--border);">${value}</span>
    `;

    const parts = [];
    if (admin) parts.push(chip('Site Admin', admin.username));
    if (caregiver) parts.push(chip('Caregiver', caregiver.username));
    if (patient) parts.push(chip('Patient', patient.fullName));

    container.innerHTML = parts.join('');
  },

  initTicketPanel() {
    const toggle = $('#adm-ticket-toggle');
    const panel = $('#adm-ticket-panel');
    
    if (!toggle || !panel) {
      console.log('Ticket panel elements not found');
      return;
    }

    console.log('Initializing ticket panel');

    toggle.addEventListener('click', () => {
      console.log('Ticket toggle clicked');
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        console.log('Panel opened, rendering tickets');
        TicketSystem.render();
      }
    });
  }
};

// ============================================================================
// CAREGIVER PAGE
// ============================================================================

const CaregiverPage = {
  init() {
    const selector = $('#patient-select');
    if (!selector) return; // Not on caregiver page
    
    const currentUser = UserManager.findById(storage.get(KEYS.currentUser));
    if (!currentUser || currentUser.role !== 'caregiver') {
      window.location.href = '404.html';
      return;
    }

    this.initPatientSelector();
    this.initPatientForm();
    this.initMedicationManagement();
    this.initChatPanel();
    this.initIssuePanel();
  },

  initPatientSelector() {
    const selector = $('#patient-select');
    if (!selector) return;

    const patients = UserManager.findByRole('patient');
    selector.innerHTML = patients.map(p => 
      `<option value="${p.id}">${p.fullName}</option>`
    ).join('');

    const lastPatientId = storage.get(KEYS.currentPatient);
    if (lastPatientId && UserManager.findById(lastPatientId)) {
      selector.value = lastPatientId;
    } else if (patients[0]) {
      selector.value = patients[0].id;
    }

    selector.addEventListener('change', () => {
      this.loadPatientData(selector.value);
    });

    if (selector.value) {
      this.loadPatientData(selector.value);
    }
  },

  loadPatientData(patientId) {
    const patient = UserManager.findById(patientId);
    if (!patient) return;

    storage.set(KEYS.currentPatient, patientId);

    // Update UI
    const initials = patient.fullName.split(/\s+/).slice(0, 2)
      .map(s => s[0]?.toUpperCase() || '').join('');
    
    if ($('#patient-initials')) $('#patient-initials').textContent = initials;
    if ($('#f-name')) $('#f-name').value = patient.fullName || '';
    if ($('#f-mrn')) $('#f-mrn').value = patient.mrn || '';
    if ($('#f-dob')) $('#f-dob').value = patient.dob || '';
    if ($('#f-blood')) $('#f-blood').value = patient.blood || '';
    if ($('#f-allergies')) $('#f-allergies').value = patient.allergies || '';
    if ($('#f-meds')) $('#f-meds').value = (patient.meds || []).join('\n');

    this.renderMedicationList();
  },

  initPatientForm() {
    const saveBtn = $('#save-patient');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', () => {
      const patientId = storage.get(KEYS.currentPatient);
      const patient = UserManager.findById(patientId);
      if (!patient) return;

      patient.fullName = $('#f-name').value.trim();
      patient.mrn = $('#f-mrn').value.trim();
      patient.dob = $('#f-dob').value.trim();
      patient.blood = $('#f-blood').value.trim();
      patient.allergies = $('#f-allergies').value.trim();
      patient.meds = $('#f-meds').value.split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      UserManager.update(patient);
      alert('Patient information saved.');
    });
  },

  initMedicationManagement() {
    const addBtn = $('#med-add');
    const medsTextarea = $('#f-meds');
    
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
      const name = $('#med-name')?.value.trim();
      if (!name) return;

      const strength = $('#med-strength')?.value.trim();
      const unit = $('#med-unit')?.value.trim();
      const form = $('#med-form')?.value || 'tablet';
      const directions = $('#med-directions')?.value.trim();
      const quantity = $('#med-qty')?.value.trim();
      const refills = $('#med-refills')?.value.trim();
      const notes = $('#med-notes')?.value.trim();

      // Build medication string
      const namePart = [name, strength && unit ? `${strength} ${unit}` : strength || unit]
        .filter(Boolean).join(' ');
      
      const detailParts = [];
      if (directions) detailParts.push(directions);
      if (quantity) {
        const qtyUnit = form === 'liquid' ? 'mL' : form === 'inhaler' ? 'puffs' : 'tabs';
        detailParts.push(`${quantity} ${qtyUnit}`);
      }
      if (refills) detailParts.push(`${refills} refill${refills === '1' ? '' : 's'}`);
      if (notes) detailParts.push(notes);

      const medString = `${namePart} — ${detailParts.join(' · ')}`;

      // Add to textarea
      const currentMeds = medsTextarea.value.split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      currentMeds.push(medString);
      medsTextarea.value = currentMeds.join('\n');

      // Clear form
      $('#med-name').value = '';
      $('#med-strength').value = '';
      $('#med-unit').value = '';
      $('#med-directions').value = '';
      $('#med-qty').value = '';
      $('#med-refills').value = '';
      $('#med-notes').value = '';

      this.renderMedicationList();
    });

    if (medsTextarea) {
      medsTextarea.addEventListener('input', () => this.renderMedicationList());
    }
  },

  renderMedicationList() {
    const container = $('#med-list-care');
    if (!container) return;

    const medsTextarea = $('#f-meds');
    const medications = medsTextarea.value.split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    container.innerHTML = medications.map((med, index) => {
      const parts = med.split(' — ');
      const name = parts[0] || '';
      const details = parts.slice(1).join(' — ');

      return `
        <li class="list__row">
          <div>
            <div class="list__title">${escapeHTML(name)}</div>
            <div class="list__meta">${escapeHTML(details)}</div>
          </div>
          <div>
            <button class="btn btn--ghost" data-remove-med="${index}">Remove</button>
          </div>
        </li>
      `;
    }).join('');

    // Attach remove listeners
    container.querySelectorAll('[data-remove-med]').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.removeMed);
        const meds = medsTextarea.value.split('\n')
          .map(s => s.trim())
          .filter(Boolean);
        meds.splice(index, 1);
        medsTextarea.value = meds.join('\n');
        this.renderMedicationList();
      });
    });
  },

  initChatPanel() {
    const panel = $('#chat-panel');
    const form = $('#chat-form');
    const input = $('#chat-input');
    const toggle = $('#chat-toggle');
    const patientSelect = $('#chat-patient-select');
    
    if (!panel || !form || !toggle || !patientSelect) return;

    const patients = UserManager.findByRole('patient');
    patientSelect.innerHTML = patients.map(p => 
      `<option value="${p.id}">${p.fullName}</option>`
    ).join('');

    const lastPatientId = storage.get(KEYS.currentPatient);
    if (lastPatientId) {
      patientSelect.value = lastPatientId;
    } else if (patients[0]) {
      patientSelect.value = patients[0].id;
    }

    const refreshChat = () => {
      Messaging.renderMessages(patientSelect.value, '#chat-list');
    };

    toggle.addEventListener('click', () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        refreshChat();
      }
    });

    patientSelect.addEventListener('change', refreshChat);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const patientId = patientSelect.value;
      Messaging.addMessage(patientId, 'caregiver', text);
      
      input.value = '';
      refreshChat();
    });
  },

  initIssuePanel() {
    const panel = $('#issue-panel');
    const form = $('#issue-form');
    const input = $('#issue-input');
    const toggleFab = $('#issue-toggle-fab');
    const toggleSide = $('#issue-toggle');
    
    if (!panel || !form) return;

    const refreshIssues = () => {
      const patientId = storage.get(KEYS.currentPatient);
      IssueSystem.renderIssues(patientId, '#issue-list');
    };

    const togglePanel = () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        refreshIssues();
      }
    };

    if (toggleFab) toggleFab.addEventListener('click', togglePanel);
    if (toggleSide) toggleSide.addEventListener('click', togglePanel);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const patientId = storage.get(KEYS.currentPatient);
      IssueSystem.addIssue(patientId, 'caregiver', text);
      
      // Send ticket to admin
      const caregiver = UserManager.findById(storage.get(KEYS.currentUser));
      const patient = UserManager.findById(patientId);
      
      console.log('Creating ticket from issue panel');
      console.log('Caregiver:', caregiver);
      console.log('Patient:', patient);
      console.log('Text:', text);
      
      TicketSystem.add({
        fromCaregiverId: caregiver?.id,
        fromCaregiverName: caregiver?.fullName || 'Caregiver',
        patientId: patient?.id,
        patientName: patient?.fullName || '',
        text: text
      });
      
      input.value = '';
      refreshIssues();
      alert('Issue reported to administrator.');
    });
  }
};

// ============================================================================
// PATIENT PAGE
// ============================================================================

const PatientPage = {
  init() {
    const patientName = $('#patient-name');
    if (!patientName) return; // Not on patient page
    
    const currentUser = UserManager.findById(storage.get(KEYS.currentUser));
    if (!currentUser || currentUser.role !== 'patient') {
      window.location.href = '404.html';
      return;
    }

    storage.set(KEYS.currentPatient, currentUser.id);
    this.loadPatientInfo(currentUser);
    this.renderMedications(currentUser);
    this.initChatPanel(currentUser);
  },

  loadPatientInfo(patient) {
    const initials = patient.fullName.split(/\s+/).slice(0, 2)
      .map(s => s[0]?.toUpperCase() || '').join('');

    if ($('#patient-name')) $('#patient-name').textContent = patient.fullName;
    if ($('#patient-initials')) $('#patient-initials').textContent = initials;
    
    const metaText = `MRN: ${patient.mrn || '—'} · DOB: ${patient.dob || '—'} · Blood Type: ${patient.blood || '—'}`;
    if ($('#patient-meta')) $('#patient-meta').textContent = metaText;
    
    if ($('#patient-alerts')) {
      $('#patient-alerts').innerHTML = patient.allergies 
        ? `<span class="pill pill--alert">Allergy: ${escapeHTML(patient.allergies)}</span>` 
        : '';
    }
  },

  renderMedications(patient) {
    const container = $('#med-list');
    if (!container) return;

    const medications = patient.meds || [];
    
    if (medications.length === 0) {
      container.innerHTML = '<li class="list__row"><div>No medications on file.</div></li>';
      return;
    }

    container.innerHTML = medications.map(med => {
      const parts = med.split(' — ');
      const name = parts[0] || '';
      const details = parts.slice(1).join(' — ');

      return `
        <li class="list__row">
          <div>
            <div class="list__title">${escapeHTML(name)}</div>
            <div class="list__meta">${escapeHTML(details)}</div>
          </div>
        </li>
      `;
    }).join('');
  },

  initChatPanel(patient) {
    const panel = $('#chat-panel');
    const form = $('#chat-form');
    const input = $('#chat-input');
    const toggle = $('#chat-toggle');
    
    if (!panel || !form || !toggle) return;

    const refreshChat = () => {
      Messaging.renderMessages(patient.id, '#chat-list');
    };

    toggle.addEventListener('click', () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        refreshChat();
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      Messaging.addMessage(patient.id, 'patient', text);
      input.value = '';
      refreshChat();
    });
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return (text || '').replace(/[&<>"']/g, char => map[char]);
}

function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('Application initializing...');
  
  // Seed demo data if needed
  seedDemoData();
  
  // Check authentication and page access
  Auth.checkPageAccess();
  
  // Initialize global UI controls (runs on all pages)
  GlobalUI.init();
  
  // Get current page to determine which initialization to run
  const path = window.location.pathname;
  console.log('Current path:', path);
  
  // Initialize page-specific functionality based on current page
  if (path.includes('admin-login.html')) {
    console.log('Initializing admin login page');
    LoginPages.initAdminLogin();
  } else if (path.includes('caregiver-login.html')) {
    console.log('Initializing caregiver login page');
    LoginPages.initCaregiverLogin();
  } else if (path.includes('patient-login.html')) {
    console.log('Initializing patient login page');
    LoginPages.initPatientLogin();
  } else if (path.includes('admin.html')) {
    console.log('Initializing admin page');
    AdminPage.init();
  } else if (path.includes('caregiver.html')) {
    console.log('Initializing caregiver page');
    CaregiverPage.init();
  } else if (path.includes('patient.html')) {
    console.log('Initializing patient page');
    PatientPage.init();
  }
  
  console.log('Application initialization complete');
});