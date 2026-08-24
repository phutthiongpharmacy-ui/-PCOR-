import type { SystemRole } from "@/roles/shared/features/roles/access-model";
import type { CollegeCode } from "@/roles/shared/data/college-directory";

export type AcademicInstitutionKind = "hospital" | "university";

export interface AcademicInstitution {
  id: string;
  code: string;
  name: string;
  kind: AcademicInstitutionKind;
}

export interface AcademicStudent {
  id: string;
  name: string;
  licenseNumber: string;
}

export interface AcademicTeacher {
  id: string;
  name: string;
}

export type AcademicAffiliationStatus = "active" | "inactive";

interface AcademicAffiliationBase {
  id: string;
  institutionId: string;
  startsAt: string;
  endsAt?: string;
  status: AcademicAffiliationStatus;
}

export interface StudentAffiliation extends AcademicAffiliationBase {
  studentId: string;
}

export interface TeacherAffiliation extends AcademicAffiliationBase {
  teacherId: string;
}

export interface CourseOffering {
  id: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  term: string;
  institutionId: string;
  collegeCode: CollegeCode;
  status: "open" | "closed";
}

export type TeachingAssignmentStatus =
  | "pending_teacher_response"
  | "accepted"
  | "declined"
  | "cancelled";

export interface TeachingAssignmentPatch {
  teacherId: string;
  courseOfferingId: string;
  startsAt: string;
  endsAt?: string;
}

export interface TeachingAssignmentDecision {
  decision: "accepted" | "declined";
  actor: AcademicActor;
  reason?: string;
  decidedAt: string;
}

export interface TeachingAssignment {
  id: string;
  teacherId: string;
  courseOfferingId: string;
  institutionId: string;
  startsAt: string;
  endsAt?: string;
  assignedBy: string;
  assignedAt: string;
  status: TeachingAssignmentStatus;
  updatedAt: string;
  pendingChanges?: TeachingAssignmentPatch;
  latestDecision?: TeachingAssignmentDecision;
}

export interface AcademicActor {
  userId: string;
  userName: string;
  role: SystemRole;
  organisationId: string;
}

export interface ScopedAcademicActor extends AcademicActor {
  resourceScopes: readonly string[];
}

export type CourseProposalActor = ScopedAcademicActor;

export type CourseOfferingChangeStatus =
  | "pending_teacher_review"
  | "needs_revision"
  | "approved"
  | "rejected";

export type CourseOfferingChangeDecision = Exclude<
  CourseOfferingChangeStatus,
  "pending_teacher_review"
>;

export type CourseOfferingEditablePatch = Partial<
  Pick<CourseOffering, "courseTitle" | "credits" | "term">
>;

export type CourseOfferingChangeHistoryAction = "submitted" | "resubmitted" | "reviewed";

export interface CourseOfferingChangeHistoryEntry {
  id: string;
  action: CourseOfferingChangeHistoryAction;
  fromStatus?: CourseOfferingChangeStatus;
  toStatus: CourseOfferingChangeStatus;
  actor: ScopedAcademicActor;
  occurredAt: string;
  reason: string;
}

export interface CourseOfferingChangeReview {
  decision: CourseOfferingChangeDecision;
  reason: string;
  actor: ScopedAcademicActor;
  reviewedAt: string;
}

export interface CourseOfferingChangeRequest {
  id: string;
  courseOfferingId: string;
  institutionId: string;
  reviewerTeacherId: string;
  proposedChanges: CourseOfferingEditablePatch;
  reason: string;
  status: CourseOfferingChangeStatus;
  requestedBy: ScopedAcademicActor;
  requestedAt: string;
  updatedAt: string;
  latestReview?: CourseOfferingChangeReview;
  history: CourseOfferingChangeHistoryEntry[];
}

export type CourseProposalStatus =
  | "submitted"
  | "needs_revision"
  | "passed"
  | "rejected";

export type CourseProposalDecision = Exclude<CourseProposalStatus, "submitted">;

