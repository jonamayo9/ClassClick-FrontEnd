export function escapeStudentCarnetHtml(value) {
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

    if (!parts.length) return "—";
    return parts.map(x => x.charAt(0).toUpperCase()).join("");
}

function normalizeBoolean(value, fallback = true) {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1") return true;
    if (value === 0 || value === "0") return false;
    return fallback;
}

export function normalizeStudentCarnetData({
    student = null,
    profile = null,
    company = null,
    course = null
} = {}) {
    const source = student || profile || {};
    const companySource = company || {};

    const fullName =
        source?.fullName?.trim() ||
        [source?.firstName, source?.lastName].filter(Boolean).join(" ").trim() ||
        "Alumno";

    const dni =
        source?.dni?.trim() ||
        source?.documentNumber?.trim() ||
        "—";

    const memberNumber =
        source?.memberNumber?.trim() ||
        source?.memberCode?.trim() ||
        source?.legajo?.trim() ||
        "—";

    const companyName =
        companySource?.companyName?.trim() ||
        companySource?.name?.trim() ||
        "Club";

    const companyLogoUrl =
        companySource?.logoUrl?.trim() ||
        "";

    const profileImageUrl =
        source?.profileImageUrl?.trim() ||
        source?.photoUrl?.trim() ||
        "";

    const isActive = normalizeBoolean(
        source?.isActive ?? source?.active ?? source?.enabled,
        true
    );

    const roleLabel =
        source?.systemRole?.toLowerCase?.() === "student"
            ? "Alumno"
            : "Alumno";

    const category =
        course?.name?.trim() ||
        source?.courseName?.trim() ||
        source?.categoryName?.trim() ||
        "";

    return {
        fullName,
        dni,
        memberNumber,
        companyName,
        companyLogoUrl,
        profileImageUrl,
        isActive,
        roleLabel,
        category
    };
}

function buildCompanyLogo(logoUrl, companyName) {
    const initials = getInitials(companyName);

    if (!logoUrl) {
        return `
            <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm">
                ${escapeStudentCarnetHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <img
                src="${escapeStudentCarnetHtml(logoUrl)}"
                alt="Logo club"
                class="block h-full w-full object-cover"
                onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center text-sm font-bold text-slate-700&quot;>${escapeStudentCarnetHtml(initials)}</div>';"
            />
        </div>
    `;
}

function buildProfileAvatar(imageUrl, fullName) {
    const initials = getInitials(fullName);

    if (!imageUrl) {
        return `
            <div class="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 text-2xl font-bold text-slate-700 shadow-md">
                ${escapeStudentCarnetHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md">
            <img
                src="${escapeStudentCarnetHtml(imageUrl)}"
                alt="Foto alumno"
                class="block h-full w-full object-cover"
                onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center bg-slate-100 text-2xl font-bold text-slate-700&quot;>${escapeStudentCarnetHtml(initials)}</div>';"
            />
        </div>
    `;
}

function buildInfoBox(label, value, extraClasses = "") {
    return `
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 ${extraClasses}">
            <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                ${escapeStudentCarnetHtml(label)}
            </div>
            <div class="mt-1 text-sm font-semibold text-slate-900">
                ${escapeStudentCarnetHtml(value || "—")}
            </div>
        </div>
    `;
}

export function buildStudentCarnetModal({
    open = false,
    student = null,
    profile = null,
    company = null,
    course = null
} = {}) {
    if (!open) return "";

    const data = normalizeStudentCarnetData({ student, profile, company, course });

    return `
        <div id="studentCarnetOverlay" class="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-[2px]">
            <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div class="relative w-full max-w-md overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
                    <div class="absolute right-4 top-4 z-10">
                        <button
                            id="closeStudentCarnetBtn"
                            type="button"
                            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                            aria-label="Cerrar carnet"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="bg-slate-900 px-5 pb-16 pt-5 text-white">
                        <div class="flex items-center gap-3">
                            ${buildCompanyLogo(data.companyLogoUrl, data.companyName)}

                            <div class="min-w-0">
                                <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                                    Carnet digital
                                </div>
                                <div class="mt-1 truncate text-lg font-bold text-white">
                                    ${escapeStudentCarnetHtml(data.companyName)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="relative px-5 pb-5">
                        <div class="-mt-14 flex flex-col items-center">
                            ${buildProfileAvatar(data.profileImageUrl, data.fullName)}

                            <div class="mt-4 text-center">
                                <div class="text-2xl font-bold text-slate-900">
                                    ${escapeStudentCarnetHtml(data.fullName)}
                                </div>

                                <div class="mt-1 text-sm text-slate-500">
                                    DNI: ${escapeStudentCarnetHtml(data.dni)}
                                </div>

                                <div class="mt-3 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                                    data.isActive
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-rose-50 text-rose-700"
                                }">
                                    Estado: ${data.isActive ? "Activo" : "Inactivo"}
                                </div>
                            </div>
                        </div>

                        <div class="mt-5 grid grid-cols-2 gap-3">
                            ${buildInfoBox("N° Socio", data.memberNumber)}
                            ${buildInfoBox("Rol", data.roleLabel)}
                            ${buildInfoBox("Club", data.companyName, "col-span-2")}
                            ${
                                data.category
                                    ? buildInfoBox("Categoría / Curso", data.category, "col-span-2")
                                    : ""
                            }
                        </div>

                        <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Identificación del alumno
                            </div>
                            <div class="mt-2 text-sm font-medium text-slate-600">
                                Presentar este carnet cuando la institución lo solicite.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function bindStudentCarnetEvents({
    setCarnetOpen
}) {
    const close = () => {
        if (typeof setCarnetOpen === "function") {
            setCarnetOpen(false);
        }
    };

    document.getElementById("closeStudentCarnetBtn")?.addEventListener("click", close);

    document.getElementById("studentCarnetOverlay")?.addEventListener("click", (event) => {
        if (event.target?.id === "studentCarnetOverlay") {
            close();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            close();
        }
    });
}