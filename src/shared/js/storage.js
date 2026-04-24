const STORAGE_KEYS = {
  token: "classclick_token",
  refreshToken: "classclick_refresh_token",
  accessTokenExpiresAtUtc: "classclick_access_token_expires_at_utc",
  user: "classclick_user",
  activeCompanySlug: "classclick_active_company_slug",
  activeRole: "classclick_active_role",
  activeCompany: "classclick_active_company"
};

export function setToken(token) {
  localStorage.setItem(STORAGE_KEYS.token, token);
}

export function getToken() {
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function removeToken() {
  localStorage.removeItem(STORAGE_KEYS.token);
}

export function setRefreshToken(refreshToken) {
  localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

export function removeRefreshToken() {
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
}

export function setAccessTokenExpiresAtUtc(value) {
  localStorage.setItem(STORAGE_KEYS.accessTokenExpiresAtUtc, value);
}

export function getAccessTokenExpiresAtUtc() {
  return localStorage.getItem(STORAGE_KEYS.accessTokenExpiresAtUtc);
}

export function removeAccessTokenExpiresAtUtc() {
  localStorage.removeItem(STORAGE_KEYS.accessTokenExpiresAtUtc);
}

export function setUser(user) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

export function getUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  return raw ? JSON.parse(raw) : null;
}

export function removeUser() {
  localStorage.removeItem(STORAGE_KEYS.user);
}

export function setActiveCompanySlug(companySlug) {
  localStorage.setItem(STORAGE_KEYS.activeCompanySlug, companySlug);
}

export function getActiveCompanySlug() {
  return localStorage.getItem(STORAGE_KEYS.activeCompanySlug);
}

export function removeActiveCompanySlug() {
  localStorage.removeItem(STORAGE_KEYS.activeCompanySlug);
}

export function setActiveRole(role) {
  localStorage.setItem(STORAGE_KEYS.activeRole, role);
}

export function getActiveRole() {
  return localStorage.getItem(STORAGE_KEYS.activeRole);
}

export function removeActiveRole() {
  localStorage.removeItem(STORAGE_KEYS.activeRole);
}

export function clearSession() {
  clearUserCache();
  removeToken();
  removeRefreshToken();
  removeAccessTokenExpiresAtUtc();
  removeUser();
  removeActiveCompanySlug();
  removeActiveRole();
  removeActiveCompany();
  removeMe();
  removeStudentProfile();
  removeStudentMe();
}

export function setMe(me) {
  localStorage.setItem("classclick_me", JSON.stringify(me));
}

export function getMe() {
  const raw = localStorage.getItem("classclick_me");
  return raw ? JSON.parse(raw) : null;
}

export function removeMe() {
  localStorage.removeItem("classclick_me");
}

export function setStudentProfile(profile) {
  localStorage.setItem("classclick_profile", JSON.stringify(profile));
}

export function getStudentProfile() {
  const raw = localStorage.getItem("classclick_profile");
  return raw ? JSON.parse(raw) : null;
}

export function removeStudentProfile() {
  localStorage.removeItem("classclick_profile");
}

export function setStudentMe(companySlug, student) {
  if (!companySlug || !student) return;

  localStorage.setItem(
    `classclick_student_me:${companySlug}`,
    JSON.stringify(student)
  );
}

export function getStudentMe(companySlug) {
  if (!companySlug) return null;

  const raw = localStorage.getItem(
    `classclick_student_me:${companySlug}`
  );

  return raw ? JSON.parse(raw) : null;
}

export function removeStudentMe(companySlug) {
  if (!companySlug) return;

  localStorage.removeItem(
    `classclick_student_me:${companySlug}`
  );
}
export function setActiveCompany(companySlug, company) {
  if (!companySlug || !company) return;

  localStorage.setItem(
    `classclick_active_company:${companySlug}`,
    JSON.stringify(company)
  );
}

export function getActiveCompany(companySlug) {
  if (!companySlug) return null;

  const raw = localStorage.getItem(`classclick_active_company:${companySlug}`);
  return raw ? JSON.parse(raw) : null;
}

export function removeActiveCompany(companySlug) {
  if (!companySlug) return;

  localStorage.removeItem(`classclick_active_company:${companySlug}`);
}
export function getMatches(companySlug) {
  if (!companySlug) return null;

  const raw = localStorage.getItem(`classclick_matches:${companySlug}`);
  return raw ? JSON.parse(raw) : null;
}

export function setMatches(companySlug, data) {
  if (!companySlug || !data) return;

  localStorage.setItem(
    `classclick_matches:${companySlug}`,
    JSON.stringify(data)
  );
}

export function getPayments(companySlug) {
  if (!companySlug) return null;

  const raw = localStorage.getItem(`classclick_payments:${companySlug}`);
  return raw ? JSON.parse(raw) : null;
}

export function setPayments(companySlug, data) {
  if (!companySlug || !data) return;

  localStorage.setItem(
    `classclick_payments:${companySlug}`,
    JSON.stringify(data)
  );
}

export function clearUserCache() {
  const keysToRemove = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (!key) continue;

    if (
      key.startsWith("classclick_me") ||
      key.startsWith("classclick_student_me") ||
      key.startsWith("classclick_active_company") ||
      key.startsWith("classclick_company") ||
      key.startsWith("classclick_profile") ||
      key.startsWith("classclick_courses") ||
      key.startsWith("classclick_payments") ||
      key.startsWith("classclick_documents") ||
      key.startsWith("classclick_notifications")
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
}