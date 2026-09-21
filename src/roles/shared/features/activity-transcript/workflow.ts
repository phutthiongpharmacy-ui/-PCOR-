import type { ScopedAcademicActor } from "@/roles/shared/features/academic";
import {
  ORGANISATION_LIST,
  hasResourceScope,
} from "@/roles/shared/features/roles/access-model";

import type {
  ActivityEntryDraft,
  ActivityRequirement,
  ActivityReviewDecision,
  ActivityInstitutionSource,
  ActivityTranscriptEntry,
} from "./model";

export interface StudentActivityEntryInput {
  id: string;
  actor: ScopedAcademicActor;
  requirement: ActivityRequirement;
  draft: ActivityEntryDraft;
  recordedAt?: string;
}

export interface InstitutionActivityEntryInput {
  id: string;
  actor: ScopedAcademicActor;
  memberId: string;
  memberName: string;
  requirement: ActivityRequirement;
  source: ActivityInstitutionSource;
  draft: ActivityEntryDraft;
  recordedAt?: string;
}

export interface InstitutionActivityReviewInput {
  actor: ScopedAcademicActor;
  entry: ActivityTranscriptEntry;
  decision: ActivityReviewDecision;
  note?: string;
  reviewedAt?: string;
}

function assertInstitutionActivityActor(actor: ScopedAcademicActor) {
  const organisation = ORGANISATION_LIST.find((item) => item.id === actor.organisationId);
  if (
    actor.role !== "institution_admin" ||
    organisation?.kind !== "institution" ||
    !hasResourceScope(actor.resourceScopes, `institution:${actor.organisationId}`)
  ) {
    throw new Error("ไม่มีสิทธิ์ดำเนินการ Activity Transcript ในนามสถาบัน");
  }
}

function required(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`กรุณาระบุ${label}`);
  return normalized;
}

function validateDraft(
  requirement: ActivityRequirement,
  draft: ActivityEntryDraft,
) {
  if (
    requirement.id !== draft.requirementId ||
    requirement.trainingYear !== draft.trainingYear
  ) {
    throw new Error("กิจกรรมไม่ตรงกับเงื่อนไขของปีการฝึกอบรม");
  }
  if (!/^25\d{2}$/.test(draft.academicYear.trim())) {
    throw new Error("ปีการศึกษาต้องเป็น พ.ศ. 4 หลัก");
  }
  if (!Number.isFinite(new Date(`${draft.activityDate}T00:00:00`).getTime())) {
    throw new Error("กรุณาระบุวันที่ทำกิจกรรมให้ถูกต้อง");
  }

  return {
    academicYear: draft.academicYear.trim(),
    title: required(draft.title, "ชื่อกิจกรรม"),
    institution: required(draft.institution, "หน่วยงานหรือสถานที่"),
    role: required(draft.role, "บทบาทของผู้เรียน"),
    description: required(draft.description, "รายละเอียดกิจกรรม"),
    evidenceName: required(draft.evidenceName, "หลักฐานประกอบ"),
  };
}

function baseEntry(
  id: string,
  memberId: string,
  actor: ScopedAcademicActor,
  requirement: ActivityRequirement,
  draft: ActivityEntryDraft,
  recordedAt: string,
) {
  const valid = validateDraft(requirement, draft);
  return {
    id,
    memberId,
    organisationId: actor.organisationId,
    trainingYear: draft.trainingYear,
    academicYear: valid.academicYear,
    requirementId: requirement.id,
    category: requirement.category,
    title: valid.title,
    activityDate: draft.activityDate,
    institution: valid.institution,
    role: valid.role,
    description: valid.description,
    evidence: [{
      id: `${id}-evidence-1`,
      name: valid.evidenceName,
      kind: draft.evidenceKind,
    }],
    recordedAt,
    recordedBy: actor.userId,
  } satisfies Omit<ActivityTranscriptEntry, "source" | "verification">;
}

export function createStudentActivityEntry(
  input: StudentActivityEntryInput,
): ActivityTranscriptEntry {
  if (
    input.actor.role !== "student" ||
    !hasResourceScope(input.actor.resourceScopes, "student:self")
  ) {
    throw new Error("เฉพาะผู้เรียนที่มีสิทธิ์ student:self เท่านั้นที่เพิ่มกิจกรรมของตนเองได้");
  }
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  return {
    ...baseEntry(
      input.id,
      input.actor.userId,
      input.actor,
      input.requirement,
      input.draft,
      recordedAt,
    ),
    source: "student",
    verification: {
      status: "self_declared",
      note: "ผู้เรียนบันทึกพร้อมหลักฐาน รอเจ้าหน้าที่หรือผู้รับผิดชอบตรวจสอบ",
    },
  };
}

