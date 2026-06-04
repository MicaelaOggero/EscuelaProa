const Usuario = require("../models/Usuario");
const bcrypt = require("bcryptjs");

exports.me = async (req, res, next) => {
  try {
    const user = await Usuario.findById(req.user.id).select(
      "nombre apellido fechaNacimiento email role roles createdAt"
    ).populate("anioId", "numero nombre division turno");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const users = await Usuario.find()
      .select("nombre apellido fechaNacimiento email role roles createdAt")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { nombre, apellido, fechaNacimiento, email, password } = req.body;
    var roles = req.body.roles;
    var role = req.body.role;

    if (!nombre || !email || !password || (!roles && !role)) {
      return res.status(400).json({ message: "nombre, email, password y roles/role son requeridos" });
    }

    var allowed = ["superadmin", "directivo", "docente", "comunidad-estudiantes"];
    if (!Array.isArray(roles)) roles = role ? [role] : [];
    roles = roles.map((r) => String(r).trim()).filter(Boolean);
    var invalid = roles.find(function (r) {
      return allowed.indexOf(r) === -1;
    });
    if (invalid) return res.status(400).json({ message: "Rol invalido" });
    if (!roles.length) return res.status(400).json({ message: "Debe incluir al menos un rol" });

    const existing = await Usuario.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Usuario.create({ nombre, apellido, fechaNacimiento, email, passwordHash, roles });
    res.status(201).json({
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      fechaNacimiento: user.fechaNacimiento,
      email: user.email,
      roles: user.roles,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    next(err);
  }
};

function normalizeRoles(input) {
  if (Array.isArray(input)) return input.map((r) => String(r).trim()).filter(Boolean);
  if (typeof input === "string" && input.trim()) return [input.trim()];
  return [];
}

function isStaffRoles(roles) {
  return roles.indexOf("directivo") !== -1 || roles.indexOf("docente") !== -1;
}

function isSuperadmin(reqUser) {
  return reqUser && Array.isArray(reqUser.roles) && reqUser.roles.indexOf("superadmin") !== -1;
}

function isDirectivo(reqUser) {
  return reqUser && Array.isArray(reqUser.roles) && reqUser.roles.indexOf("directivo") !== -1;
}

exports.createStaff = async (req, res, next) => {
  try {
    const { nombre, apellido, fechaNacimiento, email, password } = req.body;
    var roles = normalizeRoles(req.body.roles || req.body.role);
    if (!nombre || !email || !password || !roles.length) {
      return res.status(400).json({ message: "nombre, email, password y roles/role son requeridos" });
    }

    roles = Array.from(new Set(roles));

    var invalid = roles.find(function (r) {
      return r !== "directivo" && r !== "docente";
    });
    if (invalid) return res.status(400).json({ message: "Solo se permite roles directivo/docente" });

    // Permission: directivo can only create docentes (not directivos)
    if (isDirectivo(req.user) && !isSuperadmin(req.user)) {
      if (roles.indexOf("directivo") !== -1) {
        return res.status(403).json({ message: "Directivo no puede crear directivos" });
      }
      if (roles.indexOf("docente") === -1) {
        return res.status(400).json({ message: "Debe incluir rol docente" });
      }
    }

    if (!isStaffRoles(roles)) return res.status(400).json({ message: "Debe incluir directivo y/o docente" });

    const existing = await Usuario.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Usuario.create({ nombre, apellido, fechaNacimiento, email, passwordHash, roles });
    res.status(201).json({
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      fechaNacimiento: user.fechaNacimiento,
      email: user.email,
      roles: user.roles,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    next(err);
  }
};

exports.listStaff = async (req, res, next) => {
  try {
    const role = req.query.role;
    const filter = {};

    if (role) {
      if (role !== "directivo" && role !== "docente") return res.status(400).json({ message: "Filtro role invalido" });
      filter.roles = role;
    } else {
      filter.roles = { $in: ["directivo", "docente"] };
    }

    const users = await Usuario.find(filter)
      .select("nombre apellido fechaNacimiento email role roles createdAt")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, fechaNacimiento, email, password, role } = req.body;
    var roles = normalizeRoles(req.body.roles || role);

    const user = await Usuario.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    var currentRoles = user.roles && user.roles.length ? user.roles : user.role ? [user.role] : [];
    if (!isStaffRoles(currentRoles)) return res.status(400).json({ message: "Solo se puede editar directivos y docentes" });

    if (roles.length) {
      roles = Array.from(new Set(roles));
      var invalid = roles.find(function (r) {
        return r !== "directivo" && r !== "docente";
      });
      if (invalid) return res.status(400).json({ message: "Solo se permite roles directivo/docente" });

      // directivo cannot grant/revoke directivo role or touch superadmins
      if (isDirectivo(req.user) && !isSuperadmin(req.user)) {
        if (currentRoles.indexOf("directivo") !== -1) {
          return res.status(403).json({ message: "Directivo no puede editar a directivos" });
        }
        if (roles.indexOf("directivo") !== -1) {
          return res.status(403).json({ message: "Directivo no puede asignar rol directivo" });
        }
        if (roles.indexOf("docente") === -1) {
          return res.status(400).json({ message: "Un docente debe mantener rol docente" });
        }
      }
    }

    if (typeof nombre === "string" && nombre.trim()) user.nombre = nombre.trim();
    if (typeof apellido === "string") user.apellido = apellido.trim();
    if (typeof fechaNacimiento !== "undefined") user.fechaNacimiento = fechaNacimiento;
    if (typeof email === "string" && email.trim()) user.email = email.trim().toLowerCase();
    if (roles.length) user.roles = roles;
    if (typeof password === "string" && password) user.passwordHash = await bcrypt.hash(password, 10);

    await user.save();
    res.json({
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      fechaNacimiento: user.fechaNacimiento,
      email: user.email,
      roles: user.roles,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    // Duplicate key error for email
    if (err && err.code === 11000) return res.status(409).json({ message: "Email already in use" });
    next(err);
  }
};

exports.deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await Usuario.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    var roles = user.roles && user.roles.length ? user.roles : user.role ? [user.role] : [];
    if (!isStaffRoles(roles)) return res.status(400).json({ message: "Solo se puede eliminar directivos y docentes" });

    if (isDirectivo(req.user) && !isSuperadmin(req.user)) {
      if (roles.indexOf("directivo") !== -1) {
        return res.status(403).json({ message: "Directivo no puede eliminar directivos" });
      }
    }

    await Usuario.deleteOne({ _id: id });
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};
