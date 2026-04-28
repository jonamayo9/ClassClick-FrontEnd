import { logout } from "./auth.js";
import {
  resolveActiveAdminCompany,
  changeActiveAdminCompany
} from "./admin-company.js";

function getInitials(name) {
  if (!name) return "CC";

  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getMenu(activeKey) {
  const items = [
    { key: "dashboard", label: "Dashboard", href: "/src/pages/admin/dashboard/index.html", enabled: true },
    { key: "students", label: "Alumnos", href: "/src/pages/admin/students/index.html", enabled: true },
    { key: "records", label: "Legajos", href: "/src/pages/admin/records/index.html", enabled: true },
    { key: "teachers", label: "Profesores", href: "/src/pages/admin/teachers/index.html", enabled: true },
    { key: "courses", label: "Cursos", href: "/src/pages/admin/courses/index.html", enabled: true },
    { key: "monthly-charges", label: "Cuotas", href: "/src/pages/admin/monthly-charges/index.html", enabled: true },
    { key: "payments", label: "Pagos", href: "/src/pages/admin/payments/index.html", enabled: true },
    { key: "siblings", label: "Hermanos", href: "/src/pages/admin/siblings/index.html", enabled: true },
    { key: "pricing", label: "Configuración de pagos", href: "/src/pages/admin/pricing/index.html", enabled: true },
    { key: "matches", label: "Partidos", href: "/src/pages/admin/matches/index.html", enabled: true },
    { key: "announcements", label: "Novedades", href: "/src/pages/admin/announcements/index.html", enabled: true },
    { key: "sponsors", label: "Sponsors", href: "/src/pages/admin/sponsors/index.html", enabled: true },
    { key: "company-settings", label: "Mi empresa", href: "/src/pages/admin/company-settings/index.html", enabled: true },
    { key: "profile", label: "Mi perfil", href: "/src/pages/admin/profile/index.html", enabled: true }
  ];

  return items
    .filter(item => item.enabled)
    .map(item => {
      const activeClass = item.key === activeKey
        ? "bg-orange-50 text-orange-600 border border-orange-100 shadow-sm"
        : "text-slate-700 hover:bg-slate-50 border border-transparent";

      return `
        <a
          href="${item.href}"
          class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${activeClass}"
        >
          ${item.label}
        </a>
      `;
    })
    .join("");
}

function buildBrand(company) {
  const companyName = company?.name || "Empresa";
  const companySlug = company?.slug || "";
  const logoUrl = company?.logoUrl || "";
  const initials = getInitials(companyName);

  return `
    <div class="flex items-center gap-3 min-w-0">
      ${
        logoUrl
          ? `
            <img
              src="${logoUrl}"
              alt="${companyName}"
              class="h-11 w-11 rounded-2xl border border-slate-200 bg-white object-cover shadow-sm"
            />
          `
          : `
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-sm">
              ${initials}
            </div>
          `
      }

      <div class="min-w-0">
        <h1 class="truncate text-base font-bold text-slate-900 sm:text-lg">
          ${companyName}
        </h1>
        <p class="truncate text-xs text-slate-500">
          ${companySlug || "Panel administrativo"}
        </p>
      </div>
    </div>
  `;
}

export function renderAdminLayout({
  activeKey,
  pageTitle,
  contentHtml
}) {
  return `
    <div class="min-h-screen bg-slate-100 text-slate-900">
      <div class="flex min-h-screen">
        <aside
          id="adminSidebar"
          class="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col"
        >
          <div id="adminSidebarBrand" class="border-b border-slate-200 px-5 py-5">
            ${buildBrand(null)}
          </div>

          <nav class="flex-1 space-y-2 px-3 py-4">
            ${getMenu(activeKey)}
          </nav>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
          <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div class="flex items-start justify-between gap-3 lg:hidden">
                <button
                  id="adminMobileMenuButton"
                  type="button"
                  class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-700 shadow-sm"
                >
                  ☰
                </button>

                <div id="adminMobileBrand" class="min-w-0 flex-1">
                  ${buildBrand(null)}
                </div>
              </div>

              <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div class="min-w-0">
                  <h2 class="text-2xl font-bold text-slate-900">${pageTitle}</h2>
                  <p id="adminActiveCompanyText" class="mt-1 text-sm text-slate-500">
                    Cargando empresa...
                  </p>
                </div>

                <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div class="min-w-[260px]">
                    <label
                      for="adminCompanySelector"
                      class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                    >
                      Empresa activa
                    </label>

                    <select
                      id="adminCompanySelector"
                      class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500"
                    >
                      <option value="">Cargando empresas...</option>
                    </select>
                  </div>

                  <button
                    id="logoutButton"
                    class="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    type="button"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
            ${contentHtml}
          </main>
        </div>
      </div>

      <div
        id="adminMobileOverlay"
        class="fixed inset-0 z-40 hidden bg-slate-900/40 lg:hidden"
      ></div>

      <aside
        id="adminMobileDrawer"
        class="fixed inset-y-0 left-0 z-50 hidden w-[88%] max-w-[320px] flex-col border-r border-slate-200 bg-white shadow-2xl lg:hidden"
      >
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-5">
          <div id="adminMobileDrawerBrand" class="min-w-0 flex-1">
            ${buildBrand(null)}
          </div>

          <button
            id="adminMobileCloseButton"
            type="button"
            class="ml-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-700"
          >
            ✕
          </button>
        </div>

        <nav class="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          ${getMenu(activeKey)}
        </nav>
      </aside>
    </div>
  `;
}

function fillBrand(containerId, company) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = buildBrand(company);
}

