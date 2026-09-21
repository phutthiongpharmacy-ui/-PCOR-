import type {
  Verification,
  VerificationStatus,
} from "@/roles/shared/member/domain/passport";

export type ActivityTrainingYear = 1 | 2 | 3 | 4;

export type ActivityCategory =
  | "seminar"
  | "journal_club"
  | "case_presentation"
  | "teaching_supervision"
  | "domestic_publication"
  | "professional_project"
  | "practice_improvement"
  | "international_publication";

export type ActivitySource =
  | "student"
  | "officer"
  | "college_checkin"
  | "system";

export type ActivityInstitutionSource = Extract<
  ActivitySource,
  "officer" | "college_checkin"
>;

export type ActivityReviewDecision = "approve" | "reject";

export type ActivityEvidenceKind =
  | "attendance"
  | "presentation"
  | "report"
  | "publication"
  | "certificate";

export interface ActivityEvidence {
  id: string;
  name: string;
  kind: ActivityEvidenceKind;
}

export interface ActivityRequirement {
  id: string;
  trainingYear: ActivityTrainingYear;
  category: ActivityCategory;
  label: string;
  description: string;
  icon: string;
  /** Undefined means the curriculum requires presence but does not state a number. */
  targetCount?: number;
  unit: "ครั้ง" | "เรื่อง" | "โครงงาน" | "รายการ";
}

export interface ActivityTranscriptEntry {
  id: string;
  memberId: string;
  /** Tenant owner. Optional only for activity records stored before institution scoping was introduced. */
  organisationId?: string;
  trainingYear: ActivityTrainingYear;
  academicYear: string;
  requirementId: string;
  category: ActivityCategory;
  title: string;
  activityDate: string;
  institution: string;
  role: string;
  description: string;
  source: ActivitySource;
  evidence: ActivityEvidence[];
  verification: Verification;
  recordedAt?: string;
  recordedBy?: string;
}

export interface ActivityRequirementProgress {
  requirement: ActivityRequirement;
  verifiedCount: number;
  pendingCount: number;
  rejectedCount: number;
  isComplete: boolean;
  progressValue: number;
  progressMax: number;
}

export interface ActivityYearSummary {
  verifiedEntries: number;
  pendingEntries: number;
  rejectedEntries: number;
  completedRequirements: number;
  totalRequirements: number;
}

export interface ActivityFilters {
  category: ActivityCategory | "all";
  status: VerificationStatus | "all";
  query: string;
}

export interface ActivityEntryDraft {
  trainingYear: ActivityTrainingYear;
  academicYear: string;
  requirementId: string;
  title: string;
  activityDate: string;
  institution: string;
  role: string;
  description: string;
  evidenceName: string;
  evidenceKind: ActivityEvidenceKind;
}
