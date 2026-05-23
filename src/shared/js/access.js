import {
  setActiveCompanySlug,
  setActiveRole,
  setActiveContext
} from "./storage.js";

export function switchAccess(access) {
  if (!access) return;

  const companySlug =
    access.companySlug ||
    access.slug;

  const role =
    access.role ||
    access.activeRole;

  if (!companySlug || !role) {
    throw new Error("Acceso inválido.");
  }

  setActiveCompanySlug(companySlug);
  setActiveRole(role);

  setActiveContext({
    companySlug,
    role
  });

  if (role === "Admin") {
    window.location.replace("/src/pages/admin/dashboard/index.html");
    return;
  }

  if (role === "Student") {
    window.location.replace("/src/pages/student/home/index.html");
    return;
  }

  window.location.replace("/index.html");
}