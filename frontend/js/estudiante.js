(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var STORAGE_LAST_PANEL = "eep_last_panel_path";
  var state = {
    materias: [],
    selectedMateriaId: ""
  };

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
    if (window.EEPAuth) return window.EEPAuth.getApiBase();
    var saved = localStorage.getItem(STORAGE_API_BASE);
    return saved || "http://localhost:4000/api";
  }

  function getToken() {
    if (window.EEPAuth) return window.EEPAuth.getToken();
    return localStorage.getItem(STORAGE_TOKEN) || "";
  }

  function getUser() {
    if (window.EEPAuth) return window.EEPAuth.getUser();
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
    return roles;
  }

  function guard() {
    var u = getUser();
    var t = getToken();
    if (!u || !t) {
      window.location.href = "login.html";
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
      if (window.EEPAuth && window.EEPAuth.translateErrorMessage) {
        msg = window.EEPAuth.translateErrorMessage(msg, res.status);
      }
      if (res.status === 401) {
        if (window.EEPAuth) window.EEPAuth.clearSession();
        window.location.href = "login.html";
      }
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
    var base = a.nombre || (a.numero ? String(a.numero) + "o" : "Curso");
    var div = a.division ? " " + a.division : "";
    var turno = a.turno ? " · " + a.turno : "";
    return base + div + turno;
  }

  function materiaConAnioLabel(m) {
    if (!m) return "Materia";
    var materia = m.materia || "Materia";
    var anio = anioLabel(m.cursoId);
    var ciclo = m.cicloLectivo ? String(m.cicloLectivo) : "";
    var label = anio ? materia + " · " + anio : materia;
    return ciclo ? label + " · " + ciclo : label;
  }

  function initLogout() {
    var btn = $("#logout");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (window.EEPAuth) window.EEPAuth.clearSession();
      else {
        localStorage.removeItem(STORAGE_TOKEN);
        localStorage.removeItem(STORAGE_USER);
      }
      window.location.href = "../index.html";
    });
  }

  function renderMateriasNav() {
    var nav = $("#materiasNav");
    if (!nav) return;
    nav.innerHTML = "";

    if (!state.materias.length) {
      var empty = document.createElement("div");
      empty.className = "subject-item-meta";
      empty.textContent = "No hay materias asociadas todavía.";
      nav.appendChild(empty);
      return;
    }

    state.materias.forEach(function (m) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "subject-item" + (state.selectedMateriaId === String(m._id) ? " is-active" : "");

      var name = document.createElement("div");
      name.className = "subject-item-name";
      name.textContent = m.materia || "Materia";

      var meta = document.createElement("div");
      meta.className = "subject-item-meta";
      meta.textContent = [anioLabel(m.cursoId), m.cicloLectivo ? String(m.cicloLectivo) : ""].filter(Boolean).join(" · ");

      btn.appendChild(name);
      btn.appendChild(meta);
      btn.addEventListener("click", function () {
        state.selectedMateriaId = String(m._id || "");
        updateSelectedMateriaHeader();
        renderMateriasNav();
        loadContenido();
      });
      nav.appendChild(btn);
    });
  }

  function updateSelectedMateriaHeader() {
    var title = $("#selectedMateriaTitle");
    var meta = $("#selectedMateriaMeta");
    var selected = state.materias.find(function (m) {
      return String(m._id) === String(state.selectedMateriaId);
    });

    if (!title || !meta) return;

    if (!selected) {
      title.textContent = "Selecciona una materia";
      meta.textContent = "El contenido se filtra automáticamente por tu curso.";
      return;
    }

    title.textContent = selected.materia || "Materia";
    meta.textContent = [anioLabel(selected.cursoId), selected.cicloLectivo ? "Ciclo lectivo " + String(selected.cicloLectivo) : ""].filter(Boolean).join(" · ");
  }

  async function loadMaterias() {
    try {
      var cicloActual = new Date().getFullYear();
      var rows = await api("/materias-curso?cicloLectivo=" + encodeURIComponent(cicloActual), { method: "GET" });
      state.materias = Array.isArray(rows) ? rows : [];
      if (state.materias.length && !state.selectedMateriaId) state.selectedMateriaId = String(state.materias[0]._id || "");
      if (!state.materias.length) state.selectedMateriaId = "";
      updateSelectedMateriaHeader();
      renderMateriasNav();
    } catch (e) {
      state.materias = [];
      state.selectedMateriaId = "";
      updateSelectedMateriaHeader();
      renderMateriasNav();
    }
  }

  function renderCards(rows) {
    var wrap = $("#cards");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "card";
      empty.textContent = state.selectedMateriaId
        ? "Aún no hay contenido publicado para esta materia."
        : "No hay materias asociadas o todavía no tienen contenido publicado.";
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
      chip.textContent = materiaConAnioLabel(r.materiaCursoId);
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
      var curso = anioLabel((r.materiaCursoId && r.materiaCursoId.cursoId) || r.cursoId);
      var ciclo = r.materiaCursoId && r.materiaCursoId.cicloLectivo;
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
        var materia = state.selectedMateriaId;
        var tipo = $("#tipo").value;
        if (materia) q.push("materiaCursoId=" + encodeURIComponent(materia));
        if (tipo) q.push("tipo=" + encodeURIComponent(tipo));
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
      if (me && me.cursoId && typeof me.cursoId === "object") {
        var a = me.cursoId;
        var base = a.nombre || (a.numero ? String(a.numero) + "o" : "Curso");
        var div = a.division ? " " + a.division : "";
        label.textContent = "Tu curso: " + base + div;
      } else {
        label.textContent = "Tu curso: (sin asignar)";
      }
    } catch (e) {
        label.textContent = "Tu curso";
    }
  }

  function initFilters() {
    $("#tipo").addEventListener("change", loadContenido);
    $("#refresh").addEventListener("click", function () {
      loadMaterias().then(loadContenido);
    });
  }

  if (!guard()) return;
  rememberPanelPath();
  initLogout();
  initFilters();
  loadMaterias().then(loadContenido);
  loadAnioLabel();
})();
