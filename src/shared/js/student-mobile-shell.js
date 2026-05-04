export function escapeStudentShellHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function buildStudentBottomNavIcon(type, extraClass = "") {
    const base = `class="h-full w-full ${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"`;

    if (type === "home") {
        return `
            <svg ${base}>
                <path d="M3 10.5 12 3l9 7.5"></path>
                <path d="M5.5 9.5V20h13V9.5"></path>
                <path d="M9.5 20v-5h5v5"></path>
            </svg>
        `;
    }

    if (type === "ball") {
        return `
            <svg ${base}>
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 7.2 8.8 9.5 10 13.2h4l1.2-3.7L12 7.2Z"></path>
                <path d="M8.8 9.5 6.3 8.8 4.8 12l1.8 3"></path>
                <path d="M15.2 9.5l2.5-.7 1.5 3.2-1.8 3"></path>
                <path d="M10 13.2 8.2 16.2 12 18.8l3.8-2.6-1.8-3"></path>
            </svg>
        `;
    }

    if (type === "card") {
        return `
            <svg ${base}>
                <rect x="3" y="5" width="18" height="14" rx="2.5"></rect>
                <path d="M3 9h18"></path>
                <circle cx="8" cy="14" r="1"></circle>
                <path d="M11 14h5"></path>
            </svg>
        `;
    }

    if (type === "ticket") {
        return `
            <svg ${base}>
                <path d="M5 8.5A2.5 2.5 0 0 0 5 13.5V16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5a2.5 2.5 0 0 0 0-5V8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v.5Z"></path>
                <path d="M9 8.5v7"></path>
                <path d="M15 8.5v7"></path>
            </svg>
        `;
    }

    if (type === "menu") {
        return `
            <svg ${base}>
                <path d="M5 7h14"></path>
                <path d="M5 12h14"></path>
                <path d="M5 17h14"></path>
            </svg>
        `;
    }

    return "";
}

function getNavItemClass(isActive) {
    return isActive
        ? "bg-slate-100 text-slate-900"
        : "text-slate-700 transition hover:bg-slate-50";
}

export function buildStudentMobileMenu({
    mobileMenuOpen,
    studentFullName,
    studentName,
    studentEmail,
    activeItem = "home",
    isClothingEnabled = false
}) {
    const resolvedStudentName = studentFullName || studentName || "—";

    return `
        <div
            id="mobileMenuWrapper"
            class="md:hidden ${mobileMenuOpen ? "fixed inset-0 z-[80]" : "pointer-events-none fixed inset-0 z-[80]"}"
        >
            <div
                id="mobileMenuOverlay"
                class="absolute inset-0 bg-slate-950/40 transition-opacity duration-200 ${
                    mobileMenuOpen ? "opacity-100" : "opacity-0"
                }"
            ></div>

            <aside
                class="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 ${
                    mobileMenuOpen ? "translate-x-0" : "translate-x-full"
                }"
            >
                <div class="border-b border-slate-200 px-4 py-4">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                Alumno
                            </div>

                            <div class="mt-1 truncate text-sm font-semibold text-slate-900">
                                ${escapeStudentShellHtml(resolvedStudentName)}
                            </div>

                            ${
                                studentEmail
                                    ? `<div class="truncate text-xs text-slate-500">${escapeStudentShellHtml(studentEmail)}</div>`
                                    : ""
                            }
                        </div>

                        <button
                            data-student-shell-close-menu
                            type="button"
                            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                            aria-label="Cerrar menú"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <nav class="space-y-2 px-4 py-4">
                    <a href="/src/pages/student/home/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium ${
                        activeItem === "home" ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                    }">Inicio</a>

                    <a href="/src/pages/student/courses/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium ${
                        activeItem === "courses" ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                    }">Cursos</a>

                    <a href="/src/pages/student/payments/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium ${
                        activeItem === "payments" ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                    }">Pagos</a>

                    <a href="/src/pages/student/documents/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium ${
                        activeItem === "documents" ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                    }">Documentos</a>

                    <a href="/src/pages/student/profile/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium ${
                        activeItem === "profile" ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                    }">Perfil</a>

                    <a href="/src/pages/student/siblings/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium ${
                        activeItem === "siblings" ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                    }">Hermanos</a>
                    ${isClothingEnabled ? `
                        <a href="/src/pages/student/clothing/catalog/index.html" class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium ${
                            activeItem === "clothing" ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                        }">
                            Indumentaria
                        </a>
                    ` : ""}
                </nav>

                <div class="mt-auto border-t border-slate-200 px-4 py-4">
                    <button
                        data-student-shell-logout
                        type="button"
                        class="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>
        </div>
    `;
}

