/* ===========================
   Core keys / tiny helpers
   =========================== */
const K = {
  font:'mh_font_size', contrast:'mh_contrast', dark:'mh_dark',
  users:'mh_users_v1',
  currentUserId:'mh_current_user',
  currentPatientId:'mh_current_patient',
  adminLogged:'mh_admin_logged',
  msgsPrefix:'mh_msgs_',
  issuesPrefix:'mh_issues_',
  adminTickets:'mh_admin_tickets'
};

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const get = k => localStorage.getItem(k) || '';
const set = (k,v) => localStorage.setItem(k, v);
const del = k => localStorage.removeItem(k);

/* ===========================
   Seed demo data (no wipe)
   =========================== */
function loadUsers(){ try{ return JSON.parse(localStorage.getItem(K.users)||'[]'); }catch{return[]} }
function saveUsers(u){ localStorage.setItem(K.users, JSON.stringify(u)); }
function uid(){ return 'u_'+Math.random().toString(36).slice(2,9); }
function findUsersByRole(role){ return loadUsers().filter(x=>x.role===role); }
function findUserById(id){ return loadUsers().find(x=>x.id===id); }
function findUserBy(field,val){ return loadUsers().find(x=>x[field]===val); }

function seedDemo(){
  if (loadUsers().length) return;
  saveUsers([
    { id:uid(), role:'admin',     fullName:'Site Admin',    username:'admin',     password:'admin123',     accessCode:'1000' },
    { id:uid(), role:'caregiver', fullName:'Caregiver One', username:'caregiver', password:'password123',  accessCode:'0000' },
    { id:uid(), role:'patient',   fullName:'Patrick Tobe',  username:'ptobe',     password:'patient123',   accessCode:'0000',
      mrn:'00298371', dob:'2005-07-22', blood:'O+', allergies:'Penicillin',
      meds:[
        'Loratadine 10 mg — Take 1 tablet daily · 30 tabs · 2 refills',
        'Metformin 500 mg — Take 1 tablet twice daily'
      ]
    }
  ]);
}

/* ===========================
   Chat & Issues
   =========================== */
function loadMsgs(userId){ try{ return JSON.parse(localStorage.getItem(K.msgsPrefix+userId)||'[]'); }catch{return[]} }
function saveMsgs(userId, msgs){ localStorage.setItem(K.msgsPrefix+userId, JSON.stringify(msgs)); }
function addMsg(userId, who, text){
  const msgs = loadMsgs(userId);
  msgs.push({who, text, at: new Date().toISOString()});
  saveMsgs(userId, msgs);
}
function renderMsgs(userId, containerSel){
  const el = $(containerSel); if (!el) return;
  const msgs = loadMsgs(userId);
  if (!msgs.length){ el.innerHTML = '<div class="chat-empty">No messages yet.</div>'; return; }
  el.innerHTML = msgs.slice().reverse().map(m=>`
    <div class="list__row">
      <div>
        <div class="list__title">${m.who==='caregiver'?'Caregiver':'Patient'}</div>
        <div class="list__meta">${fmtWhen(m.at)}</div>
      </div>
      <div>${escapeHTML(m.text||'')}</div>
    </div>`).join('');
}

function loadIssues(userId){ try{ return JSON.parse(localStorage.getItem(K.issuesPrefix+userId)||'[]'); }catch{return[]} }
function saveIssues(userId, items){ localStorage.setItem(K.issuesPrefix+userId, JSON.stringify(items)); }
function addIssue(userId, who, text){
  const items = loadIssues(userId);
  items.push({who, text, at: new Date().toISOString()});
  saveIssues(userId, items);
}
function renderIssues(userId, containerSel){
  const el = $(containerSel); if (!el) return;
  const items = loadIssues(userId);
  if (!items.length){ el.innerHTML = '<div class="chat-empty">No issues reported.</div>'; return; }
  el.innerHTML = items.slice().reverse().map(m=>`
    <div class="list__row">
      <div>
        <div class="list__title">Issue</div>
        <div class="list__meta">${fmtWhen(m.at)}</div>
      </div>
      <div>${escapeHTML(m.text||'')}</div>
    </div>`).join('');
}

/* ===========================
   Admin ticket inbox
   =========================== */
