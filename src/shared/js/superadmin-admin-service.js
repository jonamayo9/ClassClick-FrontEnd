import { apiFetch } from "./api.js";

function mapAdminCompany(company) {
  return {
    companyId: company.companyId,
    companyName: company.companyName ?? "",
    companySlug: company.companySlug ?? "",
    role: company.role ?? ""
  };
}

export function mapAdmin(admin) {
  return {
    id: admin.id,
    firstName: admin.firstName ?? "",
    lastName: admin.lastName ?? "",
    email: admin.email ?? "",
    systemRole: admin.systemRole ?? "",
    isActive: !!admin.isActive,
    createdAtUtc: admin.createdAtUtc ?? null,
    companies: Array.isArray(admin.companies) ? admin.companies.map(mapAdminCompany) : []
  };
}

export function normalizeAdminsResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
}

export async function getSuperAdminAdmins() {
  return await apiFetch("/api/superadmin/admins", {
    method: "GET"
  });
}

export async function createSuperAdminAdmin(payload) {
  return await apiFetch("/api/superadmin/admins", {
    method: "POST",
    body: payload
  });
}

export async function updateSuperAdminAdmin(adminId, payload) {
  return await apiFetch(`/api/superadmin/admins/${adminId}`, {
    method: "PUT",
    body: payload
  });
}

export async function setSuperAdminAdminStatus(adminId, isActive) {
  return await apiFetch(`/api/superadmin/admins/${adminId}/status`, {
    method: "POST",
    body: { isActive }
  });
}

export async function deleteSuperAdminAdmin(adminId) {
  await apiFetch(`/api/superadmin/admins/${adminId}`, {
    method: "DELETE"
  });
}

export async function assignCompaniesToSuperAdminAdmin(adminId, companyIds) {
  return await apiFetch(`/api/superadmin/admins/${adminId}/companies`, {
    method: "POST",
    body: { companyIds }
  });
}

export async function removeCompanyFromSuperAdminAdmin(adminId, companyId) {
  return await apiFetch(`/api/superadmin/admins/${adminId}/companies/${companyId}`, {
    method: "DELETE"
  });
}