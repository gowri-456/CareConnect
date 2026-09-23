export function normalizeRole(role) {
  return role === "manager" ? "ops_manager" : role;
}

export function hasRole(userRole, roles) {
  if (!roles) return true;
  return roles.includes(normalizeRole(userRole));
}

export function roleLabel(role) {
  const labels = {
    admin: "Admin",
    ops_manager: "Operations manager",
    manager: "Operations manager",
    customer: "Customer",
    provider: "Service provider",
    support_agent: "Support agent",
  };
  return labels[role] || role?.replaceAll("_", " ") || "";
}
