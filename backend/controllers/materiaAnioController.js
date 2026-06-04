const MateriaAnio = require("../models/MateriaAnio");
const Usuario = require("../models/Usuario");
const Anio = require("../models/Anio");
const bcrypt = require("bcryptjs");

function hasRole(reqUser, role) {
  const roles = (reqUser && reqUser.roles) || [];
  return roles.indexOf(role) !== -1;
}

exports.list = async (req, res, next) => {
  try {
    const filter = { activo: true };
    const { anioId, docenteId } = req.query;

    if (hasRole(req.user, "estudiante")) {
      const me = await Usuario.findById(req.user.id).select("anioId");
      if (me && me.anioId) filter.anioId = me.anioId;
    } else {
      if (anioId) filter.anioId = anioId;
    }

    if (docenteId) filter.docenteId = docenteId;

    const rows = await MateriaAnio.find(filter)
      .populate("anioId", "numero nombre division turno")
      .populate("docenteId", "nombre apellido email roles role")
      .sort({ "anioId.numero": 1, materia: 1, createdAt: -1 });

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.mine = async (req, res, next) => {
  try {
    const rows = await MateriaAnio.find({ docenteId: req.user.id, activo: true })
      .populate("anioId", "numero nombre division turno")
      .sort({ createdAt: -1 });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { materia, anioId, docenteId } = req.body;
    if (!materia || !anioId || !docenteId) {
      return res.status(400).json({ message: "materia, anioId y docenteId son requeridos" });
    }

    const row = await MateriaAnio.create({ materia, anioId, docenteId });
    const populated = await MateriaAnio.findById(row._id)
      .populate("anioId", "numero nombre division turno")
      .populate("docenteId", "nombre apellido email roles role");

    res.status(201).json(populated);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: "MateriaAnio already exists" });
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await MateriaAnio.findByIdAndDelete(id);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { materia, anioId, docenteId, activo } = req.body;

    const row = await MateriaAnio.findById(id);
    if (!row) return res.status(404).json({ message: "Not found" });

    if (typeof materia === "string" && materia.trim()) row.materia = materia.trim();
    if (anioId) row.anioId = anioId;
    if (docenteId) row.docenteId = docenteId;
    if (typeof activo === "boolean") row.activo = activo;

    await row.save();

    const populated = await MateriaAnio.findById(row._id)
      .populate("anioId", "numero nombre division turno")
      .populate("docenteId", "nombre apellido email roles role");

    res.json(populated);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: "MateriaAnio already exists" });
    next(err);
  }
};

function parseCSV(text) {
  var lines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  lines = lines.filter(function (l) {
    return l.trim().length > 0;
  });
  if (!lines.length) return { rows: [], errors: ["CSV vacio"] };

  var header = lines[0] || "";
  // Strip UTF-8 BOM if present
  header = header.replace(/^\uFEFF/, "");

  var delimiter = ",";
  if (header.indexOf("\t") !== -1) delimiter = "\t";
  else if (header.indexOf(";") !== -1 && header.indexOf(",") === -1) delimiter = ";";

  function splitLine(line) {
    // Basic CSV split with quotes support.
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
    // remove quotes
    s = s.replace(/^"|"$/g, "");
    // very small diacritics normalization (keep it simple)
    s = s
      .replace(/á/g, "a")
      .replace(/é/g, "e")
      .replace(/í/g, "i")
      .replace(/ó/g, "o")
      .replace(/ú/g, "u")
      .replace(/ü/g, "u")
      .replace(/ñ/g, "n");
    // collapse whitespace
    s = s.replace(/\s+/g, " ");
    return s;
  }

  var headers = splitLine(header).map(normalizeHeader);

  function idxFor(name) {
    return headers.indexOf(name);
  }

  var iMateria = idxFor("materia");
  if (iMateria === -1) iMateria = idxFor("nombre de la materia");
  if (iMateria === -1) iMateria = idxFor("nombre");

  var iAnio = idxFor("ano");
  if (iAnio === -1) iAnio = idxFor("anio");
  if (iAnio === -1) iAnio = idxFor("ano al que corresponde");
  if (iAnio === -1) iAnio = idxFor("anio al que corresponde");

  var iNombre = idxFor("nombre");
  var iApellido = idxFor("apellido");
  var iFecha = idxFor("fecha de nacimiento");
  if (iFecha === -1) iFecha = idxFor("fecha nacimiento");
  if (iFecha === -1) iFecha = idxFor("fecha_nacimiento");

  var iEmail = idxFor("email");
  if (iEmail === -1) iEmail = idxFor("correo");
  if (iEmail === -1) iEmail = idxFor("mail");

  var errors = [];
  if (iMateria === -1) errors.push("Falta columna: nombre de la materia");
  if (iAnio === -1) errors.push("Falta columna: año al que corresponde");
  if (iEmail === -1) errors.push("Falta columna: email del docente");
  if (errors.length) return { rows: [], errors: errors };

  var rows = [];
  for (var li = 1; li < lines.length; li++) {
    var cols = splitLine(lines[li]);
    rows.push({
      materia: (cols[iMateria] || "").trim(),
      anio: (cols[iAnio] || "").trim(),
      nombre: iNombre === -1 ? "" : (cols[iNombre] || "").trim(),
      apellido: iApellido === -1 ? "" : (cols[iApellido] || "").trim(),
      fechaNacimiento: iFecha === -1 ? "" : (cols[iFecha] || "").trim(),
      email: (cols[iEmail] || "").trim(),
      line: li + 1
    });
  }
  return { rows: rows, errors: [] };
}