export type CourseProposalHistoryAction = "submitted" | "resubmitted" | "reviewed";

export interface CourseProposalHistoryEntry {
  id: string;
  action: CourseProposalHistoryAction;
  fromStatus?: CourseProposalStatus;
  toStatus: CourseProposalStatus;
  actor: CourseProposalActor;
  occurredAt: string;
  reason: string;
  evidenceReference?: string;
}

export interface CourseProposalReview {
  decision: CourseProposalDecision;
  note: string;
  actor: CourseProposalActor;
  reviewedAt: string;
  evidenceReference?: string;
}

export interface CourseProposal {
  id: string;
  proposerId: string;
  proposerName: string;
  institutionId: string;
  courseCode: string;
  courseTitle: string;
  credits: number;
  rationale: string;
  status: CourseProposalStatus;
  submittedAt: string;
  updatedAt: string;
  latestReview?: CourseProposalReview;
  history: CourseProposalHistoryEntry[];
}

export type SubjectResultValue = "S" | "U";
export type SubjectResultStatus = "pending" | "draft" | "published" | "revised";

export function formatSubjectResultValue(value?: SubjectResultValue) {
  if (value === "S") return "ผ่าน (S)";
  if (value === "U") return "ไม่ผ่าน (U)";
  return "—";
}

export const subjectResultStatusMeta = {
  pending: { label: "ยังไม่บันทึก", variant: "secondary" },
  draft: { label: "ฉบับร่าง", variant: "warning" },
  published: { label: "ประกาศแล้ว", variant: "success" },
  revised: { label: "แก้ไขแล้ว", variant: "info" },
} as const satisfies Record<SubjectResultStatus, {
  label: string;
  variant: "secondary" | "warning" | "success" | "info";
}>;

export const teachingAssignmentStatusMeta = {
  pending_teacher_response: { label: "รออาจารย์ตอบรับ", variant: "secondary" },
  accepted: { label: "ตอบรับแล้ว", variant: "success" },
  declined: { label: "ไม่ตอบรับ", variant: "danger" },
  cancelled: { label: "ยกเลิกแล้ว", variant: "secondary" },
} as const satisfies Record<TeachingAssignmentStatus, {
  label: string;
  variant: "secondary" | "warning" | "success" | "danger";
}>;

export const courseOfferingChangeStatusMeta = {
  pending_teacher_review: { label: "รออาจารย์ตรวจสอบ", variant: "secondary" },
  needs_revision: { label: "ต้องปรับแก้", variant: "warning" },
  approved: { label: "อนุมัติแล้ว", variant: "success" },
  rejected: { label: "ไม่อนุมัติ", variant: "danger" },
} as const satisfies Record<CourseOfferingChangeStatus, {
  label: string;
  variant: "secondary" | "warning" | "success" | "danger";
}>;

export interface SubjectResultRevision {
  id: string;
  previousValue?: SubjectResultValue;
  newValue: SubjectResultValue;
  reason?: string;
  actor: AcademicActor;
  createdAt: string;
}

export interface SubjectResult {
  id: string;
  studentId: string;
  courseOfferingId: string;
  teacherId: string;
  status: SubjectResultStatus;
  draftValue?: SubjectResultValue;
  currentValue?: SubjectResultValue;
  publishedAt?: string;
  updatedAt: string;
  revisions: SubjectResultRevision[];
}

export interface AcademicDataSnapshot {
  academicInstitutions: AcademicInstitution[];
  academicStudents: AcademicStudent[];
  academicTeachers: AcademicTeacher[];
  studentAffiliations: StudentAffiliation[];
  teacherAffiliations: TeacherAffiliation[];
  courseOfferings: CourseOffering[];
  teachingAssignments: TeachingAssignment[];
  courseOfferingChangeRequests: CourseOfferingChangeRequest[];
  courseProposals: CourseProposal[];
  subjectResults: SubjectResult[];
}
