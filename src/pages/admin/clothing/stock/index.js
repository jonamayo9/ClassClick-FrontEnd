import { get, patch } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../../shared/js/admin-layout.js";

let company = null;
let products = [];
let searchText = "";

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

function buildContent() {
    return `
        <section class="space-y-7">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Indumentaria</p>
                        <h1 class="mt-2 text-3xl font-bold">Stock</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Controlá disponibilidad por producto o por variante.
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
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Con variantes</p>
                            <p id="statVariants" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Sin stock</p>
                            <p id="statOutStock" class="mt-2 text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">Control de stock</h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Editá stock sin tocar precio, categoría ni datos comerciales del producto.
                        </p>
                    </div>

                    <div class="w-full lg:w-80">
                        <label class="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                            Buscar
                        </label>
                        <input
                            id="stockSearchInput"
                            type="text"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                            placeholder="Producto o variante..."
                        />
                    </div>
                </div>

                <div id="stockList" class="space-y-5"></div>

                <div id="stockEmptyState" class="hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                    <p class="text-sm font-medium text-slate-500">No hay productos para mostrar.</p>
                </div>
            </section>

            <div id="stockModalRoot"></div>
        </section>
    `;
}

function stockBadgeHtml(tracksStock, quantity) {
    if (!tracksStock) {
        return `<span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Disponible siempre</span>`;
    }

    const qty = Number(quantity ?? 0);

    if (qty <= 0) {
        return `<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Sin stock</span>`;
    }

    if (qty <= 5) {
        return `<span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Stock bajo: ${qty}</span>`;
    }

    return `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Stock: ${qty}</span>`;
}

function getMainImage(product) {
    return product.images?.find(x => x.isMain)?.imageUrl
        || product.images?.[0]?.imageUrl
        || "";
}

function getFilteredProducts() {
    const text = searchText.trim().toLowerCase();

    if (!text) return products;

    return products.filter(product => {
        const productMatch =
            product.name?.toLowerCase().includes(text) ||
            product.categoryName?.toLowerCase().includes(text);

        const variantMatch = product.variants?.some(v =>
            v.name?.toLowerCase().includes(text)
        );

        return productMatch || variantMatch;
    });
}

function countOutOfStock() {
    let total = 0;

    products.forEach(product => {
        if (product.hasVariants) {
            product.variants?.forEach(variant => {
                if (variant.tracksStock && Number(variant.stockQuantity ?? 0) <= 0) total++;
            });
        } else {
            if (product.tracksStock && Number(product.stockQuantity ?? 0) <= 0) total++;
        }
    });

    return total;
}

function renderStats() {
    qs("statProducts").textContent = String(products.length);
    qs("statVariants").textContent = String(products.filter(x => x.hasVariants).length);
    qs("statOutStock").textContent = String(countOutOfStock());
}

