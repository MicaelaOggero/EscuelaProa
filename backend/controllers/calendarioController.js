const Evento = require("../models/Evento");
const Contenido = require("../models/Contenido");
const MateriaCurso = require("../models/MateriaCurso");
const Usuario = require("../models/Usuario");
const jwt = require("jsonwebtoken");
const { normalizeRoles } = require("../utils/roles");

const ROLES_VISIBLES = ["directivo", "docente", "estudiante"];

function parseVisibleRoles(value) {
  let roles = value;
  if (typeof roles === "string") {
    try {
      roles = JSON.parse(roles);
    } catch (err) {
      roles = roles.split(",");
    }
  }
  return normalizeRoles(roles).filter((role) => ROLES_VISIBLES.indexOf(role) !== -1);
}

function parseOptionalUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const payload = jwt.verify(token, secret);
    const roles = normalizeRoles(payload.roles && payload.roles.length ? payload.roles : payload.role);
    return { id: payload.id, roles };
  } catch (err) {
    return null;
  }
}

function payloadFromRequest(req) {
  const visibilidad = String(req.body.visibilidad || "publico").trim() === "privado" ? "privado" : "publico";
  const visibleParaRoles = visibilidad === "privado" ? parseVisibleRoles(req.body.visibleParaRoles) : [];
  return {
    titulo: String(req.body.titulo || "").trim(),
    descripcion: String(req.body.descripcion || "").trim(),
    inicio: req.body.inicio ? new Date(req.body.inicio) : null,
    fin: req.body.fin ? new Date(req.body.fin) : undefined,
    ubicacion: String(req.body.ubicacion || "").trim(),
    tipo: String(req.body.tipo || "Evento").trim() || "Evento",
    materiaCursoId: req.body.materiaCursoId || null,
    visibilidad,
    visibleParaRoles
  };
}

function validateEventPayload(payload) {
  if (!payload.titulo) return "El título es requerido";
  if (!payload.inicio) return "La fecha de inicio es requerida";
  if (payload.fin && payload.fin < payload.inicio) return "La fecha de fin no puede ser anterior al inicio";
  return null;
}

function eventoPopulate(query) {
  return query
    .populate({ path: "materiaCursoId", populate: { path: "cursoId", select: "numero nombre division turno" } })
    .populate("cursoId", "numero nombre division turno")
    .populate("createdBy", "nombre apellido email");
}

function actividadPopulate(query) {
  return query
    .populate({
      path: "materiaCursoId",
      select: "materia cursoId cicloLectivo docenteId",
      populate: { path: "cursoId", select: "numero nombre division turno" }
    })
    .populate("cursoId", "numero nombre division turno")
    .populate("createdBy", "nombre apellido email");
}

function actividadAsEvento(row) {
  return {
    _id: row._id,
    titulo: row.titulo,
    resumen: row.resumen,
    contenido: row.contenido,
    fecha: row.fecha,
    archivos: row.archivos || [],
    descripcion: row.resumen || row.contenido || "",
    inicio: row.fecha || row.createdAt,
    fin: null,
    ubicacion: "",
    tipo: "Actividad",
    materiaCursoId: row.materiaCursoId,
    cursoId: row.cursoId,
    visibilidad: "privado",
    visibleParaRoles: [],
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    origen: "actividad"
  };
}

function hasRole(user, role) {
  return !!(user && Array.isArray(user.roles) && user.roles.indexOf(role) !== -1);
}

async function createdByDirectivo(createdBy) {
  if (!createdBy) return false;
  const creator = await Usuario.findById(createdBy).select("roles role").lean();
  const roles = (creator && (creator.roles || (creator.role ? [creator.role] : []))) || [];
  return roles.indexOf("directivo") !== -1;
}