function loadAdminTickets(){ try{ return JSON.parse(localStorage.getItem(K.adminTickets)||'[]'); }catch{return[]} }
function saveAdminTickets(items){ localStorage.setItem(K.adminTickets, JSON.stringify(items)); }
function addAdminTicket({fromCaregiverId, fromCaregiverName, patientId, patientName, text}){
  const list = loadAdminTickets();
  list.push({
    id:'t_'+Math.random().toString(36).slice(2,9),
    fromCaregiverId, fromCaregiverName, patientId, patientName,
    text, at:new Date().toISOString(), done:false
  });
  saveAdminTickets(list);
}
function renderAdminTickets(){
  const el = $('#adm-ticket-list'); if (!el) return;
  const items = loadAdminTickets();
  if (!items.length){ el.innerHTML = '<div class="chat-empty">No tickets yet.</div>'; return; }
  el.innerHTML = items.slice().reverse().map(t=>`
    <div class="list__row ${t.done?'resolved':''}">
      <div>
        <div class="list__title">${escapeHTML(t.fromCaregiverName||'Caregiver')} → ${escapeHTML(t.patientName||'')}</div>
        <div class="list__meta">${fmtWhen(t.at)}</div>
      </div>
      <div>${escapeHTML(t.text||'')}</div>
      <div style="display:flex;gap:.4rem;margin-top:.35rem;">
        <button class="btn btn--ghost" data-ticket-res="${t.id}" title="Mark resolved">✓</button>
        <button class="btn btn--ghost" data-ticket-del="${t.id}" title="Delete">🗑</button>
      </div>
    </div>`).join('');

  el.querySelectorAll('[data-ticket-res]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id=b.dataset.ticketRes;
      const list=loadAdminTickets();
      const i=list.findIndex(x=>x.id===id);
      if (i>-1){ list[i].done=!list[i].done; saveAdminTickets(list); renderAdminTickets(); }
    });
  });
  el.querySelectorAll('[data-ticket-del]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id=b.dataset.ticketDel;
      const list=loadAdminTickets().filter(x=>x.id!==id);
      saveAdminTickets(list); renderAdminTickets();
    });
  });
}

/* ===========================
   Global UI toggles
   =========================== */
function initGlobal(){
  $$('.text-size').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cur=parseFloat(get(K.font)||'18');
      const next=btn.dataset.size==='up'?Math.min(cur+1,24):Math.max(cur-1,14);
      set(K.font,String(next));
      document.documentElement.style.setProperty('--base-font', `${next}px`);
    });
  });
  const savedFont=get(K.font);
  if (savedFont) document.documentElement.style.setProperty('--base-font', `${savedFont}px`);

  const dark=$('#dark-toggle'), hc=$('#contrast-toggle');
  dark?.addEventListener('click', ()=>{ const on=document.body.classList.toggle('dark'); dark.setAttribute('aria-pressed', on); });
  hc?.addEventListener('click',  ()=>{ const on=document.body.classList.toggle('contrast'); hc.setAttribute('aria-pressed', on); });

  // universal logout buttons
  $$('[data-logout]').forEach(b=> b.addEventListener('click', ()=>{
    del(K.currentUserId); del(K.currentPatientId); del(K.adminLogged);
    location.href='index.html';
  }));
}

/* ===========================
   Hardened login helpers
   =========================== */
function readLoginFields(pref) {
  const user = ($(`#${pref}-user`)||$('#user')||$('#username'))?.value?.trim()||'';
  const pass = ($(`#${pref}-pass`)||$('#pass')||$('#password'))?.value?.trim()||'';
  const code = ($(`#${pref}-code`)||$('#code')||$('#access')||$('#otp'))?.value?.trim()||'';
  return {user, pass, code};
}
function setStatus(msg){
  const s=$('#login-status'); if (s){ s.textContent=msg||''; s.style.visibility = msg ? 'visible' : 'hidden'; }
}

/* ---- Admin ---- */
function initAdminLogin(){
  const form = $('#admin-login-form'); if (!form) return;
  const go = (e)=>{
    e.preventDefault();
    const {user, pass, code} = readLoginFields('ad');
    const admin = loadUsers().find(x=> x.role==='admin' && (
      (user && pass && x.username===user && x.password===pass) || (code && x.accessCode===code)
    ));
    if (admin){
      setStatus('');
      set(K.adminLogged,'1');
      location.href='admin.html';
      return;
    }
    setStatus('Invalid admin credentials or access code.');
  };
  form.addEventListener('submit', go);
}

