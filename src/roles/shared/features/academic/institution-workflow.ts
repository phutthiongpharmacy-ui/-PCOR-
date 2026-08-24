import type {
  AcademicActor,
  CourseOfferingChangeDecision,
  CourseOfferingChangeRequest,
  CourseOfferingEditablePatch,
  ScopedAcademicActor,
  TeachingAssignment,
  TeachingAssignmentPatch,
} from "./model";

function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`กรุณาระบุ${label}`);
  return normalized;
}

function validDate(value: string, label: string) {
  if (!Number.isFinite(new Date(value).getTime())) {
    throw new Error(`${label}ไม่ถูกต้อง`);
  }
  return value;
}

function validateAssignmentPatch(patch: TeachingAssignmentPatch) {
  const startsAt = validDate(patch.startsAt, "วันเริ่มมอบหมาย");
  const endsAt = patch.endsAt ? validDate(patch.endsAt, "วันสิ้นสุดการมอบหมาย") : undefined;
  if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error("วันสิ้นสุดการมอบหมายต้องอยู่หลังวันเริ่มต้น");
  }
  return {
    teacherId: requiredText(patch.teacherId, "อาจารย์"),
    courseOfferingId: requiredText(patch.courseOfferingId, "รายวิชา"),
    startsAt,
    ...(endsAt ? { endsAt } : {}),
  };
}

function snapshotActor(actor: ScopedAcademicActor): ScopedAcademicActor {
  return { ...actor, resourceScopes: [...actor.resourceScopes] };
}

function assignmentDecisionActor(actor: ScopedAcademicActor): AcademicActor {
  return {
    userId: actor.userId,
    userName: actor.userName,
    role: actor.role,
    organisationId: actor.organisationId,
  };
}

export function createTeachingAssignmentRecord(input: {
  id: string;
  patch: TeachingAssignmentPatch;
  institutionId: string;
  assignedBy: string;
  at?: string;
}): TeachingAssignment {
  const at = input.at ?? new Date().toISOString();
  const patch = validateAssignmentPatch(input.patch);
  return {
    id: requiredText(input.id, "รหัสการมอบหมาย"),
    ...patch,
    institutionId: requiredText(input.institutionId, "สถาบัน"),
    assignedBy: requiredText(input.assignedBy, "ผู้มอบหมาย"),
    assignedAt: at,
    status: "pending_teacher_response",
    updatedAt: at,
  } satisfies TeachingAssignment;
}

export function stageTeachingAssignmentUpdate(
  assignment: TeachingAssignment,
  patch: TeachingAssignmentPatch,
  at = new Date().toISOString(),
): TeachingAssignment {
  if (assignment.status === "cancelled") {
    throw new Error("ไม่สามารถแก้ไขการมอบหมายที่ยกเลิกแล้ว");
  }
  const validated = validateAssignmentPatch(patch);
  if (assignment.status === "accepted") {
    return {
      ...assignment,
      pendingChanges: validated,
      updatedAt: at,
    };
  }
  return {
    ...assignment,
    ...validated,
    status: "pending_teacher_response",
    pendingChanges: undefined,
    latestDecision: undefined,
    updatedAt: at,
  };
}

export function cancelTeachingAssignmentRecord(
  assignment: TeachingAssignment,
  at = new Date().toISOString(),
): TeachingAssignment {
  if (assignment.status === "cancelled") {
    throw new Error("การมอบหมายนี้ถูกยกเลิกแล้ว");
  }
  return {
    ...assignment,
    status: "cancelled",
    pendingChanges: undefined,
    updatedAt: at,
  };
}

export function respondTeachingAssignmentRecord(input: {
  assignment: TeachingAssignment;
  actor: ScopedAcademicActor;
  decision: "accept" | "decline";
  reason?: string;
  at?: string;
}): TeachingAssignment {
  const { assignment } = input;
  if (
    assignment.status !== "pending_teacher_response" &&
    !(assignment.status === "accepted" && assignment.pendingChanges)
  ) {
    throw new Error("การมอบหมายนี้ไม่ได้อยู่ในสถานะรออาจารย์ตอบรับ");
  }
  const expectedTeacherId = assignment.pendingChanges?.teacherId ?? assignment.teacherId;
  if (input.actor.userId !== expectedTeacherId) {
    throw new Error("เฉพาะอาจารย์ที่ได้รับมอบหมายเท่านั้นที่ตอบรายการนี้ได้");
  }
  const reason = input.reason?.trim();
  if (input.decision === "decline" && !reason) {
    throw new Error("กรุณาระบุเหตุผลที่ไม่ตอบรับการมอบหมาย");
  }
  const at = input.at ?? new Date().toISOString();
  const latestDecision = {
    decision: input.decision === "accept" ? "accepted" : "declined",
    actor: assignmentDecisionActor(input.actor),
    ...(reason ? { reason } : {}),
    decidedAt: at,
  } as const;

  if (assignment.status === "accepted" && assignment.pendingChanges) {
    if (input.decision === "decline") {
      return {
        ...assignment,
        pendingChanges: undefined,
        latestDecision,
        updatedAt: at,
      };
    }
    return {
      ...assignment,
      ...assignment.pendingChanges,
      pendingChanges: undefined,
      latestDecision,
      updatedAt: at,
    };
  }

  return {
    ...assignment,
    status: input.decision === "accept" ? "accepted" : "declined",
    latestDecision,
    updatedAt: at,
  };
}

