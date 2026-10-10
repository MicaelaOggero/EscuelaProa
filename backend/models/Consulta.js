const mongoose = require("mongoose");

const ConsultaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    motivo: { type: String, required: true, trim: true, maxlength: 160 },
    mensaje: { type: String, required: true, trim: true, maxlength: 5000 },
    estado: { type: String, enum: ["nueva", "en_proceso", "cerrada"], default: "nueva" },
    notasInternas: { type: String, trim: true, default: "" },
    notificadoPorEmail: { type: Boolean, default: false },
    notificadoAt: { type: Date, default: null },
    notificadoA: [{ type: String, trim: true, lowercase: true }],
    notificacionError: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Consulta", ConsultaSchema);
