var propuestaItems = [];

function initYear() {
  var yearEl = document.getElementById("year");
  if (!yearEl) return;
  yearEl.textContent = String(new Date().getFullYear());
}

function getApiBase() {
  if (window.EEPAuth) return window.EEPAuth.getApiBase().replace(/\/$/, "");
  if (window.EEPEnv) return window.EEPEnv.getApiBase().replace(/\/$/, "");
  var saved = localStorage.getItem("eep_api_base");
  return (saved || "http://localhost:4001/api").replace(/\/$/, "");
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
    var message = (data && (data.message || data.error)) || "Request failed";
    if (window.EEPAuth && window.EEPAuth.translateErrorMessage) {
      message = window.EEPAuth.translateErrorMessage(message, res.status);
    }
    throw new Error(message);
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

var currentNewsItems = [];
var allNewsItems = [];
var homeCalendarState = {
  monthCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  eventos: [],
  selectedId: ""
};

function newsItemKey(item, fallbackIndex) {
  if (item && (item._id || item.id)) return String(item._id || item.id);
  return "news-" + String(fallbackIndex || 0);
}

function findNewsItemByKey(key) {
  for (var i = 0; i < allNewsItems.length; i += 1) {
    if (newsItemKey(allNewsItems[i], i) === key) return allNewsItems[i];
  }
  return null;
}

function pickHomeNews(items) {
  var rows = Array.isArray(items) ? items.slice() : [];
  var featured = rows.filter(function (item) { return !!item.destacada; });
  var selected = [];
  var seen = {};

  featured.forEach(function (item, index) {
    var key = newsItemKey(item, index);
    if (!seen[key] && selected.length < 3) {
      seen[key] = true;
      selected.push(item);
    }
  });

  rows.forEach(function (item, index) {
    var key = newsItemKey(item, index);
    if (!seen[key] && selected.length < 3) {
      seen[key] = true;
      selected.push(item);
    }
  });

  return selected;
}

function renderNewsMedia(item) {
  var images = Array.isArray(item && item.imagenes) ? item.imagenes.filter(function (img) { return img && img.url; }) : [];
  if (!images.length) return "";

  if (images.length === 1) {
    return (
      '<div class="card-media">' +
        '<img class="card-media-img" src="' + escapeHtml(images[0].url) + '" alt="' + escapeHtml(images[0].alt || item.titulo || "Imagen de noticia") + '" loading="lazy" />' +
      '</div>'
    );
  }

  return (
    '<div class="card-media news-carousel" data-carousel>' +
      '<div class="news-carousel-track">' +
        images
          .map(function (image, index) {
            return (
              '<div class="news-slide' + (index === 0 ? ' is-active' : '') + '">' +
                '<img class="card-media-img" src="' + escapeHtml(image.url) + '" alt="' + escapeHtml(image.alt || item.titulo || "Imagen de noticia") + '" loading="lazy" />' +
              '</div>'
            );
          })
          .join("") +
      '</div>' +
      '<div class="news-carousel-controls">' +
        '<button class="news-nav" type="button" data-dir="prev" aria-label="Imagen anterior">&lsaquo;</button>' +
        '<div class="news-carousel-count">1 / ' + String(images.length) + '</div>' +
        '<button class="news-nav" type="button" data-dir="next" aria-label="Imagen siguiente">&rsaquo;</button>' +
      '</div>' +
    '</div>'
  );
}

function initNewsCarousels() {
  var carousels = Array.prototype.slice.call(document.querySelectorAll("[data-carousel]"));
  carousels.forEach(function (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll(".news-slide"));
    var count = carousel.querySelector(".news-carousel-count");
    if (slides.length <= 1) return;

    var index = 0;
    function render() {
      slides.forEach(function (slide, slideIndex) {
        slide.classList.toggle("is-active", slideIndex === index);
      });
      if (count) count.textContent = String(index + 1) + " / " + String(slides.length);
    }

    Array.prototype.slice.call(carousel.querySelectorAll(".news-nav")).forEach(function (button) {
      button.addEventListener("click", function () {
        var dir = button.getAttribute("data-dir");
        if (dir === "prev") index = (index - 1 + slides.length) % slides.length;
        else index = (index + 1) % slides.length;
        render();
      });
    });

    render();
  });
}

