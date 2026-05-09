const mongoose = require("mongoose");

const EventoSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "", trim: true },
    inicio: { type: Date, required: true },
    fin: { type: Date },
    ubicacion: { type: String, default: "", trim: true },
    tipo: { type: String, default: "Evento", trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Evento", EventoSchema);
