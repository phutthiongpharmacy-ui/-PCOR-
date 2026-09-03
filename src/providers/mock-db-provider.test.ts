import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  canTeacherAccessOffering,
  DEFAULT_COURSE_OFFERINGS,
  type CourseProposalActor,
  type ScopedAcademicActor,
} from "@/roles/shared/features/academic";
import {
  AUDIT_STORAGE_KEY,
  readAuditEvents,
} from "@/roles/shared/features/audit";

import {
  normalizeRegistrationInvoices,
  normalizeRegistrations,
  normalizeCourseOfferingChangeRequests,
  normalizeCourseProposals,
  normalizeTeachingAssignments,
  MockDbProvider,
  useMockDb,
} from "./mock-db-provider";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(MockDbProvider, null, children);
}

beforeEach(() => {
  window.localStorage.clear();
});

const teacherProposalActor: CourseProposalActor = {
  userId: "teacher-001",
  userName: "อ. ภก. กิตติพงศ์ วัฒนเภสัช",
  role: "teacher",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["course:proposal", "course:offering-bcp-101", "course:offering-vpt-301"],
};

const staffProposalActor: CourseProposalActor = {
  userId: "staff-001",
  userName: "ภญ. ปาริชาติ สุขเกษม",
  role: "royal_college_staff",
  organisationId: "org-royal-college",
  resourceScopes: ["staff:central"],
};

const institutionActor: ScopedAcademicActor = {
  userId: "institution-admin-001",
  userName: "ภก. วิชาญ อัครเวช",
  role: "institution_admin",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["institution:org-inst-siriraj"],
};

const chulaInstitutionActor: ScopedAcademicActor = {
  userId: "institution-admin-002",
  userName: "ภญ. อรอนงค์ วัฒนกิจ",
  role: "institution_admin",
  organisationId: "org-inst-chula",
  resourceScopes: ["institution:org-inst-chula"],
};

const teacherAssignmentActor: ScopedAcademicActor = {
  ...teacherProposalActor,
  resourceScopes: [...teacherProposalActor.resourceScopes, "course:offering-bcp-220"],
};

