"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  createAdmissionDocuments,
  type AdmissionDocument,
  type AdmissionDocumentStatus,
} from "@/roles/shared/features/admissions/documents";
import {
  defaultResearchSubmissions,
  type ResearchSubmission,
  type ResearchSubmissionStatus,
} from "@/roles/shared/features/research/types";
import type { FileMetadata } from "@/roles/shared/features/file-metadata";
import { isCollegeCode } from "@/roles/shared/data/college-directory";
import { currentMemberPassport } from "@/roles/shared/member/domain/member";
import {
  createEligibilityCheckedRegistration,
  isRegistrationStatus,
  markRegistrationAwaitingPayment,
  markRegistrationEnrolled,
  recordTeacherRegistrationDecision,
  resubmitRegistration as resubmitRegistrationRecord,
  transitionRegistration,
  type RegistrationHistoryEntry,
  type RegistrationRecord,
  type RegistrationSelectionInput,
  type RegistrationStatus,
  type RegistrationActionActor,
  type RegistrationEligibilitySnapshot,
  type RegistrationTeacherDecision,
} from "@/roles/shared/features/registration";
import { getRegistrationWindowStatus } from "@/roles/shared/features/registration/registration-window";
import {
  cancelRegistrationInvoice,
  createLockedRegistrationInvoice,
  payRegistrationInvoice,
  unlockRegistrationInvoice,
  type PaymentMethod,
  type RegistrationInvoice,
} from "@/roles/shared/features/finance";
import {
  findLicenseRegistryRecord,
  getLicenseEligibility,
  isLicenseStatus,
} from "@/roles/shared/features/license-eligibility";
import type { LicenseVerificationStatus } from "@/roles/shared/features/license-eligibility";
import {
  DEFAULT_ACADEMIC_INSTITUTIONS,
  DEFAULT_ACADEMIC_STUDENTS,
  DEFAULT_ACADEMIC_TEACHERS,
  DEFAULT_COURSE_OFFERING_CHANGE_REQUESTS,
  DEFAULT_COURSE_PROPOSALS,
  DEFAULT_COURSE_OFFERINGS,
  DEFAULT_STUDENT_AFFILIATIONS,
  DEFAULT_SUBJECT_RESULTS,
  DEFAULT_TEACHER_AFFILIATIONS,
  DEFAULT_TEACHING_ASSIGNMENTS,
  canTeacherAccessOfferingWithinAffiliation,
  cancelTeachingAssignmentRecord,
  createCourseProposal as createCourseProposalRecord,
  createCourseOfferingChangeRequest as createCourseOfferingChangeRequestRecord,
  createPendingSubjectResult,
  createTeachingAssignmentRecord,
  isAcademicAffiliationActive,
  publishSubjectResult as publishSubjectResultRecord,
  reviseSubjectResult as reviseSubjectResultRecord,
  reviewCourseProposalRecord,
  resubmitCourseProposalRecord,
  resubmitCourseOfferingChangeRequest as resubmitCourseOfferingChangeRequestRecord,
  respondTeachingAssignmentRecord,
  reviewCourseOfferingChangeRequest as reviewCourseOfferingChangeRequestRecord,
  saveSubjectResultDraft as saveSubjectResultDraftRecord,
  stageTeachingAssignmentUpdate,
  type AcademicActor,
  type AcademicInstitution,
  type AcademicStudent,
  type AcademicTeacher,
  type CourseProposal,
  type CourseProposalActor,
  type CourseProposalDecision,
  type CourseOfferingChangeDecision,
  type CourseOfferingChangeRequest,
  type CourseOfferingEditablePatch,
  type CourseOffering,
  type ScopedAcademicActor,
  type StudentAffiliation,
  type SubjectResult,
  type SubjectResultValue,
  type TeacherAffiliation,
  type TeachingAssignment,
  type TeachingAssignmentPatch,
} from "@/roles/shared/features/academic";
import {
  appendAuditEvent,
  useAuditLog,
  type UserAuditEvent,
} from "@/roles/shared/features/audit";
import {
  ORGANISATIONS,
  ORGANISATION_LIST,
  hasResourceScope,
  isSystemRole,
  type OrganisationScope,
} from "@/roles/shared/features/roles/access-model";
import {
  reviewInstitutionAdmissionRecord,
  type AdmissionApplicationType,
  type InstitutionAdmissionReviewInput,
} from "@/roles/institution/features/admissions/institution-admission-review";

// Types
export type Status = "pending" | "approved" | "rejected";

export interface Admission {
  id: string;
  name: string;
  license: string;
  program: string;
  date: string;
  submittedAt?: string;
  institutionId: string;
  applicationType: AdmissionApplicationType;
  status: Status;
  documents: AdmissionDocument[];
  documentStatus: AdmissionDocumentStatus;
  documentNote?: string;
  decisionNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  licenseStatus: LicenseVerificationStatus;
  licenseCheckedAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  name: string;
  program: string;
  amount: number;
  date: string;
  status: Status;
  type: string;
  invoiceId?: string;
  method?: PaymentMethod;
  referenceNo?: string;
  submittedAt?: string;
  evidenceFileName?: string;
  evidenceFileType?: string;
  evidenceFileSize?: number;
  evidenceDataUrl?: string;
}

export interface Program {
  id: string;
  name: string;
  studentsCount: number;
  status: "active" | "draft";
  lastUpdated: string;
}

export interface CourseRequest {
  id: string;
  collegeName: string;
  courseCode?: string;
  legacyCourseCode?: string;
  kind?: "course" | "short_course";
  classification?: "required" | "general";
  institutionId?: string;
  courseTitle: string;
  type: string;
  duration: string;
  capacity: number;
  status: Status;
  submittedAt: string;
}

export type Registration = RegistrationRecord;

export interface ExamRequest {
  id: string;
  studentId: string;
  studentName: string;
  program: string;
  examType: string;
  logbookUrl: string;
  status: "pending" | "approved" | "rejected" | "passed" | "failed";
  submittedAt: string;
  examDate?: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  program: string;
  issuedAt: string;
  status: "pending_approval" | "issued";
}

export interface Settings {
  admissionOpen: boolean;
  registrationOpen: boolean;
  registrationOpensAt: string;
  registrationClosesAt: string;
}

export interface RegistrationReviewInput {
  registrationId: string;
  decision: "approve" | "needs_info" | "reject";
  actor: ScopedAcademicActor;
  reason?: string;
  evidenceReference?: string;
}

export interface TeachingAssignmentInput {
  teacherId: string;
  courseOfferingId: string;
  actor: ScopedAcademicActor;
  startsAt?: string;
  endsAt?: string;
  reason: string;
}

export interface InstitutionTeacherInput {
  actor: ScopedAcademicActor;
  name: string;
  startsAt?: string;
  endsAt?: string;
  reason: string;
}

export interface InstitutionTeacherUpdateInput {
  actor: ScopedAcademicActor;
  teacherId: string;
  name: string;
  reason: string;
}

export interface InstitutionTeacherEndInput {
  actor: ScopedAcademicActor;
  teacherId: string;
  reason: string;
}

export interface TeachingAssignmentUpdateInput extends TeachingAssignmentInput {
  assignmentId: string;
  startsAt: string;
}

export interface TeachingAssignmentCancelInput {
  actor: ScopedAcademicActor;
  assignmentId: string;
  reason: string;
}

export interface TeachingAssignmentResponseInput {
  actor: ScopedAcademicActor;
  assignmentId: string;
  decision: "accept" | "decline";
  reason?: string;
}

export interface AffiliationStatusInput {
  affiliationType: "student" | "teacher";
  affiliationId: string;
  status: "active" | "inactive";
  actor: ScopedAcademicActor;
  reason: string;
}

export interface CourseOfferingStatusInput {
  courseOfferingId: string;
  status: CourseOffering["status"];
  actor: ScopedAcademicActor;
  reason: string;
}

export interface CourseOfferingChangeSubmissionInput {
  actor: ScopedAcademicActor;
  courseOfferingId: string;
  reviewerTeacherId: string;
  proposedChanges: CourseOfferingEditablePatch;
  reason: string;
}

export interface CourseOfferingChangeResubmissionInput {
  actor: ScopedAcademicActor;
  requestId: string;
  proposedChanges: CourseOfferingEditablePatch;
  reason: string;
}

export interface CourseOfferingChangeReviewInput {
  actor: ScopedAcademicActor;
  requestId: string;
  decision: CourseOfferingChangeDecision;
  reason: string;
}

export interface SubjectResultDraftInput {
  resultId: string;
  value: SubjectResultValue;
  actor: ScopedAcademicActor;
}

export interface SubjectResultRevisionInput extends SubjectResultDraftInput {
  reason: string;
}

export interface CourseProposalSubmissionInput {
  actor: CourseProposalActor;
  courseCode: string;
  courseTitle: string;
  credits: number;
  rationale: string;
  evidenceReference?: string;
}

export interface CourseProposalResubmissionInput extends CourseProposalSubmissionInput {
  proposalId: string;
  reason: string;
}

export interface CourseProposalReviewInput {
  proposalId: string;
  actor: CourseProposalActor;
  decision: CourseProposalDecision;
  reason: string;
  evidenceReference?: string;
}

export type RegistrationSubmissionInput = Omit<
  RegistrationSelectionInput,
  "id" | "eligibility"
>;

interface MockDbContextType {
  isLoaded: boolean;
  admissions: Admission[];
  setAdmissions: React.Dispatch<React.SetStateAction<Admission[]>>;
  updateAdmissionStatus: (id: string, status: Status) => void;
  updateAdmissionDocuments: (
    id: string,
    documents: AdmissionDocument[],
    documentStatus?: AdmissionDocumentStatus,
    documentNote?: string,
  ) => void;
  reviewInstitutionAdmission: (input: InstitutionAdmissionReviewInput) => void;

  researchSubmissions: ResearchSubmission[];
  setResearchSubmissions: React.Dispatch<React.SetStateAction<ResearchSubmission[]>>;
  addResearchSubmission: (submission: ResearchSubmission) => void;
  updateResearchSubmissionStatus: (
    id: string,
    status: ResearchSubmissionStatus,
    reviewerNote?: string,
  ) => void;
  
  payments: Payment[];
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  updatePaymentStatus: (id: string, status: Status) => void;
  addPayment: (payment: Payment) => void;

  programs: Program[];
  setPrograms: React.Dispatch<React.SetStateAction<Program[]>>;

  courseRequests: CourseRequest[];
  setCourseRequests: React.Dispatch<React.SetStateAction<CourseRequest[]>>;
  updateCourseRequestStatus: (id: string, status: Status) => void;

  registrations: Registration[];
  setRegistrations: React.Dispatch<React.SetStateAction<Registration[]>>;
  registrationInvoices: RegistrationInvoice[];
  submitRegistrations: (
    selections: RegistrationSubmissionInput[],
  ) => Registration[];
  resubmitRegistration: (id: string) => void;
  requestRegistrationDrop: (id: string, reason?: string) => void;
  updateRegistrationStatus: (
    id: string,
    status: RegistrationStatus,
    reason?: string,
  ) => void;

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
  auditEvents: UserAuditEvent[];
  reviewRegistration: (input: RegistrationReviewInput) => void;
  addInstitutionTeacher: (input: InstitutionTeacherInput) => void;
  updateInstitutionTeacher: (input: InstitutionTeacherUpdateInput) => void;
  endInstitutionTeacherAffiliation: (input: InstitutionTeacherEndInput) => void;
  assignTeacherToCourse: (input: TeachingAssignmentInput) => void;
  updateTeachingAssignment: (input: TeachingAssignmentUpdateInput) => void;
  cancelTeachingAssignment: (input: TeachingAssignmentCancelInput) => void;
  respondTeachingAssignment: (input: TeachingAssignmentResponseInput) => void;
  updateAffiliationStatus: (input: AffiliationStatusInput) => void;
  updateCourseOfferingStatus: (input: CourseOfferingStatusInput) => void;
  requestCourseOfferingChange: (input: CourseOfferingChangeSubmissionInput) => void;
  resubmitCourseOfferingChange: (input: CourseOfferingChangeResubmissionInput) => void;
  reviewCourseOfferingChange: (input: CourseOfferingChangeReviewInput) => void;
  submitCourseProposal: (input: CourseProposalSubmissionInput) => void;
  resubmitCourseProposal: (input: CourseProposalResubmissionInput) => void;
  reviewCourseProposal: (input: CourseProposalReviewInput) => void;
  saveSubjectResultDraft: (input: SubjectResultDraftInput) => void;
  publishSubjectResult: (input: { resultId: string; actor: ScopedAcademicActor }) => void;
  reviseSubjectResult: (input: SubjectResultRevisionInput) => void;

  examRequests: ExamRequest[];
  setExamRequests: React.Dispatch<React.SetStateAction<ExamRequest[]>>;
  updateExamRequestStatus: (id: string, status: ExamRequest["status"]) => void;

  certificates: Certificate[];
  setCertificates: React.Dispatch<React.SetStateAction<Certificate[]>>;
  updateCertificateStatus: (id: string, status: Certificate["status"]) => void;

  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
}

const exampleSubmittedDocumentIds = new Set([
  "application-photo",
  "degree",
  "license",
  "transcript",
  "recommendation",
  "cv",
  "permission",
]);

function createMockSubmittedDocuments(options?: { missingId?: string; accepted?: boolean }) {
  return createAdmissionDocuments().map((document) => {
    const isMissing = document.id === options?.missingId;
    const hasFile = exampleSubmittedDocumentIds.has(document.id) && !isMissing;
    return {
      ...document,
      file: hasFile
        ? {
            name: `${document.id}.pdf`,
            type: "application/pdf",
            size: 420000,
            lastModified: 1783209600000,
          }
        : undefined,
      reviewStatus: isMissing
        ? "missing" as const
        : hasFile && options?.accepted
          ? "accepted" as const
          : hasFile
            ? "pending" as const
            : "not_applicable" as const,
      reviewerNote: isMissing ? "กรุณาแนบเอกสารฉบับที่อ่านวันหมดอายุได้ชัดเจน" : undefined,
    };
  });
}

function isFileMetadata(value: unknown): value is FileMetadata {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<FileMetadata>;
  return (
    typeof file.name === "string" &&
    typeof file.type === "string" &&
    typeof file.size === "number" &&
    typeof file.lastModified === "number"
  );
}

function isResearchSubmission(value: unknown): value is ResearchSubmission {
  if (!value || typeof value !== "object") return false;
  const submission = value as Partial<ResearchSubmission>;
  return (
    typeof submission.id === "string" &&
    typeof submission.title === "string" &&
    typeof submission.authors === "string" &&
    typeof submission.type === "string" &&
    typeof submission.field === "string" &&
    typeof submission.journal === "string" &&
    typeof submission.publisher === "string" &&
    typeof submission.year === "number" &&
    typeof submission.language === "string" &&
    typeof submission.doi === "string" &&
    typeof submission.abstract === "string" &&
    typeof submission.consentToPublish === "boolean" &&
    typeof submission.submittedAt === "string" &&
    (submission.status === "pending" ||
      submission.status === "approved" ||
      submission.status === "rejected") &&
    (!submission.articleFile || isFileMetadata(submission.articleFile)) &&
    (!submission.acceptanceFile || isFileMetadata(submission.acceptanceFile))
  );
}

function normalizeResearchSubmissions(value: unknown): ResearchSubmission[] {
  if (!Array.isArray(value)) return defaultResearchSubmissions;
  const validStored = value.filter(isResearchSubmission);
  const storedIds = new Set(validStored.map((submission) => submission.id));
  return [
    ...validStored,
    ...defaultResearchSubmissions.filter((submission) => !storedIds.has(submission.id)),
  ];
}

