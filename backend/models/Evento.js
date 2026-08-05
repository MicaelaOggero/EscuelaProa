const mongoose = require("mongoose");

const ROLES_VISIBLES = ["directivo", "docente", "estudiante"];

const EventoSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "", trim: true },
    inicio: { type: Date, required: true },
    fin: { type: Date },
    ubicacion: { type: String, default: "", trim: true },
    tipo: { type: String, default: "Evento", trim: true },
    visibilidad: { type: String, enum: ["publico", "privado"], default: "publico" },
    materiaCursoId: { type: mongoose.Schema.Types.ObjectId, ref: "MateriaCurso", default: null },
    cursoId: { type: mongoose.Schema.Types.ObjectId, ref: "Curso", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },
    visibleParaRoles: {
      type: [String],
      enum: ROLES_VISIBLES,
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Evento", EventoSchema);
