import {
  COLLEGE_ORGANISATIONS,
  ORGANISATION_LIST,
  ORGANISATIONS,
  ROLE_PRESENTATION,
  isOrganisationScope,
  isRoleScopeCompatible,
  isSystemRole,
  type OrganisationScope,
  type SystemRole,
} from "./access-model";
import {
  migrateKnownLegacyTeacherResourceScopes,
  readGovernanceConfiguration,
  type UserAccessAssignment,
} from "./governance-configuration";
import {
  isRoleAssignmentActive,
  type RoleAssignment,
} from "./role-assignment";

export interface PortalSession {
  role: SystemRole;
  displayName: string;
  signedInAt: string;
  userId: string;
  organisation: OrganisationScope;
  resourceScopes: string[];
  collegeCode?: string;
}

const DEMO_PASSWORD = "2222";

const roleAccounts = [
  {
    identifier: "ภ.12345",
    aliases: ["student"],
    password: DEMO_PASSWORD,
    role: "student",
    displayName: "ภก. สมชาย ใจดี",
    userId: "วภท-2568-001",
    organisation: ORGANISATIONS.siriraj,
    resourceScopes: ["student:self"],
  },
  {
    identifier: "admin",
    password: DEMO_PASSWORD,
    role: "super_admin",
    displayName: "System Admin",
    userId: "super-admin",
    organisation: ORGANISATIONS.system,
    resourceScopes: ["*"],
  },
  {
    identifier: "teacher",
    password: DEMO_PASSWORD,
    role: "teacher",
    displayName: "อ. ภก. กิตติพงศ์ วัฒนเภสัช",
    userId: "teacher-001",
    organisation: ORGANISATIONS.siriraj,
    resourceScopes: ["course:proposal", "course:assigned", "course:offering-bcp-101", "course:offering-vpt-301"],
  },
  {
    identifier: "teacher2",
    password: DEMO_PASSWORD,
    role: "teacher",
    displayName: "อ. ภญ. ชนิดา ศรีสุข",
    userId: "teacher-002",
    organisation: ORGANISATIONS.chula,
    resourceScopes: ["course:proposal", "course:assigned", "course:offering-vpt-302"],
  },
  {
    identifier: "teacher3",
    password: DEMO_PASSWORD,
    role: "teacher",
    displayName: "อ. ภก. ธีรภัทร พรหมรักษ์",
    userId: "teacher-003",
    organisation: ORGANISATIONS.siriraj,
    resourceScopes: ["course:proposal", "course:assigned"],
  },
  {
    identifier: "institution",
    password: DEMO_PASSWORD,
    role: "institution_admin",
    displayName: "ภก. วิชาญ อัครเวช",
    userId: "institution-admin-001",
    organisation: ORGANISATIONS.siriraj,
    resourceScopes: ["institution:org-inst-siriraj"],
  },
  {
    identifier: "officer",
    password: DEMO_PASSWORD,
    role: "royal_college_staff",
    displayName: "ภญ. ปาริชาติ สุขเกษม",
    userId: "staff-001",
    organisation: ORGANISATIONS.royalCollege,
    resourceScopes: ["staff:central"],
  },
  {
    identifier: "finance",
    password: DEMO_PASSWORD,
    role: "royal_college_staff",
    displayName: "ภญ. ปาริชาติ สุขเกษม",
    userId: "staff-001",
    organisation: ORGANISATIONS.royalCollege,
    resourceScopes: ["staff:central"],
  },
  {
    identifier: "president",
    password: DEMO_PASSWORD,
    role: "president",
    displayName: "ภก. รศ. ดร. ธนกฤต ศรีวิชัย",
    userId: "president-vpt-current",
    organisation: ORGANISATIONS.therapeuticCollege,
    resourceScopes: ["signature:college"],
  },
  {
    identifier: "royalpresident",
    password: DEMO_PASSWORD,
    role: "president",
    displayName: "ภญ. รศ. ดร. อรทัย พิทักษ์วิชาชีพ",
    userId: "president-rpc-current",
    organisation: ORGANISATIONS.royalCollege,
    resourceScopes: ["signature:royal_college"],
  },
] as const satisfies readonly {
  identifier: string;
  aliases?: readonly string[];
  password: string;
  role: SystemRole;
  displayName: string;
  userId: string;
  organisation: OrganisationScope;
  resourceScopes: readonly string[];
}[];

