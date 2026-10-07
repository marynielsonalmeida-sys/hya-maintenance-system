export function resolvePostAuthDestination(hasActiveCompany: boolean): "/dashboard" | "/onboarding" {
  return hasActiveCompany ? "/dashboard" : "/onboarding";
}

export function resolveProtectedDestination(isAuthenticated: boolean, hasActiveCompany: boolean): "/login" | "/onboarding" | "/dashboard" {
  if (!isAuthenticated) return "/login";
  return hasActiveCompany ? "/dashboard" : "/onboarding";
}
