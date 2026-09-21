import type {
  CourseProposal,
  CourseProposalActor,
  CourseProposalDecision,
  CurriculumCreditStructure,
  CurriculumProposalDetails,
} from "./model";

export const COURSE_PROPOSAL_RESOURCE_SCOPE = "course:proposal";

function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function validCredits(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Course proposal credits must be greater than zero");
  }
  return value;
}

function nonNegativeCredit(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be zero or greater`);
  }
  return value;
}

function normalizeCurriculumCredits(
  credits: CurriculumCreditStructure,
): CurriculumCreditStructure {
  const normalized = {
    total: validCredits(credits.total),
    theory: nonNegativeCredit(credits.theory, "Theory credits"),
    laboratory: nonNegativeCredit(credits.laboratory, "Laboratory credits"),
    professionalPractice: nonNegativeCredit(
      credits.professionalPractice,
      "Professional-practice credits",
    ),
    researchOrProject: nonNegativeCredit(
      credits.researchOrProject,
      "Research or project credits",
    ),
  };
  const allocated = normalized.theory + normalized.laboratory +
    normalized.professionalPractice + normalized.researchOrProject;
  if (allocated > normalized.total) {
    throw new Error("Curriculum credit categories cannot exceed total credits");
  }
  return normalized;
}

function requiredDate(value: string, label: string) {
  const normalized = requiredText(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || !Number.isFinite(Date.parse(normalized))) {
    throw new Error(`${label} is invalid`);
  }
  return normalized;
}

export function normalizeCurriculumProposalDetails(
  value: CurriculumProposalDetails,
): CurriculumProposalDetails {
  const announcementDate = requiredDate(value.announcementDate, "Announcement date");
  const effectiveDate = requiredDate(value.effectiveDate, "Effective date");
  if (effectiveDate < announcementDate) {
    throw new Error("Effective date cannot be earlier than announcement date");
  }
  return {
    collegeOrSpecialty: requiredText(value.collegeOrSpecialty, "College or specialty"),
    curriculumNameTh: requiredText(value.curriculumNameTh, "Thai curriculum name"),
    curriculumNameEn: requiredText(value.curriculumNameEn, "English curriculum name"),
    qualificationNameTh: requiredText(value.qualificationNameTh, "Thai qualification name"),
    qualificationNameEn: requiredText(value.qualificationNameEn, "English qualification name"),
    responsibleUnit: requiredText(value.responsibleUnit, "Responsible unit"),
    mainInstitution: requiredText(value.mainInstitution, "Main institution"),
    affiliatedInstitutions: value.affiliatedInstitutions.trim(),
    philosophyAndObjectives: requiredText(
      value.philosophyAndObjectives,
      "Curriculum philosophy and objectives",
    ),
    trainingDuration: requiredText(value.trainingDuration, "Training duration"),
    educationManagementSystem: requiredText(
      value.educationManagementSystem,
      "Education management system",
    ),
    credits: normalizeCurriculumCredits(value.credits),
    relatedShortCourses: value.relatedShortCourses.trim(),
    hourCalculationRule: requiredText(value.hourCalculationRule, "Hour calculation rule"),
    applicantQualifications: requiredText(
      value.applicantQualifications,
      "Applicant qualifications",
    ),
    selectionMethod: requiredText(value.selectionMethod, "Selection method"),
    assessmentMethod: requiredText(value.assessmentMethod, "Assessment method"),
    completionCriteria: requiredText(value.completionCriteria, "Completion criteria"),
    trainingProviderQualifications: requiredText(
      value.trainingProviderQualifications,
      "Training provider qualifications",
    ),
    trainingSiteQualifications: requiredText(
      value.trainingSiteQualifications,
      "Training site qualifications",
    ),
    notes: value.notes.trim(),
    pharmacyCouncilAnnouncementNo: requiredText(
      value.pharmacyCouncilAnnouncementNo,
      "Pharmacy Council announcement number",
    ),
    announcementDate,
    effectiveDate,
  };
}

function validDecision(value: CourseProposalDecision) {
  if (value !== "needs_revision" && value !== "passed" && value !== "rejected") {
    throw new Error("Course proposal review decision is invalid");
  }
  return value;
}

function snapshotActor(actor: CourseProposalActor): CourseProposalActor {
  return { ...actor, resourceScopes: [...actor.resourceScopes] };
}

function historyId(proposalId: string, action: string, at: string, sequence: number) {
  return `${proposalId}-${action}-${new Date(at).getTime().toString(36)}-${sequence + 1}`;
}

export function createCourseProposal(input: {
  id: string;
  actor: CourseProposalActor;
  courseCode: string;
  courseTitle: string;
  credits: number;
  rationale: string;
  curriculum?: CurriculumProposalDetails;
  evidenceReference?: string;
  at?: string;
}): CourseProposal {
  const at = input.at ?? new Date().toISOString();
  const reason = requiredText(input.rationale, "Course proposal rationale");
  const evidenceReference = input.evidenceReference?.trim() || undefined;
  const actor = snapshotActor(input.actor);
  return {
    id: requiredText(input.id, "Course proposal ID"),
    proposerId: actor.userId,
    proposerName: actor.userName,
    institutionId: actor.organisationId,
    courseCode: requiredText(input.courseCode, "Course proposal code"),
    courseTitle: requiredText(input.courseTitle, "Course proposal title"),
    credits: validCredits(input.credits),
    rationale: reason,
    ...(input.curriculum
      ? { curriculum: normalizeCurriculumProposalDetails(input.curriculum) }
      : {}),
    status: "submitted",
    submittedAt: at,
    updatedAt: at,
    history: [{
      id: historyId(input.id, "submitted", at, 0),
      action: "submitted",
      toStatus: "submitted",
      actor,
      occurredAt: at,
      reason,
      ...(evidenceReference ? { evidenceReference } : {}),
    }],
  };
}

export function resubmitCourseProposalRecord(input: {
  proposal: CourseProposal;
  actor: CourseProposalActor;
  courseCode: string;
  courseTitle: string;
  credits: number;
  rationale: string;
  curriculum?: CurriculumProposalDetails;
  reason: string;
  evidenceReference?: string;
  at?: string;
}): CourseProposal {
  if (input.proposal.status !== "needs_revision") {
    throw new Error("Only a course proposal needing revision can be resubmitted");
  }
  const at = input.at ?? new Date().toISOString();
  const reason = requiredText(input.reason, "Course proposal resubmission reason");
  const evidenceReference = input.evidenceReference?.trim() || undefined;
  const actor = snapshotActor(input.actor);
  return {
    ...input.proposal,
    courseCode: requiredText(input.courseCode, "Course proposal code"),
    courseTitle: requiredText(input.courseTitle, "Course proposal title"),
    credits: validCredits(input.credits),
    rationale: requiredText(input.rationale, "Course proposal rationale"),
    ...(input.curriculum
      ? { curriculum: normalizeCurriculumProposalDetails(input.curriculum) }
      : input.proposal.curriculum
        ? { curriculum: input.proposal.curriculum }
        : {}),
    status: "submitted",
    updatedAt: at,
    history: [...input.proposal.history, {
      id: historyId(input.proposal.id, "resubmitted", at, input.proposal.history.length),
      action: "resubmitted",
      fromStatus: input.proposal.status,
      toStatus: "submitted",
      actor,
      occurredAt: at,
      reason,
      ...(evidenceReference ? { evidenceReference } : {}),
    }],
  };
}

export function reviewCourseProposalRecord(input: {
  proposal: CourseProposal;
  actor: CourseProposalActor;
  decision: CourseProposalDecision;
  reason: string;
  evidenceReference?: string;
  at?: string;
}): CourseProposal {
  if (input.proposal.status !== "submitted") {
    throw new Error("Only a submitted course proposal can be reviewed");
  }
  const at = input.at ?? new Date().toISOString();
  const reason = requiredText(input.reason, "Course proposal review reason");
  const evidenceReference = input.evidenceReference?.trim() || undefined;
  const actor = snapshotActor(input.actor);
  const decision = validDecision(input.decision);
  return {
    ...input.proposal,
    status: decision,
    updatedAt: at,
    latestReview: {
      decision,
      note: reason,
      actor,
      reviewedAt: at,
      ...(evidenceReference ? { evidenceReference } : {}),
    },
    history: [...input.proposal.history, {
      id: historyId(input.proposal.id, "reviewed", at, input.proposal.history.length),
      action: "reviewed",
      fromStatus: input.proposal.status,
      toStatus: decision,
      actor,
      occurredAt: at,
      reason,
      ...(evidenceReference ? { evidenceReference } : {}),
    }],
  };
}
