/* ===== Storage Keys ===== */
const K = {
  font:'mh_font_size', contrast:'mh_contrast', dark:'mh_dark',
  users:'mh_users_v1',
  currentUserId:'mh_current_user',       // whoever is logged in
  currentPatientId:'mh_current_patient', // active patient (for caregiver view)
  adminLogged:'mh_admin_logged',         // '1' if admin authed
  msgsPrefix:'mh_msgs_'                  // + patientId
};

/* ===== Helpers ===== */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const get = k => localStorage.getItem(k);
const set = (k,v) => localStorage.setItem(k,v);
const jget = k => JSON.parse(get(k) || 'null');
const jset = (k,v) => set(k, JSON.stringify(v));
const uid  = () => 'u_' + Math.random().toString(36).slice(2,10);
const goHome = () => location.href = 'index.html';

/* ===== Seed demo data (runs once) ===== */
function seedIfNeeded(){
  if (jget(K.users)) return;
  const admin = { id:uid(), role:'admin', fullName:'Administrator', username:'admin', password:'admin123', accessCode:'0000' };
  const cg    = { id:uid(), role:'caregiver', fullName:'Care Team', username:'caregiver', password:'password123', accessCode:'9999' };
  const p1    = { id:uid(), role:'patient', fullName:'Patrick Tobe', username:'ptobe', password:'patient123', accessCode:'2468',
                  mrn:'00298371', dob:'2005-07-22', blood:'O+', allergies:'Penicillin',
                  meds:['Loratadine 10 mg — Take 1 tablet daily · 30 tabs · 2 refills',
                        'Metformin 500 mg — 1 tablet twice daily with meals · 60 tabs · 0 refills'] };
  const p2    = { id:uid(), role:'patient', fullName:'Maya Nguyen', username:'mnguyen', password:'patient123', accessCode:'1357',
                  mrn:'00411234', dob:'1999-05-10', blood:'A+', allergies:'None', meds:['Vitamin D 1000 IU — daily'] };
  jset(K.users, [admin, cg, p1, p2]);
}
seedIfNeeded();

/* ===== UI toggles ===== */
document.addEventListener('DOMContentLoaded', () => {
  initTextSize(); initContrast(); initDark();
  bindGlobalLogout();

  const page = document.body.dataset.page;
  if (page === 'home')            {/* landing has no extra JS */}
  if (page === 'login-caregiver') initCaregiverLogin();
  if (page === 'login-patient')   initPatientLogin();
  if (page === 'login-admin')     initAdminLogin();
  if (page === 'admin')           initAdmin();
  if (page === 'caregiver')       initCaregiver();
  if (page === 'patient')         initPatient();
});

function initTextSize(){
  const saved = get(K.font); if (saved) document.documentElement.style.setProperty('--base-font', saved);
  document.addEventListener('click', (e)=>{
    if (!e.target.classList.contains('text-size')) return;
    const dir = e.target.dataset.size;
    const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--base-font'));
    const next = Math.max(16, Math.min(22, cur + (dir==='up'?2:-2)));
    const val = `${next}px`; document.documentElement.style.setProperty('--base-font',val); set(K.font,val);
  });
}
function initContrast(){
  const btn=$('#contrast-toggle'); if (get(K.contrast)==='1'){ document.body.classList.add('contrast'); btn?.setAttribute('aria-pressed','true'); }
  btn?.addEventListener('click',()=>{ document.body.classList.toggle('contrast'); const on=document.body.classList.contains('contrast');
    set(K.contrast,on?'1':'0'); btn.setAttribute('aria-pressed',on?'true':'false'); btn.textContent=on?'Contrast: On':'Contrast'; });
}
function initDark(){
  const btn=$('#dark-toggle'); if (get(K.dark)==='1'){ document.body.classList.add('dark'); btn?.setAttribute('aria-pressed','true'); btn.textContent='Dark: On'; }
  btn?.addEventListener('click',()=>{ document.body.classList.toggle('dark'); const on=document.body.classList.contains('dark');
    set(K.dark,on?'1':'0'); btn.setAttribute('aria-pressed',on?'true':'false'); btn.textContent=on?'Dark: On':'Dark'; });
}

/* ===== Users store ===== */
function loadUsers(){ return jget(K.users) || []; }
function saveUsers(arr){ jset(K.users, arr); }
function findUserById(id){ return loadUsers().find(u=>u.id===id); }
function findUsersByRole(role){ return loadUsers().filter(u=>u.role===role); }
function findUserBy(field, value){ return loadUsers().find(u => (u[field]||'').toLowerCase?.() === (value||'').toLowerCase?.()); }

/* ===== Global logout (returns to home) ===== */
function bindGlobalLogout(){
  document.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-logout]');
    if (!t) return;
    localStorage.removeItem(K.currentUserId);
    localStorage.removeItem(K.currentPatientId);
    localStorage.removeItem(K.adminLogged);
    goHome();
  });
}

