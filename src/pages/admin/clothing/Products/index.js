import { get, post, put, del, postForm } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../../shared/js/admin-layout.js";

let company = null;
let products = [];
let categories = [];
let productVariants = [];

let isSavingProduct = false;
let deletingProductId = null;
let pendingCreateImages = [];

let currentPage = 1;
const PAGE_SIZE = 10;

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

function togglePersonalizationBox() {
    const enabled = qs("productAllowsPersonalization")?.checked === true;
    qs("productPersonalizationBox")?.classList.toggle("hidden", !enabled);
}

function money(value) {
    return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function goBackToClothing() {
    window.location.href = "/src/pages/admin/Clothing/index.html";
}

function buildContent() {
    return `
        <section class="space-y-8">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Indumentaria</p>
                        <h1 class="mt-2 text-3xl font-bold">Productos</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Cargá productos, precios, señas e imágenes. El stock se administra desde su sección.
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
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Productos</p>
                            <p id="statProducts" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Activos</p>
                            <p id="statActiveProducts" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Con variantes</p>
                            <p id="statVariantProducts" class="mt-2 text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div class="mb-6">
                    <h2 class="text-xl font-bold text-slate-900">Crear producto</h2>
                    <p class="mt-1 text-sm text-slate-500">
                        Cargá los datos principales y seleccioná una o más imágenes.
                    </p>
                </div>

                <form id="productForm" class="space-y-6">
                    <div class="grid gap-5 lg:grid-cols-2">
                        <div>
                            <label class="mb-1 block text-sm font-semibold text-slate-700">Categoría</label>
                            <select id="productParentCategoryId" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"></select>
                            <p id="productCategoryError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-semibold text-slate-700">Subcategoría</label>
                            <select id="productChildCategoryId" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"></select>
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-semibold text-slate-700">Nombre</label>
                            <input id="productName" type="text" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" placeholder="Ej: Remera titular" />
                            <p id="productNameError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-semibold text-slate-700">Precio</label>
                            <input id="productPrice" type="number" min="0" step="0.01" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" placeholder="0" />
                            <p id="productPriceError" class="mt-1 hidden text-sm text-rose-600"></p>
                        </div>
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-semibold text-slate-700">Descripción</label>
                        <textarea id="productDescription" rows="3" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" placeholder="Detalle del producto..."></textarea>
                    </div>

                    <div class="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                        <label class="flex items-center gap-3">
                            <input id="productAllowsPersonalization" type="checkbox" class="h-4 w-4" />
                            <span class="text-sm font-bold text-slate-700">Permite personalización</span>
                        </label>

                        <div id="productPersonalizationBox" class="mt-4 hidden grid gap-4 md:grid-cols-2">
                            <div>
                                <label class="mb-1 block text-sm font-semibold text-slate-700">Etiqueta</label>
                                <input id="productPersonalizationLabel" type="text" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" placeholder="Ej: Nombre en camiseta" />
                            </div>

                            <div>
                                <label class="mb-1 block text-sm font-semibold text-slate-700">Máximo caracteres</label>
                                <input id="productPersonalizationMaxLength" type="number" min="1" max="50" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" placeholder="Ej: 15" />
                            </div>
                        </div>
                    </div>

                    <div class="grid gap-4 md:grid-cols-4">
    <label class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
        <input id="productHasVariants" type="checkbox" class="h-4 w-4" />
        <span class="text-sm font-semibold text-slate-700">Tiene variantes</span>
    </label>

    <label class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
        <input id="productIsReservation" type="checkbox" class="h-4 w-4" />
        <span class="text-sm font-semibold text-slate-700">Es reserva</span>
    </label>

    <label class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
        <input id="productRequiresDeposit" type="checkbox" class="h-4 w-4" />
        <span class="text-sm font-semibold text-slate-700">Requiere seña</span>
    </label>

    <label class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
        <input id="productIsActive" type="checkbox" checked class="h-4 w-4" />
        <span class="text-sm font-semibold text-slate-700">Activo</span>
    </label>
</div>

<div id="variantsBox" class="hidden rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
    <div class="mb-3 flex items-center justify-between">
        <div>
            <h4 class="text-sm font-bold text-slate-900">Variantes</h4>
            <p class="text-xs text-slate-500">Ej: S, M, L, XL, Hombre, Mujer.</p>
        </div>

        <button
            type="button"
            id="addVariantBtn"
            class="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
        >
            + Agregar variante
        </button>
    </div>

    <div id="variantsList" class="space-y-2"></div>
</div>

                    <div id="depositBox" class="hidden rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                        <label class="mb-1 block text-sm font-semibold text-slate-700">Monto de seña</label>
                        <input id="productDepositAmount" type="number" min="0" step="0.01" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" placeholder="Ej: 5000" />
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
                            <div class="lg:w-72">
                                <label class="mb-2 block text-sm font-semibold text-slate-700">Imágenes</label>

                                <input
                                    id="productImages"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    class="w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600"
                                />

                                <p id="productImagesInfo" class="mt-2 text-xs text-slate-500">
                                    Podés seleccionar una o más imágenes.
                                </p>
                            </div>

                            <div class="flex-1">
                                <p class="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                                    Previsualización
                                </p>

                                <div id="productImagesPreview" class="flex min-h-[88px] flex-wrap gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-3">
                                    <span class="text-sm text-slate-400">
                                        Las imágenes seleccionadas aparecerán acá.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-2">
                        <button id="resetProductBtn" type="button" class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            Limpiar
                        </button>

                        <button id="saveProductBtn" type="submit" class="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                            Guardar producto
                        </button>
                    </div>
                </form>
            </section>

            <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div class="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">Listado de productos</h2>
                        <p class="mt-1 text-sm text-slate-500">Productos cargados para la empresa activa.</p>
                    </div>

                    <div class="grid gap-3 md:grid-cols-3 xl:w-[720px]">
                        <div>
                            <label class="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Buscar</label>
                            <input id="productSearchInput" type="text" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100" placeholder="Nombre..." />
                        </div>

                        <div>
                            <label class="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Categoría</label>
                            <select id="filterParentCategoryId" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"></select>
                        </div>

                        <div>
                            <label class="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Subcategoría</label>
                            <select id="filterChildCategoryId" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"></select>
                        </div>
                    </div>
                </div>

                <div id="productsList" class="grid gap-5 lg:grid-cols-2"></div>

                <div id="productsEmptyState" class="hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                    <p class="text-sm font-medium text-slate-500">No hay productos para mostrar.</p>
                </div>

                <div id="productsPagination" class="mt-6 hidden items-center justify-between gap-3">
                    <p id="productsPaginationInfo" class="text-sm text-slate-500"></p>

                    <div class="flex items-center gap-2">
                        <button id="productsPrevBtn" type="button" class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                            Anterior
                        </button>

                        <span id="productsPageIndicator" class="text-sm font-bold text-slate-700"></span>

                        <button id="productsNextBtn" type="button" class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                            Siguiente
                        </button>
                    </div>
                </div>
            </section>

            <div id="productModalRoot"></div>
        </section>
    `;
}

function setModal(html) {
    qs("productModalRoot").innerHTML = html;
}

function closeModal() {
    setModal("");
}

function showErrorModal(message) {
    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-xl">⚠️</div>
                <h3 class="text-xl font-black text-slate-900">Algo salió mal</h3>
                <p class="mt-2 text-sm leading-6 text-slate-500">${escapeHtml(message || "No se pudo completar la acción.")}</p>
                <button id="errorCloseBtn" type="button" class="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                    Entendido
                </button>
            </div>
        </div>
    `);

    qs("errorCloseBtn").addEventListener("click", closeModal);
}

function getParentCategories() {
    return categories.filter(x => !x.parentId);
}

function findParentById(parentId) {
    return categories.find(x => x.id === parentId);
}

function findParentByChildId(childId) {
    return categories.find(parent =>
        Array.isArray(parent.children) &&
        parent.children.some(child => child.id === childId)
    );
}

function getSelectedCategoryId(prefix = "product") {
    const parentId = qs(`${prefix}ParentCategoryId`)?.value || "";
    const childId = qs(`${prefix}ChildCategoryId`)?.value || "";
    return childId || parentId || "";
}

function renderParentSelect(selectId, selectedId = "", firstText = "Seleccionar categoría") {
    const select = qs(selectId);
    const parents = getParentCategories();

    select.innerHTML = `
        <option value="">${firstText}</option>
        ${parents.map(parent => `
            <option value="${parent.id}" ${selectedId === parent.id ? "selected" : ""}>
                ${escapeHtml(parent.name)}
            </option>
        `).join("")}
    `;
}

function renderChildSelect(parentId, selectId, selectedId = "", emptyText = "Seleccionar subcategoría") {
    const select = qs(selectId);
    const parent = findParentById(parentId);

    if (!parent || !Array.isArray(parent.children) || !parent.children.length) {
        select.innerHTML = `<option value="">Sin subcategorías</option>`;
        select.disabled = true;
        return;
    }

    select.disabled = false;
    select.innerHTML = `
        <option value="">${emptyText}</option>
        ${parent.children.map(child => `
            <option value="${child.id}" ${selectedId === child.id ? "selected" : ""}>
                ${escapeHtml(child.name)}
            </option>
        `).join("")}
    `;
}

function renderCreateCategorySelectors(product = null) {
    let parentId = "";
    let childId = "";

    if (product?.categoryId) {
        const parent = findParentById(product.categoryId);
        if (parent) {
            parentId = parent.id;
        } else {
            const parentOfChild = findParentByChildId(product.categoryId);
            parentId = parentOfChild?.id || "";
            childId = product.categoryId;
        }
    }

    renderParentSelect("productParentCategoryId", parentId);
    renderChildSelect(parentId, "productChildCategoryId", childId);
}

function renderFilterCategorySelectors() {
    renderParentSelect("filterParentCategoryId", qs("filterParentCategoryId")?.value || "", "Todas");
    renderChildSelect(
        qs("filterParentCategoryId")?.value || "",
        "filterChildCategoryId",
        qs("filterChildCategoryId")?.value || "",
        "Todas"
    );
}

function clearErrors() {
    ["productCategoryError", "productNameError", "productPriceError"].forEach(id => {
        qs(id).classList.add("hidden");
        qs(id).textContent = "";
    });
}

function showError(id, message) {
    qs(id).textContent = message;
    qs(id).classList.remove("hidden");
}

function validateProductForm() {
    clearErrors();

    let valid = true;

    if (!getSelectedCategoryId("product")) {
        showError("productCategoryError", "Seleccioná una categoría.");
        valid = false;
    }

    if (!qs("productName").value.trim()) {
        showError("productNameError", "El nombre es obligatorio.");
        valid = false;
    }

    if (Number(qs("productPrice").value || 0) <= 0) {
        showError("productPriceError", "El precio debe ser mayor a 0.");
        valid = false;
    }

    return valid;
}

function toggleDepositBox() {
    qs("depositBox").classList.toggle("hidden", !qs("productRequiresDeposit").checked);
}

function getCreatePayload() {
    const hasVariants = qs("productHasVariants").checked;

    return {
        categoryId: getSelectedCategoryId("product"),
        name: qs("productName").value.trim(),
        description: qs("productDescription").value.trim(),
        price: Number(qs("productPrice").value || 0),
        isReservation: qs("productIsReservation").checked,
        requiresDeposit: qs("productRequiresDeposit").checked,
        depositAmount: qs("productRequiresDeposit").checked
            ? Number(qs("productDepositAmount").value || 0)
            : null,

        tracksStock: false,
        stockQuantity: null,

        hasVariants: hasVariants,

        isActive: qs("productIsActive").checked,

        variants: hasVariants
            ? productVariants
                .filter(v => v.name.trim())
                .map(v => ({
                    name: v.name.trim(),
                    tracksStock: true,
                    stockQuantity: 0
                }))
            : [],

        allowsPersonalization: qs("productAllowsPersonalization").checked,
        personalizationLabel: qs("productAllowsPersonalization").checked
            ? qs("productPersonalizationLabel").value.trim()
            : null,
         personalizationMaxLength: qs("productAllowsPersonalization").checked
            ? Number(qs("productPersonalizationMaxLength").value || 30)
            : null
    };
}

function setProductFormLoading(loading) {
    isSavingProduct = loading;
    qs("saveProductBtn").disabled = loading;
    qs("resetProductBtn").disabled = loading;
    qs("saveProductBtn").textContent = loading ? "Guardando..." : "Guardar producto";
}

function resetProductForm() {
        qs("productForm").reset();
    qs("productIsActive").checked = true;
    qs("productAllowsPersonalization").checked = false;
    qs("productPersonalizationLabel").value = "";
    qs("productPersonalizationMaxLength").value = "";
    togglePersonalizationBox();

    productVariants = [];
    renderVariants();

    qs("variantsBox").classList.add("hidden");

    pendingCreateImages = [];
    syncProductImagesInput();

    qs("productImagesInfo").textContent = "Podés seleccionar una o más imágenes.";

    clearErrors();
    renderCreateCategorySelectors();
    toggleDepositBox();
    renderPendingImagesPreview();
}

function renderStats() {
    qs("statProducts").textContent = String(products.length);
    qs("statActiveProducts").textContent = String(products.filter(x => x.isActive).length);
    qs("statVariantProducts").textContent = String(products.filter(x => x.hasVariants).length);
}

function getMainImage(product) {
    return product.images?.find(x => x.isMain)?.imageUrl
        || product.images?.[0]?.imageUrl
        || "";
}

function renderVariants() {
    const list = qs("variantsList");
    if (!list) return;

    if (!productVariants.length) {
        list.innerHTML = `
            <div class="rounded-2xl border border-dashed border-orange-200 bg-white px-4 py-4 text-sm text-slate-500">
                Todavía no agregaste variantes.
            </div>
        `;
        return;
    }

    list.innerHTML = productVariants.map((variant, index) => `
        <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
            <input
                type="text"
                value="${escapeHtml(variant.name || "")}"
                data-variant-index="${index}"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                placeholder="Ej: S, M, L, XL"
            />

            <button
                type="button"
                data-remove-variant="${index}"
                class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
            >
                Eliminar
            </button>
        </div>
    `).join("");

    list.querySelectorAll("[data-variant-index]").forEach(input => {
        input.addEventListener("input", event => {
            const index = Number(event.target.dataset.variantIndex);
            productVariants[index].name = event.target.value;
        });
    });

    list.querySelectorAll("[data-remove-variant]").forEach(button => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.removeVariant);
            productVariants.splice(index, 1);
            renderVariants();
        });
    });
}

function getFilteredProducts() {
    const search = (qs("productSearchInput")?.value || "").trim().toLowerCase();
    const parentId = qs("filterParentCategoryId")?.value || "";
    const childId = qs("filterChildCategoryId")?.value || "";

    return products.filter(product => {
        const matchesSearch =
            !search ||
            product.name?.toLowerCase().includes(search) ||
            product.description?.toLowerCase().includes(search) ||
            product.categoryName?.toLowerCase().includes(search);

        if (!matchesSearch) return false;

        if (childId) return product.categoryId === childId;

        if (parentId) {
            if (product.categoryId === parentId) return true;

            const parent = findParentById(parentId);
            const childIds = parent?.children?.map(x => x.id) || [];
            return childIds.includes(product.categoryId);
        }

        return true;
    });
}

function getPagedProducts() {
    const filtered = getFilteredProducts();
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    return {
        items: filtered.slice(start, end),
        total,
        totalPages,
        start,
        end: Math.min(end, total)
    };
}

function renderProductsPagination() {
    const wrap = qs("productsPagination");
    const info = qs("productsPaginationInfo");
    const indicator = qs("productsPageIndicator");
    const prevBtn = qs("productsPrevBtn");
    const nextBtn = qs("productsNextBtn");

    const { total, totalPages, start, end } = getPagedProducts();

    if (!total) {
        wrap.classList.add("hidden");
        wrap.classList.remove("flex");
        return;
    }

    wrap.classList.remove("hidden");
    wrap.classList.add("flex");

    info.textContent = `Mostrando ${start + 1}-${end} de ${total} productos`;
    indicator.textContent = `Página ${currentPage} de ${totalPages}`;

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function renderProductImages(product) {
    const images = Array.isArray(product.images) ? product.images : [];

    if (!images.length) {
        return `<div class="mt-3 text-xs text-slate-400">Sin imágenes cargadas</div>`;
    }

    return `
        <div class="mt-3 flex flex-wrap gap-2">
            ${images.slice(0, 5).map(image => `
                <img src="${image.imageUrl}" class="h-12 w-12 rounded-xl border border-slate-200 object-cover" />
            `).join("")}
            ${images.length > 5 ? `<span class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">+${images.length - 5}</span>` : ""}
        </div>
    `;
}

function renderProductsList() {
    const list = qs("productsList");
    const empty = qs("productsEmptyState");
    const { items } = getPagedProducts();

    if (!items.length) {
        list.innerHTML = "";
        empty.classList.remove("hidden");
        renderProductsPagination();
        return;
    }

    empty.classList.add("hidden");

    list.innerHTML = items.map(product => {
        const img = getMainImage(product);

        return `
            <div class="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
                <div class="flex flex-col gap-4 p-5 md:flex-row">
                    <div class="h-32 w-full overflow-hidden rounded-2xl bg-slate-100 md:w-36">
                        ${
                            img
                                ? `<img src="${img}" class="h-full w-full object-cover" />`
                                : `<div class="flex h-full w-full items-center justify-center text-3xl">👕</div>`
                        }
                    </div>

                    <div class="min-w-0 flex-1">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 class="text-lg font-black text-slate-900">${escapeHtml(product.name)}</h3>
                                <p class="mt-1 text-sm text-slate-500">${escapeHtml(product.categoryName || "-")}</p>
                                <p class="mt-2 text-sm text-slate-600">${escapeHtml(product.description || "")}</p>
                            </div>

                            <div class="flex flex-wrap gap-2 sm:justify-end">
                                <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">${money(product.price)}</span>
                                ${product.isActive
                                    ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Activo</span>`
                                    : `<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Inactivo</span>`
                                }
                            </div>
                        </div>

                        <div class="mt-4 flex flex-wrap gap-2">
                            ${product.hasVariants ? `<span class="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">Tiene variantes</span>` : ""}
                            ${product.tracksStock ? `<span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Controla stock</span>` : ""}
                            ${product.requiresDeposit ? `<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Seña: ${money(product.depositAmount)}</span>` : ""}
                            ${product.allowsPersonalization ? `<span class="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">Personalizable</span>` : ""}
                        </div>

                        ${renderProductImages(product)}

                        <div class="mt-5 flex flex-wrap gap-2">
                            <button type="button" data-id="${product.id}" class="edit-product-btn rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition hover:bg-orange-100">
                                Editar
                            </button>

                            <button type="button" data-id="${product.id}" class="delete-product-btn rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60" ${deletingProductId === product.id ? "disabled" : ""}>
                                ${deletingProductId === product.id ? "Eliminando..." : "Eliminar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    list.querySelectorAll(".edit-product-btn").forEach(btn => {
        btn.addEventListener("click", () => openEditProductModal(btn.dataset.id));
    });

    list.querySelectorAll(".delete-product-btn").forEach(btn => {
        btn.addEventListener("click", () => openDeleteProductModal(btn.dataset.id));
    });

    renderProductsPagination();
}

function buildEditVariantsManager(product) {
    const variants = Array.isArray(product.variants) ? product.variants : [];

    return `
        <div class="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
            <div class="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h4 class="text-sm font-bold text-slate-900">Variantes</h4>
                    <p class="text-xs text-slate-500">
                        Acá configurás talles o variantes. El stock se ajusta después desde Stock.
                    </p>
                </div>

                <button
                    type="button"
                    id="editAddVariantBtn"
                    class="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                >
                    + Agregar variante
                </button>
            </div>

            <div id="editVariantsList" class="space-y-2">
                ${
                    variants.length
                        ? variants.map((variant, index) => `
                            <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
                                <input
                                    type="text"
                                    value="${escapeHtml(variant.name || "")}"
                                    data-edit-variant-index="${index}"
                                    class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                                    placeholder="Ej: S, M, L, XL"
                                />

                                <button
                                    type="button"
                                    data-remove-edit-variant="${index}"
                                    class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                                >
                                    Eliminar
                                </button>
                            </div>
                        `).join("")
                        : `
                            <div class="rounded-2xl border border-dashed border-orange-200 bg-white px-4 py-4 text-sm text-slate-500">
                                Este producto todavía no tiene variantes.
                            </div>
                        `
                }
            </div>
        </div>
    `;
}

function buildImagesManager(product) {
    const images = Array.isArray(product.images) ? product.images : [];

    return `
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h4 class="text-sm font-bold text-slate-900">Imágenes</h4>
                    <p class="text-xs text-slate-500">Agregá, eliminá o marcá la principal.</p>
                </div>

                <label class="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">
                    Agregar imágenes
                    <input id="editImagesInput" type="file" accept="image/*" multiple class="hidden" />
                </label>
            </div>

            ${
                images.length
                    ? `
                        <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                            ${images.map(image => `
                                <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                    <img src="${image.imageUrl}" class="h-32 w-full object-cover" />

                                    <div class="space-y-2 p-3">
                                        ${image.isMain
                                            ? `<span class="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Principal</span>`
                                            : `<button type="button" data-image-id="${image.id}" class="set-main-image-btn w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Marcar principal</button>`
                                        }

                                        <button type="button" data-image-id="${image.id}" class="delete-image-btn w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                                            Eliminar imagen
                                        </button>
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    `
                    : `<div class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">Este producto todavía no tiene imágenes.</div>`
            }
        </div>
    `;
}

function buildEditModal(product) {
    let parentId = "";
    let childId = "";

    const parent = findParentById(product.categoryId);

    if (parent) {
        parentId = parent.id;
    } else {
        const parentOfChild = findParentByChildId(product.categoryId);
        parentId = parentOfChild?.id || "";
        childId = product.categoryId;
    }

    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div class="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h3 class="text-xl font-black text-slate-900">Editar producto</h3>
                        <p class="mt-1 text-sm text-slate-500">${escapeHtml(product.name)}</p>
                    </div>

                    <button id="modalCloseBtn" type="button" class="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
                        Cerrar
                    </button>
                </div>

                <form id="editProductForm" class="space-y-5">
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="mb-1 block text-sm font-semibold text-slate-700">Categoría</label>
                            <select id="editParentCategoryId" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"></select>
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-semibold text-slate-700">Subcategoría</label>
                            <select id="editChildCategoryId" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"></select>
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-semibold text-slate-700">Nombre</label>
                            <input id="editName" type="text" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" value="${escapeHtml(product.name || "")}" />
                        </div>

                        <div>
                            <label class="mb-1 block text-sm font-semibold text-slate-700">Precio</label>
                            <input id="editPrice" type="number" min="0" step="0.01" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" value="${product.price ?? ""}" />
                        </div>
                    </div>

                    <div>
                        <label class="mb-1 block text-sm font-semibold text-slate-700">Descripción</label>
                        <textarea id="editDescription" rows="3" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm">${escapeHtml(product.description || "")}</textarea>
                    </div>

<div class="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
    <label class="flex items-center gap-3">
        <input id="editAllowsPersonalization" type="checkbox" class="h-4 w-4"
            ${product.allowsPersonalization ? "checked" : ""} />
        <span class="text-sm font-bold text-slate-700">Permite personalización</span>
    </label>

    <div id="editPersonalizationBox" class="mt-4 grid gap-4 md:grid-cols-2 ${product.allowsPersonalization ? "" : "hidden"}">
        <div>
            <label class="mb-1 block text-sm font-semibold text-slate-700">Etiqueta</label>
            <input id="editPersonalizationLabel" type="text"
                value="${escapeHtml(product.personalizationLabel || "")}"
                class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" />
        </div>

        <div>
            <label class="mb-1 block text-sm font-semibold text-slate-700">Máximo caracteres</label>
            <input id="editPersonalizationMaxLength" type="number" min="1" max="50"
                value="${product.personalizationMaxLength ?? ""}"
                class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" />
        </div>
    </div>
</div>

                    <div class="grid gap-3 md:grid-cols-3">
                        <label class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                            <input id="editIsReservation" type="checkbox" class="h-4 w-4" ${product.isReservation ? "checked" : ""} />
                            <span class="text-sm font-semibold text-slate-700">Es reserva</span>
                        </label>

                        <label class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                            <input id="editRequiresDeposit" type="checkbox" class="h-4 w-4" ${product.requiresDeposit ? "checked" : ""} />
                            <span class="text-sm font-semibold text-slate-700">Requiere seña</span>
                        </label>

                        <label class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                            <input id="editIsActive" type="checkbox" class="h-4 w-4" ${product.isActive ? "checked" : ""} />
                            <span class="text-sm font-semibold text-slate-700">Activo</span>
                        </label>
                    </div>

                    <div id="editDepositBox" class="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                        <label class="mb-1 block text-sm font-semibold text-slate-700">Monto de seña</label>
                        <input id="editDepositAmount" type="number" min="0" step="0.01" class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" value="${product.depositAmount ?? ""}" />
                    </div>
                    ${buildEditVariantsManager(product)}
                    ${buildImagesManager(product)}

                    <div class="flex justify-end gap-3">
                        <button id="editCancelBtn" type="button" class="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700">
                            Cancelar
                        </button>

                        <button type="submit" class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `);

    renderParentSelect("editParentCategoryId", parentId);
    renderChildSelect(parentId, "editChildCategoryId", childId);

    qs("modalCloseBtn").addEventListener("click", closeModal);
    qs("editCancelBtn").addEventListener("click", closeModal);

    qs("editParentCategoryId").addEventListener("change", () => {
        renderChildSelect(qs("editParentCategoryId").value, "editChildCategoryId");
    });

    qs("editRequiresDeposit").addEventListener("change", () => {
        qs("editDepositBox").classList.toggle("hidden", !qs("editRequiresDeposit").checked);
    });

    qs("editDepositBox").classList.toggle("hidden", !qs("editRequiresDeposit").checked);

    qs("editProductForm").addEventListener("submit", async event => {
        event.preventDefault();
        await saveEditProduct(product.id);
    });

    qs("editImagesInput").addEventListener("change", async event => {
        const files = [...(event.target.files || [])];
        if (!files.length) return;

        await uploadProductImages(product.id, files);
        const refreshed = products.find(x => x.id === product.id);
        if (refreshed) buildEditModal(refreshed);
    });

    qs("editAllowsPersonalization").addEventListener("change", () => {
    const enabled = qs("editAllowsPersonalization").checked;
    qs("editPersonalizationBox").classList.toggle("hidden", !enabled);
});

    document.querySelectorAll(".delete-image-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await deleteProductImage(product.id, btn.dataset.imageId);
            const refreshed = products.find(x => x.id === product.id);
            if (refreshed) buildEditModal(refreshed);
        });
    });

    document.querySelectorAll(".set-main-image-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            await setMainProductImage(product.id, btn.dataset.imageId);
            const refreshed = products.find(x => x.id === product.id);
            if (refreshed) buildEditModal(refreshed);
        });
    });

    let editVariants = Array.isArray(product.variants)
    ? product.variants.map(v => ({
        name: v.name || "",
        tracksStock: v.tracksStock === true,
        stockQuantity: v.tracksStock ? Number(v.stockQuantity ?? 0) : null
    }))
    : [];

