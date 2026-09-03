import { describe, expect, it } from "vitest";

import {
  ORGANISATIONS,
  SYSTEM_ROLES,
  type OrganisationScope,
  type SystemRole,
} from "./access-model";
import {
  canPortalSessionAccessArea,
  canPortalSessionAccessScope,
  type PortalArea,
} from "./access-control";
import type { PortalSession } from "./mock-login";

const AREA_CASES: readonly [SystemRole, PortalArea, string, OrganisationScope][] = [
  ["student", "student", "/member/dashboard", ORGANISATIONS.siriraj],
  ["teacher", "teacher", "/teacher/dashboard", ORGANISATIONS.siriraj],
  ["institution_admin", "institution", "/institution/dashboard", ORGANISATIONS.siriraj],
  ["royal_college_staff", "staff", "/staff/dashboard", ORGANISATIONS.royalCollege],
  ["president", "president", "/president/dashboard", ORGANISATIONS.therapeuticCollege],
  ["super_admin", "admin", "/admin/dashboard", ORGANISATIONS.system],
];

function session(
  role: SystemRole,
  organisation: OrganisationScope,
  resourceScopes: string[] = ["*"],
): PortalSession {
  return {
    role,
    displayName: role,
    userId: `${role}-test`,
    organisation,
    resourceScopes,
    signedInAt: "2026-08-11T07:30:00.000Z",
  };
}

describe("canonical portal access", () => {
  it("contains exactly the six approved logged-in roles", () => {
    expect(SYSTEM_ROLES).toEqual([
      "student",
      "teacher",
      "institution_admin",
      "royal_college_staff",
      "president",
      "super_admin",
    ]);
  });

  it.each(AREA_CASES)("allows %s only in its own workspace", (role, area, pathname, organisation) => {
    const current = session(role, organisation);
    expect(canPortalSessionAccessArea(current, area, pathname)).toBe(true);
    for (const [, otherArea, otherPath] of AREA_CASES) {
      if (otherArea !== area) {
        expect(canPortalSessionAccessArea(current, otherArea, otherPath)).toBe(false);
      }
    }
  });

  it("keeps the existing member route as a Student-only compatibility alias", () => {
    expect(canPortalSessionAccessArea(
      session("student", ORGANISATIONS.siriraj, ["student:self"]),
      "member",
      "/member/dashboard",
    )).toBe(true);
  });

  it("allows only Institution Admin into the institution admission-review route", () => {
    const institution = session(
      "institution_admin",
      ORGANISATIONS.siriraj,
      ["institution:org-inst-siriraj"],
    );
    expect(canPortalSessionAccessArea(
      institution,
      "institution",
      "/institution/admissions",
    )).toBe(true);
    expect(canPortalSessionAccessArea(
      session("teacher", ORGANISATIONS.siriraj, ["course:assigned"]),
      "institution",
      "/institution/admissions",
    )).toBe(false);
  });

  it("requires both organisation and resource scope", () => {
    const teacher = session(
      "teacher",
      ORGANISATIONS.siriraj,
      ["course:offering-bcp-101"],
    );
    expect(canPortalSessionAccessArea(teacher, "teacher", "/teacher/courses", {
      organisationId: ORGANISATIONS.siriraj.id,
      resourceId: "course:offering-bcp-101",
    })).toBe(true);
    expect(canPortalSessionAccessArea(teacher, "teacher", "/teacher/courses", {
      organisationId: ORGANISATIONS.chula.id,
      resourceId: "course:offering-bcp-101",
    })).toBe(false);
    expect(canPortalSessionAccessArea(teacher, "teacher", "/teacher/courses", {
      organisationId: ORGANISATIONS.siriraj.id,
      resourceId: "course:offering-vpt-302",
    })).toBe(false);
  });

  it("supports exact organisation checks for central workspaces", () => {
    expect(canPortalSessionAccessArea(
      session("royal_college_staff", ORGANISATIONS.royalCollege, ["staff:central"]),
      "staff",
      "/staff/finance",
      {
        exactOrganisationId: ORGANISATIONS.royalCollege.id,
        resourceId: "staff:central",
      },
    )).toBe(true);
    expect(canPortalSessionAccessArea(
      session("royal_college_staff", ORGANISATIONS.therapeuticCollege, ["*"]),
      "staff",
      "/staff/finance",
      {
        exactOrganisationId: ORGANISATIONS.royalCollege.id,
        resourceId: "staff:central",
      },
    )).toBe(false);
    expect(canPortalSessionAccessArea(
      session("royal_college_staff", ORGANISATIONS.royalCollege, ["staff:requests"]),
      "staff",
      "/staff/finance",
      {
        exactOrganisationId: ORGANISATIONS.royalCollege.id,
        resourceId: "staff:central",
      },
    )).toBe(false);
  });

  it("lets a parent organisation see child organisations but not siblings", () => {
    const staff = session("royal_college_staff", ORGANISATIONS.royalCollege);
    const institution = session("institution_admin", ORGANISATIONS.siriraj);
    expect(canPortalSessionAccessScope(staff, {
      organisationId: ORGANISATIONS.chula.id,
      resourceId: "registration:demo",
    })).toBe(true);
    expect(canPortalSessionAccessScope(institution, {
      organisationId: ORGANISATIONS.chula.id,
    })).toBe(false);
  });

  it("supports prefix resource grants without granting unrelated resources", () => {
    const teacher = session("teacher", ORGANISATIONS.siriraj, ["course:offering-bcp-*"]);
    expect(canPortalSessionAccessScope(teacher, { resourceId: "course:offering-bcp-101" })).toBe(true);
    expect(canPortalSessionAccessScope(teacher, { resourceId: "invoice:001" })).toBe(false);
  });

  it("limits Super Admin to governance routes", () => {
    const admin = session("super_admin", ORGANISATIONS.system);
    for (const pathname of [
      "/admin/dashboard",
      "/admin/users",
      "/admin/scopes/resource",
      "/admin/organisations",
      "/admin/terms",
      "/admin/integrations",
      "/admin/audit",
      "/admin/break-glass",
      "/admin/settings",
    ]) {
      expect(canPortalSessionAccessArea(admin, "admin", pathname)).toBe(true);
    }
  });

  it("denies Super Admin direct access to routine business routes", () => {
    const admin = session("super_admin", ORGANISATIONS.system);
    for (const route of [
      "admissions",
      "requests",
      "research",
      "registrations",
      "finance",
      "courses",
      "programs",
      "students",
      "exams",
      "certificates",
    ]) {
      expect(canPortalSessionAccessArea(admin, "admin", `/admin/${route}`)).toBe(false);
    }
  });
});
