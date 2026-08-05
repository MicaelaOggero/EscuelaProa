const mongoose = require("mongoose");

const ConsultaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    motivo: { type: String, required: true, trim: true },
    mensaje: { type: String, required: true, trim: true },
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
