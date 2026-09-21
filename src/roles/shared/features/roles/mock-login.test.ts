import { beforeEach, describe, expect, it, vi } from "vitest";

import { ORGANISATIONS } from "./access-model";
import {
  DEFAULT_GOVERNANCE_CONFIGURATION,
  persistGovernanceConfiguration,
  updateUserAccessAssignment,
} from "./governance-configuration";
import {
  PORTAL_SESSION_EVENT,
  PORTAL_SESSION_KEY,
  readPortalSession,
  resolvePortalLogin,
  savePortalSession,
} from "./mock-login";

const LEGACY_SESSION_KEY = "royal-college.portal-session.v1";

describe("portal login and session migration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it.each([
    ["ภ.12345", "2323", "student", "/member/dashboard"],
    ["student", "2323", "student", "/member/dashboard"],
    ["teacher", "2323", "teacher", "/teacher/dashboard"],
    ["institution", "2323", "institution_admin", "/institution/dashboard"],
    ["officer", "2323", "royal_college_staff", "/staff/dashboard"],
    ["president", "2323", "president", "/president/dashboard"],
    ["royalpresident", "2323", "president", "/president/dashboard"],
    ["admin", "2323", "super_admin", "/admin/dashboard"],
  ] as const)("routes %s to its canonical role home", (identifier, password, role, destination) => {
    const result = resolvePortalLogin(identifier, password);
    expect(result.session.role).toBe(role);
    expect(result.destination).toBe(destination);
    expect(result.session.userId).toBeTruthy();
    expect(result.session.organisation.id).toBeTruthy();
    expect(Array.isArray(result.session.resourceScopes)).toBe(true);
  });

  it.each([
    ["ภ.12345", "student"],
    ["student", "student"],
    ["teacher", "teacher"],
    ["teacher2", "teacher"],
    ["teacher3", "teacher"],
    ["institution", "institution_admin"],
    ["officer", "royal_college_staff"],
    ["finance", "royal_college_staff"],
    ["president", "president"],
    ["royalpresident", "president"],
    ["admin", "super_admin"],
  ] as const)("accepts the alternate demo password for %s", (identifier, role) => {
    expect(resolvePortalLogin(identifier, "2222").session.role).toBe(role);
  });

  it("binds every Student entry path to the current Student resource owner", () => {
    expect(resolvePortalLogin("ภ.12345", "2323").session).toMatchObject({
      role: "student",
      userId: "วภท-2568-001",
      displayName: "ภก. สมชาย ใจดี",
      resourceScopes: ["student:self"],
    });
  });

  it.each([
    ["ภ.99999", "2323"],
    ["ภ.12345", "รหัสไม่ถูกต้อง"],
    ["student@example.com", "2323"],
    ["admin", "2223"],
  ])("rejects unknown or invalid professional credentials without a Student fallback", (identifier, password) => {
    expect(() => resolvePortalLogin(identifier, password)).toThrowError("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
  });

  it("maps the old finance demo account into Royal College Staff", () => {
    expect(resolvePortalLogin("finance", "2323")).toMatchObject({
      destination: "/staff/dashboard",
      session: { role: "royal_college_staff", userId: "staff-001" },
    });
  });

  it("preserves a same-workspace return path and rejects another role path", () => {
    expect(resolvePortalLogin("teacher", "2323", "/teacher/courses").destination)
      .toBe("/teacher/courses");
    expect(resolvePortalLogin("teacher", "2323", "/admin/settings").destination)
      .toBe("/teacher/dashboard");
  });

  it("grants the Teacher demo account the explicit course proposal resource", () => {
    expect(resolvePortalLogin("teacher", "2323").session.resourceScopes)
      .toContain("course:proposal");
    expect(resolvePortalLogin("teacher", "2323").session.resourceScopes)
      .toContain("course:assigned");
  });

  it("applies the audited Super Admin Role and Scope assignment on the next login", () => {
    persistGovernanceConfiguration(updateUserAccessAssignment(
      DEFAULT_GOVERNANCE_CONFIGURATION,
      {
        userId: "teacher-001",
        role: "royal_college_staff",
        organisationId: ORGANISATIONS.royalCollege.id,
        resourceScopes: ["staff:central"],
      },
    ));

    expect(resolvePortalLogin("teacher", "2323")).toMatchObject({
      destination: "/staff/dashboard",
      session: {
        userId: "teacher-001",
        role: "royal_college_staff",
        organisation: { id: ORGANISATIONS.royalCollege.id },
        resourceScopes: ["staff:central"],
      },
    });
  });

  it.each(["2323", "2222"])("lets an active assigned President sign in with assignment scope using %s", (password) => {
    const now = Date.now();
    const result = resolvePortalLogin(
      "new.president@example.org",
      password,
      null,
      [{
        id: "term-current",
        userId: "president-current",
        userName: "ประธานคนปัจจุบัน",
        email: "new.president@example.org",
        role: "president",
        organisationScope: ORGANISATIONS.therapeuticCollege,
        resourceScopes: ["signature:college"],
        collegeCode: "วภท.",
        collegeName: "วิทยาลัยเภสัชบำบัดแห่งประเทศไทย",
        startsAt: new Date(now - 60_000).toISOString(),
        endsAt: new Date(now + 60_000).toISOString(),
        appointedBy: "System Admin",
      }],
    );

    expect(result).toMatchObject({
      destination: "/president/dashboard",
      session: {
        role: "president",
        userId: "president-current",
        organisation: { id: ORGANISATIONS.therapeuticCollege.id },
        resourceScopes: ["signature:college"],
      },
    });
  });

  it.each([
    ["member", "student"],
    ["staff", "royal_college_staff"],
    ["finance_officer", "royal_college_staff"],
    ["college_president", "president"],
  ] as const)("migrates legacy %s sessions to %s", (legacyRole, canonicalRole) => {
    window.localStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify({
      role: legacyRole,
      displayName: "Legacy User",
      signedInAt: "2026-08-11T07:30:00.000Z",
      userId: "legacy-user",
      collegeCode: "วภท.",
    }));

    expect(readPortalSession()?.role).toBe(canonicalRole);
    expect(JSON.parse(window.localStorage.getItem(PORTAL_SESSION_KEY)!).role).toBe(canonicalRole);
    expect(window.localStorage.getItem(LEGACY_SESSION_KEY)).toBeNull();
  });

  it("falls back to a valid legacy session when current storage is malformed", () => {
    window.localStorage.setItem(PORTAL_SESSION_KEY, "not-json");
    window.localStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify({
      role: "member",
      displayName: "Legacy Student",
      signedInAt: "2026-08-11T07:30:00.000Z",
    }));
    expect(readPortalSession()?.role).toBe("student");
  });

  it("migrates only the recognized legacy Teacher session scope set", () => {
    const baseSession = {
      role: "teacher",
      displayName: "อ. ภก. กิตติพงศ์ วัฒนเภสัช",
      userId: "teacher-001",
      organisation: ORGANISATIONS.siriraj,
      signedInAt: "2026-08-11T07:30:00.000Z",
    } as const;
    window.localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({
      ...baseSession,
      resourceScopes: [
        "course:proposal",
        "course:offering-bcp-101",
        "course:offering-vpt-301",
      ],
    }));

    expect(readPortalSession()?.resourceScopes).toContain("course:assigned");
    expect(JSON.parse(window.localStorage.getItem(PORTAL_SESSION_KEY)!).resourceScopes)
      .toContain("course:assigned");

    window.localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({
      ...baseSession,
      resourceScopes: ["course:proposal", "course:offering-bcp-101"],
    }));
    expect(readPortalSession()?.resourceScopes)
      .toEqual(["course:proposal", "course:offering-bcp-101"]);
  });

  it.each([
    {
      role: "super_admin",
      organisation: ORGANISATIONS.siriraj,
      resourceScopes: ["*"],
    },
    {
      role: "student",
      organisation: ORGANISATIONS.siriraj,
      resourceScopes: ["course:offering-bcp-101"],
    },
  ] as const)("rejects a stored $role session with incompatible Organisation or Resource Scope", (invalid) => {
    window.localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({
      ...invalid,
      displayName: "Invalid Scope",
      userId: "invalid-scope-user",
      signedInAt: "2026-08-11T07:30:00.000Z",
    }));
    expect(readPortalSession()).toBeNull();
  });

  it("emits a same-window event whenever a session is saved", () => {
    const listener = vi.fn();
    window.addEventListener(PORTAL_SESSION_EVENT, listener);
    const session = resolvePortalLogin("teacher", "2323").session;
    savePortalSession(session);
    expect(readPortalSession()).toEqual(session);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(PORTAL_SESSION_EVENT, listener);
  });
});
