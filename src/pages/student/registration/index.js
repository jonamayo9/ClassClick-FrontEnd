import { get, post } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";

let companySlug = null;

function input(label,id,type="text",required=true){

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

function render(){

return `

<section class="min-h-screen flex items-center justify-center">

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

${input("Nombre","firstName")}
${input("Apellido","lastName")}

</div>

${input("DNI","dni")}

${input("Fecha de nacimiento","dateOfBirth","date")}

${input("Teléfono","phone")}

${input("Dirección","address")}

<div class="pt-2 border-t">

<h3 class="text-sm font-semibold text-slate-600">

Contacto de emergencia

</h3>

</div>

${input("Nombre contacto","emergencyContactName")}

${input("Teléfono contacto","emergencyContactPhone")}

<button
id="btnSave"
class="w-full mt-4 bg-slate-900 text-white py-2 rounded-xl
hover:bg-slate-800 transition"
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

function value(id){

return document
.getElementById(id)
.value
.trim();

}

function showError(text){

const el=document.getElementById("error");

el.innerText=text;

el.classList.remove("hidden");

}

async function save(e){

e.preventDefault();

const btn=document.getElementById("btnSave");

btn.disabled=true;

try{

await post(

`/api/student/${companySlug}/registration/complete`,

{
firstName:value("firstName"),
lastName:value("lastName"),
dni:value("dni"),
dateOfBirth:value("dateOfBirth"),
phone:value("phone"),
address:value("address"),
emergencyContactName:value("emergencyContactName"),
emergencyContactPhone:value("emergencyContactPhone")
}

);

location.href="/src/pages/student/home/index.html";

}
catch(e){

showError(e.message);

}

btn.disabled=false;

}

async function init(){

await loadConfig();

const session=requireAuth();

if(!session) return;

companySlug=session.activeCompanySlug;

const status =
await get(`/api/student/${companySlug}/registration/status`);

if(status.registrationCompleted){

location.href="/student/courses";
return;

}

document.getElementById("app").innerHTML=render();

document
.getElementById("form")
.addEventListener("submit",save);

}

init();