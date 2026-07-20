const Usuario = require("../models/Usuario");
const MateriaCurso = require("../models/MateriaCurso");
const Curso = require("../models/Curso");
const bcrypt = require("bcryptjs");
const { normalizeRoles, primaryRole } = require("../utils/roles");

function studentSelect() {
  return "nombre apellido fechaNacimiento dni email role roles cursoId division createdAt";
}

function normalizeDni(value) {
  var digits = String(value || "").replace(/\D/g, "").trim();
  return digits || "";
}

function randomPassword(len) {
  var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  var out = "";
  for (var i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function hasRole(reqUser, role) {
  return !!(reqUser && Array.isArray(reqUser.roles) && reqUser.roles.indexOf(role) !== -1);
}

function isDirectivoLike(reqUser) {
  return hasRole(reqUser, "directivo") || hasRole(reqUser, "superadmin");
}

function escapeRegex(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseCicloLectivo(value) {
  if (typeof value === "undefined" || value === null || value === "") return null;
  var num = Number(value);
  if (!Number.isInteger(num) || num < 2000 || num > 2100) return false;
  return num;
}

function normalizeStudent(user) {
  if (!user) return user;
  user.roles = normalizeRoles(user.roles && user.roles.length ? user.roles : user.role ? [user.role] : []);
  user.role = primaryRole(user.roles);
  user.dni = normalizeDni(user.dni);
  return user;
}

function splitRoleValues(input) {
  if (Array.isArray(input)) return input;
  var text = String(input || "").trim();
  if (!text) return [];
  return text.split(/[|,+/;]+/).map(function (part) {
    return String(part || "").trim();
  }).filter(Boolean);
}

function resolveStaffRolesForRequest(reqUser, input, fallback) {
  var roles = normalizeRoles(splitRoleValues(input).length ? splitRoleValues(input) : splitRoleValues(fallback));
  roles = Array.from(new Set(roles));
  if (!roles.length) roles = ["docente"];

  var invalid = roles.find(function (r) {
    return r !== "directivo" && r !== "docente";
  });
  if (invalid) throw new Error("Solo se permite roles directivo/docente");

  if (isDirectivo(reqUser) && !isSuperadmin(reqUser)) {
    if (roles.indexOf("directivo") !== -1) throw new Error("Directivo no puede crear directivos");
    if (roles.length !== 1 || roles[0] !== "docente") throw new Error("Directivo solo puede crear docentes");
  }

  return roles;
}

function resolveStudentRole(input, fallback) {
  var roles = normalizeRoles(splitRoleValues(input).length ? splitRoleValues(input) : splitRoleValues(fallback));
  if (!roles.length) roles = ["estudiante"];
  if (roles.length !== 1 || roles[0] !== "estudiante") throw new Error("Solo se permite rol estudiante");
  return roles;
}

async function findCurso(anioStr) {
  var s = String(anioStr || "").trim();
  if (!s) return null;
  var n = parseInt(s, 10);
  if (!isNaN(n)) {
    var byNum = await Curso.findOne({ numero: n });
    if (byNum) return byNum;
  }
  return await Curso.findOne({ nombre: s });
}

async function docenteVisibleCursoIds(reqUser, filters) {
  var assignmentFilter = { docenteId: reqUser.id, activo: true };
  if (filters && filters.cursoId) assignmentFilter.cursoId = filters.cursoId;
  if (filters && filters.materiaCursoId) assignmentFilter._id = filters.materiaCursoId;
  if (filters && filters.cicloLectivo) assignmentFilter.cicloLectivo = filters.cicloLectivo;

  var rows = await MateriaCurso.find(assignmentFilter).select("cursoId");
  var map = {};
  rows.forEach(function (row) {
    if (row && row.cursoId) map[String(row.cursoId)] = true;
  });
  return Object.keys(map);
}

async function docentePuedeGestionarCurso(reqUser, cursoId) {
  var rows = await MateriaCurso.find({ docenteId: reqUser.id, cursoId: cursoId, activo: true }).select("_id").limit(1);
  return rows.length > 0;
}

async function buildStudentScope(req, options) {
  var filters = options || {};
  var byAssignment = !!(filters.docenteId || filters.materiaCursoId || filters.cicloLectivo);

  if (isDirectivoLike(req.user)) {
    if (!byAssignment) {
      if (filters.cursoId) return { unrestricted: false, cursoIds: [String(filters.cursoId)] };
      return { unrestricted: true, cursoIds: [] };
    }

    var assignmentFilter = { activo: true };
    if (filters.cursoId) assignmentFilter.cursoId = filters.cursoId;
    if (filters.docenteId) assignmentFilter.docenteId = filters.docenteId;
    if (filters.materiaCursoId) assignmentFilter._id = filters.materiaCursoId;
    if (filters.cicloLectivo) assignmentFilter.cicloLectivo = filters.cicloLectivo;

    var rows = await MateriaCurso.find(assignmentFilter).select("cursoId");
    var map = {};
    rows.forEach(function (row) {
      if (row && row.cursoId) map[String(row.cursoId)] = true;
    });
    return { unrestricted: false, cursoIds: Object.keys(map) };
  }

  var cursoIds = await docenteVisibleCursoIds(req.user, {
    cursoId: filters.cursoId,
    materiaCursoId: filters.materiaCursoId,
    cicloLectivo: filters.cicloLectivo
  });

  return { unrestricted: false, cursoIds: cursoIds };
}

function parseStudentsCSV(text) {
  var lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  lines = lines.filter(function (l) {
    return l.trim().length > 0;
  });
  if (!lines.length) return { rows: [], errors: ["CSV vacio"] };

  var header = (lines[0] || "").replace(/^\uFEFF/, "");
  var delimiter = ",";
  if (header.indexOf("\t") !== -1) delimiter = "\t";
  else if (header.indexOf(";") !== -1 && header.indexOf(",") === -1) delimiter = ";";

  function splitLine(line) {
    var out = [];
    var cur = "";
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === delimiter && !inQ) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  function normalizeHeader(h) {
    var s = String(h || "").replace(/^\uFEFF/, "").toLowerCase().trim();
    s = s.replace(/^"|"$/g, "");
    s = s
      .replace(/á/g, "a")
      .replace(/é/g, "e")
      .replace(/í/g, "i")
      .replace(/ó/g, "o")
      .replace(/ú/g, "u")
      .replace(/ü/g, "u")
      .replace(/ñ/g, "n");
    s = s.replace(/\s+/g, " ");
    return s;
  }

  var headers = splitLine(header).map(normalizeHeader);

  function idxFor(name) {
    return headers.indexOf(name);
  }

  var iNombre = idxFor("nombre");
  var iApellido = idxFor("apellido");
  var iFecha = idxFor("fecha de nacimiento");
  if (iFecha === -1) iFecha = idxFor("fecha nacimiento");
  if (iFecha === -1) iFecha = idxFor("fecha_nacimiento");
  var iEmail = idxFor("email");
  if (iEmail === -1) iEmail = idxFor("correo");
  if (iEmail === -1) iEmail = idxFor("mail");
  var iDni = idxFor("dni");
  var iCurso = idxFor("curso");
  var iDivision = idxFor("division");
  var iPassword = idxFor("password");
  if (iPassword === -1) iPassword = idxFor("contrasena");
  var iRole = idxFor("rol");
  if (iRole === -1) iRole = idxFor("role");
  if (iRole === -1) iRole = idxFor("roles");

  var errors = [];
  if (iNombre === -1) errors.push("Falta columna: nombre");
  if (iApellido === -1) errors.push("Falta columna: apellido");
  if (iDni === -1) errors.push("Falta columna: dni");
  if (iEmail === -1) errors.push("Falta columna: email");
  if (iCurso === -1) errors.push("Falta columna: curso");
  if (errors.length) return { rows: [], errors: errors };

  var rows = [];
  for (var li = 1; li < lines.length; li++) {
    var cols = splitLine(lines[li]);
    rows.push({
      nombre: (cols[iNombre] || "").trim(),
      apellido: (cols[iApellido] || "").trim(),
      fechaNacimiento: iFecha === -1 ? "" : (cols[iFecha] || "").trim(),
      email: (cols[iEmail] || "").trim(),
      dni: (cols[iDni] || "").trim(),
      curso: (cols[iCurso] || "").trim(),
      division: iDivision === -1 ? "" : (cols[iDivision] || "").trim(),
      password: iPassword === -1 ? "" : (cols[iPassword] || "").trim(),
      role: iRole === -1 ? "" : (cols[iRole] || "").trim(),
      line: li + 1
    });
  }
  return { rows: rows, errors: [] };
}

function parseStaffCSV(text) {
  var lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  lines = lines.filter(function (l) {
    return l.trim().length > 0;
  });
  if (!lines.length) return { rows: [], errors: ["CSV vacio"] };

  var header = (lines[0] || "").replace(/^\uFEFF/, "");
  var delimiter = ",";
  if (header.indexOf("\t") !== -1) delimiter = "\t";
  else if (header.indexOf(";") !== -1 && header.indexOf(",") === -1) delimiter = ";";

  function splitLine(line) {
    var out = [];
    var cur = "";
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === delimiter && !inQ) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  function normalizeHeader(h) {
    var s = String(h || "").replace(/^\uFEFF/, "").toLowerCase().trim();
    s = s.replace(/^"|"$/g, "");
    s = s
      .replace(/á/g, "a")
      .replace(/é/g, "e")
      .replace(/í/g, "i")
      .replace(/ó/g, "o")
      .replace(/ú/g, "u")
      .replace(/ü/g, "u")
      .replace(/ñ/g, "n");
    s = s.replace(/\s+/g, " ");
    return s;
  }

  var headers = splitLine(header).map(normalizeHeader);

  function idxFor(name) {
    return headers.indexOf(name);
  }

  var iNombre = idxFor("nombre");
  var iApellido = idxFor("apellido");
  var iFecha = idxFor("fecha de nacimiento");
  if (iFecha === -1) iFecha = idxFor("fecha nacimiento");
  if (iFecha === -1) iFecha = idxFor("fecha_nacimiento");
  var iEmail = idxFor("email");
  if (iEmail === -1) iEmail = idxFor("correo");
  if (iEmail === -1) iEmail = idxFor("mail");
  var iDni = idxFor("dni");
  var iPassword = idxFor("password");
  if (iPassword === -1) iPassword = idxFor("contrasena");
  var iRole = idxFor("rol");
  if (iRole === -1) iRole = idxFor("role");
  if (iRole === -1) iRole = idxFor("roles");

  var errors = [];
  if (iNombre === -1) errors.push("Falta columna: nombre");
  if (iEmail === -1) errors.push("Falta columna: email");
  if (errors.length) return { rows: [], errors: errors };

  var rows = [];
  for (var li = 1; li < lines.length; li++) {
    var cols = splitLine(lines[li]);
    rows.push({
      nombre: (cols[iNombre] || "").trim(),
      apellido: iApellido === -1 ? "" : (cols[iApellido] || "").trim(),
      fechaNacimiento: iFecha === -1 ? "" : (cols[iFecha] || "").trim(),
      email: (cols[iEmail] || "").trim(),
      dni: iDni === -1 ? "" : (cols[iDni] || "").trim(),
      password: iPassword === -1 ? "" : (cols[iPassword] || "").trim(),
      role: iRole === -1 ? "" : (cols[iRole] || "").trim(),
      line: li + 1
    });
  }
  return { rows: rows, errors: [] };
}

exports.me = async (req, res, next) => {
  try {
    const user = await Usuario.findById(req.user.id).select(
      "nombre apellido fechaNacimiento dni email role roles cursoId division createdAt"
    ).populate("cursoId", "numero nombre division turno");
    if (!user) return res.status(404).json({ message: "User not found" });
    user.roles = normalizeRoles(user.roles && user.roles.length ? user.roles : user.role ? [user.role] : []);
    user.role = primaryRole(user.roles);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const users = await Usuario.find()
      .select("nombre apellido fechaNacimiento dni email role roles cursoId division createdAt")
      .sort({ createdAt: -1 });
    users.forEach(function (user) {
      user.roles = normalizeRoles(user.roles && user.roles.length ? user.roles : user.role ? [user.role] : []);
      user.role = primaryRole(user.roles);
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { nombre, apellido, fechaNacimiento, email, password } = req.body;
    var roles = req.body.roles;
    var role = req.body.role;
    var dni = normalizeDni(req.body.dni);

    if (!nombre || !email || !password || (!roles && !role)) {
      return res.status(400).json({ message: "nombre, email, password y roles/role son requeridos" });
    }

    var allowed = ["superadmin", "directivo", "docente", "estudiante"];
    roles = normalizeRoles(roles || role);
    var invalid = roles.find(function (r) {
      return allowed.indexOf(r) === -1;
    });
    if (invalid) return res.status(400).json({ message: "Rol invalido" });
    if (!roles.length) return res.status(400).json({ message: "Debe incluir al menos un rol" });

    const existing = await Usuario.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });
    if (dni) {
      var existingDni = await Usuario.findOne({ dni: dni }).select("_id");
      if (existingDni) return res.status(409).json({ message: "DNI already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Usuario.create({ nombre, apellido, fechaNacimiento, dni: dni || undefined, email, passwordHash, roles });
    res.status(201).json({
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      fechaNacimiento: user.fechaNacimiento,
      dni: user.dni || "",
      email: user.email,
      roles: normalizeRoles(user.roles),
      role: primaryRole(user.roles),
      createdAt: user.createdAt
    });
  } catch (err) {
    next(err);
  }
};

function isStaffRoles(roles) {
  return roles.indexOf("directivo") !== -1 || roles.indexOf("docente") !== -1;
}

function isSuperadmin(reqUser) {
  return reqUser && Array.isArray(reqUser.roles) && reqUser.roles.indexOf("superadmin") !== -1;
}

function isDirectivo(reqUser) {
  return reqUser && Array.isArray(reqUser.roles) && reqUser.roles.indexOf("directivo") !== -1;
}

exports.createStaff = async (req, res, next) => {
  try {
    const { nombre, apellido, fechaNacimiento, email, password } = req.body;
    var roles;
    var dni = normalizeDni(req.body.dni);
    if (!nombre || !email || !password || !(req.body.roles || req.body.role)) {
      return res.status(400).json({ message: "nombre, email, password y roles/role son requeridos" });
    }

    try {
      roles = resolveStaffRolesForRequest(req.user, req.body.roles || req.body.role);
    } catch (roleErr) {
      return res.status(/Directivo/.test(roleErr.message) ? 403 : 400).json({ message: roleErr.message });
    }

    if (!isStaffRoles(roles)) return res.status(400).json({ message: "Debe incluir directivo y/o docente" });

    const existing = await Usuario.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });
    if (dni) {
      var existingDni = await Usuario.findOne({ dni: dni }).select("_id");
      if (existingDni) return res.status(409).json({ message: "DNI already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Usuario.create({ nombre, apellido, fechaNacimiento, dni: dni || undefined, email, passwordHash, roles });
    res.status(201).json({
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      fechaNacimiento: user.fechaNacimiento,
      dni: user.dni || "",
      email: user.email,
      roles: normalizeRoles(user.roles),
      role: primaryRole(user.roles),
      createdAt: user.createdAt
    });
  } catch (err) {
    next(err);
  }
};

exports.listStaff = async (req, res, next) => {
  try {
    const role = req.query.role;
    const filter = {};

    if (role) {
      if (role !== "directivo" && role !== "docente") return res.status(400).json({ message: "Filtro role invalido" });
      filter.roles = role;
    } else {
      filter.roles = { $in: ["directivo", "docente"] };
    }

    const users = await Usuario.find(filter)
      .select("nombre apellido fechaNacimiento dni email role roles cursoId division createdAt")
      .sort({ createdAt: -1 });
    users.forEach(function (user) {
      user.roles = normalizeRoles(user.roles && user.roles.length ? user.roles : user.role ? [user.role] : []);
      user.role = primaryRole(user.roles);
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, fechaNacimiento, email, password, role } = req.body;
    var roles = normalizeRoles(req.body.roles || role);
    var dni = normalizeDni(req.body.dni);

    const user = await Usuario.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    var currentRoles = normalizeRoles(user.roles && user.roles.length ? user.roles : user.role ? [user.role] : []);
    if (!isStaffRoles(currentRoles)) return res.status(400).json({ message: "Solo se puede editar directivos y docentes" });

    if (roles.length) {
      roles = Array.from(new Set(roles));
      var invalid = roles.find(function (r) {
        return r !== "directivo" && r !== "docente";
      });
      if (invalid) return res.status(400).json({ message: "Solo se permite roles directivo/docente" });

      // directivo cannot grant/revoke directivo role or touch superadmins
      if (isDirectivo(req.user) && !isSuperadmin(req.user)) {
        if (currentRoles.indexOf("directivo") !== -1) {
          return res.status(403).json({ message: "Directivo no puede editar a directivos" });
        }
        if (roles.indexOf("directivo") !== -1) {
          return res.status(403).json({ message: "Directivo no puede asignar rol directivo" });
        }
        if (roles.indexOf("docente") === -1) {
          return res.status(400).json({ message: "Un docente debe mantener rol docente" });
        }
      }
    }

    if (typeof nombre === "string" && nombre.trim()) user.nombre = nombre.trim();
    if (typeof apellido === "string") user.apellido = apellido.trim();
    if (typeof fechaNacimiento !== "undefined") user.fechaNacimiento = fechaNacimiento;
    if (typeof email === "string" && email.trim()) user.email = email.trim().toLowerCase();
    if (typeof req.body.dni !== "undefined") user.dni = dni || undefined;
    if (roles.length) user.roles = roles;
    if (typeof password === "string" && password) user.passwordHash = await bcrypt.hash(password, 10);

    await user.save();
    res.json({
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      fechaNacimiento: user.fechaNacimiento,
      dni: user.dni || "",
      email: user.email,
      roles: normalizeRoles(user.roles),
      role: primaryRole(user.roles),
      createdAt: user.createdAt
    });
  } catch (err) {
    // Duplicate key error for email
    if (err && err.code === 11000) return res.status(409).json({ message: "Email already in use" });
    next(err);
  }
};

exports.deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await Usuario.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    var roles = normalizeRoles(user.roles && user.roles.length ? user.roles : user.role ? [user.role] : []);
    if (!isStaffRoles(roles)) return res.status(400).json({ message: "Solo se puede eliminar directivos y docentes" });

    if (isDirectivo(req.user) && !isSuperadmin(req.user)) {
      if (roles.indexOf("directivo") !== -1) {
        return res.status(403).json({ message: "Directivo no puede eliminar directivos" });
      }
    }

    await Usuario.deleteOne({ _id: id });
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

exports.importStaffCsv = async (req, res, next) => {
  try {
    var csv = req.body && (req.body.csv || req.body.text);
    if (!csv) return res.status(400).json({ message: "csv es requerido" });

    var parsed = parseStaffCSV(csv);
    if (parsed.errors.length) return res.status(400).json({ message: "CSV invalido", errors: parsed.errors });

    var results = { created: 0, skipped: 0, credentials: [], errors: [] };

    for (var i = 0; i < parsed.rows.length; i++) {
      var r = parsed.rows[i];
      var nombre = String(r.nombre || "").trim();
      var apellido = String(r.apellido || "").trim();
      var fechaNacimiento = r.fechaNacimiento || undefined;
      var email = String(r.email || "").trim().toLowerCase();
      var dni = normalizeDni(r.dni);

      if (!nombre || !email) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "Campos incompletos" });
        continue;
      }

      var existingEmail = await Usuario.findOne({ email: email }).select("_id");
      if (existingEmail) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "Email ya existe: " + email });
        continue;
      }

      if (dni) {
        var existingDni = await Usuario.findOne({ dni: dni }).select("_id");
        if (existingDni) {
          results.skipped++;
          results.errors.push({ line: r.line, message: "DNI duplicado: " + dni });
          continue;
        }
      }

      var roles;
      try {
        roles = resolveStaffRolesForRequest(req.user, r.role, req.body && (req.body.defaultRole || req.body.defaultRoles));
      } catch (roleErr) {
        results.skipped++;
        results.errors.push({ line: r.line, message: roleErr.message });
        continue;
      }

      var generatedPassword = r.password || randomPassword(10);
      var passwordHash = await bcrypt.hash(generatedPassword, 10);

      try {
        await Usuario.create({
          nombre: nombre,
          apellido: apellido,
          fechaNacimiento: fechaNacimiento,
          dni: dni || undefined,
          email: email,
          passwordHash: passwordHash,
          roles: roles
        });
        results.created++;
        if (!r.password) {
          results.credentials.push({ line: r.line, email: email, dni: dni, password: generatedPassword });
        }
      } catch (err) {
        results.skipped++;
        if (err && err.code === 11000 && err.keyPattern && err.keyPattern.dni) {
          results.errors.push({ line: r.line, message: "DNI duplicado: " + dni });
        } else if (err && err.code === 11000 && err.keyPattern && err.keyPattern.email) {
          results.errors.push({ line: r.line, message: "Email ya existe: " + email });
        } else {
          results.errors.push({ line: r.line, message: err.message || "Error" });
        }
      }
    }

    res.status(201).json(results);
  } catch (err) {
    next(err);
  }
};

exports.listStudents = async (req, res, next) => {
  try {
    var cicloLectivo = parseCicloLectivo(req.query.cicloLectivo);
    if (cicloLectivo === false) return res.status(400).json({ message: "cicloLectivo invalido" });

    var scope = await buildStudentScope(req, {
      cursoId: req.query.cursoId,
      docenteId: req.query.docenteId,
      materiaCursoId: req.query.materiaCursoId,
      cicloLectivo: cicloLectivo || null
    });

    if (!scope.unrestricted && !scope.cursoIds.length) return res.json([]);

    var filter = { roles: "estudiante" };
    if (!scope.unrestricted) filter.cursoId = scope.cursoIds.length === 1 ? scope.cursoIds[0] : { $in: scope.cursoIds };

    var search = String(req.query.search || "").trim();
    if (search) {
      var rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ nombre: rx }, { apellido: rx }, { email: rx }, { dni: rx }];
    }

    var users = await Usuario.find(filter)
      .select(studentSelect())
      .populate("cursoId", "numero nombre division turno")
      .sort({ apellido: 1, nombre: 1, createdAt: -1 });

    users.forEach(normalizeStudent);
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.createStudent = async (req, res, next) => {
  try {
    var nombre = String(req.body.nombre || "").trim();
    var apellido = String(req.body.apellido || "").trim();
    var fechaNacimiento = req.body.fechaNacimiento;
    var dni = normalizeDni(req.body.dni);
    var email = String(req.body.email || "").trim().toLowerCase();
    var cursoId = String(req.body.cursoId || "").trim();
    var division = String(req.body.division || "").trim();
    var password = String(req.body.password || "");
    var roles;

    if (!nombre || !apellido || !dni || !email || !cursoId) {
      return res.status(400).json({ message: "nombre, apellido, dni, email y cursoId son requeridos" });
    }

    try {
      roles = resolveStudentRole(req.body.roles || req.body.role);
    } catch (roleErr) {
      return res.status(400).json({ message: roleErr.message });
    }

    var curso = await Curso.findById(cursoId).select("_id nombre numero division turno");
    if (!curso) return res.status(404).json({ message: "Curso not found" });

    if (!isDirectivoLike(req.user)) return res.status(403).json({ message: "Forbidden" });

    var existingDni = await Usuario.findOne({ dni: dni }).select("_id");
    if (existingDni) return res.status(409).json({ message: "DNI already in use" });

    var existingEmail = await Usuario.findOne({ email: email }).select("_id");
    if (existingEmail) return res.status(409).json({ message: "Email already in use" });

    var generatedPassword = "";
    if (!password) {
      generatedPassword = randomPassword(10);
      password = generatedPassword;
    }

    var passwordHash = await bcrypt.hash(password, 10);
    var user = await Usuario.create({
      nombre: nombre,
      apellido: apellido,
      fechaNacimiento: fechaNacimiento || undefined,
      dni: dni,
      email: email,
      passwordHash: passwordHash,
      roles: roles,
      cursoId: cursoId,
      division: division
    });

    var saved = await Usuario.findById(user._id).select(studentSelect()).populate("cursoId", "numero nombre division turno");
    normalizeStudent(saved);
    res.status(201).json({ student: saved, generatedPassword: generatedPassword });
  } catch (err) {
    if (err && err.code === 11000) {
      if (err.keyPattern && err.keyPattern.dni) return res.status(409).json({ message: "DNI already in use" });
      if (err.keyPattern && err.keyPattern.email) return res.status(409).json({ message: "Email already in use" });
    }
    next(err);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    var id = req.params.id;
    var user = await Usuario.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    var currentRoles = normalizeRoles(user.roles && user.roles.length ? user.roles : user.role ? [user.role] : []);
    if (currentRoles.indexOf("estudiante") === -1) {
      return res.status(400).json({ message: "Solo se puede editar estudiantes" });
    }

    if (!isDirectivoLike(req.user)) return res.status(403).json({ message: "Forbidden" });

    var nextCursoId = typeof req.body.cursoId === "string" && req.body.cursoId.trim() ? req.body.cursoId.trim() : user.cursoId;
    if (req.body.cursoId) {
      var curso = await Curso.findById(nextCursoId).select("_id");
      if (!curso) return res.status(404).json({ message: "Curso not found" });
    }

    if (!isDirectivoLike(req.user)) return res.status(403).json({ message: "Forbidden" });

    if (typeof req.body.nombre === "string" && req.body.nombre.trim()) user.nombre = req.body.nombre.trim();
    if (typeof req.body.apellido === "string" && req.body.apellido.trim()) user.apellido = req.body.apellido.trim();
    if (typeof req.body.fechaNacimiento !== "undefined") user.fechaNacimiento = req.body.fechaNacimiento || undefined;
    if (typeof req.body.email === "string" && req.body.email.trim()) user.email = req.body.email.trim().toLowerCase();
    if (typeof req.body.dni !== "undefined") {
      var dni = normalizeDni(req.body.dni);
      if (!dni) return res.status(400).json({ message: "dni es requerido" });
      user.dni = dni;
    }
    if (typeof req.body.cursoId === "string" && req.body.cursoId.trim()) user.cursoId = req.body.cursoId.trim();
    if (typeof req.body.division === "string") user.division = req.body.division.trim();
    if (typeof req.body.password === "string" && req.body.password) user.passwordHash = await bcrypt.hash(req.body.password, 10);

    await user.save();

    var saved = await Usuario.findById(user._id).select(studentSelect()).populate("cursoId", "numero nombre division turno");
    normalizeStudent(saved);
    res.json({ student: saved });
  } catch (err) {
    if (err && err.code === 11000) {
      if (err.keyPattern && err.keyPattern.dni) return res.status(409).json({ message: "DNI already in use" });
      if (err.keyPattern && err.keyPattern.email) return res.status(409).json({ message: "Email already in use" });
    }
    next(err);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    var id = req.params.id;
    var user = await Usuario.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    var currentRoles = normalizeRoles(user.roles && user.roles.length ? user.roles : user.role ? [user.role] : []);
    if (currentRoles.indexOf("estudiante") === -1) {
      return res.status(400).json({ message: "Solo se puede eliminar estudiantes" });
    }

    if (!isDirectivoLike(req.user)) return res.status(403).json({ message: "Forbidden" });

    await Usuario.deleteOne({ _id: id });
    res.json({ message: "Student deleted" });
  } catch (err) {
    next(err);
  }
};

exports.importStudentsCsv = async (req, res, next) => {
  try {
    var csv = req.body && (req.body.csv || req.body.text);
    if (!csv) return res.status(400).json({ message: "csv es requerido" });

    var parsed = parseStudentsCSV(csv);
    if (parsed.errors.length) return res.status(400).json({ message: "CSV invalido", errors: parsed.errors });

    var results = { created: 0, skipped: 0, credentials: [], errors: [] };

    for (var i = 0; i < parsed.rows.length; i++) {
      var r = parsed.rows[i];
      if (!r.nombre || !r.apellido || !r.dni || !r.email || !r.curso) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "Campos incompletos" });
        continue;
      }

      var dni = normalizeDni(r.dni);
      if (!dni) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "DNI invalido" });
        continue;
      }

      var existingDni = await Usuario.findOne({ dni: dni }).select("_id");
      if (existingDni) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "DNI duplicado: " + dni });
        continue;
      }

      var email = String(r.email || "").trim().toLowerCase();
      var existingEmail = await Usuario.findOne({ email: email }).select("_id");
      if (existingEmail) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "Email ya existe: " + email });
        continue;
      }

      var curso = await findCurso(r.curso);
      if (!curso) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "Curso no encontrado: " + r.curso });
        continue;
      }

      if (!isDirectivoLike(req.user)) return res.status(403).json({ message: "Forbidden" });

      try {
        resolveStudentRole(r.role, req.body && (req.body.defaultRole || req.body.defaultRoles));
      } catch (roleErr) {
        results.skipped++;
        results.errors.push({ line: r.line, message: roleErr.message });
        continue;
      }

      var generatedPassword = r.password || randomPassword(10);
      var passwordHash = await bcrypt.hash(generatedPassword, 10);

      try {
        await Usuario.create({
          nombre: r.nombre,
          apellido: r.apellido,
          fechaNacimiento: r.fechaNacimiento || undefined,
          dni: dni,
          email: email,
          passwordHash: passwordHash,
          roles: ["estudiante"],
          cursoId: curso._id,
          division: r.division || ""
        });
        results.created++;
        if (!r.password) {
          results.credentials.push({ line: r.line, email: email, dni: dni, password: generatedPassword });
        }
      } catch (err) {
        results.skipped++;
        if (err && err.code === 11000 && err.keyPattern && err.keyPattern.dni) {
          results.errors.push({ line: r.line, message: "DNI duplicado: " + dni });
        } else if (err && err.code === 11000 && err.keyPattern && err.keyPattern.email) {
          results.errors.push({ line: r.line, message: "Email ya existe: " + email });
        } else {
          results.errors.push({ line: r.line, message: err.message || "Error" });
        }
      }
    }

    res.status(201).json(results);
  } catch (err) {
    next(err);
  }
};
