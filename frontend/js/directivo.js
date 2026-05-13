(function () {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";

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
      td.colSpan = 4;
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

  if (!guard()) return;
  initLogout();
  initCreateAnio();
  initCreateMateriaAnio();
  initRefresh();
  initEditModal();
  loadAll();
})();
