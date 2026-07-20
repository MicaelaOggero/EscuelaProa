const mongoose = require("mongoose");
const { normalizeRoles, primaryRole } = require("../utils/roles");

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, default: "", trim: true },
    fechaNacimiento: { type: Date },
    dni: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Legacy single role (kept for backwards compatibility with existing docs)
    role: { type: String, default: undefined },
    // New multi-role support
    roles: {
      type: [String],
      enum: ["superadmin", "directivo", "docente", "estudiante"],
      default: ["estudiante"]
    }
    ,
    // Estudiante: curso actual (opcional)
    cursoId: { type: mongoose.Schema.Types.ObjectId, ref: "Curso" },
    division: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

UsuarioSchema.pre("save", function (next) {
  // If an old document uses `role`, migrate it to `roles`.
  // Important: avoid overwriting an explicitly provided `role` with the default roles.
  var normalizedRoles = normalizeRoles(this.roles);
  var hasRoles = normalizedRoles.length > 0;
  var hasRole = typeof this.role === "string" && this.role.trim().length > 0;

  if (hasRole) {
    var r = primaryRole(this.role.trim());
    // If roles is missing/empty OR still at default ["estudiante"], trust `role`.
    if (!hasRoles || (normalizedRoles.length === 1 && normalizedRoles[0] === "estudiante" && r !== "estudiante")) {
      normalizedRoles = r ? [r] : [];
      hasRoles = true;
    }
  }

  // Keep `role` as a mirror of the primary role.
  if (hasRoles) {
    this.roles = normalizedRoles;
    this.role = primaryRole(normalizedRoles);
  }
  next();
});

module.exports = mongoose.model("Usuario", UsuarioSchema);
