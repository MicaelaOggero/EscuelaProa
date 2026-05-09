const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, default: "", trim: true },
    fechaNacimiento: { type: Date },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["superadmin", "directivo", "docente", "comunidad-estudiantes"],
      default: "comunidad-estudiantes"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Usuario", UsuarioSchema);
