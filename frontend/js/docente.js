(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var STORAGE_LAST_PANEL = "eep_last_panel_path";
  var LS_POSTS = "eep_docente_posts";
  var LS_MATS = "eep_docente_materials";
  var LS_ACTS = "eep_docente_activities";
  var state = {
    publicNews: [],
    publicEvents: []
  };

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
    if (roles.indexOf("docente") === -1) {
      // Redirect to the right panel
      if (roles.indexOf("superadmin") !== -1) window.location.href = "admin.html";
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
    var headers = Object.assign(
      { "Content-Type": "application/json" },
      (opts && opts.headers) || {},
      token ? { Authorization: "Bearer " + token } : {}
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
      var err = new Error(msg);
      err.status = res.status;
      err.data = data;
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
    if (!a) return "Anio";
    var base = a.nombre || (a.numero ? String(a.numero) + "o" : "Anio");
    var div = a.division ? " " + a.division : "";
    var turno = a.turno ? " · " + a.turno : "";
    return base + div + turno;
  }

  function cicloLabel(v) {
    return v ? String(v) : "-";
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
        if (t === "material") openModal("#modalMaterial");
        if (t === "actividad") openModal("#modalActividad");
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
    if (openSubirMat) openSubirMat.addEventListener("click", function () { openModal("#modalMaterial"); });

    $$(".modal").forEach(function (m) {
      m.addEventListener("click", function (e) {
        var t = e.target;
        if (!(t instanceof Element)) return;
        if (t.getAttribute("data-close") === "true") closeModal(m);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      $$(".modal.is-open").forEach(function (m) {
        closeModal(m);
      });
    });
  }

  function initSidebarNav() {
    function show(view) {
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
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      window.location.href = "../index.html";
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
      td.textContent = "Sin novedades publicas aun";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    rows.slice(0, 5).forEach(function (p) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = p.titulo;
      var td2 = document.createElement("td");
      td2.textContent = p.categoria;
      var td3 = document.createElement("td");
      td3.textContent = formatFecha(p.fecha);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tbody.appendChild(tr);
    });
  }

  function renderMyPosts(rows) {
    var tbody = $("#postsTbody");
    if (!tbody) return;
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
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn-ghost";
      edit.textContent = "Editar";
      edit.style.padding = "0.5rem 0.7rem";
      edit.style.fontSize = "0.9rem";
      edit.addEventListener("click", function () {
        openNewsEdit(p);
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-secondary";
      del.textContent = "Eliminar";
      del.style.padding = "0.5rem 0.7rem";
      del.style.fontSize = "0.9rem";
      del.addEventListener("click", function () {
        deletePost(p);
      });
      td4.appendChild(edit);
      td4.appendChild(del);

      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tr.appendChild(td4);
      tbody.appendChild(tr);
    });
  }

  async function deletePost(row) {
    if (!confirm("Eliminar novedad publica '" + (row.titulo || "") + "'?")) return;
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
      e.textContent = "Aun no hay materiales.";
      list.appendChild(e);
      return;
    }
    items.forEach(function (m) {
      var div = document.createElement("div");
      div.className = "item";
      var left = document.createElement("div");
      var t = document.createElement("div");
      t.className = "item-title";
      t.textContent = m.titulo;
      var s = document.createElement("div");
      s.className = "item-sub";
      s.textContent = m.desc || "";
      left.appendChild(t);
      left.appendChild(s);
      var meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = m.fileName || "Archivo";
      div.appendChild(left);
      div.appendChild(meta);
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
      empty.textContent = "Aun no hay actividades.";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (a) {
      var div = document.createElement("div");
      div.className = "item";
      var left = document.createElement("div");
      var t = document.createElement("div");
      t.className = "item-title";
      t.textContent = a.titulo;
      var s = document.createElement("div");
      s.className = "item-sub";
      s.textContent = a.desc || "";
      left.appendChild(t);
      left.appendChild(s);
      var meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = formatFechaHora(a.inicio);
      div.appendChild(left);
      div.appendChild(meta);
      list.appendChild(div);
    });
  }

  function renderPublicEvents(items) {
    var up = $("#upcoming");
    var cal = $("#calendarList");

    function renderTarget(target, limit) {
      if (!target) return;
      target.innerHTML = "";
      if (!items.length) {
        var e = document.createElement("div");
        e.className = "empty";
        e.textContent = "Aun no hay eventos publicos.";
        target.appendChild(e);
        return;
      }
      items.slice(0, limit).forEach(function (ev) {
        var div = document.createElement("div");
        div.className = "item";
        var left = document.createElement("div");
        var t = document.createElement("div");
        t.className = "item-title";
        t.textContent = ev.titulo || "Evento";
        var s = document.createElement("div");
        s.className = "item-sub";
        s.textContent = ev.descripcion || ev.tipo || "Evento publico";
        left.appendChild(t);
        left.appendChild(s);
        var meta = document.createElement("div");
        meta.className = "item-meta";
        meta.textContent = formatFechaHora(ev.inicio);
        if (target === cal) {
          var actions = document.createElement("div");
          actions.style.display = "flex";
          actions.style.gap = "0.5rem";
          actions.style.flexWrap = "wrap";
          var edit = document.createElement("button");
          edit.type = "button";
          edit.className = "btn btn-ghost";
          edit.textContent = "Editar";
          edit.style.padding = "0.5rem 0.7rem";
          edit.style.fontSize = "0.9rem";
          edit.addEventListener("click", function () {
            openEventEdit(ev);
          });
          var del = document.createElement("button");
          del.type = "button";
          del.className = "btn btn-secondary";
          del.textContent = "Eliminar";
          del.style.padding = "0.5rem 0.7rem";
          del.style.fontSize = "0.9rem";
          del.addEventListener("click", function () {
            deleteEvent(ev);
          });
          actions.appendChild(edit);
          actions.appendChild(del);
          left.appendChild(actions);
        }
        div.appendChild(left);
        div.appendChild(meta);
        target.appendChild(div);
      });
    }

    renderTarget(up, 4);
    renderTarget(cal, items.length);
  }

  async function refreshPublicNews() {
    try {
      var news = await api("/noticias", { method: "GET" });
      state.publicNews = Array.isArray(news) ? news : [];
      renderRecentPosts(state.publicNews);
      renderMyPosts(state.publicNews);
      if ($("#kpiPosts")) $("#kpiPosts").textContent = String(state.publicNews.length);
      setMsg($("#postsMsg"), "OK", "ok");
    } catch (e) {
      state.publicNews = [];
      renderRecentPosts([]);
      renderMyPosts([]);
      if ($("#kpiPosts")) $("#kpiPosts").textContent = "0";
      setMsg($("#postsMsg"), e.message || "Error", "error");
    }
  }

  async function refreshPublicEvents() {
    try {
      var data = await api("/calendario", { method: "GET" });
      state.publicEvents = Array.isArray(data)
        ? data.slice().sort(function (a, b) {
            return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
          })
        : [];
      renderPublicEvents(state.publicEvents);
      setMsg($("#calMsg"), "OK", "ok");
    } catch (err) {
      state.publicEvents = [];
      renderPublicEvents([]);
      setMsg($("#calMsg"), err.message || "Error", "error");
    }
  }

  async function deleteEvent(row) {
    if (!confirm("Eliminar evento publico '" + (row.titulo || "") + "'?")) return;
    var msg = $("#calMsg");
    setMsg(msg, "Eliminando...", "");
    try {
      await api("/calendario/" + encodeURIComponent(row._id || row.id), { method: "DELETE" });
      if ($("#eventoId") && $("#eventoId").value === String(row._id || row.id)) {
        resetEventForm();
        setMsg($("#eventoMsg"), "", "");
      }
      setMsg(msg, "Evento eliminado", "ok");
      refreshPublicEvents();
    } catch (err) {
      setMsg(msg, err.message || "Error", "error");
    }
  }

  function refreshAll() {
    var mats = loadLS(LS_MATS, []);
    var acts = loadLS(LS_ACTS, []).sort(function (a, b) {
      return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
    });

    var kpiPosts = $("#kpiPosts");
    var kpiMats = $("#kpiMats");
    var kpiActs = $("#kpiActs");
    if (kpiPosts) kpiPosts.textContent = String(state.publicNews.length);
    if (kpiMats) kpiMats.textContent = String(mats.length);
    if (kpiActs) kpiActs.textContent = String(acts.length);

    renderMaterials(mats);
    renderStudentActivities(acts);

    refreshPublicNews();
    refreshPublicEvents();
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

  function initMaterial() {
    var form = $("#matForm");
    var msgEl = $("#matMsg");
    var modal = $("#modalMaterial");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setMsg(msgEl, "Guardando...", "");
      var titulo = $("#matTitulo").value;
      var desc = $("#matDesc").value;
      var file = $("#matFile").files && $("#matFile").files[0];
      if (!file) return setMsg(msgEl, "Archivo requerido", "error");

      var mats = loadLS(LS_MATS, []);
      mats.unshift({ id: "m-" + String(Date.now()), titulo: titulo, desc: desc, fileName: file.name, createdAt: new Date().toISOString() });
      saveLS(LS_MATS, mats);
      form.reset();
      setMsg(msgEl, "Guardado", "ok");
      refreshAll();
      closeModal(modal);
    });
  }

  function initActividad() {
    var form = $("#actForm");
    var msgEl = $("#actMsg");
    var modal = $("#modalActividad");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setMsg(msgEl, "Guardando...", "");
      var titulo = $("#actTitulo").value;
      var inicio = $("#actInicio").value;
      var desc = $("#actDesc").value;
      var file = $("#actAdjunto").files && $("#actAdjunto").files[0];
      if (!inicio) return setMsg(msgEl, "Fecha requerida", "error");

      var acts = loadLS(LS_ACTS, []);
      acts.push({ id: "a-" + String(Date.now()), titulo: titulo, inicio: new Date(inicio).toISOString(), desc: desc, fileName: file ? file.name : "" });
      saveLS(LS_ACTS, acts);
      form.reset();
      setMsg(msgEl, "Guardado", "ok");
      refreshAll();
      closeModal(modal);
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
    var refreshEvents = $("#refreshPublicEvents");
    if (refreshEvents) refreshEvents.addEventListener("click", refreshPublicEvents);
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
    if (superLink) superLink.hidden = roles.indexOf("superadmin") === -1;

    var dirLink = $("#dirLink");
    if (dirLink) dirLink.hidden = roles.indexOf("directivo") === -1 && roles.indexOf("superadmin") === -1;
  }

  if (!authGuard()) return;
  rememberPanelPath();

  injectIcons();
  initSidebarNav();
  initSideToggle();
  initLogout();
  initModals();
  initCreatePost();
  initMaterial();
  initActividad();
  initPublicEvent();
  initRefreshButtons();
  initHeaderUser();
  refreshAll();
})();
