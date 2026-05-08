export function hasModule(company, moduleCode) {
  if (!company) return false;

  const key = String(moduleCode || "").toLowerCase();

  if (company.modules && key in company.modules) {
    return company.modules[key] === true;
  }

  // Compatibilidad vieja
  if (key === "matches") {
    return company.isMatchOrganizationEnabled === true;
  }

  if (key === "clothing") {
    return company.isClothingEnabled === true;
  }

  return false;
}

export function getCompanyModules(company) {
  return company?.modules || {};
}