function normalizeAdmissionDocuments(
  value: unknown,
  admissionStatus: Status,
): AdmissionDocument[] {
  if (!Array.isArray(value) || value.length === 0) {
    return admissionStatus === "approved"
      ? createMockSubmittedDocuments({ accepted: true })
      : createAdmissionDocuments();
  }

  const storedById = new Map(
    value
      .filter((document): document is Record<string, unknown> => (
        Boolean(document) && typeof document === "object" && typeof document.id === "string"
      ))
      .map((document) => [document.id as string, document]),
  );

  return createAdmissionDocuments().map((requirement) => {
    const stored = storedById.get(requirement.id);
    if (!stored) return requirement;

    const file = isFileMetadata(stored.file) ? stored.file : undefined;
    const reviewStatus =
      stored.reviewStatus === "accepted" ||
      stored.reviewStatus === "missing" ||
      stored.reviewStatus === "not_applicable" ||
      stored.reviewStatus === "pending"
        ? stored.reviewStatus
        : file
          ? admissionStatus === "approved" ? "accepted" : "pending"
          : requirement.required ? "pending" : "not_applicable";

    return {
      ...requirement,
      file,
      reviewStatus,
      reviewerNote: typeof stored.reviewerNote === "string" ? stored.reviewerNote : undefined,
    };
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const legacyAdmissionRouting: Record<string, {
  institutionId: string;
  applicationType: AdmissionApplicationType;
}> = {
  "APP-2026-001": { institutionId: ORGANISATIONS.siriraj.id, applicationType: "exam" },
  "APP-2026-002": { institutionId: ORGANISATIONS.siriraj.id, applicationType: "study" },
  "APP-2026-003": { institutionId: ORGANISATIONS.chula.id, applicationType: "exam" },
  "APP-2026-004": { institutionId: ORGANISATIONS.siriraj.id, applicationType: "study" },
};

function normalizeAdmission(value: unknown): Admission | null {
  if (!value || typeof value !== "object") return null;
  const admission = value as Partial<Admission>;
  if (
    !isNonEmptyString(admission.id) ||
    !isNonEmptyString(admission.name) ||
    !isNonEmptyString(admission.license) ||
    !isNonEmptyString(admission.program) ||
    !isNonEmptyString(admission.date)
  ) {
    return null;
  }

  const status: Status = admission.status === "approved" || admission.status === "rejected"
    ? admission.status
    : "pending";
  const documents = normalizeAdmissionDocuments(admission.documents, status);
  const hasMissingDocuments = documents.some((document) => document.reviewStatus === "missing");
  const hasPendingDocumentReview = documents.some((document) => (
    Boolean(document.file) && document.reviewStatus !== "accepted"
  ));
  const documentStatus: AdmissionDocumentStatus = status === "approved"
    ? "complete"
    : hasMissingDocuments
      ? "incomplete"
      : hasPendingDocumentReview
      ? "pending"
      : "complete";
  const legacyRouting = legacyAdmissionRouting[admission.id.trim()];
  const institutionId = isNonEmptyString(admission.institutionId) &&
    ORGANISATION_LIST.some((organisation) => (
      organisation.kind === "institution" && organisation.id === admission.institutionId?.trim()
    ))
    ? admission.institutionId.trim()
    : legacyRouting?.institutionId ?? ORGANISATIONS.siriraj.id;
  const applicationType: AdmissionApplicationType = admission.applicationType === "study"
    ? "study"
    : admission.applicationType === "exam"
      ? "exam"
      : legacyRouting?.applicationType ?? "exam";
  const registryRecord = findLicenseRegistryRecord(admission.license);
  const licenseStatus = isLicenseStatus(admission.licenseStatus)
    ? admission.licenseStatus
    : registryRecord?.status ?? "unverified";
  const licenseCheckedAt = isNonEmptyString(admission.licenseCheckedAt)
    ? admission.licenseCheckedAt
    : registryRecord?.checkedAt ?? "2026-08-11T07:30:00.000Z";

  return {
    id: admission.id.trim(),
    name: admission.name.trim(),
    license: admission.license.trim(),
    program: admission.program.trim(),
    date: admission.date.trim(),
    institutionId,
    applicationType,
    status,
    documents,
    documentStatus,
    documentNote: typeof admission.documentNote === "string"
      ? admission.documentNote
      : undefined,
    decisionNote: typeof admission.decisionNote === "string"
      ? admission.decisionNote
      : undefined,
    reviewedAt: isNonEmptyString(admission.reviewedAt)
      ? admission.reviewedAt
      : undefined,
    reviewedBy: isNonEmptyString(admission.reviewedBy)
      ? admission.reviewedBy
      : undefined,
    licenseStatus,
    licenseCheckedAt,
  };
}

const defaultAdmissions: Admission[] = [
  {
    id: "APP-2026-001",
    name: "ภก. สมชาย ใจดี",
    license: "ภ.12345",
    program: "เภสัชบำบัด",
    date: "24 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "exam",
    status: "pending",
    documents: createMockSubmittedDocuments(),
    documentStatus: "pending",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-002",
    name: "ภญ. สมหญิง รักชาติ",
    license: "ภ.23456",
    program: "เภสัชกรรมชุมชน",
    date: "23 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "study",
    status: "pending",
    documents: createMockSubmittedDocuments({ missingId: "license" }),
    documentStatus: "incomplete",
    documentNote: "กรุณาแนบสำเนาใบประกอบวิชาชีพที่เห็นวันหมดอายุชัดเจน",
    licenseStatus: "suspended",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-003",
    name: "ภก. มานะ อดทน",
    license: "ภ.34567",
    program: "การคุ้มครองผู้บริโภค",
    date: "22 มิ.ย. 2569",
    institutionId: ORGANISATIONS.chula.id,
    applicationType: "exam",
    status: "approved",
    documents: createMockSubmittedDocuments({ accepted: true }),
    documentStatus: "complete",
    decisionNote: "เอกสารและคุณสมบัติครบถ้วนตามเกณฑ์",
    reviewedAt: "2026-08-12T04:15:00.000Z",
    reviewedBy: "ภญ. อรอนงค์ วัฒนกิจ",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-004",
    name: "ภก. ธนา วรเวช",
    license: "ภ.45678",
    program: "เภสัชบำบัด",
    date: "21 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "study",
    status: "pending",
    documents: createAdmissionDocuments(),
    documentStatus: "complete",
    licenseStatus: "revoked",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-005",
    name: "ภญ. กานดา ศรีสุข",
    license: "ภ.56789",
    program: "เภสัชอุตสาหการ",
    date: "20 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "exam",
    status: "pending",
    documents: createMockSubmittedDocuments(),
    documentStatus: "pending",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-006",
    name: "ภก. นที พิพัฒน์",
    license: "ภ.67890",
    program: "การบริบาลทางเภสัชกรรม",
    date: "19 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "study",
    status: "approved",
    documents: createMockSubmittedDocuments({ accepted: true }),
    documentStatus: "complete",
    decisionNote: "เอกสารและคุณสมบัติครบถ้วนตามเกณฑ์",
    reviewedAt: "2026-08-12T03:20:00.000Z",
    reviewedBy: "ภก. วิชาญ อัครเวช",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-007",
    name: "ภญ. สายฝน สกุลไทย",
    license: "ภ.78901",
    program: "เภสัชกรรมชุมชน",
    date: "18 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "exam",
    status: "pending",
    documents: createMockSubmittedDocuments({ missingId: "transcript" }),
    documentStatus: "incomplete",
    documentNote: "กรุณาแนบใบประมวลผลการศึกษาฉบับสมบูรณ์",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-008",
    name: "ภญ. พิมพ์ชนก แสงทอง",
    license: "ภ.89012",
    program: "เภสัชบำบัด",
    date: "17 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "study",
    status: "rejected",
    documents: createMockSubmittedDocuments({ accepted: true }),
    documentStatus: "complete",
    decisionNote: "คุณสมบัติด้านประสบการณ์ยังไม่ครบตามเกณฑ์ของหลักสูตร",
    reviewedAt: "2026-08-12T02:45:00.000Z",
    reviewedBy: "ภก. วิชาญ อัครเวช",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-009",
    name: "ภก. ณัฐวุฒิ คงมั่น",
    license: "ภ.90123",
    program: "การคุ้มครองผู้บริโภค",
    date: "16 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "exam",
    status: "approved",
    documents: createMockSubmittedDocuments({ accepted: true }),
    documentStatus: "complete",
    decisionNote: "ตรวจสอบเอกสารและใบอนุญาตแล้ว",
    reviewedAt: "2026-08-12T02:10:00.000Z",
    reviewedBy: "ภก. วิชาญ อัครเวช",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-010",
    name: "ภญ. อรอนงค์ สุขใจ",
    license: "ภ.11223",
    program: "เภสัชกรรมปฐมภูมิ",
    date: "15 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "study",
    status: "pending",
    documents: createMockSubmittedDocuments(),
    documentStatus: "pending",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-011",
    name: "ภก. ชยพล วัฒนะ",
    license: "ภ.22334",
    program: "เภสัชอุตสาหการ",
    date: "14 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "exam",
    status: "rejected",
    documents: createMockSubmittedDocuments({ accepted: true }),
    documentStatus: "complete",
    decisionNote: "จำนวนที่นั่งในรอบนี้เต็มแล้ว",
    reviewedAt: "2026-08-12T01:35:00.000Z",
    reviewedBy: "ภก. วิชาญ อัครเวช",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-012",
    name: "ภญ. พรทิพย์ เรืองรอง",
    license: "ภ.33445",
    program: "เภสัชกรรมชุมชน",
    date: "13 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "study",
    status: "pending",
    documents: createMockSubmittedDocuments({ missingId: "degree" }),
    documentStatus: "incomplete",
    documentNote: "กรุณาแนบสำเนาใบปริญญาบัตรหรือหนังสือรับรองการศึกษา",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-013",
    name: "ภก. เอกชัย บุญส่ง",
    license: "ภ.44556",
    program: "เภสัชบำบัด",
    date: "12 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "exam",
    status: "approved",
    documents: createMockSubmittedDocuments({ accepted: true }),
    documentStatus: "complete",
    decisionNote: "คุณสมบัติครบถ้วนและผ่านการตรวจเอกสาร",
    reviewedAt: "2026-08-12T01:00:00.000Z",
    reviewedBy: "ภก. วิชาญ อัครเวช",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-014",
    name: "ภญ. ธัญญารัตน์ มณีวงศ์",
    license: "ภ.55667",
    program: "การบริบาลทางเภสัชกรรม",
    date: "11 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "study",
    status: "pending",
    documents: createMockSubmittedDocuments(),
    documentStatus: "pending",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-015",
    name: "ภก. วรพล ตั้งมั่น",
    license: "ภ.66778",
    program: "การคุ้มครองผู้บริโภค",
    date: "10 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "exam",
    status: "pending",
    documents: createMockSubmittedDocuments(),
    documentStatus: "pending",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
  {
    id: "APP-2026-016",
    name: "ภญ. นภัสสร สุขสวัสดิ์",
    license: "ภ.77889",
    program: "เภสัชกรรมปฐมภูมิ",
    date: "9 มิ.ย. 2569",
    institutionId: ORGANISATIONS.siriraj.id,
    applicationType: "study",
    status: "approved",
    documents: createMockSubmittedDocuments({ accepted: true }),
    documentStatus: "complete",
    decisionNote: "เอกสารครบถ้วนตามประกาศรับสมัคร",
    reviewedAt: "2026-08-12T00:25:00.000Z",
    reviewedBy: "ภก. วิชาญ อัครเวช",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
  },
];

function normalizeAdmissions(value: unknown): Admission[] {
  const storedAdmissions = Array.isArray(value) ? value : [];
  const normalizedAdmissions: Admission[] = [];
  const storedIds = new Set<string>();

  storedAdmissions.forEach((storedAdmission) => {
    const admission = normalizeAdmission(storedAdmission);
    if (!admission || storedIds.has(admission.id)) return;
    normalizedAdmissions.push(admission);
    storedIds.add(admission.id);
  });

  return [
    ...normalizedAdmissions,
    ...defaultAdmissions.filter((admission) => !storedIds.has(admission.id)),
  ];
}

const KARINA_STUDENT_ID = "RPC-2569-001";
const KARINA_FORMAL_NAME = "ภญ. คารินา วัฒนกุล";

const defaultPayments: Payment[] = [
  { id: "PAY-2569-001", studentId: KARINA_STUDENT_ID, name: KARINA_FORMAL_NAME, program: "เภสัชบำบัด", amount: 25000, date: "24 มิ.ย. 2569", status: "pending", type: "ค่าลงทะเบียนเรียน" },
  { id: "PAY-2569-002", studentId: "RPC-2569-002", name: "ภก. สมชาย ใจดี", program: "เภสัชบำบัด", amount: 25000, date: "23 มิ.ย. 2569", status: "pending", type: "ค่าลงทะเบียนเรียน" },
];

const defaultPrograms: Program[] = [
  { id: "PRG-01", name: "วิทยาลัยเภสัชกรรมบำบัด", studentsCount: 450, status: "active", lastUpdated: "12 มิ.ย. 2569" },
  { id: "PRG-02", name: "วิทยาลัยเภสัชกรรมชุมชน", studentsCount: 320, status: "active", lastUpdated: "10 มิ.ย. 2569" },
];

const defaultCourseRequests: CourseRequest[] = [
  { id: "CRQ-001", collegeName: "วิทยาลัยเภสัชกรรมบำบัด", courseCode: "BCP-501", courseTitle: "การบริบาลทางเภสัชกรรมผู้ป่วยวิกฤต", type: "วุฒิบัตรเฉพาะทาง", duration: "16 สัปดาห์", capacity: 30, status: "pending", submittedAt: "24 มิ.ย. 2569" },
  { id: "CRQ-002", collegeName: "วิทยาลัยการคุ้มครองผู้บริโภค", legacyCourseCode: "CPA-102", courseTitle: "กฎหมายและจริยธรรมวิชาชีพขั้นสูง", type: "ประกาศนียบัตรระยะสั้น", kind: "short_course", classification: "general", duration: "3 เดือน", capacity: 50, status: "approved", submittedAt: "20 มิ.ย. 2569" },
];

const memberName = `${currentMemberPassport.identity.titleTh}${currentMemberPassport.identity.firstNameTh} ${currentMemberPassport.identity.lastNameTh}`;

function defaultOfferingFor(courseCode: string, studentId?: string) {
  const institutionId = DEFAULT_STUDENT_AFFILIATIONS.find((affiliation) => (
    affiliation.studentId === studentId && affiliation.status === "active"
  ))?.institutionId;
  return DEFAULT_COURSE_OFFERINGS.find((offering) => (
    offering.courseCode === courseCode && offering.institutionId === institutionId
  )) ?? DEFAULT_COURSE_OFFERINGS.find((offering) => offering.courseCode === courseCode);
}

function defaultEligibilityForStudent(studentId: string, at: string): RegistrationEligibilitySnapshot {
  const licenseNumber = DEFAULT_ACADEMIC_STUDENTS.find((student) => student.id === studentId)?.licenseNumber ??
    (studentId === currentMemberPassport.memberId ? currentMemberPassport.license.licenseNumber : "");
  const registryRecord = findLicenseRegistryRecord(licenseNumber);
  const status = registryRecord?.status ?? "unverified";
  const eligibility = getLicenseEligibility(status);
  return {
    status,
    decision: eligibility.decision,
    checkedAt: registryRecord?.checkedAt ?? at,
    evidenceReference: `license-registry:${licenseNumber || "unknown"}:${registryRecord?.checkedAt ?? at}`,
  };
}

function createAcademicRegistration(
  input: Omit<RegistrationSelectionInput, "id" | "courseOfferingId" | "institutionId" | "eligibility"> & { id: string },
  at: string,
) {
  const offering = defaultOfferingFor(input.courseCode, input.studentId);
  return createEligibilityCheckedRegistration({
    ...input,
    courseOfferingId: offering?.id,
    institutionId: offering?.institutionId,
  }, defaultEligibilityForStudent(input.studentId, at), at);
}

function approveAndAwaitPayment(
  registration: Registration,
  actor: RegistrationActionActor,
  at: string,
) {
  return markRegistrationAwaitingPayment(
    recordTeacherRegistrationDecision(registration, "approved", actor, {
      at,
      reason: "ตรวจคุณสมบัติและข้อมูลรายวิชาครบถ้วน",
    }),
    at,
  );
}

const teacherOneRegistrationActor: RegistrationActionActor = {
  userId: "teacher-001",
  userName: "อ. ภก. กิตติพงศ์ วัฒนเภสัช",
  role: "teacher",
  organisationId: "org-inst-siriraj",
};

const teacherTwoRegistrationActor: RegistrationActionActor = {
  userId: "teacher-002",
  userName: "อ. ภญ. ชนิดา ศรีสุข",
  role: "teacher",
  organisationId: "org-inst-chula",
};

const seededPendingRegistrations = [
  createAcademicRegistration({
    id: "REG-001",
    studentId: KARINA_STUDENT_ID,
    studentName: KARINA_FORMAL_NAME,
    courseId: "C1",
    courseCode: "BCP-101",
    courseTitle: "เภสัชบำบัดพื้นฐาน",
    credits: 3,
    term: "1/2569",
  }, "2026-06-24T03:00:00.000Z"),
  createAcademicRegistration({
    id: "REG-MEMBER-002",
    studentId: currentMemberPassport.memberId,
    studentName: memberName,
    courseId: "วภท-302",
    courseCode: "วภท-302",
    courseTitle: "การสอบปากเปล่าข้างเตียงผู้ป่วย (Bedside Examination)",
    credits: 12,
    term: "1/2569",
  }, "2026-06-24T03:30:00.000Z"),
];

const seededEnrolledMemberRegistration = markRegistrationEnrolled(approveAndAwaitPayment(
  createAcademicRegistration({
    id: "REG-MEMBER-001",
    studentId: currentMemberPassport.memberId,
    studentName: memberName,
    courseId: "วภท-301",
    courseCode: "วภท-301",
    courseTitle: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง (สอบข้อเขียน)",
    credits: 12,
    term: "1/2569",
  }, "2026-06-14T03:00:00.000Z"),
  teacherOneRegistrationActor,
  "2026-06-15T03:00:00.000Z",
), "2026-06-16T03:00:00.000Z");

const seededSirirajResultEnrollments = [
  {
    id: "REG-SIRIRAJ-005",
    studentId: "RPC-2569-005",
    studentName: "ภญ. พิมพ์ชนก แสงทอง",
    courseId: "BCP-101",
    courseCode: "BCP-101",
    courseTitle: "เภสัชบำบัดพื้นฐาน",
    credits: 3,
  },
  {
    id: "REG-SIRIRAJ-006",
    studentId: "RPC-2569-006",
    studentName: "ภก. ณัฐวุฒิ คงมั่น",
    courseId: "BCP-101",
    courseCode: "BCP-101",
    courseTitle: "เภสัชบำบัดพื้นฐาน",
    credits: 3,
  },
  {
    id: "REG-SIRIRAJ-007",
    studentId: "RPC-2569-007",
    studentName: "ภญ. อรอนงค์ สุขใจ",
    courseId: "วภท-301",
    courseCode: "วภท-301",
    courseTitle: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง (สอบข้อเขียน)",
    credits: 12,
  },
  {
    id: "REG-SIRIRAJ-008",
    studentId: "RPC-2569-008",
    studentName: "ภก. ชยพล วัฒนะ",
    courseId: "วภท-301",
    courseCode: "วภท-301",
    courseTitle: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง (สอบข้อเขียน)",
    credits: 12,
  },
].map((student, index) => markRegistrationEnrolled(approveAndAwaitPayment(
  createAcademicRegistration({
    ...student,
    term: "1/2569",
  }, `2026-06-${String(10 + index).padStart(2, "0")}T03:00:00.000Z`),
  teacherOneRegistrationActor,
  `2026-06-${String(11 + index).padStart(2, "0")}T03:00:00.000Z`,
), `2026-06-${String(12 + index).padStart(2, "0")}T03:00:00.000Z`));

const seededChulaEnrollments = [
  {
    id: "REG-CHULA-003",
    studentId: "RPC-2569-003",
    studentName: "ภก. นที พิพัฒน์",
  },
  {
    id: "REG-CHULA-004",
    studentId: "RPC-2569-004",
    studentName: "ภญ. สายฝน สกุลไทย",
  },
].map((student, index) => markRegistrationEnrolled(approveAndAwaitPayment(
  createAcademicRegistration({
    ...student,
    courseId: "วภท-302",
    courseCode: "วภท-302",
    courseTitle: "การสอบปากเปล่าข้างเตียงผู้ป่วย (Bedside Examination)",
    credits: 12,
    term: "1/2569",
  }, `2026-06-${String(17 + index).padStart(2, "0")}T03:00:00.000Z`),
  teacherTwoRegistrationActor,
  `2026-06-${String(19 + index).padStart(2, "0")}T03:00:00.000Z`,
), `2026-06-${String(21 + index).padStart(2, "0")}T03:00:00.000Z`));

const defaultRegistrations: Registration[] = [
  seededEnrolledMemberRegistration,
  ...seededSirirajResultEnrollments,
  ...seededChulaEnrollments,
  ...seededPendingRegistrations,
];

const defaultRegistrationInvoices: RegistrationInvoice[] = defaultRegistrations.map((registration) => {
  const locked = createLockedRegistrationInvoice({
    registrationId: registration.id,
    studentId: registration.studentId,
    courseCode: registration.courseCode,
    courseTitle: registration.courseTitle,
    credits: registration.credits,
    at: registration.submittedAt,
  });

  if (registration.status === "enrolled") {
    return payRegistrationInvoice(unlockRegistrationInvoice(locked, registration.updatedAt), registration.updatedAt);
  }
  return registration.status === "approved" || registration.status === "awaiting_payment"
    ? unlockRegistrationInvoice(locked, registration.updatedAt)
    : locked;
});

function isoOrNow(value: unknown, fallback = new Date().toISOString()): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function normalizeRegistrationHistory(
  value: unknown,
  registrationId: string,
  status: RegistrationStatus,
  at: string,
): RegistrationHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [{
      id: `${registrationId}-migration-1`,
      to: status,
      actor: "migration",
      at,
      reason: "ย้ายข้อมูลจากรูปแบบ localStorage เดิม",
    }];
  }

  const history = value.flatMap((entry, index): RegistrationHistoryEntry[] => {
    if (!entry || typeof entry !== "object") return [];
    const stored = entry as Record<string, unknown>;
    if (!isRegistrationStatus(stored.to)) return [];
    const actor = stored.actor === "member" || stored.actor === "student" ||
      stored.actor === "teacher" || stored.actor === "registrar" ||
      stored.actor === "royal_college_staff" || stored.actor === "system" ||
      stored.actor === "migration"
      ? stored.actor
      : "migration";

    return [{
      id: isNonEmptyString(stored.id) ? stored.id : `${registrationId}-migration-${index + 1}`,
      ...(isRegistrationStatus(stored.from) ? { from: stored.from } : {}),
      to: stored.to,
      actor,
      at: isoOrNow(stored.at, at),
      ...(isNonEmptyString(stored.reason) ? { reason: stored.reason } : {}),
      ...(isNonEmptyString(stored.actorUserId) ? { actorUserId: stored.actorUserId } : {}),
      ...(isNonEmptyString(stored.actorName) ? { actorName: stored.actorName } : {}),
      ...(isSystemRole(stored.actorRole) ? { actorRole: stored.actorRole } : {}),
      ...(isNonEmptyString(stored.organisationId) ? { organisationId: stored.organisationId } : {}),
      ...(isNonEmptyString(stored.evidenceReference)
        ? { evidenceReference: stored.evidenceReference }
        : {}),
    }];
  });

  return history.length > 0 ? history : [{
    id: `${registrationId}-migration-1`,
    to: status,
    actor: "migration",
    at,
    reason: "ซ่อมประวัติสถานะจาก localStorage เดิม",
  }];
}

function normalizeRegistration(value: unknown): Registration | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Record<string, unknown>;
  const requiredStrings = [
    stored.id,
    stored.studentId,
    stored.studentName,
    stored.courseCode,
    stored.courseTitle,
    stored.term,
  ];
  if (!requiredStrings.every(isNonEmptyString)) return null;

  const storedStatus: RegistrationStatus = isRegistrationStatus(stored.status)
    ? stored.status
    : stored.status === "approved" || stored.status === "rejected"
      ? stored.status
      : "pending";
  const updatedAt = isoOrNow(stored.updatedAt);
  const submittedAt = isoOrNow(stored.submittedAt, updatedAt);
  const id = String(stored.id);
  const studentId = String(stored.studentId);
  const offering = defaultOfferingFor(String(stored.courseCode), studentId);
  const storedEligibility = stored.eligibility && typeof stored.eligibility === "object"
    ? stored.eligibility as Record<string, unknown>
    : null;
  const eligibility = storedEligibility && (
    isLicenseStatus(storedEligibility.status) || storedEligibility.status === "unverified"
  )
    ? {
        status: storedEligibility.status as RegistrationEligibilitySnapshot["status"],
        decision: storedEligibility.decision === "eligible" ||
          storedEligibility.decision === "eligible_with_warning" ||
          storedEligibility.decision === "manual_review" ||
          storedEligibility.decision === "ineligible"
          ? storedEligibility.decision
          : getLicenseEligibility(storedEligibility.status as RegistrationEligibilitySnapshot["status"]).decision,
        checkedAt: isoOrNow(storedEligibility.checkedAt, submittedAt),
        evidenceReference: isNonEmptyString(storedEligibility.evidenceReference)
          ? storedEligibility.evidenceReference
          : `migration:${id}:eligibility`,
      } satisfies RegistrationEligibilitySnapshot
    : defaultEligibilityForStudent(studentId, submittedAt);
  const storedTeacherDecision = stored.teacherDecision && typeof stored.teacherDecision === "object"
    ? stored.teacherDecision as Record<string, unknown>
    : null;
  const teacherDecision = storedTeacherDecision &&
    (storedTeacherDecision.decision === "approved" ||
      storedTeacherDecision.decision === "needs_info" ||
      storedTeacherDecision.decision === "rejected") &&
    isNonEmptyString(storedTeacherDecision.teacherId) &&
    isNonEmptyString(storedTeacherDecision.teacherName)
    ? {
        decision: storedTeacherDecision.decision as RegistrationTeacherDecision["decision"],
        teacherId: storedTeacherDecision.teacherId,
        teacherName: storedTeacherDecision.teacherName,
        decidedAt: isoOrNow(storedTeacherDecision.decidedAt, updatedAt),
        ...(isNonEmptyString(storedTeacherDecision.reason)
          ? { reason: storedTeacherDecision.reason }
          : {}),
        ...(isNonEmptyString(storedTeacherDecision.evidenceReference)
          ? { evidenceReference: storedTeacherDecision.evidenceReference }
          : {}),
      }
    : undefined;

  const normalized: Registration = {
    id,
    studentId,
    studentName: DEFAULT_ACADEMIC_STUDENTS.find((student) => student.id === studentId)?.name ??
      String(stored.studentName),
    courseId: isNonEmptyString(stored.courseId) ? stored.courseId : String(stored.courseCode),
    courseCode: String(stored.courseCode),
    courseTitle: String(stored.courseTitle),
    credits: typeof stored.credits === "number" && stored.credits > 0 ? stored.credits : 3,
    term: String(stored.term),
    status: storedStatus,
    submittedAt,
    updatedAt,
    reviewReason: isNonEmptyString(stored.reviewReason) ? stored.reviewReason : undefined,
    courseOfferingId: isNonEmptyString(stored.courseOfferingId)
      ? stored.courseOfferingId
      : offering?.id ?? (isNonEmptyString(stored.courseId) ? stored.courseId : String(stored.courseCode)),
    institutionId: isNonEmptyString(stored.institutionId)
      ? stored.institutionId
      : offering?.institutionId,
    eligibility,
    teacherDecision,
    history: normalizeRegistrationHistory(stored.history, id, storedStatus, updatedAt),
  };
  return storedStatus === "approved"
    ? markRegistrationAwaitingPayment(normalized, updatedAt)
    : normalized;
}

export function normalizeRegistrations(value: unknown): Registration[] {
  const stored = Array.isArray(value) ? value : [];
  const normalized = stored.map(normalizeRegistration).filter((item): item is Registration => Boolean(item));
  const ids = new Set(normalized.map((item) => item.id));
  return [...normalized, ...defaultRegistrations.filter((item) => !ids.has(item.id))];
}

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeAcademicRecords<T extends { id: string }>(
  value: unknown,
  defaults: readonly T[],
  validator: (item: unknown) => item is T,
) {
  const stored = Array.isArray(value) ? value.filter(validator).map(cloneRecord) : [];
  const ids = new Set(stored.map((item) => item.id));
  return [...stored, ...defaults.filter((item) => !ids.has(item.id)).map(cloneRecord)];
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isAcademicInstitutionRecord(value: unknown): value is AcademicInstitution {
  if (!isStringRecord(value)) return false;
  return isNonEmptyString(value.id) && isNonEmptyString(value.code) &&
    isNonEmptyString(value.name) && (value.kind === "hospital" || value.kind === "university");
}

function isAcademicStudentRecord(value: unknown): value is AcademicStudent {
  if (!isStringRecord(value)) return false;
  return isNonEmptyString(value.id) && isNonEmptyString(value.name) && isNonEmptyString(value.licenseNumber);
}

function normalizeAcademicStudents(value: unknown) {
  return mergeAcademicRecords(
    value,
    DEFAULT_ACADEMIC_STUDENTS,
    isAcademicStudentRecord,
  ).map((student) => {
    const canonical = DEFAULT_ACADEMIC_STUDENTS.find((item) => item.id === student.id);
    return canonical ? { ...student, name: canonical.name } : student;
  });
}

function isAcademicTeacherRecord(value: unknown): value is AcademicTeacher {
  if (!isStringRecord(value)) return false;
  return isNonEmptyString(value.id) && isNonEmptyString(value.name);
}

function isAcademicAffiliationRecord(value: unknown, subjectKey: "studentId" | "teacherId") {
  if (!isStringRecord(value)) return false;
  return isNonEmptyString(value.id) && isNonEmptyString(value[subjectKey]) &&
    isNonEmptyString(value.institutionId) && isNonEmptyString(value.startsAt) &&
    (value.endsAt === undefined || isNonEmptyString(value.endsAt)) &&
    (value.status === "active" || value.status === "inactive");
}

function isStudentAffiliationRecord(value: unknown): value is StudentAffiliation {
  return isAcademicAffiliationRecord(value, "studentId");
}

function isTeacherAffiliationRecord(value: unknown): value is TeacherAffiliation {
  return isAcademicAffiliationRecord(value, "teacherId");
}

function normalizeCourseOfferingRecord(value: unknown): CourseOffering | null {
  if (!isStringRecord(value) || !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.courseCode) || !isNonEmptyString(value.courseTitle) ||
    typeof value.credits !== "number" || !Number.isFinite(value.credits) ||
    !isNonEmptyString(value.term) || !isNonEmptyString(value.institutionId) ||
    !isCollegeCode(value.collegeCode) ||
    (value.status !== "open" && value.status !== "closed")) return null;

  return {
    id: value.id,
    courseCode: value.courseCode,
    courseTitle: value.courseTitle,
    credits: value.credits,
    term: value.term,
    institutionId: value.institutionId,
    collegeCode: value.collegeCode,
    status: value.status,
  };
}

export function normalizeCourseOfferings(value: unknown) {
  const stored = Array.isArray(value)
    ? value.map(normalizeCourseOfferingRecord).filter((item): item is CourseOffering => Boolean(item))
    : [];
  const ids = new Set(stored.map((item) => item.id));
  return [
    ...stored,
    ...DEFAULT_COURSE_OFFERINGS.filter((item) => !ids.has(item.id)).map(cloneRecord),
  ];
}

function isTeachingAssignmentStatus(value: unknown): value is TeachingAssignment["status"] {
  return value === "pending_teacher_response" || value === "accepted" ||
    value === "declined" || value === "cancelled";
}

function isTeachingAssignmentPatchRecord(value: unknown) {
  if (!isStringRecord(value)) return false;
  return isNonEmptyString(value.teacherId) && isNonEmptyString(value.courseOfferingId) &&
    isNonEmptyString(value.startsAt) &&
    (value.endsAt === undefined || isNonEmptyString(value.endsAt));
}

function normalizeTeachingAssignmentRecord(value: unknown): TeachingAssignment | null {
  if (!isStringRecord(value)) return null;
  const validBase = isNonEmptyString(value.id) && isNonEmptyString(value.teacherId) &&
    isNonEmptyString(value.courseOfferingId) && isNonEmptyString(value.institutionId) &&
    isNonEmptyString(value.startsAt) && (value.endsAt === undefined || isNonEmptyString(value.endsAt)) &&
    isNonEmptyString(value.assignedBy) && isNonEmptyString(value.assignedAt);
  if (!validBase) return null;
  const status = value.status === undefined
    ? "accepted"
    : isTeachingAssignmentStatus(value.status)
      ? value.status
      : null;
  if (status === null) return null;
  const pendingChanges = value.pendingChanges === undefined
    ? undefined
    : isTeachingAssignmentPatchRecord(value.pendingChanges)
      ? cloneRecord(value.pendingChanges) as TeachingAssignment["pendingChanges"]
      : null;
  if (pendingChanges === null) return null;
  const latestDecision = value.latestDecision;
  const validDecision = latestDecision === undefined || (
    isStringRecord(latestDecision) &&
    (latestDecision.decision === "accepted" || latestDecision.decision === "declined") &&
    isAcademicActorRecord(latestDecision.actor) &&
    (latestDecision.reason === undefined || typeof latestDecision.reason === "string") &&
    isNonEmptyString(latestDecision.decidedAt)
  );
  if (!validDecision) return null;
  return {
    id: value.id as string,
    teacherId: value.teacherId as string,
    courseOfferingId: value.courseOfferingId as string,
    institutionId: value.institutionId as string,
    startsAt: value.startsAt as string,
    ...(isNonEmptyString(value.endsAt) ? { endsAt: value.endsAt } : {}),
    assignedBy: value.assignedBy as string,
    assignedAt: value.assignedAt as string,
    status,
    updatedAt: isNonEmptyString(value.updatedAt) ? value.updatedAt : value.assignedAt as string,
    ...(pendingChanges ? { pendingChanges } : {}),
    ...(latestDecision ? {
      latestDecision: cloneRecord(latestDecision) as unknown as TeachingAssignment["latestDecision"],
    } : {}),
  };
}

export function normalizeTeachingAssignments(value: unknown) {
  const raw = Array.isArray(value) ? value : [];
  const rawIds = new Set(raw.flatMap((item) => (
    isStringRecord(item) && isNonEmptyString(item.id) ? [item.id] : []
  )));
  const stored = raw
    .map(normalizeTeachingAssignmentRecord)
    .filter((item): item is TeachingAssignment => Boolean(item));
  const storedIds = new Set(stored.map((item) => item.id));
  return [
    ...stored,
    ...DEFAULT_TEACHING_ASSIGNMENTS
      .filter((item) => !storedIds.has(item.id) && !rawIds.has(item.id))
      .map(cloneRecord),
  ];
}

function isAcademicActorRecord(value: unknown): value is AcademicActor {
  if (!isStringRecord(value)) return false;
  return isNonEmptyString(value.userId) && isNonEmptyString(value.userName) &&
    isSystemRole(value.role) && isNonEmptyString(value.organisationId);
}

function isSubjectResultRecord(value: unknown): value is SubjectResult {
  if (!isStringRecord(value)) return false;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.studentId) ||
    !isNonEmptyString(value.courseOfferingId) || !isNonEmptyString(value.teacherId) ||
    !isNonEmptyString(value.updatedAt) || !Array.isArray(value.revisions) ||
    (value.status !== "pending" && value.status !== "draft" &&
      value.status !== "published" && value.status !== "revised")) return false;
  if (value.draftValue !== undefined && value.draftValue !== "S" && value.draftValue !== "U") return false;
  if (value.currentValue !== undefined && value.currentValue !== "S" && value.currentValue !== "U") return false;
  return value.revisions.every((revision) => (
    isStringRecord(revision) && isNonEmptyString(revision.id) &&
    (revision.previousValue === undefined || revision.previousValue === "S" || revision.previousValue === "U") &&
    (revision.newValue === "S" || revision.newValue === "U") &&
    (revision.reason === undefined || typeof revision.reason === "string") &&
    isAcademicActorRecord(revision.actor) && isNonEmptyString(revision.createdAt)
  ));
}

