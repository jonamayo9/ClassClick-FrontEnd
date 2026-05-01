import { get, post, put, del } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../../shared/js/admin-layout.js";

let company = null;
let categories = [];
let isSavingCategory = false;
let editingCategoryId = null;
let deletingCategoryId = null;

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

function goBackToClothing() {
    window.location.href = "/src/pages/admin/Clothing/index.html";
}

function flattenCategories() {
    const result = [];

    categories.forEach(parent => {
        result.push(parent);

        if (Array.isArray(parent.children)) {
            parent.children.forEach(child => result.push(child));
        }
    });

    return result;
}

function findCategory(id) {
    return flattenCategories().find(x => x.id === id);
}

function buildContent() {
    return `
        <section class="space-y-8">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Indumentaria</p>
                        <h1 class="mt-2 text-3xl font-bold">Categorías</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Organizá productos por categorías y subcategorías.
                        </p>

                        <button
                            id="backToClothingBtn"
                            type="button"
                            class="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                        >
                            ← Volver a indumentaria
                        </button>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Categorías</p>
                            <p id="statParentCategories" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Subcategorías</p>
                            <p id="statChildCategories" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Total</p>
                            <p id="statTotalCategories" class="mt-2 text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="grid gap-8 lg:grid-cols-[420px_1fr]">
                <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div class="mb-6">
                        <h2 id="categoryFormTitle" class="text-xl font-bold text-slate-900">Crear categoría</h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Podés crear categorías principales o subcategorías.
                        </p>
                    </div>

                    <form id="categoryForm" class="space-y-5">
                        <div>
                            <label for="categoryName" class="mb-1 block text-sm font-semibold text-slate-700">
                                Nombre
                            </label>

                            <input
                                id="categoryName"
                                type="text"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                                placeholder="Ej: Remeras"
                            />

                            <p id="categoryNameError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>

                        <div>
                            <label for="categoryParentId" class="mb-1 block text-sm font-semibold text-slate-700">
                                Categoría padre
                            </label>

                            <select
                                id="categoryParentId"
                                class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                            ></select>

                            <p class="mt-1 text-xs text-slate-500">
                                Dejalo vacío para crear una categoría principal.
                            </p>
                        </div>

                        <div class="flex gap-3 pt-2">
                            <button
                                id="saveCategoryBtn"
                                type="submit"
                                class="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Guardar
                            </button>

                            <button
                                id="cancelCategoryEditBtn"
                                type="button"
                                class="hidden rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

                <div class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div class="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <h2 class="text-xl font-bold text-slate-900">Listado</h2>
                            <p class="mt-1 text-sm text-slate-500">
                                Administrá categorías y subcategorías.
                            </p>
                        </div>
                    </div>

                    <div id="categoriesList" class="space-y-5"></div>

                    <div id="categoriesEmptyState" class="hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                        <p class="text-sm font-medium text-slate-500">
                            Todavía no hay categorías cargadas.
                        </p>
                    </div>
                </div>
            </section>

            <div id="categoryModalRoot"></div>
        </section>
    `;
}

function clearCategoryErrors() {
    qs("categoryNameError").classList.add("hidden");
    qs("categoryNameError").textContent = "";
}

function showCategoryError(message) {
    qs("categoryNameError").textContent = message;
    qs("categoryNameError").classList.remove("hidden");
}

function validateCategoryForm() {
    clearCategoryErrors();

    if (!qs("categoryName").value.trim()) {
        showCategoryError("El nombre es obligatorio.");
        return false;
    }

    return true;
}

function setCategoryFormLoading(loading) {
    isSavingCategory = loading;

    qs("categoryName").disabled = loading;
    qs("categoryParentId").disabled = loading;
    qs("saveCategoryBtn").disabled = loading;
    qs("cancelCategoryEditBtn").disabled = loading;

    qs("saveCategoryBtn").textContent = loading
        ? "Guardando..."
        : editingCategoryId
            ? "Guardar cambios"
            : "Guardar";
}

