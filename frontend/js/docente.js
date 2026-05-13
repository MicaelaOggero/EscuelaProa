(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var LS_POSTS = "eep_docente_posts";
  var LS_MATS = "eep_docente_materials";
  var LS_ACTS = "eep_docente_activities";

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

  function openModal(id) {
    var modal = $(id);
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  async function loadMisAsignaciones() {
    var sel = $("#pubAsignacion");
    if (!sel) return;
    sel.innerHTML = '<option value="" selected disabled>Seleccionar</option>';
    try {
      var rows = await api("/materias-anio/mine", { method: "GET" });
      if (!Array.isArray(rows)) rows = [];
      rows.forEach(function (a) {
        var opt = document.createElement("option");
        opt.value = a._id;
        var an = a.anioId;
        var anLabel = an ? (an.nombre || (an.numero ? String(an.numero) + "o" : "")) : "Anio";
        var div = an && an.division ? " " + an.division : "";
        opt.textContent = (a.materia || "Materia") + " · " + anLabel + div;
        sel.appendChild(opt);
      });
    } catch (e) {
      // keep default
    }
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
        if (t === "crear") openModal("#modalCrear");
        if (t === "material") openModal("#modalMaterial");
        if (t === "actividad") openModal("#modalActividad");
      });
    });

    var openCrearPub = $("#openCrearPub");
    var openSubirMat = $("#openSubirMat");
    if (openCrearPub) openCrearPub.addEventListener("click", function () { openModal("#modalCrear"); });
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
      td.textContent = "Sin publicaciones aun";
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
      td.textContent = "Sin publicaciones";
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
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-secondary";
      del.textContent = "Eliminar";
      del.style.padding = "0.5rem 0.7rem";
      del.style.fontSize = "0.9rem";
      del.addEventListener("click", function () {
        deletePost(p.id);
      });
      td4.appendChild(del);

      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      tr.appendChild(td4);
      tbody.appendChild(tr);
    });
  }

  function deletePost(id) {
    var posts = loadLS(LS_POSTS, []);
    posts = posts.filter(function (p) {
      return p.id !== id;
    });
    saveLS(LS_POSTS, posts);
    refreshAll();
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

  function renderActivities(items) {
    var list = $("#activitiesList");
    var up = $("#upcoming");
    var cal = $("#calendarList");
    function renderTarget(target) {
      if (!target) return;
      target.innerHTML = "";
      if (!items.length) {
        var e = document.createElement("div");
        e.className = "empty";
        e.textContent = "Aun no hay actividades.";
        target.appendChild(e);
        return;
      }
      items.slice(0, target === up ? 4 : items.length).forEach(function (a) {
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
        target.appendChild(div);
      });
    }
    renderTarget(list);
    renderTarget(up);
    renderTarget(cal);
  }

  async function refreshFromBackendRecent() {
    try {
      var news = await api("/noticias", { method: "GET" });
      if (Array.isArray(news) && news.length) {
        // Merge: backend news are shown in recent table only.
        var mapped = news
          .slice(0, 5)
          .map(function (n) {
            return {
              id: n._id || "b-" + String(Math.random()),
              titulo: n.titulo || "(sin titulo)",
              categoria: n.categoria || "Institucional",
              fecha: n.fecha || n.createdAt || new Date().toISOString()
            };
          });
        var localPosts = loadLS(LS_POSTS, []);
        renderRecentPosts(localPosts.concat(mapped).slice(0, 5));
        return;
      }
    } catch (e) {
      // ignore
    }
  }

  function refreshAll() {
    var posts = loadLS(LS_POSTS, []).sort(function (a, b) {
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
    var mats = loadLS(LS_MATS, []);
    var acts = loadLS(LS_ACTS, []).sort(function (a, b) {
      return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
    });

    var kpiPosts = $("#kpiPosts");
    var kpiMats = $("#kpiMats");
    var kpiActs = $("#kpiActs");
    if (kpiPosts) kpiPosts.textContent = String(posts.length);
    if (kpiMats) kpiMats.textContent = String(mats.length);
    if (kpiActs) kpiActs.textContent = String(acts.length);

    renderRecentPosts(posts);
    renderMyPosts(posts);
    renderMaterials(mats);
    renderActivities(acts);

    refreshFromBackendRecent();
  }

  function initCreatePost() {
    var form = $("#crearForm");
    var msgEl = $("#crearMsg");
    var modal = $("#modalCrear");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Publicando...", "");

      try {
        var materiaAnioId = $("#pubAsignacion").value;
        var titulo = $("#pubTitulo").value;
        var categoria = $("#pubCategoria").value;
        var resumen = $("#pubResumen").value;
        var contenido = $("#pubContenido").value;
        var file = $("#pubAdjunto").files && $("#pubAdjunto").files[0];

        var now = new Date().toISOString();
        var local = {
          id: "l-" + String(Date.now()),
          materiaAnioId: materiaAnioId,
          titulo: titulo,
          categoria: categoria,
          resumen: resumen,
          contenido: contenido,
          fecha: now,
          fileName: file ? file.name : ""
        };
        var posts = loadLS(LS_POSTS, []);
        posts.unshift(local);
        saveLS(LS_POSTS, posts);

        // Best effort: also create in backend (no file upload here)
        try {
          await api("/contenidos", {
            method: "POST",
            body: JSON.stringify({
              materiaAnioId: materiaAnioId,
              tipo: "publicacion",
              titulo: titulo,
              resumen: resumen,
              contenido: contenido,
              fecha: new Date().toISOString()
            })
          });
        } catch (err) {
          // Still ok locally
        }

        form.reset();
        setMsg(msgEl, "Publicacion creada", "ok");
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

  function initRefreshButtons() {
    var btn = $("#refreshPosts");
    if (btn) btn.addEventListener("click", refreshAll);
    var sync = $("#syncBackendEvents");
    if (sync)
      sync.addEventListener("click", async function () {
        var msg = $("#calMsg");
        setMsg(msg, "Sincronizando...", "");
        try {
          var data = await api("/calendario", { method: "GET" });
          if (Array.isArray(data) && data.length) {
            var acts = loadLS(LS_ACTS, []);
            data.forEach(function (ev) {
              acts.push({
                id: "b-" + (ev._id || String(Date.now() + Math.random())),
                titulo: ev.titulo || "Evento",
                inicio: ev.inicio || ev.createdAt || new Date().toISOString(),
                desc: ev.descripcion || "",
                fileName: ""
              });
            });
            saveLS(LS_ACTS, acts);
            refreshAll();
          }
          setMsg(msg, "OK", "ok");
        } catch (err) {
          setMsg(msg, err.message || "Error", "error");
        }
      });
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

  injectIcons();
  initSidebarNav();
  initSideToggle();
  initLogout();
  initModals();
  initCreatePost();
  initMaterial();
  initActividad();
  initRefreshButtons();
  initHeaderUser();
  loadMisAsignaciones();
  refreshAll();
})();
