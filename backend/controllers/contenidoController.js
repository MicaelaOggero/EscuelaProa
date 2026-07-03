const Contenido = require("../models/Contenido");
const MateriaAnio = require("../models/MateriaAnio");
const Usuario = require("../models/Usuario");

function hasRole(user, role) {
  const roles = (user && user.roles) || [];
  return roles.indexOf(role) !== -1;
}

function parseCicloLectivo(value) {
  var num = Number(value);
  if (!Number.isInteger(num) || num < 2000 || num > 2100) return null;
  return num;
}

function contenidoPopulate(query) {
  return query
    .populate("anioId", "numero nombre division turno")
    .populate({
      path: "materiaAnioId",
      select: "materia anioId cicloLectivo docenteId activo",
      populate: [
        { path: "anioId", select: "numero nombre division turno" },
        { path: "docenteId", select: "nombre apellido email" }
      ]
    })
    .populate("createdBy", "nombre apellido email");
}

exports.list = async (req, res, next) => {
  try {
    const filter = { publicado: true };
    const { anioId, materiaAnioId, tipo, cicloLectivo } = req.query;

    // If logged student: force scope by student's anioId
    if (req.user && req.user.id && hasRole(req.user, "estudiante")) {
      const me = await Usuario.findById(req.user.id).select("anioId");
      if (me && me.anioId) filter.anioId = me.anioId;
    } else {
      if (anioId) filter.anioId = anioId;
    }

    if (materiaAnioId) filter.materiaAnioId = materiaAnioId;
    if (tipo) filter.tipo = tipo;
    if (typeof cicloLectivo !== "undefined" && cicloLectivo !== "") {
      const ciclo = parseCicloLectivo(cicloLectivo);
      if (ciclo === null) return res.status(400).json({ message: "cicloLectivo invalido" });
      filter.cicloLectivo = ciclo;
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
    const { materiaAnioId, tipo, titulo, resumen, contenido, fecha, publicado } = req.body;
    if (!materiaAnioId || !tipo || !titulo) {
      return res.status(400).json({ message: "materiaAnioId, tipo y titulo son requeridos" });
    }

    const ma = await MateriaAnio.findById(materiaAnioId);
    if (!ma) return res.status(404).json({ message: "MateriaAnio not found" });

    const isPrivileged = hasRole(req.user, "superadmin") || hasRole(req.user, "directivo");
    const isDocenteOfAsignacion = String(ma.docenteId) === String(req.user.id);
    if (!isPrivileged && !isDocenteOfAsignacion) return res.status(403).json({ message: "Forbidden" });

    const row = await Contenido.create({
      tipo,
      titulo,
      resumen,
      contenido,
      fecha,
      publicado: typeof publicado === "boolean" ? publicado : true,
      archivos: Array.isArray(req.body.archivos) ? req.body.archivos : [],
      materiaAnioId,
      anioId: ma.anioId,
      cicloLectivo: ma.cicloLectivo,
      createdBy: req.user.id
    });

    const populated = await contenidoPopulate(Contenido.findById(row._id));

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await Contenido.findById(id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const isPrivileged = hasRole(req.user, "superadmin") || hasRole(req.user, "directivo");
    const isOwner = String(row.createdBy) === String(req.user.id);
    if (!isPrivileged && !isOwner) return res.status(403).json({ message: "Forbidden" });

    const allowed = ["titulo", "resumen", "contenido", "fecha", "publicado", "archivos"];
    allowed.forEach(function (k) {
      if (typeof req.body[k] !== "undefined") row[k] = req.body[k];
    });
    await row.save();

    const populated = await contenidoPopulate(Contenido.findById(row._id));

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = await Contenido.findById(id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const isPrivileged = hasRole(req.user, "superadmin") || hasRole(req.user, "directivo");
    const isOwner = String(row.createdBy) === String(req.user.id);
    if (!isPrivileged && !isOwner) return res.status(403).json({ message: "Forbidden" });

    await Contenido.deleteOne({ _id: id });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
