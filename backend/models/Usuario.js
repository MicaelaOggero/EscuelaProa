const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, default: "", trim: true },
    fechaNacimiento: { type: Date },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Legacy single role (kept for backwards compatibility with existing docs)
    role: { type: String, default: undefined },
    // New multi-role support
    roles: {
      type: [String],
      enum: ["superadmin", "directivo", "docente", "comunidad-estudiantes"],
      default: ["comunidad-estudiantes"]
    }
  },
  { timestamps: true }
);

UsuarioSchema.pre("save", function (next) {
  // If an old document uses `role`, migrate it to `roles`.
  // Important: avoid overwriting an explicitly provided `role` with the default roles.
  var hasRoles = Array.isArray(this.roles) && this.roles.length > 0;
  var hasRole = typeof this.role === "string" && this.role.trim().length > 0;

  if (hasRole) {
    var r = this.role.trim();
    // If roles is missing/empty OR still at default ["comunidad-estudiantes"], trust `role`.
    if (!hasRoles || (this.roles.length === 1 && this.roles[0] === "comunidad-estudiantes" && r !== "comunidad-estudiantes")) {
      this.roles = [r];
      hasRoles = true;
    }
  }

  // Keep `role` as a mirror of the primary role.
  if (hasRoles) {
    this.role = this.roles[0];
  }
  next();
});

module.exports = mongoose.model("Usuario", UsuarioSchema);