function renderEditVariants() {
    const list = qs("editVariantsList");
    if (!list) return;

    if (!editVariants.length) {
        list.innerHTML = `
            <div class="rounded-2xl border border-dashed border-orange-200 bg-white px-4 py-4 text-sm text-slate-500">
                Este producto todavía no tiene variantes.
            </div>
        `;
        return;
    }

    list.innerHTML = editVariants.map((variant, index) => `
        <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
            <input
                type="text"
                value="${escapeHtml(variant.name || "")}"
                data-edit-variant-index="${index}"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                placeholder="Ej: S, M, L, XL"
            />

            <button
                type="button"
                data-remove-edit-variant="${index}"
                class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
            >
                Eliminar
            </button>
        </div>
    `).join("");

    list.querySelectorAll("[data-edit-variant-index]").forEach(input => {
        input.addEventListener("input", event => {
            const index = Number(event.target.dataset.editVariantIndex);
            editVariants[index].name = event.target.value;
        });
    });

    list.querySelectorAll("[data-remove-edit-variant]").forEach(button => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.removeEditVariant);
            editVariants.splice(index, 1);
            renderEditVariants();
        });
    });
}

qs("editAddVariantBtn").addEventListener("click", () => {
    editVariants.push({
        name: "",
        tracksStock: false,
        stockQuantity: null
    });

    renderEditVariants();
});

