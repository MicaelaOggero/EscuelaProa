const MateriaAnio = require("../models/MateriaAnio");
const Usuario = require("../models/Usuario");

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
