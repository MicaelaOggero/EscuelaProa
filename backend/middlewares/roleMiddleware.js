module.exports = function roleMiddleware() {
  var requiredRoles = Array.prototype.slice.call(arguments);
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!requiredRoles.length) return next();
    if (requiredRoles.indexOf(req.user.role) === -1) return res.status(403).json({ message: "Forbidden" });
    next();
  };
};
