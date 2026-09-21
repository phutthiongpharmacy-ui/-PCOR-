// ══════════════════════════════════════════════════════
// Royal Pharmacy College Portal — Data
// แหล่งข้อมูลจริงจากเอกสารราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย
// ข้อมูลเริ่มต้นสำหรับส่วนที่ยังไม่มีแหล่งข้อมูลกลาง (ชื่อผู้เข้าศึกษา ฯลฯ)
//
// หมายเหตุ: ข้อมูล "ผู้ใช้ปัจจุบัน" ผูกกับ Single Source of Truth ที่ src/roles/shared/member/domain
// (currentMemberPassport) เพื่อให้ชื่อ/รหัส/ใบประกอบฯ/หน่วยกิต ตรงกันทุกหน้า
// ══════════════════════════════════════════════════════

import { currentMemberPassport as MEMBER } from "@/roles/shared/member/domain/member";
import type {
  EducationTimelineEntry,
  FinanceItemRecord,
  PaymentOwnerScope,
  RegistrationCourseRecord,
} from "@/roles/shared/features/student-records";

// ชื่อ-รหัสผู้ใช้ปัจจุบัน (derive จาก SSOT)
const meFullName = `${MEMBER.identity.titleTh}${MEMBER.identity.firstNameTh} ${MEMBER.identity.lastNameTh}`;
const meId = MEMBER.memberId;
const meLicense = MEMBER.license.licenseNumber;
const meCpdCredits = MEMBER.cpd.currentCredits;
const meCpdTarget = MEMBER.cpd.targetCredits;

// Payment records created before the member SSOT used either the license number
// or the old RPC mock ID. New records always use studentId; aliases stay read-only.
export const currentMemberPaymentOwner = {
  studentId: meId,
  legacyStudentIds: [meLicense, "RPC-2569-002"],
} satisfies PaymentOwnerScope;

export function resolveMockPaymentOwner(studentId: string): PaymentOwnerScope {
  const currentMemberIds = [
    currentMemberPaymentOwner.studentId,
    ...currentMemberPaymentOwner.legacyStudentIds,
  ];

  return currentMemberIds.includes(studentId)
    ? currentMemberPaymentOwner
    : { studentId };
}

// ===== Navigation =====
export const sidebarNavItems = [
  { href: "/member/dashboard", icon: "dashboard", label: "ภาพรวม" },
  { href: "/member/students", icon: "person", label: "ข้อมูลของฉัน" },
  { href: "/member/cpd", icon: "workspace_premium", label: "หน่วยกิต CPD" },
  { href: "/member/admission", icon: "quiz", label: "สมัครสอบ" },
  { href: "/member/programs", icon: "menu_book", label: "หลักสูตรและรายวิชา" },
  { href: "/member/registration", icon: "how_to_reg", label: "สถานะการลงทะเบียน" },
  { href: "/member/registration/courses", icon: "library_add", label: "ลงทะเบียนเรียน" },
  { href: "/member/finance", icon: "payments", label: "การเงิน" },
  { href: "/member/requests", icon: "description", label: "คำร้อง" },
  { href: "/member/news", icon: "campaign", label: "ข่าวสาร" },
];

// ===== ข้อมูลสถาบัน (REAL) =====
export const institutionInfo = {
  nameTh: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย",
  nameEn: "Royal College of Pharmacists of Thailand",
  parentOrg: "สภาเภสัชกรรม — The Pharmacy Council of Thailand",
  address: "สำนักงานเลขาธิการสภาเภสัชกรรม อาคารมหิตลาธิเบศร ชั้น 8 กระทรวงสาธารณสุข เลขที่ 88/19 หมู่ 4 ถนนติวานนท์ ตำบลตลาดขวัญ อำเภอเมือง จังหวัดนนทบุรี 11000",
  phone: "0-2591-9992",
  phoneExtensions: { "ราชวิทยาลัย": "กด 7", "วคบท.": "ต่อ 7", "CPAT": "ต่อ 208", "วภท.": "ต่อ 7" },
  emails: {
    general: "pharthai@pharmacycouncil.org",
    วคบท: "cphcp.th@gmail.com",
    CPAT: "cpat-academic@cpat.ac.th",
  },
  officialWebsite: "https://www.pharmacycouncil.org/",
};

