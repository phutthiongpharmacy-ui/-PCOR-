import { describe, expect, it } from "vitest";

import type { Admission } from "@/providers/mock-db-provider";
import type { ScopedAcademicActor } from "@/roles/shared/features/academic";

import {
  createAdmissionExamRound,
  closeAdmissionExamRound,
  eligibleAdmissionExamCandidates,
  openAdmissionExamRound,
  publishAdmissionExamResults,
  reviseAdmissionExamResult,
  saveAdmissionExamResultDraft,
  type AdmissionExamMode,
} from "./admission-exam-workflow";

const actor: ScopedAcademicActor = {
  userId: "institution-admin-001",
  userName: "ผู้ดูแลสถาบันทดสอบ",
  role: "institution_admin",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["institution:org-inst-siriraj"],
};

function admission(overrides: Partial<Admission> = {}): Admission {
  return {
    id: "APP-STUDY-001",
    name: "ภก. ผู้สมัคร ทดสอบ",
    license: "ภ.12345",
    program: "เภสัชบำบัด",
    date: "24 มิ.ย. 2569",
    institutionId: actor.organisationId,
    applicationType: "study",
    status: "approved",
    documents: [],
    documentStatus: "complete",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
    ...overrides,
  };
}

function draft(candidateAdmissionIds = ["APP-STUDY-001"]) {
  return {
    title: "การสอบคัดเลือก ปีการศึกษา 2569",
    program: "เภสัชบำบัด",
    modes: ["written", "bedside"] as AdmissionExamMode[],
    startsAt: "2026-10-15T02:00:00.000Z",
    endsAt: "2026-10-15T05:00:00.000Z",
    venue: "ห้องสอบศูนย์การแพทย์ศิริราช",
    capacity: 20,
    candidateAdmissionIds,
  };
}

