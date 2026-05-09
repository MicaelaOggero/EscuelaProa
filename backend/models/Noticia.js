const mongoose = require("mongoose");

const NoticiaSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    categoria: { type: String, default: "Institucional", trim: true },
    resumen: { type: String, default: "", trim: true },
    contenido: { type: String, default: "", trim: true },
    fecha: { type: Date, default: Date.now },
    destacada: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Noticia", NoticiaSchema);