export const PORTAL_SESSION_KEY = "royal-college.portal-session.v2";
const LEGACY_PORTAL_SESSION_KEY = "royal-college.portal-session.v1";
export const PORTAL_SESSION_EVENT = "royal-college:portal-session-updated";

function requestedDestination(role: SystemRole, requestedPath?: string | null) {
  const home = ROLE_PRESENTATION[role].home;
  const expectedPrefix = home.slice(0, home.lastIndexOf("/") + 1);
  return requestedPath?.startsWith(expectedPrefix) ? requestedPath : home;
}

function sessionForAccount(
  account: (typeof roleAccounts)[number],
  accessAssignment?: UserAccessAssignment,
): PortalSession {
  const assignedOrganisation = accessAssignment
    ? ORGANISATION_LIST.find((item) => item.id === accessAssignment.organisationId)
    : undefined;
  const useAssignment = Boolean(
    accessAssignment &&
    assignedOrganisation &&
    isRoleScopeCompatible(
      accessAssignment.role,
      assignedOrganisation,
      accessAssignment.resourceScopes,
    ),
  );
  const effectiveOrganisation = useAssignment ? assignedOrganisation! : account.organisation;
  const role = useAssignment ? accessAssignment!.role : account.role;
  return {
    role,
    displayName: account.displayName,
    userId: account.userId,
    organisation: { ...effectiveOrganisation },
    resourceScopes: useAssignment
      ? [...accessAssignment!.resourceScopes]
      : [...account.resourceScopes],
    ...(effectiveOrganisation.kind === "college" || effectiveOrganisation.kind === "royal_college"
      ? { collegeCode: effectiveOrganisation.code }
      : {}),
    signedInAt: new Date().toISOString(),
  };
}

export function resolvePortalLogin(
  identifier: string,
  password: string,
  requestedPath?: string | null,
  roleAssignments: readonly RoleAssignment[] = [],
  accessAssignments?: readonly UserAccessAssignment[],
) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const assignedPresident = password === DEMO_PASSWORD
    ? roleAssignments.find((assignment) => (
        assignment.role === "president" &&
        isRoleAssignmentActive(assignment) &&
        (assignment.email.trim().toLowerCase() === normalizedIdentifier ||
          assignment.userId.trim().toLowerCase() === normalizedIdentifier)
      ))
    : undefined;
  if (assignedPresident) {
    return {
      destination: ROLE_PRESENTATION.president.home,
      session: {
        role: "president",
        displayName: assignedPresident.userName,
        userId: assignedPresident.userId,
        organisation: { ...assignedPresident.organisationScope },
        resourceScopes: [...assignedPresident.resourceScopes],
        collegeCode: assignedPresident.collegeCode,
        signedInAt: new Date().toISOString(),
      } satisfies PortalSession,
    };
  }

  const account = roleAccounts.find((candidate) => (
    (candidate.identifier === normalizedIdentifier || ("aliases" in candidate && (candidate.aliases as readonly string[]).includes(normalizedIdentifier))) &&
    candidate.password === password
  ));
  const configuredAssignments = accessAssignments ?? (
    typeof window === "undefined"
      ? []
      : readGovernanceConfiguration().userAssignments
  );
  if (account) {
    const session = sessionForAccount(
      account,
      configuredAssignments.find((assignment) => assignment.userId === account.userId),
    );
    return {
      destination: requestedDestination(session.role, requestedPath),
      session,
    };
  }

  throw new Error("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
}

export function savePortalSession(session: PortalSession) {
  window.localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
  window.localStorage.removeItem(LEGACY_PORTAL_SESSION_KEY);
  window.dispatchEvent(new Event(PORTAL_SESSION_EVENT));
}

function normalizeLegacyRole(value: unknown): SystemRole | null {
  if (isSystemRole(value)) return value;
  if (value === "member") return "student";
  if (value === "staff" || value === "finance_officer") return "royal_college_staff";
  if (value === "college_president") return "president";
  return null;
}

