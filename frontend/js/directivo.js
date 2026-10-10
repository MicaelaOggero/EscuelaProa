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

  var eventoCalendarState = {
    rows: [],
    monthCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedId: ""
  };

  var consultasState = {
    rows: [],
    selectedId: ""
  };

  function selectedEventoRoles() {
    return Array.prototype.slice.call(document.querySelectorAll("input[name='eventoVisibleRol']:checked")).map(function (el) {
      return el.value;
    });
  }

  function setSelectedEventoRoles(roles) {
    var active = Array.isArray(roles) ? roles : [];
    Array.prototype.slice.call(document.querySelectorAll("input[name='eventoVisibleRol']")).forEach(function (el) {
      el.checked = active.indexOf(el.value) !== -1;
    });
  }

  function syncEventoVisibility() {
    var tipo = $("#eventoVisibilidad");
    var rolesField = $("#eventoRolesField");
    if (!tipo || !rolesField) return;
    rolesField.hidden = tipo.value !== "privado";
  }

  function selectedNoticiaRoles() {
    return Array.prototype.slice.call(document.querySelectorAll("input[name='noticiaVisibleRol']:checked")).map(function (el) {
      return el.value;
    });
  }

  function setSelectedNoticiaRoles(roles) {
    var active = Array.isArray(roles) ? roles : [];
    Array.prototype.slice.call(document.querySelectorAll("input[name='noticiaVisibleRol']")).forEach(function (el) {
      el.checked = active.indexOf(el.value) !== -1;
    });
  }

  function syncNoticiaVisibility() {
    var tipo = $("#noticiaTipo");
    var rolesField = $("#noticiaRolesField");
    if (!tipo || !rolesField) return;
    var isPrivate = tipo.value === "privada";
    rolesField.hidden = !isPrivate;
  }

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
    sessionStorage.setItem(STORAGE_LAST_PANEL, "pages/directivo.html");
  }

  function injectIcons() {
    var icons = {
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
    function fallbackView() {
      var superLink = $("#staffSideLink");
      if (superLink && !superLink.hidden) return "staff";
      return "docentes";
    }

    function show(view) {
      var requestedView = view || fallbackView();
      var requestedLink = document.querySelector('.side-link[data-view="' + requestedView + '"]');
      if (requestedLink && requestedLink.hidden) requestedView = fallbackView();

      Array.prototype.slice.call(document.querySelectorAll(".view")).forEach(function (el) {
        el.classList.toggle("is-visible", el.getAttribute("data-view") === requestedView);
      });

      Array.prototype.slice.call(document.querySelectorAll(".side-link[data-view]")).forEach(function (el) {
        var active = el.getAttribute("data-view") === requestedView;
        el.classList.toggle("is-active", active);
        if (active) el.setAttribute("aria-current", "page");
        else el.removeAttribute("aria-current");
      });
    }

    Array.prototype.slice.call(document.querySelectorAll(".side-link[data-view]")).forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var view = el.getAttribute("data-view") || "docentes";
        show(view);
        window.location.hash = view;
        closeMobileSidebar();
      });
    });

    var hash = (window.location.hash || "").replace("#", "");
    show(hash || fallbackView());
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
    $("#noticiaTipo").value = "publica";
    setSelectedNoticiaRoles([]);
    $("#noticiaSubmit").textContent = "Publicar";
    $("#noticiaTitle").textContent = "Publicar noticia";
    $("#noticiaCancelEdit").hidden = true;
    syncNoticiaVisibility();
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
    $("#noticiaTipo").value = row.tipo || "publica";
    setSelectedNoticiaRoles(row.visibleParaRoles || []);
    $("#noticiaDestacada").checked = !!row.destacada;
    $("#noticiaSubmit").textContent = "Guardar cambios";
    $("#noticiaTitle").textContent = "Editar noticia";
    $("#noticiaCancelEdit").hidden = false;
    syncNoticiaVisibility();
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

  function formatFechaHora(value) {
    if (!value) return "-";
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "-";
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yyyy = String(d.getFullYear());
    var hh = String(d.getHours()).padStart(2, "0");
    var mi = String(d.getMinutes()).padStart(2, "0");
    return dd + "/" + mm + "/" + yyyy + " " + hh + ":" + mi;
  }

  function toDatetimeLocalValue(value) {
    if (!value) return "";
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    var hh = String(d.getHours()).padStart(2, "0");
    var mi = String(d.getMinutes()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd + "T" + hh + ":" + mi;
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

  function consultaEstadoLabel(value) {
    if (value === "en_proceso") return "En proceso";
    if (value === "cerrada") return "Cerrada";
    return "Nueva";
  }

  function previewText(value, max) {
    var text = String(value || "").trim().replace(/\s+/g, " ");
    if (!text) return "Sin mensaje";
    return text.length > max ? text.slice(0, max - 1) + "…" : text;
  }

  function consultaMailLabel(row) {
    if (!row) return "Sin datos";
    if (row.notificadoPorEmail) {
      return row.notificadoA && row.notificadoA.length
        ? "Enviado a " + row.notificadoA.join(", ")
        : "Correo enviado";
    }
    if (row.notificacionError) return row.notificacionError;
    return "Pendiente o sin configurar";
  }

  function renderStatusBadge(value, label) {
    return '<span class="status-badge status-badge--' + escapeHtml(value) + '">' + escapeHtml(label) + "</span>";
  }

  function renderNoticias(rows) {
    var tbody = $("#noticiasTbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!rows.length) {
      var emptyTr = document.createElement("tr");
      var emptyTd = document.createElement("td");
      emptyTd.colSpan = 5;
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
      var tdTipo = document.createElement("td");
      tdTipo.textContent = row.tipo === "privada" ? "Privada" : "Publica";
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
      tr.appendChild(tdTipo);
      tr.appendChild(tdFecha);
      tr.appendChild(tdAcciones);
      tbody.appendChild(tr);
    });
  }

  function renderNoticiasDirectivo(rows) {
    var list = $("#noticiasDirectivoList");
    if (!list) return;
    list.innerHTML = "";

    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No hay noticias privadas asignadas a directivos.";
      list.appendChild(empty);
      return;
    }

    rows.forEach(function (row) {
      var item = document.createElement("div");
      item.className = "item";

      var left = document.createElement("div");
      var title = document.createElement("div");
      title.className = "item-title";
      title.textContent = row.titulo || "Noticia privada";
      var sub = document.createElement("div");
      sub.className = "item-sub";
      sub.textContent = [row.categoria || "Institucional", "Privada para directivos"].join(" · ");
      left.appendChild(title);
      left.appendChild(sub);

      var meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = formatFecha(row.fecha);

      item.appendChild(left);
      item.appendChild(meta);
      list.appendChild(item);
    });
  }

  async function loadNoticias() {
    var msg = $("#noticiasMsg");
    setMsg(msg, "Cargando noticias...", "");
    try {
      var rows = await api("/noticias", { method: "GET" });
      rows = Array.isArray(rows) ? rows : [];
      renderNoticias(rows);
      renderNoticiasDirectivo(rows.filter(function (row) {
        return row && row.tipo === "privada" && Array.isArray(row.visibleParaRoles) && row.visibleParaRoles.indexOf("directivo") !== -1;
      }));
      setMsg(msg, "OK", "ok");
    } catch (e) {
      renderNoticias([]);
      renderNoticiasDirectivo([]);
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
    var tipoInput = $("#noticiaTipo");

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

    if (tipoInput) {
      tipoInput.addEventListener("change", syncNoticiaVisibility);
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
        var selectedRoles = selectedNoticiaRoles();
        if (($("#noticiaTipo").value || "publica") === "privada" && !selectedRoles.length) {
          setMsg(msg, "Selecciona al menos un rol para una noticia privada.", "error");
          return;
        }
        var payload = new FormData();
        payload.append("titulo", $("#noticiaTitulo").value);
        payload.append("categoria", $("#noticiaCategoria").value);
        payload.append("resumen", $("#noticiaResumen").value);
        payload.append("contenido", $("#noticiaContenido").value);
        payload.append("fecha", new Date().toISOString());
        payload.append("destacada", $("#noticiaDestacada") && $("#noticiaDestacada").checked ? "true" : "false");
        payload.append("tipo", $("#noticiaTipo").value || "publica");
        payload.append("visibleParaRoles", JSON.stringify(selectedRoles));
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

  function resetEventoForm() {
    var form = $("#eventoForm");
    if (!form) return;
    form.reset();
    $("#eventoId").value = "";
    $("#eventoVisibilidad").value = "publico";
    setSelectedEventoRoles([]);
    $("#eventoSubmit").textContent = "Crear evento";
    $("#eventoTitle").textContent = "Crear evento";
    $("#eventoCancelEdit").hidden = true;
    syncEventoVisibility();
  }

  function openEventoEdit(row) {
    $("#eventoId").value = row._id || row.id || "";
    $("#eventoTitulo").value = row.titulo || "";
    $("#eventoTipo").value = row.tipo || "Evento";
    $("#eventoInicio").value = toDatetimeLocalValue(row.inicio);
    $("#eventoFin").value = toDatetimeLocalValue(row.fin);
    $("#eventoUbicacion").value = row.ubicacion || "";
    $("#eventoDescripcion").value = row.descripcion || "";
    $("#eventoVisibilidad").value = row.visibilidad || "publico";
    setSelectedEventoRoles(row.visibleParaRoles || []);
    $("#eventoSubmit").textContent = "Guardar cambios";
    $("#eventoTitle").textContent = "Editar evento";
    $("#eventoCancelEdit").hidden = false;
    syncEventoVisibility();
    setMsg($("#eventoFormMsg"), "Editando evento...", "");
    openModal("#eventoModal");
  }

  function currentMonthRows() {
    var y = eventoCalendarState.monthCursor.getFullYear();
    var m = eventoCalendarState.monthCursor.getMonth();
    return eventoCalendarState.rows.filter(function (row) {
      var d = new Date(row.inicio);
      return !isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m;
    }).sort(function (a, b) {
      return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
    });
  }

  function openEventoDetalle(row) {
    var editBtn = $("#eventoDetalleEditar");
    var deleteBtn = $("#eventoDetalleEliminar");
    if (!row) {
      eventoCalendarState.selectedId = "";
      $("#eventoDetalleTitle").textContent = "Selecciona un evento";
      $("#eventoDetalleMeta").textContent = "Haz clic en un evento del calendario para ver el detalle.";
      $("#eventoDetalleVisibilidad").textContent = "-";
      $("#eventoDetalleUbicacion").textContent = "-";
      $("#eventoDetalleRoles").textContent = "-";
      $("#eventoDetalleDescripcion").textContent = "Selecciona un evento para ver su descripcion.";
      if (editBtn) editBtn.disabled = true;
      if (deleteBtn) deleteBtn.disabled = true;
      return;
    }
    eventoCalendarState.selectedId = String(row._id || row.id || "");
    $("#eventoDetalleTitle").textContent = row.titulo || "Detalle del evento";
    $("#eventoDetalleMeta").textContent = [row.tipo || "Evento", formatFechaHora(row.inicio)].filter(Boolean).join(" · ");
    $("#eventoDetalleVisibilidad").textContent = row.visibilidad === "privado" ? "Privado" : "Publico";
    $("#eventoDetalleUbicacion").textContent = row.ubicacion || "Sin ubicacion definida";
    $("#eventoDetalleRoles").textContent = row.visibilidad === "privado"
      ? ((row.visibleParaRoles || []).length ? row.visibleParaRoles.join(", ") : "Sin roles asignados")
      : "Toda la comunidad";
    $("#eventoDetalleDescripcion").textContent = row.descripcion || "Sin descripcion adicional.";
    if (editBtn) editBtn.disabled = false;
    if (deleteBtn) deleteBtn.disabled = false;
  }

  function renderEventosCalendar(rows) {
    var root = $("#eventosCalendar");
    var label = $("#eventosMesLabel");
    if (!root) return;
    root.innerHTML = "";
    if (label) label.textContent = monthLabel(eventoCalendarState.monthCursor);

    ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].forEach(function (day) {
      var head = document.createElement("div");
      head.className = "calendar-weekday";
      head.textContent = day;
      root.appendChild(head);
    });

    var monthStart = new Date(eventoCalendarState.monthCursor.getFullYear(), eventoCalendarState.monthCursor.getMonth(), 1);
    var monthEnd = new Date(eventoCalendarState.monthCursor.getFullYear(), eventoCalendarState.monthCursor.getMonth() + 1, 0);
    var startOffset = (monthStart.getDay() + 6) % 7;
    var gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - startOffset);

    var todayKey = dayKey(new Date());
    for (var i = 0; i < 42; i += 1) {
      var cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      var key = dayKey(cellDate);
      var dayRows = rows.filter(function (row) {
        return dayKey(row.inicio) === key;
      });

      var cell = document.createElement("div");
      cell.className = "calendar-day";
      if (cellDate.getMonth() !== eventoCalendarState.monthCursor.getMonth()) cell.classList.add("is-other-month");
      if (key === todayKey) cell.classList.add("is-today");

      var headRow = document.createElement("div");
      headRow.className = "calendar-day-head";
      var num = document.createElement("div");
      num.className = "calendar-day-number";
      num.textContent = String(cellDate.getDate());
      var count = document.createElement("div");
      count.className = "calendar-day-count";
      count.textContent = dayRows.length ? String(dayRows.length) + " evento" + (dayRows.length > 1 ? "s" : "") : "";
      headRow.appendChild(num);
      headRow.appendChild(count);

      var eventsWrap = document.createElement("div");
      eventsWrap.className = "calendar-events";
      dayRows.slice(0, 3).forEach(function (row) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calendar-event-pill calendar-event-pill--" + (row.visibilidad === "privado" ? "privado" : "publico");
        btn.innerHTML = '<span class="calendar-event-time">' + escapeHtml(timeLabel(row.inicio) || "Todo el dia") + '</span><span class="calendar-event-title">' + escapeHtml(row.titulo || "Evento") + '</span>';
        btn.addEventListener("click", function () {
          openEventoDetalle(row);
        });
        eventsWrap.appendChild(btn);
      });
      if (dayRows.length > 3) {
        var more = document.createElement("div");
        more.className = "calendar-day-count";
        more.textContent = "+" + String(dayRows.length - 3) + " mas";
        eventsWrap.appendChild(more);
      }

      cell.appendChild(headRow);
      cell.appendChild(eventsWrap);
      root.appendChild(cell);
    }
  }

  function renderEventosMonthList(rows) {
    var list = $("#eventosMonthList");
    if (!list) return;
    list.innerHTML = "";

    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Sin eventos en este mes.";
      list.appendChild(empty);
      return;
    }

    rows.forEach(function (row) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "item";
      item.style.textAlign = "left";
      item.style.font = "inherit";
      item.style.cursor = "pointer";
      var left = document.createElement("div");
      var title = document.createElement("div");
      title.className = "item-title";
      title.textContent = row.titulo || "Evento";
      var sub = document.createElement("div");
      sub.className = "item-sub";
      sub.textContent = [row.tipo || "Evento", row.visibilidad === "privado" ? "Privado" : "Publico", row.ubicacion || "Sin ubicacion"].join(" · ");
      var meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = formatFechaHora(row.inicio);
      left.appendChild(title);
      left.appendChild(sub);
      item.appendChild(left);
      item.appendChild(meta);
      item.addEventListener("click", function () {
        openEventoDetalle(row);
      });
      list.appendChild(item);
    });
  }

  function renderEventos(rows) {
    renderEventosCalendar(rows);
    renderEventosMonthList(currentMonthRows());
  }

  function renderEventosDirectivo(rows) {
    var list = $("#eventosDirectivoList");
    if (!list) return;
    list.innerHTML = "";

    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No hay eventos privados asignados a directivos.";
      list.appendChild(empty);
      return;
    }

    rows.forEach(function (row) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "item";
      item.style.textAlign = "left";
      item.style.font = "inherit";
      item.style.cursor = "pointer";
      var left = document.createElement("div");
      var title = document.createElement("div");
      title.className = "item-title";
      title.textContent = row.titulo || "Evento privado";
      var sub = document.createElement("div");
      sub.className = "item-sub";
      sub.textContent = [row.tipo || "Evento", row.ubicacion || "Sin ubicacion", "Privado para directivos"].join(" · ");
      var meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = formatFechaHora(row.inicio);
      left.appendChild(title);
      left.appendChild(sub);
      item.appendChild(left);
      item.appendChild(meta);
      item.addEventListener("click", function () {
        openEventoDetalle(row);
      });
      list.appendChild(item);
    });
  }

  async function loadEventos() {
    var msg = $("#eventosMsg");
    setMsg(msg, "Cargando eventos...", "");
    try {
      var rows = await api("/calendario", { method: "GET" });
      rows = Array.isArray(rows) ? rows : [];
      eventoCalendarState.rows = rows;
      renderEventos(rows);
      if (eventoCalendarState.selectedId) {
        var selected = rows.find(function (row) {
          return String(row._id || row.id) === String(eventoCalendarState.selectedId);
        });
        openEventoDetalle(selected || null);
      } else {
        openEventoDetalle(currentMonthRows()[0] || rows[0] || null);
      }
      renderEventosDirectivo(rows.filter(function (row) {
        return row && row.visibilidad === "privado" && Array.isArray(row.visibleParaRoles) && row.visibleParaRoles.indexOf("directivo") !== -1;
      }));
      setMsg(msg, "OK", "ok");
    } catch (e) {
      eventoCalendarState.rows = [];
      renderEventos([]);
      openEventoDetalle(null);
      renderEventosDirectivo([]);
      setMsg(msg, e.message || "Error", "error");
    }
  }

  async function deleteEvento(row) {
    if (!confirm("Eliminar evento '" + (row.titulo || "") + "'?")) return;
    var msg = $("#eventosMsg");
    setMsg(msg, "Eliminando...", "");
    try {
      await api("/calendario/" + encodeURIComponent(row._id || row.id), { method: "DELETE" });
      if ($("#eventoId").value === String(row._id || row.id)) {
        resetEventoForm();
        setMsg($("#eventoFormMsg"), "", "");
      }
      if (eventoCalendarState.selectedId === String(row._id || row.id)) {
        openEventoDetalle(null);
      }
      setMsg(msg, "Evento eliminado", "ok");
      loadEventos();
    } catch (e) {
      setMsg(msg, e.message || "Error", "error");
    }
  }

  function initEventos() {
    var form = $("#eventoForm");
    var msg = $("#eventoFormMsg");
    var refresh = $("#refreshEventos");
    var cancel = $("#eventoCancelEdit");
    var visibilidad = $("#eventoVisibilidad");
    var prevMes = $("#prevEventosMes");
    var nextMes = $("#nextEventosMes");
    var detalleEdit = $("#eventoDetalleEditar");
    var detalleDelete = $("#eventoDetalleEliminar");

    Array.prototype.slice.call(document.querySelectorAll("[data-open='crear-evento']")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        resetEventoForm();
        setMsg(msg, "", "");
        openModal("#eventoModal");
      });
    });

    if (cancel) {
      cancel.addEventListener("click", function () {
        resetEventoForm();
        setMsg(msg, "", "");
      });
    }

    if (refresh) refresh.addEventListener("click", loadEventos);
    if (visibilidad) visibilidad.addEventListener("change", syncEventoVisibility);
    if (prevMes) {
      prevMes.addEventListener("click", function () {
        eventoCalendarState.monthCursor = new Date(eventoCalendarState.monthCursor.getFullYear(), eventoCalendarState.monthCursor.getMonth() - 1, 1);
        renderEventos(eventoCalendarState.rows);
      });
    }
    if (nextMes) {
      nextMes.addEventListener("click", function () {
        eventoCalendarState.monthCursor = new Date(eventoCalendarState.monthCursor.getFullYear(), eventoCalendarState.monthCursor.getMonth() + 1, 1);
        renderEventos(eventoCalendarState.rows);
      });
    }
    if (detalleEdit) {
      detalleEdit.addEventListener("click", function () {
        var row = eventoCalendarState.rows.find(function (item) {
          return String(item._id || item.id) === String(eventoCalendarState.selectedId || "");
        });
        if (row) openEventoEdit(row);
      });
    }
    if (detalleDelete) {
      detalleDelete.addEventListener("click", function () {
        var row = eventoCalendarState.rows.find(function (item) {
          return String(item._id || item.id) === String(eventoCalendarState.selectedId || "");
        });
        if (row) deleteEvento(row);
      });
    }

    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msg, "Guardando...", "");
      try {
        var id = $("#eventoId").value;
        var selectedRoles = selectedEventoRoles();
        var currentVisibility = $("#eventoVisibilidad").value || "publico";
        if (currentVisibility === "privado" && !selectedRoles.length) {
          setMsg(msg, "Selecciona al menos un rol para un evento privado.", "error");
          return;
        }

        await api(id ? "/calendario/" + encodeURIComponent(id) : "/calendario", {
          method: id ? "PUT" : "POST",
          body: JSON.stringify({
            titulo: $("#eventoTitulo").value,
            tipo: $("#eventoTipo").value || "Evento",
            inicio: new Date($("#eventoInicio").value).toISOString(),
            fin: $("#eventoFin").value ? new Date($("#eventoFin").value).toISOString() : "",
            ubicacion: $("#eventoUbicacion").value,
            descripcion: $("#eventoDescripcion").value,
            visibilidad: currentVisibility,
            visibleParaRoles: selectedRoles
          })
        });

        setMsg(msg, id ? "Evento actualizado" : "Evento creado", "ok");
        resetEventoForm();
        closeModal($("#eventoModal"));
        loadEventos();
      } catch (err) {
        setMsg(msg, err.message || "Error", "error");
      }
    });
  }

  function updateConsultasCounters(rows) {
    var list = Array.isArray(rows) ? rows : [];
    var total = list.length;
    var nuevas = list.filter(function (row) { return row.estado === "nueva"; }).length;
    var proceso = list.filter(function (row) { return row.estado === "en_proceso"; }).length;
    var cerradas = list.filter(function (row) { return row.estado === "cerrada"; }).length;

    if ($("#consultasTotalCount")) $("#consultasTotalCount").textContent = String(total);
    if ($("#consultasNuevasCount")) $("#consultasNuevasCount").textContent = String(nuevas);
    if ($("#consultasProcesoCount")) $("#consultasProcesoCount").textContent = String(proceso);
    if ($("#consultasCerradasCount")) $("#consultasCerradasCount").textContent = String(cerradas);
  }

  function renderConsultas(rows) {
    var tbody = $("#consultasTbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    updateConsultasCounters(rows);

    if (!rows.length) {
      var emptyTr = document.createElement("tr");
      var emptyTd = document.createElement("td");
      emptyTd.colSpan = 6;
      emptyTd.className = "table-empty";
      emptyTd.textContent = "Sin consultas registradas";
      emptyTr.appendChild(emptyTd);
      tbody.appendChild(emptyTr);
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement("tr");

      var tdContacto = document.createElement("td");
      tdContacto.innerHTML =
        '<div class="consulta-contact"><strong>' + escapeHtml(row.nombre || "Sin nombre") + '</strong><span>' + escapeHtml(row.email || "-") + '</span></div>';

      var tdMotivo = document.createElement("td");
      tdMotivo.innerHTML =
        '<div><strong>' + escapeHtml(row.motivo || "Sin motivo") + '</strong><div class="consulta-message-preview">' + escapeHtml(previewText(row.mensaje, 90)) + "</div></div>";

      var tdFecha = document.createElement("td");
      tdFecha.textContent = formatFechaHora(row.createdAt);

      var tdEstado = document.createElement("td");
      tdEstado.innerHTML = renderStatusBadge(row.estado || "nueva", consultaEstadoLabel(row.estado));

      var tdCorreo = document.createElement("td");
      tdCorreo.innerHTML = '<span class="consulta-mail-state">' + escapeHtml(consultaMailLabel(row)) + "</span>";

      var tdAcciones = document.createElement("td");
      var actions = document.createElement("div");
      actions.className = "consulta-actions";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-secondary btn-sm";
      btn.textContent = "Ver detalle";
      btn.addEventListener("click", function () {
        openConsultaModal(row);
      });
      actions.appendChild(btn);
      tdAcciones.appendChild(actions);

      tr.appendChild(tdContacto);
      tr.appendChild(tdMotivo);
      tr.appendChild(tdFecha);
      tr.appendChild(tdEstado);
      tr.appendChild(tdCorreo);
      tr.appendChild(tdAcciones);
      tbody.appendChild(tr);
    });
  }

  function openConsultaModal(row) {
    if (!row) return;
    consultasState.selectedId = String(row._id || row.id || "");
    $("#consultaId").value = consultasState.selectedId;
    $("#consultaNombre").value = row.nombre || "";
    $("#consultaEmail").value = row.email || "";
    $("#consultaMotivo").value = row.motivo || "";
    $("#consultaMensaje").value = row.mensaje || "";
    $("#consultaEstado").value = row.estado || "nueva";
    $("#consultaNotas").value = row.notasInternas || "";
    $("#consultaNotificacion").value = consultaMailLabel(row);
    $("#consultaMeta").textContent = "Recibida el " + formatFechaHora(row.createdAt);
    setMsg($("#consultaFormMsg"), "", "");
    openModal("#consultaModal");
  }

  function closeConsultaModal() {
    closeModal($("#consultaModal"));
  }

  async function loadMailConfig() {
    var badge = $("#consultasMailBadge");
    var summary = $("#consultasMailSummary");
    var meta = $("#consultasMailMeta");
    if (!badge || !summary || !meta) return;

    try {
      var data = await api("/contacto/mail-config", { method: "GET" });
      badge.className = "status-badge " + (data.enabled ? "status-badge--enabled" : "status-badge--disabled");
      badge.textContent = data.enabled ? "Configurado" : "Incompleto";
      summary.textContent = data.enabled
        ? "Las nuevas consultas enviarán notificaciones mediante Resend."
        : "Faltan las variables de Resend o los destinatarios para enviar avisos automáticos.";
      meta.textContent = data.enabled
        ? "Desde: " + (data.from || "-") + " · Para: " + ((data.to || []).join(", ") || "-")
        : "Configura RESEND_API_KEY, RESEND_FROM y CONTACTO_NOTIF_TO en el backend.";
    } catch (err) {
      badge.className = "status-badge status-badge--pending";
      badge.textContent = "Error";
      summary.textContent = err.message || "No se pudo verificar la configuración de correo.";
      meta.textContent = "";
    }
  }

  async function loadConsultas() {
    var msg = $("#consultasMsg");
    var estado = $("#consultaEstadoFiltro");
    var search = $("#consultaSearch");
    setMsg(msg, "Cargando consultas...", "");
    try {
      var params = new URLSearchParams();
      if (estado && estado.value) params.set("estado", estado.value);
      if (search && search.value.trim()) params.set("q", search.value.trim());
      var query = params.toString() ? "?" + params.toString() : "";
      var rows = await api("/contacto" + query, { method: "GET" });
      consultasState.rows = Array.isArray(rows) ? rows : [];
      renderConsultas(consultasState.rows);
      setMsg(msg, "OK", "ok");
      if (consultasState.selectedId) {
        var selected = consultasState.rows.find(function (row) {
          return String(row._id || row.id) === String(consultasState.selectedId);
        });
        if (selected) openConsultaModal(selected);
      }
    } catch (err) {
      consultasState.rows = [];
      renderConsultas([]);
      setMsg(msg, err.message || "Error", "error");
    }
  }

  function initConsultas() {
    var refresh = $("#refreshConsultas");
    var estado = $("#consultaEstadoFiltro");
    var search = $("#consultaSearch");
    var form = $("#consultaForm");
    var msg = $("#consultaFormMsg");
    var searchTimer = null;

    if (refresh) refresh.addEventListener("click", loadConsultas);
    if (estado) estado.addEventListener("change", loadConsultas);
    if (search) {
      search.addEventListener("input", function () {
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(loadConsultas, 220);
      });
    }

    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msg, "Guardando seguimiento...", "");
      try {
        var id = $("#consultaId").value;
        var res = await api("/contacto/" + encodeURIComponent(id), {
          method: "PATCH",
          body: JSON.stringify({
            estado: $("#consultaEstado").value,
            notasInternas: $("#consultaNotas").value
          })
        });
        setMsg(msg, "Consulta actualizada", "ok");
        if (res && res.consulta) openConsultaModal(res.consulta);
        loadConsultas();
      } catch (err) {
        setMsg(msg, err.message || "Error", "error");
      }
    });
  }

  function syncHeaderUser() {
    var nameEl = $("#directivoNombre");
    var kickerEl = $("#panelTopbarKicker");
    var sideTitleEl = $("#panelSideTitle");
    var sideSubEl = $("#panelSideSub");
    if (!nameEl) return;
    var user = getUser();
    if (!user) return;
    var roles = rolesOf(user);
    var isSuperadmin = roles.indexOf("superadmin") !== -1;
    var label = [user.nombre, user.apellido].filter(Boolean).join(" ");
    nameEl.textContent = label || user.email || "Gestion academica";
    if (kickerEl) kickerEl.textContent = isSuperadmin ? "Superadmin" : "Directivo";
    if (sideTitleEl) sideTitleEl.textContent = isSuperadmin ? "Panel Superadmin" : "Panel Directivo";
    if (sideSubEl) sideSubEl.textContent = isSuperadmin ? "Acceso completo institucional" : "Escuela Experimental Porteña";
  }

  function rolesOf(u) {
    var roles = (u && (u.roles || (u.role ? [u.role] : []))) || [];
    return Array.isArray(roles) ? roles : [];
  }

  function hasCurrentRole(role) {
    return rolesOf(getUser()).indexOf(role) !== -1;
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
    var isSuperadmin = roles.indexOf("superadmin") !== -1;
    if (!isDirectivoLike) {
      if (roles.indexOf("docente") !== -1) window.location.href = "docente.html";
      else window.location.href = "../index.html";
      return false;
    }

    var staffSideLink = $("#staffSideLink");
    if (staffSideLink) staffSideLink.hidden = !isSuperadmin;

    var docentesSideLink = $("#docentesSideLink");
    if (docentesSideLink) docentesSideLink.hidden = isSuperadmin;

    Array.prototype.slice.call(document.querySelectorAll('.view[data-view="staff"]')).forEach(function (el) {
      el.hidden = !isSuperadmin;
    });

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

  function renderStaffRows(users) {
    var tbody = $("#staffTbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!users || !users.length) {
      var trEmpty = document.createElement("tr");
      var tdEmpty = document.createElement("td");
      tdEmpty.colSpan = 6;
      tdEmpty.className = "table-empty";
      tdEmpty.textContent = "Sin resultados";
      trEmpty.appendChild(tdEmpty);
      tbody.appendChild(trEmpty);
      return;
    }

    users.forEach(function (u) {
      var tr = document.createElement("tr");

      var tdNombre = document.createElement("td");
      tdNombre.textContent = u.nombre || "-";
      tr.appendChild(tdNombre);

      var tdApellido = document.createElement("td");
      tdApellido.textContent = u.apellido || "-";
      tr.appendChild(tdApellido);

      var tdNac = document.createElement("td");
      tdNac.textContent = formatFecha(u.fechaNacimiento);
      tr.appendChild(tdNac);

      var tdEmail = document.createElement("td");
      tdEmail.textContent = u.email || "-";
      tr.appendChild(tdEmail);

      var tdRole = document.createElement("td");
      tdRole.textContent = (u.roles && u.roles.length ? u.roles.join(", ") : u.role) || "-";
      tr.appendChild(tdRole);

      var tdActions = document.createElement("td");
      var actions = document.createElement("div");
      actions.className = "row-actions";

      var btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn btn-ghost btn-sm";
      btnEdit.textContent = "Editar";
      btnEdit.addEventListener("click", function () {
        openStaffEditModal(u);
      });

      var btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "btn btn-secondary btn-sm";
      btnDel.textContent = "Eliminar";
      btnDel.addEventListener("click", function () {
        deleteStaff(u);
      });

      actions.appendChild(btnEdit);
      actions.appendChild(btnDel);
      tdActions.appendChild(actions);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  }

  async function loadStaff() {
    var msgEl = $("#staffListMsg");
    if (!msgEl) return;
    setMsg(msgEl, "Cargando staff...", "");
    try {
      var filter = $("#filterRole");
      var q = filter && filter.value ? "?role=" + encodeURIComponent(filter.value) : "";
      var data = await api("/users/staff" + q, { method: "GET" });
      renderStaffRows(data);
      setMsg(msgEl, "OK", "ok");
    } catch (err) {
      renderStaffRows([]);
      setMsg(msgEl, err.message || "Error", "error");
    }
  }

  async function deleteStaff(user) {
    var msgEl = $("#staffListMsg");
    if (!user || !user._id) {
      setMsg(msgEl, "ID invalido", "error");
      return;
    }
    if (!confirm("Eliminar a " + (user.email || user.nombre || "este usuario") + "?")) return;
    setMsg(msgEl, "Eliminando...", "");
    try {
      await api("/users/staff/" + encodeURIComponent(user._id), { method: "DELETE" });
      await Promise.all([loadStaff(), loadDocentes(), loadAll()]);
      setMsg(msgEl, "Eliminado", "ok");
    } catch (err) {
      setMsg(msgEl, err.message || "Error", "error");
    }
  }

  function openStaffEditModal(user) {
    var modal = $("#staffEditModal");
    if (!modal || !user || !user._id) return;

    $("#staffEditId").value = user._id;
    $("#staffEditEmail").value = user.email || "";
    $("#staffEditNombre").value = user.nombre || "";
    $("#staffEditApellido").value = user.apellido || "";
    $("#staffEditFechaNac").value = toDateInputValue(user.fechaNacimiento);
    var roles = user.roles && user.roles.length ? user.roles : user.role ? [user.role] : [];
    $("#staffEditRoleDirectivo").checked = roles.indexOf("directivo") !== -1;
    $("#staffEditRoleDocente").checked = roles.indexOf("docente") !== -1;
    setMsg($("#staffEditMsg"), "", "");

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      var el = $("#staffEditNombre");
      if (el) el.focus();
    }, 0);
  }

  function closeStaffEditModal() {
    var modal = $("#staffEditModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function initStaffEditModal() {
    var modal = $("#staffEditModal");
    var closeBtn = $("#staffCloseEdit");
    var cancelBtn = $("#staffCancelEdit");
    var form = $("#staffEditForm");
    var msgEl = $("#staffEditMsg");
    if (!modal || !form) return;

    if (closeBtn) closeBtn.addEventListener("click", closeStaffEditModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeStaffEditModal);

    modal.addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      if (t.getAttribute("data-close") === "true") closeStaffEditModal();
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Guardando...", "");
      try {
        var id = $("#staffEditId").value;
        var nombre = String($("#staffEditNombre").value || "").trim();
        var apellido = String($("#staffEditApellido").value || "").trim();
        var fechaNacimiento = String($("#staffEditFechaNac").value || "").trim();
        var roles = [];
        if ($("#staffEditRoleDirectivo").checked) roles.push("directivo");
        if ($("#staffEditRoleDocente").checked) roles.push("docente");

        if (!nombre) return setMsg(msgEl, "Nombre requerido", "error");
        if (!roles.length) return setMsg(msgEl, "Selecciona al menos un rol", "error");

        var payload = { nombre: nombre, roles: roles };
        if (apellido) payload.apellido = apellido;
        if (fechaNacimiento) payload.fechaNacimiento = fechaNacimiento;

        await api("/users/staff/" + encodeURIComponent(id), {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        await Promise.all([loadStaff(), loadDocentes(), loadAll()]);
        setMsg(msgEl, "Actualizado", "ok");
        closeStaffEditModal();
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function initCreateStaff() {
    var form = $("#createStaffForm");
    var msgEl = $("#createMsg");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Creando...", "");
      try {
        var roles = [];
        if ($("#staffRoleDirectivo").checked) roles.push("directivo");
        if ($("#staffRoleDocente").checked) roles.push("docente");
        if (!roles.length) {
          setMsg(msgEl, "Selecciona al menos un rol", "error");
          return;
        }
        var payload = {
          nombre: $("#staffNombre").value,
          apellido: $("#staffApellido").value,
          fechaNacimiento: $("#staffFechaNac").value,
          email: $("#staffEmail").value,
          password: $("#staffPassword").value,
          roles: roles
        };
        if (!payload.apellido) delete payload.apellido;
        if (!payload.fechaNacimiento) delete payload.fechaNacimiento;
        await api("/users/staff", { method: "POST", body: JSON.stringify(payload) });
        form.reset();
        $("#staffRoleDocente").checked = true;
        setMsg(msgEl, "Creado", "ok");
        await Promise.all([loadStaff(), loadDocentes(), loadAll()]);
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function initImportStaff() {
    var btn = $("#staffImportBtn");
    var fileInput = $("#staffCsvFile");
    var msgEl = $("#staffImportMsg");
    var detailsEl = $("#staffImportDetails");
    if (!btn || !fileInput) return;

    btn.addEventListener("click", async function () {
      if (!fileInput.files || !fileInput.files[0]) {
        setMsg(msgEl, "Selecciona un archivo CSV", "error");
        return;
      }

      if (detailsEl) {
        detailsEl.hidden = true;
        detailsEl.innerHTML = "";
      }
      setMsg(msgEl, "Importando...", "");

      try {
        var text = await readCsvFile(fileInput.files[0]);
        var res = await api("/users/staff/import-csv", {
          method: "POST",
          body: JSON.stringify({
            csv: text,
            defaultRole: $("#staffImportRole") ? $("#staffImportRole").value : "docente"
          })
        });

        setMsg(msgEl, "Importacion completada", "ok");
        renderImportDetails(detailsEl, res.credentials, res.errors);
        fileInput.value = "";
        await Promise.all([loadStaff(), loadDocentes(), loadAll()]);
      } catch (err) {
        renderImportDetails(detailsEl, [], []);
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function initStaffListControls() {
    var refresh = $("#refreshStaff");
    var filter = $("#filterRole");
    if (refresh) refresh.addEventListener("click", loadStaff);
    if (filter) filter.addEventListener("change", loadStaff);
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
  initEventos();
  initConsultas();
  if (hasCurrentRole("superadmin")) {
    initCreateStaff();
    initImportStaff();
    initStaffListControls();
    initStaffEditModal();
  }
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
  if (hasCurrentRole("superadmin")) loadStaff();
  loadNoticias();
  loadEventos();
  loadMailConfig();
  loadConsultas();
})();
