import { get, patch } from "../../../../shared/js/api.js";
import { loadConfig } from "../../../../shared/js/config.js";
import { requireAuth } from "../../../../shared/js/session.js";
import { renderAdminLayout, setupAdminLayout } from "../../../../shared/js/admin-layout.js";

let company = null;
let products = [];
let searchText = "";
let expandedProductIds = new Set();

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
        <section class="space-y-6">
            <section class="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-6 text-white shadow-sm">
                <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-slate-300">Indumentaria</p>
                        <h1 class="mt-2 text-3xl font-bold">Stock</h1>
                        <p class="mt-2 text-sm text-slate-300">
                            Controlá disponibilidad por producto o variante.
                        </p>

                        <button id="backToClothingBtn" type="button"
                            class="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">
                            ← Volver a indumentaria
                        </button>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Productos</p>
                            <p id="statProducts" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Variantes</p>
                            <p id="statVariants" class="mt-2 text-2xl font-bold">0</p>
                        </div>

                        <div class="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-slate-300">Sin stock</p>
                            <p id="statOutStock" class="mt-2 text-2xl font-bold">0</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div class="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">Control de stock</h2>
                        <p class="mt-1 text-sm text-slate-500">
                            Si no controla stock, queda disponible siempre.
                        </p>
                    </div>

                    <div class="w-full lg:w-80">
                        <label class="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                            Buscar
                        </label>
                        <input id="stockSearchInput" type="text"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                            placeholder="Producto, categoría o variante..." />
                    </div>
                </div>

                <div class="overflow-hidden rounded-3xl border border-slate-200">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-slate-200 text-sm">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Producto</th>
                                    <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Categoría</th>
                                    <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Tipo</th>
                                    <th class="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">Estado</th>
                                    <th class="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-500">Acción</th>
                                </tr>
                            </thead>

                            <tbody id="stockRows" class="divide-y divide-slate-100 bg-white"></tbody>
                        </table>
                    </div>
                </div>

                <div id="stockEmptyState" class="hidden rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                    <p class="text-sm font-medium text-slate-500">No hay productos para mostrar.</p>
                </div>
            </section>

            <div id="stockModalRoot"></div>
        </section>
    `;
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

function statusBadge(tracksStock, stockQuantity, isActive = true) {
    if (!isActive) {
        return `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Inactivo</span>`;
    }

    if (!tracksStock) {
        return `<span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Disponible siempre</span>`;
    }

    const qty = Number(stockQuantity ?? 0);

    if (qty <= 0) {
        return `<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Sin stock</span>`;
    }

    return `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Disponible</span>`;
}

function getProductStatus(product) {
    if (!product.isActive) {
        return statusBadge(false, null, false);
    }

    if (product.hasVariants) {
        const variants = product.variants || [];

        if (!variants.length) {
            return `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Sin variantes</span>`;
        }

        const activeVariants = variants.filter(v => v.isActive);

        if (!activeVariants.length) {
            return `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Variantes inactivas</span>`;
        }

        const hasAlwaysAvailable = activeVariants.some(v => !v.tracksStock);
        const hasStock = activeVariants.some(v => v.tracksStock && Number(v.stockQuantity ?? 0) > 0);

        if (hasAlwaysAvailable) {
            return `<span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Alguna disponible siempre</span>`;
        }

        if (hasStock) {
            return `<span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Con stock</span>`;
        }

        return `<span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">Sin stock</span>`;
    }

    return statusBadge(product.tracksStock, product.stockQuantity, product.isActive);
}

function countOutOfStock() {
    let total = 0;

    products.forEach(product => {
        if (!product.isActive) return;

        if (product.hasVariants) {
            (product.variants || []).forEach(variant => {
                if (variant.isActive && variant.tracksStock && Number(variant.stockQuantity ?? 0) <= 0) {
                    total++;
                }
            });

            return;
        }

        if (product.tracksStock && Number(product.stockQuantity ?? 0) <= 0) {
            total++;
        }
    });

    return total;
}

function renderStats() {
    const variantCount = products.reduce((acc, product) => acc + (product.variants?.length || 0), 0);

    qs("statProducts").textContent = String(products.length);
    qs("statVariants").textContent = String(variantCount);
    qs("statOutStock").textContent = String(countOutOfStock());
}