function defaultOrganisation(role: SystemRole, collegeCode?: string): OrganisationScope {
  if (role === "super_admin") return ORGANISATIONS.system;
  if (role === "royal_college_staff") return ORGANISATIONS.royalCollege;
  if (role === "president") {
    if (collegeCode === ORGANISATIONS.royalCollege.code) return ORGANISATIONS.royalCollege;
    return COLLEGE_ORGANISATIONS.find((organisation) => organisation.code === collegeCode)
      ?? ORGANISATIONS.therapeuticCollege;
  }
  return ORGANISATIONS.siriraj;
}

function defaultResourceScopes(role: SystemRole, organisation: OrganisationScope) {
  if (role === "student") return ["student:self"];
  if (role === "teacher") return [];
  if (role === "president") {
    return [organisation.kind === "royal_college"
      ? "signature:royal_college"
      : "signature:college"];
  }
  return ["*"];
}

function normalizeStoredSession(value: unknown): PortalSession | null {
  if (!value || typeof value !== "object") return null;
  const session = value as Partial<PortalSession> & { role?: unknown };
  const role = normalizeLegacyRole(session.role);
  if (!role || typeof session.displayName !== "string" || typeof session.signedInAt !== "string") {
    return null;
  }
  const organisation = isOrganisationScope(session.organisation)
    ? { ...session.organisation }
    : defaultOrganisation(role, session.collegeCode);
  const userId = typeof session.userId === "string" ? session.userId : `${role}-legacy`;
  const storedResourceScopes = Array.isArray(session.resourceScopes)
    ? session.resourceScopes.filter((scope): scope is string => typeof scope === "string")
    : defaultResourceScopes(role, organisation);
  const resourceScopes = migrateKnownLegacyTeacherResourceScopes({
    userId,
    role,
    organisationId: organisation.id,
    resourceScopes: storedResourceScopes,
  });
  if (!isRoleScopeCompatible(role, organisation, resourceScopes)) return null;
  return {
    role,
    displayName: session.displayName,
    userId,
    organisation,
    resourceScopes,
    ...(typeof session.collegeCode === "string"
      ? { collegeCode: session.collegeCode }
      : organisation.kind === "college" || organisation.kind === "royal_college"
        ? { collegeCode: organisation.code }
        : {}),
    signedInAt: session.signedInAt,
  };
}

export function readPortalSession({
  persistMigration = true,
}: { persistMigration?: boolean } = {}): PortalSession | null {
  const candidates = [
    { key: PORTAL_SESSION_KEY, value: window.localStorage.getItem(PORTAL_SESSION_KEY) },
    { key: LEGACY_PORTAL_SESSION_KEY, value: window.localStorage.getItem(LEGACY_PORTAL_SESSION_KEY) },
  ];
  for (const candidate of candidates) {
    if (!candidate.value) continue;
    try {
      const parsed: unknown = JSON.parse(candidate.value);
      const normalized = normalizeStoredSession(parsed);
      if (!normalized) continue;
      if (persistMigration && (
        candidate.key === LEGACY_PORTAL_SESSION_KEY ||
        JSON.stringify(parsed) !== JSON.stringify(normalized)
      )) {
        savePortalSession(normalized);
      }
      return normalized;
    } catch {
      // Try the legacy key when the current value cannot be migrated.
    }
  }
  return null;
}

export function getPortalSessionStorageSnapshot() {
  return window.localStorage.getItem(PORTAL_SESSION_KEY) ??
    window.localStorage.getItem(LEGACY_PORTAL_SESSION_KEY) ??
    "";
}

export function subscribeToPortalSession(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PORTAL_SESSION_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PORTAL_SESSION_EVENT, onStoreChange);
  };
}

export function clearPortalSession() {
  window.localStorage.removeItem(PORTAL_SESSION_KEY);
  window.localStorage.removeItem(LEGACY_PORTAL_SESSION_KEY);
  window.dispatchEvent(new Event(PORTAL_SESSION_EVENT));
}
