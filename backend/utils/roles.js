function normalizeRoles(input) {
  var roles = Array.isArray(input) ? input : input ? [input] : [];

  roles = roles
    .map(function (role) {
      var value = String(role || "").trim();
      if (value === "comunidad-estudiantes") return "estudiante";
      return value;
    })
    .filter(Boolean);

  return Array.from(new Set(roles));
}

function primaryRole(input) {
  var roles = normalizeRoles(input);
  return roles[0];
}

module.exports = {
  normalizeRoles,
  primaryRole
};
