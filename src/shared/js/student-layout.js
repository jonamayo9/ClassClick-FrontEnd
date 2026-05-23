import { logoutAndRedirect } from "./session.js";
import { getMe } from "./storage.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitials(text) {
  const parts = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "";

  return parts
    .map(x => x.charAt(0).toUpperCase())
    .join("");
}

function navLink(label, href, active = false) {
  return `
    <a
      href="${href}"
      class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
        active
        ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950"
        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      }"
    >
      ${escapeHtml(label)}
    </a>
  `;
}

function getAvailableAccesses() {
  const me = getMe();

  if (!me?.companies?.length) {
    return [];
  }

  return me.companies.filter(x =>
    x.companySlug &&
    x.role
  );
}

function shouldShowAccessSelector() {
  const accesses = getAvailableAccesses();

  const uniqueAccesses = accesses.map(x =>
    `${x.companySlug}::${x.role}`
  );

  return new Set(uniqueAccesses).size > 1;
}

function buildAccessOptions(companySlug) {
  const accesses = getAvailableAccesses();

  const activeRole =
    localStorage.getItem("classclick_active_role");

  return accesses.map(access => {
    const value =
      `${access.companySlug}::${access.role}`;

    const selected =
      access.companySlug === companySlug &&
      access.role === activeRole;

    return `
      <option value="${value}" ${selected ? "selected" : ""}>
        ${
          access.companyName ||
          access.name ||
          access.companySlug
        } — ${access.role}
      </option>
    `;
  }).join("");
}

function buildCompanyLogo(company) {
  const logoUrl =
    company?.logoUrl ||
    company?.LogoUrl ||
    "";

  const companyName =
    company?.companyName ||
    company?.name ||
    "";

  const initials =
    getInitials(companyName);

  if (!logoUrl) {
    return `
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 shadow-sm">
        ${escapeHtml(initials || "—")}
      </div>
    `;
  }

  return `
    <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <img
        src="${escapeHtml(logoUrl)}"
        alt="Logo empresa"
        class="block h-full w-full object-cover"
      />
    </div>
  `;
}

export function bindStudentLayoutEvents() {
  document
    .querySelectorAll("#logoutBtn")
    .forEach(btn => {
      btn.addEventListener("click", () => {
        logoutAndRedirect();
      });
    });

  const selector =
    document.getElementById(
      "studentAccessSelector"
    );

  if (selector) {
    selector.addEventListener("change", event => {
      const [nextSlug, nextRole] =
        event.target.value.split("::");

      localStorage.setItem(
        "classclick_active_company_slug",
        nextSlug
      );

      localStorage.setItem(
        "classclick_active_role",
        nextRole
      );

      localStorage.setItem(
        "classclick_active_context",
        JSON.stringify({
          companySlug: nextSlug,
          role: nextRole
        })
      );

      if (nextRole === "Admin") {
        window.location.href =
          "/src/pages/admin/dashboard/index.html";

        return;
      }

      window.location.href =
        "/src/pages/student/home/index.html";
    });
  }
}

export function buildStudentSidebar({
  company,
  student,
  activeItem
}) {
  return `
    <aside class="hidden md:flex md:w-[220px] md:flex-col md:border-r md:border-slate-200 md:bg-white dark:md:border-slate-800 dark:md:bg-slate-900">
      <div class="border-b border-slate-200 dark:border-slate-800 px-5 py-5">
        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
          Alumno
        </div>

        <div class="mt-2 truncate text-base font-semibold text-slate-900 dark:text-white">
          ${escapeHtml(student?.fullName || "—")}
        </div>

        ${
          student?.email
            ? `
              <div class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                ${escapeHtml(student.email)}
              </div>
            `
            : ""
        }

        ${
          shouldShowAccessSelector()
            ? `
              <div class="mt-4">
                <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Acceso activo
                </div>

                <select
                  id="studentAccessSelector"
                  class="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none transition focus:border-orange-500"
                >
                  ${buildAccessOptions(company?.companySlug || company?.slug)}
                </select>
              </div>
            `
            : ""
        }
      </div>

      <nav class="flex-1 space-y-2 px-4 py-4">
        ${navLink(
          "Inicio",
          "/src/pages/student/home/index.html",
          activeItem === "home"
        )}

        ${
          company?.modules?.courses !== false
            ? navLink(
                "Cursos",
                "/src/pages/student/courses/index.html",
                activeItem === "courses"
              )
            : ""
        }

        ${
          company?.modules?.payments === true
            ? navLink(
                "Pagos",
                "/src/pages/student/payments/index.html",
                activeItem === "payments"
              )
            : ""
        }

        ${
          company?.modules?.documents === true
            ? navLink(
                "Documentos",
                "/src/pages/student/documents/index.html",
                activeItem === "documents"
              )
            : ""
        }

        ${navLink(
          "Perfil",
          "/src/pages/student/profile/index.html",
          activeItem === "profile"
        )}

        ${
          company?.modules?.siblings !== false
            ? navLink(
                "Hermanos",
                "/src/pages/student/siblings/index.html",
                activeItem === "siblings"
              )
            : ""
        }

        ${
          company?.modules?.clothing === true
            ? navLink(
                "Indumentaria",
                "/src/pages/student/clothing/catalog/index.html",
                activeItem === "clothing"
              )
            : ""
        }
      </nav>

      <div class="mt-auto border-t border-slate-200 dark:border-slate-800 px-4 py-4">
        <button
          id="logoutBtn"
          type="button"
          class="flex w-full items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  `;
}