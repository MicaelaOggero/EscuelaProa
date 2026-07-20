const MateriaCurso = require("../models/MateriaCurso");
const Usuario = require("../models/Usuario");
const Curso = require("../models/Curso");

function materiaCursoPopulate(query) {
  return query
    .populate("cursoId", "numero nombre division turno")
    .populate("docenteId", "nombre apellido email roles role");
}

function hasRole(reqUser, role) {
  const roles = (reqUser && reqUser.roles) || [];
  return roles.indexOf(role) !== -1;
}

function parseCicloLectivo(value) {
  var num = Number(value);
  if (!Number.isInteger(num) || num < 2000 || num > 2100) return null;
  return num;
}

async function validateDocente(docenteId) {
  const docente = await Usuario.findById(docenteId).select("_id roles role");
  if (!docente) return { ok: false, status: 404, message: "Docente not found" };
  const docenteRoles = Array.isArray(docente.roles)
    ? docente.roles
    : docente.role
      ? [docente.role]
      : [];
  if (docenteRoles.indexOf("docente") === -1) {
    return { ok: false, status: 400, message: "El usuario asignado debe tener rol docente" };
  }
  return { ok: true, docente: docente };
}

exports.list = async (req, res, next) => {
  try {
    const filter = { activo: true };
    const { cursoId, docenteId, cicloLectivo } = req.query;

    if (hasRole(req.user, "estudiante")) {
      const me = await Usuario.findById(req.user.id).select("cursoId");
      if (me && me.cursoId) filter.cursoId = me.cursoId;
    } else {
      if (cursoId) filter.cursoId = cursoId;
    }

    if (docenteId) filter.docenteId = docenteId;
    if (typeof cicloLectivo !== "undefined" && cicloLectivo !== "") {
      var ciclo = parseCicloLectivo(cicloLectivo);
      if (ciclo === null) return res.status(400).json({ message: "cicloLectivo invalido" });
      filter.cicloLectivo = ciclo;
    }

    const rows = await materiaCursoPopulate(MateriaCurso.find(filter))
      .sort({ cicloLectivo: -1, materia: 1, createdAt: -1 });

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.mine = async (req, res, next) => {
  try {
    const rows = await materiaCursoPopulate(MateriaCurso.find({ docenteId: req.user.id, activo: true }))
      .sort({ cicloLectivo: -1, createdAt: -1 });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { materia, cursoId, cicloLectivo } = req.body;
    if (!materia || !cursoId || typeof cicloLectivo === "undefined") {
      return res.status(400).json({ message: "materia, cursoId y cicloLectivo son requeridos" });
    }

    const materiaNombre = String(materia || "").trim();
    if (!materiaNombre) return res.status(400).json({ message: "materia es requerida" });
    const ciclo = parseCicloLectivo(cicloLectivo);
    if (ciclo === null) return res.status(400).json({ message: "cicloLectivo invalido" });

    const curso = await Curso.findById(cursoId).select("_id");
    if (!curso) return res.status(404).json({ message: "Curso not found" });

    const row = await MateriaCurso.create({ materia: materiaNombre, cursoId, cicloLectivo: ciclo });
    const populated = await materiaCursoPopulate(MateriaCurso.findById(row._id));

    res.status(201).json(populated);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: "MateriaCurso already exists" });
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await MateriaCurso.findByIdAndDelete(id);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { materia, cursoId, docenteId, cicloLectivo, activo } = req.body;

    const row = await MateriaCurso.findById(id);
    if (!row) return res.status(404).json({ message: "Not found" });

    if (typeof materia === "string" && materia.trim()) row.materia = materia.trim();
    if (cursoId) {
      const curso = await Curso.findById(cursoId).select("_id");
      if (!curso) return res.status(404).json({ message: "Curso not found" });
      row.cursoId = cursoId;
    }
    if (typeof docenteId === "string" && !docenteId.trim()) {
      row.docenteId = null;
    } else if (docenteId) {
      const docenteCheck = await validateDocente(docenteId);
      if (!docenteCheck.ok) return res.status(docenteCheck.status).json({ message: docenteCheck.message });
      row.docenteId = docenteId;
    }
    if (typeof cicloLectivo !== "undefined") {
      const ciclo = parseCicloLectivo(cicloLectivo);
      if (ciclo === null) return res.status(400).json({ message: "cicloLectivo invalido" });
      row.cicloLectivo = ciclo;
    }
    if (typeof activo === "boolean") row.activo = activo;

    await row.save();

    const populated = await materiaCursoPopulate(MateriaCurso.findById(row._id));

    res.json(populated);
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ message: "MateriaCurso already exists" });
    next(err);
  }
};

