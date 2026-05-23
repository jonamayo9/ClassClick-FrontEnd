import {
  getToken,
  getRefreshToken,
  getAccessTokenExpiresAtUtc,
  getUser,
  getActiveCompanySlug,
  getActiveRole,
  getActiveContext,
  clearSession
} from "./storage.js";

// 👇 ahora el login vive en la raíz
const LOGIN_URL = "/index.html";

export function getSession() {
  return {
    token: getToken(),
    refreshToken: getRefreshToken(),
    accessTokenExpiresAtUtc: getAccessTokenExpiresAtUtc(),
    user: getUser(),
    activeCompanySlug: getActiveCompanySlug(),
    activeRole: getActiveRole(),
    activeContext: getActiveContext(),
  };
}

export function requireAuth() {
  const session = getSession();

  if (!session?.token || !session?.user) {
    sessionStorage.setItem("auth_debug_last_invalid", JSON.stringify({
      path: window.location.pathname,
      hasToken: !!session?.token,
      hasUser: !!session?.user,
      tokenLength: session?.token?.length || 0,
      user: session?.user,
      date: new Date().toISOString()
    }));

    clearSession();

    if (window.location.pathname !== "/index.html") {
      window.location.replace("/index.html");
    }

    return null;
  }

  return session;
}

export function logoutAndRedirect() {
  clearSession();
  window.location.replace(LOGIN_URL);
}