function isCourseProposalStatus(value: unknown): value is CourseProposal["status"] {
  return value === "submitted" || value === "needs_revision" ||
    value === "passed" || value === "rejected";
}

function isCourseProposalActorRecord(value: unknown): value is CourseProposalActor {
  if (!isAcademicActorRecord(value)) return false;
  const resourceScopes = (value as AcademicActor & { resourceScopes?: unknown }).resourceScopes;
  return Array.isArray(resourceScopes) &&
    resourceScopes.every((scope: unknown) => typeof scope === "string");
}

function normalizeCourseOfferingEditablePatchRecord(
  value: unknown,
): CourseOfferingEditablePatch | null {
  if (!isStringRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => !["courseTitle", "credits", "term", "section"].includes(key))) {
    return null;
  }
  const normalized: CourseOfferingEditablePatch = {};
  if (value.courseTitle !== undefined) {
    if (!isNonEmptyString(value.courseTitle)) return null;
    normalized.courseTitle = value.courseTitle;
  }
  if (value.credits !== undefined) {
    if (typeof value.credits !== "number" || !Number.isFinite(value.credits) || value.credits <= 0) {
      return null;
    }
    normalized.credits = value.credits;
  }
  if (value.term !== undefined) {
    if (!isNonEmptyString(value.term)) return null;
    normalized.term = value.term;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

const LEGACY_SECTION_REQUEST_MIGRATION_REASON = "ระบบยุติคำขอเดิมเนื่องจากปรับโครงสร้างรายการเปิดสอน";

function isLegacySectionOnlyPatch(value: unknown) {
  return isStringRecord(value) && Object.keys(value).length > 0 &&
    Object.keys(value).every((key) => key === "section");
}

function isMigratedSectionRequest(value: Record<string, unknown>) {
  return isStringRecord(value.proposedChanges) && Object.keys(value.proposedChanges).length === 0 &&
    value.status === "rejected" && Array.isArray(value.history) &&
    value.history.some((entry: unknown) => isStringRecord(entry) && entry.reason === LEGACY_SECTION_REQUEST_MIGRATION_REASON);
}

function isCourseOfferingChangeStatus(value: unknown): value is CourseOfferingChangeRequest["status"] {
  return value === "pending_teacher_review" || value === "needs_revision" ||
    value === "approved" || value === "rejected";
}

function isCourseOfferingChangeHistoryRecord(
  value: unknown,
): value is CourseOfferingChangeRequest["history"][number] {
  if (!isStringRecord(value)) return false;
  return isNonEmptyString(value.id) &&
    (value.action === "submitted" || value.action === "resubmitted" || value.action === "reviewed") &&
    (value.fromStatus === undefined || isCourseOfferingChangeStatus(value.fromStatus)) &&
    isCourseOfferingChangeStatus(value.toStatus) && isCourseProposalActorRecord(value.actor) &&
    isNonEmptyString(value.occurredAt) && isNonEmptyString(value.reason);
}

function normalizeCourseOfferingChangeRequestRecord(
  value: unknown,
): CourseOfferingChangeRequest | null {
  if (!isStringRecord(value)) return null;
  const legacySectionOnly = isLegacySectionOnlyPatch(value.proposedChanges);
  const migratedSectionRequest = isMigratedSectionRequest(value);
  const proposedChanges = normalizeCourseOfferingEditablePatchRecord(value.proposedChanges)
    ?? ((legacySectionOnly || migratedSectionRequest) ? {} : null);
  const latestReview = value.latestReview;
  const validReview = latestReview === undefined || (
    isStringRecord(latestReview) &&
    (latestReview.decision === "needs_revision" || latestReview.decision === "approved" || latestReview.decision === "rejected") &&
    isNonEmptyString(latestReview.reason) && isCourseProposalActorRecord(latestReview.actor) &&
    isNonEmptyString(latestReview.reviewedAt)
  );
  if (!proposedChanges || !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.courseOfferingId) || !isNonEmptyString(value.institutionId) ||
    !isNonEmptyString(value.reviewerTeacherId) || !isNonEmptyString(value.reason) ||
    !isCourseOfferingChangeStatus(value.status) || !isCourseProposalActorRecord(value.requestedBy) ||
    !isNonEmptyString(value.requestedAt) || !isNonEmptyString(value.updatedAt) || !validReview ||
    !Array.isArray(value.history) || value.history.length === 0 ||
    !value.history.every(isCourseOfferingChangeHistoryRecord)) return null;

  const normalized = {
    id: value.id,
    courseOfferingId: value.courseOfferingId,
    institutionId: value.institutionId,
    reviewerTeacherId: value.reviewerTeacherId,
    proposedChanges,
    reason: value.reason,
    status: value.status,
    requestedBy: cloneRecord(value.requestedBy),
    requestedAt: value.requestedAt,
    updatedAt: value.updatedAt,
    ...(latestReview === undefined ? {} : {
      latestReview: cloneRecord(latestReview) as unknown as NonNullable<CourseOfferingChangeRequest["latestReview"]>,
    }),
    history: cloneRecord(value.history) as CourseOfferingChangeRequest["history"],
  };
  if (!legacySectionOnly) return normalized;

  const actor = cloneRecord(value.requestedBy) as CourseOfferingChangeRequest["requestedBy"];
  const migrationHistory: CourseOfferingChangeRequest["history"][number] = {
    id: `${value.id}-section-removed`,
    action: "reviewed",
    ...(value.status === "rejected" ? {} : { fromStatus: value.status }),
    toStatus: "rejected",
    actor,
    occurredAt: value.updatedAt,
    reason: LEGACY_SECTION_REQUEST_MIGRATION_REASON,
  };
  return {
    ...normalized,
    proposedChanges: {},
    status: "rejected",
    updatedAt: value.updatedAt,
    latestReview: {
      decision: "rejected",
      reason: LEGACY_SECTION_REQUEST_MIGRATION_REASON,
      actor,
      reviewedAt: value.updatedAt,
    },
    history: [...normalized.history, migrationHistory],
  };
}

