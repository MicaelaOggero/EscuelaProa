const Contenido = require("../models/Contenido");
const MateriaCurso = require("../models/MateriaCurso");
const Usuario = require("../models/Usuario");
const { storeUploadedFile, deleteStoredFile } = require("../utils/storage");

function hasRole(user, role) {
  const roles = (user && user.roles) || [];
  return roles.indexOf(role) !== -1;
}

async function createdByDirectivo(createdBy) {
  if (!createdBy) return false;
  const creator = await Usuario.findById(createdBy).select("roles role").lean();
  const roles = (creator && (creator.roles || (creator.role ? [creator.role] : []))) || [];
  return roles.indexOf("directivo") !== -1;
}

function contenidoPopulate(query) {
  return query
    .populate("cursoId", "numero nombre division turno")
    .populate({
      path: "materiaCursoId",
      select: "materia cursoId cicloLectivo docenteId activo",
      populate: [
        { path: "cursoId", select: "numero nombre division turno" },
        { path: "docenteId", select: "nombre apellido email" }
      ]
    })
    .populate("createdBy", "nombre apellido email");
}

function parseBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    var text = value.trim().toLowerCase();
    if (text === "true") return true;
    if (text === "false") return false;
  }
  return fallback;
}

function normalizeArchivosInput(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === "string") {
    try {
      var parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return [];
}

async function uploadedFilesToArchivos(req) {
  var list = Array.isArray(req.files) ? req.files : [];
  var rows = [];
  for (var i = 0; i < list.length; i += 1) {
    var stored = await storeUploadedFile(req, list[i], {
      folder: "contenidos",
      fallbackName: "archivo",
      maxBaseLength: 50
    });
    rows.push({
      name: stored.name,
      url: stored.url,
      mime: stored.mime,
      size: stored.size
    });
    req._storedUploadUrls = (req._storedUploadUrls || []).concat(stored.url);
  }
  return rows;
}

async function removeTrackedUploads(req) {
  var urls = Array.isArray(req && req._storedUploadUrls) ? req._storedUploadUrls.slice() : [];
  req._storedUploadUrls = [];
  for (var i = 0; i < urls.length; i += 1) {
    await deleteStoredFile(urls[i]);
  }
}

async function removeMissingArchivos(previousFiles, nextFiles) {
  var nextUrls = new Set((nextFiles || []).map(function (file) {
    return file && file.url;
  }).filter(Boolean));
  for (var i = 0; i < (previousFiles || []).length; i += 1) {
    var file = previousFiles[i];
    if (file && file.url && !nextUrls.has(file.url)) {
      await deleteStoredFile(file.url);
    }
  }
}

exports.list = async (req, res, next) => {
  try {
    const filter = { publicado: true };
    const { cursoId, materiaCursoId, tipo } = req.query;

    // If logged student: force scope by student's cursoId
    if (req.user && req.user.id && hasRole(req.user, "estudiante")) {
      const me = await Usuario.findById(req.user.id).select("cursoId");
      if (!me || !me.cursoId) return res.json([]);
      filter.cursoId = me.cursoId;
    } else {
      if (cursoId) filter.cursoId = cursoId;
    }

    if (materiaCursoId) filter.materiaCursoId = materiaCursoId;
    if (tipo) filter.tipo = tipo;

    if (hasRole(req.user, "directivo") && !hasRole(req.user, "superadmin")) {
      const directivoIds = await Usuario.find({
        $or: [{ roles: "directivo" }, { role: "directivo" }]
      }).distinct("_id");
      filter.createdBy = { $in: directivoIds };
    }

    const rows = await contenidoPopulate(Contenido.find(filter))
      .sort({ fecha: -1, createdAt: -1 });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.mine = async (req, res, next) => {
  try {
    const rows = await contenidoPopulate(Contenido.find({ createdBy: req.user.id }))
      .sort({ fecha: -1, createdAt: -1 });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { materiaCursoId, tipo, titulo, resumen, contenido, fecha, publicado } = req.body;
    if (!materiaCursoId || !tipo || !titulo) {
      return res.status(400).json({ message: "materiaCursoId, tipo y titulo son requeridos" });
    }

    if (["material", "actividad", "publicacion"].indexOf(tipo) === -1) {
      return res.status(400).json({ message: "tipo invalido" });
    }

    const ma = await MateriaCurso.findById(materiaCursoId);
    if (!ma) return res.status(404).json({ message: "MateriaCurso not found" });

    const isPrivileged = hasRole(req.user, "superadmin") || hasRole(req.user, "directivo");
    const isDocenteOfAsignacion = String(ma.docenteId) === String(req.user.id);
    if (!isPrivileged && !isDocenteOfAsignacion) return res.status(403).json({ message: "Forbidden" });

    const uploaded = await uploadedFilesToArchivos(req);
    const archivos = normalizeArchivosInput(req.body.archivos).concat(uploaded);

    const row = await Contenido.create({
      tipo,
      titulo,
      resumen,
      contenido,
      fecha,
      publicado: parseBoolean(publicado, true),
      archivos,
      materiaCursoId,
      cursoId: ma.cursoId,
      createdBy: req.user.id
    });

    const populated = await contenidoPopulate(Contenido.findById(row._id));
    req._storedUploadUrls = [];

    res.status(201).json(populated);
  } catch (err) {
    await removeTrackedUploads(req);
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await Contenido.findById(id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const isPrivileged = hasRole(req.user, "superadmin") || (
      hasRole(req.user, "directivo") && await createdByDirectivo(row.createdBy)
    );
    const isOwner = String(row.createdBy) === String(req.user.id);
    if (!isPrivileged && !isOwner) return res.status(403).json({ message: "Forbidden" });

    const previousArchivos = Array.isArray(row.archivos) ? row.archivos.slice() : [];
    const allowed = ["titulo", "resumen", "contenido", "fecha"];
    allowed.forEach(function (k) {
      if (typeof req.body[k] !== "undefined") row[k] = req.body[k];
    });
    if (typeof req.body.publicado !== "undefined") row.publicado = parseBoolean(req.body.publicado, row.publicado);
    if (typeof req.body.archivos !== "undefined" || (req.files && req.files.length)) {
      row.archivos = normalizeArchivosInput(req.body.archivos).concat(await uploadedFilesToArchivos(req));
    }
    await row.save();
    req._storedUploadUrls = [];
    await removeMissingArchivos(previousArchivos, row.archivos);

    const populated = await contenidoPopulate(Contenido.findById(row._id));

    res.json(populated);
  } catch (err) {
    await removeTrackedUploads(req);
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await Contenido.findById(id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const isPrivileged = hasRole(req.user, "superadmin") || (
      hasRole(req.user, "directivo") && await createdByDirectivo(row.createdBy)
    );
    const isOwner = String(row.createdBy) === String(req.user.id);
    if (!isPrivileged && !isOwner) return res.status(403).json({ message: "Forbidden" });

    for (const file of row.archivos || []) {
      await deleteStoredFile(file.url);
    }
    await Contenido.deleteOne({ _id: id });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