// ===== Dashboard =====
export const dashboardData = {
  studentName: meFullName, // SSOT
  studentId: meId, // SSOT (แก้จากเดิม "นคบส-2568-001" ที่ไม่ตรงกับสาขา วภท.)
  creditsEarned: 18, // mock
  creditsTotal: 36, // mock
  trainingStatus: "กำลังฝึกอบรม",
  balanceDue: 20000,
  subjects: [
    { name: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง", progress: 50 },
    { name: "การสอบปากเปล่าข้างเตียงผู้ป่วย", progress: 30 },
    { name: "การสอบโครงร่างวิทยานิพนธ์", progress: 10 },
  ],
  creditsBreakdown: [
    { name: "วิชาบังคับ", value: 12, fill: "var(--color-chart-1)" },
    { name: "วิชาเลือก", value: 0, fill: "var(--color-chart-2)" },
    { name: "ฝึกปฏิบัติ", value: 12, fill: "var(--color-chart-3)" },
    { name: "วิทยานิพนธ์", value: 12, fill: "var(--color-chart-4)" },
  ],
  schedule: [
    { time: "09:00 - 12:00", course: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง", room: "BCP-101", code: "วภท-301" },
    { time: "13:00 - 16:00", course: "การสอบปากเปล่าข้างเตียงผู้ป่วย", room: "Ward 1", code: "วภท-302" },
    { time: "09:00 - 12:00", course: "การสอบโครงร่างวิทยานิพนธ์", room: "BCP-102", code: "วภท-303" },
  ],
  announcements: [
    { title: "กำหนดการสอบหนังสืออนุมัติฯ ภาคการศึกษาที่ 2/2568", date: "2026-06-20", category: "ประกาศสำคัญ" },
    { title: "เปิดรับสมัครผู้เข้ารับการฝึกอบรม Board Certified Pharmacotherapy รุ่นที่ 5", date: "2026-06-10", category: "ข่าวสาร" },
    { title: "ขอเชิญร่วมประชุมวิชาการประจำปี 2569 ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย", date: "2026-06-01", category: "กิจกรรม" },
  ],
};

// ===== Colleges (REAL names from origin docs) =====
export const colleges = {
  "วคบท.": {
    name: "วคบท.",
    fullName: "วิทยาลัยการคุ้มครองผู้บริโภคด้านยาและสุขภาพแห่งประเทศไทย",
    fullNameEn: "College of Pharmaceutical and Health Consumer Protection of Thailand",
    phone: "0-2591-9992 ต่อ 7",
    email: "cphcp.th@gmail.com",
  },
  "CPAT": {
    name: "CPAT",
    fullName: "วิทยาลัยการบริหารเภสัชกิจแห่งประเทศไทย",
    fullNameEn: "College of Pharmaceutical Administration of Thailand",
    phone: "0-2591-9992 ต่อ 208",
    email: "info@cpat.ac.th",
  },
  "วภช.": {
    name: "วภช.",
    fullName: "วิทยาลัยเภสัชกรรมชุมชนแห่งประเทศไทย",
    fullNameEn: "College of Community Pharmacy of Thailand",
    phone: "0-2591-9992",
    email: "info@cpat.ac.th",
  },
  "สมุนไพร": {
    name: "สมุนไพร",
    fullName: "วิทยาลัยเภสัชกรรมสมุนไพรแห่งประเทศไทย",
    fullNameEn: "College of Herbal Pharmacy of Thailand",
    phone: "0-2591-9992",
    email: "info@cpat.ac.th",
  },
  "วภท.": {
    name: "วภท.",
    fullName: "วิทยาลัยเภสัชบำบัดแห่งประเทศไทย",
    fullNameEn: "College of Pharmacotherapy of Thailand",
    phone: "0-2591-9992 ต่อ 7",
    email: "cphcp.th@gmail.com",
  },
};

// ===== Programs (REAL from origin docs) =====
export const programsData = [
  {
    id: 1,
    code: "วคบท-001",
    title: "หนังสืออนุมัติแสดงความรู้ความชำนาญในการประกอบวิชาชีพเภสัชกรรม สาขาการคุ้มครองผู้บริโภคด้านยาและสุขภาพ",
    college: "วคบท.",
    collegeFull: colleges["วคบท."].fullName,
    status: "active",
    description: "Board Certified in Pharmaceutical and Health Consumer Protection Training Program — หนังสืออนุมัติบัตรประจำตัวผู้มีความรู้ความชำนาญฯ 5 ปี",
    credits: 20,
    duration: "5 ปี (ต่ออายุได้)",
    students: 450,
    document: {
      fileName: "01-consumer-protection-authorization.pdf",
      url: "/documents/programs/01-consumer-protection-authorization.pdf",
    },
  },
  {
    id: 2,
    code: "CPAT-001",
    title: "วุฒิบัตรเป็นผู้มีความรู้ความชำนาญในการประกอบวิชาชีพเภสัชกรรม สาขาการบริหารเภสัชกิจ",
    college: "CPAT",
    collegeFull: colleges["CPAT"].fullName,
    status: "active",
    description: "หลักสูตรการฝึกอบรมระยะสั้น 4 หลักสูตร พร้อมสอบประเมินคุณสมบัติครบ 12 ด้าน ตามเกณฑ์วิทยาลัยการบริหารเภสัชกิจแห่งประเทศไทย",
    credits: 24,
    duration: "2-3 ปี",
    students: 120,
    document: {
      fileName: "02-pharmacy-administration-board.pdf",
      url: "/documents/programs/02-pharmacy-administration-board.pdf",
    },
  },
  {
    id: 3,
    code: "วภท-001",
    title: "วุฒิบัตรแสดงความรู้ความชำนาญในการประกอบวิชาชีพเภสัชกรรม สาขาเภสัชบำบัด (Board Certified Pharmacotherapy — BCP)",
    college: "วภท.",
    collegeFull: colleges["วภท."].fullName,
    status: "active",
    description: "หลักสูตรฝึกอบรม 3 ชั้นตอน: สอบข้อเขียน สอบปากเปล่าข้างเตียงผู้ป่วย และสอบโครงร่างวิทยานิพนธ์ ต้องมีประสบการณ์ดูแลผู้ป่วย ≥500 ชั่วโมง",
    credits: 36,
    duration: "2-3 ปี",
    students: 85,
    document: {
      fileName: "03-pharmacotherapy-board.pdf",
      url: "/documents/programs/03-pharmacotherapy-board.pdf",
    },
  },
  {
    id: 4,
    code: "วภช-001",
    title: "หนังสืออนุมัติเป็นผู้มีความรู้ความชำนาญในการประกอบวิชาชีพเภสัชกรรม สาขาเภสัชกรรมชุมชน",
    college: "วภช.",
    collegeFull: colleges["วภช."].fullName,
    status: "active",
    description: "ต้องมีประสบการณ์ทำงาน ≥15 ปี และประสบการณ์ด้านเภสัชกรรมชุมชน ≥10 ปี เลือกสอบ 2 ใน 4 ด้าน พร้อมผลงานวิชาการตามเกณฑ์",
    credits: 0,
    duration: "ประเมินตามเกณฑ์",
    students: 280,
    document: {
      fileName: "04-community-pharmacy-authorization.pdf",
      url: "/documents/programs/04-community-pharmacy-authorization.pdf",
    },
  },
  {
    id: 5,
    code: "สมุนไพร-001",
    title: "ประกาศนียบัตรวิชาชีพเภสัชกรรม สาขาการบริหารจัดการผลิตภัณฑ์สมุนไพร",
    college: "สมุนไพร",
    collegeFull: colleges["สมุนไพร"].fullName,
    status: "inactive",
    description: "หลักสูตรการบริหารจัดการผลิตภัณฑ์สมุนไพรสำหรับเภสัชกร",
    credits: 18,
    duration: "1-2 ปี",
    students: 150,
    document: {
      fileName: "05-herbal-product-management-certificate.pdf",
      url: "/documents/programs/05-herbal-product-management-certificate.pdf",
    },
  },
];

// ===== All Courses (REAL course names from origin docs) =====
export const allCoursesData = [
  { code: "วคบท-101", title: "ความชำนาญทางระบาดวิทยาเพื่อการคุ้มครองผู้บริโภค", credits: 4, capacity: 40, enrolled: 38, college: "วคบท.", status: "active" },
  { code: "วคบท-102", title: "ความชำนาญด้านการบังคับใช้กฎหมายเพื่อคุ้มครองผู้บริโภค", credits: 4, capacity: 35, enrolled: 35, college: "วคบท.", status: "inactive" },
  { code: "วคบท-103", title: "ความชำนาญด้านการวิเคราะห์การจัดการความเสี่ยงในงานคุ้มครองผู้บริโภค", credits: 4, capacity: 30, enrolled: 28, college: "วคบท.", status: "active" },
  { code: "วคบท-104", title: "ความชำนาญด้านการทำงานคุ้มครองผู้บริโภคในชุมชน", credits: 4, capacity: 35, enrolled: 30, college: "วคบท.", status: "active" },
  { code: "วคบท-105", title: "ความชำนาญด้านนโยบายและการบริหารระบบยาเพื่อคุ้มครองผู้บริโภค", credits: 4, capacity: 35, enrolled: 32, college: "วคบท.", status: "active" },
  { code: "วภช-201", title: "ด้านการบริหารจัดการทางเภสัชกรรมชุมชน", credits: 3, capacity: 30, enrolled: 25, college: "วภช.", status: "active" },
  { code: "วภช-202", title: "ด้านการคิดค้นออกแบบนวัตกรรมระบบการบริหารจัดการทางเภสัชกรรมชุมชน", credits: 3, capacity: 25, enrolled: 20, college: "วภช.", status: "active" },
  { code: "วภช-203", title: "ด้านการจัดการสุขภาพในระดับบุคคล ครอบครัว และชุมชน", credits: 3, capacity: 30, enrolled: 28, college: "วภช.", status: "active" },
  { code: "วภช-204", title: "ด้านการสื่อสารปรับเปลี่ยนพฤติกรรมเสี่ยงด้านสุขภาพและการใช้ยา", credits: 3, capacity: 25, enrolled: 22, college: "วภช.", status: "active" },
  { code: "วภท-301", title: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง (สอบข้อเขียน)", credits: 12, capacity: 20, enrolled: 18, college: "วภท.", status: "active" },
  { code: "วภท-302", title: "การสอบปากเปล่าข้างเตียงผู้ป่วย (Bedside Examination)", credits: 12, capacity: 20, enrolled: 15, college: "วภท.", status: "active" },
  { code: "วภท-303", title: "การสอบโครงร่างวิทยานิพนธ์ (Thesis Proposal Examination)", credits: 12, capacity: 20, enrolled: 12, college: "วภท.", status: "active" },
];

// ===== College Programs (by college) =====
export const collegeProgramsData = [
  {
    name: "วคบท.",
    fullName: colleges["วคบท."].fullName,
    programs: 1, courses: 5, students: 450,
    expanded: false,
    courseList: [
      { code: "วคบท-101", name: "ความชำนาญทางระบาดวิทยาเพื่อการคุ้มครองผู้บริโภค", credits: 4, status: "active" },
      { code: "วคบท-102", name: "ความชำนาญด้านการบังคับใช้กฎหมายเพื่อคุ้มครองผู้บริโภค", credits: 4, status: "active" },
      { code: "วคบท-103", name: "ความชำนาญด้านการวิเคราะห์การจัดการความเสี่ยงในงานคุ้มครองผู้บริโภค", credits: 4, status: "active" },
      { code: "วคบท-104", name: "ความชำนาญด้านการทำงานคุ้มครองผู้บริโภคในชุมชน", credits: 4, status: "active" },
      { code: "วคบท-105", name: "ความชำนาญด้านนโยบายและการบริหารระบบยาเพื่อคุ้มครองผู้บริโภค", credits: 4, status: "active" },
    ],
  },
  {
    name: "CPAT",
    fullName: colleges["CPAT"].fullName,
    programs: 1, courses: 4, students: 120,
    expanded: true,
    courseList: [
      { code: "CPAT-401", name: "การบริหารระบบยาและเภสัชเศรษฐศาสตร์", credits: 6, status: "active" },
      { code: "CPAT-402", name: "นโยบายสุขภาพและการจัดการคุณภาพ", credits: 6, status: "active" },
      { code: "CPAT-403", name: "ภาวะผู้นำและการจัดการการเปลี่ยนแปลง", credits: 6, status: "active" },
      { code: "CPAT-404", name: "การบริหารเวชภัณฑ์และซัพพลายเชน", credits: 6, status: "active" },
    ],
  },
  {
    name: "วภช.",
    fullName: colleges["วภช."].fullName,
    programs: 1, courses: 4, students: 280,
    expanded: false,
    courseList: [
      { code: "วภช-201", name: "ด้านการบริหารจัดการทางเภสัชกรรมชุมชน", credits: 3, status: "active" },
      { code: "วภช-202", name: "ด้านการคิดค้นออกแบบนวัตกรรมระบบการบริหารจัดการ", credits: 3, status: "active" },
      { code: "วภช-203", name: "ด้านการจัดการสุขภาพในระดับบุคคล ครอบครัว และชุมชน", credits: 3, status: "active" },
      { code: "วภช-204", name: "ด้านการสื่อสารปรับเปลี่ยนพฤติกรรมเสี่ยง", credits: 3, status: "active" },
    ],
  },
  {
    name: "สมุนไพร",
    fullName: colleges["สมุนไพร"].fullName,
    programs: 1, courses: 3, students: 150,
    expanded: false,
    courseList: [
      { code: "สม-501", name: "การบริหารจัดการผลิตภัณฑ์สมุนไพร", credits: 6, status: "active" },
      { code: "สม-502", name: "การควบคุมคุณภาพสมุนไพร", credits: 6, status: "active" },
      { code: "สม-503", name: "การขึ้นทะเบียนผลิตภัณฑ์สมุนไพร", credits: 6, status: "active" },
    ],
  },
  {
    name: "วภท.",
    fullName: colleges["วภท."].fullName,
    programs: 2, courses: 3, students: 85,
    expanded: false,
    courseList: [
      { code: "วภท-301", name: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง (สอบข้อเขียน)", credits: 12, status: "active" },
      { code: "วภท-302", name: "การสอบปากเปล่าข้างเตียงผู้ป่วย (Bedside Exam)", credits: 12, status: "active" },
      { code: "วภท-303", name: "การสอบโครงร่างวิทยานิพนธ์ (Thesis Proposal)", credits: 12, status: "active" },
    ],
  },
];

// ===== ผู้เข้าศึกษา (mock names, real structure) =====
export const studentsData = [
  { id: meId, name: meFullName, college: "วภท.", status: "active", batch: 4, cpdCredits: meCpdCredits, cpdTarget: meCpdTarget, email: MEMBER.identity.email, phone: MEMBER.identity.phone },
  { id: "CPAT-2568-002", name: "นายโรนัลโด ซุยส์", college: "CPAT", status: "active", batch: 5, cpdCredits: 30, cpdTarget: 100, email: "somchai.r@example.com", phone: "082-345-6789" },
  { id: "วภช-2568-003", name: "นางสาวพิมพ์ใจ ตั้งใจเรียน", college: "วภช.", status: "leave", batch: 3, cpdCredits: 85, cpdTarget: 100, email: "pimjai.t@example.com", phone: "083-456-7890" },
  { id: "วภท-2568-004", name: "นายวิชัย พัฒนากุล", college: "วภท.", status: "active", batch: 4, cpdCredits: 72, cpdTarget: 100, email: "wichai.p@example.com", phone: "084-567-8901" },
];

// ===== รายละเอียดผู้เข้าศึกษา (mock person, real institutional fields) =====
export const studentDetailData = {
  name: meFullName, // SSOT
  nameEn: "Somchai Jaidee",
  dob: "11 เมษายน 2543",
  nationality: "ไทย",
  religion: "พุทธ",
  address: "123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
  id: meId,
  licenseNumber: meLicense,
  college: colleges["วภท."].fullName,
  collegeShort: "วภท.",
  program: "วุฒิบัตรแสดงความรู้ความชำนาญในการประกอบวิชาชีพเภสัชกรรม สาขาเภสัชบำบัด (BCP)",
  trainingYear: "2568",
  batch: 4,
  cpdCredits: meCpdCredits, // SSOT
  cpdTarget: meCpdTarget, // SSOT
  creditsEarned: 18, // mock
  creditsTotal: 36, // mock
  status: "active" as const,
  trainingStatus: "normal" as const,
  registeredCourses: 3,
  educationTimeline: [
    {
      degree: "วุฒิบัตรเภสัชบำบัด (BCP กำลังฝึกอบรม)",
      field: "เภสัชกรรมบำบัด",
      institution: "วิทยาลัยเภสัชบำบัดแห่งประเทศไทย",
      parentInstitution: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย",
      period: "2568 - ปัจจุบัน",
      isCurrent: true,
      qualificationType: "specialty_training",
      trainingStatus: "normal",
    },
    {
      degree: "หลักสูตรฝึกอบรมด้านการดูแลผู้ป่วยโรคเรื้อรัง",
      field: "การบริบาลทางเภสัชกรรม",
      institution: "วิทยาลัยเภสัชบำบัดแห่งประเทศไทย",
      parentInstitution: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย",
      period: "2569 - ปัจจุบัน",
      isCurrent: true,
      qualificationType: "short_course",
      trainingStatus: "maintaining",
    },
    {
      degree: "หลักสูตรฝึกอบรมระยะสั้นด้านการบริหารเภสัชกิจ",
      field: "การบริหารเภสัชกิจ",
      institution: "วิทยาลัยการบริหารเภสัชกิจแห่งประเทศไทย",
      parentInstitution: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย",
      period: "2567",
      isCurrent: false,
      qualificationType: "short_course",
      trainingStatus: "completed",
    },
    {
      degree: "หลักสูตรฝึกอบรมระยะสั้นด้านเภสัชสารสนเทศ",
      field: "เภสัชสารสนเทศ",
      institution: "วิทยาลัยเภสัชกรรมชุมชนแห่งประเทศไทย",
      parentInstitution: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย",
      period: "2566",
      isCurrent: false,
      qualificationType: "short_course",
      trainingStatus: "resigned",
    },
    {
      degree: "เภสัชศาสตรบัณฑิต (ภ.บ.)",
      field: "เภสัชศาสตร์",
      institution: "คณะเภสัชศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย",
      parentInstitution: "จุฬาลงกรณ์มหาวิทยาลัย",
      period: "2558 - 2564",
      isCurrent: false,
      qualificationType: "degree",
      trainingStatus: "completed",
    },
  ] satisfies EducationTimelineEntry[],
};

// ===== Registration =====
export const registrationData = {
  deadline: "30 มิถุนายน 2569",
  selectedCourses: 3,
  maxCourses: 3,
  selectedCredits: 36,
  maxCredits: 36,

  courses: [
    {
      code: "วภท-301",
      title: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง (สอบข้อเขียน)",
      credits: 12,
      schedule: "จันทร์ 09:00-12:00",
      room: "ห้อง BCP-101",
      capacity: 20,
      enrolled: 18,
      status: "registered",
      enrollmentStatus: "registered",
      billingStatus: "overdue",
      slipReviewStatus: "not_submitted",
    },
    {
      code: "วภท-302",
      title: "การสอบปากเปล่าข้างเตียงผู้ป่วย (Bedside Examination)",
      credits: 12,
      schedule: "อังคาร 09:00-12:00",
      room: "Ward 1",
      capacity: 20,
      enrolled: 15,
      status: "registered",
      enrollmentStatus: "registered",
      billingStatus: "paid",
      slipReviewStatus: "approved",
    },
    {
      code: "วภท-303",
      title: "การสอบโครงร่างวิทยานิพนธ์ (Thesis Proposal)",
      credits: 12,
      schedule: "พุธ 13:00-16:00",
      room: "ห้อง BCP-102",
      capacity: 20,
      enrolled: 12,
      status: "registered",
      enrollmentStatus: "registered",
      billingStatus: "awaiting_payment",
      slipReviewStatus: "pending_review",
    },
  ] satisfies RegistrationCourseRecord[],
};

// ===== Finance (REAL bank accounts + fees from origin docs) =====
export const financeData = {
  totalFees: 23000,
  outstandingBalance: 20500,
  items: [
    {
      id: 1,
      description: "ค่าลงทะเบียนฝึกอบรม ประจำปี 2569",
      amount: 20000,
      dueDate: "30 มิ.ย. 2569",
      status: "unpaid",
      billingStatus: "overdue",
      slipReviewStatus: "not_submitted",
    },
    {
      id: 2,
      description: "ค่าสมัครสอบหนังสืออนุมัติ",
      amount: 2500,
      dueDate: "15 ส.ค. 2569",
      status: "paid",
      billingStatus: "paid",
      slipReviewStatus: "approved",
    },
    {
      id: 3,
      description: "ค่าลงทะเบียนแรกเข้า",
      amount: 500,
      dueDate: "15 ส.ค. 2569",
      status: "pending",
      billingStatus: "awaiting_payment",
      slipReviewStatus: "pending_review",
    },
  ] satisfies FinanceItemRecord[],
  bankAccounts: [
    { bank: "ธนาคารไทยพาณิชย์", bankEn: "SCB", branch: "สาขาสยามสแควร์", accountNumber: "038-461658-1", accountName: "วิทยาลัยคุ้มครองผู้บริโภคด้านยาฯ" },
    { bank: "ธนาคารกรุงไทย", bankEn: "KTB", branch: "สาขากระทรวงสาธารณสุข", accountNumber: "142-1-06705-6", accountName: "สภาเภสัชกรรม" },
    { bank: "ธนาคารไทยพาณิชย์", bankEn: "SCB", branch: "สาขาย่อยกระทรวงสาธารณสุข", accountNumber: "340-2-01454-8", accountName: "สภาเภสัชกรรม" },
  ],
};

// ===== Requests =====
export const requestsData = [
  { id: "จ.1-2569-001", type: "คำร้องทั่วไป", title: "ขอเปลี่ยนแปลงข้อมูลส่วนตัว", date: "15 ม.ค. 2569", status: "approved", progress: ["เจ้าหน้าที่ ✓", "หัวหน้าสาขา ✓", "เสร็จสิ้น ✓"] },
  { id: "ง.1-2569-002", type: "การเงิน", title: "ขอผ่อนผันชำระค่าลงทะเบียน", date: "20 ม.ค. 2569", status: "pending", progress: ["เจ้าหน้าที่ ✓", "ผู้อำนวยการวิทยาลัย ◷", "เสร็จสิ้น"] },
  { id: "อ.1-2569-003", type: "เอกสารสำคัญ", title: "ขอหนังสือรับรองการเป็นผู้เข้าศึกษา", date: "25 ม.ค. 2569", status: "pending", progress: ["เจ้าหน้าที่ ◷", "หัวหน้าสาขา", "เสร็จสิ้น"] },
  { id: "จ.1-2569-004", type: "คำร้องทั่วไป", title: "ขอเปลี่ยนสาขาวิชา", date: "10 ธ.ค. 2568", status: "rejected", progress: ["เจ้าหน้าที่ ✓", "หัวหน้าสาขา ✗", "เสร็จสิ้น"] },
];

// ===== Request Types (REAL categories from origin docs) =====
export const requestTypesData = [
  { id: "จ.1", name: "คำร้องทั่วไป", active: true, description: "คำร้องขอเปลี่ยนแปลงข้อมูล, ขอเอกสาร, อื่นๆ" },
  { id: "ง.1", name: "การเงิน", active: true, description: "คำร้องขอผ่อนผัน, ขอลดหย่อน, ขอคืนเงิน" },
  { id: "อ.1", name: "เอกสารสำคัญ", active: true, description: "หนังสือรับรอง, ใบประมวลผลการศึกษา, สำเนาเอกสาร" },
  { id: "สมัคร", name: "สมัครสอบหนังสืออนุมัติ", active: true, description: "สมัครสอบ Board Certification ทุกสาขา" },
];

// ===== Real Document Requirements (from origin docs) =====
export const documentRequirements = [
  "ใบสมัครติดรูปถ่ายขนาด 1 นิ้ว จำนวน 1 ชุด",
  "สำเนาใบปริญญาบัตร / หนังสือรับรองว่ากำลังศึกษาภาคการศึกษาสุดท้าย",
  "สำเนาใบประกอบวิชาชีพเภสัชกรรม",
  "ใบประมวลผลการศึกษา (Transcript) ทุกระดับ",
  "สำเนาใบทะเบียนสมรส / ใบเปลี่ยนชื่อ-สกุล (ถ้ามี)",
  "หนังสือรับรองการศึกษาและคุณสมบัติ (Recommendation) 1-3 ท่าน",
  "Curriculum Vitae (CV)",
  "หนังสืออนุญาตจากต้นสังกัด",
  "หลักฐานการจ่ายค่าสมัคร",
];

// ===== Real Evaluation Criteria (from CPAT/วภท. forms) =====
export const evaluationCriteria = [
  "ระดับสติปัญญา",
  "ความสามารถในการเรียนหรือปฏิบัติงาน",
  "ความอุตสาหะ",
  "ความรับผิดชอบ",
  "การคิดวิเคราะห์และการแก้ไขปัญหา",
  "การทำงานร่วมกับผู้อื่น",
  "ความเป็นผู้นำ",
  "ความคิดริเริ่มสร้างสรรค์",
  "ความมีมนุษย์สัมพันธ์",
  "ความมั่นคงทางอารมณ์และความเป็นผู้ใหญ่",
  "ความกระตือรือร้นในการเรียน/การทำงาน",
  "ความสนใจใฝ่หาความรู้ด้วยตนเอง",
];

export const evaluationScale = [
  { score: 5, label: "ดีเยี่ยม" },
  { score: 4, label: "ดี" },
  { score: 3, label: "ปานกลาง" },
  { score: 2, label: "ไม่เป็นที่พอใจ" },
  { score: 1, label: "ไม่สามารถให้ความเห็นได้" },
];

// ===== Affiliated Pharmacy Faculties (REAL from origin docs) =====
export const affiliatedFaculties = [
  "คณะเภสัชศาสตร์ มหาวิทยาลัยนเรศวร",
  "คณะเภสัชศาสตร์ มหาวิทยาลัยสงขลานครินทร์",
  "คณะเภสัชศาสตร์ มหาวิทยาลัยขอนแก่น",
  "คณะเภสัชศาสตร์ มหาวิทยาลัยมหิดล",
  "คณะเภสัชศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย",
  "คณะเภสัชศาสตร์ มหาวิทยาลัยศิลปากร",
  "คณะเภสัชศาสตร์ มหาวิทยาลัยเชียงใหม่",
  "คณะเภสัชศาสตร์ มหาวิทยาลัยธรรมศาสตร์",
  "คณะเภสัชศาสตร์ มหาวิทยาลัยอุบลราชธานี",
];

// ===== Legal References (REAL from origin docs) =====
export const legalReferences = [
  "ข้อบังคับสภาเภสัชกรรม ว่าด้วยการจัดตั้งการรับรองวิทยฐานะ การดำเนินการ และการเลิกสถาบันที่ทำการฝึกอบรมเป็นผู้ชำนาญการในสาขาต่างๆ ของวิชาชีพเภสัชกรรม พ.ศ.2543",
  "ประกาศวิทยาลัยการบริหารเภสัชกิจแห่งประเทศไทยที่ 2/2565 เรื่อง หลักเกณฑ์การรับรองสถาบันหลักและสถาบันสมทบ",
];

// ===== News (mixed real events + mock) =====
export const newsData = [
  { id: 1, title: "ประกาศรายชื่อผู้มีสิทธิ์สอบหนังสืออนุมัติฯ รุ่นที่ 4/2569", date: "15 มิ.ย. 2569", category: "ประกาศสำคัญ", categoryColor: "red" as const, excerpt: "ประกาศรายชื่อผู้มีสิทธิ์สอบหนังสืออนุมัติแสดงความรู้ความชำนาญในการประกอบวิชาชีพเภสัชกรรม สาขาการคุ้มครองผู้บริโภคด้านยาและสุขภาพ รุ่นที่ 4 ประจำปี 2569", target: "ผู้สมัครสอบ วคบท.", views: 1245, hasAttachment: true, image: "/images/assets/service/service1.jpg" },
  { id: 2, title: "ขอเชิญร่วมประชุมวิชาการนานาชาติด้านเภสัชศาสตร์ 2569", date: "10 มิ.ย. 2569", category: "วิชาการ", categoryColor: "purple" as const, excerpt: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย ขอเชิญชวนเภสัชกรและบุคลากรทางการแพทย์เข้าร่วมงานประชุมวิชาการนานาชาติ", target: "เภสัชกรทุกสาขา", views: 876, hasAttachment: false, image: "/images/assets/meeting/meeting1.jpg" },
  { id: 3, title: "แจ้งกำหนดการชำระค่าลงทะเบียน ประจำปี 2569", date: "5 มิ.ย. 2569", category: "การเงิน", categoryColor: "gold" as const, excerpt: "กำหนดการชำระค่าลงทะเบียนฝึกอบรมประจำปี 2569 ทุกวิทยาลัย", target: "ผู้เข้าศึกษาทุกรุ่น", views: 2340, hasAttachment: true, image: "/images/assets/tuition.png" },
  { id: 4, title: "เปิดรับสมัคร Board Certified Pharmacotherapy (BCP) รุ่นที่ 5", date: "1 มิ.ย. 2569", category: "กิจกรรม", categoryColor: "green" as const, excerpt: "วิทยาลัยเภสัชบำบัดแห่งประเทศไทย เปิดรับสมัครผู้เข้ารับการฝึกอบรมเป็นผู้มีความรู้ความชำนาญฯ สาขาเภสัชบำบัด รุ่นที่ 5", target: "เภสัชกรผู้สนใจ", views: 3456, hasAttachment: true, image: "/images/assets/meeting/meeting2.jpg" },
];

// ===== Reports =====
export const reportsData = {
  metrics: { totalTrainees: 1085, activeRegistrations: 950, ytdRevenue: 27500000, pendingRequests: 34 },
};

// ===== CPD Data =====
export const cpdData = {
  currentCredits: 65,
  targetCredits: 100,
  expiryDate: "30 กันยายน 2570",
  timeLeft: "1 ปี 3 เดือน",
  breakdown: [
    { category: "ประชุมวิชาการ", value: 40, fill: "var(--color-chart-1)" },
    { category: "เรียนออนไลน์ (e-Learning)", value: 15, fill: "var(--color-chart-2)" },
    { category: "เขียนบทความทางวิชาการ", value: 10, fill: "var(--color-chart-3)" },
    { category: "เป็นวิทยากร", value: 0, fill: "var(--color-chart-4)" },
  ],
  history: [
    { id: 1, title: "เข้าร่วมประชุมวิชาการประจำปี สภาเภสัชกรรม", date: "15 พ.ค. 2569", credits: 15, category: "ประชุมวิชาการ" },
    { id: 2, title: "ทำแบบทดสอบ e-learning แนวทางการรักษาโรคไข้เลือดออก", date: "2 เม.ย. 2569", credits: 2, category: "e-Learning" },
    { id: 3, title: "ตีพิมพ์บทความวิชาการ เรื่อง ระบาดวิทยาในชุมชน", date: "10 มี.ค. 2569", credits: 10, category: "เขียนบทความ" },
    { id: 4, title: "ประชุมวิชาการนานาชาติ FAPA 2025", date: "20 พ.ย. 2568", credits: 20, category: "ประชุมวิชาการ" },
  ],
  recommended: [
    { 
      id: 1, 
      title: "การประชุมนานาชาติด้านเภสัชศาสตร์ 2569", 
      credits: 15, 
      date: "10-12 มิ.ย. 2569", 
      type: "ประชุม", 
      url: "#",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
      description: "งานประชุมวิชาการนานาชาติประจำปี รวบรวมองค์ความรู้ด้านเภสัชกรรมล่าสุดจากผู้เชี่ยวชาญทั่วโลก เหมาะสำหรับเภสัชกรทุกสาขาที่ต้องการอัปเดตเทรนด์ใหม่ๆ ด้านการบริบาลทางเภสัชกรรม"
    },
    { 
      id: 2, 
      title: "อัปเดตแนวทางการรักษาเบาหวาน 2026", 
      credits: 3, 
      date: "เรียนได้ตลอดเวลา", 
      type: "e-Learning", 
      url: "#",
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
      description: "คอร์สออนไลน์สรุปแนวทางการรักษาเบาหวานฉบับล่าสุด (Guidelines 2026) เจาะลึกการใช้ยากลุ่มใหม่และการจัดการผลข้างเคียงผ่านกรณีศึกษาผู้ป่วยจริง"
    },
    { 
      id: 3, 
      title: "Pharmacogenomics in Clinical Practice", 
      credits: 5, 
      date: "เรียนได้ตลอดเวลา", 
      type: "e-Learning", 
      url: "#",
      image: "https://images.unsplash.com/photo-1532187863486-abf9db090b2b?w=800&q=80",
      description: "ทำความเข้าใจหลักการเภสัชพันธุศาสตร์ (Pharmacogenomics) เพื่อการรักษาและจ่ายยาเฉพาะบุคคล (Precision Medicine) พร้อมวิธีประเมินผล Lab ทางพันธุกรรมเบื้องต้น"
    },
  ]
};

// ===== Profile / Admission Mock Data =====
export const profileData = {
  personalInfo: {
    title: MEMBER.identity.titleTh,
    firstName: MEMBER.identity.firstNameTh,
    lastName: MEMBER.identity.lastNameTh,
    firstNameEn: MEMBER.identity.firstNameEn,
    lastNameEn: MEMBER.identity.lastNameEn,
    licenseNumber: meLicense,
    licenseIssueDate: "15 เม.ย. 2565",
    birthDate: "11 เม.ย. 2543",
    age: 26,
    nationality: MEMBER.identity.nationality,
    maritalStatus: "โสด",
    email: MEMBER.identity.email,
    phone: MEMBER.identity.phone,
    address: "123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
  },
  workHistory: {
    status: "พนักงานเอกชน",
    currentWorkplace: "โรงพยาบาลศิริราช",
    position: "เภสัชกรคลินิก",
    level: "ปฏิบัติการ",
    workplacePhone: "02-123-4567 ต่อ 89",
    responsibilities: "ดูแลการจ่ายยาผู้ป่วยใน (IPD) และให้คำปรึกษาด้านการใช้ยาแก่ผู้ป่วยโรคเรื้อรัง",
    previousJobs: [
      { year: "2565-2566", position: "เภสัชกรร้านยา", workplace: "ร้านยา Health Plus" }
    ]
  },
  education: {
    bachelors: {
      degree: "เภสัชศาสตรบัณฑิต",
      institution: "จุฬาลงกรณ์มหาวิทยาลัย",
      graduationYear: "2565",
      gpa: "3.85"
    },
    others: []
  },
  research: {
    publications: [
      { title: "ผลของการให้คำปรึกษาด้านยาในผู้ป่วยเบาหวานชนิดที่ 2", year: "2566" }
    ],
    projects: [
      { title: "การติดตามความร่วมมือในการใช้ยาของผู้ป่วยความดันโลหิตสูง", role: "ผู้ร่วมวิจัย", period: "ม.ค. - ธ.ค. 2566" }
    ],
    interest: "เภสัชบำบัดในผู้ป่วยโรคหัวใจและหลอดเลือด"
  }
};

export const notificationsData = [
  { id: 1, title: 'การเงิน', message: 'ใกล้ถึงกำหนดชำระค่าลงทะเบียนเรียนภาคการศึกษา 1/2569', time: '2 ชั่วโมงที่แล้ว', isRead: false, type: 'warning' },
  { id: 2, title: 'คำร้อง', message: 'คำร้องขอเปลี่ยนแปลงข้อมูลส่วนตัวของคุณได้รับการอนุมัติแล้ว', time: '1 วันที่แล้ว', isRead: false, type: 'success' },
  { id: 3, title: 'ประกาศ', message: 'เปิดรับสมัคร Board Certified Pharmacotherapy (BCP) รุ่นที่ 5', time: '3 วันที่แล้ว', isRead: true, type: 'info' }
];

// ===== Learning Pathway (derived from profile + program data) =====
export type PathwayStepStatus = "completed" | "current" | "recommended";
export type PathwayStepType = "education" | "certification" | "experience" | "milestone";

export interface PathwayStep {
  id: string;
  type: PathwayStepType;
  status: PathwayStepStatus;
  title: string;
  subtitle: string;
  period?: string;
  icon: string;
  details?: string;
  reason?: string;
  progress?: number;
  creditsEarned?: number;
  creditsTotal?: number;
  substeps?: { name: string; status: "done" | "in_progress" | "not_started"; progress: number }[];
  richDetails?: {
    source: string;
    info: string;
    url?: string;
  };
}

export const pathwayData: PathwayStep[] = [
  // ══════════════════════════════════════
  // ── กำลังศึกษา ──
  // ══════════════════════════════════════
  {
    id: "atmp-training",
    type: "certification",
    status: "current",
    title: "หลักสูตรผู้เชี่ยวชาญเฉพาะทาง (ATMPs)",
    subtitle: "Advanced Therapy Medicinal Products",
    period: `${studentDetailData.trainingYear} - ปัจจุบัน`,
    icon: "science",
    progress: Math.round((dashboardData.creditsEarned / dashboardData.creditsTotal) * 100),
    creditsEarned: dashboardData.creditsEarned,
    creditsTotal: dashboardData.creditsTotal,
    substeps: dashboardData.subjects.map((s) => ({
      name: s.name,
      status: s.progress >= 100 ? "done" as const : s.progress > 0 ? "in_progress" as const : "not_started" as const,
      progress: s.progress,
    })),
  },

  // ══════════════════════════════════════
  // ── แนะนำถัดไป ──
  // ══════════════════════════════════════
  {
    id: "rec-gmp-atmp",
    type: "certification",
    status: "recommended",
    title: "อบรมหลักสูตร GMP for ATMPs",
    subtitle: "Good Manufacturing Practice เฉพาะสำหรับผลิตภัณฑ์การแพทย์ขั้นสูง",
    icon: "verified",
    reason: "การผลิตและการควบคุมคุณภาพของ ATMPs มีมาตรฐานเฉพาะเจาะจง การผ่านการอบรมนี้จะช่วยเพิ่มศักยภาพในการจัดการยาและเซลล์บำบัด",
    richDetails: {
      source: "อ้างอิงจาก: คณะเภสัชศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย และ กองยา อย.",
      info: "หลักสูตรอบรมเชิงปฏิบัติการเพื่อพัฒนาศักยภาพผู้ปฏิบัติงานด้าน ATMP Manufacturing ตามมาตรฐาน PIC/S GMP ผู้ผ่านการอบรมจะได้รับประกาศนียบัตรรับรอง และสามารถสะสมหน่วยกิต CPD ได้ 15 หน่วยกิต (ติดตามการเปิดรับสมัครผ่านระบบ CCPE)",
      url: "https://ccpe.pharmacycouncil.org/"
    }
  },
  {
    id: "rec-cgt-fellowship",
    type: "education",
    status: "recommended",
    title: "ศึกษาดูงานด้าน Cell & Gene Therapy (CGT)",
    subtitle: "ศูนย์ความเป็นเลิศทางการแพทย์ด้านเซลล์บำบัด",
    icon: "biotech",
    reason: "ต่อยอดทักษะภาคปฏิบัติในการเตรียมและบริหารจัดการผลิตภัณฑ์เซลล์บำบัด ซึ่งเป็นทักษะที่ขาดแคลนและเป็นที่ต้องการสูง",
    richDetails: {
      source: "อ้างอิงจาก: ศูนย์ความเป็นเลิศทางการแพทย์ด้านผลิตภัณฑ์การแพทย์ขั้นสูง (EC-ATMPs) รพ.จุฬาลงกรณ์",
      info: "โครงการศึกษาดูงานระยะสั้น (Short-course Fellowship) เพื่อเรียนรู้กระบวนการผลิตเซลล์บำบัด (CAR-T cells) ในห้องปฏิบัติการคลีนรูมระดับสากล เหมาะสำหรับเภสัชกรที่ต้องการต่อยอดทักษะเฉพาะทาง",
      url: "https://chulalongkornhospital.go.th/"
    }
  },
  {
    id: "rec-research-precision",
    type: "milestone",
    status: "recommended",
    title: "ตีพิมพ์วิจัยด้าน Pharmacogenomics & ATMPs",
    subtitle: "การนำไปประยุกต์ใช้ในการรักษาแบบจำเพาะบุคคล (Precision Medicine)",
    icon: "article",
    reason: "จากหัวข้อที่คุณกำลังศึกษา การตีพิมพ์ผลงานวิจัยในด้านนี้จะช่วยสร้างเครือข่ายระดับนานาชาติและยกระดับความน่าเชื่อถือในสายวิชาการ",
    richDetails: {
      source: "อ้างอิงจาก: ศูนย์ความเป็นเลิศด้านชีววิทยาศาสตร์ (TCELS)",
      info: "TCELS สนับสนุนทุนวิจัยด้าน Pharmacogenomics และ ATMPs เป็นประจำทุกปี เพื่อส่งเสริมการพัฒนานวัตกรรมการแพทย์แม่นยำในประเทศไทย การตีพิมพ์ผลงานจะช่วยเพิ่มโอกาสรับทุนสนับสนุนต่อเนื่อง",
      url: "https://www.tcels.or.th/"
    }
  },
  {
    id: "rec-intl-network",
    type: "milestone",
    status: "recommended",
    title: "เข้าร่วมเครือข่าย International ATMP Working Group",
    subtitle: "เครือข่ายความร่วมมือระดับนานาชาติด้านการรักษาด้วยเซลล์และยีน",
    icon: "public",
    reason: "เพื่อติดตามแนวโน้มการรักษาแบบก้าวกระโดด และร่วมกำหนดมาตรฐานหรือทิศทางของการจัดการ ATMPs ในระดับภูมิภาค",
    richDetails: {
      source: "อ้างอิงจาก: International Society for Cell & Gene Therapy (ISCT)",
      info: "ISCT เป็นเครือข่ายระดับโลกที่มีคณะทำงานด้าน Regulatory Affairs และ Quality ซึ่งเภสัชกรไทยสามารถสมัครเป็นสมาชิกเพื่ออัปเดตแนวทางสากลล่าสุดได้",
      url: "https://isctglobal.org/"
    }
  },
  {
    id: "rec-board-cert",
    type: "certification",
    status: "recommended",
    title: "สอบวุฒิบัตรฯ สาขาเภสัชบำบัดเฉพาะทาง (ATMPs)",
    subtitle: "Board Certified in Advanced Therapies Pharmacy",
    icon: "military_tech",
    reason: "เป้าหมายสูงสุดในสายวิชาชีพเฉพาะทาง เพื่อให้ได้รับการรับรองอย่างเป็นทางการและก้าวสู่การเป็นผู้เชี่ยวชาญระดับแนวหน้า",
    richDetails: {
      source: "อ้างอิงจาก: วิทยาลัยเภสัชบำบัดแห่งประเทศไทย (วภท.)",
      info: "รายละเอียดการเปิดหลักสูตรต่อยอดเฉพาะทางด้าน ATMPs อยู่ระหว่างการตรวจสอบ กรุณาติดตามประกาศอย่างเป็นทางการ"
    }
  },
];
