const Contenido = require("../models/Contenido");
const MateriaAnio = require("../models/MateriaAnio");
const Usuario = require("../models/Usuario");

function hasRole(user, role) {
  const roles = (user && user.roles) || [];
  return roles.indexOf(role) !== -1;
}

exports.list = async (req, res, next) => {
  try {
    const filter = { publicado: true };
    const { anioId, materiaAnioId, tipo } = req.query;

    // If logged student: force scope by student's anioId
    if (req.user && req.user.id && hasRole(req.user, "estudiante")) {
      const me = await Usuario.findById(req.user.id).select("anioId");
      if (me && me.anioId) filter.anioId = me.anioId;
    } else {
      if (anioId) filter.anioId = anioId;
    }

    if (materiaAnioId) filter.materiaAnioId = materiaAnioId;
    if (tipo) filter.tipo = tipo;

    const rows = await Contenido.find(filter)
      .populate("anioId", "numero nombre division turno")
      .populate("materiaAnioId", "materia")
      .populate("createdBy", "nombre apellido email")
      .sort({ fecha: -1, createdAt: -1 });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.mine = async (req, res, next) => {
  try {
    const rows = await Contenido.find({ createdBy: req.user.id })
      .populate("anioId", "numero nombre division turno")
      .populate("materiaAnioId", "materia")
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
      createdBy: req.user.id
    });

    const populated = await Contenido.findById(row._id)
      .populate("anioId", "numero nombre division turno")
      .populate("materiaAnioId", "materia")
      .populate("createdBy", "nombre apellido email");

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

    const populated = await Contenido.findById(row._id)
      .populate("anioId", "numero nombre division turno")
      .populate("materiaId", "nombre codigo")
      .populate("createdBy", "nombre apellido email");

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
