import {
  getToken,
  getRefreshToken,
  getAccessTokenExpiresAtUtc,
  getUser,
  getActiveCompanySlug,
  getActiveRole,
  clearSession
} from "./storage.js";

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
    window.location.href = "/src/pages/auth/login.html";
    return null;
  }

  return session;
}

export function logoutAndRedirect() {
  clearSession();
  window.location.href = "/src/pages/auth/login.html";
}