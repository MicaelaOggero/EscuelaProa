(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var STORAGE_LAST_PANEL = "eep_last_panel_path";

  function $(sel) {
    return document.querySelector(sel);
  }

  var noticiaDraft = {
    existingImages: []
  };

  function setMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("is-error", "is-ok");
    if (kind === "error") el.classList.add("is-error");
    if (kind === "ok") el.classList.add("is-ok");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    sessionStorage.setItem(STORAGE_LAST_PANEL, "pages/directivo.html");
  }

  function injectIcons() {
    var icons = {
      book:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 5.2h9.8a2.2 2.2 0 0 1 2.2 2.2v11.4a.8.8 0 0 1-1.2.7 4.3 4.3 0 0 0-2.1-.5H7.8A2.3 2.3 0 0 0 6 19.8V6.7c0-.83.67-1.5 1.5-1.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6 7.2a2 2 0 0 1 1.8-1h7.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      news:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 6.2A2.2 2.2 0 0 1 7.2 4h9.6A2.2 2.2 0 0 1 19 6.2v11.6A2.2 2.2 0 0 1 16.8 20H7.2A2.2 2.2 0 0 1 5 17.8V6.2Z" stroke="currentColor" stroke-width="1.7"/><path d="M8.3 8.2h7.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.3 11.8h7.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.3 15.4h4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      users:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.2 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" stroke-width="1.7"/><path d="M15.8 10.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z" stroke="currentColor" stroke-width="1.7"/><path d="M3.8 19.2c1.2-2.8 3.4-4.2 5.5-4.2 2 0 4.2 1.4 5.4 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M14.2 18.2c.8-1.8 2.2-2.8 3.8-2.8 1.1 0 2.2.5 3.2 1.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      logout:
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 7V5.6c0-.99.81-1.8 1.8-1.8h6.4c.99 0 1.8.81 1.8 1.8v12.8c0 .99-.81 1.8-1.8 1.8h-6.4c-.99 0-1.8-.81-1.8-1.8V17" stroke="currentColor" stroke-width="1.7"/><path d="M4 12h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7 9l-3 3 3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    Array.prototype.slice.call(document.querySelectorAll(".ico")).forEach(function (el) {
      var t = (el.textContent || "").trim();
      var key = t.replace(/[{}]/g, "");
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

  function closeMobileSidebar() {
    var sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.remove("is-open");
  }

  function initSidebarViews() {
    function show(view) {
      Array.prototype.slice.call(document.querySelectorAll(".view")).forEach(function (el) {
        el.classList.toggle("is-visible", el.getAttribute("data-view") === view);
      });

      Array.prototype.slice.call(document.querySelectorAll(".side-link[data-view]")).forEach(function (el) {
        var active = el.getAttribute("data-view") === view;
        el.classList.toggle("is-active", active);
        if (active) el.setAttribute("aria-current", "page");
        else el.removeAttribute("aria-current");
      });
    }

    Array.prototype.slice.call(document.querySelectorAll(".side-link[data-view]")).forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var view = el.getAttribute("data-view") || "gestion";
        show(view);
        window.location.hash = view;
        closeMobileSidebar();
      });
    });

    var hash = (window.location.hash || "").replace("#", "");
    show(hash || "gestion");
  }

  function openModal(selector) {
    var modal = $(selector);
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function resetNoticiaForm() {
    var form = $("#noticiaForm");
    if (!form) return;
    form.reset();
    noticiaDraft.existingImages = [];
    $("#noticiaId").value = "";
    $("#noticiaSubmit").textContent = "Publicar";
    $("#noticiaTitle").textContent = "Publicar noticia";
    $("#noticiaCancelEdit").hidden = true;
    renderNoticiaExistingImages();
    renderNoticiaSelectedImages();
  }

  function openNoticiaEdit(row) {
    noticiaDraft.existingImages = Array.isArray(row.imagenes)
      ? row.imagenes.map(function (image, index) {
          return {
            url: image.url,
            alt: image.alt || row.titulo || "Noticia institucional",
            orden: typeof image.orden === "number" ? image.orden : index
          };
        })
      : [];
    $("#noticiaId").value = row._id || row.id || "";
    $("#noticiaTitulo").value = row.titulo || "";
    $("#noticiaCategoria").value = row.categoria || "Institucional";
    $("#noticiaResumen").value = row.resumen || "";
    $("#noticiaContenido").value = row.contenido || "";
    $("#noticiaDestacada").checked = !!row.destacada;
    $("#noticiaSubmit").textContent = "Guardar cambios";
    $("#noticiaTitle").textContent = "Editar noticia";
    $("#noticiaCancelEdit").hidden = false;
    renderNoticiaExistingImages();
    renderNoticiaSelectedImages();
    setMsg($("#noticiaFormMsg"), "Editando noticia...", "");
    openModal("#noticiaModal");
  }

  function renderNoticiaExistingImages() {
    var root = $("#noticiaImagenesActuales");
    if (!root) return;
    root.innerHTML = "";

    if (!noticiaDraft.existingImages.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Todavia no hay imagenes cargadas.";
      root.appendChild(empty);
      return;
    }

    noticiaDraft.existingImages.forEach(function (image, index) {
      var card = document.createElement("div");
      card.className = "news-image-card";
      var frame = document.createElement("div");
      frame.className = "news-image-frame";
      var img = document.createElement("img");
      img.src = image.url;
      img.alt = image.alt || "Imagen de noticia";
      frame.appendChild(img);

      var body = document.createElement("div");
      body.className = "news-image-body";
      var caption = document.createElement("div");
      caption.className = "news-image-caption";
      caption.textContent = "Imagen " + String(index + 1);

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-ghost btn-sm";
      removeBtn.textContent = "Quitar";
      removeBtn.addEventListener("click", function () {
        noticiaDraft.existingImages.splice(index, 1);
        renderNoticiaExistingImages();
      });

      body.appendChild(caption);
      body.appendChild(removeBtn);
      card.appendChild(frame);
      card.appendChild(body);
      root.appendChild(card);
    });
  }

  function renderNoticiaSelectedImages() {
    var root = $("#noticiaImagenesPreview");
    var input = $("#noticiaImagenes");
    if (!root || !input) return;
    root.innerHTML = "";
    var files = input.files ? Array.prototype.slice.call(input.files) : [];

    if (!files.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Selecciona una o varias imagenes para agregarlas.";
      root.appendChild(empty);
      return;
    }

    files.forEach(function (file, index) {
      var card = document.createElement("div");
      card.className = "news-image-card";
      var frame = document.createElement("div");
      frame.className = "news-image-frame";
      var img = document.createElement("img");
      img.alt = file.name || "Nueva imagen";
      img.src = URL.createObjectURL(file);
      img.addEventListener("load", function () {
        URL.revokeObjectURL(img.src);
      });
      frame.appendChild(img);

      var body = document.createElement("div");
      body.className = "news-image-body";
      var caption = document.createElement("div");
      caption.className = "news-image-caption";
      caption.textContent = "Nueva imagen " + String(index + 1) + " · " + file.name;
      body.appendChild(caption);
      card.appendChild(frame);
      card.appendChild(body);
      root.appendChild(card);
    });
  }

  function formatFecha(value) {
    if (!value) return "-";
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "-";
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yyyy = String(d.getFullYear());
    return dd + "/" + mm + "/" + yyyy;
  }

  function renderNoticias(rows) {
    var tbody = $("#noticiasTbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!rows.length) {
      var emptyTr = document.createElement("tr");
      var emptyTd = document.createElement("td");
      emptyTd.colSpan = 4;
      emptyTd.className = "table-empty";
      emptyTd.textContent = "Sin noticias publicadas";
      emptyTr.appendChild(emptyTd);
      tbody.appendChild(emptyTr);
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      var tdTitulo = document.createElement("td");
      tdTitulo.textContent = row.titulo || "-";
      var tdCategoria = document.createElement("td");
      tdCategoria.textContent = row.categoria || "Institucional";
      var tdFecha = document.createElement("td");
      tdFecha.textContent = formatFecha(row.fecha);
      var tdAcciones = document.createElement("td");

      var btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn btn-ghost";
      btnEdit.textContent = "Editar";
      btnEdit.style.padding = "0.5rem 0.7rem";
      btnEdit.style.fontSize = "0.9rem";
      btnEdit.addEventListener("click", function () {
        openNoticiaEdit(row);
      });

      var btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.className = "btn btn-secondary";
      btnDelete.textContent = "Eliminar";
      btnDelete.style.padding = "0.5rem 0.7rem";
      btnDelete.style.fontSize = "0.9rem";
      btnDelete.addEventListener("click", function () {
        deleteNoticia(row);
      });

      tdAcciones.appendChild(btnEdit);
      tdAcciones.appendChild(btnDelete);
      tr.appendChild(tdTitulo);
      tr.appendChild(tdCategoria);
      tr.appendChild(tdFecha);
      tr.appendChild(tdAcciones);
      tbody.appendChild(tr);
    });
  }

  async function loadNoticias() {
    var msg = $("#noticiasMsg");
    setMsg(msg, "Cargando noticias...", "");
    try {
      var rows = await api("/noticias", { method: "GET" });
      rows = Array.isArray(rows) ? rows : [];
      renderNoticias(rows);
      setMsg(msg, "OK", "ok");
    } catch (e) {
      renderNoticias([]);
      setMsg(msg, e.message || "Error", "error");
    }
  }

  async function deleteNoticia(row) {
    if (!confirm("Eliminar noticia '" + (row.titulo || "") + "'?")) return;
    var msg = $("#noticiasMsg");
    setMsg(msg, "Eliminando...", "");
    try {
      await api("/noticias/" + encodeURIComponent(row._id || row.id), { method: "DELETE" });
      if ($("#noticiaId").value === String(row._id || row.id)) {
        resetNoticiaForm();
        setMsg($("#noticiaFormMsg"), "", "");
      }
      setMsg(msg, "Noticia eliminada", "ok");
      loadNoticias();
    } catch (e) {
      setMsg(msg, e.message || "Error", "error");
    }
  }

  function initNoticias() {
    var form = $("#noticiaForm");
    var msg = $("#noticiaFormMsg");
    var refresh = $("#refreshNoticias");
    var cancel = $("#noticiaCancelEdit");
    var imageInput = $("#noticiaImagenes");

    Array.prototype.slice.call(document.querySelectorAll("[data-open='crear-noticia']")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        resetNoticiaForm();
        setMsg(msg, "", "");
        openModal("#noticiaModal");
      });
    });

    if (cancel) {
      cancel.addEventListener("click", function () {
        resetNoticiaForm();
        setMsg(msg, "", "");
      });
    }

    if (imageInput) {
      imageInput.addEventListener("change", function () {
        renderNoticiaSelectedImages();
      });
    }

    if (refresh) refresh.addEventListener("click", loadNoticias);

    Array.prototype.slice.call(document.querySelectorAll(".modal")).forEach(function (modal) {
      modal.addEventListener("click", function (e) {
        var target = e.target;
        if (!(target instanceof Element)) return;
        if (target.getAttribute("data-close") === "true") closeModal(modal);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      Array.prototype.slice.call(document.querySelectorAll(".modal.is-open")).forEach(function (modal) {
        closeModal(modal);
      });
    });

    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msg, "Guardando...", "");
      try {
        var id = $("#noticiaId").value;
        var payload = new FormData();
        payload.append("titulo", $("#noticiaTitulo").value);
        payload.append("categoria", $("#noticiaCategoria").value);
        payload.append("resumen", $("#noticiaResumen").value);
        payload.append("contenido", $("#noticiaContenido").value);
        payload.append("fecha", new Date().toISOString());
        payload.append("destacada", $("#noticiaDestacada") && $("#noticiaDestacada").checked ? "true" : "false");
        payload.append("imagenesExistentes", JSON.stringify(noticiaDraft.existingImages));

        var files = imageInput && imageInput.files ? Array.prototype.slice.call(imageInput.files) : [];
        files.forEach(function (file) {
          payload.append("imagenes", file);
        });

        await api(id ? "/noticias/" + encodeURIComponent(id) : "/noticias", {
          method: id ? "PUT" : "POST",
          body: payload
        });

        setMsg(msg, id ? "Noticia actualizada" : "Noticia publicada", "ok");
        resetNoticiaForm();
        closeModal($("#noticiaModal"));
        loadNoticias();
      } catch (err) {
        setMsg(msg, err.message || "Error", "error");
      }
    });
  }

  function syncHeaderUser() {
    var nameEl = $("#directivoNombre");
    if (!nameEl) return;
    var user = getUser();
    if (!user) return;
    var label = [user.nombre, user.apellido].filter(Boolean).join(" ");
    nameEl.textContent = label || user.email || "Gestion academica";
  }

  function rolesOf(u) {
    var roles = (u && (u.roles || (u.role ? [u.role] : []))) || [];
    return Array.isArray(roles) ? roles : [];
  }

  function guard() {
    var u = getUser();
    var t = getToken();
    if (!u || !t) {
      window.location.href = "login.html";
      return false;
    }
    var roles = rolesOf(u);
    var isDirectivoLike = roles.indexOf("directivo") !== -1 || roles.indexOf("superadmin") !== -1;
    if (!isDirectivoLike) {
      if (roles.indexOf("docente") !== -1) window.location.href = "docente.html";
      else window.location.href = "../index.html";
      return false;
    }
    var staffLink = $("#staffLink");
    if (staffLink) staffLink.hidden = roles.indexOf("superadmin") === -1;

    var docenteLink = $("#docenteLink");
    if (docenteLink) docenteLink.hidden = roles.indexOf("docente") === -1;

    var docentesPanel = $("#docentesPanel");
    if (docentesPanel) docentesPanel.hidden = !isDirectivoLike;
    return true;
  }

  async function api(path, opts) {
    var base = getApiBase().replace(/\/$/, "");
    var url = base + path;
    var body = opts && opts.body;
    var isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    var headers = Object.assign({}, (opts && opts.headers) || {}, { Authorization: "Bearer " + getToken() });
    if (!isFormData && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
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

  function fillSelect(sel, rows, getValue, getLabel) {
    if (!sel) return;
    sel.innerHTML = '<option value="" selected disabled>Seleccionar</option>';
    rows.forEach(function (r) {
      var opt = document.createElement("option");
      opt.value = getValue(r);
      var label = getLabel(r);
      opt.textContent = label;
      opt.title = label;
      sel.appendChild(opt);
    });
  }

  function anioLabel(a) {
    var base = a.nombre || (a.numero ? String(a.numero) + "o" : "Curso");
    var div = a.division ? " " + a.division : "";
    var tur = a.turno ? " · " + a.turno : "";
    return base + div + tur;
  }

  function cicloLabel(v) {
    return v ? String(v) : "-";
  }

  function currentCicloLectivo() {
    return new Date().getFullYear();
  }

  var docentesOptions = [];
  var selectedDocente = null;

  function docenteLabel(u) {
    return [u.apellido, u.nombre].filter(Boolean).join(", ") + " · " + (u.email || "");
  }

  function filterDocentes(query) {
    var term = String(query || "").trim().toLowerCase();
    return docentesOptions.filter(function (u) {
      if (!term) return true;
      var haystack = [u.nombre || "", u.apellido || "", u.email || "", docenteLabel(u)]
        .join(" ")
        .toLowerCase();
      return haystack.indexOf(term) !== -1;
    });
  }

  function setSelectedDocente(docente) {
    var hidden = $("#editDocente");
    var lookup = $("#editDocenteLookup");
    if (!hidden || !lookup) return;
    selectedDocente = docente || null;
    hidden.value = docente ? (docente._id || docente.id || "") : "";
    lookup.value = docente ? docenteLabel(docente) : "";
  }

  function renderDocenteResults(query) {
    var resultsEl = $("#editDocenteResults");
    if (!resultsEl) return;
    var filtered = filterDocentes(query).slice(0, 12);
    resultsEl.innerHTML = "";

    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "combo-option";
    clearBtn.textContent = "Sin asignar";
    clearBtn.addEventListener("mousedown", function (e) {
      e.preventDefault();
      setSelectedDocente(null);
      resultsEl.hidden = true;
    });
    resultsEl.appendChild(clearBtn);

    if (!filtered.length) {
      var empty = document.createElement("div");
      empty.className = "combo-empty";
      empty.textContent = "No se encontraron docentes";
      resultsEl.appendChild(empty);
      resultsEl.hidden = false;
      return;
    }

    filtered.forEach(function (u) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "combo-option";
      btn.textContent = docenteLabel(u);
      btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
        setSelectedDocente(u);
        resultsEl.hidden = true;
      });
      resultsEl.appendChild(btn);
    });

    resultsEl.hidden = false;
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

  function renderImportDetails(el, credentials, errors) {
    if (!el) return;
    var blocks = [];

    if (Array.isArray(credentials) && credentials.length) {
      var items = credentials.map(function (row) {
        return "<li>Linea " + escapeHtml(row.line) + " · " + escapeHtml(row.email || row.dni || "") + " · " + escapeHtml(row.password || "") + "</li>";
      }).join("");
      blocks.push("<div><strong>Passwords generados</strong><ul>" + items + "</ul></div>");
    }

    if (Array.isArray(errors) && errors.length) {
      var errItems = errors.map(function (row) {
        return "<li>Linea " + escapeHtml(row.line) + " · " + escapeHtml(row.message || "Error") + "</li>";
      }).join("");
      blocks.push("<div><strong>Observaciones</strong><ul>" + errItems + "</ul></div>");
    }

    el.innerHTML = blocks.join("");
    el.hidden = !blocks.length;
  }

  async function loadAll() {
    var asigMsg = $("#asigMsg");
    setMsg(asigMsg, "Cargando...", "");
    try {
      var users = await api("/users/staff?role=docente", { method: "GET" });
      // Keep only users that include docente role
      users = (users || []).filter(function (u) {
        var roles = (u.roles && u.roles.length ? u.roles : u.role ? [u.role] : []);
        return roles.indexOf("docente") !== -1;
      });
      docentesOptions = users.slice();
      var anios = await api("/cursos", { method: "GET" });
      var mas = await api("/materias-curso", { method: "GET" });

      fillSelect($("#maAnio"), anios || [], function (a) { return a._id; }, anioLabel);

      // Reuse same data for edit modal selects
      setSelectedDocente(null);
      fillSelect($("#editAnio"), anios || [], function (a) { return a._id; }, anioLabel);

      renderAsignaciones(mas || []);
      setMsg(asigMsg, "OK", "ok");
    } catch (e) {
      setMsg(asigMsg, e.message || "Error", "error");
    }
  }

  function renderAsignaciones(rows) {
    var assignedTbody = $("#asigTbody");
    var pendingTbody = $("#pendingAsigTbody");
    var assigned = (rows || []).filter(function (r) { return !!(r && r.docenteId); });
    var pending = (rows || []).filter(function (r) { return !(r && r.docenteId); });
    var assignedCount = $("#conDocenteCount");
    var pendingCount = $("#sinDocenteCount");
    if (assignedCount) assignedCount.textContent = String(assigned.length);
    if (pendingCount) pendingCount.textContent = String(pending.length);
    if (!assignedTbody || !pendingTbody) return;

    assignedTbody.innerHTML = "";
    pendingTbody.innerHTML = "";

    if (!pending.length) {
      var trPendingEmpty = document.createElement("tr");
      var tdPendingEmpty = document.createElement("td");
      tdPendingEmpty.colSpan = 4;
      tdPendingEmpty.className = "table-empty";
      tdPendingEmpty.textContent = "Sin materias pendientes";
      trPendingEmpty.appendChild(tdPendingEmpty);
      pendingTbody.appendChild(trPendingEmpty);
    }

    if (!assigned.length) {
      var trAssignedEmpty = document.createElement("tr");
      var tdAssignedEmpty = document.createElement("td");
      tdAssignedEmpty.colSpan = 5;
      tdAssignedEmpty.className = "table-empty";
      tdAssignedEmpty.textContent = "Sin asignaciones";
      trAssignedEmpty.appendChild(tdAssignedEmpty);
      assignedTbody.appendChild(trAssignedEmpty);
    }

    pending.forEach(function (r) {
      var tr = document.createElement("tr");
      var tdM = document.createElement("td");
      tdM.textContent = r.materia || "-";
      var tdA = document.createElement("td");
      tdA.textContent = r.cursoId ? anioLabel(r.cursoId) : "-";
      var tdC = document.createElement("td");
      tdC.textContent = cicloLabel(r.cicloLectivo);
      var tdX = document.createElement("td");

      var btnAssign = document.createElement("button");
      btnAssign.type = "button";
      btnAssign.className = "btn btn-primary";
      btnAssign.textContent = "Asignar docente";
      btnAssign.style.padding = "0.5rem 0.7rem";
      btnAssign.style.fontSize = "0.9rem";
      btnAssign.addEventListener("click", function () {
        openEditModal(r, "assign");
      });

      var btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn btn-ghost";
      btnEdit.textContent = "Editar";
      btnEdit.style.padding = "0.5rem 0.7rem";
      btnEdit.style.fontSize = "0.9rem";
      btnEdit.addEventListener("click", function () {
        openEditModal(r, "edit");
      });

      var btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.className = "btn btn-secondary";
      btnDelete.textContent = "Eliminar";
      btnDelete.style.padding = "0.5rem 0.7rem";
      btnDelete.style.fontSize = "0.9rem";
      btnDelete.addEventListener("click", function () {
        removeAsignacion(r._id);
      });

      tdX.appendChild(btnAssign);
      tdX.appendChild(btnEdit);
      tdX.appendChild(btnDelete);

      tr.appendChild(tdM);
      tr.appendChild(tdA);
      tr.appendChild(tdC);
      tr.appendChild(tdX);
      pendingTbody.appendChild(tr);
    });

    assigned.forEach(function (r) {
      var tr = document.createElement("tr");
      var tdD = document.createElement("td");
      var d = r.docenteId;
      tdD.textContent = [d.apellido, d.nombre].filter(Boolean).join(", ") || d.email || "-";
      var tdM = document.createElement("td");
      tdM.textContent = r.materia || "-";
      var tdA = document.createElement("td");
      tdA.textContent = r.cursoId ? anioLabel(r.cursoId) : "-";
      var tdC = document.createElement("td");
      tdC.textContent = cicloLabel(r.cicloLectivo);
      var tdX = document.createElement("td");

      var btnReassign = document.createElement("button");
      btnReassign.type = "button";
      btnReassign.className = "btn btn-primary";
      btnReassign.textContent = "Cambiar docente";
      btnReassign.style.padding = "0.5rem 0.7rem";
      btnReassign.style.fontSize = "0.9rem";
      btnReassign.addEventListener("click", function () {
        openEditModal(r, "assign");
      });

      var btnClear = document.createElement("button");
      btnClear.type = "button";
      btnClear.className = "btn btn-ghost";
      btnClear.textContent = "Quitar docente";
      btnClear.style.padding = "0.5rem 0.7rem";
      btnClear.style.fontSize = "0.9rem";
      btnClear.addEventListener("click", function () {
        clearDocente(r);
      });

      tdX.appendChild(btnReassign);
      tdX.appendChild(btnClear);

      tr.appendChild(tdD);
      tr.appendChild(tdM);
      tr.appendChild(tdA);
      tr.appendChild(tdC);
      tr.appendChild(tdX);
      assignedTbody.appendChild(tr);
    });
  }

  function openEditModal(row, mode) {
    var modal = $("#editModal");
    if (!modal) return;
    var isAssignMode = mode === "assign";
    var title = $("#editTitle");
    var sub = modal.querySelector(".modal-sub");
    modal.setAttribute("data-mode", isAssignMode ? "assign" : "edit");
    $("#editId").value = row._id;
    $("#editMateria").value = row.materia || "";
    $("#editActivo").checked = row.activo !== false;
    setSelectedDocente(row.docenteId || null);
    if ($("#editDocenteResults")) $("#editDocenteResults").hidden = true;
    if (row.cursoId && row.cursoId._id) $("#editAnio").value = row.cursoId._id;
    $("#editCicloLectivo").value = row.cicloLectivo || new Date().getFullYear();
    $("#editMateria").readOnly = isAssignMode;
    $("#editAnio").disabled = isAssignMode;
    $("#editCicloLectivo").readOnly = isAssignMode;
    $("#editActivo").disabled = isAssignMode;
    if (title) title.textContent = isAssignMode ? "Asignar docente a materia" : "Editar materia por curso";
    if (sub) sub.textContent = isAssignMode
      ? "Selecciona un docente existente para esta materia."
      : "Edita la materia, el curso, el ciclo o la asignación docente.";
    setMsg($("#editMsg"), "", "");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      var el = isAssignMode ? $("#editDocente") : $("#editMateria");
      if (el) el.focus();
    }, 0);
  }

  function closeEditModal() {
    var modal = $("#editModal");
    if (!modal) return;
    modal.setAttribute("data-mode", "edit");
    $("#editMateria").readOnly = false;
    $("#editAnio").disabled = false;
    $("#editCicloLectivo").readOnly = false;
    $("#editActivo").disabled = false;
    if ($("#editDocenteResults")) $("#editDocenteResults").hidden = true;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function initEditModal() {
    var modal = $("#editModal");
    var form = $("#editForm");
    var msg = $("#editMsg");
    var docenteLookup = $("#editDocenteLookup");
    var docenteHidden = $("#editDocente");
    var docenteResults = $("#editDocenteResults");
    if (!modal || !form) return;

    if (docenteLookup) {
      docenteLookup.addEventListener("focus", function () {
        renderDocenteResults(docenteLookup.value);
      });
      docenteLookup.addEventListener("input", function () {
        selectedDocente = null;
        if (docenteHidden) docenteHidden.value = "";
        renderDocenteResults(docenteLookup.value);
      });
      docenteLookup.addEventListener("blur", function () {
        window.setTimeout(function () {
          if (docenteResults) docenteResults.hidden = true;
          if (docenteHidden && !docenteHidden.value) {
            docenteLookup.value = "";
            selectedDocente = null;
          } else if (selectedDocente) {
            docenteLookup.value = docenteLabel(selectedDocente);
          }
        }, 150);
      });
    }

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
        var id = $("#editId").value;
        var mode = modal.getAttribute("data-mode") || "edit";
        if (mode === "assign") {
          await api("/materias-curso/" + encodeURIComponent(id) + "/asignar-docente", {
            method: "PATCH",
            body: JSON.stringify({ docenteId: $("#editDocente").value })
          });
        } else {
          await api("/materias-curso/" + encodeURIComponent(id), {
            method: "PUT",
            body: JSON.stringify({
              materia: $("#editMateria").value,
              docenteId: $("#editDocente").value,
              cursoId: $("#editAnio").value,
              cicloLectivo: Number($("#editCicloLectivo").value),
              activo: $("#editActivo").checked
            })
          });
        }
        setMsg(msg, "Actualizado", "ok");
        closeEditModal();
        loadAll();
      } catch (e2) {
        setMsg(msg, e2.message || "Error", "error");
      }
    });
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

  function formatFechaCorta(v) {
    if (!v) return "-";
    var d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return "-";
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yyyy = String(d.getFullYear());
    return dd + "/" + mm + "/" + yyyy;
  }

  async function loadDocentes() {
    var tbody = $("#docTbody");
    var msg = $("#docMsg");
    if (!tbody) return;
    setMsg(msg, "Cargando docentes...", "");
    try {
      var rows = await api("/users/staff?role=docente", { method: "GET" });
      rows = Array.isArray(rows) ? rows : [];
      tbody.innerHTML = "";
      if (!rows.length) {
        var tr0 = document.createElement("tr");
        var td0 = document.createElement("td");
        td0.colSpan = 5;
        td0.className = "table-empty";
        td0.textContent = "Sin docentes";
        tr0.appendChild(td0);
        tbody.appendChild(tr0);
        setMsg(msg, "OK", "ok");
        return;
      }

      rows.forEach(function (u) {
        var tr = document.createElement("tr");
        var tdN = document.createElement("td");
        tdN.textContent = u.nombre || "-";
        var tdA = document.createElement("td");
        tdA.textContent = u.apellido || "-";
        var tdF = document.createElement("td");
        tdF.textContent = formatFechaCorta(u.fechaNacimiento);
        var tdE = document.createElement("td");
        tdE.textContent = u.email || "-";

        var tdX = document.createElement("td");
        var btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.className = "btn btn-ghost";
        btnEdit.textContent = "Editar";
        btnEdit.style.padding = "0.5rem 0.7rem";
        btnEdit.style.fontSize = "0.9rem";
        btnEdit.addEventListener("click", function () {
          openDocEditModal(u);
        });

        var btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "btn btn-secondary";
        btnDel.textContent = "Eliminar";
        btnDel.style.padding = "0.5rem 0.7rem";
        btnDel.style.fontSize = "0.9rem";
        btnDel.addEventListener("click", function () {
          deleteDocente(u);
        });
        tdX.appendChild(btnEdit);
        tdX.appendChild(btnDel);

        tr.appendChild(tdN);
        tr.appendChild(tdA);
        tr.appendChild(tdF);
        tr.appendChild(tdE);
        tr.appendChild(tdX);
        tbody.appendChild(tr);
      });

      setMsg(msg, "OK", "ok");
    } catch (e) {
      setMsg(msg, e.message || "Error", "error");
    }
  }

  function openDocEditModal(u) {
    var modal = $("#docEditModal");
    if (!modal) return;
    $("#docEditId").value = u._id || u.id;
    $("#docEditNombre").value = u.nombre || "";
    $("#docEditApellido").value = u.apellido || "";
    $("#docEditFecha").value = toDateInputValue(u.fechaNacimiento);
    $("#docEditEmail").value = u.email || "";
    $("#docEditPass").value = "";
    setMsg($("#docEditMsg"), "", "");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      var el = $("#docEditNombre");
      if (el) el.focus();
    }, 0);
  }

  function closeDocEditModal() {
    var modal = $("#docEditModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function initDocEditModal() {
    var modal = $("#docEditModal");
    var form = $("#docEditForm");
    var msg = $("#docEditMsg");
    if (!modal || !form) return;

    modal.addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      if (t.getAttribute("data-close") === "true") closeDocEditModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDocEditModal();
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msg, "Guardando...", "");
      try {
        var id = $("#docEditId").value;
        var payload = {
          nombre: $("#docEditNombre").value,
          apellido: $("#docEditApellido").value,
          fechaNacimiento: $("#docEditFecha").value,
          email: $("#docEditEmail").value,
          roles: ["docente"]
        };
        if (!payload.apellido) delete payload.apellido;
        if (!payload.fechaNacimiento) delete payload.fechaNacimiento;
        var pass = $("#docEditPass").value;
        if (pass) payload.password = pass;

        await api("/users/staff/" + encodeURIComponent(id), {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setMsg(msg, "Actualizado", "ok");
        closeDocEditModal();
        loadDocentes();
      } catch (e2) {
        setMsg(msg, e2.message || "Error", "error");
      }
    });
  }

  async function deleteDocente(u) {
    if (!confirm("Eliminar docente " + (u.email || "") + "?")) return;
    var msg = $("#docMsg");
    setMsg(msg, "Eliminando...", "");
    try {
      await api("/users/staff/" + encodeURIComponent(u._id || u.id), { method: "DELETE" });
      setMsg(msg, "Eliminado", "ok");
      loadDocentes();
      loadAll();
    } catch (e) {
      setMsg(msg, e.message || "Error", "error");
    }
  }

  function initCreateDocente() {
    var form = $("#docenteForm");
    var msg = $("#docMsg");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msg, "Creando...", "");
      try {
        var payload = {
          nombre: $("#dNombre").value,
          apellido: $("#dApellido").value,
          fechaNacimiento: $("#dFecha").value,
          email: $("#dEmail").value,
          password: $("#dPass").value,
          roles: ["docente"]
        };
        if (!payload.apellido) delete payload.apellido;
        if (!payload.fechaNacimiento) delete payload.fechaNacimiento;

        await api("/users/staff", { method: "POST", body: JSON.stringify(payload) });
        form.reset();
        setMsg(msg, "Docente creado", "ok");
        loadDocentes();
      } catch (e2) {
        setMsg(msg, e2.message || "Error", "error");
      }
    });
  }


  function initImportDocentes() {
    var btn = $("#docImportBtn");
    var fileEl = $("#docCsvFile");
    var msg = $("#docImportMsg");
    var details = $("#docImportDetails");
    if (!btn || !fileEl) return;

    btn.addEventListener("click", async function () {
      setMsg(msg, "Leyendo archivo...", "");
      renderImportDetails(details, [], []);
      var f = fileEl.files && fileEl.files[0];
      if (!f) {
        setMsg(msg, "Selecciona un CSV", "error");
        return;
      }

      try {
        var text = await readCsvFile(f);
        setMsg(msg, "Importando...", "");
        var res = await api("/users/staff/import-csv", {
          method: "POST",
          body: JSON.stringify({ csv: text, defaultRole: "docente" })
        });
        setMsg(
          msg,
          "OK · creados: " + String(res.created || 0) + " · omitidos: " + String(res.skipped || 0),
          "ok"
        );
        renderImportDetails(details, res.credentials, res.errors);
        fileEl.value = "";
        loadDocentes();
        loadAll();
      } catch (e) {
        renderImportDetails(details, [], []);
        setMsg(msg, e.message || "Error", "error");
      }
    });
  }

  async function removeAsignacion(id) {
    if (!confirm("¿Eliminar asignación?")) return;
    var msg = $("#asigMsg");
    setMsg(msg, "Eliminando...", "");
    try {
      await api("/materias-curso/" + encodeURIComponent(id), { method: "DELETE" });
      await loadAll();
      setMsg(msg, "Eliminado", "ok");
    } catch (e) {
      setMsg(msg, e.message || "Error", "error");
    }
  }

  async function clearDocente(row) {
    if (!confirm("Quitar el docente asignado a esta materia?")) return;
    var msg = $("#asigMsg");
    setMsg(msg, "Quitando docente...", "");
    try {
      await api("/materias-curso/" + encodeURIComponent(row._id) + "/quitar-docente", { method: "PATCH" });
      await loadAll();
      setMsg(msg, "Docente quitado", "ok");
    } catch (e) {
      setMsg(msg, e.message || "Error", "error");
    }
  }

  function initCreateAnio() {
    var form = $("#anioForm");
    var msg = $("#anioMsg");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msg, "Creando...", "");
      try {
        await api("/cursos", {
          method: "POST",
          body: JSON.stringify({
            numero: Number($("#anioNumero").value),
            nombre: $("#anioNombre").value,
            division: $("#anioDivision").value,
            turno: $("#anioTurno").value
          })
        });
        form.reset();
        setMsg(msg, "Creado", "ok");
        loadAll();
      } catch (e2) {
        setMsg(msg, e2.message || "Error", "error");
      }
    });
  }

  function initCreateMateriaCurso() {
    var form = $("#maForm");
    var msg = $("#maMsg");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msg, "Creando...", "");
      try {
        await api("/materias-curso", {
          method: "POST",
          body: JSON.stringify({
            materia: $("#maMateria").value,
            cursoId: $("#maAnio").value,
            cicloLectivo: Number($("#maCicloLectivo").value)
          })
        });
        form.reset();
        setMsg(msg, "Creado", "ok");
        loadAll();
      } catch (e2) {
        setMsg(msg, e2.message || "Error", "error");
      }
    });
  }

  function initRefresh() {
    var btn = $("#refresh");
    if (btn) btn.addEventListener("click", loadAll);
  }

  function initCsvImport() {
    var btn = $("#importBtn");
    var fileEl = $("#csvFile");
    var msg = $("#importMsg");
    if (!btn || !fileEl) return;

    btn.addEventListener("click", async function () {
      setMsg(msg, "Leyendo archivo...", "");
      var f = fileEl.files && fileEl.files[0];
      if (!f) {
        setMsg(msg, "Selecciona un CSV", "error");
        return;
      }
      try {
        var text = await readCsvFile(f);
        setMsg(msg, "Importando...", "");
        var res = await api("/materias-curso/import-csv", {
          method: "POST",
          body: JSON.stringify({ csv: text })
        });
        setMsg(
          msg,
          "OK · creadas: " + String(res.created || 0) + " · omitidas: " + String(res.skipped || 0),
          "ok"
        );
        fileEl.value = "";
        loadAll();
      } catch (e) {
        setMsg(msg, e.message || "Error", "error");
      }
    });
  }

  if (!guard()) return;
  rememberPanelPath();
  var maCiclo = $("#maCicloLectivo");
  if (maCiclo && !maCiclo.value) maCiclo.value = currentCicloLectivo();
  injectIcons();
  initSidebarToggle();
  initSidebarViews();
  syncHeaderUser();
  initNoticias();
  initLogout();
  initCreateAnio();
  initCreateMateriaCurso();
  initRefresh();
  initEditModal();
  initCsvImport();
  initCreateDocente();
  initImportDocentes();
  initDocEditModal();
  var refreshDoc = $("#refreshDocentes");
  if (refreshDoc) refreshDoc.addEventListener("click", loadDocentes);
  loadAll();
  loadDocentes();
  loadNoticias();
})();