/* ---- Caregiver (your page title/login file is login.html) ---- */
function initCaregiverLogin(){
  // Bind either #cg-login-form or a generic #login-form on login.html
  const form = $('#cg-login-form') || $('#login-form');
  if (!form) return;

  const go = (e)=>{
    e.preventDefault();
    const {user, pass, code} = readLoginFields('cg');

    const caregivers = findUsersByRole('caregiver');
    const cg = (user && pass && caregivers.find(x=>x.username===user && x.password===pass)) 
            || (code && caregivers.find(x=>x.accessCode===code));

    if (cg){
      setStatus('');
      set(K.currentUserId, cg.id);
      // keep last selected patient if any
      location.href='caregiver.html';
      return;
    }
    setStatus('Invalid caregiver credentials or access code.');
  };
  form.addEventListener('submit', go);
}

/* ---- Patient ---- */
function initPatientLogin(){
  const form = $('#pt-login-form'); if (!form) return;

  const go = (e)=>{
    e.preventDefault();
    const {user, pass, code} = readLoginFields('pt');

    const pts = findUsersByRole('patient');
    const patient = (user && pass && pts.find(x=>x.username===user && x.password===pass)) 
                 || (code && pts.find(x=>x.accessCode===code));

    if (patient){
      setStatus('');
      set(K.currentUserId, patient.id);
      set(K.currentPatientId, patient.id);
      location.href='patient.html';
      return;
    }
    setStatus('Invalid patient credentials or access code.');
  };
  form.addEventListener('submit', go);
}

/* ===========================
   Admin page (user mgmt)
   =========================== */
function renderRoleSummary(){
  const wrap = $('#role-summary'); if (!wrap) return;
  const users = loadUsers();
  const admins = users.filter(u=>u.role==='admin');
  const cgs    = users.filter(u=>u.role==='caregiver');
  const pts    = users.filter(u=>u.role==='patient');

  const chip = (label, value) =>
    `<span class="pill" style="font-size:.85rem;">${label}</span>
     <span class="pill" style="background:var(--surface);border:1px solid var(--border);">${value}</span>`;

  const parts = [];
  if (admins[0]) parts.push(chip('Site Admin', admins[0].username||'admin'));
  if (cgs[0])    parts.push(chip('Caregiver', cgs[0].username||'caregiver'));
  if (pts[0])    parts.push(chip('Patient', pts[0].fullName||'Patient'));
  wrap.innerHTML = parts.join('');
}

