const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  var roles = user.roles && user.roles.length ? user.roles : user.role ? [user.role] : [];
  return jwt.sign({ id: user._id, roles: roles }, secret, { expiresIn });
}

function toUserResponse(user) {
  var roles = user.roles && user.roles.length ? user.roles : user.role ? [user.role] : [];
  return {
    id: user._id,
    nombre: user.nombre,
    apellido: user.apellido,
    fechaNacimiento: user.fechaNacimiento,
    email: user.email,
    roles: roles,
    role: roles[0] || user.role
  };
}

exports.register = async (req, res, next) => {
  try {
    const { nombre, apellido, fechaNacimiento, email, password } = req.body;
    const existing = await Usuario.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    // Registro publico: por defecto se crea como comunidad-estudiantes.
    const user = await Usuario.create({
      nombre,
      apellido,
      fechaNacimiento,
      email,
      passwordHash,
      roles: ["comunidad-estudiantes"]
    });
    const token = signToken(user);

    res.status(201).json({ token, user: toUserResponse(user) });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await Usuario.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);
    res.json({ token, user: toUserResponse(user) });
  } catch (err) {
    next(err);
  }
};

exports.loginStaff = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await Usuario.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    var roles = user.roles && user.roles.length ? user.roles : user.role ? [user.role] : [];
    const isStaff = roles.indexOf("superadmin") !== -1 || roles.indexOf("directivo") !== -1 || roles.indexOf("docente") !== -1;
    if (!isStaff) return res.status(403).json({ message: "Staff only" });

    const token = signToken(user);
    res.json({ token, user: toUserResponse(user) });
  } catch (err) {
    next(err);
  }
};

exports.bootstrapSuperadmin = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({ message: "Bootstrap disabled" });
    }

    const expected = process.env.BOOTSTRAP_TOKEN;
    if (!expected) return res.status(500).json({ message: "BOOTSTRAP_TOKEN not set" });

    const provided = req.headers["x-bootstrap-token"] || req.body.token;
    if (!provided || String(provided) !== String(expected)) {
      return res.status(401).json({ message: "Invalid bootstrap token" });
    }

    const exists = await Usuario.findOne({ role: "superadmin" }).select("_id");
    if (exists) {
      return res.status(409).json({ message: "Superadmin already exists" });
    }

    const { nombre, apellido, fechaNacimiento, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ message: "nombre, email y password son requeridos" });
    }

    const existingEmail = await Usuario.findOne({ email });
    if (existingEmail) return res.status(409).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Usuario.create({
      nombre,
      apellido,
      fechaNacimiento,
      email,
      passwordHash,
      roles: ["superadmin"]
    });
    const token = signToken(user);

    res.status(201).json({ message: "Superadmin created", token, user: toUserResponse(user) });
  } catch (err) {
    next(err);
  }
};