function resetCategoryForm() {
    editingCategoryId = null;

    qs("categoryFormTitle").textContent = "Crear categoría";
    qs("categoryForm").reset();
    qs("cancelCategoryEditBtn").classList.add("hidden");
    qs("saveCategoryBtn").textContent = "Guardar";

    clearCategoryErrors();
    renderParentOptions();
}

function getParentCategories() {
    return categories.filter(x => !x.parentId);
}

function getChildrenCount() {
    return categories.reduce((total, category) => {
        return total + (Array.isArray(category.children) ? category.children.length : 0);
    }, 0);
}

function renderStats() {
    const parents = getParentCategories().length;
    const children = getChildrenCount();

    qs("statParentCategories").textContent = String(parents);
    qs("statChildCategories").textContent = String(children);
    qs("statTotalCategories").textContent = String(parents + children);
}

function renderParentOptions() {
    const select = qs("categoryParentId");
    const parents = getParentCategories()
        .filter(category => category.id !== editingCategoryId);

    select.innerHTML = `
        <option value="">Sin categoría padre</option>
        ${parents.map(category => `
            <option value="${category.id}">
                ${escapeHtml(category.name)}
            </option>
        `).join("")}
    `;
}

function renderStatusBadge(isActive) {
    return isActive
        ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Activa</span>`
        : `<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Inactiva</span>`;
}

function renderActionButtons(category) {
    return `
        <div class="flex flex-wrap items-center gap-2">
            <button
                type="button"
                data-id="${category.id}"
                class="edit-category-btn rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100"
            >
                Editar
            </button>

            <button
                type="button"
                data-id="${category.id}"
                class="delete-category-btn rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                ${deletingCategoryId === category.id ? "disabled" : ""}
            >
                ${deletingCategoryId === category.id ? "Eliminando..." : "Eliminar"}
            </button>
        </div>
    `;
}

function renderCategoriesList() {
    const list = qs("categoriesList");
    const empty = qs("categoriesEmptyState");

    if (!categories.length) {
        list.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    list.innerHTML = categories.map(category => `
        <div class="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
            <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-lg">🏷️</span>
                        <div>
                            <h3 class="text-lg font-black text-slate-900">${escapeHtml(category.name)}</h3>
                            <p class="text-xs font-medium text-slate-500">Categoría principal</p>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                    ${renderStatusBadge(category.isActive)}
                    ${renderActionButtons(category)}
                </div>
            </div>

            ${Array.isArray(category.children) && category.children.length
                ? `
                    <div class="border-t border-slate-200 bg-white/70 p-4">
                        <p class="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            Subcategorías
                        </p>

                        <div class="grid gap-3 md:grid-cols-2">
                            ${category.children.map(child => `
                                <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p class="font-bold text-slate-900">${escapeHtml(child.name)}</p>
                                            <p class="mt-1 text-xs text-slate-500">Subcategoría de ${escapeHtml(category.name)}</p>
                                        </div>

                                        <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                                            ${renderStatusBadge(child.isActive)}
                                            ${renderActionButtons(child)}
                                        </div>
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `
                : `
                    <div class="border-t border-slate-200 bg-white/70 p-4">
                        <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            Sin subcategorías.
                        </div>
                    </div>
                `
            }
        </div>
    `).join("");

    list.querySelectorAll(".edit-category-btn").forEach(btn => {
        btn.addEventListener("click", () => openEditCategory(btn.dataset.id));
    });

    list.querySelectorAll(".delete-category-btn").forEach(btn => {
        btn.addEventListener("click", () => openDeleteCategoryModal(btn.dataset.id));
    });
}

function setModal(html) {
    qs("categoryModalRoot").innerHTML = html;
}

function closeModal() {
    setModal("");
}

