import { getStoredActiveAdminCompany } from "./admin-company.js";
import { hasModule } from "./modules.js";
import { getSession } from "./session.js";

const ADMIN_FALLBACK_URL = "/src/pages/admin/students/index.html";
const STUDENT_FALLBACK_URL = "/src/pages/student/home/index.html";

export function ensureAdminModule(moduleCode) {
  const company = getStoredActiveAdminCompany();

  if (!company) {
    window.location.replace(ADMIN_FALLBACK_URL);
    return false;
  }

  if (!hasModule(company, moduleCode)) {
    if (window.location.pathname !== ADMIN_FALLBACK_URL) {
      window.location.replace(ADMIN_FALLBACK_URL);
    }

    return false;
  }

  return true;
}

export function ensureStudentModule(moduleCode) {
  const session = getSession();
  const company = session?.company;

  if (!company) {
    window.location.replace("/index.html");
    return false;
  }

  if (!hasModule(company, moduleCode)) {
    if (window.location.pathname !== STUDENT_FALLBACK_URL) {
      window.location.replace(STUDENT_FALLBACK_URL);
    }

    return false;
  }

  return true;
}