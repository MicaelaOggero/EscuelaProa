const mongoose = require("mongoose");

const MateriaCursoSchema = new mongoose.Schema(
  {
    materia: { type: String, required: true, trim: true },
    cursoId: { type: mongoose.Schema.Types.ObjectId, ref: "Curso", required: true, index: true },
    cicloLectivo: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
      default: function () {
        return new Date().getFullYear();
      },
      index: true
    },
    docenteId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", index: true, default: null },
    activo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

MateriaCursoSchema.index({ materia: 1, cursoId: 1, cicloLectivo: 1 }, { unique: true });

module.exports = mongoose.model("MateriaCurso", MateriaCursoSchema, "materiascurso");
