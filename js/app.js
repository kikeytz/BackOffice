const API_BASE = 'https://portfolio-api-three-black.vercel.app/api/v1'
const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

//helpers 
const getToken = () => localStorage.getItem(TOKEN_KEY);
const saveToken = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);
const getUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || '{}'); }

  catch { return {}; }
};
const saveUser = (u) => localStorage.setItem(USER_KEY, JSON.stringify(u));
const clearUser = () => localStorage.removeItem(USER_KEY);

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) {
    headers['auth-token'] = token;
  }


  // fetch
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const ct = res.headers.get('Content-Type') || '';
  const data = ct.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

//UI
function showMsg(text, type = 'info') {
  const box = document.getElementById('msg');
  if (!box) { alert(text); return; };
  box.textContent = text;
  box.className = `msg ${type}`;
  box.hidden = false;
  clearTimeout(showMsg._t);
  showMsg._t = setTimeout(() => (box.hidden = true), 3000);

}

//utils
const parseCSV = (str) =>
  (str || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// rutas de paginas
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'register') initRegister();
  if (page === 'login') initLogin();
  if (page === 'home') initHome();

});

// register
function initRegister() {
  const form = document.querySelector('form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const itsonId = document.getElementById('itsonId').value.trim();
    const password = document.getElementById('reg-pass').value;
    const password2 = document.getElementById('reg-pass2').value;

    if (password !== password2) {
      showMsg('Las contraseñas no coinciden', 'error');
      return;
    }

    if (!/^\d{6}$/.test(itsonId)) {
      showMsg('El ITSON ID debe tener exactamente 6 dígitos', 'error');
      return;
    }

    try {
      await request('/auth/register', {
        method: 'POST',
        body: { name, email, itsonId, password },
        auth: false,
      });
      showMsg('Registro exitoso. Redirigiendo al Login...', 'success');
      setTimeout(() => location.href = 'index.html', 100);
    } catch (err) {
      showMsg(err.message, 'error');
    }

  });
}

// login
function initLogin() {
  const form = document.querySelector('form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });

      if (!res?.token) throw new Error('La API no devolvio un token');
      saveToken(res.token);
      saveUser(res.user || {});
      location.href = './home.html';
    } catch (err) {
      showMsg(err.message, 'error');
    }
  });


}

// home y crud
function initHome() {

  if (!getToken()) { location, replace('./index.html'); return; }
  
  document.getElementById('logout')?.addEventListener('click', () => {
    clearToken();
    clearUser();
    location.href = './index.html';
  });
  
  const form = document.getElementById('project-form');
  const toggleBtn = document.getElementById('toggle-form');
  toggleBtn?.addEventListener('click', () => (form.classList.toggle('hidden')));
  
  //crear / actualizar proyecto
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = getUser();
    
    const payload = {
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('description').value.trim(),
      userId: user._id || user._id,
      technologies: parseCSV(document.getElementById('technologies').value),
      repository: document.getElementById('repository').value.trim() || undefined,
      images: parseCSV(document.getElementById('images').value),
    };
    const id = (form.projectId?.value || '').trim();
    
    try {
      if (id) {
        // actualizar
        await request(`/projects/${id}`, {
          method: 'PUT',
          body: payload,
        });
        showMsg('Proyecto actualizado correctamente', 'success');
      } else {
        // crear
        await request('/projects', {
          method: 'POST',
          body: payload,
        });
        showMsg('Proyecto creado correctamente', 'success');
      }
      
      form.reset();
      form.projectId.value = '';
      form.classList.add('hidden');
      await renderProjects();
      
    } catch (err) {
      showMsg(err.message, 'error');
      if (err.message.includes('401')) {
        clearToken();
        clearUser();
        location.href = './index.html';
      }
    }
  });

  // cargar lista inicial 
  renderProjects();

}

async function renderProjects() {
  const panel = document.getElementById('projects-panel');
  const tpl = document.getElementById('project-tpl');

  panel.innerHTML = '<p>Cargando proyectos...</p>';

  try {

    const projects = await request('/projects', { method: 'GET' });

    panel.innerHTML = '';
    if (!Array.isArray(projects) || projects.length === 0) {
      panel.innerHTML = '<p>Sin proyectos we </p>';
      return;
    }
    
    projects.forEach((p) => {
      const el = tpl.content.firstElementChild.cloneNode(true);
      const id = p.id || p._id;

      el.dataset.id = id;
      el.querySelector('[data-title]').textContent = p.title ?? '(Sin título)';
      el.querySelector('[data-desc]').textContent  = p.description ?? '';

      // repo
      const a = el.querySelector('[data-url]');
      a.href = p.repository || '#';
      a.textContent = p.repository ? 'Repositorio' : '—';

      // imagen (toma la primera si existe)
      const imgEl = el.querySelector('[data-img]');
      const firstImg = Array.isArray(p.images) && p.images.length ? p.images[0] : '';
      if (firstImg) { imgEl.src = firstImg; imgEl.alt = p.title || 'Proyecto'; }
      else { imgEl.remove(); }

      // Editar: precarga el form
      el.querySelector('[data-edit]').addEventListener('click', () => {
        const form = document.getElementById('project-form');
        form.projectId.value    = id;
        form.title.value        = p.title || '';
        form.description.value  = p.description || '';
        form.technologies.value = (p.technologies || []).join(', ');
        form.repository.value   = p.repository || '';
        form.images.value       = (p.images || []).join(', ');
        form.classList.remove('hidden');
        form.querySelector('button[type="submit"]').textContent = 'Actualizar';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      // Eliminar
      el.querySelector('[data-del]').addEventListener('click', async () => {
        if (!confirm('¿Eliminar proyecto?')) return;
        try {
          await request(`/projects/${id}`, { method:'DELETE' });
          await renderProjects();
        } catch (err) {
          showMsg(err.message, 'error');
        }
      });

      panel.appendChild(el);
    });

  } catch (err) {
    panel.innerHTML = `<p class="msg error">Error cargando proyectos: ${err.message}</p>`;
    // Si es 401, limpia y regresa a login
    if (String(err).includes('401')) {
      clearToken(); clearUser(); location.href = './index.html';
    }
  }
}
        
        