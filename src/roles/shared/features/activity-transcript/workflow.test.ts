import { describe, expect, it } from "vitest";

import type { ScopedAcademicActor } from "@/roles/shared/features/academic";

import type { ActivityEntryDraft, ActivityRequirement } from "./model";
import {
  canReviewStudentActivityEntry,
  createInstitutionActivityEntry,
  createStudentActivityEntry,
  normalizeActivityTranscriptEntries,
  reviewInstitutionStudentActivityEntry,
} from "./workflow";

const requirement: ActivityRequirement = {
  id: "y2-seminar",
  trainingYear: 2,
  category: "seminar",
  label: "การนำเสนอสัมมนา",
  description: "นำเสนอหัวข้อวิชาการ",
  icon: "co_present",
  targetCount: 1,
  unit: "ครั้ง",
};

const draft: ActivityEntryDraft = {
  trainingYear: 2,
  academicYear: "2569",
  requirementId: requirement.id,
  title: "สัมมนาการใช้ยาอย่างสมเหตุผล",
  activityDate: "2026-09-20",
  institution: "คณะเภสัชศาสตร์ มหาวิทยาลัยมหิดล",
  role: "ผู้นำเสนอ",
  description: "นำเสนอและอภิปรายกรณีศึกษา",
  evidenceName: "seminar-proof.pdf",
  evidenceKind: "presentation",
};

const studentActor: ScopedAcademicActor = {
  userId: "student-001",
  userName: "ภก. ผู้เรียน ทดสอบ",
  role: "student",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["student:self"],
};

const institutionActor: ScopedAcademicActor = {
  userId: "institution-admin-001",
  userName: "ภก. ผู้ดูแลสถาบัน ทดสอบ",
  role: "institution_admin",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["institution:org-inst-siriraj"],
};

const staffActor: ScopedAcademicActor = {
  userId: "staff-001",
  userName: "ภญ. เจ้าหน้าที่ราชวิทยาลัย ทดสอบ",
  role: "royal_college_staff",
  organisationId: "org-royal-college",
  resourceScopes: ["staff:central"],
};