export function normalizeCourseOfferingChangeRequests(value: unknown) {
  const raw = Array.isArray(value) ? value : [];
  const rawIds = new Set(raw.flatMap((item) => (
    isStringRecord(item) && isNonEmptyString(item.id) ? [item.id] : []
  )));
  const stored = raw
    .map(normalizeCourseOfferingChangeRequestRecord)
    .filter((item): item is CourseOfferingChangeRequest => Boolean(item));
  const storedIds = new Set(stored.map((item) => item.id));
  return [
    ...stored,
    ...DEFAULT_COURSE_OFFERING_CHANGE_REQUESTS
      .filter((item) => !storedIds.has(item.id) && !rawIds.has(item.id))
      .map(cloneRecord),
  ];
}

function isCourseProposalHistoryRecord(
  value: unknown,
): value is CourseProposal["history"][number] {
  if (!isStringRecord(value)) return false;
  return isNonEmptyString(value.id) &&
    (value.action === "submitted" || value.action === "resubmitted" || value.action === "reviewed") &&
    (value.fromStatus === undefined || isCourseProposalStatus(value.fromStatus)) &&
    isCourseProposalStatus(value.toStatus) &&
    isCourseProposalActorRecord(value.actor) &&
    isNonEmptyString(value.occurredAt) && Number.isFinite(Date.parse(value.occurredAt)) &&
    isNonEmptyString(value.reason) &&
    (value.evidenceReference === undefined || typeof value.evidenceReference === "string");
}

function isCourseProposalRecord(value: unknown): value is CourseProposal {
  if (!isStringRecord(value)) return false;
  const latestReview = value.latestReview;
  const hasValidReview = latestReview === undefined || (
    isStringRecord(latestReview) && latestReview.decision !== "submitted" &&
    isCourseProposalStatus(latestReview.decision) && isNonEmptyString(latestReview.note) &&
    isCourseProposalActorRecord(latestReview.actor) &&
    isNonEmptyString(latestReview.reviewedAt) && Number.isFinite(Date.parse(latestReview.reviewedAt)) &&
    (latestReview.evidenceReference === undefined || typeof latestReview.evidenceReference === "string")
  );
  return isNonEmptyString(value.id) && isNonEmptyString(value.proposerId) &&
    isNonEmptyString(value.proposerName) && isNonEmptyString(value.institutionId) &&
    isNonEmptyString(value.courseCode) && isNonEmptyString(value.courseTitle) &&
    typeof value.credits === "number" && Number.isFinite(value.credits) && value.credits > 0 &&
    isNonEmptyString(value.rationale) && isCourseProposalStatus(value.status) &&
    isNonEmptyString(value.submittedAt) && Number.isFinite(Date.parse(value.submittedAt)) &&
    isNonEmptyString(value.updatedAt) && Number.isFinite(Date.parse(value.updatedAt)) &&
    hasValidReview && Array.isArray(value.history) && value.history.length > 0 &&
    value.history.every(isCourseProposalHistoryRecord);
}

export function normalizeCourseProposals(value: unknown) {
  return mergeAcademicRecords(value, DEFAULT_COURSE_PROPOSALS, isCourseProposalRecord);
}

export function normalizeSubjectResults(value: unknown) {
  return mergeAcademicRecords(value, DEFAULT_SUBJECT_RESULTS, isSubjectResultRecord);
}

function organisationForActor(actor: AcademicActor): OrganisationScope {
  const organisation = ORGANISATION_LIST.find((item) => item.id === actor.organisationId);
  if (!organisation) throw new Error(`Unknown academic organisation ${actor.organisationId}`);
  return organisation;
}

function hasTeacherCourseMutationScope(
  actor: ScopedAcademicActor,
  courseOfferingId: string,
) {
  return actor.resourceScopes.includes("course:assigned") ||
    hasResourceScope(actor.resourceScopes, `course:${courseOfferingId}`);
}

function assertInstitutionAdminMutationScope(
  actor: ScopedAcademicActor,
  institutionId: string,
) {
  const organisation = organisationForActor(actor);
  if (
    actor.role !== "institution_admin" ||
    organisation.kind !== "institution" ||
    actor.organisationId !== institutionId ||
    !hasResourceScope(actor.resourceScopes, `institution:${institutionId}`)
  ) {
    throw new Error("บัญชีนี้ไม่มีสิทธิ์จัดการข้อมูลของสถาบันดังกล่าว");
  }
}

