const mongoose = require("mongoose");

const MateriaAnioSchema = new mongoose.Schema(
  {
    materia: { type: String, required: true, trim: true },
    anioId: { type: mongoose.Schema.Types.ObjectId, ref: "Anio", required: true, index: true },
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
    docenteId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true, index: true },
    activo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

MateriaAnioSchema.index({ materia: 1, anioId: 1, cicloLectivo: 1, docenteId: 1 }, { unique: true });

module.exports = mongoose.model("MateriaAnio", MateriaAnioSchema);