/* ===== Messaging (per patient) ===== */
function msgsKey(pid){ return K.msgsPrefix + pid; }
function getMsgs(pid){ return jget(msgsKey(pid)) || []; }
function addMsg(pid, from, text){
  const arr = getMsgs(pid);
  arr.push({id:Date.now(), from, text:text.trim(), ts:new Date().toISOString()});
  jset(msgsKey(pid), arr);
}
function renderMsgs(pid, container){
  const el = typeof container==='string' ? $(container) : container;
  const list = getMsgs(pid);
  el.innerHTML = '';
  if (!list.length){ el.innerHTML = '<div class="list__row"><span class="muted">No messages yet.</span></div>'; return; }
  list.forEach(m=>{
    const li=document.createElement('div'); li.className='list__row';
    const who = m.from==='caregiver'?'Care Team':'Patient';
    const when = new Date(m.ts).toLocaleString();
    li.innerHTML=`<div><div class="list__title">${who}</div><div class="list__meta">${when}</div><p style="margin:.3rem 0 0">${escapeHTML(m.text)}</p></div><span class="pill">${m.from}</span>`;
    el.appendChild(li);
  });
}

/* ===== Admin login ===== */
function initAdminLogin(){
  const form = $('#admin-login-form'); const status = $('#login-status');
  form?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const u=$('#ad-user').value.trim(), p=$('#ad-pass').value.trim(), c=$('#ad-code').value.trim();
    const admins = findUsersByRole('admin');
    const byCred = admins.find(x => (x.username===u && x.password===p) && u);
    const byCode = admins.find(x => x.accessCode && x.accessCode===c);
    if (byCred || byCode){ set(K.adminLogged,'1'); status.textContent='Welcome, admin. Redirecting…'; setTimeout(()=>location.href='admin.html',300); }
    else status.textContent='Invalid admin credentials or code.';
  });
}

/* ===== Caregiver login ===== */
function initCaregiverLogin(){
  const form = $('#cg-login-form'); const status = $('#login-status');
  form?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const u=$('#cg-user').value.trim(), p=$('#cg-pass').value.trim(), code=$('#cg-code').value.trim();
    const cgs = findUsersByRole('caregiver');
    const byCred = cgs.find(x => (x.username===u && x.password===p) && u);
    const byCode = cgs.find(x => x.accessCode && x.accessCode===code);
    const user = byCred || byCode;
    if (user){ set(K.currentUserId, user.id); location.href='caregiver.html'; }
    else status.textContent='Invalid caregiver credentials or code.';
  });
}

/* ===== Patient login ===== */
function initPatientLogin(){
  const form = $('#pt-login-form'); const status = $('#login-status');
  form?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const u=$('#pt-user').value.trim(), p=$('#pt-pass').value.trim(), code=$('#pt-code').value.trim();
    const pts = findUsersByRole('patient');
    const byCred = pts.find(x => (x.username===u && x.password===p) && u);
    const byCode = pts.find(x => x.accessCode && x.accessCode===code);
    const user = byCred || byCode;
    if (user){ set(K.currentUserId, user.id); set(K.currentPatientId, user.id); location.href='patient.html'; }
    else status.textContent='Invalid patient credentials or access code.';
  });
}

