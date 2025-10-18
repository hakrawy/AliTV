// Admin SPA (vanilla JS, hash routing, Bearer token)
(function(){
  const root = document.getElementById('admin-root');
  if(!root) return;

  const TOKEN_KEY = 'alitv_admin_token';
  const API = (typeof API_BASE !== 'undefined') ? API_BASE : 'https://hakrawy-backend.onrender.com';

  const state = {
    token: sessionStorage.getItem(TOKEN_KEY) || null,
    view: 'login' // login | channels | movies | series
  };

  function setToken(t){ state.token = t; if(t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); render(); }

  async function api(path, opts={}){
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers||{});
    if(state.token) headers['Authorization'] = `Bearer ${state.token}`;
    const r = await fetch(`${API}${path}`, { ...opts, headers });
    const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if(!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
    return data;
  }

  function nav(){
    return `
      <div class="admin-nav">
        <a href="#/admin/channels" class="${state.view==='channels'?'active':''}">القنوات</a>
        <a href="#/admin/movies" class="${state.view==='movies'?'active':''}">الأفلام</a>
        <a href="#/admin/series" class="${state.view==='series'?'active':''}">المسلسلات</a>
        <span style="flex:1"></span>
        <button class="btn" id="logoutBtn">خروج</button>
      </div>
    `;
  }

  function viewLogin(){
    root.innerHTML = `
      <div class="admin panel" style="max-width:520px;margin:24px auto;">
        <h2>تسجيل الدخول - لوحة الإدارة</h2>
        <form id="loginForm">
          <label>البريد الإلكتروني</label>
          <input type="text" id="email" placeholder="admin@example.com"/>
          <label>كلمة المرور</label>
          <input type="password" id="password" placeholder="••••••••"/>
          <div style="margin-top:12px;display:flex;gap:8px;">
            <button type="submit" class="btn primary">دخول</button>
            <a href="#" class="btn ghost">إلغاء</a>
          </div>
          <p class="muted" style="margin-top:8px;">سيتم استخدام Bearer Token للتخاطب مع الخادم.</p>
        </form>
      </div>
    `;
    document.getElementById('loginForm').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      try{
        const r = await api('/api/admin/login', { method:'POST', body: JSON.stringify({ email, password }) });
        setToken(r.token);
        location.hash = '#/admin/channels';
      }catch(err){ alert(err.message || 'Login failed'); }
    });
  }

  async function viewChannels(){
    const containerId = 'channelsView';
    root.innerHTML = nav() + `
      <div class="admin panel" id="${containerId}">
        <h2>القنوات</h2>
        <div class="panel" style="margin-bottom:16px;">
          <h3>استيراد قنوات</h3>
          <div class="row">
            <div>
              <h4>M3U</h4>
              <input type="text" id="impM3uUrl" placeholder="https://.../index.m3u"/>
              <div style="display:flex; gap:8px; margin-top:8px;">
                <select id="impM3uMode"><option value="append">إضافة</option><option value="replace">استبدال الكل</option></select>
                <button class="btn" id="impM3uBtn">استيراد M3U</button>
              </div>
            </div>
            <div>
              <h4>Xtream Codes</h4>
              <div class="row"><input type="text" id="impXtHost" placeholder="host or http://host"/><input type="number" id="impXtPort" placeholder="80"/></div>
              <div class="row"><input type="text" id="impXtUser" placeholder="username"/><input type="password" id="impXtPass" placeholder="password"/></div>
              <div style="display:flex; gap:8px; margin-top:8px;">
                <select id="impXtMode"><option value="append">إضافة</option><option value="replace">استبدال الكل</option></select>
                <button class="btn" id="impXtBtn">استيراد Xtream</button>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div>
            <form id="chForm">
              <input type="hidden" id="chId"/>
              <label>الاسم</label>
              <input type="text" id="chName"/>
              <label>الشعار (logo URL)</label>
              <input type="text" id="chLogo"/>
              <label>المجموعة</label>
              <input type="text" id="chGroup"/>
              <label>روابط البث (سطر لكل رابط)</label>
              <textarea id="chStreams"></textarea>
              <label><input type="checkbox" id="chVisible" checked/> ظاهر للعامة</label>
              <div style="margin-top:8px; display:flex; gap:8px;">
                <button class="btn primary" type="submit">حفظ</button>
                <button class="btn" type="button" id="chReset">تفريغ النموذج</button>
              </div>
            </form>
          </div>
          <div>
            <table>
              <thead><tr><th>#</th><th>الاسم</th><th>مجموعة</th><th>مرئي</th><th>تحكم</th></tr></thead>
              <tbody id="chList"><tr><td colspan="5">جارٍ التحميل...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    document.getElementById('logoutBtn').onclick = async ()=>{ try{ await api('/api/admin/logout',{method:'POST'});}catch{} setToken(null); location.hash = '#/admin'; };
    document.getElementById('chReset').onclick = ()=> fillChForm();
    // import handlers
    const m3uBtn = document.getElementById('impM3uBtn');
    m3uBtn.onclick = async ()=>{
      const url = document.getElementById('impM3uUrl').value.trim();
      const mode = document.getElementById('impM3uMode').value;
      if(!url) return alert('ضع رابط M3U');
      m3uBtn.disabled = true; m3uBtn.textContent = 'جارٍ...';
      try{ await api('/api/admin/import/m3u', { method:'POST', body: JSON.stringify({ url, mode }) }); await loadChList(); alert('تم الاستيراد'); }
      catch(e){ alert(e.message||'فشل الاستيراد'); }
      finally{ m3uBtn.disabled=false; m3uBtn.textContent='استيراد M3U'; }
    };
    const xtBtn = document.getElementById('impXtBtn');
    xtBtn.onclick = async ()=>{
      const host = document.getElementById('impXtHost').value.trim();
      const port = document.getElementById('impXtPort').value.trim();
      const username = document.getElementById('impXtUser').value.trim();
      const password = document.getElementById('impXtPass').value.trim();
      const mode = document.getElementById('impXtMode').value;
      if(!host || !username || !password) return alert('أكمل بيانات Xtream');
      xtBtn.disabled = true; xtBtn.textContent = 'جارٍ...';
      try{ await api('/api/admin/import/xtream', { method:'POST', body: JSON.stringify({ host, port, username, password, mode }) }); await loadChList(); alert('تم الاستيراد'); }
      catch(e){ alert(e.message||'فشل الاستيراد'); }
      finally{ xtBtn.disabled=false; xtBtn.textContent='استيراد Xtream'; }
    };
    document.getElementById('chForm').onsubmit = async (e)=>{
      e.preventDefault();
      const id = Number(document.getElementById('chId').value||0) || null;
      const name = document.getElementById('chName').value.trim();
      const logo = document.getElementById('chLogo').value.trim();
      const group = document.getElementById('chGroup').value.trim();
      const streams = document.getElementById('chStreams').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(url=>({url}));
      const visible = document.getElementById('chVisible').checked;
      const body = JSON.stringify({ name, logo, group, streams, visible });
      try{
        if(id){ await api(`/api/admin/channels/${id}`, { method:'PUT', body }); }
        else { await api('/api/admin/channels', { method:'POST', body }); }
        await loadChList();
        fillChForm();
        alert('تم الحفظ');
      }catch(err){ alert(err.message||'فشل الحفظ'); }
    };
    await loadChList();

    async function loadChList(){
      try{
        const j = await api('/api/admin/channels');
        const items = j.items||[];
        const tbody = document.getElementById('chList');
        tbody.innerHTML = items.map(c=>`<tr>
          <td>${c.id}</td>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.group_name||'')}</td>
          <td>${c.visible? '✔' : '✖'}</td>
          <td>
            <button class="btn" data-act="edit" data-id="${c.id}">تعديل</button>
            <button class="btn" data-act="del" data-id="${c.id}">حذف</button>
          </td>
        </tr>`).join('');
        tbody.querySelectorAll('button').forEach(b=>{
          b.onclick = async ()=>{
            const id = Number(b.getAttribute('data-id'));
            const act = b.getAttribute('data-act');
            const item = items.find(x=>x.id===id);
            if(act==='edit' && item) fillChForm(item);
            if(act==='del'){
              if(confirm('حذف العنصر؟')){ try{ await api(`/api/admin/channels/${id}`, { method:'DELETE' }); await loadChList(); }catch(e){ alert('فشل الحذف'); } }
            }
          };
        });
      }catch(err){ document.getElementById('chList').innerHTML = `<tr><td colspan="5">${escapeHtml(err.message||'خطأ')}</td></tr>`; }
    }

    function fillChForm(item){
      document.getElementById('chId').value = item?.id || '';
      document.getElementById('chName').value = item?.name || '';
      document.getElementById('chLogo').value = item?.logo || '';
      document.getElementById('chGroup').value = item?.group_name || '';
      document.getElementById('chStreams').value = (item?.streams||[]).map(s=>s.url||s).filter(Boolean).join('\n');
      document.getElementById('chVisible').checked = !!(item?.visible ?? true);
    }
  }

  async function viewSimpleEntity(kind){
    const names = { movies:'الأفلام', series:'المسلسلات' };
    const fields = [
      { key:'tmdb_id', label:'TMDB ID', type:'number' },
      { key:'title', label:'العنوان', type:'text' },
      { key:'poster', label:'الملصق (URL)', type:'text' },
      { key:'overview', label:'الوصف', type:'text' },
    ];
    root.innerHTML = nav() + `
      <div class="admin panel">
        <h2>${names[kind]}</h2>
        <div class="panel" style="margin-bottom:16px;">
          <h3>استيراد TMDB (${names[kind]})</h3>
          <div class="row">
            <div>
              <label>أIDs (مفصولة بفواصل)</label>
              <input type="text" id="tmdbIds" placeholder="550, 299534"/>
              <div style="display:flex; gap:8px; margin-top:8px;">
                <button class="btn" id="tmdbIdsBtn">استيراد حسب ID</button>
              </div>
            </div>
            <div>
              <label>مصدر تلقائي</label>
              <div style="display:flex; gap:8px;">
                <button class="btn" id="tmdbTrendingBtn">Trending</button>
                <button class="btn" id="tmdbDiscoverBtn">Discover</button>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div>
            <form id="form">
              <input type="hidden" id="id"/>
              ${fields.map(f=>`<label>${f.label}</label><input type="${f.type}" id="${f.key}"/>`).join('')}
              <label><input type="checkbox" id="visible" checked/> ظاهر للعامة</label>
              <div style="margin-top:8px; display:flex; gap:8px;">
                <button class="btn primary" type="submit">حفظ</button>
                <button class="btn" type="button" id="reset">تفريغ النموذج</button>
              </div>
            </form>
          </div>
          <div>
            <table>
              <thead><tr><th>#</th><th>العنوان</th><th>TMDB</th><th>مرئي</th><th>تحكم</th></tr></thead>
              <tbody id="list"><tr><td colspan="5">جارٍ التحميل...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    document.getElementById('logoutBtn').onclick = async ()=>{ try{ await api('/api/admin/logout',{method:'POST'});}catch{} setToken(null); location.hash = '#/admin'; };
    document.getElementById('reset').onclick = ()=> fill();
    // TMDB import handlers
    const idsBtn = document.getElementById('tmdbIdsBtn');
    idsBtn.onclick = async ()=>{
      const txt = document.getElementById('tmdbIds').value.trim();
      const ids = txt ? txt.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n)) : [];
      if(!ids.length) return alert('أدخل IDs');
      idsBtn.disabled = true; idsBtn.textContent='جارٍ...';
      try{ await api('/api/admin/import/tmdb', { method:'POST', body: JSON.stringify({ type: kind==='movies'?'movie':'tv', ids }) }); await loadList(); alert('تم'); }
      catch(e){ alert(e.message||'فشل'); }
      finally{ idsBtn.disabled=false; idsBtn.textContent='استيراد حسب ID'; }
    };
    const trendingBtn = document.getElementById('tmdbTrendingBtn');
    trendingBtn.onclick = async ()=>{
      trendingBtn.disabled=true; trendingBtn.textContent='جارٍ...';
      try{ await api('/api/admin/import/tmdb', { method:'POST', body: JSON.stringify({ type: kind==='movies'?'movie':'tv', trending: true, limit: 20 }) }); await loadList(); alert('تم'); }
      catch(e){ alert(e.message||'فشل'); }
      finally{ trendingBtn.disabled=false; trendingBtn.textContent='Trending'; }
    };
    const discoverBtn = document.getElementById('tmdbDiscoverBtn');
    discoverBtn.onclick = async ()=>{
      discoverBtn.disabled=true; discoverBtn.textContent='جارٍ...';
      try{ await api('/api/admin/import/tmdb', { method:'POST', body: JSON.stringify({ type: kind==='movies'?'movie':'tv', discover: true, limit: 20 }) }); await loadList(); alert('تم'); }
      catch(e){ alert(e.message||'فشل'); }
      finally{ discoverBtn.disabled=false; discoverBtn.textContent='Discover'; }
    };
    document.getElementById('form').onsubmit = async (e)=>{
      e.preventDefault();
      const id = Number($('#id').value||0) || null;
      const bodyObj = {
        tmdb_id: valueOrNull($('#tmdb_id').value, true),
        title: $('#title').value.trim(),
        poster: $('#poster').value.trim(),
        overview: $('#overview').value.trim(),
        visible: $('#visible').checked
      };
      const body = JSON.stringify(bodyObj);
      try{
        if(id){ await api(`/api/admin/${kind}/${id}`, { method:'PUT', body }); }
        else { await api(`/api/admin/${kind}`, { method:'POST', body }); }
        await loadList(); fill(); alert('تم الحفظ');
      }catch(err){ alert(err.message||'فشل الحفظ'); }
    };
    await loadList();

    async function loadList(){
      try{
        const j = await api(`/api/admin/${kind}`);
        const items = j.items||[];
        const tbody = document.getElementById('list');
        tbody.innerHTML = items.map(it=>`<tr>
          <td>${it.id}</td>
          <td>${escapeHtml(it.title||'')}</td>
          <td>${it.tmdb_id ?? ''}</td>
          <td>${it.visible? '✔' : '✖'}</td>
          <td>
            <button class="btn" data-act="edit" data-id="${it.id}">تعديل</button>
            <button class="btn" data-act="del" data-id="${it.id}">حذف</button>
          </td>
        </tr>`).join('');
        tbody.querySelectorAll('button').forEach(b=>{
          b.onclick = async ()=>{
            const id = Number(b.getAttribute('data-id'));
            const act = b.getAttribute('data-act');
            const item = items.find(x=>x.id===id);
            if(act==='edit' && item) fill(item);
            if(act==='del'){
              if(confirm('حذف العنصر؟')){ try{ await api(`/api/admin/${kind}/${id}`, { method:'DELETE' }); await loadList(); }catch(e){ alert('فشل الحذف'); } }
            }
          };
        });
      }catch(err){ document.getElementById('list').innerHTML = `<tr><td colspan="5">${escapeHtml(err.message||'خطأ')}</td></tr>`; }
    }

    function fill(item){
      $('#id').value = item?.id || '';
      $('#tmdb_id').value = item?.tmdb_id ?? '';
      $('#title').value = item?.title || '';
      $('#poster').value = item?.poster || '';
      $('#overview').value = item?.overview || '';
      $('#visible').checked = !!(item?.visible ?? true);
    }
  }

  function route(){
    const hash = location.hash || '#';
    const isAdmin = hash.startsWith('#/admin');
    const content = document.getElementById('content');
    if(isAdmin){
      content?.classList.add('hidden');
      root.classList.remove('hidden');
      root.setAttribute('aria-hidden','false');
      const parts = hash.split('/');
      const sub = parts[2] || 'login';
      if(!state.token && sub!=='login'){ location.hash = '#/admin'; return; }
      state.view = (!state.token) ? 'login' : (sub==='channels'?'channels':(sub==='movies'?'movies':(sub==='series'?'series':'channels')));
      render();
    } else {
      root.classList.add('hidden');
      root.setAttribute('aria-hidden','true');
      content?.classList.remove('hidden');
    }
  }

  function render(){
    if(!state.token){ viewLogin(); return; }
    if(state.view==='channels') return void viewChannels();
    if(state.view==='movies') return void viewSimpleEntity('movies');
    if(state.view==='series') return void viewSimpleEntity('series');
    viewChannels();
  }

  // helpers
  function $(sel){ return document.querySelector(sel); }
  function valueOrNull(v, numeric=false){ const t = (v||'').trim(); if(t==='') return null; return numeric? Number(t): t; }
  function escapeHtml(s){ return String(s).replace(/[&<>"]+/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }

  window.addEventListener('hashchange', route);
  route();
})();
