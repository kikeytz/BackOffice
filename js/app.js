// La api es clave
const API_BASE = 'https://portfolio-api-three-black.vercel.app/api/v1';
const TOKEN_KEY = 'authToken';
const USER_KEY  = 'authUser';

// helpers para no batallar
const getToken   = () => localStorage.getItem(TOKEN_KEY);
const saveToken  = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);
const getUser    = () => { try { return JSON.parse(localStorage.getItem(USER_KEY)||'{}'); } catch { return {}; } };
const saveUser   = (u) => localStorage.setItem(USER_KEY, JSON.stringify(u));
const clearUser  = () => localStorage.removeItem(USER_KEY);


async function request(path, { method='GET', body, auth=true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers['auth-token'] = token;

  const res = await fetch(`${API_BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : null;

  if (!res.ok) throw new Error((data && (data.message || data.error)) || `HTTP ${res.status}`);
  return data;
}


function showMsg(text, type = 'info') {
  let box = document.getElementById('msg');
  if (!box) {
    box = document.createElement('div');
    box.id = 'msg';
    box.className = 'msg toast';
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.className = `msg ${type} ${box.classList.contains('toast') ? 'toast' : ''}`;
  box.hidden = false;
  clearTimeout(showMsg._t);
  showMsg._t = setTimeout(() => (box.hidden = true), 3000);
}

const parseCSV = (s) => (s||'').split(',').map(x=>x.trim()).filter(Boolean);
const qp = (k) => new URLSearchParams(location.search).get(k);

// rutas
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'register') initRegister();
  if (page === 'login')    initLogin();
  if (page === 'home')     initHome();
  if (page === 'project-new')  initProjectNew();
  if (page === 'project-edit') initProjectEdit();
});

// register
function initRegister() {
  const form = document.querySelector('form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name      = document.getElementById('name').value.trim();
    const email     = document.getElementById('reg-email').value.trim();
    const itsonId   = document.getElementById('itsonId').value.trim();
    const password  = document.getElementById('reg-pass').value;
    const password2 = document.getElementById('reg-pass2').value;
    if (password !== password2) return showMsg('Las contraseñas no coinciden','error');
    if (!/^\d{6}$/.test(itsonId)) return showMsg('ITSON ID debe ser de 6 dígitos','error');

    // no lo cale, a ver si jala
    try {
      await request('/auth/register', {
         method:'POST', body:{ name, email, itsonId, password }, 
         auth:false });
      showMsg('Registro exitoso. Redirigiendo a Login…','success');
      setTimeout(()=>location.href='./index.html',1200);
    } catch (err) { showMsg(err.message,'error'); }
  });
}

// Login avance 2
function initLogin() {
  const form = document.querySelector('form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try {
      const res = await request('/auth/login', { method:'POST', body:{ email, password }, auth:false });
      saveToken(res.token); saveUser(res.user||{});
      location.href = './home.html';
    } catch (err) { showMsg(err.message,'error'); }
  });
}

// Navbar 
function initNavbarCommon() {
  const navToggle = document.getElementById('nav-toggle');
  const drawer = document.getElementById('nav-drawer');

  navToggle?.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    drawer.hidden = expanded; drawer.classList.toggle('show', !expanded);
  });
  const doLogout = () => { clearToken(); clearUser(); location.href='./index.html'; };
  document.getElementById('logout')?.addEventListener('click', doLogout);
  document.getElementById('logout-m')?.addEventListener('click', doLogout);
}

// home 
function initHome() {
  if (!getToken()) return location.replace('./index.html');
  initNavbarCommon();
  renderProjects();
}

function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

function toArrayMaybe(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

async function renderProjects() {
  const panel = document.getElementById('projects-panel');
  const tpl   = document.getElementById('project-tpl');
  panel.innerHTML = '<p class="muted">Cargando…</p>';

  try {
    const projects = await request('/projects', { method:'GET' });
    panel.innerHTML = '';
    if (!Array.isArray(projects) || projects.length === 0) {
      panel.innerHTML = '<p class="muted">Sin proyectos we.</p>'; return;
    }

    // esto estuvo chistoso de hacer
    projects.forEach((p) => {
      const el = tpl.content.firstElementChild.cloneNode(true);
      const id = p.id || p._id;
      el.dataset.id = id;

      el.querySelector('[data-title]').textContent = p.title ?? '(Sin título)';
      el.querySelector('[data-desc]').textContent  = p.description ?? '';
      const a = el.querySelector('[data-url]');
      a.href = p.repository || '#';
      a.textContent = p.repository ? 'Repositorio' : '—';

        const imgEl = el.querySelector('[data-img]');
      const imgs = toArrayMaybe(p.images);
      let firstImg = imgs[0] || p.image || '';
      if (!isValidUrl(firstImg)) firstImg = ''; 

      if (firstImg) {
        imgEl.src = firstImg;
        imgEl.alt = p.title || 'Proyecto';
        // por si falla la imagen
        imgEl.addEventListener('error', () => imgEl.remove());
      } else {
        imgEl.remove();
      }

       const techWrap = el.querySelector('[data-techs]');
      const techs = toArrayMaybe(p.technologies);
      if (techs.length) {
        techWrap.innerHTML = '';
        techs.forEach(t => {
          const span = document.createElement('span');
          span.className = 'tag';
          span.textContent = t;
          techWrap.appendChild(span);
        });
      } else {
        techWrap.remove();
      }
      

      // Editar 
      el.querySelector('[data-edit]').addEventListener('click', () => {
        location.href = `./project-edit.html?id=${encodeURIComponent(id)}`;
      });

      // eliminar 
      el.querySelector('[data-del]').addEventListener('click', async () => {
        if (!confirm('¿Eliminar proyecto?')) return;
        try {
          await request(`/projects/${id}`, { method:'DELETE' });
          await renderProjects();
        } catch (err) { showMsg(err.message,'error'); }
      });

      panel.appendChild(el);
    });

  } catch (err) {
    panel.innerHTML = `<p class="msg error">Error cargando proyectos: ${err.message}</p>`;
    if (String(err).includes('401')) { clearToken(); clearUser(); location.href='./index.html'; }
  }
}


function initProjectNew() {
  if (!getToken()) return location.replace('./index.html');
  initNavbarCommon();

  const form = document.getElementById('project-new-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = getUser();
    const payload = {
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('description').value.trim(),
      userId: user.id || user._id,                 
      technologies: parseCSV(document.getElementById('technologies').value),
      repository: document.getElementById('repository').value.trim() || undefined,
      images: parseCSV(document.getElementById('images').value),
    };
    try {
      await request('/projects', { method:'POST', body: payload });
      showMsg('Proyecto creado','success');
      setTimeout(()=>location.href='./home.html', 600);
    } catch (err) { showMsg(err.message,'error'); }
  });
}


async function initProjectEdit() {
  if (!getToken()) return location.replace('./index.html');
  initNavbarCommon();

  const id = qp('id');
  if (!id) { showMsg('Falta id del proyecto','error'); return; }

  
  try {
    let p;
    try {
      p = await request(`/projects/${id}`, { method:'GET' });
    } catch {
     
      const list = await request('/projects', { method:'GET' });
      p = (list || []).find(x => (x.id || x._id) === id);
      if (!p) throw new Error('Proyecto no encontrado');
    }

    
    document.getElementById('title').value        = p.title || '';
    document.getElementById('description').value  = p.description || '';
    document.getElementById('technologies').value = (p.technologies || []).join(', ');
    document.getElementById('repository').value   = p.repository || '';
    document.getElementById('images').value       = (p.images || []).join(', ');

    
    const form = document.getElementById('project-edit-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = getUser();
      const payload = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        userId: user.id || user._id,
        technologies: parseCSV(document.getElementById('technologies').value),
        repository: document.getElementById('repository').value.trim() || undefined,
        images: parseCSV(document.getElementById('images').value),
      };
      try {
        await request(`/projects/${id}`, { method:'PUT', body: payload });
        showMsg('Proyecto actualizado','success');
        setTimeout(()=>location.href='./home.html', 600);
      } catch (err) { showMsg(err.message,'error'); }
    });

  } catch (err) {
    showMsg(err.message,'error');
  }
}