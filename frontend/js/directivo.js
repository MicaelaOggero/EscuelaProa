(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var STORAGE_LAST_PANEL = "eep_last_panel_path";

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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    sessionStorage.setItem(STORAGE_LAST_PANEL, "pages/directivo.html");
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
    if (roles.indexOf("directivo") === -1 && roles.indexOf("superadmin") === -1) {
      if (roles.indexOf("docente") !== -1) window.location.href = "docente.html";
      else window.location.href = "../index.html";
      return false;
    }
    var superPanel = $("#superPanel");
    if (superPanel) superPanel.hidden = roles.indexOf("superadmin") === -1;
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

  function initLogout() {
    var btn = $("#logout");
    if (!btn) return;
    btn.addEventListener("click", function () {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      window.location.href = "../index.html";
    });
  }

  function fillSelect(sel, rows, getValue, getLabel) {
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
    var base = a.nombre || (a.numero ? String(a.numero) + "o" : "Anio");
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
      var anios = await api("/anios", { method: "GET" });
      var mas = await api("/materias-anio", { method: "GET" });

      fillSelect($("#maDocente"), users, function (u) { return u._id || u.id; }, function (u) {
        return [u.apellido, u.nombre].filter(Boolean).join(", ") + " · " + (u.email || "");
      });
      fillSelect($("#maAnio"), anios || [], function (a) { return a._id; }, anioLabel);

      // Reuse same data for edit modal selects
      fillSelect($("#editDocente"), users, function (u) { return u._id || u.id; }, function (u) {
        return [u.apellido, u.nombre].filter(Boolean).join(", ") + " · " + (u.email || "");
      });
      fillSelect($("#editAnio"), anios || [], function (a) { return a._id; }, anioLabel);

      renderAsignaciones(mas || []);
      setMsg(asigMsg, "OK", "ok");
    } catch (e) {
      setMsg(asigMsg, e.message || "Error", "error");
    }
  }

  function renderAsignaciones(rows) {
    var tbody = $("#asigTbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!rows.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 5;
      td.className = "table-empty";
      td.textContent = "Sin asignaciones";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      var tdD = document.createElement("td");
      var d = r.docenteId;
      tdD.textContent = d ? ([d.apellido, d.nombre].filter(Boolean).join(", ") || d.email) : "-";
      var tdM = document.createElement("td");
      tdM.textContent = r.materia || "-";
      var tdA = document.createElement("td");
      tdA.textContent = r.anioId ? anioLabel(r.anioId) : "-";
      var tdC = document.createElement("td");
      tdC.textContent = cicloLabel(r.cicloLectivo);
      var tdX = document.createElement("td");

      var btnEdit = document.createElement("button");
      btnEdit.type = "button";
      btnEdit.className = "btn btn-ghost";
      btnEdit.textContent = "Editar";
      btnEdit.style.padding = "0.5rem 0.7rem";
      btnEdit.style.fontSize = "0.9rem";
      btnEdit.addEventListener("click", function () {
        openEditModal(r);
      });

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-secondary";
      btn.textContent = "Eliminar";
      btn.style.padding = "0.5rem 0.7rem";
      btn.style.fontSize = "0.9rem";
      btn.addEventListener("click", function () {
        removeAsignacion(r._id);
      });
      tdX.appendChild(btnEdit);
      tdX.appendChild(btn);

      tr.appendChild(tdD);
      tr.appendChild(tdM);
      tr.appendChild(tdA);
      tr.appendChild(tdC);
      tr.appendChild(tdX);
      tbody.appendChild(tr);
    });
  }

  function openEditModal(row) {
    var modal = $("#editModal");
    if (!modal) return;
    $("#editId").value = row._id;
    $("#editMateria").value = row.materia || "";
    $("#editActivo").checked = row.activo !== false;
    if (row.docenteId && row.docenteId._id) $("#editDocente").value = row.docenteId._id;
    if (row.anioId && row.anioId._id) $("#editAnio").value = row.anioId._id;
    $("#editCicloLectivo").value = row.cicloLectivo || new Date().getFullYear();
    setMsg($("#editMsg"), "", "");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      var el = $("#editMateria");
      if (el) el.focus();
    }, 0);
  }

  function closeEditModal() {
    var modal = $("#editModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function initEditModal() {
    var modal = $("#editModal");
    var form = $("#editForm");
    var msg = $("#editMsg");
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
        var id = $("#editId").value;
        await api("/materias-anio/" + encodeURIComponent(id), {
          method: "PUT",
          body: JSON.stringify({
            materia: $("#editMateria").value,
            docenteId: $("#editDocente").value,
            anioId: $("#editAnio").value,
            cicloLectivo: Number($("#editCicloLectivo").value),
            activo: $("#editActivo").checked
          })
        });
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

  function formatFecha(v) {
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
        tdF.textContent = formatFecha(u.fechaNacimiento);
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
          body: JSON.stringify({ csv: text })
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
    if (!confirm("Eliminar asignacion?")) return;
    var msg = $("#asigMsg");
    setMsg(msg, "Eliminando...", "");
    try {
      await api("/materias-anio/" + encodeURIComponent(id), { method: "DELETE" });
      await loadAll();
      setMsg(msg, "Eliminado", "ok");
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
        await api("/anios", {
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

  function initCreateMateriaAnio() {
    var form = $("#maForm");
    var msg = $("#maMsg");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msg, "Creando...", "");
      try {
        await api("/materias-anio", {
          method: "POST",
          body: JSON.stringify({
            materia: $("#maMateria").value,
            anioId: $("#maAnio").value,
            cicloLectivo: Number($("#maCicloLectivo").value),
            docenteId: $("#maDocente").value
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
        var res = await api("/materias-anio/import-csv", {
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
  initLogout();
  initCreateAnio();
  initCreateMateriaAnio();
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
})();