function validateCourseOfferingPatch(patch: CourseOfferingEditablePatch) {
  const normalized: CourseOfferingEditablePatch = {};
  if (patch.courseTitle !== undefined) {
    normalized.courseTitle = requiredText(patch.courseTitle, "ชื่อรายวิชา");
  }
  if (patch.credits !== undefined) {
    if (!Number.isFinite(patch.credits) || patch.credits <= 0) {
      throw new Error("จำนวนหน่วยกิตต้องมากกว่า 0");
    }
    normalized.credits = patch.credits;
  }
  if (patch.term !== undefined) normalized.term = requiredText(patch.term, "ภาคการศึกษา");
  if (Object.keys(normalized).length === 0) {
    throw new Error("กรุณาระบุข้อมูลรายวิชาที่ต้องการปรับแก้");
  }
  return normalized;
}

function changeHistoryId(requestId: string, action: string, at: string, sequence: number) {
  return `${requestId}-${action}-${new Date(at).getTime().toString(36)}-${sequence + 1}`;
}

export function createCourseOfferingChangeRequest(input: {
  id: string;
  courseOfferingId: string;
  reviewerTeacherId: string;
  proposedChanges: CourseOfferingEditablePatch;
  reason: string;
  actor: ScopedAcademicActor;
  at?: string;
}): CourseOfferingChangeRequest {
  const at = input.at ?? new Date().toISOString();
  const reason = requiredText(input.reason, "เหตุผลที่ขอปรับแก้");
  const actor = snapshotActor(input.actor);
  return {
    id: requiredText(input.id, "รหัสคำขอ"),
    courseOfferingId: requiredText(input.courseOfferingId, "รายวิชา"),
    institutionId: actor.organisationId,
    reviewerTeacherId: requiredText(input.reviewerTeacherId, "อาจารย์ผู้ตรวจสอบ"),
    proposedChanges: validateCourseOfferingPatch(input.proposedChanges),
    reason,
    status: "pending_teacher_review",
    requestedBy: actor,
    requestedAt: at,
    updatedAt: at,
    history: [{
      id: changeHistoryId(input.id, "submitted", at, 0),
      action: "submitted",
      toStatus: "pending_teacher_review",
      actor,
      occurredAt: at,
      reason,
    }],
  };
}

export function resubmitCourseOfferingChangeRequest(input: {
  request: CourseOfferingChangeRequest;
  proposedChanges: CourseOfferingEditablePatch;
  reason: string;
  actor: ScopedAcademicActor;
  at?: string;
}): CourseOfferingChangeRequest {
  if (input.request.status !== "needs_revision") {
    throw new Error("ส่งคำขอปรับแก้ซ้ำได้เฉพาะรายการที่อาจารย์ขอข้อมูลเพิ่มเติม");
  }
  const at = input.at ?? new Date().toISOString();
  const reason = requiredText(input.reason, "เหตุผลที่ส่งคำขออีกครั้ง");
  const actor = snapshotActor(input.actor);
  return {
    ...input.request,
    proposedChanges: validateCourseOfferingPatch(input.proposedChanges),
    reason,
    status: "pending_teacher_review",
    requestedBy: actor,
    updatedAt: at,
    history: [...input.request.history, {
      id: changeHistoryId(input.request.id, "resubmitted", at, input.request.history.length),
      action: "resubmitted",
      fromStatus: input.request.status,
      toStatus: "pending_teacher_review",
      actor,
      occurredAt: at,
      reason,
    }],
  };
}

export function reviewCourseOfferingChangeRequest(input: {
  request: CourseOfferingChangeRequest;
  decision: CourseOfferingChangeDecision;
  reason: string;
  actor: ScopedAcademicActor;
  at?: string;
}): CourseOfferingChangeRequest {
  if (input.request.status !== "pending_teacher_review") {
    throw new Error("ตรวจคำขอได้เฉพาะรายการที่รออาจารย์ตรวจสอบ");
  }
  if (input.actor.userId !== input.request.reviewerTeacherId) {
    throw new Error("เฉพาะอาจารย์ที่ระบุในคำขอเท่านั้นที่ตรวจรายการนี้ได้");
  }
  const at = input.at ?? new Date().toISOString();
  const reason = requiredText(input.reason, "เหตุผลประกอบผลการตรวจสอบ");
  const actor = snapshotActor(input.actor);
  return {
    ...input.request,
    status: input.decision,
    updatedAt: at,
    latestReview: {
      decision: input.decision,
      reason,
      actor,
      reviewedAt: at,
    },
    history: [...input.request.history, {
      id: changeHistoryId(input.request.id, "reviewed", at, input.request.history.length),
      action: "reviewed",
      fromStatus: input.request.status,
      toStatus: input.decision,
      actor,
      occurredAt: at,
      reason,
    }],
  };
}
