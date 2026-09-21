export type PathwayStageStatus = "completed" | "current" | "upcoming" | "locked";

export type PathwayRequirementStatus = "met" | "in_progress" | "not_started";

export type PathwayRequirement = {
  label: string;
  detail: string;
  status: PathwayRequirementStatus;
};

export type PharmacotherapyPathwayStage = {
  id: string;
  shortLabel: string;
  title: string;
  description: string;
  icon: string;
  status: PathwayStageStatus;
  kind: "entry" | "year" | "gate" | "completion";
  credits?: {
    earned: number;
    planned: number;
  };
  requirements: PathwayRequirement[];
  unlocks?: string;
  note?: string;
};

export type CurriculumRequirementMode = "required" | "choose_one";

export type PharmacotherapySpecialtyOption = {
  code: string;
  titleTh: string;
  titleEn: string;
};

export type PharmacotherapyCurriculumComponent = {
  id: string;
  code: string;
  titleTh: string;
  titleEn: string;
  officialCategory: string;
  totalCredits: number;
  creditBreakdown: string;
  hours: string;
  description: string;
  requirementMode: CurriculumRequirementMode;
  options?: readonly PharmacotherapySpecialtyOption[];
  source: string;
};

export type StageCurriculumAllocation = {
  componentId: string;
  allocatedCredits: number;
  allocatedHours?: string;
  note?: string;
};

export type StageCurriculumItem = PharmacotherapyCurriculumComponent &
  StageCurriculumAllocation;

const specializedResidencyOptions = [
  { code: "01-2401", titleTh: "อายุรกรรม", titleEn: "Internal Medicine" },
  { code: "01-2402", titleTh: "กุมารเวชกรรม", titleEn: "Pediatrics" },
  { code: "01-2403", titleTh: "โภชนศาสตร์คลินิก", titleEn: "Clinical Nutrition" },
  { code: "01-2404", titleTh: "เภสัชจลนพลศาสตร์คลินิก", titleEn: "Clinical Pharmacokinetics" },
  { code: "01-2405", titleTh: "โรคติดเชื้อ", titleEn: "Infectious Diseases" },
  { code: "01-2406", titleTh: "โรคทางจิตเวช", titleEn: "Psychiatric Diseases" },
  { code: "01-2407", titleTh: "เภสัชกรรมชุมชน", titleEn: "Community Pharmacy" },
  { code: "01-2408", titleTh: "โรคทางระบบประสาท", titleEn: "Neurological Diseases" },
  { code: "01-2409", titleTh: "โรคไต", titleEn: "Nephrology" },
  { code: "01-2410", titleTh: "ผู้ป่วยภาวะวิกฤติ", titleEn: "Critical Care" },
  { code: "01-2411", titleTh: "โรคหัวใจและหลอดเลือด", titleEn: "Cardiology" },
  { code: "01-2412", titleTh: "ผู้ป่วยโรคมะเร็ง", titleEn: "Oncology" },
  { code: "01-2413", titleTh: "ผู้ป่วยสูงอายุ", titleEn: "Geriatric Pharmacotherapy" },
] as const satisfies readonly PharmacotherapySpecialtyOption[];