describe("mock DB registration migration", () => {
  it("upgrades legacy registration records with history and credits", () => {
    const [registration] = normalizeRegistrations([{
      id: "REG-LEGACY",
      studentId: "STUDENT-OLD",
      studentName: "ผู้ใช้เดิม",
      courseId: "OLD-101",
      courseCode: "OLD-101",
      courseTitle: "วิชาเดิม",
      term: "1/2569",
      status: "approved",
      submittedAt: "24 มิ.ย. 2569",
    }]);

    expect(registration).toMatchObject({
      id: "REG-LEGACY",
      credits: 3,
      status: "awaiting_payment",
      courseOfferingId: "OLD-101",
    });
    expect(registration.history[0]).toMatchObject({
      to: "approved",
      actor: "migration",
    });
    expect(registration.history.at(-1)).toMatchObject({
      from: "approved",
      to: "awaiting_payment",
      actor: "system",
    });
  });

  it("creates and unlocks a missing invoice for a legacy approval", () => {
    const registrations = normalizeRegistrations([{
      id: "REG-LEGACY",
      studentId: "STUDENT-OLD",
      studentName: "ผู้ใช้เดิม",
      courseId: "OLD-101",
      courseCode: "OLD-101",
      courseTitle: "วิชาเดิม",
      term: "1/2569",
      status: "approved",
      submittedAt: "2026-06-24T03:00:00.000Z",
    }]);
    const invoice = normalizeRegistrationInvoices([], registrations)
      .find((item) => item.registrationId === "REG-LEGACY");

    expect(invoice?.status).toBe("awaiting_payment");
    expect(invoice?.dueAt).toMatch(/T23:59:59\+07:00$/);
  });

  it("derives System eligibility and keeps an unverified student out of the teacher queue", async () => {
    window.localStorage.setItem("mock_settings", JSON.stringify({
      admissionOpen: true,
      registrationOpen: true,
      registrationOpensAt: "2026-01-01T00:00:00+07:00",
      registrationClosesAt: "2027-01-01T00:00:00+07:00",
    }));
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const before = result.current.registrations.length;

    expect(() => result.current.submitRegistrations([{
      studentId: "STUDENT-UNVERIFIED",
      studentName: "ผู้เรียนรอตรวจสอบ",
      courseId: "BCP-101",
      courseOfferingId: "offering-bcp-101",
      institutionId: "org-inst-siriraj",
      courseCode: "BCP-101",
      courseTitle: "เภสัชบำบัดพื้นฐาน",
      credits: 3,
      term: "1/2569",
    }])).toThrowError("Registration eligibility is manual_review");
    expect(result.current.registrations).toHaveLength(before);
  });

  it("rejects submissions outside the persisted registration window", async () => {
    window.localStorage.setItem("mock_settings", JSON.stringify({
      admissionOpen: true,
      registrationOpen: true,
      registrationOpensAt: "2026-08-01T00:00:00+07:00",
      registrationClosesAt: "2026-08-02T00:00:00+07:00",
    }));
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const before = result.current.registrations.length;

    expect(() => result.current.submitRegistrations([{
      studentId: "วภท-2568-001",
      studentName: "ภก. สมชาย ใจดี",
      courseId: "BCP-101",
      courseOfferingId: "offering-bcp-101",
      institutionId: "org-inst-siriraj",
      courseCode: "BCP-101",
      courseTitle: "เภสัชบำบัดพื้นฐาน",
      credits: 3,
      term: "1/2569",
    }])).toThrowError("Registration window is not open");
    expect(result.current.registrations).toHaveLength(before);
  });

  it("rejects an offering that is no longer open", async () => {
    window.localStorage.setItem("mock_settings", JSON.stringify({
      admissionOpen: true,
      registrationOpen: true,
      registrationOpensAt: "2026-01-01T00:00:00+07:00",
      registrationClosesAt: "2027-01-01T00:00:00+07:00",
    }));
    window.localStorage.setItem("mock_course_offerings", JSON.stringify(
      DEFAULT_COURSE_OFFERINGS.map((offering) => (
        offering.id === "offering-bcp-101" ? { ...offering, status: "closed" } : offering
      )),
    ));
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const before = result.current.registrations.length;

    expect(() => result.current.submitRegistrations([{
      studentId: "วภท-2568-001",
      studentName: "ภก. สมชาย ใจดี",
      courseId: "BCP-101",
      courseOfferingId: "offering-bcp-101",
      institutionId: "org-inst-siriraj",
      courseCode: "BCP-101",
      courseTitle: "เภสัชบำบัดพื้นฐาน",
      credits: 3,
      term: "1/2569",
    }])).toThrowError("Course offering offering-bcp-101 is not open");
    expect(result.current.registrations).toHaveLength(before);
  });

  it("lets only an assigned teacher approve into awaiting payment and audits it", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.reviewRegistration({
      registrationId: "REG-001",
      decision: "approve",
      actor: {
        userId: "teacher-001",
        userName: "อ. ภก. กิตติพงศ์ วัฒนเภสัช",
        role: "teacher",
        organisationId: "org-inst-siriraj",
        resourceScopes: ["course:offering-bcp-101"],
      },
      reason: "ตรวจคุณสมบัติและข้อมูลรายวิชาครบถ้วน",
    }));

    expect(result.current.registrations.find((item) => item.id === "REG-001")?.status)
      .toBe("awaiting_payment");
    expect(result.current.registrationInvoices.find((item) => item.registrationId === "REG-001")?.status)
      .toBe("awaiting_payment");
    expect(readAuditEvents().at(-1)).toMatchObject({
      action: "registration.approve",
      actor: { userId: "teacher-001", role: "teacher" },
      resource: { id: "REG-001", organisationId: "org-inst-siriraj" },
    });
  });

  it("blocks an actively assigned teacher whose course Resource Scope was revoked", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(() => result.current.reviewRegistration({
      registrationId: "REG-001",
      decision: "approve",
      actor: {
        ...teacherProposalActor,
        resourceScopes: [],
      },
      reason: "พยายามอนุมัติหลังถูกถอน Resource Scope",
    })).toThrowError("Teacher Resource Scope does not cover this course");
    expect(result.current.registrations.find((item) => item.id === "REG-001")?.status)
      .toBe("pending");
  });

  it("blocks a teacher from another institution", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(() => result.current.reviewRegistration({
      registrationId: "REG-001",
      decision: "approve",
      actor: {
        userId: "teacher-002",
        userName: "อ. ภญ. ชนิดา ศรีสุข",
        role: "teacher",
        organisationId: "org-inst-chula",
        resourceScopes: ["course:offering-bcp-101"],
      },
      reason: "ตรวจคุณสมบัติและข้อมูลรายวิชาครบถ้วน",
    })).toThrowError("Teacher cannot review a registration outside their assignment");
  });

  it("moves a paid registration to enrolled and creates a pending result", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.reviewRegistration({
      registrationId: "REG-MEMBER-002",
      decision: "approve",
      actor: {
        userId: "teacher-002",
        userName: "อ. ภญ. ชนิดา ศรีสุข",
        role: "teacher",
        organisationId: "org-inst-chula",
        resourceScopes: ["course:offering-vpt-302"],
      },
      reason: "ตรวจคุณสมบัติและข้อมูลรายวิชาครบถ้วน",
    }));
    const invoice = result.current.registrationInvoices.find((item) => (
      item.registrationId === "REG-MEMBER-002"
    ))!;
    act(() => result.current.addPayment({
      id: "PAY-REG-MEMBER-002",
      invoiceId: invoice.id,
      studentId: "วภท-2568-001",
      name: "ภก. สมชาย ใจดี",
      program: "เภสัชบำบัด",
      amount: invoice.baseAmount,
      date: "11 ส.ค. 2569",
      status: "approved",
      type: invoice.description,
      method: "promptpay",
      submittedAt: "2026-08-11T03:00:00.000Z",
    }));

    expect(result.current.registrations.find((item) => item.id === "REG-MEMBER-002")?.status)
      .toBe("enrolled");
    expect(result.current.subjectResults).toContainEqual(expect.objectContaining({
      studentId: "วภท-2568-001",
      courseOfferingId: "offering-vpt-302",
      status: "pending",
    }));
    expect(readAuditEvents().at(-1)).toMatchObject({
      action: "payment.confirmed",
      actor: {
        userId: "system-payment",
        role: "system_actor",
        organisation: { id: "org-system" },
      },
      resource: {
        id: invoice.id,
        organisationId: "org-inst-chula",
      },
      before: {
        invoice: { status: "awaiting_payment" },
        registration: { status: "awaiting_payment" },
      },
      after: {
        invoice: { status: "paid" },
        registration: { status: "enrolled" },
      },
      evidenceReference: "payment:PAY-REG-MEMBER-002",
    });
  });

  it("publishes and revises S/U without overwriting history", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const actor = {
      userId: "teacher-001",
      userName: "อ. ภก. กิตติพงศ์ วัฒนเภสัช",
      role: "teacher" as const,
      organisationId: "org-inst-siriraj",
      resourceScopes: ["course:assigned"],
    };

    act(() => result.current.publishSubjectResult({ resultId: "result-draft-001", actor }));
    act(() => result.current.reviseSubjectResult({
      resultId: "result-draft-001",
      value: "U",
      reason: "ตรวจหลักฐานการประเมินใหม่",
      actor,
    }));

    const revised = result.current.subjectResults.find((item) => item.id === "result-draft-001");
    expect(revised).toMatchObject({ status: "revised", currentValue: "U" });
    expect(revised?.revisions).toHaveLength(2);
    expect(revised?.revisions[1]).toMatchObject({ previousValue: "S", newValue: "U" });
    expect(readAuditEvents().slice(-2).map((event) => event.action))
      .toEqual(["result.publish", "result.revise"]);
  });

  it("blocks every result mutation when an assigned teacher lacks the course Resource Scope", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const actor = {
      ...teacherProposalActor,
      resourceScopes: ["course:offering-not-assigned"],
    };

    expect(() => result.current.saveSubjectResultDraft({
      resultId: "result-pending-001",
      value: "S",
      actor,
    })).toThrowError("Teacher Resource Scope does not cover this course");
    expect(() => result.current.publishSubjectResult({
      resultId: "result-draft-001",
      actor,
    })).toThrowError("Teacher Resource Scope does not cover this course");
    expect(() => result.current.reviseSubjectResult({
      resultId: "result-published-001",
      value: "U",
      reason: "พยายามแก้ไขหลังถูกถอน Resource Scope",
      actor,
    })).toThrowError("Teacher Resource Scope does not cover this course");

    expect(result.current.subjectResults.find((item) => item.id === "result-pending-001")?.status)
      .toBe("pending");
    expect(result.current.subjectResults.find((item) => item.id === "result-draft-001")?.status)
      .toBe("draft");
    expect(result.current.subjectResults.find((item) => item.id === "result-published-001")?.status)
      .toBe("published");
  });

  it("lets an Institution Admin assign an active unaffiliated course teacher", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.assignTeacherToCourse({
      teacherId: "teacher-003",
      courseOfferingId: "offering-bcp-101",
      actor: {
        userId: "institution-admin-001",
        userName: "ภก. วิชาญ อัครเวช",
        role: "institution_admin",
        organisationId: "org-inst-siriraj",
        resourceScopes: ["institution:org-inst-siriraj"],
      },
      startsAt: "2026-08-11T00:00:00.000Z",
      reason: "เพิ่มผู้รับผิดชอบรายวิชา",
    }));

    expect(result.current.teachingAssignments).toContainEqual(expect.objectContaining({
      teacherId: "teacher-003",
      courseOfferingId: "offering-bcp-101",
      institutionId: "org-inst-siriraj",
      status: "pending_teacher_response",
    }));
    expect(readAuditEvents().at(-1)).toMatchObject({
      action: "teaching_assignment.change",
      actor: { resourceScopes: ["institution:org-inst-siriraj"] },
    });
  });

  it("lets an Institution Admin manage affiliations and course status only in their institution", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const actor = {
      userId: "institution-admin-001",
      userName: "ภก. วิชาญ อัครเวช",
      role: "institution_admin" as const,
      organisationId: "org-inst-siriraj",
      resourceScopes: ["institution:org-inst-siriraj"],
    };

    act(() => result.current.updateAffiliationStatus({
      affiliationType: "student",
      affiliationId: "student-affiliation-002",
      status: "inactive",
      actor,
      reason: "สิ้นสุดช่วงการฝึกอบรมตามข้อมูลสถาบัน",
    }));
    act(() => result.current.updateCourseOfferingStatus({
      courseOfferingId: "offering-bcp-101",
      status: "closed",
      actor,
      reason: "ปิดรับผู้เรียนในรุ่นปัจจุบัน",
    }));

    expect(result.current.studentAffiliations.find((item) => item.id === "student-affiliation-002"))
      .toMatchObject({ status: "inactive" });
    expect(result.current.courseOfferings.find((item) => item.id === "offering-bcp-101"))
      .toMatchObject({ status: "closed" });
    expect(readAuditEvents().slice(-2).map((event) => event.action))
      .toEqual(["access.role_scope_change", "course_offering.update"]);

    expect(() => result.current.updateAffiliationStatus({
      affiliationType: "teacher",
      affiliationId: "teacher-affiliation-002",
      status: "inactive",
      actor,
      reason: "พยายามแก้ข้ามสถาบัน",
    })).toThrowError("บัญชีนี้ไม่มีสิทธิ์จัดการข้อมูลของสถาบันดังกล่าว");
  });
});

