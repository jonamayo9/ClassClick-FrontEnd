import { loadConfig } from "./src/shared/js/config.js"
import { login } from "./src/shared/js/auth.js";
import { subscribeToPush } from "./src/shared/js/push.js";
import { getSession } from "./src/shared/js/session.js";
import { get } from "./src/shared/js/api.js";

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
  try {
    if (!("Notification" in window)) {
      console.warn("Este dispositivo o navegador no soporta notificaciones.");
      return;
    }

    if (!("serviceWorker" in navigator)) {
      console.warn("Este navegador no soporta service worker.");
      return;
    }

    if (Notification.permission === "granted") {
      await subscribeToPush(token);
      return;
    }

    if (Notification.permission === "denied") {
      console.warn("El usuario bloqueó las notificaciones desde el navegador.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.warn("El usuario no aceptó notificaciones.");
      return;
    }

    await subscribeToPush(token);
  } catch (error) {
    console.warn("No se pudieron activar las notificaciones.", error);
  }
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

  const session = getSession();

  if (session.token && session.user) {
    try {
      if (session.user.isSuperAdmin) {
        window.location.replace("/src/pages/superadmin/dashboard/index.html");
        return;
      }

      if (session.activeRole === "Admin") {
        window.location.replace("/src/pages/admin/dashboard/index.html");
        return;
      }

      if (session.activeRole === "Student") {
        window.location.replace("/src/pages/student/home/index.html");
        return;
      }

      showError("No se pudo identificar el rol del usuario. Cerrá sesión e ingresá nuevamente.");
    } catch (error) {
      showError(error.message || "No se pudo validar la sesión actual.");
    }

    return;
  }

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

      if (!session.token) {
        throw new Error("El login fue correcto, pero no se recibió token de sesión.");
      }

      ensurePushEnabled(session.token);

      const redirectUrl = await resolveRedirect(result);

      if (!redirectUrl) {
        throw new Error("No se pudo resolver la pantalla inicial del usuario.");
      }

      window.location.replace(redirectUrl);
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
  showError(error.message || "No se pudo inicializar la pantalla de login.");
});