describe("admission exam workflow", () => {
  it("requires the Institution role, exact organisation, and resource scope", () => {
    const candidate = admission();
    const missingScopeActor = { ...actor, resourceScopes: [] };

    expect(() => createAdmissionExamRound({
      id: "ROUND-001",
      actor: missingScopeActor,
      admissions: [candidate],
      draft: draft(),
    })).toThrow("บัญชีนี้ไม่มีสิทธิ์จัดการรอบสอบของสถาบันดังกล่าว");

    const created = createAdmissionExamRound({
      id: "ROUND-001",
      actor,
      admissions: [candidate],
      draft: draft(),
    });
    const anotherInstitutionActor: ScopedAcademicActor = {
      ...actor,
      organisationId: "org-inst-chula",
      resourceScopes: ["institution:org-inst-chula"],
    };

    expect(() => openAdmissionExamRound(created, anotherInstitutionActor)).toThrow(
      "บัญชีนี้ไม่มีสิทธิ์จัดการรอบสอบของสถาบันดังกล่าว",
    );
  });

  it("enforces the round transition order", () => {
    const candidate = admission();
    const created = createAdmissionExamRound({
      id: "ROUND-001",
      actor,
      admissions: [candidate],
      draft: draft(),
    });

    expect(() => closeAdmissionExamRound(created, actor)).toThrow(
      "ไม่สามารถเปลี่ยนรอบสอบจาก draft เป็น closed",
    );
    expect(() => saveAdmissionExamResultDraft({
      round: created,
      admissionId: candidate.id,
      decision: "passed",
      actor,
    })).toThrow("บันทึกผลได้หลังปิดรอบสอบแล้วเท่านั้น");
  });

  it("selects only approved study applicants in the exact institution", () => {
    const eligible = admission();
    const examApplicant = admission({ id: "APP-EXAM", applicationType: "exam" });
    const pending = admission({ id: "APP-PENDING", status: "pending" });
    const otherInstitution = admission({ id: "APP-OTHER", institutionId: "org-inst-chula" });

    expect(eligibleAdmissionExamCandidates(
      [eligible, examApplicant, pending, otherInstitution],
      actor.organisationId,
    )).toEqual([eligible]);
  });

  it("prevents adding a candidate from another programme", () => {
    const otherProgramme = admission({ id: "APP-OTHER-PROGRAMME", program: "เภสัชกรรมชุมชน" });

    expect(() => createAdmissionExamRound({
      id: "ROUND-001",
      actor,
      admissions: [admission(), otherProgramme],
      draft: draft([otherProgramme.id]),
    })).toThrow("พบผู้สมัครที่ยังไม่ได้รับอนุมัติหรืออยู่นอกขอบเขตสถาบัน");
  });

  it("requires a complete draft for every candidate before publishing", () => {
    const candidates = [admission(), admission({ id: "APP-STUDY-002" })];
    const created = createAdmissionExamRound({
      id: "ROUND-001",
      actor,
      admissions: candidates,
      draft: draft(candidates.map((candidate) => candidate.id)),
      at: "2026-09-21T02:00:00.000Z",
    });
    const opened = openAdmissionExamRound(created, actor, undefined, "2026-09-21T03:00:00.000Z");
    const closed = closeAdmissionExamRound(opened, actor, undefined, "2026-10-15T06:00:00.000Z");
    const oneResult = saveAdmissionExamResultDraft({
      round: closed,
      admissionId: candidates[0].id,
      decision: "passed",
      score: 82,
      actor,
      at: "2026-10-15T07:00:00.000Z",
    });

    expect(() => publishAdmissionExamResults({
      round: closed,
      results: [oneResult],
      actor,
      reason: "ตรวจสอบผลแล้ว",
    })).toThrow("กรุณาบันทึกผลให้ครบทุกคนก่อนประกาศ");
  });

  it("rejects a draft result that belongs to another round", () => {
    const candidate = admission();
    const firstRound = createAdmissionExamRound({
      id: "ROUND-001",
      actor,
      admissions: [candidate],
      draft: draft(),
    });
    const secondRound = createAdmissionExamRound({
      id: "ROUND-002",
      actor,
      admissions: [candidate],
      draft: draft(),
    });
    const closedFirstRound = closeAdmissionExamRound(
      openAdmissionExamRound(firstRound, actor),
      actor,
    );
    const closedSecondRound = closeAdmissionExamRound(
      openAdmissionExamRound(secondRound, actor),
      actor,
    );
    const resultFromFirstRound = saveAdmissionExamResultDraft({
      round: closedFirstRound,
      admissionId: candidate.id,
      decision: "passed",
      actor,
    });

    expect(() => publishAdmissionExamResults({
      round: closedSecondRound,
      results: [resultFromFirstRound],
      actor,
      reason: "ตรวจสอบผลแล้ว",
    })).toThrow("พบผลสอบที่ไม่ตรงกับรอบสอบหรือรายชื่อผู้มีสิทธิ์สอบ");
  });

  it("rejects revising a published result through another round", () => {
    const candidate = admission();
    const firstRound = createAdmissionExamRound({
      id: "ROUND-001",
      actor,
      admissions: [candidate],
      draft: draft(),
    });
    const secondRound = createAdmissionExamRound({
      id: "ROUND-002",
      actor,
      admissions: [candidate],
      draft: draft(),
    });
    const closedFirstRound = closeAdmissionExamRound(
      openAdmissionExamRound(firstRound, actor),
      actor,
    );
    const result = saveAdmissionExamResultDraft({
      round: closedFirstRound,
      admissionId: candidate.id,
      decision: "passed",
      actor,
    });
    const published = publishAdmissionExamResults({
      round: closedFirstRound,
      results: [result],
      actor,
      reason: "ตรวจสอบผลแล้ว",
    });
    const publishedSecondRound = {
      ...secondRound,
      status: "published" as const,
    };

    expect(() => reviseAdmissionExamResult({
      round: publishedSecondRound,
      result: published.results[0],
      decision: "failed",
      reason: "แก้ไขผล",
      actor,
    })).toThrow("ผลสอบไม่ตรงกับรอบสอบหรือรายชื่อผู้มีสิทธิ์สอบ");
  });

  it("publishes atomically and keeps a revision trail", () => {
    const candidate = admission();
    const created = createAdmissionExamRound({
      id: "ROUND-001",
      actor,
      admissions: [candidate],
      draft: draft(),
      at: "2026-09-21T02:00:00.000Z",
    });
    const opened = openAdmissionExamRound(created, actor, undefined, "2026-09-21T03:00:00.000Z");
    const closed = closeAdmissionExamRound(opened, actor, undefined, "2026-10-15T06:00:00.000Z");
    const result = saveAdmissionExamResultDraft({
      round: closed,
      admissionId: candidate.id,
      decision: "passed",
      score: 82,
      actor,
      at: "2026-10-15T07:00:00.000Z",
    });
    const published = publishAdmissionExamResults({
      round: closed,
      results: [result],
      actor,
      reason: "ตรวจสอบผลครบถ้วน",
      at: "2026-10-16T02:00:00.000Z",
    });
    const revised = reviseAdmissionExamResult({
      round: published.round,
      result: published.results[0],
      decision: "withheld",
      score: 82,
      reason: "รอตรวจสอบเอกสารเพิ่มเติม",
      actor,
      at: "2026-10-16T03:00:00.000Z",
    });

    expect(published.round.status).toBe("published");
    expect(published.results[0]).toMatchObject({ status: "published", currentDecision: "passed" });
    expect(revised).toMatchObject({ status: "revised", currentDecision: "withheld" });
    expect(revised.revisions).toHaveLength(2);
    expect(revised.revisions[1]).toMatchObject({
      previousDecision: "passed",
      newDecision: "withheld",
      reason: "รอตรวจสอบเอกสารเพิ่มเติม",
    });
  });
});
