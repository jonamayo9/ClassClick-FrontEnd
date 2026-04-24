import { get, postForm } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth, logoutAndRedirect } from "../../../shared/js/session.js";
import {
    buildStudentMobileMenu,
    buildStudentMobileBottomNav,
    bindStudentMobileShellEvents,
    syncStudentMobileShellScrollLock,
    enableStudentSoftNavigation
} from "../../../shared/js/student-mobile-shell.js";
import {
    buildStudentCarnetModal,
    bindStudentCarnetEvents
} from "../../../shared/js/student-carnet.js";
import { initNotificationsBell } from "../../../shared/js/notifications-bell.js";
import {
    getMe,
    setMe,
    getStudentMe,
    setStudentMe,
    getActiveCompany,
    setActiveCompany
} from "../../../shared/js/storage.js";

let session = null;
let companySlug = null;
let company = null;
let student = null;
let documents = [];
let carnetOpen = false;

let loading = true;
let pageError = "";
let mobileMenuOpen = false;
let selectedAssignmentId = null;

let previewFile = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function isSasUrlExpired(url) {
    if (!url) return false;

    try {
        const parsedUrl = new URL(url);
        const expires = parsedUrl.searchParams.get("se");

        if (!expires) return false;

        const expiresAt = new Date(expires).getTime();

        return Date.now() > expiresAt - 5 * 60 * 1000;
    } catch {
        return true;
    }
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function getCompanyName() {
    return company?.companyName?.trim() || "";
}

function getCompanyLogoUrl() {
    return company?.logoUrl?.trim() || "";
}

function getStudentFullName() {
    const fullName = student?.fullName?.trim();
    if (fullName) return fullName;

    const composed = [student?.firstName, student?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return composed || "";
}

function getStudentEmail() {
    return student?.email?.trim() || "";
}

function getInitials(text) {
    const parts = String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (!parts.length) return "";
    return parts.map(x => x.charAt(0).toUpperCase()).join("");
}

function buildCompanyLogo(size = "h-16 w-16", rounded = "rounded-2xl") {
    const logoUrl = getCompanyLogoUrl();
    const initials = getInitials(getCompanyName());

    if (!logoUrl && !initials) {
        return `
            <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white text-xs font-bold text-slate-400 shadow-sm">
                —
            </div>
        `;
    }

    if (!logoUrl) {
        return `
            <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm">
                ${escapeHtml(initials)}
            </div>
        `;
    }

    return `
        <div class="${size} ${rounded} flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white shadow-sm">
            <img
                src="${escapeHtml(logoUrl)}"
                alt="Logo empresa"
                class="block h-full w-full object-cover"
                onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center text-xs font-bold text-slate-700&quot;>${escapeHtml(initials || "—")}</div>';"
            />
        </div>
    `;
}

function navLink(label, href, active = false) {
    return `
        <a
            href="${href}"
            class="flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
            }"
        >
            ${escapeHtml(label)}
        </a>
    `;
}

function buildSidebar() {
    return `
        <aside class="hidden md:flex md:w-[220px] md:flex-col md:border-r md:border-slate-200 md:bg-white">
            <div class="border-b border-slate-200 px-5 py-5">
                <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Alumno
                </div>

                <div class="mt-2 truncate text-base font-semibold text-slate-900">
                    ${escapeHtml(getStudentFullName() || "—")}
                </div>

                ${
                    getStudentEmail()
                        ? `<div class="mt-1 truncate text-xs text-slate-500">${escapeHtml(getStudentEmail())}</div>`
                        : ""
                }
            </div>

            <nav class="flex-1 space-y-2 px-4 py-4">
                ${navLink("Inicio", "/src/pages/student/home/index.html")}
                ${navLink("Cursos", "/src/pages/student/courses/index.html")}
                ${navLink("Pagos", "/src/pages/student/payments/index.html")}
                ${navLink("Documentos", "/src/pages/student/documents/index.html", true)}
                ${navLink("Perfil", "/src/pages/student/profile/index.html")}
                ${navLink("Hermanos", "/src/pages/student/siblings/index.html")}
            </nav>

            <div class="mt-auto border-t border-slate-200 px-4 py-4">
                <button
                    id="logoutBtn"
                    type="button"
                    class="flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                    Cerrar sesión
                </button>
            </div>
        </aside>
    `;
}

function buildMobileHeader() {
    return `
        <header class="sticky top-0 z-30 border-b border-slate-200 bg-white md:hidden">
            <div class="flex items-center justify-between px-4 py-3">
                <div class="flex min-w-0 items-center gap-3">
                    ${buildCompanyLogo("h-11 w-11", "rounded-2xl")}

                    <div class="min-w-0">
                        <div class="truncate text-sm font-semibold text-slate-900">
                            ${escapeHtml(getCompanyName() || "Mi club")}
                        </div>

                        <div class="truncate text-xs text-slate-500">
                            ${escapeHtml(getStudentFullName() || "Alumno")}
                        </div>
                    </div>
                </div>

                <div id="studentNotificationsBellMobile"></div>
            </div>
        </header>
    `;
}

function buildMobileBottomNav() {
    return buildStudentMobileBottomNav({
        activeItem: "documents",
        homeHref: "/src/pages/student/home/index.html",
        profileHref: "/src/pages/student/profile/index.html",
        carnetHref: "javascript:void(0)",
        paymentsHref: "/src/pages/student/payments/index.html"
    });
}

function buildTopBar() {
    return `
        <section class="hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:block">
            <div class="flex items-center justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3">
                    ${buildCompanyLogo("h-16 w-16")}

                    <div class="min-w-0">
                        <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Empresa
                        </div>

                        <h1 class="mt-1 truncate text-lg font-bold text-slate-900 sm:text-xl">
                            ${escapeHtml(getCompanyName() || "—")}
                        </h1>
                    </div>
                </div>

                <div id="studentNotificationsBellDesktop"></div>
            </div>
        </section>
    `;
}

function normalizeStatus(status) {
    if (status === 1 || status === "1") return "Pending";
    if (status === 2 || status === "2") return "Submitted";
    if (status === 3 || status === "3") return "Approved";
    if (status === 4 || status === "4") return "Rejected";
    if (status === 5 || status === "5") return "Expired";

    return String(status || "");
}

function getStatusLabel(status) {
    const normalized = normalizeStatus(status);

    switch (normalized) {
        case "Pending": return "Pendiente";
        case "Submitted": return "En revisión";
        case "Approved": return "Aprobado";
        case "Rejected": return "Rechazado";
        case "Expired": return "Vencido";
        default: return normalized || "Sin estado";
    }
}

function getStatusBadge(status) {
    const normalized = normalizeStatus(status);

    const map = {
        Pending: "bg-amber-50 text-amber-700",
        Submitted: "bg-blue-50 text-blue-700",
        Approved: "bg-emerald-50 text-emerald-700",
        Rejected: "bg-rose-50 text-rose-700",
        Expired: "bg-slate-200 text-slate-700"
    };

    return `
        <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold ${map[normalized] || "bg-slate-100 text-slate-700"}">
            ${escapeHtml(getStatusLabel(normalized))}
        </span>
    `;
}

function getDocumentCountText() {
    return `${documents.length} ${documents.length === 1 ? "documento" : "documentos"}`;
}

function isImageFile(mimeType, fileName = "") {
    const type = String(mimeType || "").toLowerCase();
    const name = String(fileName || "").toLowerCase();

    return (
        type.startsWith("image/") ||
        name.endsWith(".png") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".webp") ||
        name.endsWith(".gif")
    );
}

function isPdfFile(mimeType, fileName = "") {
    const type = String(mimeType || "").toLowerCase();
    const name = String(fileName || "").toLowerCase();

    return type === "application/pdf" || name.endsWith(".pdf");
}

function buildPreviewModal() {
    if (!previewFile) return "";

    return `
        <div id="previewModal" class="fixed inset-0 z-[70]">
            <div id="previewOverlay" class="absolute inset-0 bg-slate-950/70"></div>

            <div class="absolute inset-0 overflow-y-auto p-4">
                <div class="mx-auto flex min-h-full max-w-6xl items-center justify-center">
                    <div class="w-full rounded-[28px] bg-white shadow-2xl">
                        <div class="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                            <div class="min-w-0">
                                <h3 class="truncate text-lg font-bold text-slate-900">
                                    ${escapeHtml(previewFile.fileName || "Documento")}
                                </h3>
                                <p class="mt-1 text-sm text-slate-500">
                                    ${escapeHtml(previewFile.mimeType || "Vista previa")}
                                </p>
                            </div>

                            <div class="flex items-center gap-2">
                                <button
                                    id="previewDownloadButton"
                                    type="button"
                                    class="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Descargar
                                </button>

                                <button
                                    id="closePreviewModalButton"
                                    type="button"
                                    class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div class="p-5">
                            ${
                                isPdfFile(previewFile.mimeType, previewFile.fileName)
                                    ? `
                                    <iframe
                                        src="${escapeHtml(previewFile.url)}"
                                        class="h-[75vh] w-full rounded-2xl border border-slate-200"
                                        title="${escapeHtml(previewFile.fileName || "Documento")}"
                                    ></iframe>
                                    `
                                    : isImageFile(previewFile.mimeType, previewFile.fileName)
                                        ? `
                                        <div class="flex max-h-[75vh] items-center justify-center overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <img
                                                src="${escapeHtml(previewFile.url)}"
                                                alt="${escapeHtml(previewFile.fileName || "Documento")}"
                                                class="max-h-[70vh] w-auto max-w-full object-contain"
                                            />
                                        </div>
                                        `
                                        : `
                                        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center">
                                            <p class="text-sm text-slate-600">
                                                Este archivo no se puede previsualizar dentro de la página.
                                            </p>
                                            <p class="mt-2 text-sm text-slate-500">
                                                Usá el botón descargar.
                                            </p>
                                        </div>
                                        `
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function openPreviewModal(file) {
    previewFile = file;
    rerender();
}

function closePreviewModal() {
    previewFile = null;
    rerender();
}

function buildPageHeader() {
    return `
        <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Panel alumno
                    </div>

                    <h2 class="mt-1 text-2xl font-bold text-slate-900">
                        Mis documentos
                    </h2>

                    <p class="mt-2 text-sm text-slate-500">
                        Acá vas a poder ver la documentación solicitada, subir archivos y consultar su estado.
                    </p>
                </div>

                <div class="inline-flex w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                    ${escapeHtml(getDocumentCountText())}
                </div>
            </div>
        </section>
    `;
}

function buildDocumentCard(doc) {
    const normalizedStatus = normalizeStatus(doc.status);
    const canUpload =
        normalizedStatus === "Pending" ||
        normalizedStatus === "Rejected";

    const hasFile = !!doc.currentFileId;

    return `
        <article class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:transition md:hover:-translate-y-0.5 md:hover:shadow-md">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <h3 class="text-lg font-bold text-slate-900">
                        ${escapeHtml(doc.documentTypeName || "Documento")}
                    </h3>

                    <div class="mt-2">
                        ${getStatusBadge(doc.status)}
                    </div>
                </div>

                ${
                    doc.isMandatory
                        ? `<span class="inline-flex shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">Obligatorio</span>`
                        : `<span class="inline-flex shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Opcional</span>`
                }
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl bg-slate-50 px-4 py-3">
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Fecha límite
                    </div>
                    <div class="mt-1 text-base font-semibold text-slate-900">
                        ${escapeHtml(formatDate(doc.dueDateUtc))}
                    </div>
                </div>

                ${
                    doc.expirationDateUtc
                        ? `
                        <div class="rounded-2xl bg-slate-50 px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Vencimiento
                            </div>
                            <div class="mt-1 text-base font-semibold text-slate-900">
                                ${escapeHtml(formatDate(doc.expirationDateUtc))}
                            </div>
                        </div>
                        `
                        : `
                        <div class="rounded-2xl bg-slate-50 px-4 py-3">
                            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Archivo actual
                            </div>
                            <div class="mt-1 truncate text-base font-semibold text-slate-900">
                                ${hasFile ? escapeHtml(doc.currentFileName) : "—"}
                            </div>
                        </div>
                        `
                }
            </div>

            ${
                doc.requestNote
                    ? `
                    <div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Nota de la solicitud
                        </div>
                        <p class="mt-2 text-sm leading-6 text-slate-600">
                            ${escapeHtml(doc.requestNote)}
                        </p>
                    </div>
                    `
                    : ""
            }

            ${
                doc.reviewNote
                    ? `
                    <div class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">
                            Observación del administrador
                        </div>
                        <p class="mt-2 text-sm leading-6 text-rose-700">
                            ${escapeHtml(doc.reviewNote)}
                        </p>
                    </div>
                    `
                    : ""
            }

            ${
                hasFile
                    ? `
                    <div class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Archivo cargado
                        </div>
                        <div class="mt-2 truncate text-sm font-medium text-slate-700">
                            ${escapeHtml(doc.currentFileName)}
                        </div>
                    </div>
                    `
                    : ""
            }

            <div class="mt-4 flex flex-wrap items-center gap-2">
                ${
                    canUpload
                        ? `
                        <button
                            data-upload="${doc.assignmentId}"
                            type="button"
                            class="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                            ${normalizedStatus === "Rejected" ? "Reemplazar archivo" : "Subir archivo"}
                        </button>
                        `
                        : ""
                }

                ${
                    hasFile
                        ? `
                        <button
                            data-view="${doc.currentFileId}"
                            type="button"
                            class="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Ver
                        </button>

                        <button
                            data-download="${doc.currentFileId}"
                            type="button"
                            class="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Descargar
                        </button>
                        `
                        : ""
                }

                ${
                    normalizedStatus === "Submitted"
                        ? `
                        <span class="text-sm font-medium text-slate-500">
                            Esperando aprobación del administrador
                        </span>
                        `
                        : ""
                }
            </div>
        </article>
    `;
}

function buildMobileMenu() {
    return buildStudentMobileMenu({
        mobileMenuOpen,
        studentFullName: getStudentFullName(),
        studentEmail: getStudentEmail(),
        activeItem: "documents"
    });
}

function buildDocumentsSection() {
    if (!documents.length) {
        return `
            <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div class="text-lg font-semibold text-slate-900">
                    No tenés documentos solicitados.
                </div>

                <p class="mt-2 text-sm text-slate-500">
                    Cuando el administrador te solicite documentación, la vas a ver acá.
                </p>
            </section>
        `;
    }

    return `
        <section class="grid gap-4 xl:grid-cols-2">
            ${documents.map(buildDocumentCard).join("")}
        </section>
    `;
}

function buildContent() {
    return `
        <div class="space-y-6">
            ${buildTopBar()}
            ${buildPageHeader()}
            ${buildDocumentsSection()}
        </div>
    `;
}

function buildLoading() {
    return `
        <div class="min-h-screen bg-slate-100">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div class="text-sm text-slate-500">Cargando documentos...</div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

function buildError() {
    return `
        <div class="min-h-screen bg-slate-100">
            <div class="flex min-h-screen">
                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 sm:px-6 lg:px-8">
                        <div class="rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
                            <div class="text-base font-semibold text-slate-900">
                                No se pudieron cargar los documentos.
                            </div>

                            <div class="mt-2 text-sm text-slate-500">
                                ${escapeHtml(pageError || "Ocurrió un error inesperado.")}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

function render() {
    if (loading) return buildLoading();
    if (pageError) return buildError();

    return `
        <div class="min-h-screen bg-slate-100">
            ${buildMobileHeader()}
            ${buildMobileMenu()}

            <div class="flex min-h-screen">
                ${buildSidebar()}

                <main class="min-w-0 flex-1">
                    <div class="px-4 py-6 pb-[260px] sm:px-6 lg:px-8 md:pb-6">
                        ${buildContent()}
                    </div>
                </main>
            </div>

            ${buildMobileBottomNav()}

            ${buildPreviewModal()}

            ${buildStudentCarnetModal({
                open: carnetOpen,
                student,
                company
            })}
        </div>
    `;
}

function rerender() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = render();
syncStudentMobileShellScrollLock({
    mobileMenuOpen,
    extraLocked: !!previewFile || carnetOpen
});
    bindEvents();
}

function bindEvents() {
bindStudentMobileShellEvents({
    setMobileMenuOpen: (value) => {
        mobileMenuOpen = !!value;
        rerender();
    },
    onLogout: () => {
        logoutAndRedirect();
    },
    onOpenCarnet: () => {
        carnetOpen = true;
        rerender();
    }
});

bindStudentCarnetEvents({
    setCarnetOpen: (value) => {
        carnetOpen = !!value;
        rerender();
    }
});

    document.querySelectorAll("#logoutBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            logoutAndRedirect();
        });
    });

    document.querySelectorAll("[data-upload]").forEach(btn => {
        btn.addEventListener("click", () => {
            openFileSelector(btn.dataset.upload);
        });
    });

    document.querySelectorAll("[data-view]").forEach(btn => {
        btn.addEventListener("click", () => {
            viewFile(btn.dataset.view);
        });
    });

    document.querySelectorAll("[data-download]").forEach(btn => {
        btn.addEventListener("click", () => {
            downloadFile(btn.dataset.download);
        });
    });

        initNotificationsBell({
        rootId: "studentNotificationsBellMobile"
    });

    initNotificationsBell({
        rootId: "studentNotificationsBellDesktop"
    });

    document.getElementById("closePreviewModalButton")?.addEventListener("click", () => {
    closePreviewModal();
});

document.getElementById("previewOverlay")?.addEventListener("click", () => {
    closePreviewModal();
});

document.getElementById("previewDownloadButton")?.addEventListener("click", () => {
    if (previewFile?.fileId) {
        downloadFile(previewFile.fileId);
    }
});
}

function openFileSelector(assignmentId) {
    selectedAssignmentId = assignmentId;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = () => {
        const file = input.files?.[0] || null;
        uploadFile(file);
    };
    input.click();
}

async function uploadFile(file) {
    if (!file || !selectedAssignmentId) return;

    try {
        const formData = new FormData();
        formData.append("file", file);

        await postForm(
            `/api/student/${companySlug}/student-files/assignments/${selectedAssignmentId}/upload`,
            formData
        );

        pageError = "";
        await loadDocuments();
        rerender();
    } catch (error) {
        pageError = error?.message || "No se pudo subir el archivo.";
        rerender();
    }
}

async function viewFile(fileId) {
    try {
        const result = await get(
            `/api/student/${companySlug}/student-files/files/${fileId}/view`
        );

        if (!result?.url) {
            throw new Error("No se pudo obtener el archivo.");
        }

openPreviewModal({
    fileId,
    url: result.url,
    fileName: result.fileName || documents.find(x => x.currentFileId === fileId)?.currentFileName || "Documento",
    mimeType: result.contentType || ""
});
    } catch (error) {
        pageError = error?.message || "No se pudo abrir el archivo.";
        rerender();
    }
}

async function downloadFile(fileId) {
    try {
        const result = await get(
            `/api/student/${companySlug}/student-files/files/${fileId}/download`
        );

        if (!result?.url) {
            throw new Error("No se pudo obtener el archivo.");
        }

        const response = await fetch(result.url);

        if (!response.ok) {
            throw new Error("No se pudo descargar el archivo.");
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const fileName =
            result.fileName ||
            documents.find(x => x.currentFileId === fileId)?.currentFileName ||
            "documento";

        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(objectUrl);

    } catch (error) {
        pageError = error?.message || "No se pudo descargar el archivo.";
        rerender();
    }
}

async function loadStudentProfile() {
    let cached = getStudentMe(companySlug);

if (cached && !isSasUrlExpired(cached.profileImageUrl)) {
    return cached;
}

    const result = await get(`/api/student/${companySlug}/me`);
    setStudentMe(companySlug, result);

    return result;
}

async function loadDocuments() {
    const result = await get(
        `/api/student/${companySlug}/student-files/my-documents`
    );

    documents = Array.isArray(result) ? result : [];
}

async function init() {
    try {
        await loadConfig();
        enableStudentSoftNavigation();
        session = requireAuth();
        if (!session) return;

        companySlug = session.activeCompanySlug;

let cachedCompany = getActiveCompany(companySlug);

if (cachedCompany && !isSasUrlExpired(cachedCompany.logoUrl)) {
    company = cachedCompany;
} else {
    let me = getMe();

    if (!me) {
        me = await get("/api/admin/me");
        setMe(me);
    }

    company = (me.companies || []).find(x => x.companySlug === companySlug) || null;

    if (company) {
        setActiveCompany(companySlug, company);
    }
}

        if (!company) {
            throw new Error("No se encontró la empresa activa del alumno.");
        }

        student = await loadStudentProfile();

        if (!student) {
            throw new Error("No se pudo obtener el perfil del alumno.");
        }

        await loadDocuments();
    } catch (error) {
        pageError = error?.message || "No se pudo cargar la información de documentos.";
    } finally {
        loading = false;
        rerender();
    }
}

init();