export function buildStudentMobileBottomNav({
    activeItem = "home",
    homeHref = "/src/pages/student/home/index.html",
    profileHref = "/src/pages/student/profile/index.html",
    carnetHref = "javascript:void(0)",
    paymentsHref = "/src/pages/student/payments/index.html"
}) {

    const getNavItemClass = (isActive) =>
        isActive
            ? "bg-slate-100 text-slate-900"
            : "text-slate-700 transition hover:bg-slate-50";

    const icon = (svg) => `
        <span class="flex h-7 w-7 items-center justify-center">
            ${svg}
        </span>
    `;

    const iconHome = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
            <path d="M3 10.5 12 3l9 7.5"></path>
            <path d="M5.5 9.5V20h13V9.5"></path>
            <path d="M9.5 20v-5h5v5"></path>
        </svg>
    `;

    const iconProfile = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"></path>
        </svg>
    `;

    const iconCard = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
            <rect x="3" y="5" width="18" height="14" rx="2.5"></rect>
            <path d="M3 9h18"></path>
            <circle cx="8" cy="14" r="1"></circle>
            <path d="M11 14h5"></path>
        </svg>
    `;

    const iconTicket = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
            <path d="M5 8.5A2.5 2.5 0 0 0 5 13.5V16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5a2.5 2.5 0 0 0 0-5V8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v.5Z"></path>
        </svg>
    `;

    const iconMenu = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
            <path d="M5 7h14"></path>
            <path d="M5 12h14"></path>
            <path d="M5 17h14"></path>
        </svg>
    `;

    return `
        <div class="fixed inset-x-0 bottom-0 z-[60] px-4 pb-[calc(env(safe-area-inset-bottom)+22px)] md:hidden pointer-events-none">

            <nav class="pointer-events-auto mx-auto w-full max-w-md rounded-[30px] border border-slate-200 bg-white px-3 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">

                <div class="grid grid-cols-5 items-end gap-1">

                    <!-- inicio -->
                    <a
                        href="${homeHref}"
                        class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 ${getNavItemClass(activeItem === "home")}"
                    >
                        ${icon(iconHome)}
                        <span class="text-[11px] font-medium">Inicio</span>
                    </a>

                    <!-- perfil -->
                    <a
                        href="${profileHref}"
                        class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 ${getNavItemClass(activeItem === "profile")}"
                    >
                        ${icon(iconProfile)}
                        <span class="text-[11px] font-medium">Perfil</span>
                    </a>

                    <!-- carnet -->
                    <button
                        data-student-shell-open-carnet
                        type="button"
                        class="flex flex-col items-center justify-center"
                    >
                        <span class="-mt-10 flex h-[78px] w-[78px] items-center justify-center rounded-full border-4 border-white bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.24)]">
                            <span class="h-9 w-9">
                                ${iconCard}
                            </span>
                        </span>

                        <span class="mt-1 text-[11px] font-semibold text-slate-900">
                            Carnet
                        </span>
                    </button>

                    <!-- pagos -->
                    <a
                        href="${paymentsHref}"
                        class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 ${getNavItemClass(activeItem === "payments")}"
                    >
                        ${icon(iconTicket)}
                        <span class="text-[11px] font-medium">Pago</span>
                    </a>

                    <!-- menu -->
                    <button
                        data-student-shell-open-menu
                        type="button"
                        class="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 ${getNavItemClass(activeItem === "menu")}"
                    >
                        ${icon(iconMenu)}
                        <span class="text-[11px] font-medium">Menú</span>
                    </button>

                </div>

            </nav>

        </div>
    `;
}

export function bindStudentMobileShellEvents({
    setMobileMenuOpen,
    onLogout,
    onOpenCarnet
}) {
    const openMenu = () => {
        if (typeof setMobileMenuOpen === "function") {
            setMobileMenuOpen(true);
        }
    };

    const closeMenu = () => {
        if (typeof setMobileMenuOpen === "function") {
            setMobileMenuOpen(false);
        }
    };

    document.querySelectorAll("[data-student-shell-open-menu]").forEach(btn => {
        btn.addEventListener("click", openMenu);
    });

    document.querySelectorAll("[data-student-shell-close-menu]").forEach(btn => {
        btn.addEventListener("click", closeMenu);
    });

    document.getElementById("mobileMenuOverlay")?.addEventListener("click", closeMenu);

    document.querySelectorAll("[data-student-shell-logout]").forEach(btn => {
        btn.addEventListener("click", () => {
            if (typeof onLogout === "function") {
                onLogout();
            }
        });
    });


document.querySelectorAll("[data-student-shell-open-carnet]").forEach(btn => {
    btn.addEventListener("click", () => {
        if (typeof onOpenCarnet === "function") {
            onOpenCarnet();
        }
    });
});
}

export function syncStudentMobileShellScrollLock({ mobileMenuOpen, extraLocked = false }) {
    const shouldLock = !!mobileMenuOpen || !!extraLocked;
    document.body.classList.toggle("overflow-hidden", shouldLock);
    document.documentElement.classList.toggle("overflow-hidden", shouldLock);
}

export function enableStudentSoftNavigation() {
    if (window.__studentSoftNavigationEnabled) return;
    window.__studentSoftNavigationEnabled = true;

    document.addEventListener("click", async (e) => {
        const link = e.target.closest("a[href]");
        if (!link) return;

        const url = link.getAttribute("href");

        if (!url || !url.startsWith("/src/pages/student")) return;
        if (url.includes("javascript:void")) return;

        e.preventDefault();

        try {
            document.body.classList.remove("overflow-hidden");
            document.documentElement.classList.remove("overflow-hidden");

            const response = await fetch(url, { cache: "no-store" });
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const currentApp = document.querySelector("#app");
            const script = doc.querySelector("script[type='module']");

            if (!currentApp || !script?.src) {
                window.location.href = url;
                return;
            }

            currentApp.innerHTML = `
                <div class="min-h-screen bg-slate-100">
                    <div class="px-4 py-6">
                        <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div class="text-sm text-slate-500">Cargando...</div>
                        </div>
                    </div>
                </div>
            `;

            window.history.pushState({}, "", url);

            const newScript = document.createElement("script");
            newScript.type = "module";
            newScript.src = `${script.src}?soft=${Date.now()}`;

            document.body.appendChild(newScript);
        } catch (error) {
            console.error("Soft navigation failed:", error);
            window.location.href = url;
        }
    });
}