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

export const pharmacotherapyPathwaySummary = {
  programName:
    "วุฒิบัตรแสดงความรู้ความชำนาญในการประกอบวิชาชีพเภสัชกรรม สาขาเภสัชบำบัด",
  totalCredits: 133,
  earnedCredits: 55,
  currentYear: 2,
  yearCount: 4,
  currentYearCredits: 18,
  currentYearPlannedCredits: 32,
  nextAction: "สะสมหน่วยกิตปี 2 อีก 14 หน่วยกิต และดำเนินผลงานประจำปีตามแผน",
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
    title: "การฝึกอบรมปี 1",
    description: "General Pharmacy Practice ตามแผนรายปี",
    icon: "school",
    status: "completed",
    kind: "year",
    credits: { earned: 37, planned: 37 },
    requirements: [
      {
        label: "หน่วยกิตตามแผนปี 1",
        detail: "37 จาก 37 หน่วยกิต",
        status: "met",
      },
    ],
    unlocks: "การประเมิน General Residency",
    note: "37 หน่วยกิตเป็นแผนรายปี ไม่ควรใช้เป็นเงื่อนไขล็อกอัตโนมัติโดยลำพัง",
  },
  {
    id: "year-1-gate",
    shortLabel: "Gate ปี 1",
    title: "การประเมิน General Residency",
    description: "Hard Gate ก่อนเข้าสู่การฝึกอบรมปี 2",
    icon: "verified",
    status: "completed",
    kind: "gate",
    requirements: [
      { label: "ผลรายวิชา", detail: "ระดับ S ไม่น้อยกว่า 70%", status: "met" },
      { label: "กิจกรรมตามหลักสูตร", detail: "ครบตามกำหนด", status: "met" },
      { label: "PT written", detail: "ไม่น้อยกว่า 60%", status: "met" },
      { label: "N-PT written", detail: "ไม่น้อยกว่า 60%", status: "met" },
      { label: "Oral case", detail: "ไม่น้อยกว่า 70%", status: "met" },
    ],
    unlocks: "General Residency และการฝึกอบรมปี 2",
  },
  {
    id: "year-2",
    shortLabel: "ปี 2",
    title: "Specialized Residency ปี 2",
    description: "ฝึกเฉพาะทางและจัดทำผลงานประจำปี",
    icon: "clinical_notes",
    status: "current",
    kind: "year",
    credits: { earned: 18, planned: 32 },
    requirements: [
      {
        label: "หน่วยกิตตามแผนปี 2",
        detail: "18 จาก 32 หน่วยกิต",
        status: "in_progress",
      },
      {
        label: "ผลงานประจำปี",
        detail: "กำลังดำเนินการ",
        status: "in_progress",
      },
    ],
    unlocks: "ดำเนินการต่อสู่ Specialized Residency ปี 3 ตามลำดับแผน",
    note: "ปี 2 เป็น Milestone ตามแผน ไม่ใช่ Hard Gate สำหรับล็อกการเลื่อนชั้นโดยอัตโนมัติ",
  },
  {
    id: "year-3",
    shortLabel: "ปี 3",
    title: "Specialized Residency ปี 3",
    description: "ฝึกเฉพาะทาง เตรียม Proposal และผลงานตามกำหนด",
    icon: "local_hospital",
    status: "upcoming",
    kind: "year",
    credits: { earned: 0, planned: 32 },
    requirements: [
      {
        label: "หน่วยกิตตามแผนปี 3",
        detail: "ยังไม่เริ่ม 0 จาก 32 หน่วยกิต",
        status: "not_started",
      },
      {
        label: "เตรียม Proposal และผลงาน",
        detail: "เริ่มในปีการฝึกอบรมที่ 3",
        status: "not_started",
      },
    ],
    unlocks: "การประเมินก่อนเข้าสู่ปี 4",
  },
  {
    id: "year-3-gate",
    shortLabel: "Gate ปี 3",
    title: "การประเมินก่อนเข้าสู่ปี 4",
    description: "Hard Gate ของ Specialized Residency",
    icon: "lock",
    status: "locked",
    kind: "gate",
    requirements: [
      {
        label: "written เฉพาะทาง",
        detail: "ไม่น้อยกว่า 80%",
        status: "not_started",
      },
      {
        label: "bedside",
        detail: "ไม่น้อยกว่า 80%",
        status: "not_started",
      },
      { label: "Proposal", detail: "ต้องผ่าน", status: "not_started" },
      {
        label: "ผลงานตามกำหนด",
        detail: "ต้องครบ",
        status: "not_started",
      },
    ],
    unlocks: "Specialized Residency และ Research Fellowship ปี 4",
  },
  {
    id: "year-4",
    shortLabel: "ปี 4",
    title: "Research Fellowship ปี 4",
    description: "ดำเนินงานวิจัยและเตรียมสอบ Defense",
    icon: "science",
    status: "locked",
    kind: "year",
    credits: { earned: 0, planned: 32 },
    requirements: [
      {
        label: "หน่วยกิต Research Fellowship",
        detail: "32 หน่วยกิต",
        status: "not_started",
      },
    ],
    unlocks: "การประเมินเพื่อสำเร็จวุฒิบัตร",
  },
  {
    id: "final-gate",
    shortLabel: "Final Gate",
    title: "การประเมินเพื่อสำเร็จวุฒิบัตร",
    description: "เงื่อนไขวิจัยและการสอบขั้นสุดท้าย",
    icon: "fact_check",
    status: "locked",
    kind: "gate",
    requirements: [
      {
        label: "Research Fellowship",
        detail: "ครบ 32 หน่วยกิต",
        status: "not_started",
      },
      {
        label: "บทความวิจัยภาษาอังกฤษ",
        detail: "อย่างน้อย 1 เรื่อง",
        status: "not_started",
      },
      {
        label: "Proposal",
        detail: "ผ่านก่อน Defense อย่างน้อย 1 ภาคการศึกษา",
        status: "not_started",
      },
      { label: "Defense", detail: "ต้องผ่าน", status: "not_started" },
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
        label: "ผ่าน Final Gate ครบทุกข้อ",
        detail: "ยังไม่ปลดล็อก",
        status: "not_started",
      },
    ],
  },
];
