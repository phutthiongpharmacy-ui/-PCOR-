import type { Admission } from "@/providers/mock-db-provider";
import type { ScopedAcademicActor } from "@/roles/shared/features/academic";
import { getLicenseEligibility } from "@/roles/shared/features/license-eligibility";
import { hasResourceScope } from "@/roles/shared/features/roles/access-model";

export type AdmissionApplicationType = "exam" | "study";

export type InstitutionAdmissionReviewDecision =
  | "documents_complete"
  | "request_information"
  | "approve"
  | "reject";

export interface InstitutionAdmissionReviewInput {
  admissionId: string;
  actor: ScopedAcademicActor;
  decision: InstitutionAdmissionReviewDecision;
  reason?: string;
  missingDocumentIds?: readonly string[];
}

const thaiMonthIndex: Readonly<Record<string, number>> = {
  "ม.ค.": 0,
  "ก.พ.": 1,
  "มี.ค.": 2,
  "เม.ย.": 3,
  "พ.ค.": 4,
  "มิ.ย.": 5,
  "ก.ค.": 6,
  "ส.ค.": 7,
  "ก.ย.": 8,
  "ต.ค.": 9,
  "พ.ย.": 10,
  "ธ.ค.": 11,
};

function admissionSubmissionTimestamp(admission: Admission) {
  if (admission.submittedAt) {
    const submittedAt = Date.parse(admission.submittedAt);
    if (Number.isFinite(submittedAt)) return submittedAt;
  }

  const match = admission.date.trim().match(/^(\d{1,2})\s+(\S+)\s+(\d{4})$/);
  if (!match) return Number.POSITIVE_INFINITY;

  const [, dayValue, monthValue, buddhistYearValue] = match;
  const day = Number(dayValue);
  const month = thaiMonthIndex[monthValue];
  const buddhistYear = Number(buddhistYearValue);
  if (!Number.isInteger(day) || month === undefined || !Number.isInteger(buddhistYear)) {
    return Number.POSITIVE_INFINITY;
  }

  return Date.UTC(buddhistYear - 543, month, day);
}

export function orderInstitutionAdmissionsBySubmissionTime(
  admissions: readonly Admission[],
) {
  return admissions
    .map((admission, originalIndex) => ({
      admission,
      originalIndex,
      submittedAt: admissionSubmissionTimestamp(admission),
    }))
    .sort((left, right) => (
      left.submittedAt === right.submittedAt
        ? left.originalIndex - right.originalIndex
        : left.submittedAt - right.submittedAt
    ))
    .map(({ admission }) => admission);
}

interface ReviewAdmissionRecordInput extends InstitutionAdmissionReviewInput {
  admission: Admission;
  reviewedAt?: string;
}

function assertInstitutionScope(admission: Admission, actor: ScopedAcademicActor) {
  if (
    actor.role !== "institution_admin" ||
    actor.organisationId !== admission.institutionId ||
    !hasResourceScope(actor.resourceScopes, `institution:${admission.institutionId}`)
  ) {
    throw new Error("บัญชีนี้ไม่มีสิทธิ์จัดการข้อมูลของสถาบันดังกล่าว");
  }
}

function requiredReason(reason: string | undefined, message: string) {
  const normalized = reason?.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

function reviewStamp(actor: ScopedAcademicActor, reviewedAt: string) {
  return {
    reviewedAt,
    reviewedBy: actor.userName,
  };
}

export function selectInstitutionAdmissions(
  admissions: readonly Admission[],
  institutionId: string,
) {
  return admissions.filter((admission) => admission.institutionId === institutionId);
}

export function institutionAdmissionApprovalIssue(admission: Admission) {
  if (admission.status !== "pending") {
    return "คำสมัครนี้ได้รับการพิจารณาแล้ว";
  }
  if (admission.documentStatus !== "complete") {
    return "กรุณายืนยันว่าเอกสารครบถ้วนก่อนอนุมัติ";
  }

  const eligibility = getLicenseEligibility(admission.licenseStatus);
  const canApprove = admission.applicationType === "exam"
    ? eligibility.canApplyForExam
    : eligibility.canRegisterCourses;
  return canApprove ? null : eligibility.description;
}

export function reviewInstitutionAdmissionRecord({
  admission,
  actor,
  decision,
  reason,
  missingDocumentIds = [],
  reviewedAt = new Date().toISOString(),
}: ReviewAdmissionRecordInput): Admission {
  assertInstitutionScope(admission, actor);
  if (admission.status !== "pending") {
    throw new Error("พิจารณาได้เฉพาะคำสมัครที่รอดำเนินการ");
  }

  if (decision === "documents_complete") {
    if (missingDocumentIds.length > 0) {
      throw new Error("กรุณายกเลิกการเลือกเอกสารที่ต้องแก้ไขก่อนยืนยันว่าเอกสารครบถ้วน");
    }
    return {
      ...admission,
      documents: admission.documents.map((document) => ({
        ...document,
        reviewStatus: document.file ? "accepted" : "not_applicable",
        reviewerNote: undefined,
      })),
      documentStatus: "complete",
      documentNote: undefined,
      ...reviewStamp(actor, reviewedAt),
    };
  }

  if (decision === "request_information") {
    const note = requiredReason(reason, "กรุณาระบุคำแนะนำสำหรับผู้สมัคร");
    const validDocumentIds = new Set(admission.documents.map((document) => document.id));
    const selectedDocumentIds = new Set(
      missingDocumentIds.filter((documentId) => validDocumentIds.has(documentId)),
    );
    if (selectedDocumentIds.size === 0) {
      throw new Error("กรุณาเลือกเอกสารที่ต้องการให้ผู้สมัครแก้ไขหรือแนบเพิ่ม");
    }
    if (selectedDocumentIds.size !== new Set(missingDocumentIds).size) {
      throw new Error("พบรายการเอกสารที่ไม่อยู่ในคำสมัครนี้");
    }

    return {
      ...admission,
      documents: admission.documents.map((document) => {
        if (selectedDocumentIds.has(document.id)) {
          return {
            ...document,
            reviewStatus: "missing" as const,
            reviewerNote: note,
          };
        }
        if (document.reviewStatus !== "missing") return document;
        return {
          ...document,
          reviewStatus: document.file ? "pending" as const : "not_applicable" as const,
          reviewerNote: undefined,
        };
      }),
      documentStatus: "incomplete",
      documentNote: note,
      ...reviewStamp(actor, reviewedAt),
    };
  }

  if (decision === "approve") {
    const issue = institutionAdmissionApprovalIssue(admission);
    if (issue) throw new Error(issue);
    const decisionNote = reason?.trim() || "เอกสารและคุณสมบัติครบถ้วนตามเกณฑ์";
    return {
      ...admission,
      status: "approved",
      decisionNote,
      ...reviewStamp(actor, reviewedAt),
    };
  }

  const decisionNote = requiredReason(reason, "กรุณาระบุเหตุผลที่ไม่อนุมัติคำสมัคร");
  return {
    ...admission,
    status: "rejected",
    decisionNote,
    ...reviewStamp(actor, reviewedAt),
  };
}