function renderNewsModalMedia(item) {
  var images = Array.isArray(item && item.imagenes) ? item.imagenes.filter(function (img) { return img && img.url; }) : [];
  if (!images.length) return "";

  return (
    '<div class="news-modal-gallery ' + (images.length > 1 ? 'news-carousel' : '') + '"' + (images.length > 1 ? ' data-carousel' : '') + '>' +
      '<div class="news-carousel-track">' +
        images.map(function (image, index) {
          return (
            '<div class="news-slide' + (index === 0 ? ' is-active' : '') + '">' +
              '<img class="card-media-img" src="' + escapeHtml(image.url) + '" alt="' + escapeHtml(image.alt || item.titulo || "Imagen de noticia") + '" loading="lazy" />' +
            '</div>'
          );
        }).join("") +
      '</div>' +
      (images.length > 1
        ? '<div class="news-carousel-controls"><button class="news-nav" type="button" data-dir="prev" aria-label="Imagen anterior">&lsaquo;</button><div class="news-carousel-count">1 / ' + String(images.length) + '</div><button class="news-nav" type="button" data-dir="next" aria-label="Imagen siguiente">&rsaquo;</button></div>'
        : "") +
    '</div>'
  );
}

function closeNewsModal() {
  var modal = document.getElementById("newsModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function openNewsModal(key) {
  var item = findNewsItemByKey(String(key || ""));
  var modal = document.getElementById("newsModal");
  var body = document.getElementById("newsModalBody");
  var title = document.getElementById("newsModalTitle");
  var kicker = document.getElementById("newsModalKicker");
  if (!item || !modal || !body || !title || !kicker) return;

  var resumen = item.resumen || "";
  var contenido = item.contenido || resumen || "Sin contenido disponible.";
  title.textContent = item.titulo || "Noticia institucional";
  kicker.textContent = (item.categoria || "Institucional") + " · " + formatLongDate(item.fecha);
  body.innerHTML =
    renderNewsModalMedia(item) +
    (resumen ? '<p class="news-modal-summary">' + escapeHtml(resumen) + '</p>' : "") +
    '<div class="news-modal-content">' + escapeHtml(contenido).replace(/\n/g, "<br>") + '</div>';

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  initNewsCarousels();
}

function initNewsModal() {
  var modal = document.getElementById("newsModal");
  if (!modal) return;

  modal.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    if (target.getAttribute("data-news-close") === "true") closeNewsModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNewsModal();
  });
}