qs("editProductForm").dataset.variants = "ready";
qs("editProductForm")._editVariants = editVariants;
}

async function saveEditProduct(productId) {
    const product = products.find(x => x.id === productId);
    if (!product) return;

    const form = qs("editProductForm");
    const editVariants = form._editVariants || [];

    const cleanVariants = editVariants
        .filter(v => v.name.trim())
        .map(v => ({
            name: v.name.trim(),
            tracksStock: v.tracksStock === true,
            stockQuantity: v.tracksStock ? Number(v.stockQuantity ?? 0) : null
        }));

    const hasVariants = cleanVariants.length > 0;

    const payload = {
        categoryId: qs("editChildCategoryId").value || qs("editParentCategoryId").value,
        name: qs("editName").value.trim(),
        description: qs("editDescription").value.trim(),
        price: Number(qs("editPrice").value || 0),
        isReservation: qs("editIsReservation").checked,
        requiresDeposit: qs("editRequiresDeposit").checked,
        depositAmount: qs("editRequiresDeposit").checked
            ? Number(qs("editDepositAmount").value || 0)
            : null,

        tracksStock: hasVariants ? false : product.tracksStock,
        stockQuantity: hasVariants ? null : product.stockQuantity,

        hasVariants,
        allowsPersonalization: qs("editAllowsPersonalization").checked,
        personalizationLabel: qs("editAllowsPersonalization").checked
            ? qs("editPersonalizationLabel").value.trim()
            : null,
        personalizationMaxLength: qs("editAllowsPersonalization").checked
            ? Number(qs("editPersonalizationMaxLength").value || 30)
            : null,
        isActive: qs("editIsActive").checked,
        variants: cleanVariants
    };

    try {
        await put(`/api/admin/${company.slug}/clothing/products/${productId}`, payload);
        closeModal();
        await loadProducts();
    } catch (error) {
        showErrorModal(error?.message || "No se pudo actualizar el producto.");
    }
}

