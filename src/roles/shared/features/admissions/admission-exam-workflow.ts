import type { ScopedAcademicActor } from "@/roles/shared/features/academic";
import { hasResourceScope } from "@/roles/shared/features/roles/access-model";

export type AdmissionExamMode = "written" | "bedside" | "interview";
export type AdmissionExamRoundStatus =
  | "draft"
  | "open"
  | "closed"
  | "results_draft"
  | "published"
  | "cancelled";
export type AdmissionExamDecision = "passed" | "failed" | "absent" | "withheld";
export type AdmissionExamResultStatus = "draft" | "published" | "revised";

export interface AdmissionExamRoundHistoryEntry {
  id: string;
  fromStatus?: AdmissionExamRoundStatus;
  toStatus: AdmissionExamRoundStatus;
  actor: ScopedAcademicActor;
  occurredAt: string;
  reason: string;
}

export interface AdmissionExamRound {
  id: string;
  institutionId: string;
  title: string;
  program: string;
  modes: AdmissionExamMode[];
  startsAt: string;
  endsAt: string;
  venue: string;
  capacity: number;
  candidateAdmissionIds: string[];
  status: AdmissionExamRoundStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  cancelledAt?: string;
  history: AdmissionExamRoundHistoryEntry[];
}

export interface AdmissionExamResultRevision {
  id: string;
  previousDecision?: AdmissionExamDecision;
  newDecision: AdmissionExamDecision;
  previousScore?: number;
  newScore?: number;
  reason?: string;
  actor: ScopedAcademicActor;
  createdAt: string;
}

export interface AdmissionExamResult {
  id: string;
  roundId: string;
  admissionId: string;
  status: AdmissionExamResultStatus;
  draftDecision?: AdmissionExamDecision;
  currentDecision?: AdmissionExamDecision;
  score?: number;
  note?: string;
  publishedAt?: string;
  updatedAt: string;
  revisions: AdmissionExamResultRevision[];
}

export interface AdmissionExamRoundDraft {
  title: string;
  program: string;
  modes: AdmissionExamMode[];
  startsAt: string;
  endsAt: string;
  venue: string;
  capacity: number;
  candidateAdmissionIds: string[];
}

export interface AdmissionExamCandidate {
  id: string;
  institutionId: string;
  applicationType: "exam" | "study";
  status: string;
  program: string;
}

const admissionExamDecisions = new Set<AdmissionExamDecision>([
  "passed",
  "failed",
  "absent",
  "withheld",
]);

function assertAdmissionExamDecision(value: AdmissionExamDecision) {
  if (!admissionExamDecisions.has(value)) {
    throw new Error("พบผลการสอบที่ไม่รองรับ");
  }
}

function requiredText(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

function validDate(value: string, message: string) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error(message);
  return time;
}

export function assertInstitutionExamScope(
  actor: ScopedAcademicActor,
  institutionId: string,
) {
  if (
    actor.role !== "institution_admin" ||
    actor.organisationId !== institutionId ||
    !hasResourceScope(actor.resourceScopes, `institution:${institutionId}`)
  ) {
    throw new Error("บัญชีนี้ไม่มีสิทธิ์จัดการรอบสอบของสถาบันดังกล่าว");
  }
}

export function eligibleAdmissionExamCandidates<T extends AdmissionExamCandidate>(
  admissions: readonly T[],
  institutionId: string,
): T[] {
  return admissions.filter((admission) => (
    admission.institutionId === institutionId &&
    admission.applicationType === "study" &&
    admission.status === "approved"
  ));
}

