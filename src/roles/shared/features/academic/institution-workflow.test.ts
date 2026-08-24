import { describe, expect, it } from "vitest";

import {
  cancelTeachingAssignmentRecord,
  createCourseOfferingChangeRequest,
  createTeachingAssignmentRecord,
  resubmitCourseOfferingChangeRequest,
  respondTeachingAssignmentRecord,
  reviewCourseOfferingChangeRequest,
  stageTeachingAssignmentUpdate,
} from "./institution-workflow";
import type { ScopedAcademicActor } from "./model";

const institutionActor: ScopedAcademicActor = {
  userId: "institution-admin-001",
  userName: "ผู้ดูแลสถาบันทดสอบ",
  role: "institution_admin",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["institution:org-inst-siriraj"],
};

const teacherActor: ScopedAcademicActor = {
  userId: "teacher-001",
  userName: "อาจารย์ทดสอบ",
  role: "teacher",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["course:offering-bcp-101", "course:offering-bcp-220"],
};

function pendingAssignment() {
  return createTeachingAssignmentRecord({
    id: "assignment-test",
    patch: {
      teacherId: teacherActor.userId,
      courseOfferingId: "offering-bcp-101",
      startsAt: "2026-08-20T00:00:00.000Z",
    },
    institutionId: institutionActor.organisationId,
    assignedBy: institutionActor.userId,
    at: "2026-08-18T00:00:00.000Z",
  });
}

describe("Institution academic workflow", () => {
  it("keeps a new assignment ineffective until the assigned teacher accepts", () => {
    const pending = pendingAssignment();
    const accepted = respondTeachingAssignmentRecord({
      assignment: pending,
      actor: teacherActor,
      decision: "accept",
      at: "2026-08-18T01:00:00.000Z",
    });

    expect(pending.status).toBe("pending_teacher_response");
    expect(accepted).toMatchObject({ status: "accepted", latestDecision: { decision: "accepted" } });
    expect(pending.latestDecision).toBeUndefined();
  });

  it("stages accepted-assignment edits and keeps old values when the teacher declines", () => {
    const accepted = respondTeachingAssignmentRecord({
      assignment: pendingAssignment(),
      actor: teacherActor,
      decision: "accept",
    });
    const staged = stageTeachingAssignmentUpdate(accepted, {
      teacherId: teacherActor.userId,
      courseOfferingId: "offering-bcp-220",
      startsAt: "2026-09-01T00:00:00.000Z",
    });
    const declined = respondTeachingAssignmentRecord({
      assignment: staged,
      actor: teacherActor,
      decision: "decline",
      reason: "ช่วงเวลาทับซ้อนกับภาระสอนเดิม",
    });

    expect(staged).toMatchObject({
      status: "accepted",
      courseOfferingId: "offering-bcp-101",
      pendingChanges: { courseOfferingId: "offering-bcp-220" },
    });
    expect(declined).toMatchObject({
      status: "accepted",
      courseOfferingId: "offering-bcp-101",
      latestDecision: { decision: "declined" },
    });
    expect(declined.pendingChanges).toBeUndefined();
  });

  it("applies staged values only after acceptance and soft-cancels the record", () => {
    const accepted = respondTeachingAssignmentRecord({
      assignment: pendingAssignment(),
      actor: teacherActor,
      decision: "accept",
    });
    const staged = stageTeachingAssignmentUpdate(accepted, {
      teacherId: teacherActor.userId,
      courseOfferingId: "offering-bcp-220",
      startsAt: "2026-09-01T00:00:00.000Z",
    });
    const changed = respondTeachingAssignmentRecord({
      assignment: staged,
      actor: teacherActor,
      decision: "accept",
    });
    const cancelled = cancelTeachingAssignmentRecord(changed);

    expect(changed).toMatchObject({
      status: "accepted",
      courseOfferingId: "offering-bcp-220",
      startsAt: "2026-09-01T00:00:00.000Z",
    });
    expect(cancelled.status).toBe("cancelled");
    expect(changed.status).toBe("accepted");
  });

  it("requires reasons for declined assignments and invalid date ranges", () => {
    expect(() => respondTeachingAssignmentRecord({
      assignment: pendingAssignment(),
      actor: teacherActor,
      decision: "decline",
      reason: " ",
    })).toThrowError("กรุณาระบุเหตุผลที่ไม่ตอบรับการมอบหมาย");
    expect(() => stageTeachingAssignmentUpdate(pendingAssignment(), {
      teacherId: teacherActor.userId,
      courseOfferingId: "offering-bcp-101",
      startsAt: "2026-09-02T00:00:00.000Z",
      endsAt: "2026-09-01T00:00:00.000Z",
    })).toThrowError("วันสิ้นสุดการมอบหมายต้องอยู่หลังวันเริ่มต้น");
    expect(() => createTeachingAssignmentRecord({
      id: "assignment-invalid-end",
      patch: {
        teacherId: teacherActor.userId,
        courseOfferingId: "offering-bcp-101",
        startsAt: "2026-09-01T00:00:00.000Z",
        endsAt: "not-a-date",
      },
      institutionId: institutionActor.organisationId,
      assignedBy: institutionActor.userId,
    })).toThrowError("วันสิ้นสุดการมอบหมายไม่ถูกต้อง");
  });

  it("does not approve a course-offering patch during needs-revision and resubmission", () => {
    const submitted = createCourseOfferingChangeRequest({
      id: "change-test",
      courseOfferingId: "offering-bcp-101",
      reviewerTeacherId: teacherActor.userId,
      proposedChanges: { term: "2/2569" },
      reason: "ขอปรับภาคการศึกษา",
      actor: institutionActor,
      at: "2026-08-18T00:00:00.000Z",
    });
    const needsRevision = reviewCourseOfferingChangeRequest({
      request: submitted,
      decision: "needs_revision",
      reason: "กรุณาระบุแผนการเปิดรายวิชาในภาคการศึกษาใหม่",
      actor: teacherActor,
      at: "2026-08-18T01:00:00.000Z",
    });
    const resubmitted = resubmitCourseOfferingChangeRequest({
      request: needsRevision,
      proposedChanges: { term: "3/2569" },
      reason: "เพิ่มรายละเอียดแผนการเปิดรายวิชาแล้ว",
      actor: institutionActor,
      at: "2026-08-18T02:00:00.000Z",
    });
    const approved = reviewCourseOfferingChangeRequest({
      request: resubmitted,
      decision: "approved",
      reason: "ข้อมูลครบถ้วน",
      actor: teacherActor,
      at: "2026-08-18T03:00:00.000Z",
    });

    expect(submitted.status).toBe("pending_teacher_review");
    expect(needsRevision.status).toBe("needs_revision");
    expect(resubmitted).toMatchObject({
      status: "pending_teacher_review",
      proposedChanges: { term: "3/2569" },
    });
    expect(approved.status).toBe("approved");
    expect(approved.history.map((entry) => entry.action)).toEqual([
      "submitted",
      "reviewed",
      "resubmitted",
      "reviewed",
    ]);
    expect(needsRevision.history).toHaveLength(2);
  });
});
