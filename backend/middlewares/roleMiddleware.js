module.exports = function roleMiddleware() {
  var requiredRoles = Array.prototype.slice.call(arguments);
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    var roles = req.user.roles || [];
    if (roles.indexOf("superadmin") !== -1) return next();
    if (!requiredRoles.length) return next();
    var ok = requiredRoles.some(function (r) {
      return roles.indexOf(r) !== -1;
    });
    if (!ok) return res.status(403).json({ message: "Forbidden" });
    next();
  };
};
