import {
  getToken,
  getRefreshToken,
  getAccessTokenExpiresAtUtc,
  getUser,
  getActiveCompanySlug,
  getActiveRole,
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
    activeRole: getActiveRole()
  };
}

export function requireAuth() {
  const session = getSession();

  if (!session.token || !session.user) {
    clearSession();
    window.location.replace(LOGIN_URL);
    return null;
  }

  return session;
}

export function logoutAndRedirect() {
  clearSession();
  window.location.replace(LOGIN_URL);
}