function renderStockList() {
    const list = qs("stockList");
    const empty = qs("stockEmptyState");
    const filtered = getFilteredProducts();

    if (!filtered.length) {
        list.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    list.innerHTML = filtered.map(product => {
        const img = getMainImage(product);

        return `
            <article class="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
                <div class="border-b border-slate-200 p-5">
                    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div class="flex items-center gap-4">
                            <div class="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                                ${
                                    img
                                        ? `<img src="${img}" class="h-full w-full object-cover" />`
                                        : `<div class="flex h-full w-full items-center justify-center text-2xl">👕</div>`
                                }
                            </div>

                            <div>
                                <h3 class="text-lg font-black text-slate-900">${escapeHtml(product.name)}</h3>
                                <p class="mt-1 text-sm text-slate-500">${escapeHtml(product.categoryName || "-")}</p>
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-2">
                            ${
                                product.hasVariants
                                    ? `<span class="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">Stock por variantes</span>`
                                    : stockBadgeHtml(product.tracksStock, product.stockQuantity)
                            }

                            ${
                                product.isActive
                                    ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Activo</span>`
                                    : `<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Inactivo</span>`
                            }
                        </div>
                    </div>
                </div>

                ${
                    product.hasVariants
                        ? renderVariantStockRows(product)
                        : renderProductStockRow(product)
                }
            </article>
        `;
    }).join("");

    bindStockEvents();
}

function renderProductStockRow(product) {
    return `
        <div class="p-5">
            <div class="grid gap-4 md:grid-cols-[1fr_180px_150px] md:items-end">
                <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <input
                        id="trackProduct_${product.id}"
                        type="checkbox"
                        class="h-4 w-4"
                        ${product.tracksStock ? "checked" : ""}
                    />
                    <span class="text-sm font-semibold text-slate-700">
                        Controla stock
                    </span>
                </label>

                <div>
                    <label class="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                        Cantidad
                    </label>
                    <input
                        id="stockProduct_${product.id}"
                        type="number"
                        min="0"
                        value="${product.stockQuantity ?? 0}"
                        class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    />
                </div>

                <button
                    type="button"
                    data-save-product-stock="${product.id}"
                    class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                    Guardar
                </button>
            </div>
        </div>
    `;
}

function renderVariantStockRows(product) {
    const variants = Array.isArray(product.variants) ? product.variants : [];

    if (!variants.length) {
        return `
            <div class="p-5">
                <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                    Este producto no tiene variantes cargadas.
                </div>
            </div>
        `;
    }

    return `
        <div class="p-5">
            <div class="mb-3 flex items-center justify-between gap-3">
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Variantes</p>
                <p class="text-xs text-slate-500">${variants.length} variante(s)</p>
            </div>

            <div class="grid gap-3">
                ${variants.map(variant => `
                    <div class="rounded-2xl border border-slate-200 bg-white p-4">
                        <div class="grid gap-4 lg:grid-cols-[1fr_150px_150px_120px] lg:items-end">
                            <div>
                                <div class="flex flex-wrap items-center gap-2">
                                    <h4 class="text-base font-black text-slate-900">${escapeHtml(variant.name)}</h4>
                                    ${stockBadgeHtml(variant.tracksStock, variant.stockQuantity)}
                                    ${
                                        variant.isActive
                                            ? `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Activa</span>`
                                            : `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Inactiva</span>`
                                    }
                                </div>

                                <div class="mt-3 flex flex-wrap gap-3">
                                    <label class="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <input
                                            id="trackVariant_${variant.id}"
                                            type="checkbox"
                                            class="h-4 w-4"
                                            ${variant.tracksStock ? "checked" : ""}
                                        />
                                        Controla stock
                                    </label>

                                    <label class="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <input
                                            id="activeVariant_${variant.id}"
                                            type="checkbox"
                                            class="h-4 w-4"
                                            ${variant.isActive ? "checked" : ""}
                                        />
                                        Activa
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label class="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                                    Cantidad
                                </label>
                                <input
                                    id="stockVariant_${variant.id}"
                                    type="number"
                                    min="0"
                                    value="${variant.stockQuantity ?? 0}"
                                    class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                                />
                            </div>

                            <button
                                type="button"
                                data-save-variant-stock="${variant.id}"
                                data-product-id="${product.id}"
                                class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

function setModal(html) {
    qs("stockModalRoot").innerHTML = html;
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

function bindStockEvents() {
    document.querySelectorAll("[data-save-product-stock]").forEach(button => {
        button.addEventListener("click", async () => {
            const productId = button.dataset.saveProductStock;
            await saveProductStock(productId);
        });
    });

    document.querySelectorAll("[data-save-variant-stock]").forEach(button => {
        button.addEventListener("click", async () => {
            const variantId = button.dataset.saveVariantStock;
            const productId = button.dataset.productId;
            await saveVariantStock(productId, variantId);
        });
    });
}

async function saveProductStock(productId) {
    const tracksStock = qs(`trackProduct_${productId}`).checked;
    const stockQuantity = Number(qs(`stockProduct_${productId}`).value || 0);

    try {
        await patch(`/api/admin/${company.slug}/clothing/products/${productId}/stock`, {
            tracksStock,
            stockQuantity: tracksStock ? stockQuantity : null
        });

        await loadProducts();
    } catch (error) {
        showErrorModal(error?.message || "No se pudo actualizar el stock.");
    }
}

async function saveVariantStock(productId, variantId) {
    const tracksStock = qs(`trackVariant_${variantId}`).checked;
    const stockQuantity = Number(qs(`stockVariant_${variantId}`).value || 0);
    const isActive = qs(`activeVariant_${variantId}`).checked;

    try {
        await patch(`/api/admin/${company.slug}/clothing/products/${productId}/variants/${variantId}/stock`, {
            tracksStock,
            stockQuantity: tracksStock ? stockQuantity : null,
            isActive
        });

        await loadProducts();
    } catch (error) {
        showErrorModal(error?.message || "No se pudo actualizar el stock de la variante.");
    }
}

async function loadProducts() {
    products = await get(`/api/admin/${company.slug}/clothing/products`);
    renderStats();
    renderStockList();
}

async function init() {
    await loadConfig();
    requireAuth();

    qs("app").innerHTML = renderAdminLayout({
        activeKey: "clothing",
        pageTitle: "Stock",
        contentHtml: buildContent()
    });

    const layout = await setupAdminLayout({
        onCompanyChanged: async selectedCompany => {
            company = selectedCompany;
            await loadProducts();
        }
    });

    company = layout.activeCompany;

    qs("backToClothingBtn").addEventListener("click", goBackToClothing);

    qs("stockSearchInput").addEventListener("input", event => {
        searchText = event.target.value || "";
        renderStockList();
    });

    await loadProducts();
}

init();