// Course names, credits, hours and categories are transcribed from the
// Board Certified Pharmacotherapy Training Program manual (2568), pp. 59-68.
export const pharmacotherapyCurriculumComponents = [
  {
    id: "research-methodology",
    code: "01-1101",
    titleTh: "ระเบียบวิธีวิจัยและชีวสถิติสำหรับเภสัชกรประจำบ้าน",
    titleEn: "Research Methodology & Biostatistics for Pharmacy Resident",
    officialCategory: "หมวดที่ 1 · วิชาบังคับพื้นฐาน",
    totalCredits: 4,
    creditBreakdown: "4 (3-1)",
    hours: "ทฤษฎี 45 ชั่วโมง · ปฏิบัติ 45 ชั่วโมง",
    description: "ออกแบบการศึกษา ประมาณขนาดตัวอย่าง และวิเคราะห์ข้อมูลทางสุขภาพและการบริบาลทางเภสัชกรรม",
    requirementMode: "required",
    source: "คู่มือฝึกอบรมวุฒิบัตร 4 ปี สาขาเภสัชบำบัด ฉบับ 2568 หน้า 59, 61 และ 64",
  },
  {
    id: "communication-skills",
    code: "01-1201",
    titleTh: "ทักษะการสื่อสารในการบริบาลทางเภสัชกรรม",
    titleEn: "Communication Skills in Pharmaceutical Care",
    officialCategory: "หมวดที่ 2 · วิชาพื้นฐานวิชาชีพ",
    totalCredits: 2,
    creditBreakdown: "2 (1-1)",
    hours: "ทฤษฎี 15 ชั่วโมง · ปฏิบัติ 45 ชั่วโมง",
    description: "การสื่อสารกับผู้ป่วยและบุคลากรสุขภาพ การเขียน การพูด การสัมภาษณ์ และจริยธรรมในการสื่อสาร",
    requirementMode: "required",
    source: "คู่มือฝึกอบรมวุฒิบัตร 4 ปี สาขาเภสัชบำบัด ฉบับ 2568 หน้า 59, 61 และ 64",
  },
  {
    id: "current-topics-1",
    code: "01-1301",
    titleTh: "หัวข้อปัจจุบันในเภสัชบำบัด 1",
    titleEn: "Current Topics in Pharmacotherapy 1",
    officialCategory: "หมวดที่ 3 · วิชาเฉพาะ",
    totalCredits: 3,
    creditBreakdown: "3 (2-1)",
    hours: "ทฤษฎี 30 ชั่วโมง · ปฏิบัติ 45 ชั่วโมง",
    description: "การใช้ยาในโรคระบบสำคัญ การวางแผนรักษา การติดตามผล อาการไม่พึงประสงค์ และการให้คำปรึกษา",
    requirementMode: "required",
    source: "คู่มือฝึกอบรมวุฒิบัตร 4 ปี สาขาเภสัชบำบัด ฉบับ 2568 หน้า 59, 61 และ 64",
  },
  {
    id: "current-topics-2",
    code: "01-1302",
    titleTh: "หัวข้อปัจจุบันในเภสัชบำบัด 2",
    titleEn: "Current Topics in Pharmacotherapy 2",
    officialCategory: "หมวดที่ 3 · วิชาเฉพาะ",
    totalCredits: 3,
    creditBreakdown: "3 (2-1)",
    hours: "ทฤษฎี 30 ชั่วโมง · ปฏิบัติ 45 ชั่วโมง",
    description: "การศึกษาต่อเนื่องจากหัวข้อปัจจุบันในเภสัชบำบัด 1",
    requirementMode: "required",
    source: "คู่มือฝึกอบรมวุฒิบัตร 4 ปี สาขาเภสัชบำบัด ฉบับ 2568 หน้า 59, 61 และ 64",
  },
  {
    id: "systematic-clinical-skills",
    code: "01-1303",
    titleTh: "การประเมินผู้ป่วยอย่างเป็นระบบและทักษะทางคลินิกในการบริบาลทางเภสัชกรรม",
    titleEn: "Systematic Approach & Clinical Skills in Pharmaceutical Care",
    officialCategory: "หมวดที่ 3 · วิชาเฉพาะ",
    totalCredits: 4,
    creditBreakdown: "4 (2-2)",
    hours: "ทฤษฎี 30 ชั่วโมง · ปฏิบัติ 90 ชั่วโมง",
    description: "กระบวนการคิดอย่างเป็นระบบ การแก้ปัญหา การตัดสินใจทางคลินิก การซักประวัติ และการประเมินผลตรวจ",
    requirementMode: "required",
    source: "คู่มือฝึกอบรมวุฒิบัตร 4 ปี สาขาเภสัชบำบัด ฉบับ 2568 หน้า 59, 61 และ 65",
  },
  {
    id: "general-residency",
    code: "01-1401",
    titleTh: "การฝึกอบรมเภสัชกรประจำบ้านด้านเภสัชบำบัด",
    titleEn: "Residency in Pharmacotherapy Training",
    officialCategory: "หมวดที่ 4 · ฝึกปฏิบัติงาน",
    totalCredits: 21,
    creditBreakdown: "21 (0-21)",
    hours: "ฝึกปฏิบัติงาน 960 ชั่วโมง · 32 สัปดาห์",
    description: "ฝึกบริบาลทางเภสัชกรรมในหอผู้ป่วยอายุรกรรม ประเมินการใช้ยา ติดตามการรักษา และป้องกันอาการไม่พึงประสงค์",
    requirementMode: "required",
    source: "คู่มือฝึกอบรมวุฒิบัตร 4 ปี สาขาเภสัชบำบัด ฉบับ 2568 หน้า 59, 62 และ 65",
  },
  {
    id: "specialized-residency",
    code: "01-2401–01-2413",
    titleTh: "การฝึกอบรมเภสัชกรประจำบ้านด้านเภสัชบำบัดเฉพาะทาง",
    titleEn: "Specialized Residency in Pharmacotherapy Training",
    officialCategory: "หมวดที่ 4 · ฝึกปฏิบัติงานเฉพาะทาง",
    totalCredits: 64,
    creditBreakdown: "64 (0-64)",
    hours: "ฝึกปฏิบัติงานรวม 2,880 ชั่วโมง · 96 สัปดาห์",
    description: "ฝึกบริบาลทางเภสัชกรรมในสาขาเฉพาะทางที่เลือกต่อเนื่องตลอดปี 2 และปี 3",
    requirementMode: "choose_one",
    options: specializedResidencyOptions,
    source: "คู่มือฝึกอบรมวุฒิบัตร 4 ปี สาขาเภสัชบำบัด ฉบับ 2568 หน้า 59, 62 และ 65-68",
  },
  {
    id: "research-fellowship",
    code: "01-4501",
    titleTh: "การฝึกอบรมด้านการทำวิจัยเชิงปฏิบัติการ",
    titleEn: "Pharmacy Research Fellowship Training",
    officialCategory: "หมวดที่ 5 · การวิจัย",
    totalCredits: 32,
    creditBreakdown: "32 (0-32)",
    hours: "ฝึกปฏิบัติงาน 1,440 ชั่วโมง",
    description: "ทำวิจัยเชิงปฏิบัติการในสาขาเฉพาะทางที่เลือกไว้ในปี 2 และปี 3",
    requirementMode: "required",
    source: "คู่มือฝึกอบรมวุฒิบัตร 4 ปี สาขาเภสัชบำบัด ฉบับ 2568 หน้า 59, 62 และ 68",
  },
] as const satisfies readonly PharmacotherapyCurriculumComponent[];

