(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var STORAGE_LAST_PANEL = "eep_last_panel_path";

  function $(sel) {
    return document.querySelector(sel);
  }

  function setMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("is-error", "is-ok");
    if (kind === "error") el.classList.add("is-error");
    if (kind === "ok") el.classList.add("is-ok");
  }

  function getApiBase() {
    var saved = localStorage.getItem(STORAGE_API_BASE);
    return saved || "http://localhost:4000/api";
  }

  function getToken() {
    return localStorage.getItem(STORAGE_TOKEN) || "";
  }

  function getUser() {
    var raw = localStorage.getItem(STORAGE_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function rememberPanelPath() {
    sessionStorage.setItem(STORAGE_LAST_PANEL, "pages/estudiante.html");
  }

  function rolesOf(u) {
    var roles = (u && (u.roles || (u.role ? [u.role] : []))) || [];
    if (!Array.isArray(roles)) return [];
    return roles.map(function (role) {
      return role === "comunidad-estudiantes" ? "estudiante" : role;
    });
  }

  function guard() {
    var u = getUser();
    var t = getToken();
    if (!u || !t) {
      window.location.href = "login-estudiante.html";
      return false;
    }
    var roles = rolesOf(u);
    if (roles.indexOf("estudiante") === -1) {
      if (roles.indexOf("docente") !== -1) window.location.href = "docente.html";
      else if (roles.indexOf("directivo") !== -1 || roles.indexOf("superadmin") !== -1) window.location.href = "directivo.html";
      else window.location.href = "../index.html";
      return false;
    }
    return true;
  }

  async function api(path, opts) {
    var base = getApiBase().replace(/\/$/, "");
    var url = base + path;
    var headers = Object.assign(
      { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      (opts && opts.headers) || {}
    );
    var res = await fetch(url, Object.assign({}, opts || {}, { headers: headers }));
    var text = await res.text();
    var data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { raw: text };
    }
    if (!res.ok) {
      var msg = (data && (data.message || data.error)) || res.statusText || "Request failed";
      throw new Error(msg);
    }
    return data;
  }

  function formatFecha(v) {
    if (!v) return "-";
    var d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return "-";
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yyyy = String(d.getFullYear());
    return dd + "/" + mm + "/" + yyyy;
  }

  function anioLabel(a) {
    if (!a) return "";
    var base = a.nombre || (a.numero ? String(a.numero) + "o" : "Anio");
    var div = a.division ? " " + a.division : "";
    var turno = a.turno ? " · " + a.turno : "";
    return base + div + turno;
  }

  function materiaConAnioLabel(m) {
    if (!m) return "Materia";
    var materia = m.materia || "Materia";
    var anio = anioLabel(m.anioId);
    var ciclo = m.cicloLectivo ? String(m.cicloLectivo) : "";
    var label = anio ? materia + " · " + anio : materia;
    return ciclo ? label + " · " + ciclo : label;
  }

  function initLogout() {
    var btn = $("#logout");
    if (!btn) return;
    btn.addEventListener("click", function () {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      window.location.href = "../index.html";
    });
  }

  async function loadMaterias() {
    var sel = $("#materia");
    if (!sel) return;
    sel.innerHTML = '<option value="">Todas</option>';
    try {
      var cicloActual = new Date().getFullYear();
      var rows = await api("/materias-anio?cicloLectivo=" + encodeURIComponent(cicloActual), { method: "GET" });
      (rows || []).forEach(function (m) {
        var opt = document.createElement("option");
        opt.value = m._id;
        opt.textContent = materiaConAnioLabel(m);
        sel.appendChild(opt);
      });
    } catch (e) {
      // ignore
    }
  }

  function renderCards(rows) {
    var wrap = $("#cards");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "card";
      empty.textContent = "Aun no hay contenido publicado para tu anio.";
      wrap.appendChild(empty);
      return;
    }
    rows.forEach(function (r) {
      var card = document.createElement("article");
      card.className = "card";
      var meta = document.createElement("div");
      meta.className = "meta";
      var chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = materiaConAnioLabel(r.materiaAnioId);
      var date = document.createElement("div");
      date.className = "date";
      date.textContent = formatFecha(r.fecha || r.createdAt);
      meta.appendChild(chip);
      meta.appendChild(date);

      var h = document.createElement("div");
      h.className = "title";
      h.textContent = r.titulo || "(sin titulo)";

      var p = document.createElement("p");
      p.className = "text";
      p.textContent = r.resumen || r.contenido || "";

      var by = document.createElement("div");
      by.className = "byline";
      var who = r.createdBy ? [r.createdBy.apellido, r.createdBy.nombre].filter(Boolean).join(", ") : "";
      var curso = anioLabel((r.materiaAnioId && r.materiaAnioId.anioId) || r.anioId);
      var ciclo = (r.materiaAnioId && r.materiaAnioId.cicloLectivo) || r.cicloLectivo;
      by.textContent = [r.tipo, curso, ciclo ? String(ciclo) : "", who].filter(Boolean).join(" · ");

      card.appendChild(meta);
      card.appendChild(h);
      card.appendChild(p);
      card.appendChild(by);
      wrap.appendChild(card);
    });
  }

  async function loadContenido() {
    var msg = $("#msg");
    setMsg(msg, "Cargando...", "");
    try {
      var q = [];
      var materia = $("#materia").value;
      var tipo = $("#tipo").value;
      var cicloActual = new Date().getFullYear();
      if (materia) q.push("materiaAnioId=" + encodeURIComponent(materia));
      if (tipo) q.push("tipo=" + encodeURIComponent(tipo));
      if (!materia) q.push("cicloLectivo=" + encodeURIComponent(cicloActual));
      var data = await api("/contenidos" + (q.length ? "?" + q.join("&") : ""), { method: "GET" });
      renderCards(Array.isArray(data) ? data : []);
      setMsg(msg, "OK", "ok");
    } catch (e) {
      setMsg(msg, e.message || "Error", "error");
    }
  }

  async function loadAnioLabel() {
    var label = $("#anioLabel");
    if (!label) return;
    try {
      var me = await api("/users/me", { method: "GET" });
      if (me && me.anioId && typeof me.anioId === "object") {
        var a = me.anioId;
        var base = a.nombre || (a.numero ? String(a.numero) + "o" : "Anio");
        var div = a.division ? " " + a.division : "";
        label.textContent = "Tu anio: " + base + div;
      } else {
        label.textContent = "Tu anio: (sin asignar)";
      }
    } catch (e) {
      label.textContent = "Tu anio";
    }
  }

  function initFilters() {
    $("#materia").addEventListener("change", loadContenido);
    $("#tipo").addEventListener("change", loadContenido);
    $("#refresh").addEventListener("click", loadContenido);
  }

  if (!guard()) return;
  rememberPanelPath();
  initLogout();
  initFilters();
  loadMaterias();
  loadAnioLabel();
  loadContenido();
})();
