import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { readAuditEvents } from "@/roles/shared/features/audit";
import type { ActivityEntryDraft } from "@/roles/shared/features/activity-transcript";

import { MockDbProvider, useMockDb } from "./mock-db-provider";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(MockDbProvider, null, children);
}

const draft: ActivityEntryDraft = {
  trainingYear: 2,
  academicYear: "2569",
  requirementId: "y2-seminar",
  title: "สัมมนาการใช้ยาอย่างสมเหตุผล",
  activityDate: "2026-09-20",
  institution: "คณะเภสัชศาสตร์ มหาวิทยาลัยมหิดล",
  role: "ผู้นำเสนอ",
  description: "นำเสนอและอภิปรายกรณีศึกษา",
  evidenceName: "seminar-proof.pdf",
  evidenceKind: "presentation",
};

const studentActor = {
  userId: "วภท-2568-001",
  userName: "ภก. สมชาย ใจดี",
  role: "student" as const,
  organisationId: "org-inst-siriraj",
  resourceScopes: ["student:self"],
};

const institutionActor = {
  userId: "institution-admin-001",
  userName: "ภก. วิชาญ อัครเวช",
  role: "institution_admin" as const,
  organisationId: "org-inst-siriraj",
  resourceScopes: ["institution:org-inst-siriraj"],
};

const staffActor = {
  userId: "staff-001",
  userName: "ภญ. ปาริชาติ สุขเกษม",
  role: "royal_college_staff" as const,
  organisationId: "org-royal-college",
  resourceScopes: ["staff:central"],
};

beforeEach(() => window.localStorage.clear());

describe("MockDbProvider Activity Transcript", () => {
  it("persists and audits a student self-entry under the signed actor ID", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const before = result.current.activityTranscriptEntries.length;

    act(() => result.current.submitStudentActivity({
      actor: studentActor,
      draft,
    }));

    expect(result.current.activityTranscriptEntries).toHaveLength(before + 1);
    expect(result.current.activityTranscriptEntries[0]).toMatchObject({
      memberId: "วภท-2568-001",
      source: "student",
      verification: { status: "self_declared" },
    });
    expect(readAuditEvents().at(-1)).toMatchObject({
      action: "activity_transcript.student_submit",
      actor: { userId: "วภท-2568-001", role: "student" },
      resource: { type: "activity_transcript_entry" },
      evidenceReference: "seminar-proof.pdf",
    });
    await waitFor(() => expect(
      JSON.parse(window.localStorage.getItem("mock_activity_transcript_entries") ?? "[]"),
    ).toHaveLength(before + 1));
  });

  it("records a verified Institution check-in for an affiliated member", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.recordInstitutionActivity({
      actor: institutionActor,
      memberId: "RPC-2569-001",
      source: "college_checkin",
      draft,
    }));

    expect(result.current.activityTranscriptEntries[0]).toMatchObject({
      memberId: "RPC-2569-001",
      organisationId: "org-inst-siriraj",
      source: "college_checkin",
      verification: {
        status: "verified",
        verifiedBy: "ภก. วิชาญ อัครเวช",
      },
    });
    expect(readAuditEvents().at(-1)).toMatchObject({
      action: "activity_transcript.institution_record",
      actor: { userId: "institution-admin-001", role: "institution_admin" },
      resource: { organisationId: "org-inst-siriraj" },
    });
  });

  it("reviews a student self-entry, persists the decision, and appends an audit event", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.submitStudentActivity({ actor: studentActor, draft }));
    const activityId = result.current.activityTranscriptEntries[0].id;

    act(() => result.current.reviewInstitutionActivity({
      actor: institutionActor,
      activityId,
      decision: "approve",
      note: "หลักฐานมีชื่อและวันที่ตรงกับรายการ",
    }));

    expect(result.current.activityTranscriptEntries[0]).toMatchObject({
      id: activityId,
      verification: {
        status: "verified",
        verifiedBy: institutionActor.userName,
        note: "หลักฐานมีชื่อและวันที่ตรงกับรายการ",
      },
    });
    expect(readAuditEvents().at(-1)).toMatchObject({
      action: "activity_transcript.review_approved",
      actor: { userId: institutionActor.userId, role: "institution_admin" },
      resource: {
        id: activityId,
        type: "activity_transcript_entry",
        organisationId: "org-inst-siriraj",
      },
      reason: "หลักฐานมีชื่อและวันที่ตรงกับรายการ",
      evidenceReference: "seminar-proof.pdf",
    });
    await waitFor(() => expect(
      JSON.parse(window.localStorage.getItem("mock_activity_transcript_entries") ?? "[]")[0],
    ).toMatchObject({ id: activityId, verification: { status: "verified" } }));
  });

  it("rejects a student self-entry with a required reason and records the rejection audit", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.submitStudentActivity({ actor: studentActor, draft }));
    const activityId = result.current.activityTranscriptEntries[0].id;

    expect(() => act(() => result.current.reviewInstitutionActivity({
      actor: institutionActor,
      activityId,
      decision: "reject",
      note: " ",
    }))).toThrowError("กรุณาระบุเหตุผลที่ไม่อนุมัติรายการ");

    act(() => result.current.reviewInstitutionActivity({
      actor: institutionActor,
      activityId,
      decision: "reject",
      note: "เอกสารหลักฐานอ่านชื่อผู้เข้าร่วมไม่ชัดเจน",
    }));

    expect(result.current.activityTranscriptEntries[0].verification).toMatchObject({
      status: "rejected",
      verifiedBy: institutionActor.userName,
      note: "เอกสารหลักฐานอ่านชื่อผู้เข้าร่วมไม่ชัดเจน",
    });
    expect(readAuditEvents().at(-1)).toMatchObject({
      action: "activity_transcript.review_rejected",
      resource: { id: activityId },
      reason: "เอกสารหลักฐานอ่านชื่อผู้เข้าร่วมไม่ชัดเจน",
      evidenceReference: "seminar-proof.pdf",
    });
  });

  it("rejects cross-institution recording and the former Officer actor without mutating state", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const beforeEntries = result.current.activityTranscriptEntries;
    const beforeAuditCount = readAuditEvents().length;

    expect(() => act(() => result.current.recordInstitutionActivity({
      actor: institutionActor,
      memberId: "RPC-2569-003",
      source: "college_checkin",
      draft,
    }))).toThrowError(/นอกขอบเขตสถาบัน/);

    expect(() => act(() => result.current.recordInstitutionActivity({
      actor: staffActor,
      memberId: "RPC-2569-001",
      source: "officer",
      draft,
    }))).toThrowError(/ไม่มีสิทธิ์/);

    expect(result.current.activityTranscriptEntries).toEqual(beforeEntries);
    expect(readAuditEvents()).toHaveLength(beforeAuditCount);
  });

  it("rejects a cross-institution review even when the activity ID is known", async () => {
    const { result } = renderHook(() => useMockDb(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.submitStudentActivity({ actor: studentActor, draft }));
    const activityId = result.current.activityTranscriptEntries[0].id;
    const beforeAuditCount = readAuditEvents().length;

    expect(() => act(() => result.current.reviewInstitutionActivity({
      actor: {
        ...institutionActor,
        organisationId: "org-inst-chula",
        resourceScopes: ["institution:org-inst-chula"],
      },
      activityId,
      decision: "approve",
    }))).toThrowError(/นอกขอบเขตสถาบัน/);

    expect(result.current.activityTranscriptEntries[0].verification.status).toBe("self_declared");
    expect(readAuditEvents()).toHaveLength(beforeAuditCount);
  });
});
