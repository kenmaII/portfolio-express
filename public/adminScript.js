// Simple admin script: login, settings, and project CRUD
(function(){
  // helper small alert
  const siteAlert = (()=>{
    let el = document.getElementById('siteAlert');
    if(!el){ el = document.createElement('div'); el.id='siteAlert'; document.body.appendChild(el); }
    el.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:3000;padding:.6rem 1rem;border-radius:8px;display:none';
    return { show:(m,t='ok')=>{ el.textContent = m; el.style.display='block'; el.style.background = t==='error'? 'rgba(255,220,220,.95)' : t==='warn' ? 'rgba(255,245,220,.95)' : 'rgba(220,255,220,.95)'; setTimeout(()=> el.style.display='none',2500); } };
  })();

  const $ = id => document.getElementById(id);
  const panel = $('adminPanel');
  const loginSection = $('loginSection');
  const status = $('adminStatus');

  async function checkAuth(){
    try{
      const r = await fetch('/api/auth/me');
      if(r.ok){ const d = await r.json(); if(d && d.user){ showPanel(); status.textContent = d.user.username; return true; } }
    }catch(e){}
    showLogin(); return false;
  }

  function showLogin(){ loginSection.style.display='block'; panel.style.display='none'; }
  function showPanel(){ loginSection.style.display='none'; panel.style.display='block'; }

  // login
  $('btnLogin').addEventListener('click', async ()=>{
    const u = $('a_user').value.trim(); const p = $('a_pass').value;
    if(!u||!p){ siteAlert.show('Fill credentials','warn'); return; }
    try{
    const r = await fetch('/api/auth/login',{ method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: u, password: p }) });
      const d = await r.json();
      if(d.success){
        try{ localStorage.removeItem('siteRole'); }catch(e){}
        siteAlert.show('Logged in'); await loadSettings(); await loadProjects(); showPanel(); status.textContent = u; }
      else siteAlert.show(d.msg||'Login failed','error');
    }catch(e){ siteAlert.show('Network error','error'); }
  });

  // logout link (clicking username will log out)
  status.addEventListener('click', async ()=>{
  try{ await fetch('/api/auth/logout',{method:'POST', credentials:'include'}); siteAlert.show('Logged out'); showLogin(); status.textContent=''; }catch(e){ siteAlert.show('Logout failed','error'); }
  });

  // settings
  // profile upload
  $('uploadProfile') && $('uploadProfile').addEventListener('click', async ()=>{
    const f = $('profileFile').files && $('profileFile').files[0];
    if(!f){ siteAlert.show('Choose profile file first','warn'); return; }
    const fd = new FormData(); fd.append('file', f);
    try{
      const r = await fetch('/api/upload',{ method:'POST', credentials:'include', body: fd });
      const d = await r.json();
      if(r.ok && d.success){
        // save profile URL in settings
  const r2 = await fetch('/api/settings',{ method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ profileImage: d.url }) });
        const d2 = await r2.json(); if(d2.success) { siteAlert.show('Profile uploaded'); if(document.getElementById('profilePreview')){ document.getElementById('profilePreview').innerHTML = `<img src="${d.url}" style="width:100%;height:100%;object-fit:cover"/>`; } }
        else siteAlert.show('Failed to save profile','error');
      } else siteAlert.show(d.msg||'Upload failed','error');
    }catch(e){ siteAlert.show('Upload error','error'); }
  });
  // Skills are managed manually in index.html — admin UI does not provide CRUD for skills.

  // projects CRUD UI
  $('btnNew').addEventListener('click', ()=> openEditor());

  function renderProjects(list){
    const out = $('projectsList'); out.innerHTML='';
    list.forEach(p=>{
      const div = document.createElement('div'); div.className='project-card card';
      // hanya thumb kecil, tanpa link / icon di admin
      const thumbStyle = p.imageUrl ? `style="width:88px;height:64px;border-radius:8px;flex-shrink:0;background-image:url('${escapeHtmlAttr(p.imageUrl)}');background-size:cover;background-position:center;border:3px solid var(--dark-outline)"` : `style="width:88px;height:64px;border-radius:8px;flex-shrink:0;background:#fafafa;border:3px solid var(--dark-outline)"`;
      div.innerHTML = `<div style="display:flex;gap:1rem;align-items:center">
          <div class="project-thumb" ${thumbStyle}></div>
          <div class="project-info">
            <strong>${escapeHtml(p.title||'Untitled')}</strong>
            <p>${escapeHtml((p.description||'').slice(0,180))}</p>
          </div>
          <div class="project-actions">
            <button class="edit">Edit</button>
            <button class="del" style="background:#ff6b6b">Delete</button>
          </div>
        </div>`;
      out.appendChild(div);
      div.querySelector('.edit').addEventListener('click', ()=> openEditor(p));
      div.querySelector('.del').addEventListener('click', async ()=>{
        if(!confirm('Delete project?')) return;
        try{
          const r = await fetch('/api/projects/'+p._id,{ method:'DELETE', credentials:'include' });
          const d = await r.json();
          if(d.success){ siteAlert.show('Deleted'); loadProjects(); } else siteAlert.show('Delete failed','error');
        }catch(e){ siteAlert.show('Network','error'); }
      });
    });
  }

  async function loadProjects(){
  try{ const r = await fetch('/api/projects',{ credentials:'include' }); const d = await r.json(); if(d.success) renderProjects(d.projects||[]); }catch(e){ console.warn('loadProjects err',e); }
  }

  async function loadSettings(){
    try{
      // force fresh fetch to avoid cached responses
      const r = await fetch('/api/settings',{ credentials:'include', cache: 'no-store' });
      const d = await r.json();
      if(d.success){
        const s = d.settings || {};
        console.log('admin: loaded settings', s && s.skills);
        // profile preview
        if(s.profileImage && document.getElementById('profilePreview')) document.getElementById('profilePreview').innerHTML = `<img src="${s.profileImage}" style="width:100%;height:100%;object-fit:cover"/>`;
  // Note: skills are managed manually in index.html; admin UI shows profileOnly and projects.
      }
    }catch(e){ console.warn('load settings',e); }
  }

  // Editor modal implementation
  // create modal DOM
  const modalHtml = `
    <div id="editorModal">
      <div class="sheet">
        <h3 id="editorTitle">Edit Project</h3>
        <div class="row"><input id="e_title" class="input" placeholder="Title"/></div>
        <div class="row">
          <label class="small">Project image (upload only)</label>
          <input id="e_file" type="file" accept="image/*" class="input" style="width:auto"/>
          <button id="e_upload" class="btn small">Upload</button>
          <div class="preview" id="e_preview"></div>
        </div>
        <div class="row"><input id="e_tags" class="input" placeholder="Tags (comma)"/></div>
        <div class="row"><textarea id="e_desc" class="input" rows="6" placeholder="Description"></textarea></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.6rem"><button id="e_cancel" class="btn small">Cancel</button><button id="e_save" class="btn small">Save</button></div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const editorModal = $('editorModal');
  const e_title = $('e_title'), e_tags = $('e_tags'), e_desc = $('e_desc'), e_preview = $('e_preview');
  let editingId = null;
  // store the uploaded image URL (file-only workflow)
  let uploadedImageUrl = '';

  function openEditor(project){
    editingId = project && project._id ? project._id : null;
    e_title.value = project ? project.title : '';
    // image is file-based; set uploadedImageUrl from existing project image if any
    uploadedImageUrl = project && project.imageUrl ? project.imageUrl : '';
    e_tags.value = project ? (project.tags || []).join(',') : '';
    e_desc.value = project ? project.description || '' : '';
    updatePreview();
    editorModal.style.display = 'flex';
  }

  function closeEditor(){ editingId = null; editorModal.style.display = 'none'; }

  function updatePreview(){
    e_preview.innerHTML = '';
    if(uploadedImageUrl && uploadedImageUrl.trim()){
      const img = document.createElement('img'); img.src = uploadedImageUrl.trim(); img.onload = ()=>{}; img.onerror = ()=>{}; e_preview.appendChild(img);
    }
  }
  // upload handler
  $('e_upload').addEventListener('click', async ()=>{
    const f = $('e_file').files && $('e_file').files[0];
    if(!f){ siteAlert.show('Choose a file first','warn'); return; }
    const fd = new FormData(); fd.append('file', f);
    try{
      const r = await fetch('/api/upload', { method: 'POST', body: fd, credentials:'include' });
      const d = await r.json();
      if(r.ok && d.success){ uploadedImageUrl = d.url; updatePreview(); siteAlert.show('Uploaded'); }
      else siteAlert.show(d.msg||'Upload failed','error');
    }catch(e){ siteAlert.show('Upload error','error'); }
  });
  $('e_cancel').addEventListener('click', closeEditor);
  $('e_save').addEventListener('click', async ()=>{
    const payload = { 
      title: e_title.value.trim(), 
      imageUrl: (uploadedImageUrl||'').trim(), 
      tags: (e_tags.value||'').split(',').map(s=>s.trim()).filter(Boolean), 
      description: e_desc.value.trim() 
    };
    if(!payload.title || !payload.description){ siteAlert.show('Title and description required','warn'); return; }
    try{
      if(editingId){
        const r = await fetch('/api/projects/'+editingId,{ method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const dd = await r.json();
        if(dd.success) siteAlert.show('Saved'); else siteAlert.show(dd.msg||'Save failed','error');
      } else {
        const r = await fetch('/api/projects',{ method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const dd = await r.json();
        if(dd.success) siteAlert.show('Added'); else siteAlert.show(dd.msg||'Add failed','error');
      }
      closeEditor(); await loadProjects();
    }catch(e){ siteAlert.show('Network','error'); }
  });

  // SSE to notify main site if available (admin changes will push on server-side too)
  if(typeof EventSource !== 'undefined'){
    try{ const es = new EventSource('/events'); es.onmessage = (e)=>{ try{ const p = JSON.parse(e.data); if(p.event==='projects.updated') loadProjects(); if(p.event==='settings.updated') loadSettings(); }catch(err){} }; es.onerror = ()=> es.close(); }catch(e){}
  }

  // small escape
  function escapeHtml(s){ return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeHtmlAttr(s){ return String(s||'').replace(/["']/g,c=>({'"':'&quot;',"'":'&#39;'}[c])); }

  // init
  checkAuth();
})();
