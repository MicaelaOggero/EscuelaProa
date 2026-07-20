const Contenido = require("../models/Contenido");
const MateriaCurso = require("../models/MateriaCurso");
const Usuario = require("../models/Usuario");

function hasRole(user, role) {
  const roles = (user && user.roles) || [];
  return roles.indexOf(role) !== -1;
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

exports.list = async (req, res, next) => {
  try {
    const filter = { publicado: true };
    const { cursoId, materiaCursoId, tipo } = req.query;

    // If logged student: force scope by student's cursoId
    if (req.user && req.user.id && hasRole(req.user, "estudiante")) {
      const me = await Usuario.findById(req.user.id).select("cursoId");
      if (me && me.cursoId) filter.cursoId = me.cursoId;
    } else {
      if (cursoId) filter.cursoId = cursoId;
    }

    if (materiaCursoId) filter.materiaCursoId = materiaCursoId;
    if (tipo) filter.tipo = tipo;

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

    const ma = await MateriaCurso.findById(materiaCursoId);
    if (!ma) return res.status(404).json({ message: "MateriaCurso not found" });

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
      materiaCursoId,
      cursoId: ma.cursoId,
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
