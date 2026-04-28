import { get, postForm, put, del } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../shared/js/admin-layout.js";

let company = null;
let announcements = [];
let editingAnnouncementId = null;
let deletingAnnouncementId = null;
let isSaving = false;
let courses = [];

function qs(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function buildContent() {
    return `
        <section class="space-y-6">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Comunicación</p>
                        <h1 class="mt-2 text-3xl font-bold">Novedades</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Publicá avisos para alumnos con texto, imagen o ambos.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Total</p>
                            <p id="statTotal" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Activas</p>
                            <p id="statActive" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Con imagen</p>
                            <p id="statImages" class="mt-2 text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="space-y-5">
                <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="mb-5">
                        <h2 id="formTitle" class="text-lg font-semibold text-slate-900">Crear novedad</h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Podés cargar solo texto, solo imagen o ambas cosas.
                        </p>
                    </div>

                    <form id="announcementForm" class="space-y-4">
                        <div>
                            <label for="announcementTitle" class="mb-1 block text-sm font-medium text-slate-700">
                                Título opcional
                            </label>
                            <input
                                id="announcementTitle"
                                type="text"
                                maxlength="120"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Ej: Entrenamiento suspendido"
                            />
                        </div>

                        <div>
                            <label for="announcementText" class="mb-1 block text-sm font-medium text-slate-700">
                                Texto
                            </label>
                            <textarea
                                id="announcementText"
                                rows="6"
                                maxlength="3000"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                placeholder="Escribí la novedad..."
                            ></textarea>
                            <p id="announcementError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>

                        <div class="space-y-3">
                            <label class="text-sm font-medium text-slate-700">Alcance</label>

                            <div class="flex gap-4">
                                <label class="flex items-center gap-2 text-sm">
                                    <input type="radio" name="scope" value="global" checked />
                                    Todos los alumnos
                                </label>

                                <label class="flex items-center gap-2 text-sm">
                                    <input type="radio" name="scope" value="courses" />
                                    Por curso
                                </label>
                            </div>

                            <div id="coursesBox" class="hidden rounded-2xl border border-slate-200 p-3">
                                <div id="coursesList" class="flex flex-wrap gap-2"></div>
                            </div>
                        </div>

                        <div>
                            <label for="announcementImage" class="mb-1 block text-sm font-medium text-slate-700">
                                Imagen opcional
                            </label>
                            <input
                                id="announcementImage"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                            />
                            <p class="mt-1 text-xs text-slate-500">Formatos permitidos: JPG, PNG o WEBP. Máximo 5 MB.</p>
                        </div>

                        <div id="currentImageBox" class="hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p class="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Imagen actual</p>
                            <img id="currentImagePreview" class="max-h-48 w-full rounded-2xl object-cover" alt="Imagen actual" />
                            <label class="mt-3 flex items-center gap-2 text-sm text-slate-700">
                                <input id="removeImage" type="checkbox" class="h-4 w-4" />
                                Eliminar imagen actual
                            </label>
                        </div>

                        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                            <input id="announcementIsActive" type="checkbox" checked class="h-4 w-4" />
                            <label for="announcementIsActive" class="text-sm font-medium text-slate-700">
                                Novedad activa
                            </label>
                        </div>

                        <div id="notifyBox" class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                            <input id="notifyStudents" type="checkbox" checked class="h-4 w-4" />
                            <label for="notifyStudents" class="text-sm font-medium text-slate-700">
                                Notificar a alumnos
                            </label>
                        </div>

                        <div class="flex gap-3 pt-2">
                            <button
                                id="saveBtn"
                                type="submit"
                                class="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Publicar
                            </button>

                            <button
                                id="cancelEditBtn"
                                type="button"
                                class="hidden inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

                <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="mb-5 flex items-center justify-between gap-4">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-900">Listado de novedades</h2>
                            <p class="mt-1 text-sm text-slate-500">
                                Administrá lo que ven los alumnos.
                            </p>
                        </div>
                    </div>

                    <div id="announcementsList" class="space-y-4"></div>

                    <div id="emptyState" class="hidden py-12 text-center">
                        <p class="text-sm text-slate-500">Todavía no hay novedades cargadas.</p>
                    </div>
                </div>
            </section>
        </section>

        <div id="modalRoot"></div>
    `;
}

function setSaving(loading) {
    isSaving = loading;

    qs("announcementTitle").disabled = loading;
    qs("announcementText").disabled = loading;
    qs("announcementImage").disabled = loading;
    qs("announcementIsActive").disabled = loading;
    qs("notifyStudents").disabled = loading;
    qs("removeImage").disabled = loading;
    qs("saveBtn").disabled = loading;
    qs("cancelEditBtn").disabled = loading;

    qs("saveBtn").textContent = loading
        ? "Guardando..."
        : editingAnnouncementId
            ? "Guardar cambios"
            : "Publicar";
}

function showError(message) {
    qs("announcementError").textContent = message;
    qs("announcementError").classList.remove("hidden");
}

function clearError() {
    qs("announcementError").textContent = "";
    qs("announcementError").classList.add("hidden");
}

function validateForm() {
    clearError();

    const text = qs("announcementText").value.trim();
    const image = qs("announcementImage").files?.[0] || null;
    const editing = announcements.find(x => x.id === editingAnnouncementId);
    const hasExistingImage = !!editing?.imageUrl;
    const removeImage = qs("removeImage").checked;

    const willHaveImage = !!image || (hasExistingImage && !removeImage);

    if (!text && !willHaveImage) {
        showError("La novedad debe tener texto, imagen o ambas cosas.");
        return false;
    }

    if (image && image.size > 5 * 1024 * 1024) {
        showError("La imagen no puede superar los 5 MB.");
        return false;
    }

    return true;
}

async function loadCourses() {
    courses = await get(`/api/admin/${company.slug}/courses`);

    const container = qs("coursesList");

    container.innerHTML = courses.map(c => `
        <label class="flex items-center gap-2 text-xs border px-3 py-2 rounded-xl">
            <input type="checkbox" value="${c.id}" class="course-checkbox" />
            ${escapeHtml(c.name)}
        </label>
    `).join("");
}

function bindScopeEvents() {
    document.querySelectorAll("input[name='scope']").forEach(radio => {
        radio.addEventListener("change", () => {
            const isCourses = radio.value === "courses" && radio.checked;
            qs("coursesBox").classList.toggle("hidden", !isCourses);
        });
    });
}

function resetForm() {
    editingAnnouncementId = null;

    qs("formTitle").textContent = "Crear novedad";
    qs("announcementForm").reset();
    qs("announcementIsActive").checked = true;
    qs("notifyStudents").checked = true;
    qs("notifyBox").classList.remove("hidden");
    qs("cancelEditBtn").classList.add("hidden");
    qs("currentImageBox").classList.add("hidden");
    qs("currentImagePreview").src = "";
    qs("saveBtn").textContent = "Publicar";

    clearError();
}

function renderStats() {
    qs("statTotal").textContent = String(announcements.length);
    qs("statActive").textContent = String(announcements.filter(x => x.isActive).length);
    qs("statImages").textContent = String(announcements.filter(x => x.imageUrl).length);
}

function renderAnnouncements() {
    const list = qs("announcementsList");
    const empty = qs("emptyState");

    renderStats();

    if (!announcements.length) {
        list.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    list.innerHTML = `
    <div class="overflow-hidden rounded-2xl border border-slate-200">
        <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                    <th class="px-4 py-3">Novedad</th>
                    <th class="px-4 py-3">Imagen</th>
                    <th class="px-4 py-3">Alcance</th>
                    <th class="px-4 py-3">Estado</th>
                    <th class="px-4 py-3 text-right">Acciones</th>
                </tr>
            </thead>

            <tbody class="divide-y divide-slate-100 bg-white">
                ${announcements.map(item => `
                    <tr>
                        <td class="px-4 py-3">
                            <div class="font-semibold text-slate-900">
                                ${escapeHtml(item.title || "Sin título")}
                            </div>
                            <div class="mt-1 line-clamp-1 text-xs text-slate-500">
                                ${item.text ? escapeHtml(item.text) : "Sin texto"}
                            </div>
                            <div class="mt-1 text-[11px] text-slate-400">
                                ${formatDate(item.createdAtUtc)}
                            </div>
                        </td>

                        <td class="px-4 py-3">
                            ${
                                item.imageUrl
                                    ? `<img src="${item.imageUrl}" class="h-12 w-16 rounded-xl object-cover border border-slate-200" />`
                                    : `<span class="text-xs text-slate-400">Sin imagen</span>`
                            }
                        </td>

                        <td class="px-4 py-3">
    ${
        item.isGlobal
            ? `<span class="text-xs text-slate-500">Global</span>`
            : `<span class="text-xs text-blue-600">${item.courseNames.join(", ")}</span>`
    }
</td>

                        <td class="px-4 py-3">
                            ${
                                item.isActive
                                    ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activa</span>`
                                    : `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Inactiva</span>`
                            }
                        </td>

                        <td class="px-4 py-3 text-right">
                            <div class="flex justify-end gap-2">
                                <button
                                    type="button"
                                    data-id="${item.id}"
                                    class="edit-btn rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    data-id="${item.id}"
                                    class="delete-btn rounded-xl border border-rose-300 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    </div>
`;

    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => openEdit(btn.dataset.id));
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => openDeleteModal(btn.dataset.id));
    });
}

