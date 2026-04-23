import { loadConfig } from "../../shared/js/config.js";
import { login } from "../../shared/js/auth.js";
import { subscribeToPush } from "../../shared/js/push.js";
import { getSession } from "../../shared/js/session.js";
import { get } from "../../shared/js/api.js";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("errorBox");
const submitButton = document.getElementById("submitButton");

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Ingresando..." : "Ingresar";
}

async function ensurePushEnabled(token) {
  if (!("Notification" in window)) {
    throw new Error("Este dispositivo o navegador no soporta notificaciones.");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Este navegador no soporta service worker.");
  }

  if (Notification.permission === "granted") {
    await subscribeToPush(token);
    return;
  }

  if (Notification.permission === "denied") {
    throw new Error("Tenés que habilitar notificaciones desde la configuración del navegador para poder ingresar.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Debés aceptar las notificaciones para ingresar.");
  }

  await subscribeToPush(token);
}

async function resolveRedirect(result) {
  const user = result.user || {};
  const companies = result.companies || [];

  if (user.isSuperAdmin) {
    return "/src/pages/superadmin/dashboard/index.html";
  }

  if (!companies.length) {
    return "/src/pages/auth/no-company.html";
  }

  const role = companies[0].role;
  const slug = companies[0].companySlug;

  if (role === "Admin") {
    return "/src/pages/admin/dashboard/index.html";
  }

  if (role === "Student") {
    const status = await get(`/api/student/${slug}/registration/status`);

    if (!status.registrationCompleted) {
      return "/src/pages/student/registration/index.html";
    }

    return "/src/pages/student/home/index.html";
  }

  return "/src/pages/auth/no-company.html";
}

async function init() {
  await loadConfig();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideError();
    setLoading(true);

    try {
      const formData = new FormData(form);
      const email = formData.get("email")?.toString().trim();
      const password = formData.get("password")?.toString();

      if (!email || !password) {
        throw new Error("Ingresá email y contraseña.");
      }

      const result = await login(email, password);
      const session = getSession();

      await ensurePushEnabled(session.token);

      window.location.href = await resolveRedirect(result);
    } catch (error) {
      showError(error.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      console.log("Service Worker registrado:", registration);
    } catch (error) {
      console.error("Error registrando service worker:", error);
    }
  });
}

init().catch((error) => {
  showError(error.message || "No se pudo inicializar la pantalla.");
});