function openMobileMenu() {
  const drawer = document.getElementById("adminMobileDrawer");
  const overlay = document.getElementById("adminMobileOverlay");

  drawer?.classList.remove("hidden");
  drawer?.classList.add("flex");

  overlay?.classList.remove("hidden");
}

function closeMobileMenu() {
  const drawer = document.getElementById("adminMobileDrawer");
  const overlay = document.getElementById("adminMobileOverlay");

  drawer?.classList.add("hidden");
  drawer?.classList.remove("flex");

  overlay?.classList.add("hidden");
}

function setupMobileMenu() {
  const openBtn = document.getElementById("adminMobileMenuButton");
  const closeBtn = document.getElementById("adminMobileCloseButton");
  const overlay = document.getElementById("adminMobileOverlay");

  openBtn?.addEventListener("click", openMobileMenu);
  closeBtn?.addEventListener("click", closeMobileMenu);
  overlay?.addEventListener("click", closeMobileMenu);
}

export async function setupAdminLayout({
  onCompanyChanged
} = {}) {
  const logoutButton = document.getElementById("logoutButton");
  const selector = document.getElementById("adminCompanySelector");
  const activeCompanyText = document.getElementById("adminActiveCompanyText");

  setupMobileMenu();

  if (logoutButton) {
logoutButton.addEventListener("click", async () => {
  await logout();
  window.location.replace("/index.html");
});
  }

  const { companies, activeCompany } = await resolveActiveAdminCompany();

  if (selector) {
    if (!companies.length) {
      selector.innerHTML = `<option value="">Sin empresas</option>`;
      selector.disabled = true;
    } else {
      selector.innerHTML = companies
        .map(company => `
          <option value="${company.slug}" ${company.slug === activeCompany?.slug ? "selected" : ""}>
            ${company.name}
          </option>
        `)
        .join("");

      selector.disabled = false;

      selector.addEventListener("change", async (event) => {
        const nextSlug = event.target.value;
        const selected = changeActiveAdminCompany(companies, nextSlug);

        if (!selected) return;

        fillBrand("adminSidebarBrand", selected);
        fillBrand("adminMobileBrand", selected);
        fillBrand("adminMobileDrawerBrand", selected);

        if (activeCompanyText) {
          activeCompanyText.textContent = `${selected.name} · ${selected.slug}`;
        }

        if (typeof onCompanyChanged === "function") {
          await onCompanyChanged(selected);
        } else {
          window.location.reload();
        }

        closeMobileMenu();
      });
    }
  }

  fillBrand("adminSidebarBrand", activeCompany);
  fillBrand("adminMobileBrand", activeCompany);
  fillBrand("adminMobileDrawerBrand", activeCompany);

  if (activeCompanyText) {
    activeCompanyText.textContent = activeCompany
      ? `${activeCompany.name} · ${activeCompany.slug}`
      : "Sin empresa activa";
  }

  return {
    companies,
    activeCompany
  };
}