function openEdit(id) {
    const item = announcements.find(x => x.id === id);
    if (!item) return;

    editingAnnouncementId = id;

    qs("formTitle").textContent = "Editar novedad";
    qs("announcementTitle").value = item.title || "";
    qs("announcementText").value = item.text || "";
    qs("announcementIsActive").checked = !!item.isActive;
    qs("announcementImage").value = "";
    qs("removeImage").checked = false;
    qs("notifyBox").classList.add("hidden");
    qs("cancelEditBtn").classList.remove("hidden");
    qs("saveBtn").textContent = "Guardar cambios";

    if (item.imageUrl) {
        qs("currentImageBox").classList.remove("hidden");
        qs("currentImagePreview").src = item.imageUrl;
    } else {
        qs("currentImageBox").classList.add("hidden");
        qs("currentImagePreview").src = "";
    }

    clearError();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setModal(html) {
    qs("modalRoot").innerHTML = html;
}

function closeModal() {
    setModal("");
}

function openDeleteModal(id) {
    const item = announcements.find(x => x.id === id);
    if (!item) return;

    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <h3 class="text-lg font-semibold text-slate-900">Eliminar novedad</h3>
                <p class="mt-2 text-sm text-slate-500">
                    Vas a eliminar esta novedad. Esta acción no se puede deshacer.
                </p>

                <div class="mt-6 flex gap-3">
                    <button
                        id="modalCancelBtn"
                        type="button"
                        class="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Cancelar
                    </button>

                    <button
                        id="modalConfirmBtn"
                        type="button"
                        class="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-700"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    `);

    qs("modalCancelBtn").addEventListener("click", closeModal);
    qs("modalConfirmBtn").addEventListener("click", async () => {
        closeModal();
        await deleteAnnouncement(id);
    });
}

async function loadAnnouncements() {
    announcements = await get(`/api/admin/${company.slug}/announcements`);
    renderAnnouncements();
}

async function saveAnnouncement(event) {
    event.preventDefault();

    if (isSaving) return;

    const saveBtn = qs("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = editingAnnouncementId ? "Guardando..." : "Publicando...";

    isSaving = true;
    setSaving(true);

    try {
        if (!validateForm()) {
            return;
        }

        const formData = new FormData();

        const title = qs("announcementTitle").value.trim();
        const text = qs("announcementText").value.trim();
        const image = qs("announcementImage").files?.[0] || null;

        formData.append("title", title);
        formData.append("text", text);

        if (image) {
            formData.append("image", image);
        }

        const scope = document.querySelector("input[name='scope']:checked")?.value;

const isGlobal = scope !== "courses";

formData.append("isGlobal", isGlobal ? "true" : "false");

if (!isGlobal) {
    const selectedCourses = Array.from(document.querySelectorAll(".course-checkbox:checked"))
        .map(x => x.value);

    if (!selectedCourses.length) {
        showError("Seleccioná al menos un curso.");
        return;
    }

    selectedCourses.forEach(id => {
        formData.append("courseIds", id);
    });
}

        if (editingAnnouncementId) {
            formData.append("isActive", qs("announcementIsActive").checked ? "true" : "false");
            formData.append("removeImage", qs("removeImage").checked ? "true" : "false");

            await put(`/api/admin/${company.slug}/announcements/${editingAnnouncementId}`, formData);
        } else {
            const shouldNotify = qs("notifyStudents").checked;

            formData.append("notifyStudents", shouldNotify ? "true" : "false");

            await postForm(`/api/admin/${company.slug}/announcements`, formData);
        }

        resetForm();
        await loadAnnouncements();
    } catch (error) {
        console.error(error);
        showError(error?.message || "No se pudo guardar la novedad.");
    } finally {
        isSaving = false;
        setSaving(false);
    }
}

async function deleteAnnouncement(id) {
    try {
        deletingAnnouncementId = id;
        renderAnnouncements();

        await del(`/api/admin/${company.slug}/announcements/${id}`);

        if (editingAnnouncementId === id) {
            resetForm();
        }

        announcements = announcements.filter(x => x.id !== id);
        renderAnnouncements();
    } catch (error) {
        console.error(error);
    } finally {
        deletingAnnouncementId = null;
        renderAnnouncements();
    }
}

async function init() {
    await loadConfig();
    requireAuth();

    const app = qs("app");

    app.innerHTML = renderAdminLayout({
        activeKey: "announcements",
        pageTitle: "Novedades",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            resetForm();
            await loadCourses();
            await loadAnnouncements();
        }
    });

    company = layout.activeCompany;

    await loadCourses();
    bindScopeEvents();

    qs("announcementForm").addEventListener("submit", saveAnnouncement);
    qs("cancelEditBtn").addEventListener("click", resetForm);

    await loadAnnouncements();
}

init();