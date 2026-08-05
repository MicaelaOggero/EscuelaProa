const mongoose = require("mongoose");

const ROLES_VISIBLES = ["directivo", "docente", "estudiante"];

const NoticiaImagenSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, default: "", trim: true },
    orden: { type: Number, default: 0 }
  },
  { _id: false }
);

const NoticiaSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    categoria: { type: String, default: "Institucional", trim: true },
    resumen: { type: String, default: "", trim: true },
    contenido: { type: String, default: "", trim: true },
    fecha: { type: Date, default: Date.now },
    destacada: { type: Boolean, default: false },
    imagenes: { type: [NoticiaImagenSchema], default: [] },
    tipo: { type: String, enum: ["publica", "privada"], default: "publica" },
    visibleParaRoles: {
      type: [String],
      enum: ROLES_VISIBLES,
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Noticia", NoticiaSchema);