function buildConfirmModal({ title, description, confirmText, onConfirm }) {
    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-xl">
                    ⚠️
                </div>

                <h3 class="text-xl font-black text-slate-900">${escapeHtml(title)}</h3>
                <p class="mt-2 text-sm leading-6 text-slate-500">${escapeHtml(description)}</p>

                <div class="mt-6 flex gap-3">
                    <button
                        id="modalCancelBtn"
                        type="button"
                        class="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                        Cancelar
                    </button>

                    <button
                        id="modalConfirmBtn"
                        type="button"
                        class="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
                    >
                        ${escapeHtml(confirmText)}
                    </button>
                </div>
            </div>
        </div>
    `);

    qs("modalCancelBtn").addEventListener("click", closeModal);
    qs("modalConfirmBtn").addEventListener("click", onConfirm);
}

function openEditCategory(categoryId) {
    const category = findCategory(categoryId);
    if (!category) return;

    editingCategoryId = category.id;

    qs("categoryFormTitle").textContent = category.parentId
        ? "Editar subcategoría"
        : "Editar categoría";

    qs("categoryName").value = category.name || "";

    renderParentOptions();
    qs("categoryParentId").value = category.parentId || "";

    qs("cancelCategoryEditBtn").classList.remove("hidden");
    qs("saveCategoryBtn").textContent = "Guardar cambios";

    clearCategoryErrors();

    window.scrollTo({ top: 0, behavior: "smooth" });
    qs("categoryName").focus();
}

function openDeleteCategoryModal(categoryId) {
    const category = findCategory(categoryId);
    if (!category) return;

    buildConfirmModal({
        title: "Eliminar categoría",
        description: `Vas a eliminar "${category.name}". Si tiene productos o subcategorías activas, el sistema no lo va a permitir.`,
        confirmText: "Eliminar",
        onConfirm: async () => {
            closeModal();
            await deleteCategory(categoryId);
        }
    });
}

async function loadCategories() {
    categories = await get(`/api/admin/${company.slug}/clothing/categories`);

    renderStats();
    renderParentOptions();
    renderCategoriesList();
}

async function saveCategory(event) {
    event.preventDefault();

    if (isSavingCategory) return;
    if (!validateCategoryForm()) return;

    const parentId = qs("categoryParentId").value || null;

    const payload = {
        name: qs("categoryName").value.trim(),
        parentId,
        isActive: true
    };

    try {
        setCategoryFormLoading(true);

        if (editingCategoryId) {
            await put(`/api/admin/${company.slug}/clothing/categories/${editingCategoryId}`, payload);
        } else {
            await post(`/api/admin/${company.slug}/clothing/categories`, {
                name: payload.name,
                parentId: payload.parentId
            });
        }

        resetCategoryForm();
        await loadCategories();
    } catch (error) {
        console.error(error);
        showCategoryError(error?.message || "No se pudo guardar la categoría.");
    } finally {
        setCategoryFormLoading(false);
    }
}

async function deleteCategory(categoryId) {
    try {
        deletingCategoryId = categoryId;
        renderCategoriesList();

        await del(`/api/admin/${company.slug}/clothing/categories/${categoryId}`);

        if (editingCategoryId === categoryId) {
            resetCategoryForm();
        }

        await loadCategories();
    } catch (error) {
        console.error(error);
        alert(error?.message || "No se pudo eliminar la categoría.");
        await loadCategories();
    } finally {
        deletingCategoryId = null;
        renderCategoriesList();
    }
}

async function init() {
    await loadConfig();
    requireAuth();

    const app = qs("app");

    app.innerHTML = renderAdminLayout({
        activeKey: "clothing",
        pageTitle: "Categorías de indumentaria",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            resetCategoryForm();
            await loadCategories();
        }
    });

    company = layout.activeCompany;

    qs("categoryForm").addEventListener("submit", saveCategory);
    qs("cancelCategoryEditBtn").addEventListener("click", resetCategoryForm);
    qs("backToClothingBtn").addEventListener("click", goBackToClothing);

    await loadCategories();
}

init();