function assignmentWindows(assignment: TeachingAssignment): TeachingAssignmentPatch[] {
  const current: TeachingAssignmentPatch = {
    teacherId: assignment.teacherId,
    courseOfferingId: assignment.courseOfferingId,
    startsAt: assignment.startsAt,
    ...(assignment.endsAt ? { endsAt: assignment.endsAt } : {}),
  };
  return assignment.status === "accepted" && assignment.pendingChanges
    ? [current, assignment.pendingChanges]
    : [current];
}

function assignmentWindowsOverlap(
  left: Pick<TeachingAssignmentPatch, "startsAt" | "endsAt">,
  right: Pick<TeachingAssignmentPatch, "startsAt" | "endsAt">,
) {
  const leftStart = new Date(left.startsAt).getTime();
  const rightStart = new Date(right.startsAt).getTime();
  const leftEnd = left.endsAt ? new Date(left.endsAt).getTime() : Number.POSITIVE_INFINITY;
  const rightEnd = right.endsAt ? new Date(right.endsAt).getTime() : Number.POSITIVE_INFINITY;
  return leftStart < rightEnd && rightStart < leftEnd;
}

function assignmentConflictsWithPatch(
  assignment: TeachingAssignment,
  patch: TeachingAssignmentPatch,
) {
  if (assignment.status !== "pending_teacher_response" && assignment.status !== "accepted") {
    return false;
  }
  return assignmentWindows(assignment).some((window) => (
    window.teacherId === patch.teacherId &&
    window.courseOfferingId === patch.courseOfferingId &&
    assignmentWindowsOverlap(window, patch)
  ));
}

function assignmentBlocksAffiliationEnd(
  assignment: TeachingAssignment,
  teacherId: string,
  at: Date,
) {
  if (assignment.status !== "pending_teacher_response" && assignment.status !== "accepted") {
    return false;
  }
  return assignmentWindows(assignment).some((window) => (
    window.teacherId === teacherId &&
    (!window.endsAt || new Date(window.endsAt).getTime() > at.getTime())
  ));
}

function affiliationCoversAssignment(
  affiliation: TeacherAffiliation,
  assignment: TeachingAssignmentPatch,
) {
  if (affiliation.status !== "active") return false;
  const affiliationStart = new Date(affiliation.startsAt).getTime();
  const affiliationEnd = affiliation.endsAt
    ? new Date(affiliation.endsAt).getTime()
    : Number.POSITIVE_INFINITY;
  const assignmentStart = new Date(assignment.startsAt).getTime();
  const assignmentEnd = assignment.endsAt
    ? new Date(assignment.endsAt).getTime()
    : Number.POSITIVE_INFINITY;
  return Number.isFinite(affiliationStart) && Number.isFinite(assignmentStart) &&
    assignmentStart >= affiliationStart && assignmentEnd <= affiliationEnd;
}

function appendAcademicAudit(input: {
  actor: AcademicActor;
  resourceScopes: readonly string[];
  action: string;
  resourceType: string;
  resourceId: string;
  resourceLabel?: string;
  resourceOrganisationId?: string;
  before: unknown;
  after: unknown;
  reason?: string;
  evidenceReference?: string;
  occurredAt: string;
}) {
  return appendAuditEvent({
    actor: {
      userId: input.actor.userId,
      userName: input.actor.userName,
      role: input.actor.role,
      organisation: organisationForActor(input.actor),
      resourceScopes: [...input.resourceScopes],
    },
    action: input.action,
    resource: {
      type: input.resourceType,
      id: input.resourceId,
      ...(input.resourceLabel ? { label: input.resourceLabel } : {}),
      ...(input.resourceOrganisationId
        ? { organisationId: input.resourceOrganisationId }
        : {}),
    },
    before: input.before,
    after: input.after,
    reason: input.reason,
    evidenceReference: input.evidenceReference,
    occurredAt: input.occurredAt,
  });
}

function enrollPaidRegistration(registration: Registration, at: string) {
  if (registration.status === "enrolled") return registration;
  const awaiting = registration.status === "approved"
    ? markRegistrationAwaitingPayment(registration, at)
    : registration;
  return awaiting.status === "awaiting_payment"
    ? markRegistrationEnrolled(awaiting, at)
    : registration;
}

export function normalizeRegistrationInvoices(
  value: unknown,
  registrations: readonly Registration[],
): RegistrationInvoice[] {
  const lifecycleStatuses = new Set(["locked", "awaiting_payment", "paid", "cancelled"]);
  const stored = Array.isArray(value) ? value : [];
  const normalized = stored.flatMap((item): RegistrationInvoice[] => {
    if (!item || typeof item !== "object") return [];
    const invoice = item as Record<string, unknown>;
    if (
      !isNonEmptyString(invoice.id) ||
      !isNonEmptyString(invoice.registrationId) ||
      !isNonEmptyString(invoice.studentId) ||
      !isNonEmptyString(invoice.description) ||
      typeof invoice.baseAmount !== "number" ||
      !lifecycleStatuses.has(String(invoice.status))
    ) return [];

    const createdAt = isoOrNow(invoice.createdAt);
    const status = String(invoice.status) as RegistrationInvoice["status"];
    return [{
      id: invoice.id,
      registrationId: invoice.registrationId,
      studentId: invoice.studentId,
      description: invoice.description,
      baseAmount: invoice.baseAmount,
      status,
      createdAt,
      updatedAt: isoOrNow(invoice.updatedAt, createdAt),
      dueAt: isNonEmptyString(invoice.dueAt) ? invoice.dueAt : undefined,
      paidAt: isNonEmptyString(invoice.paidAt) ? invoice.paidAt : undefined,
      cancelledAt: isNonEmptyString(invoice.cancelledAt) ? invoice.cancelledAt : undefined,
    }];
  });
  const byRegistrationId = new Map(normalized.map((invoice) => [invoice.registrationId, invoice]));
  const defaultsByRegistrationId = new Map(
    defaultRegistrationInvoices.map((invoice) => [invoice.registrationId, invoice]),
  );

  registrations.forEach((registration) => {
    const existing = byRegistrationId.get(registration.id);
    if (existing) {
      if ((registration.status === "approved" || registration.status === "awaiting_payment") && (
        existing.status === "locked" ||
        (existing.status === "awaiting_payment" && !existing.dueAt)
      )) {
        byRegistrationId.set(
          registration.id,
          unlockRegistrationInvoice(existing, registration.updatedAt),
        );
      } else if (registration.status === "enrolled" && existing.status !== "paid") {
        const payable = existing.status === "locked"
          ? unlockRegistrationInvoice(existing, registration.updatedAt)
          : existing;
        if (payable.status !== "cancelled") {
          byRegistrationId.set(registration.id, payRegistrationInvoice(payable, registration.updatedAt));
        }
      }
      return;
    }
    const seeded = defaultsByRegistrationId.get(registration.id);
    if (seeded) {
      byRegistrationId.set(registration.id, seeded);
      return;
    }

    const locked = createLockedRegistrationInvoice({
      registrationId: registration.id,
      studentId: registration.studentId,
      courseCode: registration.courseCode,
      courseTitle: registration.courseTitle,
      credits: registration.credits,
      at: registration.submittedAt,
    });
    if (registration.status === "enrolled") {
      byRegistrationId.set(
        registration.id,
        payRegistrationInvoice(unlockRegistrationInvoice(locked, registration.updatedAt), registration.updatedAt),
      );
    } else if (registration.status === "approved" || registration.status === "awaiting_payment") {
      byRegistrationId.set(registration.id, unlockRegistrationInvoice(locked, registration.updatedAt));
    } else if (registration.status === "rejected" || registration.status === "withdrawn") {
      byRegistrationId.set(registration.id, cancelRegistrationInvoice(locked, registration.updatedAt));
    } else {
      byRegistrationId.set(registration.id, locked);
    }
  });

  return [...byRegistrationId.values()];
}

const defaultExamRequests: ExamRequest[] = [
  { id: "EXM-001", studentId: "RPC-2566-045", studentName: "ภก. วิทยา ตั้งใจ", program: "เภสัชบำบัด", examType: "สอบประเมินความรู้ขั้นสุดท้าย (Board Exam)", logbookUrl: "logbook_vithaya.pdf", status: "pending", submittedAt: "24 มิ.ย. 2569", examDate: "15 ก.ค. 2569" },
  { id: "EXM-002", studentId: "RPC-2566-089", studentName: "ภญ. มาลี สวยดี", program: "เภสัชกรรมชุมชน", examType: "สอบประเมินความรู้ขั้นสุดท้าย (Board Exam)", logbookUrl: "logbook_malee.pdf", status: "approved", submittedAt: "20 มิ.ย. 2569", examDate: "15 ก.ค. 2569" },
];

const defaultCertificates: Certificate[] = [
  { id: "CERT-001", studentId: "RPC-2566-045", studentName: "ภก. วิทยา ตั้งใจ", program: "เภสัชบำบัด", issuedAt: "รอดำเนินการ", status: "pending_approval" },
];

const defaultSettings: Settings = {
  admissionOpen: true,
  registrationOpen: true,
  registrationOpensAt: "2026-08-24T09:00:00+07:00",
  registrationClosesAt: "2026-09-30T16:30:00+07:00",
};

const MockDbContext = createContext<MockDbContextType | undefined>(undefined);

