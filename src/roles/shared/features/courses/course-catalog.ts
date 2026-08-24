import {
  COLLEGE_ABBREVIATIONS,
  COLLEGE_OPTIONS,
  type CollegeCode,
} from "@/roles/shared/data/college-directory";

export type { CollegeCode } from "@/roles/shared/data/college-directory";
export type CourseClassification = "required" | "general";

interface CourseDefinitionBase {
  id: string;
  titleTh: string;
  titleEn: string;
  collegeCode: CollegeCode;
  responsibleInstitutionId: string;
  availableInstitutionIds: string[];
  status: "active" | "inactive";
  capacity: number;
  enrolled: number;
  duration: string;
}

export interface NormalCourseDefinition extends CourseDefinitionBase {
  kind: "course";
  code: string;
  classification: CourseClassification;
  credits: number;
}

export interface ShortCourseDefinition extends CourseDefinitionBase {
  kind: "short_course";
  code?: never;
  classification: "general";
  credits: number;
}

export type CourseDefinition = NormalCourseDefinition | ShortCourseDefinition;

const allInstitutions = ["inst-siriraj", "inst-chula", "inst-ramathibodi"];
export const courseInstitutions = {
  "inst-siriraj": { code: "INST-SIRIRAJ", name: "สถาบันฝึกอบรมโรงพยาบาลศิริราช" },
  "inst-chula": { code: "INST-CHULA", name: "สถาบันฝึกอบรมจุฬาลงกรณ์มหาวิทยาลัย" },
  "inst-ramathibodi": { code: "INST-RAMA", name: "สถาบันฝึกอบรมโรงพยาบาลรามาธิบดี" },
} as const;
const course = (input: Omit<NormalCourseDefinition, "kind" | "availableInstitutionIds" | "duration"> & Partial<Pick<NormalCourseDefinition, "availableInstitutionIds" | "duration">>): NormalCourseDefinition => ({ kind: "course", availableInstitutionIds: allInstitutions, duration: "1 ภาคการศึกษา", ...input });
const shortCourse = (input: Omit<ShortCourseDefinition, "kind" | "classification" | "availableInstitutionIds"> & Partial<Pick<ShortCourseDefinition, "availableInstitutionIds">>): ShortCourseDefinition => ({ kind: "short_course", classification: "general", availableInstitutionIds: allInstitutions, ...input });

