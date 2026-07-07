function initYear() {
  var yearEl = document.getElementById("year");
  if (!yearEl) return;
  yearEl.textContent = String(new Date().getFullYear());
}

function getApiBase() {
  var saved = localStorage.getItem("eep_api_base");
  return (saved || "http://localhost:4000/api").replace(/\/$/, "");
}

async function api(path, opts) {
  var res = await fetch(getApiBase() + path, opts || {});
  var text = await res.text();
  var data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error((data && (data.message || data.error)) || "Request failed");
  }

  return data;
}

function setStatus(el, text, kind) {
  if (!el) return;
  el.textContent = text || "";
  el.classList.remove("is-ok", "is-error");
  if (kind === "ok") el.classList.add("is-ok");
  if (kind === "error") el.classList.add("is-error");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatLongDate(value) {
  if (!value) return "Sin fecha";
  var date = new Date(value);
  if (isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatEventDate(value) {
  if (!value) return "Fecha a confirmar";
  var date = new Date(value);
  if (isNaN(date.getTime())) return "Fecha a confirmar";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function revealStyle(index) {
  return 'style="--reveal-delay: ' + String(60 + index * 60) + 'ms"';
}

function renderNews(items) {
  var grid = document.getElementById("newsGrid");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML =
      '<article class="card status-card reveal is-visible"><h3 class="card-title">Todavia no hay noticias publicadas</h3><p class="card-text">Cuando el equipo institucional cargue novedades, van a aparecer aca automaticamente.</p></article>';
    return;
  }

  grid.innerHTML = items
    .map(function (item, index) {
      var resumen = item.resumen || item.contenido || "Sin resumen disponible.";
      return (
        '<article class="card reveal" ' + revealStyle(index) + '>' +
          '<div class="card-top">' +
            '<div class="chip">' + escapeHtml(item.categoria || "Institucional") + '</div>' +
            '<time class="card-date" datetime="' + escapeHtml(item.fecha || "") + '">' + escapeHtml(formatLongDate(item.fecha)) + '</time>' +
          '</div>' +
          '<h3 class="card-title">' + escapeHtml(item.titulo || "Sin titulo") + '</h3>' +
          '<p class="card-text">' + escapeHtml(resumen) + '</p>' +
          '<a class="card-link" href="#contacto">Solicitar mas informacion</a>' +
        '</article>'
      );
    })
    .join("");

  initReveal();
}

function renderEvents(items) {
  var grid = document.getElementById("eventsGrid");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML =
      '<article class="agenda-card status-card reveal is-visible"><h3 class="agenda-title">No hay eventos proximos cargados</h3><p class="agenda-text">La agenda institucional aparecera aca cuando se publiquen nuevas fechas.</p></article>';
    return;
  }

  grid.innerHTML = items
    .map(function (item, index) {
      return (
        '<article class="agenda-card reveal" ' + revealStyle(index) + '>' +
          '<div class="agenda-date">' + escapeHtml(formatEventDate(item.inicio)) + '</div>' +
          '<h3 class="agenda-title">' + escapeHtml(item.titulo || "Evento institucional") + '</h3>' +
          '<p class="agenda-text">' + escapeHtml(item.descripcion || "Sin descripcion disponible.") + '</p>' +
          '<div class="agenda-meta">' + escapeHtml(item.ubicacion || item.tipo || "Comunidad educativa") + '</div>' +
        '</article>'
      );
    })
    .join("");

  initReveal();
}

async function loadNoticias() {
  var grid = document.getElementById("newsGrid");
  if (!grid) return;

  try {
    var data = await api("/noticias");
    renderNews(Array.isArray(data) ? data.slice(0, 3) : []);
  } catch (e) {
    grid.innerHTML =
      '<article class="card status-card reveal is-visible"><h3 class="card-title">No pudimos cargar las novedades</h3><p class="card-text">Verifica que el backend este levantado y que la API responda correctamente.</p></article>';
  }
}

async function loadCalendario() {
  var grid = document.getElementById("eventsGrid");
  if (!grid) return;

  try {
    var data = await api("/calendario");
    renderEvents(Array.isArray(data) ? data.slice(0, 3) : []);
  } catch (e) {
    grid.innerHTML =
      '<article class="agenda-card status-card reveal is-visible"><h3 class="agenda-title">No pudimos cargar la agenda</h3><p class="agenda-text">Revisa la conexion con el backend para ver los proximos eventos.</p></article>';
  }
}

function initContactForm() {
  var form = document.getElementById("contactForm");
  var msg = document.getElementById("contactMsg");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    setStatus(msg, "Enviando consulta...", "");

    var payload = {
      nombre: form.nombre.value.trim(),
      email: form.email.value.trim(),
      motivo: form.motivo.value,
      mensaje: form.mensaje.value.trim()
    };

    try {
      await api("/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      form.reset();
      setStatus(msg, "Consulta enviada. Te responderan por los canales institucionales.", "ok");
    } catch (err) {
      setStatus(msg, err.message || "No se pudo enviar la consulta.", "error");
    }
  });
}

function initNavToggle() {
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    menu.classList.toggle("is-open", open);
  }

  toggle.addEventListener("click", function () {
    var isOpen = toggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    if (menu.contains(target) || toggle.contains(target)) return;
    setOpen(false);
  });

  menu.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    if (target.matches("a")) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
}

function initReveal() {
  var els = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (!els.length) return;

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    els.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var obs = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  els.forEach(function (el) {
    obs.observe(el);
  });
}

function initAuthHeader() {
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var STORAGE_LAST_PANEL = "eep_last_panel_path";
  var token = localStorage.getItem(STORAGE_TOKEN) || "";
  var userRaw = localStorage.getItem(STORAGE_USER);
  var user = null;
  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch (e) {
    user = null;
  }

  var loginLink = document.getElementById("loginLink");
  var panelLink = document.getElementById("panelLink");
  var logoutBtn = document.getElementById("logoutBtn");

  var isLoggedIn = Boolean(token && user);
  var roles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
  if (!Array.isArray(roles)) roles = [];
  var isStaff = roles.indexOf("superadmin") !== -1 || roles.indexOf("directivo") !== -1 || roles.indexOf("docente") !== -1;
  var lastPanelPath = sessionStorage.getItem(STORAGE_LAST_PANEL) || "";

  function defaultPanelPath() {
    if (roles.indexOf("docente") !== -1) return "pages/docente.html";
    if (roles.indexOf("superadmin") !== -1) return "pages/admin.html";
    if (roles.indexOf("directivo") !== -1) return "pages/directivo.html";
    return "pages/admin.html";
  }

  if (loginLink) loginLink.hidden = isLoggedIn;
  if (logoutBtn) logoutBtn.hidden = !isLoggedIn;
  if (panelLink) panelLink.hidden = !isStaff;
  if (panelLink && isStaff) panelLink.href = lastPanelPath || defaultPanelPath();

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      sessionStorage.removeItem(STORAGE_LAST_PANEL);
      if (loginLink) loginLink.hidden = false;
      if (panelLink) panelLink.hidden = true;
      logoutBtn.hidden = true;
    });
  }
}

initYear();
initNavToggle();
initReveal();
initAuthHeader();
loadNoticias();
loadCalendario();
initContactForm();