function validateRoundDraft(
  draft: AdmissionExamRoundDraft,
  admissions: readonly AdmissionExamCandidate[],
  institutionId: string,
) {
  const title = requiredText(draft.title, "กรุณาระบุชื่อรอบสอบ");
  const program = requiredText(draft.program, "กรุณาระบุหลักสูตร");
  const venue = requiredText(draft.venue, "กรุณาระบุสถานที่สอบ");
  const startsAt = validDate(draft.startsAt, "วันและเวลาเริ่มสอบไม่ถูกต้อง");
  const endsAt = validDate(draft.endsAt, "วันและเวลาสิ้นสุดสอบไม่ถูกต้อง");
  if (endsAt <= startsAt) throw new Error("เวลาสิ้นสุดสอบต้องอยู่หลังเวลาเริ่มสอบ");
  if (!Number.isInteger(draft.capacity) || draft.capacity < 1) {
    throw new Error("จำนวนที่รับต้องเป็นจำนวนเต็มตั้งแต่ 1 คนขึ้นไป");
  }
  if (draft.modes.length === 0) throw new Error("กรุณาเลือกประเภทการสอบอย่างน้อย 1 แบบ");
  const allowedModes = new Set<AdmissionExamMode>(["written", "bedside", "interview"]);
  if (draft.modes.some((mode) => !allowedModes.has(mode))) {
    throw new Error("พบประเภทการสอบที่ไม่รองรับ");
  }
  const uniqueCandidateIds = [...new Set(draft.candidateAdmissionIds)];
  if (uniqueCandidateIds.length === 0) throw new Error("กรุณาเลือกผู้มีสิทธิ์สอบอย่างน้อย 1 คน");
  if (uniqueCandidateIds.length > draft.capacity) {
    throw new Error("จำนวนผู้มีสิทธิ์สอบเกินจำนวนที่รับ");
  }
  const eligibleIds = new Set(
    eligibleAdmissionExamCandidates(admissions, institutionId)
      .filter((admission) => admission.program === program)
      .map((admission) => admission.id),
  );
  if (uniqueCandidateIds.some((id) => !eligibleIds.has(id))) {
    throw new Error("พบผู้สมัครที่ยังไม่ได้รับอนุมัติหรืออยู่นอกขอบเขตสถาบัน");
  }
  return {
    title,
    program,
    venue,
    candidateAdmissionIds: uniqueCandidateIds,
  };
}

export function createAdmissionExamRound(input: {
  id: string;
  actor: ScopedAcademicActor;
  admissions: readonly AdmissionExamCandidate[];
  draft: AdmissionExamRoundDraft;
  at?: string;
}): AdmissionExamRound {
  assertInstitutionExamScope(input.actor, input.actor.organisationId);
  const at = input.at ?? new Date().toISOString();
  validDate(at, "เวลาบันทึกรอบสอบไม่ถูกต้อง");
  const normalized = validateRoundDraft(input.draft, input.admissions, input.actor.organisationId);
  return {
    id: requiredText(input.id, "รหัสรอบสอบจำเป็นต้องมี"),
    institutionId: input.actor.organisationId,
    title: normalized.title,
    program: normalized.program,
    modes: [...new Set(input.draft.modes)],
    startsAt: input.draft.startsAt,
    endsAt: input.draft.endsAt,
    venue: normalized.venue,
    capacity: input.draft.capacity,
    candidateAdmissionIds: normalized.candidateAdmissionIds,
    status: "draft",
    createdBy: input.actor.userName,
    createdAt: at,
    updatedAt: at,
    history: [{
      id: `${input.id}-history-1`,
      toStatus: "draft",
      actor: { ...input.actor, resourceScopes: [...input.actor.resourceScopes] },
      occurredAt: at,
      reason: "สร้างร่างรอบสอบ",
    }],
  };
}

function transitionRound(
  round: AdmissionExamRound,
  actor: ScopedAcademicActor,
  toStatus: AdmissionExamRoundStatus,
  allowedFrom: readonly AdmissionExamRoundStatus[],
  reason: string,
  at = new Date().toISOString(),
) {
  assertInstitutionExamScope(actor, round.institutionId);
  validDate(at, "เวลาดำเนินการรอบสอบไม่ถูกต้อง");
  if (!allowedFrom.includes(round.status)) {
    throw new Error(`ไม่สามารถเปลี่ยนรอบสอบจาก ${round.status} เป็น ${toStatus}`);
  }
  const normalizedReason = requiredText(reason, "กรุณาระบุเหตุผลการดำเนินการ");
  return {
    ...round,
    status: toStatus,
    updatedAt: at,
    ...(toStatus === "cancelled" ? { cancelledAt: at } : {}),
    ...(toStatus === "published" ? { publishedAt: at } : {}),
    history: [...round.history, {
      id: `${round.id}-history-${round.history.length + 1}`,
      fromStatus: round.status,
      toStatus,
      actor: { ...actor, resourceScopes: [...actor.resourceScopes] },
      occurredAt: at,
      reason: normalizedReason,
    }],
  } satisfies AdmissionExamRound;
}

export function openAdmissionExamRound(
  round: AdmissionExamRound,
  actor: ScopedAcademicActor,
  reason = "ตรวจสอบกำหนดการและรายชื่อผู้มีสิทธิ์สอบแล้ว",
  at?: string,
) {
  return transitionRound(round, actor, "open", ["draft"], reason, at);
}

export function closeAdmissionExamRound(
  round: AdmissionExamRound,
  actor: ScopedAcademicActor,
  reason = "การสอบเสร็จสิ้นและพร้อมบันทึกผล",
  at?: string,
) {
  return transitionRound(round, actor, "closed", ["open"], reason, at);
}