export const pharmacotherapyStageCurriculumAllocations = {
  "year-1": [
    { componentId: "research-methodology", allocatedCredits: 4 },
    { componentId: "communication-skills", allocatedCredits: 2 },
    { componentId: "current-topics-1", allocatedCredits: 3 },
    { componentId: "current-topics-2", allocatedCredits: 3 },
    { componentId: "systematic-clinical-skills", allocatedCredits: 4 },
    { componentId: "general-residency", allocatedCredits: 21 },
  ],
  "year-2": [
    {
      componentId: "specialized-residency",
      allocatedCredits: 32,
      allocatedHours: "1,440 ชั่วโมงในปีนี้",
      note: "เป็นส่วนแรกของรายวิชา 64 หน่วยกิตที่เรียนต่อเนื่องในปี 2-3",
    },
  ],
  "year-3": [
    {
      componentId: "specialized-residency",
      allocatedCredits: 32,
      allocatedHours: "1,440 ชั่วโมงในปีนี้",
      note: "เป็นส่วนที่สองของรายวิชา 64 หน่วยกิตที่เรียนต่อเนื่องในปี 2-3",
    },
  ],
  "year-4": [
    { componentId: "research-fellowship", allocatedCredits: 32 },
  ],
} as const satisfies Record<string, readonly StageCurriculumAllocation[]>;

