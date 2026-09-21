import {
  hasResourceScope,
  organisationContains,
  type SystemRole,
} from "./access-model";
import type { PortalSession } from "./mock-login";

export type PortalArea =
  | "student"
  | "teacher"
  | "institution"
  | "staff"
  | "president"
  | "admin";

/** Temporary route alias while the existing Student layout remains under `/member`. */
export type LegacyPortalArea = "member";
export type PortalAreaInput = PortalArea | LegacyPortalArea;

export interface PortalAccessTarget {
  organisationId?: string;
  exactOrganisationId?: string;
  resourceId?: string;
}

const AREA_POLICIES: Record<PortalArea, { role: SystemRole; routeRoot: string }> = {
  student: { role: "student", routeRoot: "/member" },
  teacher: { role: "teacher", routeRoot: "/teacher" },
  institution: { role: "institution_admin", routeRoot: "/institution" },
  staff: { role: "royal_college_staff", routeRoot: "/staff" },
  president: { role: "president", routeRoot: "/president" },
  admin: { role: "super_admin", routeRoot: "/admin" },
};

const SUPER_ADMIN_ROUTE_ALLOWLIST = [
  "/admin/dashboard",
  "/admin/users",
  "/admin/scopes",
  "/admin/organisations",
  "/admin/terms",
  "/admin/integrations",
  "/admin/audit",
  "/admin/settings",
] as const;

function normalizeArea(area: PortalAreaInput): PortalArea {
  return area === "member" ? "student" : area;
}

function isInsideRouteRoot(pathname: string, routeRoot: string) {
  return pathname === routeRoot || pathname.startsWith(`${routeRoot}/`);
}

function isAllowedAreaPath(area: PortalArea, pathname: string, routeRoot: string) {
  if (!isInsideRouteRoot(pathname, routeRoot)) return false;
  if (area !== "admin") return true;
  if (pathname === "/admin") return true;
  return SUPER_ADMIN_ROUTE_ALLOWLIST.some((allowedPath) => (
    pathname === allowedPath || pathname.startsWith(`${allowedPath}/`)
  ));
}

export function canPortalSessionAccessScope(
  session: PortalSession | null,
  target: PortalAccessTarget = {},
) {
  if (!session) return false;
  if (
    target.exactOrganisationId &&
    session.organisation.id !== target.exactOrganisationId
  ) {
    return false;
  }
  if (
    target.organisationId &&
    !organisationContains(session.organisation, target.organisationId)
  ) {
    return false;
  }
  if (target.resourceId && !hasResourceScope(session.resourceScopes, target.resourceId)) {
    return false;
  }
  return true;
}

export function canPortalSessionAccessArea(
  session: PortalSession | null,
  area: PortalAreaInput,
  pathname: string,
  target: PortalAccessTarget = {},
) {
  if (!session) return false;
  const normalizedArea = normalizeArea(area);
  const policy = AREA_POLICIES[normalizedArea];
  return session.role === policy.role &&
    isAllowedAreaPath(normalizedArea, pathname, policy.routeRoot) &&
    canPortalSessionAccessScope(session, target);
}