export function cancelAdmissionExamRound(
  round: AdmissionExamRound,
  actor: ScopedAcademicActor,
  reason: string,
  at?: string,
) {
  return transitionRound(round, actor, "cancelled", ["draft", "open"], reason, at);
}

export function saveAdmissionExamResultDraft(input: {
  round: AdmissionExamRound;
  current?: AdmissionExamResult;
  admissionId: string;
  decision: AdmissionExamDecision;
  score?: number;
  note?: string;
  actor: ScopedAcademicActor;
  at?: string;
}): AdmissionExamResult {
  assertInstitutionExamScope(input.actor, input.round.institutionId);
  if (input.round.status !== "closed" && input.round.status !== "results_draft") {
    throw new Error("บันทึกผลได้หลังปิดรอบสอบแล้วเท่านั้น");
  }
  assertAdmissionExamDecision(input.decision);
  if (!input.round.candidateAdmissionIds.includes(input.admissionId)) {
    throw new Error("ผู้สมัครไม่ได้อยู่ในรอบสอบนี้");
  }
  if (input.current && (
    input.current.roundId !== input.round.id ||
    input.current.admissionId !== input.admissionId
  )) {
    throw new Error("ผลสอบเดิมไม่ตรงกับรอบสอบหรือผู้สมัคร");
  }
  if (input.current?.status === "published" || input.current?.status === "revised") {
    throw new Error("ผลที่ประกาศแล้วต้องแก้ผ่านขั้นตอนแก้ไขผล");
  }
  if (input.score !== undefined && (!Number.isFinite(input.score) || input.score < 0 || input.score > 100)) {
    throw new Error("คะแนนต้องอยู่ระหว่าง 0 ถึง 100");
  }
  const at = input.at ?? new Date().toISOString();
  validDate(at, "เวลาบันทึกผลสอบไม่ถูกต้อง");
  return {
    id: input.current?.id ?? `${input.round.id}-${input.admissionId}`,
    roundId: input.round.id,
    admissionId: input.admissionId,
    status: "draft",
    draftDecision: input.decision,
    ...(input.score === undefined ? {} : { score: input.score }),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    updatedAt: at,
    revisions: input.current?.revisions ? [...input.current.revisions] : [],
  };
}

export function publishAdmissionExamResults(input: {
  round: AdmissionExamRound;
  results: readonly AdmissionExamResult[];
  actor: ScopedAcademicActor;
  reason: string;
  at?: string;
}) {
  assertInstitutionExamScope(input.actor, input.round.institutionId);
  if (input.round.status !== "closed" && input.round.status !== "results_draft") {
    throw new Error("ประกาศผลได้หลังปิดรอบสอบแล้วเท่านั้น");
  }
  const candidateIds = new Set(input.round.candidateAdmissionIds);
  if (input.results.some((result) => (
    result.roundId !== input.round.id || !candidateIds.has(result.admissionId)
  ))) {
    throw new Error("พบผลสอบที่ไม่ตรงกับรอบสอบหรือรายชื่อผู้มีสิทธิ์สอบ");
  }
  const resultByAdmission = new Map(input.results.map((result) => [result.admissionId, result]));
  const missing = input.round.candidateAdmissionIds.filter((id) => {
    const result = resultByAdmission.get(id);
    return !result ||
      result.status !== "draft" ||
      !result.draftDecision ||
      !admissionExamDecisions.has(result.draftDecision);
  });
  if (missing.length > 0) throw new Error("กรุณาบันทึกผลให้ครบทุกคนก่อนประกาศ");
  const at = input.at ?? new Date().toISOString();
  validDate(at, "เวลาประกาศผลสอบไม่ถูกต้อง");
  const publishedResults = input.round.candidateAdmissionIds.map((admissionId) => {
    const result = resultByAdmission.get(admissionId)!;
    const decision = result.draftDecision!;
    return {
      ...result,
      status: "published" as const,
      currentDecision: decision,
      draftDecision: undefined,
      publishedAt: at,
      updatedAt: at,
      revisions: [...result.revisions, {
        id: `${result.id}-revision-${result.revisions.length + 1}`,
        newDecision: decision,
        newScore: result.score,
        actor: { ...input.actor, resourceScopes: [...input.actor.resourceScopes] },
        createdAt: at,
      }],
    };
  });
  const publishedRound = transitionRound(
    input.round,
    input.actor,
    "published",
    ["closed", "results_draft"],
    input.reason,
    at,
  );
  return { round: publishedRound, results: publishedResults };
}