exports.assignDocente = async (req, res, next) => {
  try {
    const { id } = req.params;
    const docenteId = String(req.body && req.body.docenteId || "").trim();
    if (!docenteId) return res.status(400).json({ message: "docenteId es requerido" });

    const row = await MateriaCurso.findById(id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const docenteCheck = await validateDocente(docenteId);
    if (!docenteCheck.ok) return res.status(docenteCheck.status).json({ message: docenteCheck.message });

    row.docenteId = docenteId;
    await row.save();

    const populated = await materiaCursoPopulate(MateriaCurso.findById(row._id));
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

exports.clearDocente = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await MateriaCurso.findById(id);
    if (!row) return res.status(404).json({ message: "Not found" });

    row.docenteId = null;
    await row.save();

    const populated = await materiaCursoPopulate(MateriaCurso.findById(row._id));
    res.json(populated);
  } catch (err) {
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

  var iCurso = idxFor("curso");
  if (iCurso === -1) iCurso = idxFor("curso al que corresponde");

  var iCiclo = idxFor("ciclo lectivo");
  if (iCiclo === -1) iCiclo = idxFor("periodo");

  var errors = [];
  if (iMateria === -1) errors.push("Falta columna: nombre de la materia");
  if (iCurso === -1) errors.push("Falta columna: curso");
  if (iCiclo === -1) errors.push("Falta columna: ciclo lectivo");
  if (errors.length) return { rows: [], errors: errors };

  var rows = [];
  for (var li = 1; li < lines.length; li++) {
    var cols = splitLine(lines[li]);
    rows.push({
      materia: (cols[iMateria] || "").trim(),
      curso: (cols[iCurso] || "").trim(),
      cicloLectivo: iCiclo === -1 ? "" : (cols[iCiclo] || "").trim(),
      line: li + 1
    });
  }
  return { rows: rows, errors: [] };
}

async function findCurso(anioStr) {
  var s = String(anioStr || "").trim();
  if (!s) return null;
  // Try numeric
  var n = parseInt(s, 10);
  if (!isNaN(n)) {
    var byNum = await Curso.findOne({ numero: n });
    if (byNum) return byNum;
  }
  return await Curso.findOne({ nombre: s });
}

exports.importCsv = async (req, res, next) => {
  try {
    var csv = req.body && (req.body.csv || req.body.text);
    if (!csv) return res.status(400).json({ message: "csv es requerido" });

    var parsed = parseCSV(csv);
    if (parsed.errors.length) return res.status(400).json({ message: "CSV invalido", errors: parsed.errors });

    var results = { created: 0, skipped: 0, errors: [] };

    for (var i = 0; i < parsed.rows.length; i++) {
      var r = parsed.rows[i];
      if (!r.materia || !r.curso || !r.cicloLectivo) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "Campos incompletos" });
        continue;
      }

      var ciclo = parseCicloLectivo(r.cicloLectivo);
      if (ciclo === null) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "Ciclo lectivo invalido: " + r.cicloLectivo });
        continue;
      }

      var curso = await findCurso(r.curso);
      if (!curso) {
        results.skipped++;
        results.errors.push({ line: r.line, message: "Curso no encontrado: " + r.curso });
        continue;
      }

      try {
        await MateriaCurso.create({ materia: r.materia, cursoId: curso._id, cicloLectivo: ciclo });
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
