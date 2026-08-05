(function (global) {
  var STORAGE_API_BASE = "eep_api_base";
  var STORAGE_TOKEN = "eep_token";
  var STORAGE_USER = "eep_user";
  var STORAGE_TOKEN_EXP = "eep_token_exp";

  function getApiBase() {
    var saved = global.localStorage.getItem(STORAGE_API_BASE);
    return saved || "http://localhost:4001/api";
  }

  function setApiBase(value) {
    global.localStorage.setItem(STORAGE_API_BASE, String(value || "").trim());
  }

  function clearSession() {
    global.localStorage.removeItem(STORAGE_TOKEN);
    global.localStorage.removeItem(STORAGE_USER);
    global.localStorage.removeItem(STORAGE_TOKEN_EXP);
  }

  function translateErrorMessage(message, status) {
    var text = String(message || "").trim();
    var exact = {
      "Request failed": "No se pudo completar la solicitud.",
      "Missing token": "Tu sesion no es valida o ya vencio.",
      "Invalid credentials": "Credenciales invalidas.",
      "Email already in use": "El email ya esta en uso.",
      "DNI already in use": "El DNI ya esta en uso.",
      "User not found": "Usuario no encontrado.",
      "Curso not found": "Curso no encontrado.",
      "Docente not found": "Docente no encontrado.",
      "MateriaCurso not found": "Materia no encontrada.",
      "MateriaCurso already exists": "La materia ya existe para ese curso y ciclo lectivo.",
      "Not found": "No encontrado.",
      "Forbidden": "No tienes permisos para realizar esta accion.",
      "Staff only": "Solo el personal autorizado puede ingresar aqui.",
      "Bootstrap disabled": "La inicializacion esta deshabilitada.",
      "BOOTSTRAP_TOKEN not set": "Falta configurar el token de inicializacion.",
      "Invalid bootstrap token": "El token de inicializacion es invalido.",
      "Superadmin already exists": "El superadministrador ya existe.",
      "Superadmin created": "Superadministrador creado.",
      "Deleted": "Eliminado.",
      "User deleted": "Usuario eliminado.",
      "Student deleted": "Estudiante eliminado.",
      "Server error": "Ocurrio un error en el servidor."
    };

    if (!text) {
      if (status === 401) return "Tu sesion vencio o las credenciales no son validas.";
      if (status === 403) return "No tienes permisos para realizar esta accion.";
      if (status === 404) return "No se encontro el recurso solicitado.";
      if (status >= 500) return "Ocurrio un error en el servidor.";
      return "Ocurrio un error inesperado.";
    }

    if (exact[text]) return exact[text];
    return text;
  }

  function decodeBase64Url(value) {
    var normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";
    return global.atob(normalized);
  }

  function parseJwtPayload(token) {
    try {
      var parts = String(token || "").split(".");
      if (parts.length < 2) return null;
      return JSON.parse(decodeBase64Url(parts[1]));
    } catch (err) {
      return null;
    }
  }

  function normalizeTimestamp(value) {
    if (!value) return 0;
    if (typeof value === "number" && isFinite(value)) return value;
    var parsed = Date.parse(value);
    return isFinite(parsed) ? parsed : 0;
  }

  function getExpiresAt(token) {
    var payload = parseJwtPayload(token);
    if (payload && typeof payload.exp === "number") return payload.exp * 1000;
    var stored = normalizeTimestamp(global.localStorage.getItem(STORAGE_TOKEN_EXP));
    return stored || 0;
  }

  function isTokenExpired(token, skewMs) {
    var expiresAt = getExpiresAt(token);
    if (!expiresAt) return true;
    return Date.now() + (typeof skewMs === "number" ? skewMs : 30000) >= expiresAt;
  }

  function getToken() {
    var token = global.localStorage.getItem(STORAGE_TOKEN) || "";
    if (!token) return "";
    if (isTokenExpired(token)) {
      clearSession();
      return "";
    }
    return token;
  }

  function getUser() {
    var token = getToken();
    if (!token) return null;
    var raw = global.localStorage.getItem(STORAGE_USER);
    if (!raw) {
      clearSession();
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (err) {
      clearSession();
      return null;
    }
  }

  function saveSession(data) {
    if (!data || !data.token || !data.user) {
      clearSession();
      return false;
    }

    var token = String(data.token || "");
    var expiresAt = normalizeTimestamp(data.expiresAt) || getExpiresAt(token);
    if (!token || !expiresAt || Date.now() >= expiresAt) {
      clearSession();
      return false;
    }

    global.localStorage.setItem(STORAGE_TOKEN, token);
    global.localStorage.setItem(STORAGE_USER, JSON.stringify(data.user));
    global.localStorage.setItem(STORAGE_TOKEN_EXP, new Date(expiresAt).toISOString());
    return true;
  }

  function rolesOf(user) {
    var roles = (user && (user.roles || (user.role ? [user.role] : []))) || [];
    return Array.isArray(roles) ? roles : [];
  }

  async function request(path, opts, authenticated) {
    var base = getApiBase().replace(/\/$/, "");
    var headers = Object.assign({ "Content-Type": "application/json" }, (opts && opts.headers) || {});
      if (authenticated) {
        var token = getToken();
        if (!token) {
        var missing = new Error(translateErrorMessage("Missing token", 401));
          missing.status = 401;
          throw missing;
        }
        headers.Authorization = "Bearer " + token;
      }

    var response = await global.fetch(base + path, Object.assign({}, opts || {}, { headers: headers }));
    var text = await response.text();
    var data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {
      data = { raw: text };
    }

    if (!response.ok) {
      if (authenticated && response.status === 401) clearSession();
      var error = new Error(
        translateErrorMessage((data && (data.message || data.error)) || response.statusText || "Request failed", response.status)
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  global.EEPAuth = {
    clearSession: clearSession,
    getApiBase: getApiBase,
    getExpiresAt: getExpiresAt,
    getToken: getToken,
    getUser: getUser,
    isAuthenticated: function () {
      return Boolean(getToken() && getUser());
    },
    isTokenExpired: isTokenExpired,
    request: request,
    rolesOf: rolesOf,
    saveSession: saveSession,
    setApiBase: setApiBase,
    translateErrorMessage: translateErrorMessage
  };
})(window);
