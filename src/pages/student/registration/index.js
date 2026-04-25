import { get, post } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";

let companySlug = null;

function input(label, id, type = "text", required = true) {
    return `
        <div class="space-y-1">
            <label class="text-sm font-medium text-slate-700">
                ${label}
                ${required ? '<span class="text-red-500">*</span>' : ''}
            </label>

            <input
                id="${id}"
                type="${type}"
                ${required ? "required" : ""}
                class="w-full rounded-xl border px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
        </div>
    `;
}

function renderHealthInsuranceSection() {
    return `
        <div class="pt-2 border-t space-y-3">
            <h3 class="text-sm font-semibold text-slate-600">
                Obra social
            </h3>

            <label class="flex items-center gap-2 text-sm text-slate-700">
                <input
                    id="hasHealthInsurance"
                    type="checkbox"
                    class="rounded border-slate-300"
                />
                Tiene obra social
            </label>

            <div id="healthInsuranceFields" class="hidden space-y-4">
                ${input("Nombre de obra social", "healthInsuranceName", "text", false)}
                ${input("Nro. de afiliado / socio", "healthInsuranceMemberNumber", "text", false)}
                ${input("Plan", "healthInsurancePlan", "text", false)}
            </div>
        </div>
    `;
}

function render() {
    return `
        <section class="min-h-screen flex items-center justify-center p-4">
            <div class="w-full max-w-lg bg-white rounded-2xl border shadow-sm p-8 space-y-6">

                <div>
                    <h1 class="text-xl font-semibold">
                        Completar registro
                    </h1>

                    <p class="text-sm text-slate-500 mt-1">
                        Necesitamos algunos datos para activar tu cuenta.
                    </p>
                </div>

                <form id="form" class="space-y-4">

                    <div class="grid grid-cols-2 gap-3">
                        ${input("Nombre", "firstName")}
                        ${input("Apellido", "lastName")}
                    </div>

                    ${input("DNI", "dni")}

                    ${input("Fecha de nacimiento", "dateOfBirth", "date")}

                    ${input("Teléfono", "phone")}

                    ${input("Dirección", "address")}

                    ${renderHealthInsuranceSection()}

                    <div class="pt-2 border-t">
                        <h3 class="text-sm font-semibold text-slate-600">
                            Contacto de emergencia
                        </h3>
                    </div>

                    ${input("Nombre contacto", "emergencyContactName")}

                    ${input("Teléfono contacto", "emergencyContactPhone")}

                    <button
                        id="btnSave"
                        type="submit"
                        class="w-full mt-4 bg-slate-900 text-white py-2 rounded-xl
                        hover:bg-slate-800 transition disabled:opacity-60"
                    >
                        Guardar
                    </button>

                </form>

                <div
                    id="error"
                    class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3"
                ></div>

            </div>
        </section>
    `;
}

function value(id) {
    return document
        .getElementById(id)
        .value
        .trim();
}

function showError(text) {
    const el = document.getElementById("error");

    el.innerText = text;
    el.classList.remove("hidden");
}

function hideError() {
    const el = document.getElementById("error");

    el.innerText = "";
    el.classList.add("hidden");
}

function bindHealthInsuranceEvents() {
    const checkbox = document.getElementById("hasHealthInsurance");
    const fields = document.getElementById("healthInsuranceFields");
    const nameInput = document.getElementById("healthInsuranceName");
    const memberInput = document.getElementById("healthInsuranceMemberNumber");

    checkbox.addEventListener("change", () => {
        const enabled = checkbox.checked;

        fields.classList.toggle("hidden", !enabled);

        nameInput.required = enabled;
        memberInput.required = enabled;

        if (!enabled) {
            nameInput.value = "";
            memberInput.value = "";
            document.getElementById("healthInsurancePlan").value = "";
        }
    });
}

async function save(e) {
    e.preventDefault();
    hideError();

    const btn = document.getElementById("btnSave");
    btn.disabled = true;

    try {
        const hasHealthInsurance =
            document.getElementById("hasHealthInsurance").checked;

        if (hasHealthInsurance && !value("healthInsuranceName")) {
            showError("El nombre de la obra social es obligatorio.");
            btn.disabled = false;
            return;
        }

        if (hasHealthInsurance && !value("healthInsuranceMemberNumber")) {
            showError("El número de afiliado / socio es obligatorio.");
            btn.disabled = false;
            return;
        }

        await post(
            `/api/student/${companySlug}/registration/complete`,
            {
                firstName: value("firstName"),
                lastName: value("lastName"),
                dni: value("dni"),
                dateOfBirth: value("dateOfBirth"),
                phone: value("phone"),
                address: value("address"),
                emergencyContactName: value("emergencyContactName"),
                emergencyContactPhone: value("emergencyContactPhone"),

                hasHealthInsurance,
                healthInsuranceName: hasHealthInsurance
                    ? value("healthInsuranceName")
                    : null,
                healthInsuranceMemberNumber: hasHealthInsurance
                    ? value("healthInsuranceMemberNumber")
                    : null,
                healthInsurancePlan: hasHealthInsurance
                    ? value("healthInsurancePlan")
                    : null
            }
        );

        location.href = "/src/pages/student/home/index.html";
    } catch (e) {
        showError(e.message || "No se pudo completar el registro.");
    }

    btn.disabled = false;
}

async function init() {
    await loadConfig();

    const session = requireAuth();

    if (!session) return;

    companySlug = session.activeCompanySlug;

    const status =
        await get(`/api/student/${companySlug}/registration/status`);

    if (status.registrationCompleted) {
        location.href = "/src/pages/student/home/index.html";
        return;
    }

    document.getElementById("app").innerHTML = render();

    document
        .getElementById("form")
        .addEventListener("submit", save);

    bindHealthInsuranceEvents();
}

init();