describe("Activity Transcript workflow", () => {
  it("forces a student submission to the current actor and self-declared source", () => {
    const entry = createStudentActivityEntry({
      id: "ACT-STUDENT-1",
      actor: studentActor,
      requirement,
      draft,
      recordedAt: "2026-09-21T02:00:00.000Z",
    });

    expect(entry).toMatchObject({
      memberId: studentActor.userId,
      organisationId: studentActor.organisationId,
      source: "student",
      verification: { status: "self_declared" },
      recordedBy: studentActor.userId,
    });
    expect(entry.evidence).toEqual([
      expect.objectContaining({ name: "seminar-proof.pdf", kind: "presentation" }),
    ]);
  });

  it("requires evidence and student:self scope for a student submission", () => {
    expect(() => createStudentActivityEntry({
      id: "ACT-NO-EVIDENCE",
      actor: studentActor,
      requirement,
      draft: { ...draft, evidenceName: "" },
    })).toThrowError("กรุณาระบุหลักฐานประกอบ");

    expect(() => createStudentActivityEntry({
      id: "ACT-NO-SCOPE",
      actor: { ...studentActor, resourceScopes: [] },
      requirement,
      draft,
    })).toThrowError(/student:self/);
  });

  it("lets an Institution record a verified member activity without impersonating a student source", () => {
    const entry = createInstitutionActivityEntry({
      id: "ACT-INSTITUTION-1",
      actor: institutionActor,
      memberId: "student-001",
      memberName: "ภก. ผู้เรียน ทดสอบ",
      requirement,
      source: "college_checkin",
      draft,
      recordedAt: "2026-09-21T02:00:00.000Z",
    });

    expect(entry).toMatchObject({
      memberId: "student-001",
      source: "college_checkin",
      verification: {
        status: "verified",
        verifiedBy: institutionActor.userName,
        verifiedAt: "2026-09-21",
      },
      recordedBy: institutionActor.userId,
      organisationId: institutionActor.organisationId,
    });

    expect(() => createInstitutionActivityEntry({
      id: "ACT-IMPERSONATE",
      actor: institutionActor,
      memberId: "student-001",
      memberName: "ภก. ผู้เรียน ทดสอบ",
      requirement,
      source: "student" as never,
      draft,
    })).toThrowError(/แหล่งข้อมูลสำหรับสถาบันไม่ถูกต้อง/);

    expect(() => createInstitutionActivityEntry({
      id: "ACT-UNKNOWN-SOURCE",
      actor: institutionActor,
      memberId: "student-001",
      memberName: "ภก. ผู้เรียน ทดสอบ",
      requirement,
      source: "external" as never,
      draft,
    })).toThrowError(/แหล่งข้อมูลสำหรับสถาบันไม่ถูกต้อง/);
  });

  it("rejects the former central Staff role and an Institution actor without its scope", () => {
    expect(() => createInstitutionActivityEntry({
      id: "ACT-FORMER-STAFF",
      actor: staffActor,
      memberId: "student-001",
      memberName: "ภก. ผู้เรียน ทดสอบ",
      requirement,
      source: "officer",
      draft,
    })).toThrowError(/ไม่มีสิทธิ์/);

    expect(() => createInstitutionActivityEntry({
      id: "ACT-WRONG-ORG",
      actor: { ...institutionActor, resourceScopes: ["institution:org-inst-chula"] },
      memberId: "student-001",
      memberName: "ภก. ผู้เรียน ทดสอบ",
      requirement,
      source: "officer",
      draft,
    })).toThrowError(/ไม่มีสิทธิ์/);
  });

  it("merges stored entries with defaults", () => {
    const created = createStudentActivityEntry({
      id: "ACT-CUSTOM",
      actor: studentActor,
      requirement,
      draft,
    });
    const normalized = normalizeActivityTranscriptEntries([created], [{ ...created, id: "ACT-DEFAULT" }]);
    expect(normalized.map((entry) => entry.id)).toEqual(["ACT-CUSTOM", "ACT-DEFAULT"]);
  });

  it("backfills the tenant owner of a known legacy default without changing its data", () => {
    const created = createStudentActivityEntry({
      id: "ACT-LEGACY-DEFAULT",
      actor: studentActor,
      requirement,
      draft,
    });
    const legacy = { ...created, organisationId: undefined };

    const [normalized] = normalizeActivityTranscriptEntries(
      [legacy],
      [created],
      () => undefined,
    );

    expect(normalized).toMatchObject({
      id: created.id,
      organisationId: studentActor.organisationId,
      title: created.title,
    });
  });

  it("lets the owning Institution approve a student self-entry with an optional note", () => {
    const submitted = createStudentActivityEntry({
      id: "ACT-REVIEW-APPROVE",
      actor: studentActor,
      requirement,
      draft,
      recordedAt: "2026-09-21T02:00:00.000Z",
    });

    expect(canReviewStudentActivityEntry(submitted)).toBe(true);
    const reviewed = reviewInstitutionStudentActivityEntry({
      actor: institutionActor,
      entry: submitted,
      decision: "approve",
      reviewedAt: "2026-09-22T03:30:00.000Z",
    });

    expect(reviewed.verification).toEqual({
      status: "verified",
      verifiedBy: institutionActor.userName,
      verifiedAt: "2026-09-22",
      note: "สถาบันตรวจสอบหลักฐานและรับรองรายการแล้ว",
    });
    expect(canReviewStudentActivityEntry(reviewed)).toBe(false);
  });

  it("requires a rejection reason and rejects unauthorized or repeat reviews", () => {
    const submitted = createStudentActivityEntry({
      id: "ACT-REVIEW-REJECT",
      actor: studentActor,
      requirement,
      draft,
    });

    expect(() => reviewInstitutionStudentActivityEntry({
      actor: institutionActor,
      entry: submitted,
      decision: "reject",
      note: "   ",
    })).toThrowError("กรุณาระบุเหตุผลที่ไม่อนุมัติรายการ");

    expect(() => reviewInstitutionStudentActivityEntry({
      actor: { ...institutionActor, resourceScopes: [] },
      entry: submitted,
      decision: "approve",
    })).toThrowError(/ไม่มีสิทธิ์/);

    const rejected = reviewInstitutionStudentActivityEntry({
      actor: institutionActor,
      entry: submitted,
      decision: "reject",
      note: "หลักฐานไม่แสดงชื่อผู้เข้าร่วม",
      reviewedAt: "2026-09-22T03:30:00.000Z",
    });
    expect(rejected.verification).toMatchObject({
      status: "rejected",
      note: "หลักฐานไม่แสดงชื่อผู้เข้าร่วม",
      verifiedBy: institutionActor.userName,
    });
    expect(() => reviewInstitutionStudentActivityEntry({
      actor: institutionActor,
      entry: rejected,
      decision: "approve",
    })).toThrowError("รายการนี้ไม่ได้อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบ");
  });

  it("does not route an already verified Institution-created entry through student review", () => {
    const institutionEntry = createInstitutionActivityEntry({
      id: "ACT-INSTITUTION-REVIEW-GUARD",
      actor: institutionActor,
      memberId: "student-001",
      memberName: "ภก. ผู้เรียน ทดสอบ",
      requirement,
      source: "officer",
      draft,
    });

    expect(canReviewStudentActivityEntry(institutionEntry)).toBe(false);
    expect(() => reviewInstitutionStudentActivityEntry({
      actor: institutionActor,
      entry: institutionEntry,
      decision: "reject",
      note: "ไม่ควรแก้รายการที่เจ้าหน้าที่รับรองแล้ว",
    })).toThrowError("รายการนี้ไม่ได้อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบ");
  });

  it("rejects review of a record owned by another Institution or missing a tenant owner", () => {
    const submitted = createStudentActivityEntry({
      id: "ACT-CROSS-INSTITUTION",
      actor: studentActor,
      requirement,
      draft,
    });

    expect(() => reviewInstitutionStudentActivityEntry({
      actor: {
        ...institutionActor,
        organisationId: "org-inst-chula",
        resourceScopes: ["institution:org-inst-chula"],
      },
      entry: submitted,
      decision: "approve",
    })).toThrowError(/นอกขอบเขตสถาบัน/);

    expect(() => reviewInstitutionStudentActivityEntry({
      actor: institutionActor,
      entry: { ...submitted, organisationId: undefined },
      decision: "approve",
    })).toThrowError(/นอกขอบเขตสถาบัน/);
  });
});