function setNewsArchiveView(open) {
  var archive = document.getElementById("noticias-archivo");
  var propuesta = document.getElementById("propuesta");
  if (!archive) return;

  Array.prototype.slice.call(document.querySelectorAll("[data-home-view]")).forEach(function (section) {
    section.hidden = !!open;
  });

  archive.hidden = !open;
  if (propuesta) propuesta.hidden = true;
  if (open) {
    window.location.hash = "noticias-archivo";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (window.location.hash === "#noticias-archivo") {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function initAllNewsView() {
  var btn = document.getElementById("openAllNews");
  var closeBtn = document.getElementById("closeAllNews");
  if (btn) {
    btn.addEventListener("click", function () {
      setNewsArchiveView(true);
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      setNewsArchiveView(false);
    });
  }

  if (window.location.hash === "#noticias-archivo") setNewsArchiveView(true);
}

function setPropuestaView(open) {
  var propuesta = document.getElementById("propuesta");
  var archive = document.getElementById("noticias-archivo");
  if (!propuesta) return;

  Array.prototype.slice.call(document.querySelectorAll("[data-home-view]")).forEach(function (section) {
    section.hidden = !!open;
  });

  propuesta.hidden = !open;
  if (archive) archive.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initPropuestaView() {
  var btn = document.getElementById("openPropuesta");
  var closeBtn = document.getElementById("closePropuesta");
  var brandLink = document.getElementById("homeBrandLink");
  if (btn) {
    btn.addEventListener("click", function () {
      setPropuestaView(true);
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      setPropuestaView(false);
    });
  }
  if (brandLink) {
    brandLink.addEventListener("click", function (e) {
      e.preventDefault();
      setNewsArchiveView(false);
      setPropuestaView(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  var yearFilter = document.getElementById("propuestaYearFilter");
  if (yearFilter) {
    yearFilter.addEventListener("change", function () {
      renderPropuesta(propuestaItems);
    });
  }

}

function initNewsCards() {
  Array.prototype.slice.call(document.querySelectorAll("[data-open-news]"))
    .forEach(function (button) {
      button.addEventListener("click", function () {
        openNewsModal(button.getAttribute("data-open-news"));
      });
    });
}

function renderNewsCards(targetId, items) {
  var grid = document.getElementById(targetId);
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML =
      '<article class="card status-card reveal is-visible"><h3 class="card-title">Todavía no hay noticias publicadas</h3><p class="card-text">Cuando el equipo institucional cargue novedades, van a aparecer acá automáticamente.</p></article>';
    return;
  }

  grid.innerHTML = items
    .map(function (item, index) {
      var resumen = item.resumen || item.contenido || "Sin resumen disponible.";
      var key = newsItemKey(item, index);
      return (
        '<article class="card reveal" ' + revealStyle(index) + '>' +
          renderNewsMedia(item) +
          '<div class="card-top">' +
            '<div class="chip">' + escapeHtml(item.categoria || "Institucional") + '</div>' +
            '<time class="card-date" datetime="' + escapeHtml(item.fecha || "") + '">' + escapeHtml(formatLongDate(item.fecha)) + '</time>' +
          '</div>' +
          '<h3 class="card-title"><button class="card-link card-link--title" type="button" data-open-news="' + escapeHtml(key) + '">' + escapeHtml(item.titulo || "Sin título") + '</button></h3>' +
          '<p class="card-text">' + escapeHtml(resumen) + '</p>' +
        '</article>'
      );
    })
    .join("");

  initNewsCards();
  initNewsCarousels();
  initReveal();
}

function renderNews(items) {
  allNewsItems = Array.isArray(items) ? items.slice() : [];
  currentNewsItems = pickHomeNews(allNewsItems);
  renderNewsCards("newsGrid", currentNewsItems);
  renderNewsCards("allNewsGrid", allNewsItems);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function dayKey(value) {
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

function timeLabel(value) {
  if (!value) return "Sin hora";
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "Sin hora";
  return pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function formatDateTime(value) {
  if (!value) return "Fecha a confirmar";
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "Fecha a confirmar";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function closeEventModal() {
  var modal = document.getElementById("eventModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function openEventModal(item) {
  var modal = document.getElementById("eventModal");
  var body = document.getElementById("eventModalBody");
  var title = document.getElementById("eventModalTitle");
  var kicker = document.getElementById("eventModalKicker");
  if (!item || !modal || !body || !title || !kicker) return;

  homeCalendarState.selectedId = String(item._id || item.id || "");
  title.textContent = item.titulo || "Detalle del evento";
  kicker.textContent = item.tipo || "Evento público";
  body.innerHTML =
    '<div class="event-modal-meta">' +
      '<span class="event-modal-chip">Público</span>' +
      '<span class="event-modal-chip">' + escapeHtml(formatDateTime(item.inicio)) + '</span>' +
      (item.fin ? '<span class="event-modal-chip">Hasta ' + escapeHtml(formatDateTime(item.fin)) + '</span>' : '') +
    '</div>' +
    '<div class="event-modal-details">' +
      '<div class="event-modal-row"><strong>Ubicación</strong><span>' + escapeHtml(item.ubicacion || "A confirmar") + '</span></div>' +
      '<div class="event-modal-row"><strong>Tipo</strong><span>' + escapeHtml(item.tipo || "Evento institucional") + '</span></div>' +
    '</div>' +
      '<div class="news-modal-content">' + escapeHtml(item.descripcion || "Sin descripción disponible.").replace(/\n/g, "<br>") + '</div>';
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function renderEvents(items) {
  var root = document.getElementById("eventsGrid");
  var label = document.getElementById("eventsMonthLabel");
  var status = document.getElementById("eventsStatus");
  if (!root) return;

  root.innerHTML = "";
  if (label) label.textContent = monthLabel(homeCalendarState.monthCursor);
  var visibleRowsInMonth = (items || []).filter(function (row) {
    var date = new Date(row && row.inicio);
    if (isNaN(date.getTime())) return false;
    return date.getFullYear() === homeCalendarState.monthCursor.getFullYear() && date.getMonth() === homeCalendarState.monthCursor.getMonth();
  }).length;
  setStatus(status, visibleRowsInMonth ? "" : "No hay eventos públicos cargados para este mes.", "");

  ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].forEach(function (day) {
    var head = document.createElement("div");
    head.className = "calendar-weekday";
    head.textContent = day;
    root.appendChild(head);
  });

  var monthStart = new Date(homeCalendarState.monthCursor.getFullYear(), homeCalendarState.monthCursor.getMonth(), 1);
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
    if (cellDate.getMonth() !== homeCalendarState.monthCursor.getMonth()) cell.classList.add("is-other-month");
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
      btn.className = "calendar-event-pill calendar-event-pill--publico";
      btn.innerHTML = '<span class="calendar-event-time">' + escapeHtml(timeLabel(row.inicio)) + '</span><span class="calendar-event-title">' + escapeHtml(row.titulo || "Evento") + '</span>';
      btn.addEventListener("click", function () {
        openEventModal(row);
      });
      eventsWrap.appendChild(btn);
    });

    cell.appendChild(headRow);
    cell.appendChild(eventsWrap);
    root.appendChild(cell);
  }
}

function propuestaCourseNumber(row) {
  var curso = row && row.cursoId ? row.cursoId : row;
  return Number(curso && curso.numero) || 0;
}

function propuestaCourseLabel(curso) {
  if (!curso) return "Año";
  return curso.numero ? String(curso.numero) + "° año" : (curso.nombre || "Año");
}

function renderPropuesta(items) {
  var root = document.getElementById("propuestaGrid");
  if (!root) return;

  var rows = Array.isArray(items) ? items.slice() : [];
  var groups = {};
  rows.forEach(function (row) {
    var curso = row && row.cursoId;
    var key = curso && curso.numero
      ? "anio-" + String(curso.numero)
      : curso && curso.nombre
        ? "anio-" + String(curso.nombre).toLowerCase().replace(/\s+[ab]$/i, "")
        : "sin-curso";
    if (!groups[key]) {
      groups[key] = {
        curso: curso,
        materias: {}
      };
    }
    var materia = String(row.materia || "").trim();
    if (materia) groups[key].materias[materia.toLowerCase()] = materia;
  });

  var allCards = Object.keys(groups)
    .map(function (key) {
      var group = groups[key];
      var materias = Object.keys(group.materias).map(function (subjectKey) {
        return group.materias[subjectKey];
      }).sort(function (a, b) {
        return a.localeCompare(b, "es", { sensitivity: "base" });
      });
      return {
        curso: group.curso,
        materias: materias
      };
    })
    .sort(function (a, b) {
      return propuestaCourseNumber(a.curso) - propuestaCourseNumber(b.curso);
    });

  var yearFilter = document.getElementById("propuestaYearFilter");
  var selectedYear = yearFilter ? yearFilter.value : "";
  if (yearFilter) {
    var currentOptions = {};
    Array.prototype.slice.call(yearFilter.options).forEach(function (option) {
      currentOptions[option.value] = true;
    });
    allCards.forEach(function (card) {
      var year = String(propuestaCourseNumber(card.curso) || "");
      if (!year || currentOptions[year]) return;
      var option = document.createElement("option");
      option.value = year;
      option.textContent = year + "° año";
      yearFilter.appendChild(option);
    });
    yearFilter.value = selectedYear;
  }

  var cards = allCards.filter(function (card) {
    return !selectedYear || String(propuestaCourseNumber(card.curso)) === selectedYear;
  });

  if (!cards.length) {
    root.innerHTML =
      '<article class="propuesta-card propuesta-card--placeholder reveal is-visible"><div class="propuesta-card-head"><span class="propuesta-badge">Sin datos</span><strong>Propuesta en actualización</strong></div><p class="propuesta-empty">Todavía no hay materias activas cargadas para mostrar en la web pública.</p></article>';
    return;
  }

  root.innerHTML = cards
    .map(function (card, index) {
      return (
        '<article class="propuesta-card reveal" ' + revealStyle(index) + '>' +
          '<div class="propuesta-card-head">' +
            '<span class="propuesta-badge">' + escapeHtml(String(propuestaCourseNumber(card.curso) || index + 1) + "°") + '</span>' +
            '<strong>' + escapeHtml(propuestaCourseLabel(card.curso)) + '</strong>' +
          '</div>' +
          '<div class="propuesta-card-meta">' + escapeHtml(String(card.materias.length)) + ' materias activas</div>' +
          '<div class="propuesta-subjects">' +
            card.materias.map(function (materia) {
              return '<span class="propuesta-subject-chip">' + escapeHtml(materia) + '</span>';
            }).join("") +
          '</div>' +
        '</article>'
      );
    })
    .join("");

  initReveal();
}

async function loadPropuesta() {
  var status = document.getElementById("propuestaStatus");
  var root = document.getElementById("propuestaGrid");
  if (!root) return;

  try {
    var data = await api("/materias-curso/public");
    propuestaItems = Array.isArray(data) ? data : [];
    renderPropuesta(propuestaItems);
    setStatus(status, "", "");
  } catch (e) {
    propuestaItems = [];
    renderPropuesta([]);
    setStatus(status, "No pudimos cargar la propuesta académica. Revisa la conexión con el backend.", "error");
  }
}

async function loadNoticias() {
  var grid = document.getElementById("newsGrid");
  if (!grid) return;

  try {
    var data = await api("/noticias");
    renderNews(Array.isArray(data) ? data : []);
  } catch (e) {
    grid.innerHTML =
      '<article class="card status-card reveal is-visible"><h3 class="card-title">No pudimos cargar las novedades</h3><p class="card-text">Verificá que el backend esté levantado y que la API responda correctamente.</p></article>';
    var allGrid = document.getElementById("allNewsGrid");
    if (allGrid) allGrid.innerHTML = grid.innerHTML;
  }
}

async function loadCalendario() {
  var root = document.getElementById("eventsGrid");
  var status = document.getElementById("eventsStatus");
  if (!root) return;

  try {
    var data = await api("/calendario");
    homeCalendarState.eventos = (Array.isArray(data) ? data : []).filter(function (item) {
      return !item || !item.visibilidad || item.visibilidad === "publico";
    });
    renderEvents(homeCalendarState.eventos);
  } catch (e) {
    homeCalendarState.eventos = [];
    renderEvents([]);
    setStatus(status, "No pudimos cargar la agenda pública. Revisá la conexión con el backend.", "error");
  }
}

function initEventCalendar() {
  Array.prototype.slice.call(document.querySelectorAll("#eventModal [data-event-close='true']")).forEach(function (el) {
    el.addEventListener("click", function () {
      closeEventModal();
    });
  });

  var modal = document.getElementById("eventModal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      var target = e.target;
      if (!(target instanceof Element)) return;
      if (target.getAttribute("data-event-close") === "true") closeEventModal();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeEventModal();
  });

  var prev = document.getElementById("prevEventsMonth");
  if (prev) {
    prev.addEventListener("click", function () {
      homeCalendarState.monthCursor = new Date(homeCalendarState.monthCursor.getFullYear(), homeCalendarState.monthCursor.getMonth() - 1, 1);
      renderEvents(homeCalendarState.eventos);
    });
  }

  var next = document.getElementById("nextEventsMonth");
  if (next) {
    next.addEventListener("click", function () {
      homeCalendarState.monthCursor = new Date(homeCalendarState.monthCursor.getFullYear(), homeCalendarState.monthCursor.getMonth() + 1, 1);
      renderEvents(homeCalendarState.eventos);
    });
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
      setStatus(msg, "Consulta enviada. Te responderán por los canales institucionales.", "ok");
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
  var STORAGE_LAST_PANEL = "eep_last_panel_path";
  var token = window.EEPAuth ? window.EEPAuth.getToken() : localStorage.getItem("eep_token") || "";
  var user = window.EEPAuth
    ? window.EEPAuth.getUser()
    : (function () {
        var userRaw = localStorage.getItem("eep_user");
        try {
          return userRaw ? JSON.parse(userRaw) : null;
        } catch (e) {
          return null;
        }
      })();

  var loginLink = document.getElementById("loginLink");
  var panelLink = document.getElementById("panelLink");
  var logoutBtn = document.getElementById("logoutBtn");

  var isLoggedIn = Boolean(token && user);
  var roles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
  if (!Array.isArray(roles)) roles = [];
  var isStaff = roles.indexOf("superadmin") !== -1 || roles.indexOf("directivo") !== -1 || roles.indexOf("docente") !== -1;
  var isStudent = roles.indexOf("estudiante") !== -1;
  var hasPanel = isStaff || isStudent;
  var lastPanelPath = sessionStorage.getItem(STORAGE_LAST_PANEL) || "";

  function defaultPanelPath() {
    if (roles.indexOf("docente") !== -1) return "pages/docente.html";
    if (roles.indexOf("superadmin") !== -1) return "pages/directivo.html#staff";
    if (roles.indexOf("directivo") !== -1) return "pages/directivo.html";
    if (roles.indexOf("estudiante") !== -1) return "pages/estudiante.html";
    return "pages/directivo.html";
  }

  if (loginLink) loginLink.hidden = isLoggedIn;
  if (logoutBtn) logoutBtn.hidden = !isLoggedIn;
  if (panelLink) panelLink.hidden = !hasPanel;
  if (panelLink && hasPanel) panelLink.href = lastPanelPath || defaultPanelPath();

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      if (window.EEPAuth) window.EEPAuth.clearSession();
      else {
        localStorage.removeItem("eep_token");
        localStorage.removeItem("eep_user");
      }
      sessionStorage.removeItem(STORAGE_LAST_PANEL);
      if (loginLink) loginLink.hidden = false;
      if (panelLink) panelLink.hidden = true;
      logoutBtn.hidden = true;
    });
  }
}

initYear();
initNewsModal();
initAllNewsView();
initPropuestaView();
initNavToggle();
initReveal();
initAuthHeader();
initEventCalendar();
loadPropuesta();
loadNoticias();
loadCalendario();
initContactForm();
