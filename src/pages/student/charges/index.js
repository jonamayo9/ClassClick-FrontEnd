import { get } from "../../../shared/js/api.js";
import { loadConfig } from "../../../shared/js/config.js";
import { requireAuth } from "../../../shared/js/session.js";

let companySlug;

function row(c){

return `

<div class="bg-white p-4 rounded-xl border flex justify-between">

<div>

<div class="font-semibold">

${c.month}/${c.year}

</div>

<div class="text-sm text-slate-500">

${c.courseName}

</div>

</div>

<div>

$${c.finalAmount}

</div>

</div>

`;

}

async function init(){

await loadConfig();

const s=requireAuth();

companySlug=s.companySlug;


/* bloqueo */

const status =
await get(`/api/student/${companySlug}/registration/status`);

if(!status.registrationCompleted){

location.href="/student/registration";

return;

}


const charges =
await get(`/api/student/${companySlug}/charges`);

document.getElementById("app").innerHTML=

`

<div class="space-y-3">

${charges.map(row).join("")}

</div>

`;

}

init();