export function reviseAdmissionExamResult(input: {
  round: AdmissionExamRound;
  result: AdmissionExamResult;
  decision: AdmissionExamDecision;
  score?: number;
  note?: string;
  reason: string;
  actor: ScopedAcademicActor;
  at?: string;
}): AdmissionExamResult {
  assertInstitutionExamScope(input.actor, input.round.institutionId);
  if (input.round.status !== "published" ||
      (input.result.status !== "published" && input.result.status !== "revised") ||
      !input.result.currentDecision) {
    throw new Error("แก้ไขได้เฉพาะผลที่ประกาศแล้ว");
  }
  if (
    input.result.roundId !== input.round.id ||
    !input.round.candidateAdmissionIds.includes(input.result.admissionId)
  ) {
    throw new Error("ผลสอบไม่ตรงกับรอบสอบหรือรายชื่อผู้มีสิทธิ์สอบ");
  }
  assertAdmissionExamDecision(input.decision);
  const reason = requiredText(input.reason, "กรุณาระบุเหตุผลการแก้ไขผล");
  if (input.score !== undefined && (!Number.isFinite(input.score) || input.score < 0 || input.score > 100)) {
    throw new Error("คะแนนต้องอยู่ระหว่าง 0 ถึง 100");
  }
  const at = input.at ?? new Date().toISOString();
  validDate(at, "เวลาแก้ไขผลสอบไม่ถูกต้อง");
  return {
    ...input.result,
    status: "revised",
    currentDecision: input.decision,
    score: input.score,
    note: input.note?.trim() || undefined,
    updatedAt: at,
    revisions: [...input.result.revisions, {
      id: `${input.result.id}-revision-${input.result.revisions.length + 1}`,
      previousDecision: input.result.currentDecision,
      newDecision: input.decision,
      previousScore: input.result.score,
      newScore: input.score,
      reason,
      actor: { ...input.actor, resourceScopes: [...input.actor.resourceScopes] },
      createdAt: at,
    }],
  };
}

const demoInstitutionActor: ScopedAcademicActor = {
  userId: "institution-admin-001",
  userName: "ภก. วิชาญ อัครเวช",
  role: "institution_admin",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["institution:org-inst-siriraj"],
};

export const DEFAULT_ADMISSION_EXAM_ROUNDS: readonly AdmissionExamRound[] = [{
  id: "ADM-EXAM-SIRIRAJ-DEMO-2569",
  institutionId: demoInstitutionActor.organisationId,
  title: "การสอบคัดเลือกเข้าศึกษา รอบตัวอย่าง 2569",
  program: "การบริบาลทางเภสัชกรรม",
  modes: ["written", "interview"],
  startsAt: "2026-09-18T02:00:00.000Z",
  endsAt: "2026-09-18T05:00:00.000Z",
  venue: "ห้องสอบศูนย์การแพทย์ศิริราช",
  capacity: 20,
  candidateAdmissionIds: ["APP-2026-006"],
  status: "closed",
  createdBy: demoInstitutionActor.userName,
  createdAt: "2026-09-01T02:00:00.000Z",
  updatedAt: "2026-09-18T05:15:00.000Z",
  history: [
    {
      id: "ADM-EXAM-SIRIRAJ-DEMO-2569-history-1",
      toStatus: "draft",
      actor: demoInstitutionActor,
      occurredAt: "2026-09-01T02:00:00.000Z",
      reason: "สร้างร่างรอบสอบตัวอย่าง",
    },
    {
      id: "ADM-EXAM-SIRIRAJ-DEMO-2569-history-2",
      fromStatus: "draft",
      toStatus: "open",
      actor: demoInstitutionActor,
      occurredAt: "2026-09-05T02:00:00.000Z",
      reason: "ตรวจสอบกำหนดการและรายชื่อผู้มีสิทธิ์สอบแล้ว",
    },
    {
      id: "ADM-EXAM-SIRIRAJ-DEMO-2569-history-3",
      fromStatus: "open",
      toStatus: "closed",
      actor: demoInstitutionActor,
      occurredAt: "2026-09-18T05:15:00.000Z",
      reason: "การสอบเสร็จสิ้นและพร้อมบันทึกผล",
    },
  ],
}];

export const DEFAULT_ADMISSION_EXAM_RESULTS: readonly AdmissionExamResult[] = [{
  id: "ADM-EXAM-SIRIRAJ-DEMO-2569-APP-2026-006",
  roundId: "ADM-EXAM-SIRIRAJ-DEMO-2569",
  admissionId: "APP-2026-006",
  status: "draft",
  draftDecision: "passed",
  score: 82,
  note: "ผ่านเกณฑ์การสอบข้อเขียนและการสัมภาษณ์",
  updatedAt: "2026-09-18T06:00:00.000Z",
  revisions: [],
}];
