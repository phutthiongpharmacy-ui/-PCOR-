"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_ROLE_ASSIGNMENTS,
  type RoleAssignment,
  validateRoleAssignment,
} from "./role-assignment";
import {
  COLLEGE_ORGANISATIONS,
  ORGANISATIONS,
  isOrganisationScope,
  isSystemRole,
  type OrganisationScope,
  type SystemRole,
} from "./access-model";

export const ROLE_ASSIGNMENT_STORAGE_KEY = "royal-college.mock-role-assignments.v2";
const LEGACY_STORAGE_KEY = "royal-college.mock-role-assignments.v1";
const STORAGE_EVENT = "royal-college:role-assignments-updated";

function cloneDefaults(): RoleAssignment[] {
  return DEFAULT_ROLE_ASSIGNMENTS.map((assignment) => ({
    ...assignment,
    organisationScope: { ...assignment.organisationScope },
    resourceScopes: [...assignment.resourceScopes],
  }));
}

function legacyRole(value: unknown): SystemRole | null {
  if (isSystemRole(value)) return value;
  if (value === "member") return "student";
  if (value === "staff" || value === "finance_officer") return "royal_college_staff";
  if (value === "college_president") return "president";
  return null;
}

function legacyOrganisation(role: SystemRole, collegeCode?: string): OrganisationScope {
  if (role === "super_admin") return ORGANISATIONS.system;
  if (role === "royal_college_staff") return ORGANISATIONS.royalCollege;
  if (role === "student" || role === "teacher" || role === "institution_admin") {
    return ORGANISATIONS.siriraj;
  }
  if (collegeCode === ORGANISATIONS.royalCollege.code) return ORGANISATIONS.royalCollege;
  return COLLEGE_ORGANISATIONS.find((organisation) => organisation.code === collegeCode)
    ?? ORGANISATIONS.therapeuticCollege;
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

export function normalizeStoredRoleAssignment(value: unknown): RoleAssignment | null {
  if (!value || typeof value !== "object") return null;
  const assignment = value as Partial<RoleAssignment>;
  const role = legacyRole(assignment.role);
  if (!role || !(
    typeof assignment.id === "string" &&
    typeof assignment.userId === "string" &&
    typeof assignment.userName === "string" &&
    typeof assignment.email === "string" &&
    typeof assignment.collegeCode === "string" &&
    typeof assignment.collegeName === "string" &&
    typeof assignment.startsAt === "string" &&
    typeof assignment.endsAt === "string" &&
    typeof assignment.appointedBy === "string"
  )) return null;

  const organisationScope = isOrganisationScope(assignment.organisationScope)
    ? { ...assignment.organisationScope }
    : legacyOrganisation(role, assignment.collegeCode);

  return {
    id: assignment.id,
    userId: assignment.userId,
    userName: assignment.userName,
    email: assignment.email,
    role,
    organisationScope,
    resourceScopes: Array.isArray(assignment.resourceScopes)
      ? assignment.resourceScopes.filter((scope): scope is string => typeof scope === "string")
      : defaultResourceScopes(role, organisationScope),
    collegeCode: assignment.collegeCode,
    collegeName: assignment.collegeName,
    startsAt: assignment.startsAt,
    endsAt: assignment.endsAt,
    appointedBy: assignment.appointedBy,
  };
}

function readAssignments() {
  const current = window.localStorage.getItem(ROLE_ASSIGNMENT_STORAGE_KEY);
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  const serialized = current ?? legacy;
  if (!serialized) return cloneDefaults();
  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed)) {
    throw new Error("รูปแบบข้อมูลวาระไม่ถูกต้อง");
  }
  const normalized = parsed.map(normalizeStoredRoleAssignment);
  if (normalized.some((assignment) => !assignment)) {
    throw new Error("รูปแบบข้อมูลวาระไม่ถูกต้อง");
  }
  const assignments = normalized as RoleAssignment[];
  if (!current || JSON.stringify(parsed) !== JSON.stringify(assignments)) {
    window.localStorage.setItem(ROLE_ASSIGNMENT_STORAGE_KEY, JSON.stringify(assignments));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
  return assignments;
}

export function useRoleAssignmentStore() {
  const [assignments, setAssignments] = useState<RoleAssignment[]>(cloneDefaults);
  const assignmentsRef = useRef(assignments);
  const [isReady, setIsReady] = useState(false);
  const [storageError, setStorageError] = useState("");

  const reload = useCallback(() => {
    try {
      const next = readAssignments();
      assignmentsRef.current = next;
      setAssignments(next);
      setStorageError("");
    } catch {
      const fallback = cloneDefaults();
      assignmentsRef.current = fallback;
      setAssignments(fallback);
      setStorageError("อ่านข้อมูลวาระไม่สำเร็จ ระบบกำลังใช้ข้อมูลเริ่มต้น");
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    window.addEventListener("storage", reload);
    window.addEventListener(STORAGE_EVENT, reload);
    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener(STORAGE_EVENT, reload);
    };
  }, [reload]);

  const persist = useCallback((next: RoleAssignment[]) => {
    try {
      window.localStorage.setItem(ROLE_ASSIGNMENT_STORAGE_KEY, JSON.stringify(next));
      setStorageError("");
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch {
      setStorageError("บันทึกข้อมูลวาระไม่สำเร็จ การเปลี่ยนแปลงอาจหายเมื่อรีเฟรช");
    }
  }, []);

  const addAssignment = useCallback((assignment: RoleAssignment) => {
    const validationError = validateRoleAssignment(assignment, assignmentsRef.current);
    if (validationError) return validationError;
    const next = [...assignmentsRef.current, assignment].sort((left, right) =>
      left.startsAt.localeCompare(right.startsAt),
    );
    assignmentsRef.current = next;
    setAssignments(next);
    persist(next);
    return null;
  }, [persist]);

  return { assignments, addAssignment, isReady, storageError };
}
