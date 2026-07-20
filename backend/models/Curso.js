const mongoose = require("mongoose");

const CursoSchema = new mongoose.Schema(
  {
    numero: { type: Number, required: true, min: 1 },
    nombre: { type: String, required: true, trim: true },
    division: { type: String, default: "", trim: true },
    turno: { type: String, default: "", trim: true },
    activo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

CursoSchema.index({ numero: 1, division: 1, turno: 1 }, { unique: true });

module.exports = mongoose.model("Curso", CursoSchema, "cursos");
