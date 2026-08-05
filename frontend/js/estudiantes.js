(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";

  var state = {
    user: null,
    roles: [],
    directivoLike: false,
    docentes: [],
    anios: [],
    materias: []
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

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getApiBase() {
    if (window.EEPAuth) return window.EEPAuth.getApiBase();
    return localStorage.getItem(STORAGE_API_BASE) || "http://localhost:4001/api";
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

  function rolesOf(user) {
    var roles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
    return Array.isArray(roles) ? roles : [];
  }

  function hasRole(role) {
    return state.roles.indexOf(role) !== -1;
  }

  function injectIcons() {
    var icons = {
      home:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 11.2 12 4l8 7.2V20a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 20v-8.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.2 21.6v-6.2c0-.9.7-1.6 1.6-1.6h2.4c.9 0 1.6.7 1.6 1.6v6.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      posts:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 5h11C18.88 5 20 6.12 20 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-11C5.12 19 4 17.88 4 16.5v-9C4 6.12 5.12 5 6.5 5Z" stroke="currentColor" stroke-width="1.7"/><path d="M7.8 9h8.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7.8 12.5h5.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7.8 16h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      files:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3.8h7l3 3V20.2c0 .99-.81 1.8-1.8 1.8H7.8c-.99 0-1.8-.81-1.8-1.8V5.6c0-.99.81-1.8 1.8-1.8Z" stroke="currentColor" stroke-width="1.7"/><path d="M14 3.8v3.4h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.5 12h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.5 15.5h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      tasks:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 4.8h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 9.8h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 14.8h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 19.2h12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M3.8 5.2 4.6 6l1.8-1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.8 10.2 4.6 11l1.8-1.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      book:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 5.2h9.8a2.2 2.2 0 0 1 2.2 2.2v11.4a.8.8 0 0 1-1.2.7 4.3 4.3 0 0 0-2.1-.5H7.8A2.3 2.3 0 0 0 6 19.8V6.7c0-.83.67-1.5 1.5-1.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6 7.2a2 2 0 0 1 1.8-1h7.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      subjects:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5 4.5 8.7 12 12.4l7.5-3.7L12 5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7.2 10.7v3.5c0 .7.5 1.3 1.1 1.6.9.5 2.2 1 3.7 1s2.8-.5 3.7-1c.6-.3 1.1-.9 1.1-1.6v-3.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M19.5 8.8v4.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      news:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 6.2A2.2 2.2 0 0 1 7.2 4h9.6A2.2 2.2 0 0 1 19 6.2v11.6A2.2 2.2 0 0 1 16.8 20H7.2A2.2 2.2 0 0 1 5 17.8V6.2Z" stroke="currentColor" stroke-width="1.7"/><path d="M8.3 8.2h7.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.3 11.8h7.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.3 15.4h4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      calendar:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M17 3.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4.5 8.5h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M6.5 6.5h11c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2h-11c-1.1 0-2-.9-2-2v-10c0-1.1.9-2 2-2Z" stroke="currentColor" stroke-width="1.7"/></svg>',
      users:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.2 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" stroke-width="1.7"/><path d="M15.8 10.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z" stroke="currentColor" stroke-width="1.7"/><path d="M3.8 19.2c1.2-2.8 3.4-4.2 5.5-4.2 2 0 4.2 1.4 5.4 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M14.2 18.2c.8-1.8 2.2-2.8 3.8-2.8 1.1 0 2.2.5 3.2 1.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      user:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z" stroke="currentColor" stroke-width="1.7"/><path d="M4.8 20.2c1.6-3.6 4.6-5.4 7.2-5.4s5.6 1.8 7.2 5.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      logout:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 7V5.6c0-.99.81-1.8 1.8-1.8h6.4c.99 0 1.8.81 1.8 1.8v12.8c0 .99-.81 1.8-1.8 1.8h-6.4c-.99 0-1.8-.81-1.8-1.8V17" stroke="currentColor" stroke-width="1.7"/><path d="M4 12h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 9l-3 3 3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    Array.prototype.slice.call(document.querySelectorAll(".ico")).forEach(function (el) {
      var key = String(el.textContent || "").trim().replace(/[{}]/g, "");
      if (icons[key]) el.innerHTML = icons[key];
    });
  }

  function initSidebarToggle() {
    var toggle = $("#sideToggle");
    var sidebar = document.querySelector(".sidebar");
    if (!toggle || !sidebar) return;

    toggle.addEventListener("click", function () {
      sidebar.classList.toggle("is-open");
    });

    Array.prototype.slice.call(sidebar.querySelectorAll("a, button")).forEach(function (el) {
      el.addEventListener("click", function () {
        sidebar.classList.remove("is-open");
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") sidebar.classList.remove("is-open");
    });
  }

  function guard() {
    state.user = getUser();
    if (!state.user || !getToken()) {
      window.location.href = "login.html";
      return false;
    }
    state.roles = rolesOf(state.user);
    state.directivoLike = hasRole("directivo") || hasRole("superadmin");
    if (!state.directivoLike && !hasRole("docente")) {
      window.location.href = "../index.html";
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

  async function readCsvFile(file) {
    var buffer = await file.arrayBuffer();
    var bytes = new Uint8Array(buffer);

    function decode(label, fatal) {
      return new TextDecoder(label, { fatal: fatal }).decode(bytes);
    }

    try {
      return decode("utf-8", true);
    } catch (e) {
      return decode("windows-1252", false);
    }
  }

  function initHeader() {
    var sideTitle = $("#studentsSideTitle");
    var sideSub = $("#studentsSideSub");
    var topbarKicker = $("#studentsTopbarKicker");
    var navInicio = $("#studentsNavInicio");
    var navMateriales = $("#studentsNavMateriales");
    var navActividades = $("#studentsNavActividades");
    var navAcademicas = $("#studentsNavAcademicas");
    var navPerfil = $("#studentsNavPerfil");
    var navDocentes = $("#studentsNavDocentes");
    var navMaterias = $("#studentsNavMaterias");
    var navNoticias = $("#studentsNavNoticias");
    var navEventos = $("#studentsNavEventos");
    var navConsultas = $("#studentsNavConsultas");
    var navDocentePanel = $("#studentsNavDocentePanel");
    var roleIntro = $("#roleIntro");

    if (!state.directivoLike && hasRole("docente")) {
      if (sideTitle) sideTitle.textContent = "Panel Docente";
      if (sideSub) sideSub.textContent = "Escuela Experimental Porteña";
      if (topbarKicker) topbarKicker.textContent = "Docente";
      if (navInicio) navInicio.hidden = false;
      if (navMateriales) navMateriales.hidden = false;
      if (navActividades) navActividades.hidden = false;
      if (navAcademicas) navAcademicas.hidden = false;
      if (navPerfil) navPerfil.hidden = false;
      if (navDocentes) navDocentes.hidden = true;
      if (navMaterias) navMaterias.hidden = true;
      if (navNoticias) navNoticias.hidden = true;
      if (navEventos) navEventos.hidden = true;
      if (navConsultas) navConsultas.hidden = true;
      if (navDocentePanel) navDocentePanel.hidden = true;
    } else {
      if (sideTitle) sideTitle.textContent = "Panel Directivo";
      if (sideSub) sideSub.textContent = "Escuela Experimental Porteña";
      if (topbarKicker) topbarKicker.textContent = "Directivo";
      if (navInicio) navInicio.hidden = true;
      if (navMateriales) navMateriales.hidden = true;
      if (navActividades) navActividades.hidden = true;
      if (navAcademicas) navAcademicas.hidden = true;
      if (navPerfil) navPerfil.hidden = true;
      if (navDocentes) navDocentes.hidden = false;
      if (navMaterias) navMaterias.hidden = false;
      if (navNoticias) navNoticias.hidden = false;
      if (navEventos) navEventos.hidden = false;
      if (navConsultas) navConsultas.hidden = false;
      if (navDocentePanel) navDocentePanel.hidden = true;
    }

    if (roleIntro) {
      roleIntro.textContent = state.directivoLike
        ? "Puedes crear, editar, importar y filtrar todos los estudiantes por curso."
        : "Puedes consultar estudiantes de los cursos donde dictas materias.";
    }

    var staffLink = $("#staffLink");
    var docenteLink = $("#docenteLink");
    if (staffLink) staffLink.hidden = !hasRole("superadmin");
    if (docenteLink) docenteLink.hidden = !hasRole("docente");

    var nombreEl = $("#directivoNombre");
    if (nombreEl && state.user) {
      nombreEl.textContent = [state.user.nombre, state.user.apellido].filter(Boolean).join(" ") || state.user.email || "Gestion de estudiantes";
    }

    var studentForm = $("#studentForm");
    var importPanel = $("#studentsImportPanel");
    if (studentForm) studentForm.hidden = !state.directivoLike;
    if (importPanel) importPanel.hidden = !state.directivoLike;

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

  function fillSelect(sel, rows, getValue, getLabel, placeholder, includeAll) {
    if (!sel) return;
    var first = includeAll ? '<option value="">' + (placeholder || "Todos") + "</option>" : '<option value="" selected disabled>' + (placeholder || "Seleccionar") + "</option>";
    sel.innerHTML = first;
    rows.forEach(function (row) {
      var opt = document.createElement("option");
      opt.value = getValue(row);
      opt.textContent = getLabel(row);
      sel.appendChild(opt);
    });
  }

  function anioLabel(a) {
    if (!a) return "Curso";
    var base = a.nombre || (a.numero ? String(a.numero) + "o" : "Curso");
    var div = a.division ? " " + a.division : "";
    var turno = a.turno ? " · " + a.turno : "";
    return base + div + turno;
  }

  function toDateInputValue(v) {
    if (!v) return "";
    var d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return "";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function uniqueById(rows) {
    var seen = {};
    var out = [];
    (rows || []).forEach(function (row) {
      if (!row) return;
      var id = String(row._id || row.id || "");
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push(row);
    });
    return out;
  }

  function sortByLabel(rows, getLabel) {
    return rows.slice().sort(function (a, b) {
      return getLabel(a).localeCompare(getLabel(b), "es", { sensitivity: "base" });
    });
  }

  function renderCredentials(el, title, rows, passwordKey) {
    if (!el) return;
    if (!rows || !rows.length) {
      el.hidden = true;
      el.innerHTML = "";
      return;
    }
    var items = rows.map(function (row) {
      return "<li>" +
        (row.line ? "Linea " + escapeHtml(row.line) + " · " : "") +
        escapeHtml(row.email || row.dni || "") +
        " · " + escapeHtml(row[passwordKey] || row.password || "") +
        "</li>";
    }).join("");
    el.innerHTML = "<strong>" + escapeHtml(title) + "</strong><ul>" + items + "</ul>";
    el.hidden = false;
  }

  async function loadContext() {
    if (state.directivoLike) {
      var anios = await api("/cursos", { method: "GET" });
      state.anios = sortByLabel(uniqueById(anios || []), anioLabel);
    } else {
      var materiasDoc = await api("/materias-curso/mine", { method: "GET" });
      state.materias = Array.isArray(materiasDoc) ? materiasDoc : [];
      state.anios = sortByLabel(uniqueById(state.materias.map(function (m) { return m.cursoId; })), anioLabel);
    }

    fillSelect($("#sAnio"), state.anios, function (a) { return a._id; }, anioLabel, "Seleccionar", false);
    fillSelect($("#editStudentAnio"), state.anios, function (a) { return a._id; }, anioLabel, "Seleccionar", false);
    fillSelect($("#filterAnio"), state.anios, function (a) { return a._id; }, anioLabel, "Todos", true);
  }

  function buildStudentQuery() {
    var params = new URLSearchParams();
    var cursoId = $("#filterAnio") ? $("#filterAnio").value : "";
    var search = $("#filterSearch") ? $("#filterSearch").value.trim() : "";

    if (cursoId) params.set("cursoId", cursoId);
    if (search) params.set("search", search);

    var query = params.toString();
    return "/users/students" + (query ? "?" + query : "");
  }

  function renderStudents(rows) {
    var tbody = $("#studentsTbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!rows.length) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 6;
      td0.className = "table-empty";
      td0.textContent = "Sin estudiantes";
      tr0.appendChild(td0);
      tbody.appendChild(tr0);
      return;
    }

    rows.forEach(function (u) {
      var tr = document.createElement("tr");
      [u.nombre || "-", u.apellido || "-", u.dni || "-", u.cursoId ? anioLabel(u.cursoId) : "-", u.email || "-"].forEach(function (value) {
        var td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });

      var tdActions = document.createElement("td");
      if (state.directivoLike) {
        var btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.className = "btn btn-ghost";
        btnEdit.textContent = "Editar";
        btnEdit.style.padding = "0.5rem 0.7rem";
        btnEdit.style.fontSize = "0.9rem";
        btnEdit.addEventListener("click", function () {
          openEditModal(u);
        });

        var btnDelete = document.createElement("button");
        btnDelete.type = "button";
        btnDelete.className = "btn btn-secondary";
        btnDelete.textContent = "Eliminar";
        btnDelete.style.padding = "0.5rem 0.7rem";
        btnDelete.style.fontSize = "0.9rem";
        btnDelete.addEventListener("click", function () {
          deleteStudent(u);
        });

        tdActions.appendChild(btnEdit);
        tdActions.appendChild(btnDelete);
      } else {
        tdActions.textContent = "Solo lectura";
      }
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  }

  async function loadStudents() {
    var msg = $("#studentsListMsg");
    setMsg(msg, "Cargando estudiantes...", "");
    try {
      var rows = await api(buildStudentQuery(), { method: "GET" });
      renderStudents(Array.isArray(rows) ? rows : []);
      setMsg(msg, "OK", "ok");
    } catch (e) {
      renderStudents([]);
      setMsg(msg, e.message || "Error", "error");
    }
  }

  function initFilters() {
    var anio = $("#filterAnio");
    var apply = $("#applyFilters");
    var clear = $("#clearFilters");
    var refresh = $("#studentsRefresh");

    if (anio) anio.addEventListener("change", loadStudents);
    if (apply) apply.addEventListener("click", loadStudents);
    if (refresh) refresh.addEventListener("click", function () {
      loadContext().then(loadStudents).catch(function (e) {
        setMsg($("#studentsListMsg"), e.message || "Error", "error");
      });
    });
    if (clear) {
      clear.addEventListener("click", function () {
        if (anio) anio.value = "";
        if ($("#filterSearch")) $("#filterSearch").value = "";
        loadStudents();
      });
    }
  }

  function initCreateStudent() {
    var form = $("#studentForm");
    var msg = $("#studentMsg");
    var creds = $("#studentCreds");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msg, "Creando...", "");
      renderCredentials(creds, "", [], "password");
      try {
        var res = await api("/users/students", {
          method: "POST",
          body: JSON.stringify({
            nombre: $("#sNombre").value,
            apellido: $("#sApellido").value,
            dni: $("#sDni").value,
            fechaNacimiento: $("#sFecha").value,
            email: $("#sEmail").value,
            password: $("#sPass").value,
            cursoId: $("#sAnio").value
          })
        });
        form.reset();
        setMsg(msg, "Estudiante creado", "ok");
        if (res && res.generatedPassword) {
          renderCredentials(creds, "Password generado", [{ email: res.student && res.student.email, password: res.generatedPassword }], "password");
        }
        loadStudents();
      } catch (e2) {
        setMsg(msg, e2.message || "Error", "error");
      }
    });
  }

  function openEditModal(student) {
    var modal = $("#studentEditModal");
    if (!modal) return;
    $("#editStudentId").value = student._id || student.id;
    $("#editStudentNombre").value = student.nombre || "";
    $("#editStudentApellido").value = student.apellido || "";
    $("#editStudentDni").value = student.dni || "";
    $("#editStudentFecha").value = toDateInputValue(student.fechaNacimiento);
    $("#editStudentEmail").value = student.email || "";
    $("#editStudentPass").value = "";
    if (student.cursoId && student.cursoId._id) $("#editStudentAnio").value = student.cursoId._id;
    setMsg($("#studentEditMsg"), "", "");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeEditModal() {
    var modal = $("#studentEditModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function initEditModal() {
    var modal = $("#studentEditModal");
    var form = $("#studentEditForm");
    var msg = $("#studentEditMsg");
    if (!modal || !form) return;

    modal.addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      if (t.getAttribute("data-close") === "true") closeEditModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeEditModal();
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msg, "Guardando...", "");
      try {
        var payload = {
          nombre: $("#editStudentNombre").value,
          apellido: $("#editStudentApellido").value,
          dni: $("#editStudentDni").value,
          fechaNacimiento: $("#editStudentFecha").value,
          email: $("#editStudentEmail").value,
          password: $("#editStudentPass").value,
          cursoId: $("#editStudentAnio").value
        };
        if (!payload.password) delete payload.password;
        await api("/users/students/" + encodeURIComponent($("#editStudentId").value), {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setMsg(msg, "Actualizado", "ok");
        closeEditModal();
        loadStudents();
      } catch (e2) {
        setMsg(msg, e2.message || "Error", "error");
      }
    });
  }

  async function deleteStudent(student) {
    if (!confirm("Eliminar estudiante " + ((student.apellido || "") + ", " + (student.nombre || "")).trim() + "?")) return;
    var msg = $("#studentsListMsg");
    setMsg(msg, "Eliminando...", "");
    try {
      await api("/users/students/" + encodeURIComponent(student._id || student.id), { method: "DELETE" });
      setMsg(msg, "Eliminado", "ok");
      loadStudents();
    } catch (e) {
      setMsg(msg, e.message || "Error", "error");
    }
  }

  function initCsvImport() {
    var btn = $("#studentsImportBtn");
    var fileEl = $("#studentsCsvFile");
    var msg = $("#studentsImportMsg");
    var details = $("#studentsImportDetails");
    if (!btn || !fileEl) return;

    btn.addEventListener("click", async function () {
      setMsg(msg, "Leyendo archivo...", "");
      renderCredentials(details, "", [], "password");
      var f = fileEl.files && fileEl.files[0];
      if (!f) {
        setMsg(msg, "Selecciona un CSV", "error");
        return;
      }
      try {
        var text = await readCsvFile(f);
        setMsg(msg, "Importando...", "");
        var res = await api("/users/students/import-csv", {
          method: "POST",
          body: JSON.stringify({ csv: text })
        });
        setMsg(msg, "OK · creados: " + String(res.created || 0) + " · omitidos: " + String(res.skipped || 0), "ok");
        if (res && Array.isArray(res.credentials) && res.credentials.length) {
          renderCredentials(details, "Passwords generados", res.credentials, "password");
        }
        fileEl.value = "";
        loadStudents();
      } catch (e) {
        setMsg(msg, e.message || "Error", "error");
      }
    });
  }

  if (!guard()) return;
  injectIcons();
  initSidebarToggle();
  initHeader();
  initLogout();
  initFilters();
  initCreateStudent();
  initEditModal();
  initCsvImport();

  loadContext()
    .then(loadStudents)
    .catch(function (e) {
      setMsg($("#studentsListMsg"), e.message || "Error", "error");
    });
})();
