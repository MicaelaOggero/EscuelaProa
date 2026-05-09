const Usuario = require("../models/Usuario");
const bcrypt = require("bcryptjs");

exports.me = async (req, res, next) => {
  try {
    const user = await Usuario.findById(req.user.id).select(
      "nombre apellido fechaNacimiento email role createdAt"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const users = await Usuario.find()
      .select("nombre apellido fechaNacimiento email role createdAt")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { nombre, apellido, fechaNacimiento, email, password, role } = req.body;
    if (!nombre || !email || !password || !role) {
      return res.status(400).json({ message: "nombre, email, password y role son requeridos" });
    }

    var allowed = ["superadmin", "directivo", "docente", "comunidad-estudiantes"];
    if (allowed.indexOf(role) === -1) {
      return res.status(400).json({ message: "Rol invalido" });
    }

    const existing = await Usuario.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Usuario.create({ nombre, apellido, fechaNacimiento, email, passwordHash, role });
    res.status(201).json({
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      fechaNacimiento: user.fechaNacimiento,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    next(err);
  }
};

function isStaffRole(role) {
  return role === "directivo" || role === "docente";
}

exports.createStaff = async (req, res, next) => {
  try {
    const { nombre, apellido, fechaNacimiento, email, password, role } = req.body;
    if (!nombre || !email || !password || !role) {
      return res.status(400).json({ message: "nombre, email, password y role son requeridos" });
    }
    if (!isStaffRole(role)) {
      return res.status(400).json({ message: "Solo se permite crear roles directivo o docente" });
    }

    const existing = await Usuario.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Usuario.create({ nombre, apellido, fechaNacimiento, email, passwordHash, role });
    res.status(201).json({
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      fechaNacimiento: user.fechaNacimiento,
      email: user.email,
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
      if (!isStaffRole(role)) return res.status(400).json({ message: "Filtro role invalido" });
      filter.role = role;
    } else {
      filter.role = { $in: ["directivo", "docente"] };
    }

    const users = await Usuario.find(filter)
      .select("nombre apellido fechaNacimiento email role createdAt")
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

    const user = await Usuario.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!isStaffRole(user.role)) return res.status(400).json({ message: "Solo se puede editar directivos y docentes" });

    if (role && !isStaffRole(role)) {
      return res.status(400).json({ message: "Solo se permite role directivo o docente" });
    }

    if (typeof nombre === "string" && nombre.trim()) user.nombre = nombre.trim();
    if (typeof apellido === "string") user.apellido = apellido.trim();
    if (typeof fechaNacimiento !== "undefined") user.fechaNacimiento = fechaNacimiento;
    if (typeof email === "string" && email.trim()) user.email = email.trim().toLowerCase();
    if (role) user.role = role;
    if (typeof password === "string" && password) user.passwordHash = await bcrypt.hash(password, 10);

    await user.save();
    res.json({
      id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      fechaNacimiento: user.fechaNacimiento,
      email: user.email,
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
    if (!isStaffRole(user.role)) return res.status(400).json({ message: "Solo se puede eliminar directivos y docentes" });

    await Usuario.deleteOne({ _id: id });
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};
