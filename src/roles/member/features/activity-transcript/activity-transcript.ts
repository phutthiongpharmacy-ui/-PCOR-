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

export type ActivitySource = "student" | "college_checkin" | "system";

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

export const activityCategoryMeta: Record<
  ActivityCategory,
  { label: string; shortLabel: string; icon: string }
> = {
  seminar: {
    label: "การนำเสนอสัมมนา",
    shortLabel: "Seminar",
    icon: "co_present",
  },
  journal_club: {
    label: "การนำเสนอ Journal Club",
    shortLabel: "Journal Club",
    icon: "library_books",
  },
  case_presentation: {
    label: "การนำเสนอกรณีศึกษา",
    shortLabel: "Case Presentation",
    icon: "clinical_notes",
  },
  teaching_supervision: {
    label: "การสอนและดูแลการฝึกปฏิบัติงาน",
    shortLabel: "Teaching",
    icon: "school",
  },
  domestic_publication: {
    label: "ผลงานตีพิมพ์ในประเทศ",
    shortLabel: "Domestic Publication",
    icon: "article",
  },
  professional_project: {
    label: "โครงงานด้านวิชาชีพ",
    shortLabel: "Professional Project",
    icon: "assignment",
  },
  practice_improvement: {
    label: "DUE / Critical Pathway / Disease Management",
    shortLabel: "Practice Improvement",
    icon: "account_tree",
  },
  international_publication: {
    label: "ผลงานตีพิมพ์ระดับสากล",
    shortLabel: "International Publication",
    icon: "public",
  },
};

export const activityVerificationMeta: Record<
  VerificationStatus,
  {
    label: string;
    badge: "success" | "warning" | "info" | "danger";
    icon: string;
  }
> = {
  verified: {
    label: "ยืนยันแล้ว",
    badge: "success",
    icon: "verified",
  },
  pending: {
    label: "รอตรวจสอบ",
    badge: "warning",
    icon: "schedule",
  },
  self_declared: {
    label: "บันทึกโดยผู้เรียน",
    badge: "info",
    icon: "person_edit",
  },
  rejected: {
    label: "ไม่ผ่านการตรวจสอบ",
    badge: "danger",
    icon: "cancel",
  },
};

export const activitySourceLabels: Record<ActivitySource, string> = {
  student: "ผู้เรียนบันทึก",
  college_checkin: "ข้อมูลจากสถาบันฝึกอบรม",
  system: "ข้อมูลจากระบบวิทยาลัย",
};

export function getActivityRequirementsForYear(
  requirements: ActivityRequirement[],
  trainingYear: ActivityTrainingYear,
) {
  return requirements.filter(
    (requirement) => requirement.trainingYear === trainingYear,
  );
}

export function getActivityEntriesForYear(
  entries: ActivityTranscriptEntry[],
  trainingYear: ActivityTrainingYear,
) {
  return entries.filter((entry) => entry.trainingYear === trainingYear);
}

export function getActivityRequirementProgress(
  requirement: ActivityRequirement,
  entries: ActivityTranscriptEntry[],
): ActivityRequirementProgress {
  const matchingEntries = entries.filter(
    (entry) =>
      entry.requirementId === requirement.id &&
      entry.trainingYear === requirement.trainingYear &&
      entry.category === requirement.category,
  );
  const verifiedCount = matchingEntries.filter(
    (entry) => entry.verification.status === "verified",
  ).length;
  const pendingCount = matchingEntries.filter(
    (entry) =>
      entry.verification.status === "pending" ||
      entry.verification.status === "self_declared",
  ).length;
  const rejectedCount = matchingEntries.filter(
    (entry) => entry.verification.status === "rejected",
  ).length;
  const progressMax = requirement.targetCount ?? 1;

  return {
    requirement,
    verifiedCount,
    pendingCount,
    rejectedCount,
    isComplete:
      requirement.targetCount === undefined
        ? verifiedCount > 0
        : verifiedCount >= requirement.targetCount,
    progressValue: Math.min(verifiedCount, progressMax),
    progressMax,
  };
}

export function summarizeActivityYear(
  requirements: ActivityRequirement[],
  entries: ActivityTranscriptEntry[],
  trainingYear: ActivityTrainingYear,
): ActivityYearSummary {
  const yearEntries = getActivityEntriesForYear(entries, trainingYear);
  const progress = getActivityRequirementsForYear(
    requirements,
    trainingYear,
  ).map((requirement) =>
    getActivityRequirementProgress(requirement, yearEntries),
  );

  return {
    verifiedEntries: yearEntries.filter(
      (entry) => entry.verification.status === "verified",
    ).length,
    pendingEntries: yearEntries.filter(
      (entry) =>
        entry.verification.status === "pending" ||
        entry.verification.status === "self_declared",
    ).length,
    rejectedEntries: yearEntries.filter(
      (entry) => entry.verification.status === "rejected",
    ).length,
    completedRequirements: progress.filter((item) => item.isComplete).length,
    totalRequirements: progress.length,
  };
}

export function filterActivityEntries(
  entries: ActivityTranscriptEntry[],
  trainingYear: ActivityTrainingYear,
  filters: ActivityFilters,
) {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("th-TH");

  return getActivityEntriesForYear(entries, trainingYear)
    .filter(
      (entry) =>
        filters.category === "all" || entry.category === filters.category,
    )
    .filter(
      (entry) =>
        filters.status === "all" ||
        entry.verification.status === filters.status,
    )
    .filter((entry) => {
      if (!normalizedQuery) return true;
      return [
        entry.title,
        entry.institution,
        entry.role,
        activityCategoryMeta[entry.category].label,
        activityCategoryMeta[entry.category].shortLabel,
      ]
        .join(" ")
        .toLocaleLowerCase("th-TH")
        .includes(normalizedQuery);
    })
    .sort((left, right) => right.activityDate.localeCompare(left.activityDate));
}