describe("mock DB Institution admission workflow", () => {
  it("seeds 15 applications for the Siriraj institution queue", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const sirirajAdmissions = result.current.admissions.filter((admission) => (
      admission.institutionId === institutionActor.organisationId
    ));

    expect(sirirajAdmissions).toHaveLength(15);
    expect(new Set(sirirajAdmissions.map((admission) => admission.id)).size).toBe(15);
    expect(new Set(sirirajAdmissions.map((admission) => admission.applicationType)))
      .toEqual(new Set(["exam", "study"]));
    expect(new Set(sirirajAdmissions.map((admission) => admission.status)))
      .toEqual(new Set(["pending", "approved", "rejected"]));
  });

  it("reviews and approves only an in-scope application with an audit trail", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.reviewInstitutionAdmission({
      admissionId: "APP-2026-001",
      actor: institutionActor,
      decision: "documents_complete",
    }));
    expect(result.current.admissions.find((item) => item.id === "APP-2026-001"))
      .toMatchObject({ documentStatus: "complete", status: "pending" });

    act(() => result.current.reviewInstitutionAdmission({
      admissionId: "APP-2026-001",
      actor: institutionActor,
      decision: "approve",
      reason: "ตรวจเอกสารและคุณสมบัติครบถ้วน",
    }));
    expect(result.current.admissions.find((item) => item.id === "APP-2026-001"))
      .toMatchObject({
        status: "approved",
        decisionNote: "ตรวจเอกสารและคุณสมบัติครบถ้วน",
        reviewedBy: institutionActor.userName,
      });
    expect(readAuditEvents().slice(-2).map((event) => event.action))
      .toEqual(["admission.documents_reviewed", "admission.approve"]);

    expect(() => result.current.reviewInstitutionAdmission({
      admissionId: "APP-2026-003",
      actor: institutionActor,
      decision: "reject",
      reason: "พยายามพิจารณาข้ามสถาบัน",
    })).toThrowError("บัญชีนี้ไม่มีสิทธิ์จัดการข้อมูลของสถาบันดังกล่าว");
  });
});