function initAdmin(){
  const form=$('#user-form'); if (!form) return;
  if (get(K.adminLogged) !== '1'){ try{ location.href='admin-login.html'; return; }catch{} }

  const list=$('#user-list');
  renderUserList(); renderRoleSummary();

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
      const u = { id:uid(), role, fullName, username, password,
        accessCode: accessCode || (role==='admin' ? '1000' : role==='caregiver' ? '0000' : '0000') };
      if (role==='patient') Object.assign(u,{mrn:'',dob:'',blood:'',allergies:'',meds:[]});
      users.push(u);
    }
    saveUsers(users);
    form.reset();
    renderUserList(); renderRoleSummary();
  });

  function renderUserList(){
    const users = loadUsers(); list.innerHTML='';
    users.forEach(u=>{
      const row=document.createElement('div'); row.className='list__row';
      row.innerHTML = `
        <div>
          <div class="list__title">${u.fullName} <span class="pill">${u.role}</span></div>
          <div class="list__meta">user: ${u.username || '(none)'} · code: ${u.accessCode||''}</div>
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
        saveUsers(users); renderUserList(); renderRoleSummary();
      });
    });

    list.querySelectorAll('[data-edit]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const u=findUserById(b.dataset.edit);
        $('#role').value=u.role; $('#fullName').value=u.fullName||''; $('#username').value=u.username||'';
        $('#password').value=''; $('#accessCode').value=u.accessCode || (u.role==='admin' ? '1000' : '0000');
        window.scrollTo({top:0,behavior:'smooth'});
      });
    });
  }

  // Admin tickets panel
  const tToggle = $('#adm-ticket-toggle');
  const tPanel  = $('#adm-ticket-panel');
  const refreshTickets = ()=> renderAdminTickets();
  tToggle?.addEventListener('click', ()=>{
    tPanel.classList.toggle('open');
    if (tPanel.classList.contains('open')) refreshTickets();
  });
  if (tPanel?.classList.contains('open')) refreshTickets();
}

/* ===========================
   Caregiver page
   =========================== */
function initCaregiver(){
  if (!$('#patient-select')) return;

  const me=findUserById(get(K.currentUserId));
  if (!me || me.role!=='caregiver'){ try{ location.href='login.html'; return; }catch{} }

  const sel=$('#patient-select'); const pts=findUsersByRole('patient');
  sel.innerHTML = pts.map(p=>`<option value="${p.id}">${p.fullName}</option>`).join('');
  const last = get(K.currentPatientId) && findUserById(get(K.currentPatientId));
  sel.value = last?.id || pts[0]?.id || '';

  function loadPatientToForm(p){
    set(K.currentPatientId, p.id);
    if ($('#patient-name')) $('#patient-name').textContent = p.fullName;
    if ($('#patient-initials')) $('#patient-initials').textContent = p.fullName.split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join('');
    if ($('#f-name')) $('#f-name').value = p.fullName||'';
    if ($('#f-mrn')) $('#f-mrn').value  = p.mrn||'';
    if ($('#f-dob')) $('#f-dob').value  = p.dob||'';
    if ($('#f-blood')) $('#f-blood').value= p.blood||'';
    if ($('#f-allergies')) $('#f-allergies').value = p.allergies||'';
    if ($('#f-access')) $('#f-access').value = p.accessCode||'0000';
    if ($('#f-meds')) $('#f-meds').value = (p.meds||[]).join('\n');
    renderMedPreview();
    renderMsgs(p.id, '#chat-list');
    renderIssues(p.id, '#issue-list');
  }
  sel.addEventListener('change', ()=> loadPatientToForm(findUserById(sel.value)));
  if (sel.value) loadPatientToForm(findUserById(sel.value));

  const getTA = () => $('#f-meds').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const setTA = lines => { $('#f-meds').value = lines.join('\n'); };

  function renderMedPreview(){
    const ul = $('#med-list-care'); if (!ul) return;
    const lines = getTA();
    ul.innerHTML = lines.map((line,i)=>{
      const parts = (line || '').split(' — ');
      const name  = parts[0] || '';
      const rest  = parts.slice(1).join(' — ');

      return `
        <li class="list__row">
          <div>
            <div class="list__title">${escapeHTML(name||'')}</div>
            <div class="list__meta">${escapeHTML(rest||'')}</div>
          </div>
          <div><button class="btn btn--ghost" data-del-med="${i}">Remove</button></div>
        </li>`;
    }).join('');

    ul.querySelectorAll('[data-del-med]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const idx=+b.dataset.delMed;
        const cur=getTA(); cur.splice(idx,1); setTA(cur);
        renderMedPreview();
      });
    });
  }

  $('#med-add')?.addEventListener('click', ()=>{
    const name=($('#med-name')?.value||'').trim(); if(!name) return;
    const strength=($('#med-strength')?.value||'').trim();
    const unit=($('#med-unit')?.value||'').trim();
    const form=($('#med-form')?.value||'tablet').trim();
    const dir=($('#med-directions')?.value||'').trim();
    const qty=($('#med-qty')?.value||'').trim();
    const ref=($('#med-refills')?.value||'').trim();
    const start=($('#med-start')?.value||'').trim();
    const end=($('#med-end')?.value||'').trim();
    const notes=($('#med-notes')?.value||'').trim();

    const left=[name, strength&&unit?`${strength} ${unit}`:strength||unit].filter(Boolean).join(' ');
    const parts=[];
    if(dir)parts.push(dir);
    if(qty)parts.push(`${qty} ${form==='liquid'?'mL':(form==='inhaler'?'puffs':'tabs')}`);
    if(ref)parts.push(`${ref} refill${ref==='1'?'':'s'}`);
    if(start)parts.push(`start ${start}`);
    if(end)parts.push(`end ${end}`);
    if(notes)parts.push(notes);

    const line=`${left} — ${parts.join(' · ')}`.trim();
    const cur=getTA(); cur.push(line); setTA(cur);

    $('#med-name').value=''; $('#med-strength').value=''; $('#med-directions').value='';
    $('#med-qty').value=''; $('#med-refills').value=''; $('#med-notes').value='';

    renderMedPreview();
  });

  $('#f-meds')?.addEventListener('input', renderMedPreview);
  renderMedPreview();

  $('#save-patient')?.addEventListener('click', ()=>{
    const id=get(K.currentPatientId); const u=findUserById(id); if(!u) return;
    u.fullName=$('#f-name').value.trim(); u.mrn=$('#f-mrn').value.trim(); u.dob=$('#f-dob').value.trim();
    u.blood=$('#f-blood').value.trim(); u.allergies=$('#f-allergies').value.trim(); u.accessCode=$('#f-access').value.trim() || '0000';
    u.meds = $('#f-meds').value.split('\n').map(s=>s.trim()).filter(Boolean);
    saveUsers(loadUsers().map(x=>x.id===u.id?u:x));
    alert('Saved.');
  });

  // Floating chat (bottom-right)
  initFloatingChat({
    title:'Secure Messages',
    getPeerId:()=> get(K.currentPatientId),
    who:'caregiver',
    openByDefault:false
  });

  // Bottom-left issue panel
  (function initIssueBox(){
    const panel=$('#issue-panel'), form=$('#issue-form'), input=$('#issue-input'), toggle=$('#issue-toggle');
    if (!panel || !form || !toggle) return;
    const getPeerId=()=> get(K.currentPatientId);
    const refresh=()=> renderIssues(getPeerId(), '#issue-list');
    toggle.addEventListener('click', ()=>{
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) refresh();
    });
    form.addEventListener('submit',(e)=>{
      e.preventDefault();
      const txt=(input.value||'').trim(); if(!txt) return;
      addIssue(getPeerId(), 'caregiver', txt);
      input.value=''; refresh();
    });
  })();
}

/* ===========================
   Patient page
   =========================== */
function initPatient(){
  if (!$('#patient-name') || !$('#med-list')) return;

  const me=findUserById(get(K.currentUserId));
  if (!me || me.role!=='patient'){ try{ location.href='patient-login.html'; return; }catch{} }
  set(K.currentPatientId, me.id);

  $('#patient-name').textContent = me.fullName;
  $('#patient-initials').textContent = me.fullName.split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join('');
  $('#patient-meta').textContent = `MRN: ${me.mrn||'—'} · DOB: ${me.dob||'—'} · Blood Type: ${me.blood||'—'}`;
  $('#patient-alerts').innerHTML = me.allergies ? `<span class="pill pill--alert">Allergy: ${escapeHTML(me.allergies)}</span>` : '';

  const ul=$('#med-list');
  ul.innerHTML=(me.meds||[]).map(m=>{
    const parts = (m || '').split(' — ');
    const name  = parts[0] || '';
    const rest  = parts.slice(1).join(' — ');

    return `<li class="list__row">
      <div>
        <div class="list__title">${escapeHTML(name)}</div>
        <div class="list__meta">${escapeHTML(rest||'')}</div>
      </div>
    </li>`;
  }).join('');

  initFloatingChat({ title:'Messages', getPeerId:()=> me.id, who:'patient', openByDefault:false });
}

/* ===========================
   Shared floating chat
   =========================== */
function initFloatingChat({title, getPeerId, who, openByDefault}){
  const panel=$('#chat-panel'), form=$('#chat-form'), input=$('#chat-input'), toggle=$('#chat-toggle');
  if (!panel || !form || !toggle) return;

  const titleEl=panel.querySelector('.chat-title'); if (titleEl) titleEl.textContent=title;
  const refresh=()=> renderMsgs(getPeerId(), '#chat-list');

  toggle.addEventListener('click', ()=>{
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) refresh();
  });

  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    const txt=(input.value||'').trim(); if(!txt) return;
    addMsg(getPeerId(), who, txt);

    if (who==='caregiver'){ // caregiver messages -> admin ticket
      const cg=findUserById(get(K.currentUserId));
      const patient=findUserById(getPeerId());
      addAdminTicket({
        fromCaregiverId: cg?.id,
        fromCaregiverName: cg?.fullName || 'Caregiver',
        patientId: patient?.id,
        patientName: patient?.fullName || '',
        text: txt
      });
    }

    input.value=''; refresh();
  });

  if (openByDefault){ panel.classList.add('open'); refresh(); }
}

/* ===========================
   Utils & boot
   =========================== */
function fmtWhen(iso){ const d=iso?new Date(iso):null; return d&&!Number.isNaN(d.getTime())?d.toLocaleString():''; }
function escapeHTML(s){ return (s||'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c])); }

document.addEventListener('DOMContentLoaded', ()=>{
  seedDemo();       // ensure demo users exist (never wipes)
  initGlobal();

  // Bind logins (robust to filename/ID variations)
  initAdminLogin();
  initCaregiverLogin();
  initPatientLogin();

  // Pages
  initAdmin();
  initCaregiver();
  initPatient();
});