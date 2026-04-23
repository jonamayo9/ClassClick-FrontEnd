let deferredPrompt = null;

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function hideButton(button) {
  if (!button) return;
  button.classList.add("hidden");
}

function showButton(button) {
  if (!button) return;
  button.classList.remove("hidden");
}

export function initPwaInstall(options = {}) {
  const {
    buttonId = "installAppButton",
    onInstalled = null
  } = options;

  const button = document.getElementById(buttonId);
  if (!button) return;

  // Por defecto oculto
  hideButton(button);

  // Si ya está instalada como app, nunca mostrar
  if (isStandaloneMode()) {
    return;
  }

  // Si no es mobile, no mostrar
  if (!isMobileDevice()) {
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    // Solo web mobile no instalada
    if (!isStandaloneMode() && isMobileDevice()) {
      showButton(button);
    }
  });

  window.addEventListener("appinstalled", () => {
    hideButton(button);
    deferredPrompt = null;

    if (typeof onInstalled === "function") {
      onInstalled();
    }
  });

  button.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      console.log("PWA instalada");
    } else {
      console.log("Usuario canceló instalación");
    }

    deferredPrompt = null;
    hideButton(button);
  });
}