describe("mock DB Institution academic workflow", () => {
  it("migrates legacy assignments to accepted without dropping custom records", () => {
    const normalized = normalizeTeachingAssignments([{
      id: "teaching-assignment-legacy",
      teacherId: "teacher-001",
      courseOfferingId: "offering-bcp-101",
      institutionId: "org-inst-siriraj",
      startsAt: "2026-01-01T00:00:00.000Z",
      assignedBy: "institution-admin-001",
      assignedAt: "2026-01-01T00:00:00.000Z",
    }]);
    const legacy = normalized.find((item) => item.id === "teaching-assignment-legacy");

    expect(legacy).toMatchObject({
      status: "accepted",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(normalized.some((item) => item.id === "teaching-assignment-001")).toBe(true);
  });

  it("drops an explicit unknown assignment status instead of failing open to accepted", () => {
    const normalized = normalizeTeachingAssignments([{
      id: "teaching-assignment-001",
      teacherId: "teacher-001",
      courseOfferingId: "offering-bcp-101",
      institutionId: "org-inst-siriraj",
      startsAt: "2026-01-01T00:00:00.000Z",
      assignedBy: "institution-admin-001",
      assignedAt: "2026-01-01T00:00:00.000Z",
      status: "unknown_future_status",
    }]);

    expect(normalized.some((item) => item.id === "teaching-assignment-001")).toBe(false);
    expect(normalized.some((item) => item.id === "teaching-assignment-002")).toBe(true);
  });

  it("hydrates pending assignment and course-change demo states", async () => {
    expect(new Set(normalizeCourseOfferingChangeRequests([]).map((item) => item.status)))
      .toEqual(new Set(["pending_teacher_review", "needs_revision"]));
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.teachingAssignments.find((item) => item.id === "teaching-assignment-005"))
      .toMatchObject({ status: "pending_teacher_response", courseOfferingId: "offering-bcp-220" });
    expect(result.current.courseOfferingChangeRequests).toHaveLength(2);
  });

  it("sanitizes legacy sections from active data without rewriting audit history", async () => {
    const offering = DEFAULT_COURSE_OFFERINGS.find((item) => item.id === "offering-bcp-101")!;
    const request = normalizeCourseOfferingChangeRequests([])
      .find((item) => item.id === "COCHG-2569-001")!;
    const auditEvent = readAuditEvents()[0]!;
    const historicalAudit = JSON.stringify([{
      ...auditEvent,
      before: { courseOffering: { ...offering, section: "SIR-01" } },
      after: { courseOffering: { ...offering, section: "SIR-02" } },
    }]);

    window.localStorage.setItem("mock_course_offerings", JSON.stringify([{
      ...offering,
      term: "2/2570",
      section: "LEGACY-01",
    }]));
    window.localStorage.setItem("mock_course_offering_change_requests", JSON.stringify([
      {
        ...request,
        id: "COCHG-LEGACY-MIXED",
        proposedChanges: { term: "2/2570", section: "LEGACY-02" },
      },
      {
        ...request,
        proposedChanges: { section: "LEGACY-03" },
      },
    ]));
    window.localStorage.setItem(AUDIT_STORAGE_KEY, historicalAudit);

    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const hydratedOffering = result.current.courseOfferings.find((item) => item.id === offering.id);
    const mixedRequest = result.current.courseOfferingChangeRequests.find((item) => (
      item.id === "COCHG-LEGACY-MIXED"
    ));
    const archivedSectionRequest = result.current.courseOfferingChangeRequests.find((item) => (
      item.id === "COCHG-2569-001"
    ));
    expect(hydratedOffering).toMatchObject({ term: "2/2570" });
    expect(hydratedOffering).not.toHaveProperty("section");
    expect(mixedRequest?.proposedChanges).toEqual({ term: "2/2570" });
    expect(mixedRequest?.history).toEqual(request.history);
    expect(archivedSectionRequest).toMatchObject({
      status: "rejected",
      proposedChanges: {},
      latestReview: { decision: "rejected" },
    });
    expect(archivedSectionRequest?.history.at(-1)?.reason)
      .toBe("ระบบยุติคำขอเดิมเนื่องจากปรับโครงสร้างรายการเปิดสอน");

    await waitFor(() => {
      expect(window.localStorage.getItem("mock_course_offerings") ?? "")
        .not.toContain('"section"');
      expect(window.localStorage.getItem("mock_course_offering_change_requests") ?? "")
        .not.toContain('"section"');
      expect(window.localStorage.getItem("mock_db_schema_version")).toBe("8");
    });
    expect(normalizeCourseOfferingChangeRequests(JSON.parse(
      window.localStorage.getItem("mock_course_offering_change_requests") ?? "[]",
    )).find((item) => item.id === "COCHG-2569-001")).toMatchObject({
      status: "rejected",
      proposedChanges: {},
    });
    expect(window.localStorage.getItem(AUDIT_STORAGE_KEY)).toBe(historicalAudit);
  });

  it("adds, edits, and softly ends an Institution teacher with audited scope", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.addInstitutionTeacher({
      actor: institutionActor,
      name: "อ. ภญ. รวิภา เมตตา",
      reason: "เพิ่มอาจารย์ประจำสถาบัน",
    }));
    const teacher = result.current.academicTeachers.find((item) => item.name === "อ. ภญ. รวิภา เมตตา")!;
    expect(teacher).toBeTruthy();
    expect(result.current.teacherAffiliations).toContainEqual(expect.objectContaining({
      teacherId: teacher.id,
      institutionId: institutionActor.organisationId,
      status: "active",
    }));

    act(() => result.current.updateInstitutionTeacher({
      actor: institutionActor,
      teacherId: teacher.id,
      name: "อ. ภญ. รวิภา เมตตากุล",
      reason: "แก้ไขชื่อให้ตรงกับเอกสารประจำตัว",
    }));
    expect(result.current.academicTeachers.find((item) => item.id === teacher.id)?.name)
      .toBe("อ. ภญ. รวิภา เมตตากุล");

    act(() => result.current.endInstitutionTeacherAffiliation({
      actor: institutionActor,
      teacherId: teacher.id,
      reason: "สิ้นสุดการปฏิบัติงานในสถาบัน",
    }));
    expect(result.current.teacherAffiliations.find((item) => item.teacherId === teacher.id)?.status)
      .toBe("inactive");
    expect(readAuditEvents().slice(-3).map((event) => event.action)).toEqual([
      "business_record.create",
      "business_record.update",
      "access.role_scope_change",
    ]);
    expect(readAuditEvents().at(-1)?.actor.resourceScopes)
      .toEqual(institutionActor.resourceScopes);
  });

  it("blocks Institution mutations outside Resource Scope and ending assigned teachers", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(() => result.current.addInstitutionTeacher({
      actor: { ...institutionActor, resourceScopes: [] },
      name: "อาจารย์นอกสิทธิ์",
      reason: "ทดสอบขอบเขต",
    })).toThrowError("บัญชีนี้ไม่มีสิทธิ์จัดการข้อมูลของสถาบันดังกล่าว");
    expect(() => result.current.endInstitutionTeacherAffiliation({
      actor: institutionActor,
      teacherId: "teacher-001",
      reason: "ทดสอบการสิ้นสุดสังกัด",
    })).toThrowError("กรุณายกเลิกการมอบหมายการสอนที่ยังมีผลก่อนสิ้นสุดสังกัดอาจารย์");
  });

  it("requires every assignment window to stay within the Teacher affiliation", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(() => result.current.addInstitutionTeacher({
      actor: institutionActor,
      name: "อาจารย์วันสิ้นสุดไม่ถูกต้อง",
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "not-a-date",
      reason: "ทดสอบวันสิ้นสุด",
    })).toThrowError("วันสิ้นสุดสังกัดไม่ถูกต้อง");

    act(() => result.current.addInstitutionTeacher({
      actor: institutionActor,
      name: "อ. ภก. อายุสังกัด จำกัด",
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2026-09-01T00:00:00.000Z",
      reason: "เพิ่มอาจารย์ตามสัญญาระยะสั้น",
    }));
    const teacher = result.current.academicTeachers.find((item) => (
      item.name === "อ. ภก. อายุสังกัด จำกัด"
    ))!;

    expect(() => result.current.assignTeacherToCourse({
      actor: institutionActor,
      teacherId: teacher.id,
      courseOfferingId: "offering-bcp-220",
      startsAt: "2026-08-20T00:00:00.000Z",
      endsAt: "2026-10-01T00:00:00.000Z",
      reason: "ทดสอบช่วงมอบหมายเกินสังกัด",
    })).toThrowError("ช่วงเวลามอบหมายต้องอยู่ภายในช่วงสังกัดของอาจารย์ในสถาบันนี้");
  });

  it("creates distinct Teacher identities for equal display names across institutions", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.addInstitutionTeacher({
      actor: institutionActor,
      name: "อ. ภญ. วารุณี ร่วมสอน",
      reason: "เพิ่มอาจารย์ในสถาบันศิริราช",
    }));
    act(() => result.current.addInstitutionTeacher({
      actor: chulaInstitutionActor,
      name: "อ. ภญ. วารุณี ร่วมสอน",
      reason: "เพิ่มสังกัดร่วมในสถาบันจุฬาฯ",
    }));

    const matchingTeachers = result.current.academicTeachers.filter((item) => (
      item.name === "อ. ภญ. วารุณี ร่วมสอน"
    ));
    expect(matchingTeachers).toHaveLength(2);
    expect(new Set(matchingTeachers.map((item) => item.id)).size).toBe(2);
  });

  it("blocks global Teacher renames when another institution has historical affiliation", async () => {
    window.localStorage.setItem("mock_teacher_affiliations", JSON.stringify([{
      id: "teacher-affiliation-historical-chula",
      teacherId: "teacher-001",
      institutionId: "org-inst-chula",
      startsAt: "2024-01-01T00:00:00.000Z",
      endsAt: "2025-01-01T00:00:00.000Z",
      status: "inactive",
    }]));
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(() => result.current.updateInstitutionTeacher({
      actor: institutionActor,
      teacherId: "teacher-001",
      name: "อ. ภญ. วารุณี เปลี่ยนชื่อ",
      reason: "ทดสอบขอบเขตข้อมูลกลาง",
    })).toThrowError("ไม่สามารถแก้ชื่อกลางของอาจารย์ที่สังกัดมากกว่าหนึ่งสถาบัน");
    expect(result.current.academicTeachers.find((item) => item.id === "teacher-001")?.name)
      .toBe("อ. ภก. กิตติพงศ์ วัฒนเภสัช");
  });

  it("counts pending assignment changes when checking duplicates and ending affiliations", async () => {
    window.localStorage.setItem("mock_teaching_assignments", JSON.stringify([{
      id: "teaching-assignment-pending-transfer",
      teacherId: "teacher-001",
      courseOfferingId: "offering-bcp-101",
      institutionId: "org-inst-siriraj",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2027-01-01T00:00:00.000Z",
      assignedBy: "institution-admin-001",
      assignedAt: "2026-01-01T00:00:00.000Z",
      status: "accepted",
      updatedAt: "2026-08-18T00:00:00.000Z",
      pendingChanges: {
        teacherId: "teacher-003",
        courseOfferingId: "offering-bcp-220",
        startsAt: "2026-09-01T00:00:00.000Z",
        endsAt: "2027-01-01T00:00:00.000Z",
      },
    }]));
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(() => result.current.assignTeacherToCourse({
      actor: institutionActor,
      teacherId: "teacher-003",
      courseOfferingId: "offering-bcp-220",
      startsAt: "2026-09-01T00:00:00.000Z",
      endsAt: "2027-01-01T00:00:00.000Z",
      reason: "ทดสอบรายการซ้ำกับคำขอแก้ไข",
    })).toThrowError("อาจารย์ท่านนี้ได้รับมอบหมายรายวิชานี้อยู่แล้ว");
    expect(() => result.current.endInstitutionTeacherAffiliation({
      actor: institutionActor,
      teacherId: "teacher-003",
      reason: "ทดสอบสิ้นสุดสังกัดขณะมีคำขอโอนงาน",
    })).toThrowError("กรุณายกเลิกการมอบหมายการสอนที่ยังมีผลก่อนสิ้นสุดสังกัดอาจารย์");
  });

  it("prevents assignment changes from orphaning an outstanding course review", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const before = result.current.teachingAssignments.find((item) => (
      item.id === "teaching-assignment-001"
    ));

    expect(() => result.current.cancelTeachingAssignment({
      actor: institutionActor,
      assignmentId: "teaching-assignment-001",
      reason: "ทดสอบยกเลิกผู้ตรวจคำขอ",
    })).toThrowError("ไม่สามารถเปลี่ยนหรือยกเลิกการมอบหมายนี้ได้ เนื่องจากมีคำขอปรับข้อมูลรายวิชาที่ยังรอการดำเนินการ");
    expect(() => result.current.updateTeachingAssignment({
      actor: institutionActor,
      assignmentId: "teaching-assignment-001",
      teacherId: "teacher-003",
      courseOfferingId: "offering-bcp-101",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2027-01-01T00:00:00.000Z",
      reason: "ทดสอบโอนผู้ตรวจคำขอ",
    })).toThrowError("ไม่สามารถเปลี่ยนหรือยกเลิกการมอบหมายนี้ได้ เนื่องจากมีคำขอปรับข้อมูลรายวิชาที่ยังรอการดำเนินการ");
    expect(result.current.teachingAssignments.find((item) => item.id === "teaching-assignment-001"))
      .toBe(before);
  });

  it("rechecks outstanding course reviews when a Teacher accepts a staged transfer", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.respondTeachingAssignment({
      actor: teacherAssignmentActor,
      assignmentId: "teaching-assignment-005",
      decision: "accept",
    }));
    act(() => result.current.updateTeachingAssignment({
      actor: institutionActor,
      assignmentId: "teaching-assignment-005",
      teacherId: "teacher-003",
      courseOfferingId: "offering-bcp-220",
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2027-01-01T00:00:00.000Z",
      reason: "เสนอเปลี่ยนอาจารย์ผู้รับผิดชอบ",
    }));
    act(() => result.current.requestCourseOfferingChange({
      actor: institutionActor,
      courseOfferingId: "offering-bcp-220",
      reviewerTeacherId: "teacher-001",
      proposedChanges: { credits: 4 },
      reason: "ปรับหน่วยกิตก่อนโอนผู้รับผิดชอบ",
    }));

    expect(() => result.current.respondTeachingAssignment({
      actor: {
        userId: "teacher-003",
        userName: "อ. ภก. ธีรภัทร พรหมรักษ์",
        role: "teacher",
        organisationId: "org-inst-siriraj",
        resourceScopes: ["course:assigned"],
      },
      assignmentId: "teaching-assignment-005",
      decision: "accept",
    })).toThrowError("ไม่สามารถเปลี่ยนหรือยกเลิกการมอบหมายนี้ได้ เนื่องจากมีคำขอปรับข้อมูลรายวิชาที่ยังรอการดำเนินการ");
    expect(result.current.teachingAssignments.find((item) => item.id === "teaching-assignment-005"))
      .toMatchObject({ teacherId: "teacher-001", pendingChanges: { teacherId: "teacher-003" } });
  });

  it("rejects a pending assignment whose dates exceed the Teacher affiliation", async () => {
    window.localStorage.setItem("mock_teacher_affiliations", JSON.stringify([{
      id: "teacher-affiliation-001",
      teacherId: "teacher-001",
      institutionId: "org-inst-siriraj",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2026-09-01T00:00:00.000Z",
      status: "active",
    }]));
    window.localStorage.setItem("mock_teaching_assignments", JSON.stringify([{
      id: "teaching-assignment-outside-affiliation",
      teacherId: "teacher-001",
      courseOfferingId: "offering-bcp-220",
      institutionId: "org-inst-siriraj",
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2027-01-01T00:00:00.000Z",
      assignedBy: "institution-admin-001",
      assignedAt: "2026-08-01T00:00:00.000Z",
      status: "pending_teacher_response",
      updatedAt: "2026-08-01T00:00:00.000Z",
    }]));
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(() => result.current.respondTeachingAssignment({
      actor: teacherAssignmentActor,
      assignmentId: "teaching-assignment-outside-affiliation",
      decision: "accept",
    })).toThrowError("ช่วงเวลามอบหมายอยู่นอกช่วงสังกัดของอาจารย์ในสถาบันนี้");
    expect(result.current.teachingAssignments.find((item) => (
      item.id === "teaching-assignment-outside-affiliation"
    ))?.status).toBe("pending_teacher_response");
  });

  it("blocks Teacher workflow mutations after the Institution affiliation expires", async () => {
    window.localStorage.setItem("mock_teacher_affiliations", JSON.stringify([{
      id: "teacher-affiliation-001",
      teacherId: "teacher-001",
      institutionId: "org-inst-siriraj",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2026-08-17T00:00:00.000Z",
      status: "active",
    }]));
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(() => result.current.reviewRegistration({
      registrationId: "REG-001",
      decision: "approve",
      actor: teacherProposalActor,
      reason: "ทดสอบหลังสิ้นสุดสังกัด",
    })).toThrowError("Teacher cannot review a registration outside their assignment");
    expect(() => result.current.publishSubjectResult({
      resultId: "result-draft-001",
      actor: teacherProposalActor,
    })).toThrowError("Teacher cannot access this subject result");
    expect(() => result.current.reviewCourseOfferingChange({
      requestId: "COCHG-2569-001",
      actor: teacherProposalActor,
      decision: "approved",
      reason: "ทดสอบหลังสิ้นสุดสังกัด",
    })).toThrowError("บัญชีนี้ไม่มีสิทธิ์ตรวจคำขอปรับข้อมูลรายวิชาดังกล่าว");
  });

  it("requires teacher acceptance, stages edits, and soft-cancels assignments", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(canTeacherAccessOffering(
      result.current.teachingAssignments,
      "teacher-001",
      "offering-bcp-220",
      new Date("2026-08-21T00:00:00.000Z"),
    )).toBe(false);
    act(() => result.current.respondTeachingAssignment({
      actor: teacherAssignmentActor,
      assignmentId: "teaching-assignment-005",
      decision: "accept",
    }));
    expect(result.current.teachingAssignments.find((item) => item.id === "teaching-assignment-005")?.status)
      .toBe("accepted");

    act(() => result.current.updateTeachingAssignment({
      actor: institutionActor,
      assignmentId: "teaching-assignment-005",
      teacherId: "teacher-001",
      courseOfferingId: "offering-bcp-220",
      startsAt: "2026-09-01T00:00:00.000Z",
      endsAt: "2027-02-01T00:00:00.000Z",
      reason: "ปรับช่วงเวลาการสอน",
    }));
    expect(result.current.teachingAssignments.find((item) => item.id === "teaching-assignment-005"))
      .toMatchObject({ status: "accepted", pendingChanges: { startsAt: "2026-09-01T00:00:00.000Z" } });
    act(() => result.current.respondTeachingAssignment({
      actor: teacherAssignmentActor,
      assignmentId: "teaching-assignment-005",
      decision: "accept",
    }));
    expect(result.current.teachingAssignments.find((item) => item.id === "teaching-assignment-005"))
      .toMatchObject({ status: "accepted", startsAt: "2026-09-01T00:00:00.000Z" });
    expect(result.current.teachingAssignments.find((item) => item.id === "teaching-assignment-005")?.pendingChanges)
      .toBeUndefined();

    act(() => result.current.cancelTeachingAssignment({
      actor: institutionActor,
      assignmentId: "teaching-assignment-005",
      reason: "ยกเลิกการมอบหมายตามแผนการสอนใหม่",
    }));
    expect(result.current.teachingAssignments.find((item) => item.id === "teaching-assignment-005")?.status)
      .toBe("cancelled");
  });

  it("blocks the wrong Teacher and revoked course scope from assignment responses", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(() => result.current.respondTeachingAssignment({
      actor: { ...teacherAssignmentActor, userId: "teacher-002" },
      assignmentId: "teaching-assignment-005",
      decision: "accept",
    })).toThrowError("บัญชีนี้ไม่มีสิทธิ์ตอบรับการมอบหมายดังกล่าว");
    expect(() => result.current.respondTeachingAssignment({
      actor: { ...teacherAssignmentActor, resourceScopes: [] },
      assignmentId: "teaching-assignment-005",
      decision: "accept",
    })).toThrowError("บัญชีนี้ไม่มีสิทธิ์ตอบรับการมอบหมายดังกล่าว");
  });

  it("applies a course change only after Teacher approval", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.respondTeachingAssignment({
      actor: teacherAssignmentActor,
      assignmentId: "teaching-assignment-005",
      decision: "accept",
    }));
    const originalTitle = result.current.courseOfferings.find((item) => item.id === "offering-bcp-220")?.courseTitle;

    act(() => result.current.requestCourseOfferingChange({
      actor: institutionActor,
      courseOfferingId: "offering-bcp-220",
      reviewerTeacherId: "teacher-001",
      proposedChanges: { courseTitle: "การดูแลความปลอดภัยด้านยาระดับระบบ" },
      reason: "ปรับชื่อให้ชัดเจนขึ้น",
    }));
    const request = result.current.courseOfferingChangeRequests.find((item) => (
      item.courseOfferingId === "offering-bcp-220"
    ))!;
    act(() => result.current.reviewCourseOfferingChange({
      actor: teacherAssignmentActor,
      requestId: request.id,
      decision: "needs_revision",
      reason: "กรุณาระบุขอบเขตเนื้อหาเพิ่มเติม",
    }));
    expect(result.current.courseOfferings.find((item) => item.id === "offering-bcp-220")?.courseTitle)
      .toBe(originalTitle);

    act(() => result.current.resubmitCourseOfferingChange({
      actor: institutionActor,
      requestId: request.id,
      proposedChanges: { courseTitle: "การดูแลความปลอดภัยด้านยาระดับระบบ" },
      reason: "เพิ่มรายละเอียดขอบเขตแล้ว",
    }));
    act(() => result.current.reviewCourseOfferingChange({
      actor: teacherAssignmentActor,
      requestId: request.id,
      decision: "approved",
      reason: "รายละเอียดครบถ้วน",
    }));
    expect(result.current.courseOfferingChangeRequests.find((item) => item.id === request.id)?.status)
      .toBe("approved");
    expect(result.current.courseOfferings.find((item) => item.id === "offering-bcp-220")?.courseTitle)
      .toBe("การดูแลความปลอดภัยด้านยาระดับระบบ");
  });

  it("does not mutate an assignment when Audit persistence fails", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const before = result.current.teachingAssignments;
    window.localStorage.setItem(AUDIT_STORAGE_KEY, "not-json");

    expect(() => result.current.respondTeachingAssignment({
      actor: teacherAssignmentActor,
      assignmentId: "teaching-assignment-005",
      decision: "accept",
    })).toThrow();
    expect(result.current.teachingAssignments).toBe(before);
  });
});

