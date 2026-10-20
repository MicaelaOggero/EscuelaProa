(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var STORAGE_LAST_PANEL = "eep_last_panel_path";
  var state = {
    materias: [],
    selectedMateriaId: "",
    academicas: [],
    noticias: [],
    eventos: []
  };

  var eventCalendarState = {
    monthCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedId: ""
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

  function fileUrl(file) {
    if (!file || !file.url) return "";
    if (/^https?:\/\//i.test(file.url)) return file.url;
    return getApiBase().replace(/\/api\/?$/, "") + (String(file.url).charAt(0) === "/" ? file.url : "/" + file.url);
  }

  function visibilityLabel(noticia) {
  return noticia && noticia.tipo === "privada" ? "Privada para estudiantes" : "Pública";
  }

  function eventVisibilityLabel(evento) {
  return evento && evento.visibilidad === "privado" ? "Privado para estudiantes" : "Público";
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
        loadAcademicPosts();
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

  function renderStudentNews(rows) {
    var wrap = $("#studentNewsList");
    if (!wrap) return;
    rows = (rows || []).filter(function (row) {
      return row && row.tipo === "privada";
    });
    wrap.innerHTML = "";

    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "card";
    empty.textContent = "Todavía no hay novedades disponibles.";
      wrap.appendChild(empty);
      return;
    }

    rows.slice(0, 4).forEach(function (row) {
      var card = document.createElement("article");
      card.className = "card" + (row.tipo === "privada" ? " student-news-card-private" : "");
      card.classList.add("student-content-item");
      card.addEventListener("click", function () {
        openStudentContentDetail(row);
      });
      var meta = document.createElement("div");
      meta.className = "meta";
      var chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = visibilityLabel(row);
      var date = document.createElement("div");
      date.className = "date";
      date.textContent = formatFecha(row.fecha);
      meta.appendChild(chip);
      meta.appendChild(date);
      meta.hidden = true;

      var title = document.createElement("div");
      title.className = "title";
      title.textContent = row.titulo || "Noticia";

      var text = document.createElement("p");
      text.className = "text";
      text.textContent = row.resumen || row.contenido || "Sin resumen disponible.";
      text.hidden = true;

      var by = document.createElement("div");
      by.className = "byline";
      by.hidden = true;
      by.textContent = [row.categoria || "Institucional", visibilityLabel(row)].join(" · ");

      card.appendChild(meta);
      card.appendChild(title);
      card.appendChild(text);
      card.appendChild(by);
      wrap.appendChild(card);
    });
  }

  function renderAcademicPosts(rows) {
    var wrap = $("#studentAcademicList");
    if (!wrap) return;
    wrap.innerHTML = "";

    if (!state.selectedMateriaId) {
      var emptyMateria = document.createElement("div");
      emptyMateria.className = "card";
    emptyMateria.textContent = "Seleccioná una materia para ver publicaciones.";
      wrap.appendChild(emptyMateria);
      return;
    }

    if (!rows.length) {
      var empty = document.createElement("div");
      empty.className = "card";
    empty.textContent = "Todavía no hay publicaciones para esta materia.";
      wrap.appendChild(empty);
      return;
    }

    rows.slice(0, 4).forEach(function (row) {
      var card = document.createElement("article");
      card.className = "card student-content-item";
      card.addEventListener("click", function () {
        openStudentContentDetail(row);
      });
      var meta = document.createElement("div");
      meta.className = "meta";
      var chip = document.createElement("div");
      chip.className = "chip";
    chip.textContent = "Publicación docente";
      var date = document.createElement("div");
      date.className = "date";
      date.textContent = formatFecha(row.fecha || row.createdAt);
      meta.appendChild(chip);
      meta.appendChild(date);
      meta.hidden = true;

      var title = document.createElement("div");
      title.className = "title";
      title.textContent = row.titulo || "Publicación";

      var text = document.createElement("p");
      text.className = "text";
      text.textContent = row.resumen || row.contenido || "Sin contenido disponible.";
      text.hidden = true;

      var files = Array.isArray(row.archivos) ? row.archivos.filter(function (file) {
        return !!(file && file.url);
      }) : [];

      var by = document.createElement("div");
      by.className = "byline";
      var who = row.createdBy ? [row.createdBy.apellido, row.createdBy.nombre].filter(Boolean).join(", ") : "Docente";
      by.textContent = [materiaConAnioLabel(row.materiaCursoId), who].filter(Boolean).join(" · ");

      card.appendChild(meta);
      card.appendChild(title);
      card.appendChild(text);
      if (files.length) {
        var links = document.createElement("div");
        links.className = "files";
        files.forEach(function (file) {
          var link = document.createElement("a");
          link.className = "file-link";
          link.href = fileUrl(file);
          link.target = "_blank";
          link.rel = "noreferrer noopener";
          link.textContent = file.name || "Adjunto";
          links.appendChild(link);
        });
        card.appendChild(links);
      }
      card.appendChild(by);
      wrap.appendChild(card);
    });
  }

  function openStudentEventDetail(row) {
    if (!row) return;
    eventCalendarState.selectedId = String(row._id || row.id || "");
    $("#studentEventoTitle").textContent = row.titulo || "Detalle del evento";
    $("#studentEventoMeta").textContent = [row.tipo || "Evento", formatFechaHora(row.inicio)].filter(Boolean).join(" · ");
    $("#studentEventoVisibilidad").textContent = row.materiaCursoId ? "Para tu materia" : eventVisibilityLabel(row);
    $("#studentEventoMateria").textContent = row.materiaCursoId ? materiaConAnioLabel(row.materiaCursoId) : "Institucional";
    $("#studentEventoUbicacion").textContent = row.ubicacion || "Sin ubicación definida";
    $("#studentEventoRoles").textContent = row.materiaCursoId
      ? "Estudiantes de esta materia"
      : row.visibilidad === "privado"
        ? ((row.visibleParaRoles || []).length ? row.visibleParaRoles.join(", ") : "Sin roles asignados")
        : "Toda la comunidad";
    $("#studentEventoDescripcion").textContent = row.descripcion || "Sin descripción adicional.";
    var modal = $("#studentEventoDetalleModal");
    if (modal) {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
    }
  }

  function closeStudentEventDetail() {
    var modal = $("#studentEventoDetalleModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function closeStudentContentDetail() {
    var modal = $("#studentContentDetailModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function renderStudentCalendar(rows, rootSelector, labelSelector) {
    var root = $(rootSelector || "#studentCalendar");
    var label = $(labelSelector || "#studentMesLabel");
    if (!root) return;
    root.innerHTML = "";
    if (label) label.textContent = monthLabel(eventCalendarState.monthCursor);

    ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].forEach(function (day) {
      var head = document.createElement("div");
      head.className = "student-calendar-weekday";
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
      var dayRows = (rows || []).filter(function (row) {
        return dayKey(row.inicio) === key;
      });

      var cell = document.createElement("div");
      cell.className = "student-calendar-day";
      if (cellDate.getMonth() !== eventCalendarState.monthCursor.getMonth()) cell.classList.add("is-other-month");
      if (key === todayKey) cell.classList.add("is-today");

      var headRow = document.createElement("div");
      headRow.className = "student-calendar-day-head";
      var num = document.createElement("div");
      num.className = "student-calendar-day-number";
      num.textContent = String(cellDate.getDate());
      var count = document.createElement("div");
      count.className = "student-calendar-day-count";
      count.textContent = dayRows.length ? String(dayRows.length) : "";
      headRow.appendChild(num);
      headRow.appendChild(count);

      var eventsWrap = document.createElement("div");
      eventsWrap.className = "student-calendar-events";
      dayRows.slice(0, 3).forEach(function (row) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "student-calendar-event-pill student-calendar-event-pill--" + (row.visibilidad === "privado" ? "privado" : "publico");
        btn.innerHTML = '<span class="student-calendar-event-time">' + timeLabel(row.inicio) + '</span><span class="student-calendar-event-title">' + row.titulo + '</span>';
        btn.addEventListener("click", function () {
          openStudentEventDetail(row);
        });
        eventsWrap.appendChild(btn);
      });
      cell.appendChild(headRow);
      cell.appendChild(eventsWrap);
      root.appendChild(cell);
    }
  }

  function renderStudentCalendars(rows) {
    renderStudentCalendar(rows, "#studentCalendar", "#studentMesLabel");
    renderStudentCalendar(rows, "#studentCalendarExpanded", "#studentMesLabelExpanded");
  }

  function openStudentCalendarExpanded() {
    renderStudentCalendars(state.eventos);
    var modal = $("#studentCalendarExpandModal");
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeStudentCalendarExpanded() {
    var modal = $("#studentCalendarExpandModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function actividadComoEvento(row) {
    return Object.assign({}, row, {
      inicio: row.fecha || row.createdAt,
      fin: null,
      descripcion: row.resumen || row.contenido || "",
      tipo: "Actividad",
      visibilidad: "privado",
      origen: "actividad"
    });
  }

  async function loadEventos() {
    var msg = $("#studentEventsMsg");
    setMsg(msg, "Cargando agenda...", "");
    try {
      var responses = await Promise.all([
        api("/calendario", { method: "GET" }),
        api("/contenidos?tipo=actividad", { method: "GET" })
      ]);
      var rows = Array.isArray(responses[0]) ? responses[0].slice() : [];
      var activityIds = new Set(rows
        .filter(function (row) { return row && row.origen === "actividad"; })
        .map(function (row) { return String(row._id || row.id); }));
      (Array.isArray(responses[1]) ? responses[1] : [])
        .filter(function (row) {
          return row && row.tipo === "actividad" && !activityIds.has(String(row._id || row.id));
        })
        .forEach(function (row) {
          rows.push(actividadComoEvento(row));
        });
      state.eventos = rows.sort(function (a, b) {
        return new Date(a.inicio || a.createdAt || 0).getTime() - new Date(b.inicio || b.createdAt || 0).getTime();
      });
      renderStudentCalendars(state.eventos);
      setMsg(msg, "", "");
    } catch (e) {
      state.eventos = [];
      renderStudentCalendars([]);
      setMsg(msg, e.message || "Error", "error");
    }
  }

  function initEventModal() {
    Array.prototype.slice.call(document.querySelectorAll("#studentCalendarExpandModal [data-close='true']")).forEach(function (el) {
      el.addEventListener("click", function () {
        closeStudentCalendarExpanded();
      });
    });

    var calendarExpandModal = $("#studentCalendarExpandModal");
    if (calendarExpandModal) {
      calendarExpandModal.addEventListener("click", function (e) {
        var target = e.target;
        if (!(target instanceof Element)) return;
        if (target.getAttribute("data-close") === "true") closeStudentCalendarExpanded();
      });
    }

    var expandButton = $("#studentCalendarExpand");
    if (expandButton) expandButton.addEventListener("click", openStudentCalendarExpanded);

    Array.prototype.slice.call(document.querySelectorAll("#studentEventoDetalleModal [data-close='true']")).forEach(function (el) {
      el.addEventListener("click", function () {
        closeStudentEventDetail();
      });
    });

    var modal = $("#studentEventoDetalleModal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        var target = e.target;
        if (!(target instanceof Element)) return;
        if (target.getAttribute("data-close") === "true") closeStudentEventDetail();
      });
    }

    var contentModal = $("#studentContentDetailModal");
    if (contentModal) {
      contentModal.addEventListener("click", function (e) {
        var target = e.target;
        if (!(target instanceof Element)) return;
        if (target.getAttribute("data-close") === "true") closeStudentContentDetail();
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeStudentCalendarExpanded();
        closeStudentEventDetail();
        closeStudentContentDetail();
      }
    });

    var prevExpanded = $("#prevStudentMesExpanded");
    if (prevExpanded) {
      prevExpanded.addEventListener("click", function () {
        eventCalendarState.monthCursor = new Date(eventCalendarState.monthCursor.getFullYear(), eventCalendarState.monthCursor.getMonth() - 1, 1);
        renderStudentCalendars(state.eventos);
      });
    }
    var nextExpanded = $("#nextStudentMesExpanded");
    if (nextExpanded) {
      nextExpanded.addEventListener("click", function () {
        eventCalendarState.monthCursor = new Date(eventCalendarState.monthCursor.getFullYear(), eventCalendarState.monthCursor.getMonth() + 1, 1);
        renderStudentCalendars(state.eventos);
      });
    }
  }

  async function loadNoticias() {
    var msg = $("#studentNewsMsg");
    setMsg(msg, "Cargando novedades...", "");
    try {
      var rows = await api("/noticias", { method: "GET" });
      state.noticias = Array.isArray(rows) ? rows : [];
      renderStudentNews(state.noticias);
      setMsg(msg, "", "");
    } catch (e) {
      state.noticias = [];
      renderStudentNews([]);
      setMsg(msg, e.message || "Error", "error");
    }
  }

  async function loadAcademicPosts() {
    var msg = $("#studentAcademicMsg");
    if (!state.selectedMateriaId) {
      state.academicas = [];
      renderAcademicPosts([]);
      setMsg(msg, "", "");
      return;
    }

    setMsg(msg, "Cargando publicaciones...", "");
    try {
      var rows = await api("/contenidos?materiaCursoId=" + encodeURIComponent(state.selectedMateriaId) + "&tipo=publicacion", { method: "GET" });
      state.academicas = Array.isArray(rows) ? rows : [];
      renderAcademicPosts(state.academicas);
      setMsg(msg, "", "");
    } catch (e) {
      state.academicas = [];
      renderAcademicPosts([]);
      setMsg(msg, e.message || "Error", "error");
    }
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

  function openStudentContentDetail(row) {
    if (!row) return;
    $("#studentContentDetailTitle").textContent = row.titulo || "Detalle del contenido";
    $("#studentContentDetailMeta").textContent = [
      row.tipo,
      formatFecha(row.fecha || row.createdAt),
      materiaConAnioLabel(row.materiaCursoId)
    ].filter(Boolean).join(" · ");
    $("#studentContentDetailBody").textContent = [row.resumen, row.contenido].filter(Boolean).join("\n\n") || "Sin contenido adicional.";

    var filesWrap = $("#studentContentDetailFiles");
    filesWrap.innerHTML = "";
    var files = Array.isArray(row.archivos) ? row.archivos.filter(function (file) {
      return !!(file && file.url);
    }) : [];
    files.forEach(function (file) {
      var link = document.createElement("a");
      link.className = "file-link";
      link.href = fileUrl(file);
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.textContent = file.name || "Adjunto";
      filesWrap.appendChild(link);
    });
    filesWrap.hidden = !files.length;

    var modal = $("#studentContentDetailModal");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
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
      card.className = "card student-content-item";
      card.addEventListener("click", function () {
        openStudentContentDetail(r);
      });
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
      meta.hidden = true;

      var h = document.createElement("div");
      h.className = "title";
    h.textContent = r.titulo || "(sin título)";

      var createdAt = document.createElement("div");
      createdAt.className = "student-content-created";
      createdAt.textContent = "Creado: " + formatFechaHora(r.createdAt || r.fecha);

      var p = document.createElement("p");
      p.className = "text";
      p.textContent = r.resumen || r.contenido || "";
      p.hidden = true;

      var by = document.createElement("div");
      by.className = "byline";
      var who = r.createdBy ? [r.createdBy.apellido, r.createdBy.nombre].filter(Boolean).join(", ") : "";
      var curso = anioLabel((r.materiaCursoId && r.materiaCursoId.cursoId) || r.cursoId);
      var ciclo = r.materiaCursoId && r.materiaCursoId.cicloLectivo;
      by.textContent = [r.tipo, curso, ciclo ? String(ciclo) : "", who].filter(Boolean).join(" · ");

      var files = Array.isArray(r.archivos) ? r.archivos.filter(function (file) {
        return !!(file && file.url);
      }) : [];

      card.appendChild(meta);
      card.appendChild(h);
      card.appendChild(createdAt);
      card.appendChild(p);
      if (files.length) {
        var links = document.createElement("div");
        links.className = "files";
        files.forEach(function (file) {
          var link = document.createElement("a");
          link.className = "file-link";
          link.href = fileUrl(file);
          link.target = "_blank";
          link.rel = "noreferrer noopener";
          link.textContent = file.name || "Adjunto";
          links.appendChild(link);
        });
        card.appendChild(links);
      }
      card.appendChild(by);
      by.hidden = true;
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
      setMsg(msg, "", "");
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
    var typeFilter = $("#tipo");
    if (typeFilter) typeFilter.addEventListener("change", function () {
      syncContentTabs(typeFilter.value);
      loadContenido();
    });

    Array.prototype.slice.call(document.querySelectorAll("[data-student-filter]")).forEach(function (tab) {
      tab.addEventListener("click", function () {
        if (!typeFilter) return;
        typeFilter.value = tab.getAttribute("data-student-filter") || "";
        syncContentTabs(typeFilter.value);
        loadContenido();
      });
    });
  }

  function syncContentTabs(value) {
    Array.prototype.slice.call(document.querySelectorAll("[data-student-filter]")).forEach(function (tab) {
      var active = (tab.getAttribute("data-student-filter") || "") === (value || "");
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  if (!guard()) return;
  rememberPanelPath();
  initLogout();
  initEventModal();
  initFilters();
  loadMaterias().then(function () {
    return Promise.all([loadAcademicPosts(), loadContenido()]);
  });
  loadAnioLabel();
  loadNoticias();
  loadEventos();
})();