export function createInstitutionActivityEntry(
  input: InstitutionActivityEntryInput,
): ActivityTranscriptEntry {
  assertInstitutionActivityActor(input.actor);
  if (!(["officer", "college_checkin"] as readonly string[]).includes(input.source)) {
    throw new Error("แหล่งข้อมูลสำหรับสถาบันไม่ถูกต้อง");
  }
  const memberId = required(input.memberId, "ผู้เรียน");
  const memberName = required(input.memberName, "ชื่อผู้เรียน");
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  return {
    ...baseEntry(
      input.id,
      memberId,
      input.actor,
      input.requirement,
      input.draft,
      recordedAt,
    ),
    source: input.source,
    verification: {
      status: "verified",
      verifiedBy: input.actor.userName,
      verifiedAt: recordedAt.slice(0, 10),
      note: input.source === "college_checkin"
        ? `บันทึกจากข้อมูล Check-in ของ ${memberName}`
        : `เจ้าหน้าที่สถาบันบันทึกให้ ${memberName}`,
    },
  };
}

export function canReviewStudentActivityEntry(
  entry: ActivityTranscriptEntry,
) {
  return entry.source === "student" &&
    (entry.verification.status === "pending" ||
      entry.verification.status === "self_declared");
}

export function reviewInstitutionStudentActivityEntry(
  input: InstitutionActivityReviewInput,
): ActivityTranscriptEntry {
  assertInstitutionActivityActor(input.actor);
  if (!input.entry.organisationId || input.entry.organisationId !== input.actor.organisationId) {
    throw new Error("รายการ Activity Transcript อยู่นอกขอบเขตสถาบันของคุณ");
  }
  if (!canReviewStudentActivityEntry(input.entry)) {
    throw new Error("รายการนี้ไม่ได้อยู่ระหว่างรอเจ้าหน้าที่ตรวจสอบ");
  }
  if (input.decision !== "approve" && input.decision !== "reject") {
    throw new Error("ผลการตรวจสอบ Activity Transcript ไม่ถูกต้อง");
  }

  const note = input.note?.trim() ?? "";
  if (input.decision === "reject" && !note) {
    throw new Error("กรุณาระบุเหตุผลที่ไม่อนุมัติรายการ");
  }

  const reviewedAt = input.reviewedAt ?? new Date().toISOString();
  if (!Number.isFinite(new Date(reviewedAt).getTime())) {
    throw new Error("เวลาตรวจสอบ Activity Transcript ไม่ถูกต้อง");
  }

  return {
    ...input.entry,
    verification: {
      ...input.entry.verification,
      status: input.decision === "approve" ? "verified" : "rejected",
      verifiedBy: input.actor.userName,
      verifiedAt: reviewedAt.slice(0, 10),
      note: note || "สถาบันตรวจสอบหลักฐานและรับรองรายการแล้ว",
    },
  };
}

export function normalizeActivityTranscriptEntries(
  value: unknown,
  defaults: readonly ActivityTranscriptEntry[],
  resolveOrganisationId?: (memberId: string, activityDate: string) => string | undefined,
) {
  const stored = Array.isArray(value)
    ? value.filter(isActivityTranscriptEntry)
    : [];
  const defaultOrganisationById = new Map(
    defaults
      .filter((entry) => Boolean(entry.organisationId))
      .map((entry) => [entry.id, entry.organisationId]),
  );
  const normalizedStored = stored.map((entry) => {
    if (entry.organisationId) return entry;
    const organisationId = defaultOrganisationById.get(entry.id) ??
      resolveOrganisationId?.(entry.memberId, entry.activityDate);
    return organisationId ? { ...entry, organisationId } : entry;
  });
  const normalizedDefaults = defaults.map((entry) => (
    entry.organisationId || !resolveOrganisationId
      ? entry
      : {
          ...entry,
          organisationId: resolveOrganisationId(entry.memberId, entry.activityDate),
        }
  ));
  const storedIds = new Set(normalizedStored.map((entry) => entry.id));
  return [
    ...normalizedStored,
    ...normalizedDefaults.filter((entry) => !storedIds.has(entry.id)),
  ];
}

export function isActivityTranscriptEntry(
  value: unknown,
): value is ActivityTranscriptEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<ActivityTranscriptEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.memberId === "string" &&
    (entry.organisationId === undefined || typeof entry.organisationId === "string") &&
    [1, 2, 3, 4].includes(Number(entry.trainingYear)) &&
    typeof entry.academicYear === "string" &&
    typeof entry.requirementId === "string" &&
    typeof entry.category === "string" &&
    typeof entry.title === "string" &&
    typeof entry.activityDate === "string" &&
    typeof entry.institution === "string" &&
    typeof entry.role === "string" &&
    typeof entry.description === "string" &&
    ["student", "officer", "college_checkin", "system"].includes(
      String(entry.source),
    ) &&
    Array.isArray(entry.evidence) &&
    Boolean(entry.verification) &&
    typeof entry.verification?.status === "string"
  );
}