describe("mock DB course proposal workflow", () => {
  it("hydrates all proposal states and complete Teacher result fixtures", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(new Set(result.current.courseProposals.map((proposal) => proposal.status))).toEqual(
      new Set(["submitted", "needs_revision", "passed", "rejected"]),
    );
    expect(new Set(result.current.courseProposals.map((proposal) => proposal.proposerId))).toEqual(
      new Set(["teacher-001", "teacher-002"]),
    );

    const teacherResults = result.current.subjectResults.filter((subjectResult) => (
      subjectResult.teacherId === "teacher-001"
    ));
    expect(teacherResults.map((subjectResult) => subjectResult.status)).toEqual([
      "pending",
      "draft",
      "published",
      "published",
      "revised",
    ]);
    expect(teacherResults.find((subjectResult) => subjectResult.id === "result-published-001")?.currentValue)
      .toBe("S");
    expect(teacherResults.find((subjectResult) => subjectResult.id === "result-published-u-001")?.currentValue)
      .toBe("U");
    teacherResults.forEach((subjectResult) => {
      expect(result.current.registrations).toContainEqual(expect.objectContaining({
        studentId: subjectResult.studentId,
        courseOfferingId: subjectResult.courseOfferingId,
        status: "enrolled",
      }));
    });
  });

  it("submits, returns, and resubmits with immutable history and audit snapshots", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.submitCourseProposal({
      actor: teacherProposalActor,
      courseCode: "BCP-590",
      courseTitle: "การประเมินความปลอดภัยด้านยาเชิงระบบ",
      credits: 3,
      rationale: "พัฒนาทักษะการค้นหาและลดความเสี่ยงด้านยาในระบบบริการ",
    }));
    const submitted = result.current.courseProposals.find((proposal) => (
      proposal.courseCode === "BCP-590"
    ));
    expect(submitted).toMatchObject({
      proposerId: "teacher-001",
      institutionId: "org-inst-siriraj",
      status: "submitted",
    });
    expect(readAuditEvents().at(-1)).toMatchObject({
      action: "course_proposal.submit",
      actor: { userId: "teacher-001", resourceScopes: expect.arrayContaining(["course:proposal"]) },
      resource: { id: submitted?.id, organisationId: "org-inst-siriraj" },
      before: null,
      after: { status: "submitted" },
      reason: "พัฒนาทักษะการค้นหาและลดความเสี่ยงด้านยาในระบบบริการ",
    });
    expect(readAuditEvents().at(-1)?.evidenceReference).toBeUndefined();

    act(() => result.current.reviewCourseProposal({
      proposalId: submitted!.id,
      actor: staffProposalActor,
      decision: "needs_revision",
      reason: "กรุณาเพิ่มเกณฑ์ประเมินผลลัพธ์การเรียนรู้",
    }));
    const returned = result.current.courseProposals.find((proposal) => proposal.id === submitted!.id)!;
    expect(returned).toMatchObject({
      status: "needs_revision",
      latestReview: {
        decision: "needs_revision",
        note: "กรุณาเพิ่มเกณฑ์ประเมินผลลัพธ์การเรียนรู้",
      },
    });
    expect(submitted).toMatchObject({ status: "submitted", history: [{ action: "submitted" }] });
    expect(readAuditEvents().at(-1)).toMatchObject({
      action: "course_proposal.review",
      before: { status: "submitted" },
      after: { status: "needs_revision" },
      reason: "กรุณาเพิ่มเกณฑ์ประเมินผลลัพธ์การเรียนรู้",
    });

    act(() => result.current.resubmitCourseProposal({
      proposalId: returned.id,
      actor: teacherProposalActor,
      courseCode: returned.courseCode,
      courseTitle: `${returned.courseTitle} (ปรับปรุง)`,
      credits: returned.credits,
      rationale: "เพิ่มเกณฑ์ประเมินผลลัพธ์การเรียนรู้ที่ตรวจสอบได้แล้ว",
      reason: "ปรับตามข้อเสนอแนะของผู้ตรวจ",
    }));
    const resubmitted = result.current.courseProposals.find((proposal) => proposal.id === submitted!.id)!;
    expect(resubmitted.status).toBe("submitted");
    expect(resubmitted.history.map((entry) => entry.action)).toEqual([
      "submitted",
      "reviewed",
      "resubmitted",
    ]);
    expect(returned).toMatchObject({ status: "needs_revision" });
    expect(readAuditEvents().at(-1)).toMatchObject({
      action: "course_proposal.resubmit",
      before: { status: "needs_revision" },
      after: { status: "submitted" },
      reason: "ปรับตามข้อเสนอแนะของผู้ตรวจ",
    });
  });

  it("enforces exact Teacher affiliation/resource scope and Royal College Staff scope", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const submission = {
      courseCode: "BCP-591",
      courseTitle: "รายวิชาทดสอบขอบเขตสิทธิ์",
      credits: 2,
      rationale: "ทดสอบการบังคับใช้ขอบเขตทรัพยากรและสถาบัน",
    };

    expect(() => result.current.submitCourseProposal({
      ...submission,
      actor: { ...teacherProposalActor, resourceScopes: ["course:offering-bcp-101"] },
    })).toThrow("Teacher lacks the institution or resource scope for course proposals");
    expect(() => result.current.submitCourseProposal({
      ...submission,
      actor: { ...teacherProposalActor, organisationId: "org-inst-chula" },
    })).toThrow("Teacher has no active affiliation in this institution");
    expect(() => result.current.resubmitCourseProposal({
      ...submission,
      proposalId: "CPROP-2569-002",
      reason: "พยายามแก้ไขรายการของผู้อื่น",
      actor: {
        ...teacherProposalActor,
        userId: "teacher-003",
        userName: "อ. ภก. ธีรภัทร พรหมรักษ์",
      },
    })).toThrow("Teacher cannot resubmit another proposer's course proposal");
    expect(() => result.current.reviewCourseProposal({
      proposalId: "CPROP-2569-001",
      actor: { ...staffProposalActor, organisationId: "org-inst-siriraj" },
      decision: "passed",
      reason: "พยายามตรวจจากองค์กรที่ไม่ถูกต้อง",
    })).toThrow("Only Royal College Staff with central scope can review course proposals");
    expect(() => result.current.reviewCourseProposal({
      proposalId: "CPROP-2569-001",
      actor: { ...staffProposalActor, resourceScopes: [] },
      decision: "passed",
      reason: "พยายามตรวจโดยไม่มีขอบเขตส่วนกลาง",
    })).toThrow("Only Royal College Staff with central scope can review course proposals");
  });

  it("records a passed decision without creating a permanent course offering", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const offeringIds = result.current.courseOfferings.map((offering) => offering.id);

    act(() => result.current.reviewCourseProposal({
      proposalId: "CPROP-2569-001",
      actor: staffProposalActor,
      decision: "passed",
      reason: "ข้อเสนอครบถ้วนสำหรับบันทึกผลในต้นแบบ",
    }));

    expect(result.current.courseProposals.find((proposal) => proposal.id === "CPROP-2569-001")?.status)
      .toBe("passed");
    expect(result.current.courseOfferings.map((offering) => offering.id)).toEqual(offeringIds);
  });

  it("does not mutate proposal state when the required audit write fails", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const before = result.current.courseProposals;
    window.localStorage.setItem(AUDIT_STORAGE_KEY, "not-json");

    expect(() => result.current.submitCourseProposal({
      actor: teacherProposalActor,
      courseCode: "BCP-592",
      courseTitle: "รายวิชาทดสอบลำดับ Audit",
      credits: 2,
      rationale: "ยืนยันว่าระบบบันทึกเหตุการณ์ก่อนเปลี่ยนข้อมูลธุรกิจ",
    })).toThrow();
    expect(result.current.courseProposals).toBe(before);
  });

  it("normalizes stored proposal records and canonical Karina related-record names", async () => {
    const custom = normalizeCourseProposals([{ malformed: true }]);
    expect(custom).toHaveLength(4);

    window.localStorage.setItem("mock_academic_students", JSON.stringify([{
      id: "RPC-2569-001",
      name: "คาริน่า ยู",
      licenseNumber: "ภ.34567",
    }]));
    window.localStorage.setItem("mock_registrations", JSON.stringify([{
      id: "REG-001",
      studentId: "RPC-2569-001",
      studentName: "คาริน่า ยู",
      courseId: "BCP-101",
      courseCode: "BCP-101",
      courseTitle: "เภสัชบำบัดพื้นฐาน",
      term: "1/2569",
      status: "pending_teacher_review",
      submittedAt: "2026-06-24T03:00:00.000Z",
    }]));
    window.localStorage.setItem("mock_payments", JSON.stringify([{
      id: "PAY-2569-001",
      studentId: "RPC-2569-001",
      name: "คาริน่า ยู",
      program: "เภสัชบำบัด",
      amount: 25000,
      date: "24 มิ.ย. 2569",
      status: "pending",
      type: "ค่าลงทะเบียนเรียน",
    }]));

    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.academicStudents.find((student) => student.id === "RPC-2569-001")?.name)
      .toBe("ภญ. คารินา วัฒนกุล");
    expect(result.current.registrations.find((registration) => registration.id === "REG-001")?.studentName)
      .toBe("ภญ. คารินา วัฒนกุล");
    expect(result.current.payments.find((payment) => payment.id === "PAY-2569-001")?.name)
      .toBe("ภญ. คารินา วัฒนกุล");
  });
});
