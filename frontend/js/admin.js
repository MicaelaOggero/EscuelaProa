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

  function getApiBase() {
    if (window.EEPAuth) return window.EEPAuth.getApiBase();
    var saved = localStorage.getItem(STORAGE_API_BASE);
    return saved || "http://localhost:4000/api";
  }

  function setApiBase(v) {
    if (window.EEPAuth) return window.EEPAuth.setApiBase(v);
    localStorage.setItem(STORAGE_API_BASE, v);
  }

  function getToken() {
    if (window.EEPAuth) return window.EEPAuth.getToken();
    return localStorage.getItem(STORAGE_TOKEN) || "";
  }

  function setToken(t) {
    localStorage.setItem(STORAGE_TOKEN, t || "");
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

  function setUser(u) {
    if (!u) {
      localStorage.removeItem(STORAGE_USER);
      return;
    }
    localStorage.setItem(STORAGE_USER, JSON.stringify(u));
  }

  function authGuard() {
    var token = getToken();
    var user = getUser();
    var roles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
    if (!Array.isArray(roles)) roles = [];
    if (!token || !user) {
      window.location.href = "login.html";
      return false;
    }
    if (roles.indexOf("superadmin") === -1) {
      if (roles.indexOf("directivo") !== -1) window.location.href = "directivo.html";
      else if (roles.indexOf("docente") !== -1) window.location.href = "docente.html";
      else window.location.href = "../index.html";
      return false;
    }
    return true;
  }

  function rememberPanelPath() {
    sessionStorage.setItem(STORAGE_LAST_PANEL, "pages/admin.html");
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
      if (res.status === 401) {
        if (window.EEPAuth) window.EEPAuth.clearSession();
        window.location.href = "login.html";
      }
      throw err;
    }
    return data;
  }

  function syncSessionUI() {
    var token = getToken();
    var user = getUser();
    var roles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
    if (!Array.isArray(roles)) roles = [];
    var isLoggedIn = Boolean(token && user);
    var isSuperadmin = roles.indexOf("superadmin") !== -1;
    var staffSection = document.getElementById("staff");
    if (staffSection) staffSection.hidden = isLoggedIn && !isSuperadmin;
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
        openEditPrompt(u);
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

  function formatFecha(v) {
    if (!v) return "-";
    var d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return "-";
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yyyy = String(d.getFullYear());
    return dd + "/" + mm + "/" + yyyy;
  }

  async function loadStaff() {
    var msgEl = $("#listMsg");
    setMsg(msgEl, "Cargando...", "");
    try {
      var filter = $("#filterRole");
      var q = filter && filter.value ? "?role=" + encodeURIComponent(filter.value) : "";
      var data = await api("/users/staff" + q, { method: "GET" });
      renderStaffRows(data);
      setMsg(msgEl, "OK", "ok");
    } catch (err) {
      setMsg(msgEl, err.message || "Error", "error");
    }
  }

  async function deleteStaff(user) {
    var msgEl = $("#listMsg");
    if (!user || !user._id) {
      setMsg(msgEl, "ID invalido", "error");
      return;
    }
    if (!confirm("Eliminar a " + (user.email || user.nombre || "este usuario") + "?")) return;
    setMsg(msgEl, "Eliminando...", "");
    try {
      await api("/users/staff/" + encodeURIComponent(user._id), { method: "DELETE" });
      await loadStaff();
      setMsg(msgEl, "Eliminado", "ok");
    } catch (err) {
      setMsg(msgEl, err.message || "Error", "error");
    }
  }

  async function openEditPrompt(user) {
    openEditModal(user);
  }

  function openEditModal(user) {
    var modal = $("#editModal");
    if (!modal || !user || !user._id) return;

    $("#editId").value = user._id;
    $("#editEmail").value = user.email || "";
    $("#editNombre").value = user.nombre || "";
    $("#editApellido").value = user.apellido || "";
    $("#editFechaNac").value = toDateInputValue(user.fechaNacimiento);
    var roles = user.roles && user.roles.length ? user.roles : user.role ? [user.role] : [];
    $("#editRoleDirectivo").checked = roles.indexOf("directivo") !== -1;
    $("#editRoleDocente").checked = roles.indexOf("docente") !== -1;
    setMsg($("#editMsg"), "", "");

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    // Focus first editable field
    setTimeout(function () {
      var el = $("#editNombre");
      if (el) el.focus();
    }, 0);
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

  function closeEditModal() {
    var modal = $("#editModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  function initEditModal() {
    var modal = $("#editModal");
    var closeBtn = $("#closeEdit");
    var cancelBtn = $("#cancelEdit");
    var form = $("#editForm");
    var msgEl = $("#editMsg");
    if (!modal || !form) return;

    if (closeBtn) closeBtn.addEventListener("click", closeEditModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeEditModal);

    modal.addEventListener("click", function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      if (t && t.getAttribute("data-close") === "true") closeEditModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeEditModal();
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      setMsg(msgEl, "Guardando...", "");
      try {
        var id = $("#editId").value;
        var nombre = String($("#editNombre").value || "").trim();
        var apellido = String($("#editApellido").value || "").trim();
        var fechaNacimiento = String($("#editFechaNac").value || "").trim();
        var roles = [];
        if ($("#editRoleDirectivo").checked) roles.push("directivo");
        if ($("#editRoleDocente").checked) roles.push("docente");

        if (!nombre) return setMsg(msgEl, "Nombre requerido", "error");
        if (!roles.length) return setMsg(msgEl, "Selecciona al menos un rol", "error");

        var payload = { nombre: nombre, roles: roles };
        if (apellido) payload.apellido = apellido;
        if (fechaNacimiento) payload.fechaNacimiento = fechaNacimiento;

        await api("/users/staff/" + encodeURIComponent(id), {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        await loadStaff();
        setMsg(msgEl, "Actualizado", "ok");
        closeEditModal();
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function initApiBaseUI() {
    var apiBaseEl = $("#apiBase");
    var btnSave = $("#saveApi");
    if (!apiBaseEl || !btnSave) return;

    apiBaseEl.value = getApiBase();
    btnSave.addEventListener("click", function () {
      var v = String(apiBaseEl.value || "").trim();
      if (!v) return;
      setApiBase(v);
      syncSessionUI();
    });
  }

  function initLogout() {
    var btn = $("#logout");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (window.EEPAuth) window.EEPAuth.clearSession();
      else {
        setToken("");
        setUser(null);
      }
      sessionStorage.removeItem(STORAGE_LAST_PANEL);
      window.location.href = "login.html";
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
        // default back to docente checked
        $("#staffRoleDocente").checked = true;
        setMsg(msgEl, "Creado", "ok");
        loadStaff();
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

      detailsEl.hidden = true;
      detailsEl.textContent = "";
      setMsg(msgEl, "Importando...", "");

      try {
        var text = await fileInput.files[0].text();
        var res = await api("/users/staff/import-csv", {
          method: "POST",
          body: JSON.stringify({
            csv: text,
            defaultRole: $("#staffImportRole") ? $("#staffImportRole").value : "docente"
          })
        });

        setMsg(msgEl, "Importacion completada", "ok");
        var parts = [];
        parts.push("Creados: " + String(res.created || 0));
        parts.push("Omitidos: " + String(res.skipped || 0));
        if (res.credentials && res.credentials.length) parts.push("Passwords generadas: " + String(res.credentials.length));
        if (res.errors && res.errors.length) {
          parts.push("Errores: " + res.errors.map(function (e) { return "L" + e.line + ": " + e.message; }).join(" | "));
        }
        detailsEl.textContent = parts.join(". ");
        detailsEl.hidden = false;
        fileInput.value = "";
        loadStaff();
      } catch (err) {
        setMsg(msgEl, err.message || "Error", "error");
      }
    });
  }

  function initListControls() {
    var refresh = $("#refresh");
    var filter = $("#filterRole");
    if (refresh) refresh.addEventListener("click", loadStaff);
    if (filter) filter.addEventListener("change", loadStaff);
  }

  if (!authGuard()) return;
  initApiBaseUI();
  initLogout();
  initCreateStaff();
  initImportStaff();
  initListControls();
  initEditModal();
  rememberPanelPath();
  syncSessionUI();
  loadStaff();

  
})();