export const courseCatalog: CourseDefinition[] = [
  course({ id: "course-cpc-101", code: "วคบท-101", titleTh: "ระบาดวิทยาเพื่อการคุ้มครองผู้บริโภค", titleEn: "Epidemiology for Consumer Protection", collegeCode: "วคบท.", responsibleInstitutionId: "inst-chula", classification: "required", credits: 4, capacity: 40, enrolled: 38, status: "active" }),
  course({ id: "course-cpc-102", code: "วคบท-102", titleTh: "การบังคับใช้กฎหมายเพื่อคุ้มครองผู้บริโภค", titleEn: "Law Enforcement for Consumer Protection", collegeCode: "วคบท.", responsibleInstitutionId: "inst-chula", classification: "required", credits: 4, capacity: 35, enrolled: 35, status: "inactive" }),
  course({ id: "course-cpc-103", code: "วคบท-103", titleTh: "การวิเคราะห์และจัดการความเสี่ยง", titleEn: "Risk Analysis and Management", collegeCode: "วคบท.", responsibleInstitutionId: "inst-chula", classification: "required", credits: 4, capacity: 30, enrolled: 28, status: "active" }),
  course({ id: "course-cpc-104", code: "วคบท-104", titleTh: "งานคุ้มครองผู้บริโภคในชุมชน", titleEn: "Community Consumer Protection", collegeCode: "วคบท.", responsibleInstitutionId: "inst-siriraj", classification: "general", credits: 4, capacity: 35, enrolled: 30, status: "active" }),
  course({ id: "course-cpc-105", code: "วคบท-105", titleTh: "นโยบายและการบริหารระบบยา", titleEn: "Pharmaceutical Policy and Systems", collegeCode: "วคบท.", responsibleInstitutionId: "inst-siriraj", classification: "general", credits: 4, capacity: 35, enrolled: 32, status: "active" }),
  course({ id: "course-admin-401", code: "CPAT-401", titleTh: "การบริหารระบบยาและเภสัชเศรษฐศาสตร์", titleEn: "Pharmaceutical Systems and Economics", collegeCode: "CPAT", responsibleInstitutionId: "inst-chula", classification: "required", credits: 6, capacity: 30, enrolled: 24, status: "active" }),
  course({ id: "course-admin-402", code: "CPAT-402", titleTh: "นโยบายสุขภาพและการจัดการคุณภาพ", titleEn: "Health Policy and Quality Management", collegeCode: "CPAT", responsibleInstitutionId: "inst-chula", classification: "required", credits: 6, capacity: 30, enrolled: 22, status: "active" }),
  course({ id: "course-admin-403", code: "CPAT-403", titleTh: "ภาวะผู้นำและการจัดการการเปลี่ยนแปลง", titleEn: "Leadership and Change Management", collegeCode: "CPAT", responsibleInstitutionId: "inst-siriraj", classification: "general", credits: 6, capacity: 25, enrolled: 20, status: "active" }),
  course({ id: "course-admin-404", code: "CPAT-404", titleTh: "การบริหารเวชภัณฑ์และซัพพลายเชน", titleEn: "Medical Supply Chain Management", collegeCode: "CPAT", responsibleInstitutionId: "inst-siriraj", classification: "general", credits: 6, capacity: 25, enrolled: 19, status: "active" }),
  course({ id: "course-community-201", code: "วภช-201", titleTh: "การบริหารจัดการทางเภสัชกรรมชุมชน", titleEn: "Community Pharmacy Management", collegeCode: "วภช.", responsibleInstitutionId: "inst-siriraj", classification: "required", credits: 3, capacity: 30, enrolled: 25, status: "active" }),
  course({ id: "course-community-202", code: "วภช-202", titleTh: "นวัตกรรมระบบเภสัชกรรมชุมชน", titleEn: "Community Pharmacy Innovation", collegeCode: "วภช.", responsibleInstitutionId: "inst-chula", classification: "general", credits: 3, capacity: 25, enrolled: 20, status: "active" }),
  course({ id: "course-community-203", code: "วภช-203", titleTh: "การจัดการสุขภาพบุคคล ครอบครัว และชุมชน", titleEn: "Individual, Family and Community Health", collegeCode: "วภช.", responsibleInstitutionId: "inst-siriraj", classification: "required", credits: 3, capacity: 30, enrolled: 28, status: "active" }),
  course({ id: "course-community-204", code: "วภช-204", titleTh: "การสื่อสารเพื่อปรับพฤติกรรมสุขภาพ", titleEn: "Health Behavior Communication", collegeCode: "วภช.", responsibleInstitutionId: "inst-chula", classification: "general", credits: 3, capacity: 25, enrolled: 22, status: "active" }),
  course({ id: "course-herbal-501", code: "สม-501", titleTh: "การบริหารจัดการผลิตภัณฑ์สมุนไพร", titleEn: "Herbal Product Management", collegeCode: "สมุนไพร", responsibleInstitutionId: "inst-chula", classification: "required", credits: 6, capacity: 30, enrolled: 21, status: "active" }),
  course({ id: "course-herbal-502", code: "สม-502", titleTh: "การควบคุมคุณภาพสมุนไพร", titleEn: "Herbal Quality Control", collegeCode: "สมุนไพร", responsibleInstitutionId: "inst-chula", classification: "required", credits: 6, capacity: 30, enrolled: 18, status: "active" }),
  course({ id: "course-herbal-503", code: "สม-503", titleTh: "การขึ้นทะเบียนผลิตภัณฑ์สมุนไพร", titleEn: "Herbal Product Registration", collegeCode: "สมุนไพร", responsibleInstitutionId: "inst-siriraj", classification: "general", credits: 6, capacity: 25, enrolled: 17, status: "active" }),
  course({ id: "course-therapy-301", code: "วภท-301", titleTh: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง", titleEn: "Advanced Pharmacotherapy", collegeCode: "วภท.", responsibleInstitutionId: "inst-siriraj", classification: "required", credits: 12, capacity: 20, enrolled: 18, status: "active" }),
  course({ id: "course-therapy-302", code: "วภท-302", titleTh: "การประเมินผู้ป่วยข้างเตียง", titleEn: "Bedside Patient Assessment", collegeCode: "วภท.", responsibleInstitutionId: "inst-siriraj", classification: "required", credits: 12, capacity: 20, enrolled: 15, status: "active" }),
  course({ id: "course-therapy-303", code: "วภท-303", titleTh: "การพัฒนาโครงร่างวิจัยทางคลินิก", titleEn: "Clinical Research Proposal Development", collegeCode: "วภท.", responsibleInstitutionId: "inst-chula", classification: "required", credits: 12, capacity: 20, enrolled: 12, status: "active" }),
  course({ id: "course-therapy-304", code: "วภท-304", titleTh: "ความปลอดภัยด้านยาในผู้ป่วยซับซ้อน", titleEn: "Medication Safety in Complex Care", collegeCode: "วภท.", responsibleInstitutionId: "inst-ramathibodi", classification: "general", credits: 3, capacity: 24, enrolled: 16, status: "active" }),
  shortCourse({ id: "short-chronic-care", titleTh: "การดูแลผู้ป่วยโรคเรื้อรังสำหรับเภสัชกร", titleEn: "Chronic Care for Pharmacists", collegeCode: "วภท.", responsibleInstitutionId: "inst-siriraj", credits: 4, capacity: 35, enrolled: 28, duration: "4 เดือน", status: "active" }),
  shortCourse({ id: "short-pharmacy-leadership", titleTh: "ภาวะผู้นำสำหรับงานเภสัชกรรม", titleEn: "Leadership for Pharmacy Practice", collegeCode: "CPAT", responsibleInstitutionId: "inst-chula", credits: 3, capacity: 40, enrolled: 31, duration: "3 เดือน", status: "active" }),
  shortCourse({ id: "short-community-screening", titleTh: "การคัดกรองสุขภาพในร้านยา", titleEn: "Health Screening in Community Pharmacy", collegeCode: "วภช.", responsibleInstitutionId: "inst-siriraj", credits: 3, capacity: 30, enrolled: 26, duration: "3 เดือน", status: "active" }),
  shortCourse({ id: "short-herbal-safety", titleTh: "ความปลอดภัยของผลิตภัณฑ์สมุนไพร", titleEn: "Herbal Product Safety", collegeCode: "สมุนไพร", responsibleInstitutionId: "inst-chula", credits: 3, capacity: 30, enrolled: 19, duration: "4 เดือน", status: "active" }),
  shortCourse({ id: "short-regulatory-writing", titleTh: "การเขียนเอกสารกำกับผลิตภัณฑ์สุขภาพ", titleEn: "Regulatory Writing for Health Products", collegeCode: "วคบท.", responsibleInstitutionId: "inst-chula", credits: 3, capacity: 25, enrolled: 17, duration: "3 เดือน", status: "active" }),
];

export const courseCodeConfiguration = {
  collegePrefixes: COLLEGE_ABBREVIATIONS,
  typePrefixes: { required: "R", general: "G" },
  digits: 3,
} as const;

export function allocateCourseCode(collegeCode: CollegeCode, classification: CourseClassification, existingCodes: readonly string[] = courseCatalog.flatMap((item) => item.kind === "course" ? [item.code] : [])) {
  const prefix = `${courseCodeConfiguration.collegePrefixes[collegeCode]}-${courseCodeConfiguration.typePrefixes[classification]}-`;
  const used = new Set(existingCodes);
  let sequence = 1;
  while (used.has(`${prefix}${String(sequence).padStart(courseCodeConfiguration.digits, "0")}`)) sequence += 1;
  return `${prefix}${String(sequence).padStart(courseCodeConfiguration.digits, "0")}`;
}

export function groupCoursesByCollege(courses: readonly CourseDefinition[] = courseCatalog) {
  return COLLEGE_OPTIONS.map(({ value: collegeCode }) => ({ collegeCode, courses: courses.filter((item) => item.collegeCode === collegeCode) }));
}