function renderStockRows() {
    const tbody = qs("stockRows");
    const empty = qs("stockEmptyState");
    const filtered = getFilteredProducts();

    if (!filtered.length) {
        tbody.innerHTML = "";
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    tbody.innerHTML = filtered.map(product => {
        const expanded = expandedProductIds.has(product.id);
        const variants = product.variants || [];
        const hasVariants = product.hasVariants;

        return `
            <tr class="hover:bg-slate-50">
<td class="px-4 py-3">
    <div class="font-black text-slate-900">${escapeHtml(product.name)}</div>

    <div class="flex items-center gap-2 text-xs text-slate-400">
        <span>
            ${hasVariants ? `${variants.length} variante(s)` : "Sin variantes"}
        </span>

        ${
            product.allowsPersonalization
                ? `<span class="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                    ✍️ Personalizable
                  </span>`
                : ""
        }
    </div>
</td>
                <td class="px-4 py-3 text-slate-600">
                    ${escapeHtml(product.categoryName || "-")}
                </td>

                <td class="px-4 py-3">
                    ${
                        hasVariants
                            ? `<span class="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">Por variantes</span>`
                            : `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Producto</span>`
                    }
                </td>

                <td class="px-4 py-3">
                    ${getProductStatus(product)}
                </td>

                <td class="px-4 py-3 text-right">
                    ${
                        hasVariants
                            ? `<button type="button" data-toggle-product="${product.id}" class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                                ${expanded ? "Ocultar variantes" : "Ver variantes"}
                               </button>`
                            : `<button type="button" data-edit-product-stock="${product.id}" class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800">
                                Configurar stock
                               </button>`
                    }
                </td>
            </tr>

            ${
                hasVariants && expanded
                    ? `
                        <tr>
                            <td colspan="5" class="bg-slate-50 px-4 py-4">
                                ${renderVariantsTable(product)}
                            </td>
                        </tr>
                    `
                    : ""
            }
        `;
    }).join("");

    bindStockEvents();
}

function renderVariantsTable(product) {
    const variants = product.variants || [];

    if (!variants.length) {
        return `
            <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
                Este producto todavía no tiene variantes.
            </div>
        `;
    }

    return `
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table class="min-w-full divide-y divide-slate-100 text-sm">
                <thead class="bg-white">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-400">Variante</th>
                        <th class="px-4 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-400">Controla</th>
                        <th class="px-4 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-400">Activa</th>
                        <th class="px-4 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-400">Cantidad</th>
                        <th class="px-4 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-400">Estado</th>
                        <th class="px-4 py-2 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-400">Acción</th>
                    </tr>
                </thead>

                <tbody class="divide-y divide-slate-100">
                    ${variants.map(variant => `
                        <tr class="hover:bg-slate-50">
                            <td class="px-4 py-2 font-bold text-slate-900">
                                ${escapeHtml(variant.name)}
                            </td>

                            <td class="px-4 py-2 text-center">
                                <input id="track_${variant.id}" type="checkbox" class="h-4 w-4" ${variant.tracksStock ? "checked" : ""} />
                            </td>

                            <td class="px-4 py-2 text-center">
                                <input id="active_${variant.id}" type="checkbox" class="h-4 w-4" ${variant.isActive ? "checked" : ""} />
                            </td>

                            <td class="px-4 py-2">
                                <input id="qty_${variant.id}" type="number" min="0"
                                    value="${variant.stockQuantity ?? 0}"
                                    class="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
                            </td>

                            <td class="px-4 py-2">
                                ${statusBadge(variant.tracksStock, variant.stockQuantity, product.isActive && variant.isActive)}
                            </td>

                            <td class="px-4 py-2 text-right">
                                <button
                                    type="button"
                                    data-save-variant-stock="${variant.id}"
                                    data-product-id="${product.id}"
                                    class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                                >
                                    Guardar
                                </button>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
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

function openProductStockModal(productId) {
    const product = products.find(x => x.id === productId);
    if (!product) return;

    setModal(`
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div class="mb-5">
                    <h3 class="text-xl font-black text-slate-900">Configurar stock</h3>
                    <p class="mt-1 text-sm text-slate-500">${escapeHtml(product.name)}</p>
                </div>

                <div class="space-y-4">
                    <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <input id="modalProductTracksStock" type="checkbox" class="h-4 w-4" ${product.tracksStock ? "checked" : ""} />
                        <span class="text-sm font-semibold text-slate-700">Controla stock</span>
                    </label>

                    <div>
                        <label class="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                            Cantidad
                        </label>
                        <input id="modalProductStockQuantity" type="number" min="0"
                            value="${product.stockQuantity ?? 0}"
                            class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
                        <p class="mt-2 text-xs text-slate-500">
                            Si no controla stock, se podrá comprar siempre y no se descontará cantidad.
                        </p>
                    </div>
                </div>

                <div class="mt-6 flex gap-3">
                    <button id="stockCancelBtn" type="button" class="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700">
                        Cancelar
                    </button>

                    <button id="stockSaveBtn" type="button" class="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    `);

    qs("stockCancelBtn").addEventListener("click", closeModal);

    qs("stockSaveBtn").addEventListener("click", async () => {
        const tracksStock = qs("modalProductTracksStock").checked;
        const stockQuantity = Number(qs("modalProductStockQuantity").value || 0);

        await saveProductStock(product.id, tracksStock, stockQuantity);
        closeModal();
    });
}

function bindStockEvents() {
    document.querySelectorAll("[data-toggle-product]").forEach(button => {
        button.addEventListener("click", () => {
            const productId = button.dataset.toggleProduct;

            if (expandedProductIds.has(productId)) {
                expandedProductIds.delete(productId);
            } else {
                expandedProductIds.add(productId);
            }

            renderStockRows();
        });
    });

    document.querySelectorAll("[data-edit-product-stock]").forEach(button => {
        button.addEventListener("click", () => {
            openProductStockModal(button.dataset.editProductStock);
        });
    });

    document.querySelectorAll("[data-save-variant-stock]").forEach(button => {
        button.addEventListener("click", async () => {
            const variantId = button.dataset.saveVariantStock;
            const productId = button.dataset.productId;

            const tracksStock = qs(`track_${variantId}`).checked;
            const stockQuantity = Number(qs(`qty_${variantId}`).value || 0);
            const isActive = qs(`active_${variantId}`).checked;

            await saveVariantStock(productId, variantId, tracksStock, stockQuantity, isActive);
        });
    });
}

async function saveProductStock(productId, tracksStock, stockQuantity) {
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

async function saveVariantStock(productId, variantId, tracksStock, stockQuantity, isActive) {
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
    renderStockRows();
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
            expandedProductIds = new Set();
            await loadProducts();
        }
    });

    company = layout.activeCompany;

    qs("backToClothingBtn").addEventListener("click", goBackToClothing);

    qs("stockSearchInput").addEventListener("input", event => {
        searchText = event.target.value || "";
        renderStockRows();
    });

    await loadProducts();
}

init();