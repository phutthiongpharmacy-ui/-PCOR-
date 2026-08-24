export const SYSTEM_ROLES = [
  "student",
  "teacher",
  "institution_admin",
  "royal_college_staff",
  "president",
  "super_admin",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export type OrganisationKind =
  | "system"
  | "royal_college"
  | "college"
  | "institution";

export interface OrganisationScope {
  id: string;
  code: string;
  name: string;
  kind: OrganisationKind;
  parentId?: string;
}

export const ORGANISATIONS = {
  system: {
    id: "org-system",
    code: "SYSTEM",
    name: "ระบบราชวิทยาลัยเภสัชกรรม",
    kind: "system",
  },
  royalCollege: {
    id: "org-royal-college",
    code: "รวภท.",
    name: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย",
    kind: "royal_college",
    parentId: "org-system",
  },
  therapeuticCollege: {
    id: "org-college-vpt",
    code: "วภท.",
    name: "วิทยาลัยเภสัชบำบัดแห่งประเทศไทย",
    kind: "college",
    parentId: "org-royal-college",
  },
  consumerProtectionCollege: {
    id: "org-college-cphcp",
    code: "วคบท.",
    name: "วิทยาลัยการคุ้มครองผู้บริโภคด้านยาและสุขภาพ",
    kind: "college",
    parentId: "org-royal-college",
  },
  herbalCollege: {
    id: "org-college-chpt",
    code: "สมุนไพร",
    name: "วิทยาลัยเภสัชกรรมสมุนไพร",
    kind: "college",
    parentId: "org-royal-college",
  },
  industrialCollege: {
    id: "org-college-cipt",
    code: "CIPT",
    name: "วิทยาลัยเภสัชกรรมอุตสาหการ",
    kind: "college",
    parentId: "org-royal-college",
  },
  communityCollege: {
    id: "org-college-vpc",
    code: "วภช.",
    name: "วิทยาลัยเภสัชกรรมชุมชนแห่งประเทศไทย",
    kind: "college",
    parentId: "org-royal-college",
  },
  administrationCollege: {
    id: "org-college-cpat",
    code: "CPAT",
    name: "วิทยาลัยการบริหารเภสัชกิจ",
    kind: "college",
    parentId: "org-royal-college",
  },
  precisionMedicineCollege: {
    id: "org-college-cppm",
    code: "CPPM",
    name: "วิทยาลัยเภสัชพันธุศาสตร์และเภสัชกรรมแม่นยำ",
    kind: "college",
    parentId: "org-royal-college",
  },
  siriraj: {
    id: "org-inst-siriraj",
    code: "INST-SIRIRAJ",
    name: "สถาบันฝึกอบรมโรงพยาบาลศิริราช",
    kind: "institution",
    parentId: "org-college-vpt",
  },
  chula: {
    id: "org-inst-chula",
    code: "INST-CHULA",
    name: "สถาบันฝึกอบรมจุฬาลงกรณ์มหาวิทยาลัย",
    kind: "institution",
    parentId: "org-college-vpt",
  },
} as const satisfies Record<string, OrganisationScope>;

export const ORGANISATION_LIST: readonly OrganisationScope[] = Object.values(ORGANISATIONS);
export const COLLEGE_ORGANISATIONS = ORGANISATION_LIST.filter((organisation) => organisation.kind === "college");

export const ROLE_PRESENTATION: Record<SystemRole, { label: string; portal: string; home: string }> = {
  student: { label: "ผู้เข้ารับการฝึกอบรม", portal: "Student Portal", home: "/member/dashboard" },
  teacher: { label: "อาจารย์ผู้สอน", portal: "Teacher Portal", home: "/teacher/dashboard" },
  institution_admin: { label: "ผู้ดูแลสถาบัน", portal: "Institution Portal", home: "/institution/dashboard" },
  royal_college_staff: { label: "เจ้าหน้าที่ราชวิทยาลัย", portal: "Staff Portal", home: "/staff/dashboard" },
  president: { label: "ประธาน / ผู้ลงนาม", portal: "President Portal", home: "/president/dashboard" },
  super_admin: { label: "ผู้ดูแลระบบสูงสุด", portal: "Super Admin Portal", home: "/admin/dashboard" },
};

export function isSystemRole(value: unknown): value is SystemRole {
  return typeof value === "string" && SYSTEM_ROLES.includes(value as SystemRole);
}

export function isOrganisationScope(value: unknown): value is OrganisationScope {
  if (!value || typeof value !== "object") return false;
  const scope = value as Partial<OrganisationScope>;
  return typeof scope.id === "string" &&
    typeof scope.code === "string" &&
    typeof scope.name === "string" &&
    (scope.kind === "system" ||
      scope.kind === "royal_college" ||
      scope.kind === "college" ||
      scope.kind === "institution") &&
    (scope.parentId === undefined || typeof scope.parentId === "string");
}

export function organisationContains(
  scope: OrganisationScope,
  targetOrganisationId: string,
  organisations: readonly OrganisationScope[] = ORGANISATION_LIST,
) {
  if (scope.id === targetOrganisationId || scope.kind === "system") return true;

  const byId = new Map(organisations.map((organisation) => [organisation.id, organisation]));
  let current = byId.get(targetOrganisationId);
  const visited = new Set<string>();
  while (current?.parentId && !visited.has(current.id)) {
    if (current.parentId === scope.id) return true;
    visited.add(current.id);
    current = byId.get(current.parentId);
  }
  return false;
}

export function hasResourceScope(
  resourceScopes: readonly string[],
  resourceId: string,
) {
  return resourceScopes.some((scope) => (
    scope === "*" ||
    scope === resourceId ||
    (scope.endsWith("*") && resourceId.startsWith(scope.slice(0, -1)))
  ));
}

/**
 * Validates the minimum Role + Organisation + Resource contract before an
 * assignment or browser session can become authoritative for the prototype.
 */
export function isRoleScopeCompatible(
  role: SystemRole,
  organisation: OrganisationScope,
  resourceScopes: readonly string[],
) {
  if (resourceScopes.length === 0) return false;

  if (role === "student") {
    return organisation.kind === "institution" &&
      resourceScopes.includes("student:self") &&
      resourceScopes.every((scope) => scope.startsWith("student:"));
  }
  if (role === "teacher") {
    return organisation.kind === "institution" &&
      resourceScopes.every((scope) => scope.startsWith("course:"));
  }
  if (role === "institution_admin") {
    return organisation.kind === "institution" &&
      resourceScopes.includes(`institution:${organisation.id}`) &&
      resourceScopes.every((scope) => scope.startsWith("institution:"));
  }
  if (role === "royal_college_staff") {
    return organisation.kind === "royal_college" &&
      resourceScopes.every((scope) => scope === "*" || scope.startsWith("staff:"));
  }
  if (role === "president") {
    const requiredScope = organisation.kind === "royal_college"
      ? "signature:royal_college"
      : "signature:college";
    return (organisation.kind === "royal_college" || organisation.kind === "college") &&
      resourceScopes.includes(requiredScope) &&
      resourceScopes.every((scope) => scope.startsWith("signature:"));
  }
  return organisation.kind === "system" && resourceScopes.includes("*");
}