async function findDocente(docenteStr) {
  var s = String(docenteStr || "").trim();
  if (!s) return null;
  // Prefer email
  if (s.indexOf("@") !== -1) {
    return await Usuario.findOne({ email: s.toLowerCase() });
  }

  // Try "Apellido, Nombre" or "Nombre Apellido" best-effort
  var parts = s.split(",").map(function (x) {
    return x.trim();
  });
  var apellido = parts.length > 1 ? parts[0] : "";
  var nombre = parts.length > 1 ? parts.slice(1).join(" ") : s;

  var q = {
    roles: "docente"
  };

  // Soft match
  var candidates = await Usuario.find(q).select("nombre apellido email roles");
  var lower = s.toLowerCase();
  var best = candidates.find(function (u) {
    var full1 = ((u.apellido || "") + ", " + (u.nombre || "")).toLowerCase();
    var full2 = ((u.nombre || "") + " " + (u.apellido || "")).toLowerCase();
    if (apellido && nombre) {
      return (String(u.apellido || "").toLowerCase() === apellido.toLowerCase() &&
        String(u.nombre || "").toLowerCase() === nombre.toLowerCase());
    }
    return full1 === lower || full2 === lower;
  });
  return best || null;
}

function randomPassword(len) {
  var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  var out = "";
  for (var i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function createDocenteFromEmail(emailStr) {
  var email = String(emailStr || "").trim().toLowerCase();
  if (!email || email.indexOf("@") === -1) return null;
  var exists = await Usuario.findOne({ email: email }).select("_id");
  if (exists) return null;

  var tempPassword = randomPassword(12);
  var passwordHash = await bcrypt.hash(tempPassword, 10);
  var nombre = email.split("@")[0] || "Docente";

  var user = await Usuario.create({
    nombre: nombre,
    email: email,
    passwordHash: passwordHash,
    roles: ["docente"]
  });

  return { user: user, tempPassword: tempPassword };
}

async function findOrCreateDocenteFromRow(r) {
  var email = String(r.email || "").trim().toLowerCase();
  if (!email) return { docente: null, created: null, error: "Email docente vacio" };

  var existing = await Usuario.findOne({ email: email });
  if (existing) return { docente: existing, created: null, error: null };

  var nombre = String(r.nombre || "").trim();
  var apellido = String(r.apellido || "").trim();
  if (!nombre) return { docente: null, created: null, error: "Falta nombre para crear docente" };
  if (!apellido) return { docente: null, created: null, error: "Falta apellido para crear docente" };

  var tempPassword = randomPassword(12);
  var passwordHash = await bcrypt.hash(tempPassword, 10);
  var user = await Usuario.create({
    nombre: nombre,
    apellido: apellido,
    fechaNacimiento: r.fechaNacimiento ? r.fechaNacimiento : undefined,
    email: email,
    passwordHash: passwordHash,
    roles: ["docente"]
  });
  return { docente: user, created: { email: user.email, tempPassword: tempPassword }, error: null };
}

async function findAnio(anioStr) {
  var s = String(anioStr || "").trim();
  if (!s) return null;
  // Try numeric
  var n = parseInt(s, 10);
  if (!isNaN(n)) {
    var byNum = await Anio.findOne({ numero: n });
    if (byNum) return byNum;
  }
  return await Anio.findOne({ nombre: s });
}

exports.importCsv = async (req, res, next) => {
  try {
    var csv = req.body && (req.body.csv || req.body.text);
    if (!csv) return res.status(400).json({ message: "csv es requerido" });

    var parsed = parseCSV(csv);
    if (parsed.errors.length) return res.status(400).json({ message: "CSV invalido", errors: parsed.errors });

    var results = { created: 0, skipped: 0, createdDocentes: 0, docentes: [], errors: [] };

    for (var i = 0; i < parsed.rows.length; i++) {
      var r = parsed.rows[i];
      if (!r.materia || !r.anio || !r.email) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "Campos incompletos" });
        continue;
      }

      var docRes = await findOrCreateDocenteFromRow(r);
      if (!docRes.docente) {
        results.skipped++;
        results.errors.push({ line: r.line, message: docRes.error || "Docente no encontrado" });
        continue;
      }
      var docente = docRes.docente;
      if (docRes.created) {
        results.createdDocentes++;
        results.docentes.push(docRes.created);
      }

      var anio = await findAnio(r.anio);
      if (!anio) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "Anio no encontrado: " + r.anio });
        continue;
      }

      try {
        await MateriaAnio.create({ materia: r.materia, docenteId: docente._id, anioId: anio._id });
        results.created++;
      } catch (e) {
        if (e && e.code === 11000) {
          results.skipped++;
        } else {
          results.skipped++;
          results.errors.push({ line: r.line, message: e.message || "Error" });
        }
      }
    }

    res.status(201).json(results);
  } catch (err) {
    next(err);
  }
};