export function MockDbProvider({ children }: { children: ReactNode }) {
  const auditLog = useAuditLog();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [researchSubmissions, setResearchSubmissions] = useState<ResearchSubmission[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courseRequests, setCourseRequests] = useState<CourseRequest[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationInvoices, setRegistrationInvoices] = useState<RegistrationInvoice[]>([]);
  const [academicInstitutions, setAcademicInstitutions] = useState<AcademicInstitution[]>([]);
  const [academicStudents, setAcademicStudents] = useState<AcademicStudent[]>([]);
  const [academicTeachers, setAcademicTeachers] = useState<AcademicTeacher[]>([]);
  const [studentAffiliations, setStudentAffiliations] = useState<StudentAffiliation[]>([]);
  const [teacherAffiliations, setTeacherAffiliations] = useState<TeacherAffiliation[]>([]);
  const [courseOfferings, setCourseOfferings] = useState<CourseOffering[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [courseOfferingChangeRequests, setCourseOfferingChangeRequests] = useState<CourseOfferingChangeRequest[]>([]);
  const [courseProposals, setCourseProposals] = useState<CourseProposal[]>([]);
  const [subjectResults, setSubjectResults] = useState<SubjectResult[]>([]);
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const s = (k: string) => localStorage.getItem(k);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (v: string | null, d: any) => {
      if (!v) return d;
      try {
        return JSON.parse(v);
      } catch {
        return d;
      }
    };

    const normalizedAdmissions = normalizeAdmissions(
      p(s("mock_admissions"), defaultAdmissions),
    );

    const parsedResearchSubmissions = p(
      s("mock_researchSubmissions"),
      defaultResearchSubmissions,
    );
    const normalizedRegistrations = normalizeRegistrations(
      p(s("mock_registrations"), defaultRegistrations),
    );
    const normalizedInvoices = normalizeRegistrationInvoices(
      p(s("mock_registration_invoices"), defaultRegistrationInvoices),
      normalizedRegistrations,
    );
    const normalizedAcademicInstitutions = mergeAcademicRecords(
      p(s("mock_academic_institutions"), DEFAULT_ACADEMIC_INSTITUTIONS),
      DEFAULT_ACADEMIC_INSTITUTIONS,
      isAcademicInstitutionRecord,
    );
    const normalizedAcademicStudents = normalizeAcademicStudents(
      p(s("mock_academic_students"), DEFAULT_ACADEMIC_STUDENTS),
    );
    const normalizedAcademicTeachers = mergeAcademicRecords(
      p(s("mock_academic_teachers"), DEFAULT_ACADEMIC_TEACHERS),
      DEFAULT_ACADEMIC_TEACHERS,
      isAcademicTeacherRecord,
    );
    const normalizedStudentAffiliations = mergeAcademicRecords(
      p(s("mock_student_affiliations"), DEFAULT_STUDENT_AFFILIATIONS),
      DEFAULT_STUDENT_AFFILIATIONS,
      isStudentAffiliationRecord,
    );
    const normalizedTeacherAffiliations = mergeAcademicRecords(
      p(s("mock_teacher_affiliations"), DEFAULT_TEACHER_AFFILIATIONS),
      DEFAULT_TEACHER_AFFILIATIONS,
      isTeacherAffiliationRecord,
    );
    const normalizedCourseOfferings = normalizeCourseOfferings(
      p(s("mock_course_offerings"), DEFAULT_COURSE_OFFERINGS),
    );
    const normalizedTeachingAssignments = normalizeTeachingAssignments(
      p(s("mock_teaching_assignments"), DEFAULT_TEACHING_ASSIGNMENTS),
    );
    const normalizedCourseOfferingChangeRequests = normalizeCourseOfferingChangeRequests(
      p(s("mock_course_offering_change_requests"), DEFAULT_COURSE_OFFERING_CHANGE_REQUESTS),
    );
    const normalizedCourseProposals = normalizeCourseProposals(
      p(s("mock_course_proposals"), DEFAULT_COURSE_PROPOSALS),
    );
    const normalizedSubjectResults = normalizeSubjectResults(
      p(s("mock_subject_results"), DEFAULT_SUBJECT_RESULTS),
    );
    const asArray = <T,>(value: unknown, fallback: T[]): T[] => (
      Array.isArray(value) ? value as T[] : fallback
    );

    /* eslint-disable react-hooks/set-state-in-effect */
    setAdmissions(normalizedAdmissions);
    setResearchSubmissions(normalizeResearchSubmissions(parsedResearchSubmissions));
    setPayments(asArray(p(s("mock_payments"), defaultPayments), defaultPayments).map((payment) => (
      payment.studentId === KARINA_STUDENT_ID
        ? { ...payment, studentId: KARINA_STUDENT_ID, name: KARINA_FORMAL_NAME }
        : payment
    )));
    setPrograms(asArray(p(s("mock_programs"), defaultPrograms), defaultPrograms));
    const storedCourseRequests = asArray(p(s("mock_courseRequests"), defaultCourseRequests), defaultCourseRequests);
    const migratedCourseRequests = storedCourseRequests.map((request) => {
      if (request.kind) return request;
      const isShortCourse = request.type.includes("ระยะสั้น");
      return {
        ...request,
        kind: isShortCourse ? "short_course" as const : "course" as const,
        classification: isShortCourse ? "general" as const : "required" as const,
        legacyCourseCode: isShortCourse ? request.courseCode : request.legacyCourseCode,
        courseCode: isShortCourse ? undefined : request.courseCode,
      };
    });
    setCourseRequests(migratedCourseRequests);
    setRegistrations(normalizedRegistrations);
    setRegistrationInvoices(normalizedInvoices);
    setAcademicInstitutions(normalizedAcademicInstitutions);
    setAcademicStudents(normalizedAcademicStudents);
    setAcademicTeachers(normalizedAcademicTeachers);
    setStudentAffiliations(normalizedStudentAffiliations);
    setTeacherAffiliations(normalizedTeacherAffiliations);
    setCourseOfferings(normalizedCourseOfferings);
    setTeachingAssignments(normalizedTeachingAssignments);
    setCourseOfferingChangeRequests(normalizedCourseOfferingChangeRequests);
    setCourseProposals(normalizedCourseProposals);
    setSubjectResults(normalizedSubjectResults);
    setExamRequests(asArray(p(s("mock_examRequests"), defaultExamRequests), defaultExamRequests));
    setCertificates(asArray(p(s("mock_certificates"), defaultCertificates), defaultCertificates));
    setSettings({ ...defaultSettings, ...p(s("mock_settings"), defaultSettings) });

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("mock_admissions", JSON.stringify(admissions));
    localStorage.setItem("mock_researchSubmissions", JSON.stringify(researchSubmissions));
    localStorage.setItem("mock_payments", JSON.stringify(payments));
    localStorage.setItem("mock_programs", JSON.stringify(programs));
    localStorage.setItem("mock_courseRequests", JSON.stringify(courseRequests));
    localStorage.setItem("mock_registrations", JSON.stringify(registrations));
    localStorage.setItem("mock_registration_invoices", JSON.stringify(registrationInvoices));
    localStorage.setItem("mock_academic_institutions", JSON.stringify(academicInstitutions));
    localStorage.setItem("mock_academic_students", JSON.stringify(academicStudents));
    localStorage.setItem("mock_academic_teachers", JSON.stringify(academicTeachers));
    localStorage.setItem("mock_student_affiliations", JSON.stringify(studentAffiliations));
    localStorage.setItem("mock_teacher_affiliations", JSON.stringify(teacherAffiliations));
    localStorage.setItem("mock_course_offerings", JSON.stringify(courseOfferings));
    localStorage.setItem("mock_teaching_assignments", JSON.stringify(teachingAssignments));
    localStorage.setItem("mock_course_offering_change_requests", JSON.stringify(courseOfferingChangeRequests));
    localStorage.setItem("mock_course_proposals", JSON.stringify(courseProposals));
    localStorage.setItem("mock_subject_results", JSON.stringify(subjectResults));
    localStorage.setItem("mock_examRequests", JSON.stringify(examRequests));
    localStorage.setItem("mock_certificates", JSON.stringify(certificates));
    localStorage.setItem("mock_settings", JSON.stringify(settings));
    localStorage.setItem("mock_db_schema_version", "8");
  }, [academicInstitutions, academicStudents, academicTeachers, admissions, certificates, courseOfferingChangeRequests, courseOfferings, courseProposals, courseRequests, examRequests, isLoaded, payments, programs, registrationInvoices, registrations, researchSubmissions, settings, studentAffiliations, subjectResults, teacherAffiliations, teachingAssignments]);

  const updateAdmissionStatus = (id: string, status: Status) => setAdmissions((previous) => previous.map((admission) => {
    if (admission.id !== id) return admission;
    if (status !== "approved") return { ...admission, status };

    return {
      ...admission,
      status,
      documentStatus: "complete",
      documents: admission.documents.map((document) => ({
        ...document,
        reviewStatus: document.file ? "accepted" : "not_applicable",
        reviewerNote: undefined,
      })),
      documentNote: undefined,
    };
  }));
  const updateAdmissionDocuments = (
    id: string,
    documents: AdmissionDocument[],
    documentStatus: AdmissionDocumentStatus = "pending",
    documentNote?: string,
  ) => setAdmissions((previous) => previous.map((admission) => (
    admission.id === id
      ? { ...admission, documents, documentStatus, documentNote }
      : admission
  )));
  const reviewInstitutionAdmission = (input: InstitutionAdmissionReviewInput) => {
    const admission = admissions.find((item) => item.id === input.admissionId);
    if (!admission) throw new Error("ไม่พบคำสมัครที่ต้องการพิจารณา");
    assertInstitutionAdminMutationScope(input.actor, admission.institutionId);

    const occurredAt = new Date().toISOString();
    const updated = reviewInstitutionAdmissionRecord({
      ...input,
      admission,
      reviewedAt: occurredAt,
    });
    const action = {
      documents_complete: "admission.documents_reviewed",
      request_information: "admission.request_information",
      approve: "admission.approve",
      reject: "admission.reject",
    }[input.decision];
    const reason = input.reason?.trim() || {
      documents_complete: "ยืนยันว่าเอกสารประกอบคำสมัครครบถ้วน",
      request_information: "ขอข้อมูลหรือเอกสารเพิ่มเติมจากผู้สมัคร",
      approve: "เอกสารและคุณสมบัติครบถ้วนตามเกณฑ์",
      reject: "ไม่อนุมัติคำสมัคร",
    }[input.decision];

    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action,
      resourceType: "admission",
      resourceId: admission.id,
      resourceLabel: `${admission.name} · ${admission.program}`,
      resourceOrganisationId: admission.institutionId,
      before: admission,
      after: updated,
      reason,
      evidenceReference: `admission-documents:${admission.id}`,
      occurredAt,
    });
    setAdmissions((previous) => previous.map((item) => (
      item.id === admission.id ? updated : item
    )));
  };
  const addResearchSubmission = (submission: ResearchSubmission) => setResearchSubmissions((previous) => [submission, ...previous]);
  const updateResearchSubmissionStatus = (
    id: string,
    status: ResearchSubmissionStatus,
    reviewerNote?: string,
  ) => setResearchSubmissions((previous) => previous.map((submission) => (
    submission.id === id ? { ...submission, status, reviewerNote } : submission
  )));
  const enrollRegistrationForInvoice = (
    invoiceId: string,
    at: string,
    evidenceReference: string,
  ) => {
    const invoice = registrationInvoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    const registration = registrations.find((item) => item.id === invoice.registrationId);
    if (!registration) return;
    if (invoice.status === "paid" && registration.status === "enrolled") return;

    const paidInvoice = payRegistrationInvoice(invoice, at);
    const enrolled = enrollPaidRegistration(registration, at);
    appendAuditEvent({
      actor: {
        userId: "system-payment",
        userName: "System Actor · Payment Confirmation",
        role: "system_actor",
        organisation: ORGANISATIONS.system,
        resourceScopes: ["payment:confirm", "registration:enroll"],
      },
      action: "payment.confirmed",
      resource: {
        type: "invoice",
        id: invoice.id,
        label: invoice.description,
        organisationId: registration.institutionId,
      },
      before: { invoice, registration },
      after: { invoice: paidInvoice, registration: enrolled },
      reason: "ยืนยันรายการชำระเงินและปรับสถานะการลงทะเบียนโดยอัตโนมัติ",
      evidenceReference,
      occurredAt: at,
    });
    setRegistrationInvoices((previous) => previous.map((item) => (
      item.id === paidInvoice.id ? paidInvoice : item
    )));
    setRegistrations((previous) => previous.map((item) => (
      item.id === enrolled.id ? enrolled : item
    )));
    if (enrolled.status !== "enrolled" || !enrolled.courseOfferingId) return;
    const assignment = teachingAssignments.find((item) => (
      item.courseOfferingId === enrolled.courseOfferingId &&
      new Date(item.startsAt).getTime() <= new Date(at).getTime() &&
      (!item.endsAt || new Date(at).getTime() < new Date(item.endsAt).getTime())
    ));
    if (!assignment) return;
    setSubjectResults((previous) => {
      if (previous.some((item) => (
        item.studentId === enrolled.studentId && item.courseOfferingId === enrolled.courseOfferingId
      ))) return previous;
      return [...previous, createPendingSubjectResult({
        id: `RESULT-${enrolled.id}`,
        studentId: enrolled.studentId,
        courseOfferingId: enrolled.courseOfferingId!,
        teacherId: assignment.teacherId,
        at,
      })];
    });
  };
  const updatePaymentStatus = (id: string, status: Status) => {
    const payment = payments.find((item) => item.id === id);
    if (status === "approved" && payment?.invoiceId) {
      const paidAt = new Date().toISOString();
      enrollRegistrationForInvoice(
        payment.invoiceId,
        paidAt,
        payment.referenceNo ?? `payment:${payment.id}`,
      );
    }
    setPayments(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };
  const addPayment = (payment: Payment) => {
    if (payment.status === "approved" && payment.invoiceId) {
      const paidAt = payment.submittedAt ?? new Date().toISOString();
      enrollRegistrationForInvoice(
        payment.invoiceId,
        paidAt,
        payment.referenceNo ?? `payment:${payment.id}`,
      );
    }
    setPayments(prev => [payment, ...prev]);
  };
  const updateCourseRequestStatus = (id: string, status: Status) => setCourseRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  const submitRegistrations = (
    selections: RegistrationSubmissionInput[],
  ): Registration[] => {
    const registrationWindow = getRegistrationWindowStatus({
      enabled: settings.registrationOpen,
      opensAt: settings.registrationOpensAt,
      closesAt: settings.registrationClosesAt,
      now: Date.now(),
    });
    if (!registrationWindow.canRegister) {
      throw new Error("Registration window is not open");
    }
    const activeCourseKeys = new Set(
      registrations
        .filter((registration) => registration.status !== "rejected" && registration.status !== "withdrawn")
        .map((registration) => `${registration.studentId}:${registration.courseCode}`),
    );
    const at = new Date().toISOString();
    const batchId = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    const created = selections.flatMap((selection, index): Registration[] => {
      const courseKey = `${selection.studentId}:${selection.courseCode}`;
      if (activeCourseKeys.has(courseKey)) return [];
      activeCourseKeys.add(courseKey);
      const requestedOffering = selection.courseOfferingId
        ? courseOfferings.find((item) => item.id === selection.courseOfferingId)
        : undefined;
      if (selection.courseOfferingId && !requestedOffering) {
        throw new Error(`Course offering ${selection.courseOfferingId} was not found`);
      }
      const offering = requestedOffering ?? defaultOfferingFor(selection.courseCode, selection.studentId);
      if (!offering || offering.courseCode !== selection.courseCode) {
        throw new Error(`No course offering matches ${selection.courseCode}`);
      }
      if (offering.status !== "open") {
        throw new Error(`Course offering ${offering.id} is not open`);
      }
      if (selection.institutionId && selection.institutionId !== offering.institutionId) {
        throw new Error("Registration institution does not match its course offering");
      }
      const eligibility = defaultEligibilityForStudent(selection.studentId, at);
      const registration = createEligibilityCheckedRegistration({
        ...selection,
        id: `REG-${batchId}-${index + 1}`,
        courseOfferingId: offering?.id,
        institutionId: offering?.institutionId,
      }, eligibility, at);
      return [{
        ...registration,
        history: registration.history.map((event) => event.actor === "system"
          ? {
              ...event,
              actorUserId: "system-eligibility",
              actorName: "System Actor",
              organisationId: offering?.institutionId,
              evidenceReference: eligibility.evidenceReference,
            }
          : {
              ...event,
              actor: "student",
              actorUserId: selection.studentId,
              actorName: selection.studentName,
              actorRole: "student",
              organisationId: offering?.institutionId,
            }),
      }];
    });

    if (created.length === 0) return [];
    setRegistrations((previous) => [...created, ...previous]);
    setRegistrationInvoices((previous) => [
      ...created.map((registration) => createLockedRegistrationInvoice({
        registrationId: registration.id,
        studentId: registration.studentId,
        courseCode: registration.courseCode,
        courseTitle: registration.courseTitle,
        credits: registration.credits,
        at,
      })),
      ...previous,
    ]);
    return created;
  };
  const resubmitRegistration = (id: string) => {
    const current = registrations.find((registration) => registration.id === id);
    if (!current) return;
    const updated = resubmitRegistrationRecord(current);
    setRegistrations((previous) => previous.map((registration) => (
      registration.id === id ? updated : registration
    )));
  };
  const requestRegistrationDrop = (id: string, reason?: string) => {
    const current = registrations.find((registration) => registration.id === id);
    if (!current) return;
    const updated = transitionRegistration(current, "drop_pending", "member", { reason });
    setRegistrations((previous) => previous.map((registration) => (
      registration.id === id ? updated : registration
    )));
  };
  const updateRegistrationStatus = (
    id: string,
    status: RegistrationStatus,
    reason?: string,
  ) => {
    const current = registrations.find((registration) => registration.id === id);
    if (!current) return;
    const at = new Date().toISOString();
    const updated = transitionRegistration(current, status, "registrar", { at, reason });
    setRegistrations((previous) => previous.map((registration) => (
      registration.id === id ? updated : registration
    )));

    setRegistrationInvoices((previous) => previous.map((invoice) => {
      if (invoice.registrationId !== id) return invoice;
      if (status === "approved" && current.status !== "drop_pending") {
        return unlockRegistrationInvoice(invoice, at);
      }
      if (status === "rejected" || status === "withdrawn") {
        return cancelRegistrationInvoice(invoice, at);
      }
      return invoice;
    }));
  };
  const reviewRegistration = (input: RegistrationReviewInput) => {
    const current = registrations.find((registration) => registration.id === input.registrationId);
    if (!current) throw new Error(`Registration ${input.registrationId} was not found`);
    if (!current.courseOfferingId || !current.institutionId) {
      throw new Error("Registration has no academic course scope");
    }
    const at = new Date().toISOString();
    const assignment = teachingAssignments.find((item) => (
      item.teacherId === input.actor.userId &&
      item.courseOfferingId === current.courseOfferingId &&
      canTeacherAccessOfferingWithinAffiliation(
        teachingAssignments,
        teacherAffiliations,
        input.actor.userId,
        current.institutionId!,
        current.courseOfferingId!,
        new Date(at),
      )
    ));
    if (!assignment || input.actor.role !== "teacher" || input.actor.organisationId !== current.institutionId) {
      throw new Error("Teacher cannot review a registration outside their assignment");
    }
    if (!hasTeacherCourseMutationScope(input.actor, current.courseOfferingId)) {
      throw new Error("Teacher Resource Scope does not cover this course");
    }
    if (current.eligibility?.decision !== "eligible" && current.eligibility?.decision !== "eligible_with_warning") {
      throw new Error("Registration has not passed System eligibility");
    }
    const decision = input.decision === "approve"
      ? "approved"
      : input.decision === "reject"
        ? "rejected"
        : "needs_info";
    const evidenceReference = input.evidenceReference ?? `teaching-assignment:${assignment.id}`;
    const reviewed = recordTeacherRegistrationDecision(current, decision, input.actor, {
      at,
      reason: input.reason,
      evidenceReference,
    });
    const updated = decision === "approved"
      ? markRegistrationAwaitingPayment(reviewed, at)
      : reviewed;
    const action = decision === "approved"
      ? "registration.approve"
      : decision === "rejected"
        ? "registration.reject"
        : "registration.request_information";
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action,
      resourceType: "registration",
      resourceId: current.id,
      resourceLabel: `${current.courseCode} · ${current.studentName}`,
      resourceOrganisationId: current.institutionId,
      before: current,
      after: updated,
      reason: input.reason,
      evidenceReference,
      occurredAt: at,
    });
    setRegistrations((previous) => previous.map((registration) => (
      registration.id === current.id ? updated : registration
    )));
    if (decision === "approved") {
      setRegistrationInvoices((previous) => previous.map((invoice) => (
        invoice.registrationId === current.id ? unlockRegistrationInvoice(invoice, at) : invoice
      )));
    } else if (decision === "rejected") {
      setRegistrationInvoices((previous) => previous.map((invoice) => (
        invoice.registrationId === current.id ? cancelRegistrationInvoice(invoice, at) : invoice
      )));
    }
  };
  const requiredInstitutionReason = (value: string) => {
    const reason = value.trim();
    if (!reason) throw new Error("กรุณาระบุเหตุผลประกอบการดำเนินการ");
    return reason;
  };
  const hasOutstandingCourseChange = (request: CourseOfferingChangeRequest) => (
    request.status === "pending_teacher_review" || request.status === "needs_revision"
  );
  const assignmentChangeWouldOrphanCourseReview = (
    current: TeachingAssignment,
    next: TeachingAssignment,
    at: Date,
  ) => {
    if (current.status !== "accepted") return false;
    const relevantRequests = courseOfferingChangeRequests.filter((request) => (
      hasOutstandingCourseChange(request) &&
      request.reviewerTeacherId === current.teacherId &&
      request.courseOfferingId === current.courseOfferingId &&
      request.institutionId === current.institutionId
    ));
    if (relevantRequests.length === 0) return false;
    const nextAssignments = teachingAssignments.map((assignment) => (
      assignment.id === current.id ? next : assignment
    ));
    return relevantRequests.some((request) => (
      !canTeacherAccessOfferingWithinAffiliation(
        nextAssignments,
        teacherAffiliations,
        request.reviewerTeacherId,
        request.institutionId,
        request.courseOfferingId,
        at,
      )
    ));
  };
  const assertAssignmentChangeKeepsCourseReview = (
    current: TeachingAssignment,
    next: TeachingAssignment,
    at: Date,
  ) => {
    if (assignmentChangeWouldOrphanCourseReview(current, next, at)) {
      throw new Error("ไม่สามารถเปลี่ยนหรือยกเลิกการมอบหมายนี้ได้ เนื่องจากมีคำขอปรับข้อมูลรายวิชาที่ยังรอการดำเนินการ");
    }
  };
  const addInstitutionTeacher = (input: InstitutionTeacherInput) => {
    assertInstitutionAdminMutationScope(input.actor, input.actor.organisationId);
    const name = input.name.trim();
    if (!name) throw new Error("กรุณาระบุชื่ออาจารย์");
    const reason = requiredInstitutionReason(input.reason);
    const at = new Date().toISOString();
    const startsAt = input.startsAt ?? at;
    if (!Number.isFinite(new Date(startsAt).getTime())) throw new Error("วันเริ่มสังกัดไม่ถูกต้อง");
    if (input.endsAt) {
      if (!Number.isFinite(new Date(input.endsAt).getTime())) {
        throw new Error("วันสิ้นสุดสังกัดไม่ถูกต้อง");
      }
      if (new Date(input.endsAt).getTime() <= new Date(startsAt).getTime()) {
        throw new Error("วันสิ้นสุดสังกัดต้องอยู่หลังวันเริ่มต้น");
      }
    }
    const teacher: AcademicTeacher = {
      id: `teacher-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      name,
    };
    const affiliation: TeacherAffiliation = {
      id: `teacher-affiliation-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      teacherId: teacher.id,
      institutionId: input.actor.organisationId,
      startsAt,
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      status: "active",
    };
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "business_record.create",
      resourceType: "teacher_affiliation",
      resourceId: affiliation.id,
      resourceLabel: teacher.name,
      resourceOrganisationId: affiliation.institutionId,
      before: null,
      after: { teacher, affiliation },
      reason,
      evidenceReference: `teacher:${teacher.id}`,
      occurredAt: at,
    });
    setAcademicTeachers((previous) => [...previous, teacher]);
    setTeacherAffiliations((previous) => [...previous, affiliation]);
  };
  const updateInstitutionTeacher = (input: InstitutionTeacherUpdateInput) => {
    assertInstitutionAdminMutationScope(input.actor, input.actor.organisationId);
    const reason = requiredInstitutionReason(input.reason);
    const name = input.name.trim();
    if (!name) throw new Error("กรุณาระบุชื่ออาจารย์");
    const teacher = academicTeachers.find((item) => item.id === input.teacherId);
    const affiliation = teacherAffiliations.find((item) => (
      item.teacherId === input.teacherId &&
      item.institutionId === input.actor.organisationId &&
      item.status === "active"
    ));
    if (!teacher || !affiliation) throw new Error("ไม่พบอาจารย์ในขอบเขตสถาบันนี้");
    if (teacherAffiliations.some((item) => (
      item.teacherId === teacher.id && item.institutionId !== input.actor.organisationId
    ))) {
      throw new Error("ไม่สามารถแก้ชื่อกลางของอาจารย์ที่สังกัดมากกว่าหนึ่งสถาบัน");
    }
    const updated = { ...teacher, name };
    const at = new Date().toISOString();
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "business_record.update",
      resourceType: "academic_teacher",
      resourceId: teacher.id,
      resourceLabel: teacher.name,
      resourceOrganisationId: affiliation.institutionId,
      before: teacher,
      after: updated,
      reason,
      evidenceReference: `teacher-affiliation:${affiliation.id}`,
      occurredAt: at,
    });
    setAcademicTeachers((previous) => previous.map((item) => item.id === teacher.id ? updated : item));
  };
  const endInstitutionTeacherAffiliation = (input: InstitutionTeacherEndInput) => {
    assertInstitutionAdminMutationScope(input.actor, input.actor.organisationId);
    const reason = requiredInstitutionReason(input.reason);
    const affiliation = teacherAffiliations.find((item) => (
      item.teacherId === input.teacherId &&
      item.institutionId === input.actor.organisationId &&
      item.status === "active"
    ));
    if (!affiliation) throw new Error("ไม่พบสังกัดอาจารย์ที่ยังใช้งานในสถาบันนี้");
    const at = new Date().toISOString();
    if (teachingAssignments.some((assignment) => (
      assignment.institutionId === input.actor.organisationId &&
      assignmentBlocksAffiliationEnd(assignment, input.teacherId, new Date(at))
    ))) {
      throw new Error("กรุณายกเลิกการมอบหมายการสอนที่ยังมีผลก่อนสิ้นสุดสังกัดอาจารย์");
    }
    const updated: TeacherAffiliation = { ...affiliation, status: "inactive", endsAt: at };
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "access.role_scope_change",
      resourceType: "teacher_affiliation",
      resourceId: affiliation.id,
      resourceLabel: academicTeachers.find((item) => item.id === input.teacherId)?.name ?? input.teacherId,
      resourceOrganisationId: affiliation.institutionId,
      before: affiliation,
      after: updated,
      reason,
      evidenceReference: `teacher:${input.teacherId}`,
      occurredAt: at,
    });
    setTeacherAffiliations((previous) => previous.map((item) => item.id === affiliation.id ? updated : item));
  };
  const assignTeacherToCourse = (input: TeachingAssignmentInput) => {
    const offering = courseOfferings.find((item) => item.id === input.courseOfferingId);
    if (!offering) throw new Error("ไม่พบรายวิชาที่ต้องการมอบหมาย");
    assertInstitutionAdminMutationScope(input.actor, offering.institutionId);
    const reason = requiredInstitutionReason(input.reason);
    const startsAt = input.startsAt ?? new Date().toISOString();
    const assignment = createTeachingAssignmentRecord({
      id: `teaching-assignment-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      patch: {
        teacherId: input.teacherId,
        courseOfferingId: offering.id,
        startsAt,
        ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      },
      institutionId: offering.institutionId,
      assignedBy: input.actor.userId,
    });
    const teacherAffiliation = teacherAffiliations.find((affiliation) => (
      affiliation.teacherId === input.teacherId &&
      affiliation.institutionId === input.actor.organisationId &&
      affiliationCoversAssignment(affiliation, assignment)
    ));
    if (!teacherAffiliation) {
      throw new Error("ช่วงเวลามอบหมายต้องอยู่ภายในช่วงสังกัดของอาจารย์ในสถาบันนี้");
    }
    if (teachingAssignments.some((assignment) => (
      assignmentConflictsWithPatch(assignment, {
        teacherId: input.teacherId,
        courseOfferingId: offering.id,
        startsAt,
        ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      })
    ))) {
      throw new Error("อาจารย์ท่านนี้ได้รับมอบหมายรายวิชานี้อยู่แล้ว");
    }
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "teaching_assignment.change",
      resourceType: "teaching_assignment",
      resourceId: assignment.id,
      resourceLabel: offering.courseCode,
      resourceOrganisationId: offering.institutionId,
      before: null,
      after: assignment,
      reason,
      evidenceReference: `course-offering:${offering.id}`,
      occurredAt: assignment.assignedAt,
    });
    setTeachingAssignments((previous) => [...previous, assignment]);
  };
  const updateTeachingAssignment = (input: TeachingAssignmentUpdateInput) => {
    const assignment = teachingAssignments.find((item) => item.id === input.assignmentId);
    if (!assignment) throw new Error("ไม่พบการมอบหมายที่ต้องการแก้ไข");
    assertInstitutionAdminMutationScope(input.actor, assignment.institutionId);
    const reason = requiredInstitutionReason(input.reason);
    const offering = courseOfferings.find((item) => item.id === input.courseOfferingId);
    if (!offering || offering.institutionId !== assignment.institutionId) {
      throw new Error("รายวิชาอยู่นอกขอบเขตสถาบัน");
    }
    const patch: TeachingAssignmentPatch = {
      teacherId: input.teacherId,
      courseOfferingId: offering.id,
      startsAt: input.startsAt,
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
    };
    const at = new Date().toISOString();
    const updated = stageTeachingAssignmentUpdate(assignment, patch, at);
    const affiliation = teacherAffiliations.find((item) => (
      item.teacherId === input.teacherId && item.institutionId === assignment.institutionId &&
      affiliationCoversAssignment(item, patch)
    ));
    if (!affiliation) {
      throw new Error("ช่วงเวลามอบหมายต้องอยู่ภายในช่วงสังกัดของอาจารย์ในสถาบันนี้");
    }
    if (teachingAssignments.some((item) => (
      item.id !== assignment.id && assignmentConflictsWithPatch(item, patch)
    ))) {
      throw new Error("อาจารย์ท่านนี้ได้รับมอบหมายรายวิชานี้อยู่แล้ว");
    }
    const projected = assignment.status === "accepted"
      ? { ...updated, ...patch, pendingChanges: undefined }
      : updated;
    assertAssignmentChangeKeepsCourseReview(assignment, projected, new Date(at));
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "teaching_assignment.change",
      resourceType: "teaching_assignment",
      resourceId: assignment.id,
      resourceLabel: offering.courseCode,
      resourceOrganisationId: assignment.institutionId,
      before: assignment,
      after: updated,
      reason,
      evidenceReference: `course-offering:${offering.id}`,
      occurredAt: at,
    });
    setTeachingAssignments((previous) => previous.map((item) => item.id === assignment.id ? updated : item));
  };
  const cancelTeachingAssignment = (input: TeachingAssignmentCancelInput) => {
    const assignment = teachingAssignments.find((item) => item.id === input.assignmentId);
    if (!assignment) throw new Error("ไม่พบการมอบหมายที่ต้องการยกเลิก");
    assertInstitutionAdminMutationScope(input.actor, assignment.institutionId);
    const reason = requiredInstitutionReason(input.reason);
    const at = new Date().toISOString();
    const updated = cancelTeachingAssignmentRecord(assignment, at);
    assertAssignmentChangeKeepsCourseReview(assignment, updated, new Date(at));
    const offering = courseOfferings.find((item) => item.id === assignment.courseOfferingId);
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "teaching_assignment.change",
      resourceType: "teaching_assignment",
      resourceId: assignment.id,
      resourceLabel: offering?.courseCode ?? assignment.courseOfferingId,
      resourceOrganisationId: assignment.institutionId,
      before: assignment,
      after: updated,
      reason,
      evidenceReference: `course-offering:${assignment.courseOfferingId}`,
      occurredAt: at,
    });
    setTeachingAssignments((previous) => previous.map((item) => item.id === assignment.id ? updated : item));
  };
  const respondTeachingAssignment = (input: TeachingAssignmentResponseInput) => {
    const assignment = teachingAssignments.find((item) => item.id === input.assignmentId);
    if (!assignment) throw new Error("ไม่พบการมอบหมายที่ต้องการตอบรับ");
    const teacherId = assignment.pendingChanges?.teacherId ?? assignment.teacherId;
    const courseOfferingId = assignment.pendingChanges?.courseOfferingId ?? assignment.courseOfferingId;
    if (
      input.actor.role !== "teacher" || input.actor.userId !== teacherId ||
      input.actor.organisationId !== assignment.institutionId ||
      !hasTeacherCourseMutationScope(input.actor, courseOfferingId)
    ) {
      throw new Error("บัญชีนี้ไม่มีสิทธิ์ตอบรับการมอบหมายดังกล่าว");
    }
    const at = new Date().toISOString();
    const effectivePatch: TeachingAssignmentPatch = assignment.pendingChanges ?? {
      teacherId: assignment.teacherId,
      courseOfferingId: assignment.courseOfferingId,
      startsAt: assignment.startsAt,
      ...(assignment.endsAt ? { endsAt: assignment.endsAt } : {}),
    };
    const affiliation = teacherAffiliations.find((item) => (
      item.teacherId === teacherId && item.institutionId === assignment.institutionId &&
      affiliationCoversAssignment(item, effectivePatch)
    ));
    if (!affiliation) {
      throw new Error("ช่วงเวลามอบหมายอยู่นอกช่วงสังกัดของอาจารย์ในสถาบันนี้");
    }
    const updated = respondTeachingAssignmentRecord({ ...input, assignment, at });
    if (input.decision === "accept") {
      assertAssignmentChangeKeepsCourseReview(assignment, updated, new Date(at));
    }
    const reason = input.reason?.trim() || "ตอบรับการมอบหมายการสอน";
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "teaching_assignment.change",
      resourceType: "teaching_assignment",
      resourceId: assignment.id,
      resourceLabel: courseOfferings.find((item) => item.id === courseOfferingId)?.courseCode ?? courseOfferingId,
      resourceOrganisationId: assignment.institutionId,
      before: assignment,
      after: updated,
      reason,
      evidenceReference: `course-offering:${courseOfferingId}`,
      occurredAt: at,
    });
    setTeachingAssignments((previous) => previous.map((item) => item.id === assignment.id ? updated : item));
  };
  const updateAffiliationStatus = (input: AffiliationStatusInput) => {
    const reason = requiredInstitutionReason(input.reason);
    const source = input.affiliationType === "student" ? studentAffiliations : teacherAffiliations;
    const affiliation = source.find((item) => item.id === input.affiliationId);
    if (!affiliation) throw new Error("ไม่พบข้อมูลสังกัดที่ต้องการเปลี่ยน");
    assertInstitutionAdminMutationScope(input.actor, affiliation.institutionId);
    if (input.affiliationType === "teacher" && input.status === "inactive") {
      endInstitutionTeacherAffiliation({
        actor: input.actor,
        teacherId: (affiliation as TeacherAffiliation).teacherId,
        reason,
      });
      return;
    }
    const at = new Date().toISOString();
    const updated = {
      ...affiliation,
      status: input.status,
      ...(input.status === "inactive" ? { endsAt: at } : { endsAt: undefined }),
    };
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "access.role_scope_change",
      resourceType: `${input.affiliationType}_affiliation`,
      resourceId: affiliation.id,
      resourceLabel: input.affiliationType === "student"
        ? (academicStudents.find((item) => item.id === (affiliation as StudentAffiliation).studentId)?.name ?? affiliation.id)
        : (academicTeachers.find((item) => item.id === (affiliation as TeacherAffiliation).teacherId)?.name ?? affiliation.id),
      resourceOrganisationId: affiliation.institutionId,
      before: affiliation,
      after: updated,
      reason,
      evidenceReference: `affiliation:${affiliation.id}`,
      occurredAt: at,
    });
    if (input.affiliationType === "student") {
      setStudentAffiliations((previous) => previous.map((item) => (
        item.id === affiliation.id ? updated as StudentAffiliation : item
      )));
    } else {
      setTeacherAffiliations((previous) => previous.map((item) => (
        item.id === affiliation.id ? updated as TeacherAffiliation : item
      )));
    }
  };
  const updateCourseOfferingStatus = (input: CourseOfferingStatusInput) => {
    const reason = requiredInstitutionReason(input.reason);
    const offering = courseOfferings.find((item) => item.id === input.courseOfferingId);
    if (!offering) throw new Error("ไม่พบรายวิชาที่ต้องการเปลี่ยนสถานะ");
    assertInstitutionAdminMutationScope(input.actor, offering.institutionId);
    const updated = { ...offering, status: input.status };
    const at = new Date().toISOString();
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "course_offering.update",
      resourceType: "course_offering",
      resourceId: offering.id,
      resourceLabel: offering.courseCode,
      resourceOrganisationId: offering.institutionId,
      before: offering,
      after: updated,
      reason,
      evidenceReference: `course-offering:${offering.id}`,
      occurredAt: at,
    });
    setCourseOfferings((previous) => previous.map((item) => (
      item.id === offering.id ? updated : item
    )));
  };
  const assertCourseChangeReviewer = (
    actor: ScopedAcademicActor,
    request: CourseOfferingChangeRequest,
  ) => {
    if (
      actor.role !== "teacher" || actor.userId !== request.reviewerTeacherId ||
      actor.organisationId !== request.institutionId ||
      !hasTeacherCourseMutationScope(actor, request.courseOfferingId) ||
      !canTeacherAccessOfferingWithinAffiliation(
        teachingAssignments,
        teacherAffiliations,
        actor.userId,
        request.institutionId,
        request.courseOfferingId,
      )
    ) {
      throw new Error("บัญชีนี้ไม่มีสิทธิ์ตรวจคำขอปรับข้อมูลรายวิชาดังกล่าว");
    }
  };
  const requestCourseOfferingChange = (input: CourseOfferingChangeSubmissionInput) => {
    const offering = courseOfferings.find((item) => item.id === input.courseOfferingId);
    if (!offering) throw new Error("ไม่พบรายวิชาที่ต้องการปรับข้อมูล");
    assertInstitutionAdminMutationScope(input.actor, offering.institutionId);
    const reason = requiredInstitutionReason(input.reason);
    if (!canTeacherAccessOfferingWithinAffiliation(
      teachingAssignments,
      teacherAffiliations,
      input.reviewerTeacherId,
      offering.institutionId,
      offering.id,
    )) {
      throw new Error("อาจารย์ผู้ตรวจสอบต้องมีสังกัดและการมอบหมายรายวิชาที่ยังมีผล");
    }
    if (courseOfferingChangeRequests.some((request) => (
      request.courseOfferingId === offering.id &&
      (request.status === "pending_teacher_review" || request.status === "needs_revision")
    ))) {
      throw new Error("รายวิชานี้มีคำขอปรับข้อมูลที่ยังดำเนินการไม่เสร็จ");
    }
    const at = new Date();
    const created = createCourseOfferingChangeRequestRecord({
      id: `COCHG-${at.getTime().toString(36).toUpperCase()}-${(
        globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
      ).slice(0, 8).toUpperCase()}`,
      courseOfferingId: offering.id,
      reviewerTeacherId: input.reviewerTeacherId,
      proposedChanges: input.proposedChanges,
      reason,
      actor: input.actor,
      at: at.toISOString(),
    });
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "course_offering.update",
      resourceType: "course_offering_change_request",
      resourceId: created.id,
      resourceLabel: offering.courseCode,
      resourceOrganisationId: offering.institutionId,
      before: null,
      after: created,
      reason,
      evidenceReference: `course-offering:${offering.id}`,
      occurredAt: created.requestedAt,
    });
    setCourseOfferingChangeRequests((previous) => [...previous, created]);
  };
  const resubmitCourseOfferingChange = (input: CourseOfferingChangeResubmissionInput) => {
    const request = courseOfferingChangeRequests.find((item) => item.id === input.requestId);
    if (!request) throw new Error("ไม่พบคำขอปรับข้อมูลรายวิชา");
    assertInstitutionAdminMutationScope(input.actor, request.institutionId);
    const reason = requiredInstitutionReason(input.reason);
    const at = new Date().toISOString();
    const updated = resubmitCourseOfferingChangeRequestRecord({
      request,
      proposedChanges: input.proposedChanges,
      reason,
      actor: input.actor,
      at,
    });
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "course_offering.update",
      resourceType: "course_offering_change_request",
      resourceId: request.id,
      resourceLabel: courseOfferings.find((item) => item.id === request.courseOfferingId)?.courseCode,
      resourceOrganisationId: request.institutionId,
      before: request,
      after: updated,
      reason,
      evidenceReference: `course-offering:${request.courseOfferingId}`,
      occurredAt: at,
    });
    setCourseOfferingChangeRequests((previous) => previous.map((item) => item.id === request.id ? updated : item));
  };
  const reviewCourseOfferingChange = (input: CourseOfferingChangeReviewInput) => {
    const request = courseOfferingChangeRequests.find((item) => item.id === input.requestId);
    if (!request) throw new Error("ไม่พบคำขอปรับข้อมูลรายวิชา");
    assertCourseChangeReviewer(input.actor, request);
    const reason = requiredInstitutionReason(input.reason);
    const offering = courseOfferings.find((item) => item.id === request.courseOfferingId);
    if (!offering || offering.institutionId !== request.institutionId) {
      throw new Error("ไม่พบรายวิชาในขอบเขตคำขอ");
    }
    const at = new Date().toISOString();
    const updatedRequest = reviewCourseOfferingChangeRequestRecord({
      request,
      decision: input.decision,
      reason,
      actor: input.actor,
      at,
    });
    const updatedOffering = input.decision === "approved"
      ? { ...offering, ...request.proposedChanges }
      : offering;
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "course_offering.update",
      resourceType: "course_offering_change_request",
      resourceId: request.id,
      resourceLabel: offering.courseCode,
      resourceOrganisationId: request.institutionId,
      before: { request, offering },
      after: { request: updatedRequest, offering: updatedOffering },
      reason,
      evidenceReference: `course-offering:${offering.id}`,
      occurredAt: at,
    });
    setCourseOfferingChangeRequests((previous) => previous.map((item) => (
      item.id === request.id ? updatedRequest : item
    )));
    if (input.decision === "approved") {
      setCourseOfferings((previous) => previous.map((item) => (
        item.id === offering.id ? updatedOffering : item
      )));
    }
  };
  const assertTeacherCanManageCourseProposal = (actor: CourseProposalActor, at: Date) => {
    if (actor.role !== "teacher") {
      throw new Error("Only a Teacher can submit a course proposal");
    }
    const organisation = organisationForActor(actor);
    if (organisation.kind !== "institution" ||
      !hasResourceScope(actor.resourceScopes, "course:proposal")) {
      throw new Error("Teacher lacks the institution or resource scope for course proposals");
    }
    const activeAffiliation = teacherAffiliations.some((affiliation) => (
      affiliation.teacherId === actor.userId &&
      affiliation.institutionId === actor.organisationId &&
      isAcademicAffiliationActive(affiliation, at)
    ));
    if (!activeAffiliation) {
      throw new Error("Teacher has no active affiliation in this institution");
    }
  };
  const assertStaffCanReviewCourseProposal = (actor: CourseProposalActor) => {
    if (actor.role !== "royal_college_staff" ||
      actor.organisationId !== ORGANISATIONS.royalCollege.id ||
      !hasResourceScope(actor.resourceScopes, "staff:central")) {
      throw new Error("Only Royal College Staff with central scope can review course proposals");
    }
  };
  const submitCourseProposal = (input: CourseProposalSubmissionInput) => {
    const at = new Date();
    assertTeacherCanManageCourseProposal(input.actor, at);
    const proposalId = `CPROP-${at.getTime().toString(36).toUpperCase()}-${(
      globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
    ).slice(0, 8).toUpperCase()}`;
    const created = createCourseProposalRecord({
      id: proposalId,
      actor: input.actor,
      courseCode: input.courseCode,
      courseTitle: input.courseTitle,
      credits: input.credits,
      rationale: input.rationale,
      evidenceReference: input.evidenceReference,
      at: at.toISOString(),
    });
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "course_proposal.submit",
      resourceType: "course_proposal",
      resourceId: created.id,
      resourceLabel: `${created.courseCode} · ${created.courseTitle}`,
      resourceOrganisationId: created.institutionId,
      before: null,
      after: created,
      reason: created.rationale,
      evidenceReference: input.evidenceReference,
      occurredAt: created.submittedAt,
    });
    setCourseProposals((previous) => [created, ...previous]);
  };
  const resubmitCourseProposal = (input: CourseProposalResubmissionInput) => {
    const current = courseProposals.find((proposal) => proposal.id === input.proposalId);
    if (!current) throw new Error(`Course proposal ${input.proposalId} was not found`);
    const at = new Date();
    assertTeacherCanManageCourseProposal(input.actor, at);
    if (current.proposerId !== input.actor.userId ||
      current.institutionId !== input.actor.organisationId) {
      throw new Error("Teacher cannot resubmit another proposer's course proposal");
    }
    const updated = resubmitCourseProposalRecord({
      proposal: current,
      actor: input.actor,
      courseCode: input.courseCode,
      courseTitle: input.courseTitle,
      credits: input.credits,
      rationale: input.rationale,
      reason: input.reason,
      evidenceReference: input.evidenceReference,
      at: at.toISOString(),
    });
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "course_proposal.resubmit",
      resourceType: "course_proposal",
      resourceId: updated.id,
      resourceLabel: `${updated.courseCode} · ${updated.courseTitle}`,
      resourceOrganisationId: updated.institutionId,
      before: current,
      after: updated,
      reason: input.reason,
      evidenceReference: input.evidenceReference,
      occurredAt: updated.updatedAt,
    });
    setCourseProposals((previous) => previous.map((proposal) => (
      proposal.id === updated.id ? updated : proposal
    )));
  };
  const reviewCourseProposal = (input: CourseProposalReviewInput) => {
    assertStaffCanReviewCourseProposal(input.actor);
    const current = courseProposals.find((proposal) => proposal.id === input.proposalId);
    if (!current) throw new Error(`Course proposal ${input.proposalId} was not found`);
    const at = new Date().toISOString();
    const updated = reviewCourseProposalRecord({
      proposal: current,
      actor: input.actor,
      decision: input.decision,
      reason: input.reason,
      evidenceReference: input.evidenceReference,
      at,
    });
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "course_proposal.review",
      resourceType: "course_proposal",
      resourceId: updated.id,
      resourceLabel: `${updated.courseCode} · ${updated.courseTitle}`,
      resourceOrganisationId: updated.institutionId,
      before: current,
      after: updated,
      reason: input.reason,
      evidenceReference: input.evidenceReference,
      occurredAt: at,
    });
    setCourseProposals((previous) => previous.map((proposal) => (
      proposal.id === updated.id ? updated : proposal
    )));
  };
  const resultForTeacher = (resultId: string, actor: ScopedAcademicActor) => {
    const result = subjectResults.find((item) => item.id === resultId);
    if (!result) throw new Error(`Subject result ${resultId} was not found`);
    const offering = courseOfferings.find((item) => item.id === result.courseOfferingId);
    if (!offering || actor.role !== "teacher" || actor.organisationId !== offering.institutionId ||
      !canTeacherAccessOfferingWithinAffiliation(
        teachingAssignments,
        teacherAffiliations,
        actor.userId,
        offering.institutionId,
        result.courseOfferingId,
      )) {
      throw new Error("Teacher cannot access this subject result");
    }
    if (!hasTeacherCourseMutationScope(actor, offering.id)) {
      throw new Error("Teacher Resource Scope does not cover this course");
    }
    const enrolled = registrations.some((registration) => (
      registration.studentId === result.studentId &&
      registration.courseOfferingId === result.courseOfferingId &&
      registration.status === "enrolled"
    ));
    if (!enrolled) throw new Error("Subject results are available only for enrolled students");
    return { result, offering };
  };
  const saveSubjectResultDraft = (input: SubjectResultDraftInput) => {
    const { result } = resultForTeacher(input.resultId, input.actor);
    const updated = saveSubjectResultDraftRecord(result, input.value, input.actor);
    setSubjectResults((previous) => previous.map((item) => item.id === result.id ? updated : item));
  };
  const publishSubjectResult = (input: { resultId: string; actor: ScopedAcademicActor }) => {
    const { result, offering } = resultForTeacher(input.resultId, input.actor);
    const at = new Date().toISOString();
    const updated = publishSubjectResultRecord(result, input.actor, at);
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "result.publish",
      resourceType: "subject_result",
      resourceId: result.id,
      resourceLabel: `${offering.courseCode} · ${result.studentId}`,
      resourceOrganisationId: offering.institutionId,
      before: result,
      after: updated,
      reason: "ประกาศผลแบบผ่าน/ไม่ผ่านให้นักศึกษาเห็นผลล่าสุด",
      evidenceReference: `teaching-assignment:${result.teacherId}:${offering.id}`,
      occurredAt: at,
    });
    setSubjectResults((previous) => previous.map((item) => item.id === result.id ? updated : item));
  };
  const reviseSubjectResult = (input: SubjectResultRevisionInput) => {
    const { result, offering } = resultForTeacher(input.resultId, input.actor);
    const at = new Date().toISOString();
    const updated = reviseSubjectResultRecord(result, input.value, input.reason, input.actor, at);
    appendAcademicAudit({
      actor: input.actor,
      resourceScopes: input.actor.resourceScopes,
      action: "result.revise",
      resourceType: "subject_result",
      resourceId: result.id,
      resourceLabel: `${offering.courseCode} · ${result.studentId}`,
      resourceOrganisationId: offering.institutionId,
      before: result,
      after: updated,
      reason: input.reason,
      evidenceReference: `teaching-assignment:${result.teacherId}:${offering.id}`,
      occurredAt: at,
    });
    setSubjectResults((previous) => previous.map((item) => item.id === result.id ? updated : item));
  };
  const updateExamRequestStatus = (id: string, status: ExamRequest["status"]) => setExamRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  const updateCertificateStatus = (id: string, status: Certificate["status"]) => setCertificates(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  const updateSettings = (newSettings: Partial<Settings>) => setSettings(prev => ({ ...prev, ...newSettings }));

  return (
    <MockDbContext.Provider
      value={{
        isLoaded,
        admissions, setAdmissions, updateAdmissionStatus, updateAdmissionDocuments,
        reviewInstitutionAdmission,
        researchSubmissions, setResearchSubmissions, addResearchSubmission, updateResearchSubmissionStatus,
        payments, setPayments, updatePaymentStatus, addPayment,
        programs, setPrograms,
        courseRequests, setCourseRequests, updateCourseRequestStatus,
        registrations, setRegistrations, registrationInvoices,
        submitRegistrations, resubmitRegistration, requestRegistrationDrop,
        updateRegistrationStatus,
        academicInstitutions, academicStudents, academicTeachers,
        studentAffiliations, teacherAffiliations, courseOfferings,
        teachingAssignments, courseOfferingChangeRequests, courseProposals,
        subjectResults, auditEvents: auditLog.events,
        reviewRegistration,
        addInstitutionTeacher, updateInstitutionTeacher, endInstitutionTeacherAffiliation,
        assignTeacherToCourse, updateTeachingAssignment,
        cancelTeachingAssignment, respondTeachingAssignment,
        updateAffiliationStatus, updateCourseOfferingStatus,
        requestCourseOfferingChange, resubmitCourseOfferingChange, reviewCourseOfferingChange,
        submitCourseProposal, resubmitCourseProposal, reviewCourseProposal,
        saveSubjectResultDraft, publishSubjectResult, reviseSubjectResult,
        examRequests, setExamRequests, updateExamRequestStatus,
        certificates, setCertificates, updateCertificateStatus,
        settings, updateSettings,
      }}
    >
      {children}
    </MockDbContext.Provider>
  );
}

export function useMockDb() {
  const context = useContext(MockDbContext);
  if (context === undefined) throw new Error("useMockDb must be used within a MockDbProvider");
  return context;
}
