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
    return localStorage.getItem(STORAGE_API_BASE) || "http://localhost:4000/api";
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

  function rolesOf(user) {
    var roles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
    return Array.isArray(roles) ? roles : [];
  }

  function hasRole(role) {
    return state.roles.indexOf(role) !== -1;
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
    var roleIntro = $("#roleIntro");
    if (roleIntro) {
      roleIntro.textContent = state.directivoLike
        ? "Puedes crear, editar, importar y filtrar todos los estudiantes por anio, docente y materia."
        : "Puedes gestionar estudiantes de los anios donde dictas materias y filtrarlos por tus materias activas.";
    }

    var backDirectivo = $("#backDirectivo");
    var backDocente = $("#backDocente");
    var backAdmin = $("#backAdmin");
    if (backDirectivo) backDirectivo.hidden = !state.directivoLike;
    if (backDocente) backDocente.hidden = !hasRole("docente");
    if (backAdmin) backAdmin.hidden = !hasRole("superadmin");

    var filterDocente = $("#filterDocente");
    if (!state.directivoLike && filterDocente) {
      var label = [state.user.apellido, state.user.nombre].filter(Boolean).join(", ") || state.user.email || "Mi usuario";
      filterDocente.innerHTML = '<option value="' + escapeHtml(state.user._id || state.user.id || "") + '" selected>' + escapeHtml(label) + "</option>";
      filterDocente.disabled = true;
    }
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
    if (!a) return "Anio";
    var base = a.nombre || (a.numero ? String(a.numero) + "o" : "Anio");
    var div = a.division ? " " + a.division : "";
    var turno = a.turno ? " · " + a.turno : "";
    return base + div + turno;
  }

  function materiaLabel(m) {
    return (m.materia || "Materia") + " · " + anioLabel(m.anioId);
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

  function refreshMateriaFilterOptions() {
    var materias = state.materias.slice();
    var anioId = $("#filterAnio") ? $("#filterAnio").value : "";
    var docenteId = state.directivoLike && $("#filterDocente") ? $("#filterDocente").value : "";

    if (anioId) {
      materias = materias.filter(function (m) {
        return m.anioId && String(m.anioId._id || m.anioId) === anioId;
      });
    }
    if (docenteId) {
      materias = materias.filter(function (m) {
        return m.docenteId && String(m.docenteId._id || m.docenteId) === docenteId;
      });
    }

    materias = sortByLabel(uniqueById(materias), materiaLabel);
    fillSelect($("#filterMateria"), materias, function (m) { return m._id; }, materiaLabel, "Todas", true);
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
      var anios = await api("/anios", { method: "GET" });
      var docentes = await api("/users/staff?role=docente", { method: "GET" });
      var materias = await api("/materias-anio", { method: "GET" });
      state.anios = sortByLabel(uniqueById(anios || []), anioLabel);
      state.docentes = sortByLabel(uniqueById(docentes || []), function (u) {
        return [u.apellido, u.nombre].filter(Boolean).join(", ") || u.email || "Docente";
      });
      state.materias = Array.isArray(materias) ? materias : [];
    } else {
      var materiasDoc = await api("/materias-anio/mine", { method: "GET" });
      state.materias = Array.isArray(materiasDoc) ? materiasDoc : [];
      state.anios = sortByLabel(uniqueById(state.materias.map(function (m) { return m.anioId; })), anioLabel);
      state.docentes = [state.user];
    }

    fillSelect($("#sAnio"), state.anios, function (a) { return a._id; }, anioLabel, "Seleccionar", false);
    fillSelect($("#editStudentAnio"), state.anios, function (a) { return a._id; }, anioLabel, "Seleccionar", false);
    fillSelect($("#filterAnio"), state.anios, function (a) { return a._id; }, anioLabel, "Todos", true);

    if (state.directivoLike) {
      fillSelect($("#filterDocente"), state.docentes, function (u) { return u._id || u.id; }, function (u) {
        return [u.apellido, u.nombre].filter(Boolean).join(", ") || u.email || "Docente";
      }, "Todos", true);
    }

    refreshMateriaFilterOptions();
  }

  function buildStudentQuery() {
    var params = new URLSearchParams();
    var anioId = $("#filterAnio") ? $("#filterAnio").value : "";
    var docenteId = $("#filterDocente") ? $("#filterDocente").value : "";
    var materiaAnioId = $("#filterMateria") ? $("#filterMateria").value : "";
    var search = $("#filterSearch") ? $("#filterSearch").value.trim() : "";

    if (anioId) params.set("anioId", anioId);
    if (state.directivoLike && docenteId) params.set("docenteId", docenteId);
    if (materiaAnioId) params.set("materiaAnioId", materiaAnioId);
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
      td0.colSpan = 7;
      td0.className = "table-empty";
      td0.textContent = "Sin estudiantes";
      tr0.appendChild(td0);
      tbody.appendChild(tr0);
      return;
    }

    rows.forEach(function (u) {
      var tr = document.createElement("tr");
      [u.nombre || "-", u.apellido || "-", u.dni || "-", u.anioId ? anioLabel(u.anioId) : "-", u.division || "-", u.email || "-"].forEach(function (value) {
        var td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });

      var tdActions = document.createElement("td");
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
    var docente = $("#filterDocente");
    var materia = $("#filterMateria");
    var apply = $("#applyFilters");
    var clear = $("#clearFilters");
    var refresh = $("#studentsRefresh");

    if (anio) anio.addEventListener("change", refreshMateriaFilterOptions);
    if (docente) docente.addEventListener("change", refreshMateriaFilterOptions);
    if (materia) materia.addEventListener("change", loadStudents);
    if (apply) apply.addEventListener("click", loadStudents);
    if (refresh) refresh.addEventListener("click", function () {
      loadContext().then(loadStudents).catch(function (e) {
        setMsg($("#studentsListMsg"), e.message || "Error", "error");
      });
    });
    if (clear) {
      clear.addEventListener("click", function () {
        if (anio) anio.value = "";
        if (state.directivoLike && docente) docente.value = "";
        if ($("#filterSearch")) $("#filterSearch").value = "";
        refreshMateriaFilterOptions();
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
            anioId: $("#sAnio").value,
            division: $("#sDivision").value
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
    $("#editStudentDivision").value = student.division || "";
    if (student.anioId && student.anioId._id) $("#editStudentAnio").value = student.anioId._id;
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
          anioId: $("#editStudentAnio").value,
          division: $("#editStudentDivision").value
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