export function curriculumForPathwayStage(stageId: string): StageCurriculumItem[] {
  const allocations = pharmacotherapyStageCurriculumAllocations[
    stageId as keyof typeof pharmacotherapyStageCurriculumAllocations
  ] ?? [];

  return allocations.map((allocation) => {
    const component = pharmacotherapyCurriculumComponents.find(
      (item) => item.id === allocation.componentId,
    );
    if (!component) throw new Error(`Unknown pharmacotherapy component: ${allocation.componentId}`);
    return { ...component, ...allocation };
  });
}

export const pharmacotherapyPathwaySummary = {
  programName:
    "วุฒิบัตรแสดงความรู้ความชำนาญในการประกอบวิชาชีพเภสัชกรรม สาขาเภสัชบำบัด",
  totalCredits: 133,
  earnedCredits: 55,
  currentYear: 2,
  yearCount: 4,
  currentYearCredits: 18,
  currentYearPlannedCredits: 32,
  nextAction: "สะสมอีก 14 หน่วยกิตและทำผลงานประจำปี",
} as const;

// Curriculum structure: 133 credits (37 + 32 + 32 + 32).
// Gate rules are transcribed from the supplied comparison workbook. The scores
// shown here are criteria, not automated production rules, until the owner
// confirms the referenced rule version.
export const pharmacotherapyPathwayStages: PharmacotherapyPathwayStage[] = [
  {
    id: "program-entry",
    shortLabel: "เริ่มต้น",
    title: "เริ่มหลักสูตร",
    description: "ขึ้นทะเบียนผู้เข้าฝึกอบรมสาขาเภสัชบำบัด",
    icon: "flag",
    status: "completed",
    kind: "entry",
    requirements: [
      {
        label: "ขึ้นทะเบียนผู้เข้าฝึกอบรม",
        detail: "ดำเนินการแล้ว",
        status: "met",
      },
    ],
    unlocks: "แผนการฝึกอบรมปี 1",
  },
  {
    id: "year-1",
    shortLabel: "ปี 1",
    title: "ฝึกอบรมปี 1",
    description: "เรียนและฝึกปฏิบัติตามแผนปี 1",
    icon: "school",
    status: "completed",
    kind: "year",
    credits: { earned: 37, planned: 37 },
    requirements: [
      {
        label: "หน่วยกิตปี 1",
        detail: "37 จาก 37 หน่วยกิต",
        status: "met",
      },
    ],
    unlocks: "ประเมินหลังจบปี 1",
    note: "37 หน่วยกิตเป็นแผนรายปี ไม่ควรใช้เป็นเงื่อนไขล็อกอัตโนมัติโดยลำพัง",
  },
  {
    id: "year-1-gate",
    shortLabel: "จบปี 1",
    title: "ประเมินหลังจบปี 1",
    description: "ต้องผ่านก่อนขึ้นปี 2",
    icon: "verified",
    status: "completed",
    kind: "gate",
    requirements: [
      { label: "ผลรายวิชา", detail: "ระดับ S ไม่น้อยกว่า 70%", status: "met" },
      { label: "กิจกรรมตามหลักสูตร", detail: "ครบตามกำหนด", status: "met" },
      { label: "สอบข้อเขียนเภสัชบำบัด", detail: "ไม่น้อยกว่า 60%", status: "met" },
      { label: "สอบข้อเขียนด้านอื่น", detail: "ไม่น้อยกว่า 60%", status: "met" },
      { label: "สอบปากเปล่าจากกรณีศึกษา", detail: "ไม่น้อยกว่า 70%", status: "met" },
    ],
    unlocks: "ฝึกเฉพาะทาง ปี 2",
  },
  {
    id: "year-2",
    shortLabel: "ปี 2",
    title: "ฝึกเฉพาะทาง ปี 2",
    description: "ฝึกเฉพาะทางและจัดทำผลงานประจำปี",
    icon: "clinical_notes",
    status: "current",
    kind: "year",
    credits: { earned: 18, planned: 32 },
    requirements: [
      {
        label: "หน่วยกิตปี 2",
        detail: "18 จาก 32 หน่วยกิต",
        status: "in_progress",
      },
      {
        label: "ผลงานประจำปี",
        detail: "กำลังดำเนินการ",
        status: "in_progress",
      },
    ],
    unlocks: "ฝึกเฉพาะทาง ปี 3",
    note: "ปี 2 เป็น Milestone ตามแผน ไม่ใช่ Hard Gate สำหรับล็อกการเลื่อนชั้นโดยอัตโนมัติ",
  },
  {
    id: "year-3",
    shortLabel: "ปี 3",
    title: "ฝึกเฉพาะทาง ปี 3",
    description: "ฝึกเฉพาะทางและเตรียมโครงร่างวิจัย",
    icon: "local_hospital",
    status: "upcoming",
    kind: "year",
    credits: { earned: 0, planned: 32 },
    requirements: [
      {
        label: "หน่วยกิตปี 3",
        detail: "ยังไม่เริ่ม 0 จาก 32 หน่วยกิต",
        status: "not_started",
      },
      {
        label: "เตรียมโครงร่างวิจัยและผลงาน",
        detail: "เริ่มในปีการฝึกอบรมที่ 3",
        status: "not_started",
      },
    ],
    unlocks: "การประเมินก่อนเข้าสู่ปี 4",
  },
  {
    id: "year-3-gate",
    shortLabel: "ก่อนปี 4",
    title: "การประเมินก่อนเข้าสู่ปี 4",
    description: "ต้องผ่านก่อนขึ้นปี 4",
    icon: "lock",
    status: "locked",
    kind: "gate",
    requirements: [
      {
        label: "สอบข้อเขียนเฉพาะทาง",
        detail: "ไม่น้อยกว่า 80%",
        status: "not_started",
      },
      {
        label: "สอบข้างเตียง",
        detail: "ไม่น้อยกว่า 80%",
        status: "not_started",
      },
      { label: "โครงร่างวิจัย", detail: "ต้องผ่าน", status: "not_started" },
      {
        label: "ผลงานตามกำหนด",
        detail: "ต้องครบ",
        status: "not_started",
      },
    ],
    unlocks: "วิจัย ปี 4",
  },
  {
    id: "year-4",
    shortLabel: "ปี 4",
    title: "วิจัย ปี 4",
    description: "ทำวิจัยและเตรียมสอบป้องกัน",
    icon: "science",
    status: "locked",
    kind: "year",
    credits: { earned: 0, planned: 32 },
    requirements: [
      {
        label: "หน่วยกิตวิจัย",
        detail: "32 หน่วยกิต",
        status: "not_started",
      },
    ],
    unlocks: "ตรวจสอบก่อนจบหลักสูตร",
  },
  {
    id: "final-gate",
    shortLabel: "ก่อนจบ",
    title: "ตรวจสอบก่อนจบหลักสูตร",
    description: "ตรวจงานวิจัยและการสอบขั้นสุดท้าย",
    icon: "fact_check",
    status: "locked",
    kind: "gate",
    requirements: [
      {
        label: "งานวิจัย",
        detail: "ครบ 32 หน่วยกิต",
        status: "not_started",
      },
      {
        label: "บทความวิจัยภาษาอังกฤษ",
        detail: "อย่างน้อย 1 เรื่อง",
        status: "not_started",
      },
      {
        label: "โครงร่างวิจัย",
        detail: "ผ่านก่อนสอบป้องกันอย่างน้อย 1 ภาคการศึกษา",
        status: "not_started",
      },
      { label: "สอบป้องกันงานวิจัย", detail: "ต้องผ่าน", status: "not_started" },
      {
        label: "วิทยานิพนธ์ฉบับแก้",
        detail: "ส่งภายใน 45 วัน",
        status: "not_started",
      },
    ],
    unlocks: "สำเร็จวุฒิบัตรสาขาเภสัชบำบัด",
  },
  {
    id: "program-completion",
    shortLabel: "สำเร็จ",
    title: "สำเร็จวุฒิบัตร",
    description: "สาขาเภสัชบำบัด",
    icon: "workspace_premium",
    status: "locked",
    kind: "completion",
    requirements: [
      {
        label: "ผ่านเงื่อนไขก่อนจบครบทุกข้อ",
        detail: "ยังไม่ปลดล็อก",
        status: "not_started",
      },
    ],
  },
];