/* ===== Admin (user management) ===== */
function initAdmin(){
  if (get(K.adminLogged) !== '1'){ location.href='admin-login.html'; return; }
  const form = $('#user-form'); const list = $('#user-list');
  renderUserList();

  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    const role=$('#role').value, fullName=$('#fullName').value.trim(),
          username=$('#username').value.trim(), password=$('#password').value.trim(),
          accessCode=$('#accessCode').value.trim();
    if (!fullName || !username) return;
    const users = loadUsers();
    let existing = findUserBy('username', username);
    if (existing){
      existing.role=role; existing.fullName=fullName;
      if (password) existing.password=password;
      if (accessCode) existing.accessCode=accessCode;
      if (role==='patient'){ existing.mrn ??=''; existing.dob ??=''; existing.blood ??=''; existing.allergies ??=''; existing.meds ??=[]; }
    }else{
      const u = { id:uid(), role, fullName, username, password, accessCode };
      if (role==='patient'){ Object.assign(u,{mrn:'',dob:'',blood:'',allergies:'',meds:[]}); }
      users.push(u);
    }
    saveUsers(users);
    form.reset(); renderUserList();
  });

  function renderUserList(){
    const users = loadUsers();
    list.innerHTML='';
    users.forEach(u=>{
      const row=document.createElement('div'); row.className='list__row';
      row.innerHTML=`
        <div>
          <div class="list__title">${u.fullName} <span class="pill">${u.role}</span></div>
          <div class="list__meta">user: ${u.username || '(none)'} ${u.accessCode? '· code: '+u.accessCode : ''}</div>
        </div>
        <div style="display:flex; gap:.4rem;">
          <button class="btn" data-edit="${u.id}">Edit</button>
          <button class="btn btn--ghost" data-del="${u.id}">Delete</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll('[data-del]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id=b.dataset.del;
        const users = loadUsers().filter(x=>x.id!==id);
        saveUsers(users); renderUserList();
      });
    });

    list.querySelectorAll('[data-edit]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const u = findUserById(b.dataset.edit);
        $('#role').value=u.role; $('#fullName').value=u.fullName||''; $('#username').value=u.username||'';
        $('#password').value=u.password||''; $('#accessCode').value=u.accessCode||'';
        window.scrollTo({top:0,behavior:'smooth'});
      });
    });
  }
}

/* ===== Caregiver (select patient, edit & message) ===== */
function initCaregiver(){
  const me = findUserById(get(K.currentUserId));
  if (!me || me.role!=='caregiver'){ location.href='login.html'; return; }

  const sel = $('#patient-select');
  const pts = findUsersByRole('patient');
  sel.innerHTML = pts.map(p=>`<option value="${p.id}">${p.fullName}</option>`).join('');
  const last = get(K.currentPatientId) && findUserById(get(K.currentPatientId));
  sel.value = last?.id || pts[0]?.id || '';

  function loadPatientToForm(p){
    set(K.currentPatientId, p.id);
    $('#patient-name').textContent = p.fullName;
    $('#patient-initials').textContent = p.fullName.split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join('');
    $('#f-name').value = p.fullName||'';
    $('#f-mrn').value  = p.mrn||'';
    $('#f-dob').value  = p.dob||'';
    $('#f-blood').value= p.blood||'';
    $('#f-allergies').value = p.allergies||'';
    $('#f-access').value = p.accessCode||'';
    $('#f-meds').value = (p.meds||[]).join('\n');
    renderMsgs(p.id, '#msg-list');
  }

  sel.addEventListener('change', ()=> loadPatientToForm(findUserById(sel.value)));
  if (sel.value) loadPatientToForm(findUserById(sel.value));

  $('#save-patient').addEventListener('click', ()=>{
    const id = get(K.currentPatientId); const u = findUserById(id); if (!u) return;
    u.fullName = $('#f-name').value.trim();
    u.mrn  = $('#f-mrn').value.trim();
    u.dob  = $('#f-dob').value.trim();
    u.blood= $('#f-blood').value.trim();
    u.allergies = $('#f-allergies').value.trim();
    u.accessCode = $('#f-access').value.trim();
    u.meds = $('#f-meds').value.split('\n').map(s=>s.trim()).filter(Boolean);
    saveUsers(loadUsers().map(x=>x.id===u.id?u:x));
    alert('Saved.');
    loadPatientToForm(u);
  });

  $('#push-to-patient').addEventListener('click', ()=> alert('Changes will appear on the patient page on this device.'));

  $('#msg-form-care').addEventListener('submit', (e)=>{
    e.preventDefault();
    const id = get(K.currentPatientId); const ta = $('#msg-care'); const txt=(ta.value||'').trim();
    if (!txt) return;
    addMsg(id, 'caregiver', txt); ta.value=''; renderMsgs(id, '#msg-list');
  });
}

/* ===== Patient (loads current patient’s own data) ===== */
function initPatient(){
  const me = findUserById(get(K.currentUserId));
  if (!me || me.role!=='patient'){ location.href='patient-login.html'; return; }
  set(K.currentPatientId, me.id);

  $('#patient-name').textContent = me.fullName;
  $('#patient-initials').textContent = me.fullName.split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join('');
  $('#patient-meta').textContent = `MRN: ${me.mrn||'—'} · DOB: ${me.dob||'—'} · Blood Type: ${me.blood||'—'}`;
  $('#patient-alerts').innerHTML = me.allergies ? `<span class="pill pill--alert">Allergy: ${escapeHTML(me.allergies)}</span>` : '';

  const ul = $('#med-list');
  ul.innerHTML = (me.meds||[]).map(m=>`<li class="list__row"><div><div class="list__title">${escapeHTML(m.split(' — ')[0])}</div><div class="list__meta">${escapeHTML(m.split(' — ')[1]||'')}</div></div></li>`).join('');

  renderMsgs(me.id, '#msg-list');

  $('#msg-form-patient').addEventListener('submit', (e)=>{
    e.preventDefault();
    const ta = $('#msg-patient'); const txt=(ta.value||'').trim();
    if (!txt) return;
    addMsg(me.id,'patient',txt); ta.value=''; renderMsgs(me.id, '#msg-list');
  });
}

/* ===== Utils ===== */
function escapeHTML(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c])); }
