const mongoose = require("mongoose");

const ArchivoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, default: "", trim: true },
    mime: { type: String, default: "", trim: true },
    size: { type: Number }
  },
  { _id: false }
);

const ContenidoSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ["publicacion", "material", "actividad"], required: true },
    titulo: { type: String, required: true, trim: true },
    resumen: { type: String, default: "", trim: true },
    contenido: { type: String, default: "", trim: true },
    fecha: { type: Date, default: Date.now },
    publicado: { type: Boolean, default: true },
    archivos: { type: [ArchivoSchema], default: [] },

    materiaCursoId: { type: mongoose.Schema.Types.ObjectId, ref: "MateriaCurso", required: true, index: true },
    cursoId: { type: mongoose.Schema.Types.ObjectId, ref: "Curso", required: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true, index: true }
  },
  { timestamps: true }
);

ContenidoSchema.index({ cursoId: 1, materiaCursoId: 1, fecha: -1 });

module.exports = mongoose.model("Contenido", ContenidoSchema);
