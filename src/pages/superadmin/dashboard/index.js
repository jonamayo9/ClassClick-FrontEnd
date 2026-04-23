import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth, logoutAndRedirect } from "../../../shared/js/session.js";

const welcomeName = document.getElementById("welcomeName");
const welcomeMeta = document.getElementById("welcomeMeta");
const logoutButton = document.getElementById("logoutButton");
const createCompanyShortcut = document.getElementById("createCompanyShortcut");
const createAdminShortcut = document.getElementById("createAdminShortcut");

async function init() {
  await loadConfig();

  const session = requireAuth();
  if (!session) return;

  const { user } = session;

  if (!user?.isSuperAdmin) {
    window.location.href = "/src/pages/admin/dashboard/index.html";
    return;
  }

  welcomeName.textContent =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "SuperAdmin";

  welcomeMeta.textContent = "SuperAdmin global";

  logoutButton.addEventListener("click", logoutAndRedirect);

  createCompanyShortcut.addEventListener("click", () => {
    window.location.href = "/src/pages/superadmin/companies/index.html";
  });

  createAdminShortcut.addEventListener("click", () => {
    window.location.href = "/src/pages/superadmin/admins/index.html";
  });
}

init().catch(() => {
  //window.location.href = "/src/pages/auth/login.html";
  throw new Error("se encontraron errores en dashboard");
});