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

    materiaAnioId: { type: mongoose.Schema.Types.ObjectId, ref: "MateriaAnio", required: true, index: true },
    anioId: { type: mongoose.Schema.Types.ObjectId, ref: "Anio", required: true, index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true, index: true }
  },
  { timestamps: true }
);

ContenidoSchema.index({ anioId: 1, materiaAnioId: 1, fecha: -1 });

module.exports = mongoose.model("Contenido", ContenidoSchema);
