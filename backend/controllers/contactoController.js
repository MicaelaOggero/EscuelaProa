const Consulta = require("../models/Consulta");
const { sendConsultaNotification, getMailConfig } = require("../utils/contactMailer");

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeEstado(value) {
  const allowed = ["nueva", "en_proceso", "cerrada"];
  return allowed.includes(value) ? value : null;
}

exports.create = async (req, res, next) => {
  try {
    const payload = {
      nombre: cleanText(req.body.nombre),
      email: cleanText(req.body.email).toLowerCase(),
      motivo: cleanText(req.body.motivo),
      mensaje: cleanText(req.body.mensaje)
    };

    const consulta = await Consulta.create(payload);
    const notification = await sendConsultaNotification(consulta);

    if (notification.skipped) {
      consulta.notificacionError = notification.reason;
    } else {
      consulta.notificadoPorEmail = true;
      consulta.notificadoAt = new Date();
      consulta.notificadoA = notification.recipients;
      consulta.notificacionError = "";
    }
    await consulta.save();

    res.status(201).json({
      message: "Consulta registrada",
      id: consulta._id,
      notificacionEnviada: !notification.skipped
    });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const filters = {};
    const estado = normalizeEstado(req.query.estado);
    const search = cleanText(req.query.q);

    if (estado) filters.estado = estado;
    if (search) {
      filters.$or = [
        { nombre: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { motivo: { $regex: search, $options: "i" } },
        { mensaje: { $regex: search, $options: "i" } }
      ];
    }

    const consultas = await Consulta.find(filters).sort({ createdAt: -1 });
    res.json(consultas);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updates = {};
    const estado = normalizeEstado(req.body.estado);
    if (estado) updates.estado = estado;
    if (typeof req.body.notasInternas === "string") {
      updates.notasInternas = cleanText(req.body.notasInternas);
    }

    const consulta = await Consulta.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!consulta) return res.status(404).json({ message: "Consulta no encontrada" });

    res.json({ message: "Consulta actualizada", consulta });
  } catch (err) {
    next(err);
  }
};

exports.mailConfig = async (req, res) => {
  const config = getMailConfig();
  res.json({
    enabled: config.enabled,
    host: config.host || "",
    port: config.port || "",
    secure: config.secure,
    from: config.from || "",
    to: config.to || []
  });
};
