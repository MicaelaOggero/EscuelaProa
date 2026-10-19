(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var STORAGE_LAST_PANEL = "eep_last_panel_path";
  var state = {
    publicNews: [],
    publicEvents: [],
    canManagePublicContent: false,
    canAccessDirectivoPanel: false,
    canAccessSuperadminPanel: false,
    mySubjects: [],
    myContents: [],
    publicNewsVisibility: "",
    filters: {
      materials: { materia: "", curso: "", ciclo: "" },
      activities: { materia: "", curso: "", ciclo: "" }
    }
  };

  var eventCalendarState = {
    monthCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedId: ""
  };

  var pendingDeleteAction = null;

  function $(sel) {
    return document.querySelector(sel);
  }

  function $$ (sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
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
    if (window.EEPEnv) return window.EEPEnv.getApiBase();
    var saved = localStorage.getItem(STORAGE_API_BASE);
    return saved || "http://localhost:4001/api";
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
    sessionStorage.setItem(STORAGE_LAST_PANEL, "pages/docente.html");
  }

  function saveLS(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadLS(key, fallback) {
    var raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function dedupeByKey(rows, getKey) {
    var seen = {};
    var out = [];
    (rows || []).forEach(function (row) {
      var key = getKey(row);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(row);
    });
    return out;
  }

  function authGuard() {
    var user = getUser();
    var token = getToken();
    if (!user || !token) {
      window.location.href = "login.html";
      return false;
    }
    var roles = user.roles && user.roles.length ? user.roles : user.role ? [user.role] : [];
    state.canManagePublicContent = false;
    state.canAccessDirectivoPanel = roles.indexOf("directivo") !== -1 || roles.indexOf("superadmin") !== -1;
    state.canAccessSuperadminPanel = roles.indexOf("superadmin") !== -1;
    if (roles.indexOf("docente") === -1) {
      // Redirect to the right panel
      if (roles.indexOf("superadmin") !== -1) window.location.href = "directivo.html#staff";
      else if (roles.indexOf("directivo") !== -1) window.location.href = "directivo.html";
      else window.location.href = "../index.html";
      return false;
    }
    return true;
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
      calendar:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M17 3.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4.5 8.5h15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M6.5 6.5h11c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2h-11c-1.1 0-2-.9-2-2v-10c0-1.1.9-2 2-2Z" stroke="currentColor" stroke-width="1.7"/></svg>',
      users:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.2 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" stroke-width="1.7"/><path d="M15.8 10.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z" stroke="currentColor" stroke-width="1.7"/><path d="M3.8 19.2c1.2-2.8 3.4-4.2 5.5-4.2 2 0 4.2 1.4 5.4 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M14.2 18.2c.8-1.8 2.2-2.8 3.8-2.8 1.1 0 2.2.5 3.2 1.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      user:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z" stroke="currentColor" stroke-width="1.7"/><path d="M4.8 20.2c1.6-3.6 4.6-5.4 7.2-5.4s5.6 1.8 7.2 5.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      logout:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 7V5.6c0-.99.81-1.8 1.8-1.8h6.4c.99 0 1.8.81 1.8 1.8v12.8c0 .99-.81 1.8-1.8 1.8h-6.4c-.99 0-1.8-.81-1.8-1.8V17" stroke="currentColor" stroke-width="1.7"/><path d="M4 12h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 9l-3 3 3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    $$(".ico, .kpi-ico").forEach(function (el) {
      var t = (el.textContent || "").trim();
      var key = t.replace(/[{}]/g, "");
      if (icons[key]) el.innerHTML = icons[key];
    });
  }

  async function api(path, opts) {
    var base = getApiBase().replace(/\/$/, "");
    var url = base + path;
    var token = getToken();
    var body = opts && opts.body;
    var headers = Object.assign({}, (opts && opts.headers) || {}, token ? { Authorization: "Bearer " + token } : {});
    if (!(body instanceof FormData) && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
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
      var err = new Error(msg);
      err.status = res.status;
      err.data = data;
      if (res.status === 401) {
        if (window.EEPAuth) window.EEPAuth.clearSession();
        window.location.href = "login.html";
      }
      throw err;
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

  function formatFechaHora(v) {
    if (!v) return "-";
    var d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return "-";
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yyyy = String(d.getFullYear());
    var hh = String(d.getHours()).padStart(2, "0");
    var mi = String(d.getMinutes()).padStart(2, "0");
    return dd + "/" + mm + "/" + yyyy + " " + hh + ":" + mi;
  }

  function pad(v) {
    return String(v).padStart(2, "0");
  }

  function toDatetimeLocalValue(v) {
    if (!v) return "";
    var d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function resetNewsForm() {
    var form = $("#crearForm");
    if (!form) return;
    form.reset();
    $("#pubId").value = "";
    var submit = $("#pubSubmit");
    var cancel = $("#pubEditCancel");
    if (submit) submit.textContent = "Publicar";
    if (cancel) cancel.hidden = true;
  }

  function resetEventForm() {
    var form = $("#eventoForm");
    if (!form) return;
    form.reset();
    $("#eventoId").value = "";
    var submit = $("#eventoSubmit");
    var cancel = $("#eventoEditCancel");
    if (submit) submit.textContent = "Publicar evento";
    if (cancel) cancel.hidden = true;
  }

  function openNewsEdit(row) {
    $("#pubId").value = row._id || row.id || "";
    $("#pubTitulo").value = row.titulo || "";
    $("#pubCategoria").value = row.categoria || "Institucional";
    $("#pubResumen").value = row.resumen || "";
    $("#pubContenido").value = row.contenido || "";
    $("#pubDestacada").checked = !!row.destacada;
    $("#pubSubmit").textContent = "Guardar cambios";
    $("#pubEditCancel").hidden = false;
    openModal("#modalCrear");
    setMsg($("#crearMsg"), "Editando novedad...", "");
  }

  function openEventEdit(row) {
    $("#eventoId").value = row._id || row.id || "";
    $("#eventoTitulo").value = row.titulo || "";
    $("#eventoInicio").value = toDatetimeLocalValue(row.inicio);
    $("#eventoFin").value = toDatetimeLocalValue(row.fin);
    $("#eventoTipo").value = row.tipo || "";
    $("#eventoUbicacion").value = row.ubicacion || "";
    $("#eventoDesc").value = row.descripcion || "";
    $("#eventoSubmit").textContent = "Guardar cambios";
    $("#eventoEditCancel").hidden = false;
    openModal("#modalEventoPublico");
    setMsg($("#eventoMsg"), "Editando evento...", "");
  }

  function anioLabel(a) {
    if (!a) return "Curso";
    var base = a.nombre || (a.numero ? String(a.numero) + "o" : "Curso");
    var div = a.division ? " " + a.division : "";
    var turno = a.turno ? " · " + a.turno : "";
    return base + div + turno;
  }

  function monthShort(v) {
    if (!v) return "";
    var d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("es-AR", { month: "short" }).format(d).replace(".", "").toUpperCase();
  }

  function monthLabel(value) {
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(d);
  }

  function dayKey(value) {
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function timeLabel(value) {
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function cicloLabel(v) {
    return v ? String(v) : "-";
  }

  function materiaCursoLabel(row) {
    if (!row) return "Materia";
    return [row.materia || "Materia", anioLabel(row.cursoId), row.cicloLectivo ? String(row.cicloLectivo) : ""]
      .filter(Boolean)
      .join(" · ");
  }

  function materiaCursoIdOf(row) {
    if (!row) return "";
    return String(row._id || row.id || "");
  }

  function cursoIdOf(row) {
    if (!row || !row.cursoId) return "";
    return String(row.cursoId._id || row.cursoId.id || row.cursoId || "");
  }

  function materiaNombreOf(row) {
    return row && row.materia ? String(row.materia) : "";
  }

  function cicloOf(row) {
    return row && row.cicloLectivo ? String(row.cicloLectivo) : "";
  }

  function fillFilterSelect(select, rows, getValue, getLabel, emptyLabel) {
    if (!select) return;
    var current = select.value;
    select.innerHTML = '<option value="">' + emptyLabel + '</option>';
    rows.forEach(function (row) {
      var option = document.createElement("option");
      option.value = getValue(row);
      option.textContent = getLabel(row);
      select.appendChild(option);
    });
    select.value = rows.some(function (row) { return getValue(row) === current; }) ? current : "";
  }

  function uniqueStrings(values) {
    var seen = {};
    return values.filter(function (value) {
      var key = String(value || "");
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function syncContentFilters() {
    var materias = state.mySubjects.slice().sort(function (a, b) {
      return materiaCursoLabel(a).localeCompare(materiaCursoLabel(b), "es", { sensitivity: "base" });
    });
    var cursos = dedupeByKey(state.mySubjects, cursoIdOf).sort(function (a, b) {
      return anioLabel(a.cursoId).localeCompare(anioLabel(b.cursoId), "es", { sensitivity: "base" });
    });
    var ciclos = uniqueStrings(state.mySubjects.map(cicloOf)).sort(function (a, b) {
      return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
    });

    fillFilterSelect($("#materialsMateriaFilter"), materias, materiaCursoIdOf, materiaCursoLabel, "Todas");
    fillFilterSelect($("#materialsCursoFilter"), cursos, function (row) { return cursoIdOf(row); }, function (row) { return anioLabel(row.cursoId); }, "Todos");
    fillFilterSelect($("#materialsCicloFilter"), ciclos, function (value) { return value; }, function (value) { return value; }, "Todos");

    fillFilterSelect($("#activitiesMateriaFilter"), materias, materiaCursoIdOf, materiaCursoLabel, "Todas");
    fillFilterSelect($("#activitiesCursoFilter"), cursos, function (row) { return cursoIdOf(row); }, function (row) { return anioLabel(row.cursoId); }, "Todos");
    fillFilterSelect($("#activitiesCicloFilter"), ciclos, function (value) { return value; }, function (value) { return value; }, "Todos");
  }

  function applyContentFilters(items, filterKey) {
    var filters = state.filters[filterKey] || { materia: "", curso: "", ciclo: "" };
    return (items || []).filter(function (row) {
      var subject = row && row.materiaCursoId;
      if (!subject) return false;
      if (filters.materia && materiaCursoIdOf(subject) !== filters.materia) return false;
      if (filters.curso && cursoIdOf(subject) !== filters.curso) return false;
      if (filters.ciclo && cicloOf(subject) !== filters.ciclo) return false;
      return true;
    });
  }

  function renderFilteredContent() {
    var mats = state.myContents.filter(function (row) {
      return row.tipo === "material";
    }).sort(function (a, b) {
      return new Date(b.fecha || b.createdAt || 0).getTime() - new Date(a.fecha || a.createdAt || 0).getTime();
    });
    var acts = state.myContents.filter(function (row) {
      return row.tipo === "actividad";
    }).sort(function (a, b) {
      return new Date(a.fecha || a.createdAt || 0).getTime() - new Date(b.fecha || b.createdAt || 0).getTime();
    });

    renderMaterials(applyContentFilters(mats, "materials"));
    renderStudentActivities(applyContentFilters(acts, "activities"));
  }

  function contentFileUrl(file) {
    if (!file || !file.url) return "";
    if (/^https?:\/\//i.test(file.url)) return file.url;
    var origin = getApiBase().replace(/\/api\/?$/, "").replace(/\/$/, "");
    return origin + (String(file.url).charAt(0) === "/" ? file.url : "/" + file.url);
  }

  function renderArchivosMeta(row) {
    var archivos = Array.isArray(row && row.archivos) ? row.archivos : [];
    if (!archivos.length) return "Sin adjuntos";
    if (archivos.length === 1) return archivos[0].name || "1 archivo";
    return String(archivos.length) + " archivos";
  }

  function syncSubjectSelects() {
    ["#matMateriaCurso", "#actMateriaCurso", "#acadMateriaCurso", "#acadEventMateriaCurso"].forEach(function (selector) {
      var select = $(selector);
      if (!select) return;
      var current = select.value;
      select.innerHTML = '<option value="" selected disabled>Seleccionar materia</option>';
      state.mySubjects.forEach(function (row) {
        var option = document.createElement("option");
        option.value = row._id || row.id || "";
        option.textContent = materiaCursoLabel(row);
        select.appendChild(option);
      });
      if (current && state.mySubjects.some(function (row) { return String(row._id || row.id || "") === current; })) {
        select.value = current;
      }
    });
  }

  async function refreshMyContents() {
    try {
      var rows = await api("/contenidos/mine", { method: "GET" });
      state.myContents = Array.isArray(rows) ? rows : [];
    } catch (err) {
      state.myContents = [];
    }
  }

  function requestDeleteConfirmation(message, action) {
    pendingDeleteAction = action;
    $("#deleteConfirmMessage").textContent = message;
    openModal("#deleteConfirmModal");
  }

  async function deleteContenido(row, confirmed) {
    var kind = row && row.tipo === "actividad" ? "actividad" : row && row.tipo === "publicacion" ? "publicacion" : "material";
    if (!confirmed) {
      requestDeleteConfirmation("¿Querés eliminar " + kind + " '" + ((row && row.titulo) || "") + "'?", function () {
        return deleteContenido(row, true);
      });
      return;
    }
    var msg = kind === "actividad" ? $("#actMsg") : kind === "publicacion" ? $("#academicMsg") : $("#matMsg");
    setMsg(msg, "Eliminando...", "");
    try {
      await api("/contenidos/" + encodeURIComponent(row._id || row.id), { method: "DELETE" });
      await refreshAll();
      setMsg(msg, kind === "actividad" ? "Actividad eliminada" : kind === "publicacion" ? "Publicación eliminada" : "Material eliminado", "ok");
    } catch (err) {
      setMsg(msg, err.message || "Error", "error");
    }
  }

  function isAcademicEvent(row) {
    return !!(row && row.materiaCursoId);
  }

  function resetAcademicEventForm() {
    var form = $("#acadEventForm");
    if (!form) return;
    form.reset();
    $("#acadEventId").value = "";
    var submit = $("#acadEventSubmit");
    var cancel = $("#acadEventCancel");
    if (submit) submit.textContent = "Publicar evento";
    if (cancel) cancel.hidden = true;
  }

  function openAcademicEventEdit(row) {
    $("#acadEventId").value = row._id || row.id || "";
    $("#acadEventMateriaCurso").value = (row.materiaCursoId && (row.materiaCursoId._id || row.materiaCursoId.id)) || "";
    $("#acadEventTitulo").value = row.titulo || "";
    $("#acadEventInicio").value = toDatetimeLocalValue(row.inicio);
    $("#acadEventFin").value = toDatetimeLocalValue(row.fin);
    $("#acadEventTipo").value = row.tipo || "";
    $("#acadEventUbicacion").value = row.ubicacion || "";
    $("#acadEventDesc").value = row.descripcion || "";
    $("#acadEventSubmit").textContent = "Guardar cambios";
    $("#acadEventCancel").hidden = false;
    openModal("#modalEventoAcademico");
    setMsg($("#acadEventMsg"), "Editando evento para estudiantes...", "");
  }

  function resetAcademicPostForm() {
    var form = $("#acadForm");
    if (!form) return;
    form.reset();
    $("#acadId").value = "";
    $("#acadTitle").textContent = "Crear publicación para estudiantes";
    $("#acadSubmit").textContent = "Publicar";
    $("#acadCurrentFile").textContent = "";
    $("#acadCurrentFile").hidden = true;
    $("#acadRemoveFile").checked = false;
    $("#acadRemoveFileWrap").hidden = true;
    setMsg($("#acadFormMsg"), "", "");
  }

  function openAcademicPostEdit(row) {
    $("#acadId").value = row._id || row.id || "";
    $("#acadMateriaCurso").value = (row.materiaCursoId && (row.materiaCursoId._id || row.materiaCursoId.id)) || "";
    $("#acadTitulo").value = row.titulo || "";
    $("#acadResumen").value = row.resumen || "";
    $("#acadContenido").value = row.contenido || "";
    $("#acadAdjunto").value = "";
    var publicationFiles = Array.isArray(row.archivos) ? row.archivos.filter(function (file) {
      return !!(file && file.name);
    }) : [];
    $("#acadCurrentFile").textContent = publicationFiles.length
      ? "Archivo actual: " + publicationFiles.map(function (file) { return file.name; }).join(", ")
      : "Esta publicación no tiene un archivo adjunto actualmente.";
    $("#acadCurrentFile").hidden = false;
    $("#acadRemoveFile").checked = false;
    $("#acadRemoveFileWrap").hidden = !publicationFiles.length;
    $("#acadTitle").textContent = "Editar publicación para estudiantes";
    $("#acadSubmit").textContent = "Guardar cambios";
    openModal("#modalPublicacionAcademica");
    setMsg($("#acadFormMsg"), "Editando publicación...", "");
  }

  function openContentDetail(kind, row) {
    if (!row) return;
    var title = row.titulo || (kind === "actividad" ? "Actividad" : kind === "material" ? "Material" : "Publicación");
    var meta = kind === "evento"
      ? [row.tipo || "Evento", formatFechaHora(row.inicio), row.ubicacion].filter(Boolean).join(" Â· ")
      : [materiaCursoLabel(row.materiaCursoId), row.categoria, formatFechaHora(row.fecha || row.createdAt)].filter(Boolean).join(" Â· ");
    var content = kind === "evento"
      ? row.descripcion
      : [row.resumen, row.contenido].filter(Boolean).join("\n\n");

    $("#contentDetailTitle").textContent = title;
    $("#contentDetailMeta").textContent = meta || "";
    $("#contentDetailBody").textContent = content || "Sin contenido adicional.";
    var files = Array.isArray(row.archivos) ? row.archivos.filter(function (file) {
      return !!(file && file.url);
    }) : [];
    var filesWrap = $("#contentDetailFiles");
    filesWrap.innerHTML = "";
    files.forEach(function (file) {
      var link = document.createElement("a");
      link.className = "file-link";
      link.href = contentFileUrl(file);
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.textContent = file.name || "Adjunto";
      filesWrap.appendChild(link);
    });
    filesWrap.hidden = !files.length;
    openModal("#contentDetailModal");
  }

  function renderAcademicPosts(items, events) {
    var list = $("#academicPostsList");
    if (!list) return;
    list.innerHTML = "";
    var rows = [];
    (items || []).forEach(function (row) {
      rows.push({ kind: "publicacion", row: row, date: row.fecha || row.createdAt || null });
    });
    (events || []).forEach(function (row) {
      rows.push({ kind: "evento", row: row, date: row.inicio || row.createdAt || null });
    });
    rows.sort(function (a, b) {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });

    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Aún no hay publicaciones ni eventos para estudiantes.";
      list.appendChild(empty);
      return;
    }

    rows.forEach(function (entry) {
      var row = entry.row;
      var div = document.createElement("div");
      div.className = "item";
      div.classList.add("content-summary-item");
      div.addEventListener("click", function () {
        if (entry.kind === "evento") openDocenteEventoDetalle(row);
        else openContentDetail("publicacion", row);
      });
      var left = document.createElement("div");
      var t = document.createElement("div");
      t.className = "item-title";
      t.textContent = row.titulo || (entry.kind === "evento" ? "Evento" : "Publicación");
      var s = document.createElement("div");
      s.className = "item-sub";
      s.textContent = entry.kind === "evento"
        ? [materiaCursoLabel(row.materiaCursoId), row.tipo || "Evento", row.descripcion || row.ubicacion || "Sin detalle"].filter(Boolean).join(" · ")
        : [materiaCursoLabel(row.materiaCursoId), row.resumen || row.contenido || "Sin contenido"].filter(Boolean).join(" · ");
      left.appendChild(t);
      left.appendChild(s);
      s.hidden = true;

      var meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = formatFechaHora(entry.kind === "evento" ? (row.inicio || row.createdAt) : (row.fecha || row.createdAt));
      var created = document.createElement("div");
      created.className = "item-created";
      created.textContent = "Creado: " + formatFechaHora(row.createdAt || (entry.kind === "evento" ? row.inicio : row.fecha));
      left.appendChild(created);

      var actions = document.createElement("div");
      actions.className = "item-actions";
      if (entry.kind === "evento") {
        var edit = document.createElement("button");
        edit.type = "button";
        edit.className = "btn btn-ghost btn-sm";
        edit.textContent = "Editar";
        edit.addEventListener("click", function (event) {
          event.stopPropagation();
          openAcademicEventEdit(row);
        });
        actions.appendChild(edit);
      } else if (entry.kind === "publicacion") {
        var editPost = document.createElement("button");
        editPost.type = "button";
        editPost.className = "btn btn-ghost btn-sm";
        editPost.textContent = "Editar";
        editPost.addEventListener("click", function (event) {
          event.stopPropagation();
          openAcademicPostEdit(row);
        });
        actions.appendChild(editPost);
      }
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-secondary btn-sm";
      del.textContent = "Eliminar";
      del.addEventListener("click", function (event) {
        event.stopPropagation();
        if (entry.kind === "evento") deleteEvent(row);
        else deleteContenido(row);
      });
      actions.appendChild(del);

      div.appendChild(left);
      div.appendChild(meta);
      div.appendChild(actions);
      list.appendChild(div);
    });
  }

  function openModal(id) {
    var modal = $(id);
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function initModals() {
    $$("[data-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var t = btn.getAttribute("data-open");
        if (t === "crear") {
          resetNewsForm();
          setMsg($("#crearMsg"), "", "");
          openModal("#modalCrear");
        }
        if (t === "material") {
          resetMaterialForm();
          openModal("#modalMaterial");
        }
        if (t === "actividad") {
          resetActivityForm();
          openModal("#modalActividad");
        }
        if (t === "publicacion-academica") openModal("#modalPublicacionAcademica");
        if (t === "evento-academico") openModal("#modalEventoAcademico");
        if (t === "evento-publico") {
          resetEventForm();
          setMsg($("#eventoMsg"), "", "");
          openModal("#modalEventoPublico");
        }
      });
    });

    var openCrearPub = $("#openCrearPub");
    var openCrearEvento = $("#openCrearEvento");
    var openSubirMat = $("#openSubirMat");
    var openCrearAct = $("#openCrearAct");
    var openCrearAcad = $("#openCrearAcad");
    var openCrearAcadEvent = $("#openCrearAcadEvent");
    if (openCrearPub) openCrearPub.addEventListener("click", function () {
      resetNewsForm();
      setMsg($("#crearMsg"), "", "");
      openModal("#modalCrear");
    });
    if (openCrearEvento) openCrearEvento.addEventListener("click", function () {
      resetEventForm();
      setMsg($("#eventoMsg"), "", "");
      openModal("#modalEventoPublico");
    });
    if (openSubirMat) openSubirMat.addEventListener("click", function () {
      resetMaterialForm();
      openModal("#modalMaterial");
    });
    if (openCrearAct) openCrearAct.addEventListener("click", function () {
      resetActivityForm();
      openModal("#modalActividad");
    });
    if (openCrearAcad) openCrearAcad.addEventListener("click", function () { openModal("#modalPublicacionAcademica"); });
    if (openCrearAcadEvent) openCrearAcadEvent.addEventListener("click", function () { openModal("#modalEventoAcademico"); });

    $$(".modal").forEach(function (m) {
      m.addEventListener("click", function (e) {
        var t = e.target;
        if (!(t instanceof Element)) return;
        if (t.getAttribute("data-close") === "true") {
          if (m.id === "deleteConfirmModal") pendingDeleteAction = null;
          closeModal(m);
        }
      });
    });

    var deleteConfirm = $("#deleteConfirmConfirm");
    if (deleteConfirm) deleteConfirm.addEventListener("click", async function () {
      var action = pendingDeleteAction;
      pendingDeleteAction = null;
      closeModal($("#deleteConfirmModal"));
      if (action) await action();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      $$(".modal.is-open").forEach(function (m) {
        if (m.id === "deleteConfirmModal") pendingDeleteAction = null;
        closeModal(m);
      });
    });
  }

  function initSidebarNav() {
    function show(view) {
      if (!state.canManagePublicContent && (view === "publicaciones" || view === "calendario")) {
        view = "inicio";
      }
      $$(".view").forEach(function (v) {
        v.classList.toggle("is-visible", v.getAttribute("data-view") === view);
      });
      $$(".side-link").forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("data-view") === view);
      });
    }

    $$(".side-link[data-view]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        show(a.getAttribute("data-view"));
        closeMobileSidebar();
      });
    });

    $$("[data-viewlink]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        show(a.getAttribute("data-viewlink"));
      });
    });

    var hash = (window.location.hash || "").replace("#", "");
    if (hash) show(hash);
  }

  function closeMobileSidebar() {
    var side = $(".sidebar");
    if (side) side.classList.remove("is-open");
  }

  function initSideToggle() {
    var btn = $("#sideToggle");
    var side = $(".sidebar");
    if (!btn || !side) return;
    btn.addEventListener("click", function () {
      side.classList.toggle("is-open");
    });
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      if (side.contains(t) || btn.contains(t)) return;
      side.classList.remove("is-open");
    });
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

  function initContentFilters() {
    [
      ["#materialsMateriaFilter", "materials", "materia"],
      ["#materialsCursoFilter", "materials", "curso"],
      ["#materialsCicloFilter", "materials", "ciclo"],
      ["#activitiesMateriaFilter", "activities", "materia"],
      ["#activitiesCursoFilter", "activities", "curso"],
      ["#activitiesCicloFilter", "activities", "ciclo"]
    ].forEach(function (entry) {
      var el = $(entry[0]);
      if (!el) return;
      el.addEventListener("change", function () {
        state.filters[entry[1]][entry[2]] = el.value || "";
        renderFilteredContent();
      });
    });
  }

  function renderRecentPosts(rows) {
    var tbody = $("#recentTbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!rows.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 3;
      td.className = "table-empty";
      td.textContent = "Aún no hay novedades públicas";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    rows.slice(0, 5).forEach(function (p) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = p.titulo + (p.tipo === "privada" ? " · Privada" : "");
      var td2 = document.createElement("td");
      td2.textContent = p.categoria;
      var td3 = document.createElement("td");
      td3.textContent = formatFecha(p.fecha);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tr.classList.add("content-summary-item");
      tr.addEventListener("click", function () { openContentDetail("publicacion", p); });
      tbody.appendChild(tr);
    });
  }

  function renderDocenteNews(rows) {
    var list = $("#docenteNewsList");
    if (!list) return;
    list.innerHTML = "";

    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Todavía no hay comunicados disponibles.";
      list.appendChild(empty);
      return;
    }

    rows.slice(0, 5).forEach(function (row) {
      var item = document.createElement("div");
      item.className = "item";
      item.classList.add("content-summary-item");
      item.addEventListener("click", function () { openContentDetail("publicacion", row); });
      var left = document.createElement("div");
      var title = document.createElement("div");
      title.className = "item-title";
      title.textContent = row.titulo || "Noticia";
      var sub = document.createElement("div");
      sub.className = "item-sub";
      sub.textContent = (row.resumen || row.contenido || "Sin resumen disponible.") + (row.tipo === "privada" ? " · Privada para docentes" : " · Pública");
      var created = document.createElement("div");
      created.className = "item-created";
      created.textContent = "Creado: " + formatFechaHora(row.createdAt || row.fecha);
      left.appendChild(title);
      left.appendChild(sub);
      sub.hidden = true;
      item.appendChild(left);
      item.appendChild(created);
      list.appendChild(item);
    });
  }

  function renderAssignedSubjects(items) {
    var list = $("#assignedSubjects");
    if (!list) return;
    list.innerHTML = "";
    if (!items.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Todavía no tienes materias asignadas.";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (row) {
      var div = document.createElement("div");
      div.className = "item";
      var left = document.createElement("div");
      var t = document.createElement("div");
      t.className = "item-title";
      t.textContent = row.materia || "Materia";
      var s = document.createElement("div");
      s.className = "item-sub";
      s.textContent = anioLabel(row.cursoId) + " · Ciclo " + cicloLabel(row.cicloLectivo);
      left.appendChild(t);
      left.appendChild(s);
      div.appendChild(left);
      list.appendChild(div);
    });
  }

  function currentMonthEvents(items) {
    var y = eventCalendarState.monthCursor.getFullYear();
    var m = eventCalendarState.monthCursor.getMonth();
    return (items || []).filter(function (row) {
      var d = new Date(row.inicio);
      return !isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m;
    }).sort(function (a, b) {
      return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
    });
  }

  function openDocenteEventoDetalle(row) {
    if (!row) {
      eventCalendarState.selectedId = "";
      $("#docenteEventoTitle").textContent = "Detalle del evento";
      $("#docenteEventoMeta").textContent = "-";
      $("#docenteEventoVisibilidad").textContent = "-";
      $("#docenteEventoUbicacion").textContent = "-";
      $("#docenteEventoRoles").textContent = "-";
      $("#docenteEventoDescripcion").textContent = "-";
      return;
    }
    eventCalendarState.selectedId = String(row._id || row.id || "");
    $("#docenteEventoTitle").textContent = row.titulo || "Evento";
    $("#docenteEventoMeta").textContent = [row.tipo || "Evento", formatFechaHora(row.inicio)].filter(Boolean).join(" · ");
    $("#docenteEventoVisibilidad").textContent = isAcademicEvent(row) ? "Para estudiantes" : row.visibilidad === "privado" ? "Privado" : "Público";
    $("#docenteEventoUbicacion").textContent = row.ubicacion || "Sin ubicación definida";
    $("#docenteEventoRoles").textContent = isAcademicEvent(row)
      ? materiaCursoLabel(row.materiaCursoId)
      : row.visibilidad === "privado"
        ? ((row.visibleParaRoles || []).length ? row.visibleParaRoles.join(", ") : "Sin roles asignados")
        : "Toda la comunidad";
    $("#docenteEventoDescripcion").textContent = row.descripcion || "Sin descripción adicional.";
    openModal("#docenteEventoDetalleModal");
  }

  function renderDocenteCalendar(items) {
    var root = $("#docenteCalendar");
    var label = $("#docenteMesLabel");
    if (!root) return;
    root.innerHTML = "";
    if (label) label.textContent = monthLabel(eventCalendarState.monthCursor);

    ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].forEach(function (day) {
      var head = document.createElement("div");
      head.className = "calendar-weekday";
      head.textContent = day;
      root.appendChild(head);
    });

    var monthStart = new Date(eventCalendarState.monthCursor.getFullYear(), eventCalendarState.monthCursor.getMonth(), 1);
    var startOffset = (monthStart.getDay() + 6) % 7;
    var gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - startOffset);
    var todayKey = dayKey(new Date());

    for (var i = 0; i < 42; i += 1) {
      var cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      var key = dayKey(cellDate);
      var dayRows = (items || []).filter(function (row) {
        return dayKey(row.inicio) === key;
      });

      var cell = document.createElement("div");
      cell.className = "calendar-day";
      if (cellDate.getMonth() !== eventCalendarState.monthCursor.getMonth()) cell.classList.add("is-other-month");
      if (key === todayKey) cell.classList.add("is-today");

      var headRow = document.createElement("div");
      headRow.className = "calendar-day-head";
      var num = document.createElement("div");
      num.className = "calendar-day-number";
      num.textContent = String(cellDate.getDate());
      var count = document.createElement("div");
      count.className = "calendar-day-count";
      count.textContent = dayRows.length ? String(dayRows.length) : "";
      headRow.appendChild(num);
      headRow.appendChild(count);

      var eventsWrap = document.createElement("div");
      eventsWrap.className = "calendar-events";
      dayRows.slice(0, 3).forEach(function (row) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar-event-pill calendar-event-pill--" + (row.visibilidad === "privado" ? "privado" : "publico");
        btn.innerHTML = '<span class="calendar-event-time">' + timeLabel(row.inicio) + '</span><span class="calendar-event-title">' + row.titulo + '</span>';
        btn.addEventListener("click", function () {
          openDocenteEventoDetalle(row);
        });
        eventsWrap.appendChild(btn);
      });
      cell.appendChild(headRow);
      cell.appendChild(eventsWrap);
      root.appendChild(cell);
    }
  }

  function renderRecentWork(materials, activities) {
    var list = $("#recentWork");
    if (!list) return;
    list.innerHTML = "";
    var rows = [];
    (materials || []).forEach(function (m) {
      rows.push({
        title: m.titulo || "Material",
        sub: [materiaCursoLabel(m.materiaCursoId), m.resumen || m.contenido || renderArchivosMeta(m)].filter(Boolean).join(" · "),
        meta: m.fecha || m.createdAt || null
      });
    });
    (activities || []).forEach(function (a) {
      rows.push({
        title: a.titulo || "Actividad",
        sub: [materiaCursoLabel(a.materiaCursoId), a.resumen || a.contenido || "Actividad para estudiantes"].filter(Boolean).join(" · "),
        meta: a.fecha || a.createdAt || null
      });
    });
    rows.sort(function (a, b) {
      return new Date(b.meta || 0).getTime() - new Date(a.meta || 0).getTime();
    });

    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Todavía no hay materiales ni actividades cargadas.";
      list.appendChild(empty);
      return;
    }

    rows.slice(0, 4).forEach(function (row) {
      var div = document.createElement("div");
      div.className = "item";
      var t = document.createElement("div");
      t.className = "item-title";
      t.textContent = row.title;
      div.appendChild(t);
      list.appendChild(div);
    });
  }

  function filterPublicNewsRows(rows) {
    var visibility = state.publicNewsVisibility;
    return (rows || []).filter(function (row) {
      return !visibility || (row && row.tipo ? row.tipo : "publica") === visibility;
    });
  }

  function renderMyPosts(rows) {
    var tbody = $("#postsTbody");
    if (!tbody) return;
    rows = filterPublicNewsRows(rows);
    tbody.innerHTML = "";

    if (!rows.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 4;
      td.className = "table-empty";
      td.textContent = "Sin novedades publicadas";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    rows.forEach(function (p) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = p.titulo;
      var td2 = document.createElement("td");
      td2.textContent = p.categoria;
      var td3 = document.createElement("td");
      td3.textContent = formatFecha(p.fecha);
      var td4 = document.createElement("td");
      td4.textContent = formatFechaHora(p.createdAt || p.fecha);
      var td5 = document.createElement("td");
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn-ghost";
      edit.textContent = "Editar";
      edit.style.padding = "0.5rem 0.7rem";
      edit.style.fontSize = "0.9rem";
      edit.addEventListener("click", function (event) {
        openNewsEdit(p);
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-secondary";
      del.textContent = "Eliminar";
      del.style.padding = "0.5rem 0.7rem";
      del.style.fontSize = "0.9rem";
      del.addEventListener("click", function (event) {
        deletePost(p);
      });
      td5.appendChild(edit);
      td5.appendChild(del);

      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tr.appendChild(td4);
      tr.appendChild(td5);
      tr.classList.add("content-summary-item");
      tr.addEventListener("click", function () { openContentDetail("publicacion", p); });
      edit.addEventListener("click", function (event) { event.stopPropagation(); });
      del.addEventListener("click", function (event) { event.stopPropagation(); });
      tbody.appendChild(tr);
    });
  }

  async function deletePost(row, confirmed) {
    if (!confirmed) {
      requestDeleteConfirmation("¿Querés eliminar la novedad pública '" + (row.titulo || "") + "'?", function () {
        return deletePost(row, true);
      });
      return;
    }
    var msg = $("#postsMsg");
    setMsg(msg, "Eliminando...", "");
    try {
      await api("/noticias/" + encodeURIComponent(row._id || row.id), { method: "DELETE" });
      if ($("#pubId") && $("#pubId").value === String(row._id || row.id)) {
        resetNewsForm();
        setMsg($("#crearMsg"), "", "");
      }
      setMsg(msg, "Novedad eliminada", "ok");
      refreshPublicNews();
    } catch (err) {
      setMsg(msg, err.message || "Error", "error");
    }
  }

  function renderMaterials(items) {
    var list = $("#materialsList");
    if (!list) return;
    list.innerHTML = "";
    if (!items.length) {
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = "Aún no hay materiales.";
      list.appendChild(e);
      return;
    }
    items.forEach(function (m) {
      var div = document.createElement("div");
      div.className = "item";
      div.classList.add("content-summary-item");
      div.addEventListener("click", function () { openContentDetail("material", m); });
      var left = document.createElement("div");
      var t = document.createElement("div");
      t.className = "item-title";
      t.textContent = m.titulo;
      var s = document.createElement("div");
      s.className = "item-sub";
      s.textContent = [materiaCursoLabel(m.materiaCursoId), m.resumen || m.contenido || "Sin descripción"].filter(Boolean).join(" · ");
      left.appendChild(t);
      left.appendChild(s);
      s.hidden = true;
      var meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = renderArchivosMeta(m);
      var actions = document.createElement("div");
      actions.className = "item-actions";
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn-ghost btn-sm";
      edit.textContent = "Editar";
      edit.addEventListener("click", function (event) {
        event.stopPropagation();
        openMaterialEdit(m);
      });
      actions.appendChild(edit);
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-secondary btn-sm";
      del.textContent = "Eliminar";
      del.addEventListener("click", function (event) {
        event.stopPropagation();
        deleteContenido(m);
      });
      actions.appendChild(del);
      div.appendChild(left);
      div.appendChild(meta);
      div.appendChild(actions);
      list.appendChild(div);
    });
  }

  function renderStudentActivities(items) {
    var list = $("#activitiesList");
    if (!list) return;
    list.innerHTML = "";
    if (!items.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Aún no hay actividades.";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (a) {
      var div = document.createElement("div");
      div.className = "item";
      div.classList.add("content-summary-item");
      div.addEventListener("click", function () { openContentDetail("actividad", a); });
      var left = document.createElement("div");
      var t = document.createElement("div");
      t.className = "item-title";
      t.textContent = a.titulo;
      var s = document.createElement("div");
      s.className = "item-sub";
      s.textContent = [materiaCursoLabel(a.materiaCursoId), a.resumen || a.contenido || "Sin descripción"].filter(Boolean).join(" · ");
      left.appendChild(t);
      left.appendChild(s);
      s.hidden = true;
      var meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = formatFechaHora(a.fecha || a.createdAt);
      var actions = document.createElement("div");
      actions.className = "item-actions";
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn-ghost btn-sm";
      edit.textContent = "Editar";
      edit.addEventListener("click", function (event) {
        event.stopPropagation();
        openActivityEdit(a);
      });
      actions.appendChild(edit);
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-secondary btn-sm";
      del.textContent = "Eliminar";
      del.addEventListener("click", function (event) {
        event.stopPropagation();
        deleteContenido(a);
      });
      actions.appendChild(del);
      div.appendChild(left);
      div.appendChild(meta);
      div.appendChild(actions);
      list.appendChild(div);
    });
  }

  function renderPublicEventList(items) {
    var list = $("#calendarList");
    if (!list) return;
    list.innerHTML = "";
    if (!items.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No hay eventos con este filtro.";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (row) {
      var item = document.createElement("div");
      item.className = "item";
      item.classList.add("content-summary-item");
      item.addEventListener("click", function () { openDocenteEventoDetalle(row); });
      var left = document.createElement("div");
      var title = document.createElement("div");
      title.className = "item-title";
      title.textContent = row.titulo || "Evento";
      var sub = document.createElement("div");
      sub.className = "item-sub";
      sub.textContent = [row.visibilidad === "privado" ? "Privado" : "Público", row.tipo || "Evento", row.ubicacion || "Sin ubicación"].join(" · ");
      left.appendChild(title);
      left.appendChild(sub);
      sub.hidden = true;
      var meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = formatFechaHora(row.inicio);
      var created = document.createElement("div");
      created.className = "item-created";
      created.textContent = "Creado: " + formatFechaHora(row.createdAt || row.inicio);
      var actions = document.createElement("div");
      actions.className = "item-actions";
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn-ghost btn-sm";
      edit.textContent = "Editar";
      edit.addEventListener("click", function (event) { event.stopPropagation(); openEventEdit(row); });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-secondary btn-sm";
      del.textContent = "Eliminar";
      del.addEventListener("click", function (event) { event.stopPropagation(); deleteEvent(row); });
      actions.appendChild(edit);
      actions.appendChild(del);
      item.appendChild(left);
      item.appendChild(meta);
      item.appendChild(created);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function renderPublicEvents(items) {
    renderDocenteCalendar(items);
    renderPublicEventList(items);
  }

  async function refreshPublicNews() {
    try {
      var news = await api("/noticias", { method: "GET" });
      state.publicNews = Array.isArray(news) ? news : [];
      renderRecentPosts(state.publicNews);
      renderMyPosts(state.publicNews);
      renderDocenteNews(filterPublicNewsRows(state.publicNews));
      if ($("#kpiPosts")) $("#kpiPosts").textContent = String(state.publicNews.length);
      setMsg($("#postsMsg"), "", "");
    } catch (e) {
      state.publicNews = [];
      renderRecentPosts([]);
      renderMyPosts([]);
      renderDocenteNews([]);
      if ($("#kpiPosts")) $("#kpiPosts").textContent = "0";
      setMsg($("#postsMsg"), e.message || "Error", "error");
    }
  }

  async function refreshPublicEvents() {
    try {
      var data = await api("/calendario?context=docente", { method: "GET" });
      state.publicEvents = Array.isArray(data)
        ? data.slice().sort(function (a, b) {
            return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
          })
        : [];
      renderPublicEvents(state.publicEvents);
      setMsg($("#calMsg"), "", "");
    } catch (err) {
      state.publicEvents = [];
      renderPublicEvents([]);
      setMsg($("#calMsg"), err.message || "Error", "error");
    }
  }

  async function deleteEvent(row, confirmed) {
    var isAcademic = isAcademicEvent(row);
    if (!confirmed) {
      requestDeleteConfirmation("¿Querés eliminar " + (isAcademic ? "el evento para estudiantes" : "el evento público") + " '" + (row.titulo || "") + "'?", function () {
        return deleteEvent(row, true);
      });
      return;
    }
    var msg = isAcademic ? $("#academicMsg") : $("#calMsg");
    setMsg(msg, "Eliminando...", "");
    try {
      await api("/calendario/" + encodeURIComponent(row._id || row.id), { method: "DELETE" });
      if ($("#eventoId") && $("#eventoId").value === String(row._id || row.id)) {
        resetEventForm();
        setMsg($("#eventoMsg"), "", "");
      }
      if ($("#acadEventId") && $("#acadEventId").value === String(row._id || row.id)) {
        resetAcademicEventForm();
        setMsg($("#acadEventMsg"), "", "");
      }
      setMsg(msg, "Evento eliminado", "ok");
      refreshPublicEvents();
    } catch (err) {
      setMsg(msg, err.message || "Error", "error");
    }
  }

  async function refreshAll() {
    await loadMySubjects();
    await refreshMyContents();
    await refreshPublicNews();
    await refreshPublicEvents();
    syncContentFilters();
    var pubs = state.myContents.filter(function (row) {
      return row.tipo === "publicacion";
    }).sort(function (a, b) {
      return new Date(b.fecha || b.createdAt || 0).getTime() - new Date(a.fecha || a.createdAt || 0).getTime();
    });
    var academicEvents = state.publicEvents.filter(function (row) {
      return isAcademicEvent(row);
    }).sort(function (a, b) {
      return new Date(a.inicio || a.createdAt || 0).getTime() - new Date(b.inicio || b.createdAt || 0).getTime();
    });
    var mats = state.myContents.filter(function (row) {
      return row.tipo === "material";
    }).sort(function (a, b) {
      return new Date(b.fecha || b.createdAt || 0).getTime() - new Date(a.fecha || a.createdAt || 0).getTime();
    });
    var acts = state.myContents.filter(function (row) {
      return row.tipo === "actividad";
    }).sort(function (a, b) {
      return new Date(a.fecha || a.createdAt || 0).getTime() - new Date(b.fecha || b.createdAt || 0).getTime();
    });

    var kpiCursos = $("#kpiCursos");
    var kpiMats = $("#kpiMats");
    var kpiActs = $("#kpiActs");
    var kpiEventos = $("#kpiEventos");
    var now = Date.now();
    var upcomingEvents = state.publicEvents.filter(function (row) {
      var timestamp = new Date(row.inicio || row.createdAt || 0).getTime();
      return !isNaN(timestamp) && timestamp >= now;
    });
    if (kpiCursos) kpiCursos.textContent = String(state.mySubjects.length);
    if (kpiMats) kpiMats.textContent = String(mats.length);
    if (kpiActs) kpiActs.textContent = String(acts.length);
    if (kpiEventos) kpiEventos.textContent = String(upcomingEvents.slice(0, 7).length);

    renderFilteredContent();
    renderAcademicPosts(pubs, academicEvents);
    renderAssignedSubjects(state.mySubjects);
    renderRecentWork(mats.concat(pubs), acts.concat(academicEvents.map(function (row) {
      return {
        titulo: row.titulo,
        resumen: [materiaCursoLabel(row.materiaCursoId), row.descripcion || row.ubicacion || row.tipo || "Evento para estudiantes"].filter(Boolean).join(" · "),
        fecha: row.inicio,
        materiaCursoId: row.materiaCursoId
      };
    })));
  }

  async function loadMySubjects() {
    try {
      var data = await api("/materias-curso/mine", { method: "GET" });
      state.mySubjects = Array.isArray(data) ? data : [];
      syncSubjectSelects();
    } catch (err) {
      state.mySubjects = [];
      syncSubjectSelects();
    }
  }

  function initCreatePost() {
    var form = $("#crearForm");
    var msgEl = $("#crearMsg");
    var modal = $("#modalCrear");
    if (!form) return;
    var cancel = $("#pubEditCancel");
    if (cancel) {
      cancel.addEventListener("click", function () {
        resetNewsForm();
        setMsg(msgEl, "", "");
      });
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Publicando...", "");

      try {
        var titulo = $("#pubTitulo").value;
        var categoria = $("#pubCategoria").value;
        var resumen = $("#pubResumen").value;
        var contenido = $("#pubContenido").value;
        var destacada = !!($("#pubDestacada") && $("#pubDestacada").checked);
        var id = $("#pubId").value;

        var now = new Date().toISOString();
        await api(id ? "/noticias/" + encodeURIComponent(id) : "/noticias", {
          method: id ? "PUT" : "POST",
          body: JSON.stringify({
            titulo: titulo,
            categoria: categoria,
            resumen: resumen,
            contenido: contenido,
            fecha: now,
            destacada: destacada
          })
        });

        resetNewsForm();
        setMsg(msgEl, id ? "Novedad actualizada" : "Novedad publicada", "ok");
        refreshAll();
        closeModal(modal);
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function resetMaterialForm() {
    var form = $("#matForm");
    if (!form) return;
    form.reset();
    $("#matId").value = "";
    $("#matTitle").textContent = "Subir material";
    $("#matSubmit").textContent = "Publicar";
    $("#matCurrentFile").textContent = "";
    $("#matCurrentFile").hidden = true;
    $("#matRemoveFile").checked = false;
    $("#matRemoveFileWrap").hidden = true;
    setMsg($("#matMsg"), "", "");
  }

  function openMaterialEdit(row) {
    $("#matId").value = row._id || row.id || "";
    $("#matMateriaCurso").value = (row.materiaCursoId && (row.materiaCursoId._id || row.materiaCursoId.id)) || "";
    $("#matTitulo").value = row.titulo || "";
    $("#matDesc").value = row.resumen || row.contenido || "";
    $("#matFile").value = "";
    var materialFiles = Array.isArray(row.archivos) ? row.archivos.filter(function (file) {
      return !!(file && file.name);
    }) : [];
    $("#matCurrentFile").textContent = materialFiles.length
      ? "Archivo actual: " + materialFiles.map(function (file) { return file.name; }).join(", ")
      : "Este material no tiene un archivo adjunto actualmente.";
    $("#matCurrentFile").hidden = false;
    $("#matRemoveFile").checked = false;
    $("#matRemoveFileWrap").hidden = !materialFiles.length;
    $("#matTitle").textContent = "Editar material";
    $("#matSubmit").textContent = "Guardar cambios";
    openModal("#modalMaterial");
    setMsg($("#matMsg"), "Editando material...", "");
  }

  function initMaterial() {
    var form = $("#matForm");
    var msgEl = $("#matMsg");
    var modal = $("#modalMaterial");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Publicando...", "");
      var materiaCursoId = $("#matMateriaCurso").value;
      var titulo = $("#matTitulo").value;
      var desc = $("#matDesc").value;
      var file = $("#matFile").files && $("#matFile").files[0];
      if (!materiaCursoId) return setMsg(msgEl, "Selecciona una materia", "error");
    if (!String(desc || "").trim() && !file) return setMsg(msgEl, "Agrega una descripción o un archivo", "error");

      try {
        var id = $("#matId").value;
        var payload = new FormData();
        payload.append("materiaCursoId", materiaCursoId);
        payload.append("tipo", "material");
        payload.append("titulo", titulo);
        payload.append("resumen", desc);
        payload.append("contenido", desc);
        if (!id) payload.append("fecha", new Date().toISOString());
        payload.append("publicado", "true");
        if ($("#matRemoveFile").checked) payload.append("archivos", "[]");
        if (file) payload.append("archivos", file);

        await api(id ? "/contenidos/" + encodeURIComponent(id) : "/contenidos", {
          method: id ? "PUT" : "POST",
          body: payload
        });

        resetMaterialForm();
        setMsg(msgEl, id ? "Material actualizado" : "Material publicado", "ok");
        await refreshAll();
        closeModal(modal);
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function resetActivityForm() {
    var form = $("#actForm");
    if (!form) return;
    form.reset();
    $("#actId").value = "";
    $("#actTitle").textContent = "Crear actividad";
    $("#actSubmit").textContent = "Publicar";
    $("#actCurrentFile").textContent = "";
    $("#actCurrentFile").hidden = true;
    $("#actRemoveFile").checked = false;
    $("#actRemoveFileWrap").hidden = true;
    setMsg($("#actMsg"), "", "");
  }

  function openActivityEdit(row) {
    $("#actId").value = row._id || row.id || "";
    $("#actMateriaCurso").value = (row.materiaCursoId && (row.materiaCursoId._id || row.materiaCursoId.id)) || "";
    $("#actTitulo").value = row.titulo || "";
    $("#actInicio").value = toDatetimeLocalValue(row.fecha);
    $("#actDesc").value = row.resumen || row.contenido || "";
    $("#actAdjunto").value = "";
    var activityFiles = Array.isArray(row.archivos) ? row.archivos.filter(function (file) {
      return !!(file && file.name);
    }) : [];
    $("#actCurrentFile").textContent = activityFiles.length
      ? "Archivo actual: " + activityFiles.map(function (file) { return file.name; }).join(", ")
      : "Esta actividad no tiene un archivo adjunto actualmente.";
    $("#actCurrentFile").hidden = false;
    $("#actRemoveFile").checked = false;
    $("#actRemoveFileWrap").hidden = !activityFiles.length;
    $("#actTitle").textContent = "Editar actividad";
    $("#actSubmit").textContent = "Guardar cambios";
    openModal("#modalActividad");
    setMsg($("#actMsg"), "Editando actividad...", "");
  }

  function initActividad() {
    var form = $("#actForm");
    var msgEl = $("#actMsg");
    var modal = $("#modalActividad");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Publicando...", "");
      var materiaCursoId = $("#actMateriaCurso").value;
      var titulo = $("#actTitulo").value;
      var inicio = $("#actInicio").value;
      var desc = $("#actDesc").value;
      var file = $("#actAdjunto").files && $("#actAdjunto").files[0];
      if (!materiaCursoId) return setMsg(msgEl, "Selecciona una materia", "error");
      if (!inicio) return setMsg(msgEl, "Fecha requerida", "error");

      try {
        var id = $("#actId").value;
        var payload = new FormData();
        payload.append("materiaCursoId", materiaCursoId);
        payload.append("tipo", "actividad");
        payload.append("titulo", titulo);
        payload.append("resumen", desc);
        payload.append("contenido", desc);
        payload.append("fecha", new Date(inicio).toISOString());
        payload.append("publicado", "true");
        if ($("#actRemoveFile").checked) payload.append("archivos", "[]");
        if (file) payload.append("archivos", file);

        await api(id ? "/contenidos/" + encodeURIComponent(id) : "/contenidos", {
          method: id ? "PUT" : "POST",
          body: payload
        });

        resetActivityForm();
        setMsg(msgEl, id ? "Actividad actualizada" : "Actividad publicada", "ok");
        await refreshAll();
        closeModal(modal);
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function initAcademicPost() {
    var form = $("#acadForm");
    var msgEl = $("#acadFormMsg");
    var modal = $("#modalPublicacionAcademica");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Publicando...", "");
      var materiaCursoId = $("#acadMateriaCurso").value;
      var titulo = $("#acadTitulo").value;
      var resumen = $("#acadResumen").value;
      var contenido = $("#acadContenido").value;
      var file = $("#acadAdjunto").files && $("#acadAdjunto").files[0];
      if (!materiaCursoId) return setMsg(msgEl, "Selecciona una materia", "error");
      if (!String(resumen || contenido || "").trim() && !file) return setMsg(msgEl, "Agrega contenido o un adjunto", "error");

      try {
        var id = $("#acadId").value;
        var payload = new FormData();
        payload.append("materiaCursoId", materiaCursoId);
        payload.append("tipo", "publicacion");
        payload.append("titulo", titulo);
        payload.append("resumen", resumen);
        payload.append("contenido", contenido);
        if (!id) payload.append("fecha", new Date().toISOString());
        payload.append("publicado", "true");
        if ($("#acadRemoveFile").checked) payload.append("archivos", "[]");
        if (file) payload.append("archivos", file);

        await api(id ? "/contenidos/" + encodeURIComponent(id) : "/contenidos", {
          method: id ? "PUT" : "POST",
          body: payload
        });

        resetAcademicPostForm();
        setMsg(msgEl, "Publicación creada", "ok");
        await refreshAll();
        closeModal(modal);
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function initAcademicEvent() {
    var form = $("#acadEventForm");
    var msgEl = $("#acadEventMsg");
    var modal = $("#modalEventoAcademico");
    if (!form) return;
    var cancel = $("#acadEventCancel");
    if (cancel) {
      cancel.addEventListener("click", function () {
        resetAcademicEventForm();
        setMsg(msgEl, "", "");
      });
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Publicando...", "");
      try {
        var id = $("#acadEventId").value;
        var inicio = $("#acadEventInicio").value;
        var materiaCursoId = $("#acadEventMateriaCurso").value;
        if (!materiaCursoId) return setMsg(msgEl, "Selecciona una materia", "error");
        if (!inicio) return setMsg(msgEl, "Fecha de inicio requerida", "error");

        var payload = {
          materiaCursoId: materiaCursoId,
          titulo: $("#acadEventTitulo").value,
          inicio: new Date(inicio).toISOString(),
          descripcion: $("#acadEventDesc").value,
          tipo: $("#acadEventTipo").value || "Evento para estudiantes",
          ubicacion: $("#acadEventUbicacion").value || ""
        };
        var fin = $("#acadEventFin").value;
        if (fin) payload.fin = new Date(fin).toISOString();

        await api(id ? "/calendario/" + encodeURIComponent(id) : "/calendario", {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(payload)
        });

        resetAcademicEventForm();
        setMsg(msgEl, id ? "Evento actualizado" : "Evento publicado", "ok");
        await refreshAll();
        closeModal(modal);
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function initPublicEvent() {
    var form = $("#eventoForm");
    var msgEl = $("#eventoMsg");
    var modal = $("#modalEventoPublico");
    if (!form) return;
    var cancel = $("#eventoEditCancel");
    if (cancel) {
      cancel.addEventListener("click", function () {
        resetEventForm();
        setMsg(msgEl, "", "");
      });
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Publicando...", "");
      try {
        var id = $("#eventoId").value;
        var payload = {
          titulo: $("#eventoTitulo").value,
          inicio: new Date($("#eventoInicio").value).toISOString(),
          descripcion: $("#eventoDesc").value,
          tipo: $("#eventoTipo").value || "Evento",
          ubicacion: $("#eventoUbicacion").value || ""
        };
        var fin = $("#eventoFin").value;
        if (fin) payload.fin = new Date(fin).toISOString();

        await api(id ? "/calendario/" + encodeURIComponent(id) : "/calendario", {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(payload)
        });

        resetEventForm();
        setMsg(msgEl, id ? "Evento actualizado" : "Evento publicado", "ok");
        refreshPublicEvents();
        closeModal(modal);
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function initRefreshButtons() {
    var btn = $("#refreshPosts");
    if (btn) btn.addEventListener("click", refreshAll);
    var postsVisibility = $("#postsVisibilityFilter");
    if (postsVisibility) postsVisibility.addEventListener("change", function () {
      state.publicNewsVisibility = postsVisibility.value;
      renderDocenteNews(filterPublicNewsRows(state.publicNews));
    });
    var refreshEvents = $("#refreshPublicEvents");
    if (refreshEvents) refreshEvents.addEventListener("click", refreshPublicEvents);
    var prevMes = $("#prevDocenteMes");
    if (prevMes) {
      prevMes.addEventListener("click", function () {
        eventCalendarState.monthCursor = new Date(eventCalendarState.monthCursor.getFullYear(), eventCalendarState.monthCursor.getMonth() - 1, 1);
        renderPublicEvents(state.publicEvents);
      });
    }
    var nextMes = $("#nextDocenteMes");
    if (nextMes) {
      nextMes.addEventListener("click", function () {
        eventCalendarState.monthCursor = new Date(eventCalendarState.monthCursor.getFullYear(), eventCalendarState.monthCursor.getMonth() + 1, 1);
        renderPublicEvents(state.publicEvents);
      });
    }
  }

  function initHeaderUser() {
    var u = getUser();
    var nombreEl = $("#docenteNombre");
    if (nombreEl) nombreEl.textContent = [u.nombre, u.apellido].filter(Boolean).join(" ") || u.email;

    var p1 = $("#pNombre");
    var p2 = $("#pApellido");
    var p3 = $("#pEmail");
    var p4 = $("#pRole");
    if (p1) p1.textContent = u.nombre || "-";
    if (p2) p2.textContent = u.apellido || "-";
    if (p3) p3.textContent = u.email || "-";
    var roles = u.roles && u.roles.length ? u.roles : u.role ? [u.role] : [];
    if (p4) p4.textContent = roles.length ? roles.join(", ") : "-";

    var superLink = $("#superLink");
    if (superLink) superLink.hidden = !state.canAccessSuperadminPanel;

    var dirLink = $("#dirLink");
    if (dirLink) dirLink.hidden = !state.canAccessDirectivoPanel;

    var publicacionesLink = $("#publicacionesLink");
    if (publicacionesLink) publicacionesLink.hidden = !state.canManagePublicContent;

    var calendarioLink = $("#calendarioLink");
    if (calendarioLink) calendarioLink.hidden = !state.canManagePublicContent;

    var openCrearPub = $("#openCrearPub");
    if (openCrearPub) openCrearPub.hidden = !state.canManagePublicContent;

    var openCrearEvento = $("#openCrearEvento");
    if (openCrearEvento) openCrearEvento.hidden = !state.canManagePublicContent;

    var publicarNovedadBtn = $("#publicarNovedadBtn");
    if (publicarNovedadBtn) publicarNovedadBtn.hidden = !state.canManagePublicContent;

    var crearEventoBtn = $("#crearEventoBtn");
    if (crearEventoBtn) crearEventoBtn.hidden = !state.canManagePublicContent;

    var publicacionesView = $("#publicaciones");
    if (publicacionesView) publicacionesView.hidden = !state.canManagePublicContent;

    var calendarioView = $("#calendario");
    if (calendarioView) calendarioView.hidden = !state.canManagePublicContent;
  }

  if (!authGuard()) return;
  rememberPanelPath();

  injectIcons();
  initSidebarNav();
  initSideToggle();
  initLogout();
  initContentFilters();
  initModals();
  initCreatePost();
  initMaterial();
  initActividad();
  initAcademicPost();
  initAcademicEvent();
  initPublicEvent();
  initRefreshButtons();
  initHeaderUser();
  refreshAll();
})();
