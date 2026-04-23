import { apiFetch } from "./api.js";

function mapCompanyPayload(company) {
  return {
    id: company.id,
    name: company.name ?? "",
    slug: company.slug ?? "",
    description: company.description ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    whatsapp: company.whatsapp ?? "",
    addressLine1: company.addressLine1 ?? "",
    addressLine2: company.addressLine2 ?? "",
    city: company.city ?? "",
    stateOrProvince: company.stateOrProvince ?? "",
    postalCode: company.postalCode ?? "",
    country: company.country ?? "",
    logoUrl: company.logoUrl ?? "",
    isActive: !!company.isActive,
    createdAtUtc: company.createdAtUtc ?? null,
    adminsCount: company.adminsCount ?? 0
  };
}

export async function getSuperAdminCompanies() {
  const response = await apiFetch("/api/superadmin/companies", {
    method: "GET"
  });

  return Array.isArray(response) ? response.map(mapCompanyPayload) : [];
}

export async function createSuperAdminCompany(payload) {
  const response = await apiFetch("/api/superadmin/companies", {
    method: "POST",
    body: payload
  });

  return mapCompanyPayload(response);
}

export async function updateSuperAdminCompany(companyId, payload) {
  const response = await apiFetch(`/api/superadmin/companies/${companyId}`, {
    method: "PUT",
    body: payload
  });

  return mapCompanyPayload(response);
}

export async function setSuperAdminCompanyStatus(companyId, isActive) {
  const response = await apiFetch(`/api/superadmin/companies/${companyId}/status`, {
    method: "POST",
    body: { isActive }
  });

  return mapCompanyPayload(response);
}

export async function uploadSuperAdminCompanyLogo(companyId, file) {
  const formData = new FormData();
  formData.append("file", file);

  return await apiFetch(`/api/superadmin/companies/${companyId}/logo`, {
    method: "POST",
    body: formData
  });
}
