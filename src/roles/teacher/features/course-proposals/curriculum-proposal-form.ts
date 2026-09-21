import type {
  CourseProposal,
  CurriculumProposalDetails,
} from "@/roles/shared/features/academic";

export interface CurriculumProposalFormState {
  collegeOrSpecialty: string;
  curriculumNameTh: string;
  curriculumNameEn: string;
  qualificationNameTh: string;
  qualificationNameEn: string;
  responsibleUnit: string;
  mainInstitution: string;
  affiliatedInstitutions: string;
  philosophyAndObjectives: string;
  trainingDuration: string;
  educationManagementSystem: string;
  totalCredits: string;
  theoryCredits: string;
  laboratoryCredits: string;
  professionalPracticeCredits: string;
  researchOrProjectCredits: string;
  relatedShortCourses: string;
  hourCalculationRule: string;
  applicantQualifications: string;
  selectionMethod: string;
  assessmentMethod: string;
  completionCriteria: string;
  trainingProviderQualifications: string;
  trainingSiteQualifications: string;
  notes: string;
  pharmacyCouncilAnnouncementNo: string;
  announcementDate: string;
  effectiveDate: string;
  evidenceReference: string;
  revisionReason: string;
}

export function emptyCurriculumProposalForm(
  organisationName = "",
): CurriculumProposalFormState {
  return {
    collegeOrSpecialty: "",
    curriculumNameTh: "",
    curriculumNameEn: "",
    qualificationNameTh: "",
    qualificationNameEn: "",
    responsibleUnit: organisationName,
    mainInstitution: organisationName,
    affiliatedInstitutions: "",
    philosophyAndObjectives: "",
    trainingDuration: "",
    educationManagementSystem: "",
    totalCredits: "",
    theoryCredits: "0",
    laboratoryCredits: "0",
    professionalPracticeCredits: "0",
    researchOrProjectCredits: "0",
    relatedShortCourses: "",
    hourCalculationRule: "",
    applicantQualifications: "",
    selectionMethod: "",
    assessmentMethod: "",
    completionCriteria: "",
    trainingProviderQualifications: "",
    trainingSiteQualifications: "",
    notes: "",
    pharmacyCouncilAnnouncementNo: "",
    announcementDate: "",
    effectiveDate: "",
    evidenceReference: "",
    revisionReason: "",
  };
}

export function proposalToCurriculumForm(
  proposal: CourseProposal,
): CurriculumProposalFormState {
  const curriculum = proposal.curriculum;
  if (!curriculum) {
    return {
      ...emptyCurriculumProposalForm(),
      curriculumNameTh: proposal.courseTitle,
      philosophyAndObjectives: proposal.rationale,
      totalCredits: String(proposal.credits),
    };
  }
  return {
    collegeOrSpecialty: curriculum.collegeOrSpecialty,
    curriculumNameTh: curriculum.curriculumNameTh,
    curriculumNameEn: curriculum.curriculumNameEn,
    qualificationNameTh: curriculum.qualificationNameTh,
    qualificationNameEn: curriculum.qualificationNameEn,
    responsibleUnit: curriculum.responsibleUnit,
    mainInstitution: curriculum.mainInstitution,
    affiliatedInstitutions: curriculum.affiliatedInstitutions,
    philosophyAndObjectives: curriculum.philosophyAndObjectives,
    trainingDuration: curriculum.trainingDuration,
    educationManagementSystem: curriculum.educationManagementSystem,
    totalCredits: String(curriculum.credits.total),
    theoryCredits: String(curriculum.credits.theory),
    laboratoryCredits: String(curriculum.credits.laboratory),
    professionalPracticeCredits: String(curriculum.credits.professionalPractice),
    researchOrProjectCredits: String(curriculum.credits.researchOrProject),
    relatedShortCourses: curriculum.relatedShortCourses,
    hourCalculationRule: curriculum.hourCalculationRule,
    applicantQualifications: curriculum.applicantQualifications,
    selectionMethod: curriculum.selectionMethod,
    assessmentMethod: curriculum.assessmentMethod,
    completionCriteria: curriculum.completionCriteria,
    trainingProviderQualifications: curriculum.trainingProviderQualifications,
    trainingSiteQualifications: curriculum.trainingSiteQualifications,
    notes: curriculum.notes,
    pharmacyCouncilAnnouncementNo: curriculum.pharmacyCouncilAnnouncementNo,
    announcementDate: curriculum.announcementDate,
    effectiveDate: curriculum.effectiveDate,
    evidenceReference: "",
    revisionReason: "",
  };
}

function numberValue(value: string, label: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`กรุณาระบุ${label}เป็นตัวเลข`);
  return number;
}

export function curriculumDetailsFromForm(
  form: CurriculumProposalFormState,
): CurriculumProposalDetails {
  return {
    collegeOrSpecialty: form.collegeOrSpecialty,
    curriculumNameTh: form.curriculumNameTh,
    curriculumNameEn: form.curriculumNameEn,
    qualificationNameTh: form.qualificationNameTh,
    qualificationNameEn: form.qualificationNameEn,
    responsibleUnit: form.responsibleUnit,
    mainInstitution: form.mainInstitution,
    affiliatedInstitutions: form.affiliatedInstitutions,
    philosophyAndObjectives: form.philosophyAndObjectives,
    trainingDuration: form.trainingDuration,
    educationManagementSystem: form.educationManagementSystem,
    credits: {
      total: numberValue(form.totalCredits, "หน่วยกิตรวม"),
      theory: numberValue(form.theoryCredits, "หน่วยกิตภาคทฤษฎี"),
      laboratory: numberValue(form.laboratoryCredits, "หน่วยกิตภาคปฏิบัติการ"),
      professionalPractice: numberValue(
        form.professionalPracticeCredits,
        "หน่วยกิตฝึกปฏิบัติวิชาชีพ",
      ),
      researchOrProject: numberValue(
        form.researchOrProjectCredits,
        "หน่วยกิตวิจัยหรือโครงงาน",
      ),
    },
    relatedShortCourses: form.relatedShortCourses,
    hourCalculationRule: form.hourCalculationRule,
    applicantQualifications: form.applicantQualifications,
    selectionMethod: form.selectionMethod,
    assessmentMethod: form.assessmentMethod,
    completionCriteria: form.completionCriteria,
    trainingProviderQualifications: form.trainingProviderQualifications,
    trainingSiteQualifications: form.trainingSiteQualifications,
    notes: form.notes,
    pharmacyCouncilAnnouncementNo: form.pharmacyCouncilAnnouncementNo,
    announcementDate: form.announcementDate,
    effectiveDate: form.effectiveDate,
  };
}