exports.list = async (req, res, next) => {
  try {
    let user = req.user || parseOptionalUser(req);
    if (user && user.id) {
      const currentUser = await Usuario.findById(user.id).select("roles role").lean();
      if (currentUser) {
        user = {
          id: user.id,
          roles: normalizeRoles(
            currentUser.roles && currentUser.roles.length
              ? currentUser.roles
              : currentUser.role
          )
        };
      }
    }
    let query;
    let actividadesQuery = null;
    const docenteContext = !!(
      user &&
      Array.isArray(user.roles) &&
      user.roles.indexOf("docente") !== -1 &&
      String(req.query.context || "").toLowerCase() === "docente"
    );

    if (!user || !Array.isArray(user.roles) || !user.roles.length) {
      query = { visibilidad: "publico", materiaCursoId: null };
    } else if (user.roles.indexOf("superadmin") !== -1 && !docenteContext) {
      query = {};
    } else if (user.roles.indexOf("directivo") !== -1 && !docenteContext) {
      const directivoIds = await Usuario.find({
        $or: [{ roles: "directivo" }, { role: "directivo" }]
      }).distinct("_id");
      query = {
        $or: [
          { createdBy: { $in: directivoIds } },
          { createdBy: null }
        ]
      };
    } else if (user.roles.indexOf("docente") !== -1) {
      query = {
        $or: [
          {
            $or: [
              { visibilidad: "publico" },
              { visibilidad: { $exists: false } },
              { visibilidad: null }
            ],
            materiaCursoId: null
          },
          { visibilidad: "privado", visibleParaRoles: { $in: user.roles }, materiaCursoId: null },
          { createdBy: user.id, materiaCursoId: { $ne: null } }
        ]
      };
      actividadesQuery = { tipo: "actividad", createdBy: user.id };
    } else {
      const me = await Usuario.findById(user.id).select("cursoId");
      const cursoId = me && me.cursoId ? me.cursoId : null;
      query = {
        $or: [
          { visibilidad: "publico", materiaCursoId: null },
          { visibilidad: "privado", visibleParaRoles: { $in: user.roles }, materiaCursoId: null },
          cursoId ? { cursoId: cursoId, materiaCursoId: { $ne: null } } : null
        ]
      };
      query.$or = query.$or.filter(Boolean);
      if (cursoId) {
        const materiaCursoIds = await MateriaCurso.find({ cursoId: cursoId }).distinct("_id");
        actividadesQuery = {
          tipo: "actividad",
          publicado: true,
          $or: [
            { cursoId: cursoId },
            { materiaCursoId: { $in: materiaCursoIds } }
          ]
        };
      }
    }

    const eventos = await eventoPopulate(Evento.find(query)).sort({ inicio: 1, createdAt: -1 });
    let actividades = [];
    if (actividadesQuery) {
      const rows = await actividadPopulate(Contenido.find(actividadesQuery)).sort({ fecha: 1, createdAt: -1 });
      actividades = rows.map(actividadAsEvento);
    }
    res.json(eventos.concat(actividades).sort((a, b) => {
      const dateA = new Date(a.inicio || a.createdAt || 0).getTime();
      const dateB = new Date(b.inicio || b.createdAt || 0).getTime();
      return dateA - dateB;
    }));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const payload = payloadFromRequest(req);
    const payloadError = validateEventPayload(payload);
    if (payloadError) return res.status(400).json({ message: payloadError });
    if (payload.inicio && isNaN(payload.inicio.getTime())) return res.status(400).json({ message: "Fecha de inicio invalida" });
    if (payload.fin && isNaN(payload.fin.getTime())) return res.status(400).json({ message: "Fecha de fin invalida" });

    payload.createdBy = req.user.id;

    if (payload.materiaCursoId) {
      const materia = await MateriaCurso.findById(payload.materiaCursoId).select("_id cursoId docenteId");
      if (!materia) return res.status(404).json({ message: "MateriaCurso not found" });
      if (hasRole(req.user, "docente") && String(materia.docenteId) !== String(req.user.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      payload.cursoId = materia.cursoId;
      payload.visibilidad = "privado";
      payload.visibleParaRoles = [];
      payload.createdBy = req.user.id;
    } else if (payload.visibilidad === "privado" && !payload.visibleParaRoles.length) {
      return res.status(400).json({ message: "Debes seleccionar al menos un rol para un evento privado." });
    }

    const evento = await Evento.create(payload);
    const populated = await eventoPopulate(Evento.findById(evento._id));
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ message: "Evento not found" });

    if (hasRole(req.user, "directivo") && !hasRole(req.user, "superadmin")) {
      if (!(await createdByDirectivo(evento.createdBy))) {
        return res.status(403).json({ message: "No tienes acceso a eventos creados por docentes" });
      }
    } else if (evento.materiaCursoId && hasRole(req.user, "docente") && String(evento.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const payload = payloadFromRequest(req);
    const payloadError = validateEventPayload(payload);
    if (payloadError) return res.status(400).json({ message: payloadError });
    if (payload.inicio && isNaN(payload.inicio.getTime())) return res.status(400).json({ message: "Fecha de inicio invalida" });
    if (payload.fin && isNaN(payload.fin.getTime())) return res.status(400).json({ message: "Fecha de fin invalida" });

    if (payload.materiaCursoId) {
      const materia = await MateriaCurso.findById(payload.materiaCursoId).select("_id cursoId docenteId");
      if (!materia) return res.status(404).json({ message: "MateriaCurso not found" });
      if (hasRole(req.user, "docente") && String(materia.docenteId) !== String(req.user.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      payload.cursoId = materia.cursoId;
      payload.visibilidad = "privado";
      payload.visibleParaRoles = [];
    } else if (payload.visibilidad === "privado" && !payload.visibleParaRoles.length) {
      return res.status(400).json({ message: "Debes seleccionar al menos un rol para un evento privado." });
    }

    evento.titulo = payload.titulo;
    evento.descripcion = payload.descripcion;
    evento.inicio = payload.inicio;
    evento.fin = payload.fin;
    evento.ubicacion = payload.ubicacion;
    evento.tipo = payload.tipo;
    evento.materiaCursoId = payload.materiaCursoId || null;
    evento.cursoId = payload.cursoId || null;
    evento.visibilidad = payload.visibilidad;
    evento.visibleParaRoles = payload.visibleParaRoles;

    await evento.save();
    const populated = await eventoPopulate(Evento.findById(evento._id));
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ message: "Evento not found" });

    if (hasRole(req.user, "directivo") && !hasRole(req.user, "superadmin")) {
      if (!(await createdByDirectivo(evento.createdBy))) {
        return res.status(403).json({ message: "No tienes acceso a eventos creados por docentes" });
      }
    } else if (evento.materiaCursoId && hasRole(req.user, "docente") && String(evento.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Evento.deleteOne({ _id: req.params.id });
    res.json({ message: "Evento deleted" });
  } catch (err) {
    next(err);
  }
};
