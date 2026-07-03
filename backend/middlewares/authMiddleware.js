const jwt = require("jsonwebtoken");
const { normalizeRoles } = require("../utils/roles");

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ message: "JWT_SECRET not set" });
    const payload = jwt.verify(token, secret);
    var roles = normalizeRoles(payload.roles);
    if (!roles.length) roles = normalizeRoles(payload.role);
    req.user = { id: payload.id, roles: roles };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