function renderPendingImagesPreview() {
    const preview = qs("productImagesPreview");
    if (!preview) return;

    if (!pendingCreateImages.length) {
        preview.innerHTML = `
            <span class="text-sm text-slate-400">
                Las imágenes seleccionadas aparecerán acá.
            </span>
        `;
        return;
    }

    preview.innerHTML = pendingCreateImages.map((file, index) => {
        const url = URL.createObjectURL(file);

        return `
            <div class="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img src="${url}" class="h-full w-full object-cover" />

                <button
                    type="button"
                    data-index="${index}"
                    class="remove-pending-image-btn absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow"
                >
                    ×
                </button>
            </div>
        `;
    }).join("");

    preview.querySelectorAll(".remove-pending-image-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const index = Number(btn.dataset.index);

            pendingCreateImages.splice(index, 1);

            qs("productImagesInfo").textContent = pendingCreateImages.length
                ? `${pendingCreateImages.length} imagen(es) seleccionada(s).`
                : "Podés seleccionar una o más imágenes.";

            syncProductImagesInput();
            renderPendingImagesPreview();
        });
    });
}

function openEditProductModal(productId) {
    const product = products.find(x => x.id === productId);
    if (!product) return;
    buildEditModal(product);
}

function openDeleteProductModal(productId) {
    const product = products.find(x => x.id === productId);
    if (!product) return;

    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-xl">⚠️</div>
                <h3 class="text-xl font-black text-slate-900">Eliminar producto</h3>
                <p class="mt-2 text-sm leading-6 text-slate-500">
                    Vas a eliminar "${escapeHtml(product.name)}". También se eliminarán sus imágenes.
                </p>

                <div class="mt-6 flex gap-3">
                    <button id="deleteCancelBtn" type="button" class="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700">
                        Cancelar
                    </button>

                    <button id="deleteConfirmBtn" type="button" class="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white">
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    `);

    qs("deleteCancelBtn").addEventListener("click", closeModal);
    qs("deleteConfirmBtn").addEventListener("click", async () => {
        closeModal();
        await deleteProduct(productId);
    });
}

async function loadCategories() {
    categories = await get(`/api/admin/${company.slug}/clothing/categories`);
    renderCreateCategorySelectors();
    renderFilterCategorySelectors();
}

async function loadProducts() {
    products = await get(`/api/admin/${company.slug}/clothing/products`);
    renderStats();
    renderProductsList();
}

async function saveProduct(event) {
    event.preventDefault();

    if (isSavingProduct) return;
    if (!validateProductForm()) return;

    try {
        setProductFormLoading(true);

        const product = await post(`/api/admin/${company.slug}/clothing/products`, getCreatePayload());

        if (pendingCreateImages.length) {
            await uploadProductImages(product.id, pendingCreateImages, false);
        }

        resetProductForm();
        await loadProducts();
    } catch (error) {
        showErrorModal(error?.message || "No se pudo guardar el producto.");
    } finally {
        setProductFormLoading(false);
    }
}

async function uploadProductImages(productId, files, reload = true) {
    try {
        for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);

            await postForm(`/api/admin/${company.slug}/clothing/products/${productId}/images`, formData);
        }

        if (reload) await loadProducts();
    } catch (error) {
        showErrorModal(error?.message || "No se pudieron subir las imágenes.");
    }
}

async function deleteProductImage(productId, imageId) {
    try {
        await del(`/api/admin/${company.slug}/clothing/products/${productId}/images/${imageId}`);
        await loadProducts();
    } catch (error) {
        showErrorModal(error?.message || "No se pudo eliminar la imagen.");
    }
}

async function setMainProductImage(productId, imageId) {
    try {
        await post(`/api/admin/${company.slug}/clothing/products/${productId}/images/${imageId}/main`, {});
        await loadProducts();
    } catch (error) {
        showErrorModal(error?.message || "No se pudo marcar la imagen principal.");
    }
}

async function deleteProduct(productId) {
    try {
        deletingProductId = productId;
        renderProductsList();

        await del(`/api/admin/${company.slug}/clothing/products/${productId}`);
        await loadProducts();
    } catch (error) {
        showErrorModal(error?.message || "No se pudo eliminar el producto.");
        await loadProducts();
    } finally {
        deletingProductId = null;
        renderProductsList();
    }
}

function goPrevPage() {
    if (currentPage <= 1) return;
    currentPage -= 1;
    renderProductsList();
}

function goNextPage() {
    const { totalPages } = getPagedProducts();
    if (currentPage >= totalPages) return;
    currentPage += 1;
    renderProductsList();
}

function syncProductImagesInput() {
    const input = qs("productImages");
    if (!input) return;

    const dataTransfer = new DataTransfer();

    pendingCreateImages.forEach(file => {
        dataTransfer.items.add(file);
    });

    input.files = dataTransfer.files;
}

async function init() {
    await loadConfig();
    requireAuth();

    qs("app").innerHTML = renderAdminLayout({
        activeKey: "clothing",
        pageTitle: "Productos de indumentaria",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            resetProductForm();
            await loadCategories();
            await loadProducts();
        }
    });

qs("addVariantBtn").addEventListener("click", () => {
    productVariants.push({
        name: "",
        tracksStock: true,
        stockQuantity: 0
    });

    renderVariants();
});

    company = layout.activeCompany;

    qs("backToClothingBtn").addEventListener("click", goBackToClothing);
    qs("productForm").addEventListener("submit", saveProduct);
    qs("resetProductBtn").addEventListener("click", resetProductForm);

qs("productImages").addEventListener("change", event => {
    const selectedFiles = [...(event.target.files || [])];

    selectedFiles.forEach(file => {
        const alreadyExists = pendingCreateImages.some(existing =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        );

        if (!alreadyExists) {
            pendingCreateImages.push(file);
        }
    });

    qs("productImagesInfo").textContent = pendingCreateImages.length
        ? `${pendingCreateImages.length} imagen(es) seleccionada(s).`
        : "Podés seleccionar una o más imágenes.";

    syncProductImagesInput();
    renderPendingImagesPreview();
});

    qs("productParentCategoryId").addEventListener("change", () => {
        renderChildSelect(qs("productParentCategoryId").value, "productChildCategoryId");
    });

    qs("productRequiresDeposit").addEventListener("change", toggleDepositBox);
    qs("productAllowsPersonalization").addEventListener("change", togglePersonalizationBox);

    qs("productHasVariants").addEventListener("change", () => {
    const enabled = qs("productHasVariants").checked;

    qs("variantsBox").classList.toggle("hidden", !enabled);

    if (!enabled) {
        productVariants = [];
        renderVariants();
    }
});

    qs("productSearchInput").addEventListener("input", () => {
        currentPage = 1;
        renderProductsList();
    });

    qs("filterParentCategoryId").addEventListener("change", () => {
        currentPage = 1;
        renderChildSelect(qs("filterParentCategoryId").value, "filterChildCategoryId", "", "Todas");
        renderProductsList();
    });

    qs("filterChildCategoryId").addEventListener("change", () => {
        currentPage = 1;
        renderProductsList();
    });

    qs("productsPrevBtn").addEventListener("click", goPrevPage);
    qs("productsNextBtn").addEventListener("click", goNextPage);

    await loadCategories();
    await loadProducts();

    toggleDepositBox();
    togglePersonalizationBox();
}

init();