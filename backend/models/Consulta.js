const mongoose = require("mongoose");

const ConsultaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    motivo: { type: String, required: true, trim: true },
    mensaje: { type: String, required: true, trim: true },
    estado: { type: String, enum: ["nueva", "en_proceso", "cerrada"], default: "nueva" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Consulta", ConsultaSchema);
