const mongoose = require("mongoose");

const MateriaAnioSchema = new mongoose.Schema(
  {
    materia: { type: String, required: true, trim: true },
    anioId: { type: mongoose.Schema.Types.ObjectId, ref: "Anio", required: true, index: true },
    docenteId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true, index: true },
    activo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

MateriaAnioSchema.index({ materia: 1, anioId: 1, docenteId: 1 }, { unique: true });

module.exports = mongoose.model("MateriaAnio", MateriaAnioSchema);
