import type { FileMetadata } from "@/roles/shared/features/file-metadata";

export type RequestCategoryId =
  | "exam"
  | "certificate"
  | "training"
  | "credit_transfer"
  | "internship_letter"
  | "completion";

export type RequestStatus =
  | "staff_review"
  | "needs_information"
  | "awaiting_president_signature"
  | "signed"
  | "rejected";

export type RequestActorRole =
  | "student"
  | "royal_college_staff"
  | "president"
  | "system";

export type RequestEventType =
  | "submitted"
  | "information_requested"
  | "resubmitted"
  | "forwarded_for_signature"
  | "signature_step_completed"
  | "forwarded_to_next_signer"
  | "signed"
  | "rejected"
  | "migrated";

export type RequestFieldType =
  | "text"
  | "textarea"
  | "select"
  | "date"
  | "number";

export interface RequestFieldDefinition {
  id: string;
  label: string;
  type: RequestFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: readonly string[];
  min?: number;
}

export interface RequestDocumentRequirement {
  id: string;
  label: string;
  helpText: string;
  required?: boolean;
  acceptedTypes: readonly string[];
  maxBytes: number;
}

export interface RequestCategoryDefinition {
  id: RequestCategoryId;
  code: string;
  name: string;
  description: string;
  icon: string;
  fields: readonly RequestFieldDefinition[];
  documents?: readonly RequestDocumentRequirement[];
}

export interface RequestFieldEntry {
  id: string;
  label: string;
  value: string;
}

export interface RequesterSummary {
  memberId: string;
  name: string;
  email: string;
}

export interface RequestCourseSnapshot {
  code: string;
  title: string;
  credits: number;
  term?: string;
  schedule?: string;
}

export type RequestDocumentReviewStatus =
  | "pending"
  | "accepted"
  | "missing"
  | "not_applicable";

export interface RequestDocument {
  id: string;
  label: string;
  required: boolean;
  file?: FileMetadata;
  reviewStatus: RequestDocumentReviewStatus;
  reviewerNote?: string;
}

export interface RequestComment {
  id: string;
  actorRole: RequestActorRole;
  actorName: string;
  message: string;
  createdAt: string;
}

export interface RequestEvent {
  id: string;
  type: RequestEventType;
  actorRole: RequestActorRole;
  actorName: string;
  createdAt: string;
  note?: string;
}

export interface HandwrittenSignaturePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface HandwrittenSignature {
  version: 1;
  strokes: HandwrittenSignaturePoint[][];
}

const MAX_SIGNATURE_STROKES = 64;
const MAX_SIGNATURE_POINTS = 4_096;

function isUnitValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function isHandwrittenSignature(value: unknown): value is HandwrittenSignature {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { version?: unknown; strokes?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.strokes)) return false;
  if (candidate.strokes.length === 0 || candidate.strokes.length > MAX_SIGNATURE_STROKES) return false;

  let pointCount = 0;
  for (const stroke of candidate.strokes) {
    if (!Array.isArray(stroke) || stroke.length === 0) return false;
    pointCount += stroke.length;
    if (pointCount > MAX_SIGNATURE_POINTS) return false;
    for (const point of stroke) {
      if (!point || typeof point !== "object") return false;
      const signaturePoint = point as { x?: unknown; y?: unknown; pressure?: unknown };
      if (!isUnitValue(signaturePoint.x) || !isUnitValue(signaturePoint.y)) return false;
      if (signaturePoint.pressure !== undefined && !isUnitValue(signaturePoint.pressure)) return false;
    }
  }
  return true;
}

export function hasHandwrittenSignatureInk(value: unknown): value is HandwrittenSignature {
  if (!isHandwrittenSignature(value)) return false;
  return value.strokes.some((stroke) => stroke.some((point, index) => {
    const previous = stroke[index - 1];
    if (!previous) return false;
    const deltaX = point.x - previous.x;
    const deltaY = point.y - previous.y;
    return (deltaX * deltaX) + (deltaY * deltaY) >= 0.000004;
  }));
}

export interface MockESignature {
  kind: "mock_e_sign";
  signerAssignmentId: string;
  signerUserId: string;
  signerName: string;
  signerRoleLabel: string;
  collegeCode: string;
  signedAt: string;
  documentFingerprint: string;
  stampLabel: string;
  consentText: string;
  handwrittenSignature?: HandwrittenSignature;
  workflowStepId?: string;
  level?: SignatureLevel;
  organisationId?: string;
}

export type SignatureWorkflowKind = "college_only" | "royal_only" | "two_level";
export type SignatureLevel = "college" | "royal_college";
export type SignatureStepStatus = "pending" | "awaiting_signature" | "signed" | "rejected";

export interface SignatureWorkflowPreparer {
  userId: string;
  userName: string;
  role: "royal_college_staff";
  organisationId: string;
  organisationCode: string;
  organisationName: string;
}

export interface SignatureWorkflowStep {
  id: string;
  order: number;
  level: SignatureLevel;
  organisationId: string;
  organisationCode: string;
  organisationName: string;
  status: SignatureStepStatus;
  signerAssignmentId?: string;
  signerUserId?: string;
  signerName?: string;
  decidedAt?: string;
  note?: string;
}

export interface SignatureWorkflow {
  kind: SignatureWorkflowKind;
  preparedAt: string;
  preparedBy: SignatureWorkflowPreparer;
  documentFingerprint: string;
  evidenceReference?: string;
  steps: SignatureWorkflowStep[];
}

export interface MockRequest {
  id: string;
  categoryId: RequestCategoryId | "legacy";
  typeLabel: string;
  title: string;
  displayDate: string;
  createdAt: string;
  updatedAt: string;
  status: RequestStatus;
  collegeCode: string;
  requester: RequesterSummary;
  fields: RequestFieldEntry[];
  applicantNote?: string;
  courses: RequestCourseSnapshot[];
  documents: RequestDocument[];
  comments: RequestComment[];
  events: RequestEvent[];
  progress: string[];
  mockSignature?: MockESignature;
  signatures?: MockESignature[];
  signatureWorkflow?: SignatureWorkflow;
}

const FIVE_MEGABYTES = 5 * 1024 * 1024;
const DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const REQUEST_CATALOG: readonly RequestCategoryDefinition[] = [
  {
    id: "exam",
    code: "สอบ",
    name: "ขอสอบ",
    description: "สมัครสอบ ขอสอบแก้ตัว หรือขอประเมินความรู้ตามหลักสูตร",
    icon: "quiz",
    fields: [
      {
        id: "examType",
        label: "ประเภทการสอบ",
        type: "select",
        required: true,
        options: [
          "สอบประเมินความรู้ขั้นสุดท้าย (Board Exam)",
          "สอบปากเปล่าข้างเตียงผู้ป่วย",
          "สอบแก้ตัว",
          "สอบโครงร่างวิทยานิพนธ์",
        ],
      },
      {
        id: "program",
        label: "หลักสูตร / สาขา",
        type: "text",
        required: true,
        placeholder: "เช่น สาขาเภสัชบำบัด",
      },
      {
        id: "examRound",
        label: "รอบสอบที่ต้องการ",
        type: "text",
        required: true,
        placeholder: "เช่น รอบเดือนกรกฎาคม 2569",
      },
      {
        id: "examNote",
        label: "รายละเอียดเพิ่มเติม",
        type: "textarea",
        placeholder: "ระบุรายละเอียดที่เจ้าหน้าที่ควรทราบ (ถ้ามี)",
      },
    ],
    documents: [
      {
        id: "exam-logbook",
        label: "Logbook หรือหลักฐานประกอบ (ถ้ามี)",
        helpText: "รองรับ PDF, JPG หรือ PNG ขนาดไม่เกิน 5 MB",
        acceptedTypes: DOCUMENT_TYPES,
        maxBytes: FIVE_MEGABYTES,
      },
    ],
  },
  {
    id: "certificate",
    code: "รับรอง",
    name: "ขอหนังสือรับรอง",
    description: "ขอหนังสือรับรองสถานภาพ การฝึกอบรม หรือเอกสารภาษาอังกฤษ",
    icon: "verified",
    fields: [
      {
        id: "certificateType",
        label: "ประเภทหนังสือรับรอง",
        type: "select",
        required: true,
        options: [
          "หนังสือรับรองการเป็นผู้เข้าฝึกอบรม",
          "หนังสือรับรองผลการฝึกอบรม",
          "หนังสือรับรองเพื่อประกอบการสมัครงาน",
          "หนังสือรับรองอื่น ๆ",
        ],
      },
      {
        id: "language",
        label: "ภาษาเอกสาร",
        type: "select",
        required: true,
        options: ["ภาษาไทย", "ภาษาอังกฤษ", "ภาษาไทยและภาษาอังกฤษ"],
      },
      {
        id: "copies",
        label: "จำนวนฉบับ",
        type: "number",
        required: true,
        min: 1,
        placeholder: "1",
      },
      {
        id: "purpose",
        label: "วัตถุประสงค์ในการนำไปใช้",
        type: "textarea",
        required: true,
        placeholder: "ระบุหน่วยงานหรือวัตถุประสงค์ของเอกสาร",
      },
    ],
    documents: [
      {
        id: "certificate-reference",
        label: "เอกสารอ้างอิงชื่อหน่วยงาน (ถ้ามี)",
        helpText: "รองรับ PDF, JPG หรือ PNG ขนาดไม่เกิน 5 MB",
        acceptedTypes: DOCUMENT_TYPES,
        maxBytes: FIVE_MEGABYTES,
      },
    ],
  },
  {
    id: "training",
    code: "ฝึก",
    name: "คำร้องเกี่ยวกับการฝึกอบรม",
    description: "ลาพัก รักษาสถานภาพ เปลี่ยนสถานที่ หรือขยายเวลาฝึกอบรม",
    icon: "school",
    fields: [
      {
        id: "trainingRequestType",
        label: "เรื่องที่ต้องการยื่นคำร้อง",
        type: "select",
        required: true,
        options: [
          "ขอลาพักการฝึกอบรม",
          "ขอรักษาสถานภาพ",
          "ขอเปลี่ยนสถานที่ฝึกอบรม",
          "ขอขยายระยะเวลาฝึกอบรม",
          "คำร้องเกี่ยวกับการฝึกอบรมอื่น ๆ",
        ],
      },
      {
        id: "program",
        label: "หลักสูตรปัจจุบัน",
        type: "text",
        required: true,
        placeholder: "ระบุหลักสูตรและสาขา",
      },
      {
        id: "effectiveDate",
        label: "วันที่ต้องการให้มีผล",
        type: "date",
        required: true,
      },
      {
        id: "trainingReason",
        label: "เหตุผลและรายละเอียด",
        type: "textarea",
        required: true,
        placeholder: "อธิบายเหตุผลและช่วงเวลาที่เกี่ยวข้อง",
      },
    ],
    documents: [
      {
        id: "training-evidence",
        label: "หลักฐานประกอบคำร้อง (ถ้ามี)",
        helpText: "รองรับ PDF, JPG หรือ PNG ขนาดไม่เกิน 5 MB",
        acceptedTypes: DOCUMENT_TYPES,
        maxBytes: FIVE_MEGABYTES,
      },
    ],
  },
  {
    id: "credit_transfer",
    code: "ทอ",
    name: "การเทียบโอนหน่วยกิต",
    description: "ยื่นเทียบโอนหนึ่งรายวิชาต่อคำร้อง พร้อมผลการเรียนและคำอธิบายรายวิชา",
    icon: "published_with_changes",
    fields: [
      {
        id: "targetCourse",
        label: "รหัสและชื่อรายวิชาที่ขอเทียบโอน",
        type: "text",
        required: true,
        placeholder: "เช่น วภท-301 องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง",
        helpText: "กรอกหนึ่งรายวิชาต่อหนึ่งคำร้อง เพื่อให้ตรวจสอบผลเทียบเท่าได้ชัดเจน",
      },
      {
        id: "program",
        label: "หลักสูตรปัจจุบัน",
        type: "text",
        required: true,
        placeholder: "ระบุหลักสูตรและสาขา",
      },
      {
        id: "sourceType",
        label: "แหล่งที่มาของหน่วยกิต",
        type: "select",
        required: true,
        options: [
          "รายวิชาจากสถาบันการศึกษาอื่น",
          "หลักสูตรระยะสั้นหรือ Micro-credential",
          "การฝึกอบรมหรือประสบการณ์วิชาชีพ",
        ],
      },
      {
        id: "sourceInstitution",
        label: "สถาบัน / หน่วยงานต้นทาง",
        type: "text",
        required: true,
        placeholder: "ระบุชื่อสถาบันหรือหน่วยงานที่ออกผลการเรียน",
      },
      {
        id: "sourceCourse",
        label: "รายวิชาหรือหลักสูตรที่เรียนมา",
        type: "text",
        required: true,
        placeholder: "ระบุรหัสและชื่อรายวิชาหรือหลักสูตรต้นทาง",
      },
      {
        id: "sourceCompletionDate",
        label: "วันที่สำเร็จการเรียนหรืออบรม",
        type: "date",
        required: true,
      },
      {
        id: "sourceResult",
        label: "ผลการเรียน / ผลการประเมิน",
        type: "text",
        required: true,
        placeholder: "เช่น S, ผ่าน หรือ A",
      },
      {
        id: "sourceCredits",
        label: "หน่วยกิตจากหลักสูตรต้นทาง",
        type: "number",
        required: true,
        min: 1,
        placeholder: "เช่น 3",
      },
      {
        id: "requestedCredits",
        label: "จำนวนหน่วยกิตที่ขอเทียบโอน",
        type: "number",
        required: true,
        min: 1,
        placeholder: "เช่น 3",
      },
      {
        id: "transferReason",
        label: "รายละเอียดประกอบการพิจารณา",
        type: "textarea",
        placeholder: "อธิบายความสอดคล้องของเนื้อหาและผลลัพธ์การเรียนรู้ (ถ้ามี)",
      },
    ],
    documents: [
      {
        id: "credit-transfer-transcript",
        label: "ผลการเรียนหรือใบรับรองการสำเร็จ",
        helpText: "แนบเอกสารทางการจากสถาบันต้นทาง รองรับ PDF, JPG หรือ PNG ขนาดไม่เกิน 5 MB",
        required: true,
        acceptedTypes: DOCUMENT_TYPES,
        maxBytes: FIVE_MEGABYTES,
      },
      {
        id: "credit-transfer-syllabus",
        label: "คำอธิบายรายวิชา / Syllabus",
        helpText: "แนบรายละเอียดเนื้อหา ชั่วโมงเรียน และผลลัพธ์การเรียนรู้ รองรับ PDF, JPG หรือ PNG ขนาดไม่เกิน 5 MB",
        required: true,
        acceptedTypes: DOCUMENT_TYPES,
        maxBytes: FIVE_MEGABYTES,
      },
    ],
  },
  {
    id: "internship_letter",
    code: "ฝง",
    name: "ขอหนังสือขอฝึกงาน",
    description: "ขอให้วิทยาลัยออกหนังสือถึงหน่วยงานรับฝึกงาน พร้อมแนบเอกสารประกอบ",
    icon: "clinical_notes",
    fields: [
      {
        id: "organizationName",
        label: "ชื่อหน่วยงานรับฝึกงาน",
        type: "text",
        required: true,
        placeholder: "เช่น โรงพยาบาลศิริราช",
      },
      {
        id: "addressee",
        label: "เรียนถึง",
        type: "text",
        required: true,
        placeholder: "ชื่อหรือตำแหน่งผู้รับหนังสือ",
      },
      {
        id: "organizationAddress",
        label: "ที่อยู่หน่วยงาน",
        type: "textarea",
        required: true,
        placeholder: "ระบุที่อยู่สำหรับออกหนังสือ",
      },
      {
        id: "internshipStartDate",
        label: "วันที่เริ่มฝึกงาน",
        type: "date",
        required: true,
      },
      {
        id: "internshipEndDate",
        label: "วันที่สิ้นสุดฝึกงาน",
        type: "date",
        required: true,
      },
      {
        id: "contactDetail",
        label: "ผู้ประสานงาน / ช่องทางติดต่อ",
        type: "text",
        placeholder: "ชื่อ เบอร์โทร หรืออีเมล (ถ้ามี)",
      },
      {
        id: "internshipPurpose",
        label: "วัตถุประสงค์หรือรายละเอียดเพิ่มเติม",
        type: "textarea",
        required: true,
        placeholder: "ระบุวัตถุประสงค์และงานที่คาดว่าจะฝึก",
      },
    ],
    documents: [
      {
        id: "internship-acceptance",
        label: "หนังสือตอบรับหรือหลักฐานจากหน่วยงาน (ถ้ามี)",
        helpText: "รองรับ PDF, JPG หรือ PNG ขนาดไม่เกิน 5 MB",
        acceptedTypes: DOCUMENT_TYPES,
        maxBytes: FIVE_MEGABYTES,
      },
      {
        id: "internship-supporting",
        label: "เอกสารประกอบการขอฝึกงาน (ถ้ามี)",
        helpText: "เช่น รายละเอียดโครงการหรือกำหนดการฝึกงาน",
        acceptedTypes: DOCUMENT_TYPES,
        maxBytes: FIVE_MEGABYTES,
      },
    ],
  },
  {
    id: "completion",
    code: "จบ",
    name: "ขอสำเร็จการฝึกอบรม",
    description: "ยื่นตรวจสอบคุณสมบัติและขออนุมัติสำเร็จการฝึกอบรม",
    icon: "workspace_premium",
    fields: [
      {
        id: "program",
        label: "หลักสูตร / สาขาที่ขอสำเร็จ",
        type: "text",
        required: true,
        placeholder: "ระบุชื่อหลักสูตรเต็ม",
      },
      {
        id: "completionDate",
        label: "วันที่สำเร็จการฝึกอบรมตามแผน",
        type: "date",
        required: true,
      },
      {
        id: "completedCredits",
        label: "หน่วยกิตที่สะสมแล้ว",
        type: "number",
        required: true,
        min: 1,
        placeholder: "เช่น 36",
      },
      {
        id: "researchStatus",
        label: "สถานะผลงานวิจัย / วิทยานิพนธ์",
        type: "select",
        required: true,
        options: [
          "ผ่านการอนุมัติแล้ว",
          "ส่งฉบับสมบูรณ์แล้ว รออนุมัติ",
          "หลักสูตรนี้ไม่มีเงื่อนไขผลงานวิจัย",
        ],
      },
      {
        id: "completionNote",
        label: "หมายเหตุ",
        type: "textarea",
        placeholder: "แจ้งข้อมูลเพิ่มเติมแก่เจ้าหน้าที่ (ถ้ามี)",
      },
    ],
    documents: [
      {
        id: "completion-evidence",
        label: "หลักฐานสำเร็จตามเกณฑ์ (ถ้ามี)",
        helpText: "รองรับ PDF, JPG หรือ PNG ขนาดไม่เกิน 5 MB",
        acceptedTypes: DOCUMENT_TYPES,
        maxBytes: FIVE_MEGABYTES,
      },
    ],
  },
] as const;

export const REQUEST_STATUS_META: Record<
  RequestStatus,
  {
    label: string;
    variant: "warning" | "info" | "success" | "danger";
    borderClass: string;
  }
> = {
  staff_review: {
    label: "รอเจ้าหน้าที่ตรวจสอบ",
    variant: "warning",
    borderClass: "border-l-warning",
  },
  needs_information: {
    label: "ขอข้อมูลเพิ่มเติม",
    variant: "info",
    borderClass: "border-l-info",
  },
  awaiting_president_signature: {
    label: "รอประธานลงนาม",
    variant: "info",
    borderClass: "border-l-info",
  },
  signed: {
    label: "ลงนามแล้ว",
    variant: "success",
    borderClass: "border-l-success",
  },
  rejected: {
    label: "ไม่อนุมัติ",
    variant: "danger",
    borderClass: "border-l-danger",
  },
};

const CURRENT_MEMBER: RequesterSummary = {
  memberId: "วภท-2568-001",
  name: "ภก. สมชาย ใจดี",
  email: "somchai.j@example.com",
};

export const HISTORICAL_REQUESTS: readonly MockRequest[] = [
  {
    id: "จ.1-2569-001",
    categoryId: "legacy",
    typeLabel: "คำร้องทั่วไป",
    title: "ขอเปลี่ยนแปลงข้อมูลส่วนตัว",
    displayDate: "15 ม.ค. 2569",
    createdAt: "2026-01-15T02:30:00.000Z",
    updatedAt: "2026-01-17T04:00:00.000Z",
    status: "signed",
    collegeCode: "วภท.",
    requester: CURRENT_MEMBER,
    fields: [
      {
        id: "detail",
        label: "รายละเอียด",
        value: "ขอแก้ไขข้อมูลที่อยู่ในระบบให้ตรงกับบัตรประชาชนปัจจุบัน",
      },
    ],
    applicantNote: "กรุณาใช้ที่อยู่ล่าสุดตามเอกสารแนบ",
    courses: [],
    documents: [],
    comments: [
      {
        id: "comment-historical-001",
        actorRole: "royal_college_staff",
        actorName: "เจ้าหน้าที่ทะเบียน",
        message: "ตรวจสอบเอกสารแล้ว อนุมัติการแก้ไขข้อมูล",
        createdAt: "2026-01-16T04:00:00.000Z",
      },
    ],
    events: [
      { id: "event-historical-001-a", type: "submitted", actorRole: "student", actorName: CURRENT_MEMBER.name, createdAt: "2026-01-15T02:30:00.000Z" },
      { id: "event-historical-001-b", type: "forwarded_for_signature", actorRole: "royal_college_staff", actorName: "เจ้าหน้าที่ทะเบียน", createdAt: "2026-01-16T04:00:00.000Z" },
      { id: "event-historical-001-c", type: "signed", actorRole: "president", actorName: "ภญ. ดร. พิมพ์ชนก วัฒนกิจ", createdAt: "2026-01-17T04:00:00.000Z" },
    ],
    progress: progressForStatus("signed"),
    mockSignature: {
      kind: "mock_e_sign",
      signerAssignmentId: "term-vpt-2568",
      signerUserId: "president-vpt-former",
      signerName: "ภญ. ดร. พิมพ์ชนก วัฒนกิจ",
      signerRoleLabel: "ประธานวิทยาลัยเภสัชบำบัดแห่งประเทศไทย",
      collegeCode: "วภท.",
      signedAt: "2026-01-17T04:00:00.000Z",
      documentFingerprint: "DOC-LEGACY001",
      stampLabel: "ลงนามอิเล็กทรอนิกส์โดยประธานวิทยาลัย",
      consentText: "ยืนยันการลงนามอิเล็กทรอนิกส์ในระบบ",
    },
  },
  {
    id: "ง.1-2569-002",
    categoryId: "legacy",
    typeLabel: "การเงิน",
    title: "ขอผ่อนผันชำระค่าลงทะเบียน",
    displayDate: "20 ม.ค. 2569",
    createdAt: "2026-01-20T03:15:00.000Z",
    updatedAt: "2026-01-20T03:15:00.000Z",
    status: "awaiting_president_signature",
    collegeCode: "วภท.",
    requester: CURRENT_MEMBER,
    fields: [
      {
        id: "detail",
        label: "รายละเอียด",
        value: "ขอผ่อนผันการชำระค่าลงทะเบียน โดยจะชำระภายในวันที่ 15 ของเดือนถัดไป",
      },
    ],
    applicantNote: "ขอความอนุเคราะห์พิจารณาตามกำหนดชำระที่แจ้งไว้",
    courses: [],
    documents: [],
    comments: [],
    events: [
      { id: "event-historical-002-a", type: "submitted", actorRole: "student", actorName: CURRENT_MEMBER.name, createdAt: "2026-01-20T03:15:00.000Z" },
      { id: "event-historical-002-b", type: "forwarded_for_signature", actorRole: "royal_college_staff", actorName: "เจ้าหน้าที่ทะเบียน", createdAt: "2026-01-21T03:15:00.000Z" },
    ],
    progress: progressForStatus("awaiting_president_signature"),
    signatureWorkflow: {
      kind: "two_level",
      preparedAt: "2026-01-21T03:15:00.000Z",
      preparedBy: {
        userId: "staff-002",
        userName: "เจ้าหน้าที่งานเอกสาร",
        role: "royal_college_staff",
        organisationId: "org-royal-college",
        organisationCode: "รวภท.",
        organisationName: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย",
      },
      documentFingerprint: "DOC-9C27D1A2",
      evidenceReference: "MEMO-2569-021",
      steps: [
        { id: "ง.1-2569-002-signature-college", order: 1, level: "college", organisationId: "org-college-vpt", organisationCode: "วภท.", organisationName: "วิทยาลัยเภสัชบำบัดแห่งประเทศไทย", status: "awaiting_signature" },
        { id: "ง.1-2569-002-signature-royal", order: 2, level: "royal_college", organisationId: "org-royal-college", organisationCode: "รวภท.", organisationName: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย", status: "pending" },
      ],
    },
  },
  {
    id: "รภ-2569-005",
    categoryId: "certificate",
    typeLabel: "หนังสือรับรอง",
    title: "ขอหนังสือรับรองมาตรฐานการฝึกอบรม",
    displayDate: "22 ม.ค. 2569",
    createdAt: "2026-01-22T02:30:00.000Z",
    updatedAt: "2026-01-23T04:00:00.000Z",
    status: "awaiting_president_signature",
    collegeCode: "วภท.",
    requester: { memberId: "วภท-2568-014", name: "ภญ. พิมพ์ลภัส สุขเกษม", email: "pimlapas@rpc.ac.th" },
    fields: [{ id: "purpose", label: "วัตถุประสงค์", value: "ใช้ประกอบการรับรองคุณวุฒิฝึกอบรม" }],
    courses: [],
    documents: [],
    comments: [],
    events: [
      { id: "event-royal-005-a", type: "submitted", actorRole: "student", actorName: "ภญ. พิมพ์ลภัส สุขเกษม", createdAt: "2026-01-22T02:30:00.000Z" },
      { id: "event-royal-005-b", type: "forwarded_for_signature", actorRole: "royal_college_staff", actorName: "เจ้าหน้าที่งานเอกสาร", createdAt: "2026-01-23T04:00:00.000Z" },
    ],
    progress: progressForStatus("awaiting_president_signature"),
    signatureWorkflow: {
      kind: "royal_only",
      preparedAt: "2026-01-23T04:00:00.000Z",
      preparedBy: { userId: "staff-002", userName: "เจ้าหน้าที่งานเอกสาร", role: "royal_college_staff", organisationId: "org-royal-college", organisationCode: "รวภท.", organisationName: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย" },
      documentFingerprint: "DOC-7E42A9C1",
      evidenceReference: "CERT-REF-2569-005",
      steps: [{ id: "รภ-2569-005-signature-royal", order: 1, level: "royal_college", organisationId: "org-royal-college", organisationCode: "รวภท.", organisationName: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย", status: "awaiting_signature" }],
    },
  },
  {
    id: "อ.1-2569-003",
    categoryId: "legacy",
    typeLabel: "เอกสารสำคัญ",
    title: "ขอหนังสือรับรองการเป็นผู้เข้าศึกษา",
    displayDate: "25 ม.ค. 2569",
    createdAt: "2026-01-25T06:45:00.000Z",
    updatedAt: "2026-01-25T06:45:00.000Z",
    status: "staff_review",
    collegeCode: "วภท.",
    requester: CURRENT_MEMBER,
    fields: [
      {
        id: "detail",
        label: "รายละเอียด",
        value: "ขอหนังสือรับรองภาษาอังกฤษจำนวน 2 ฉบับ เพื่อประกอบการขอวีซ่า",
      },
    ],
    courses: [],
    documents: [],
    comments: [],
    events: [
      { id: "event-historical-003-a", type: "submitted", actorRole: "student", actorName: CURRENT_MEMBER.name, createdAt: "2026-01-25T06:45:00.000Z" },
    ],
    progress: progressForStatus("staff_review"),
  },
  {
    id: "จ.1-2569-004",
    categoryId: "legacy",
    typeLabel: "คำร้องทั่วไป",
    title: "ขอเปลี่ยนสาขาวิชา",
    displayDate: "10 ธ.ค. 2568",
    createdAt: "2025-12-10T02:00:00.000Z",
    updatedAt: "2025-12-12T07:20:00.000Z",
    status: "rejected",
    collegeCode: "วภท.",
    requester: CURRENT_MEMBER,
    fields: [
      {
        id: "detail",
        label: "รายละเอียด",
        value: "ขอเปลี่ยนจากสาขาเภสัชบำบัดเป็นสาขาเภสัชกรรมชุมชน",
      },
    ],
    courses: [],
    documents: [],
    comments: [
      {
        id: "comment-historical-004",
        actorRole: "royal_college_staff",
        actorName: "หัวหน้าสาขา",
        message: "พ้นกำหนดเปลี่ยนแปลงสาขาสำหรับปีการศึกษาปัจจุบัน",
        createdAt: "2025-12-12T07:20:00.000Z",
      },
    ],
    events: [
      { id: "event-historical-004-a", type: "submitted", actorRole: "student", actorName: CURRENT_MEMBER.name, createdAt: "2025-12-10T02:00:00.000Z" },
      { id: "event-historical-004-b", type: "rejected", actorRole: "royal_college_staff", actorName: "หัวหน้าสาขา", createdAt: "2025-12-12T07:20:00.000Z", note: "พ้นกำหนดเปลี่ยนแปลงสาขาสำหรับปีการศึกษาปัจจุบัน" },
    ],
    progress: progressForStatus("rejected"),
  },
] as const;

export function getRequestCategory(categoryId: RequestCategoryId) {
  return REQUEST_CATALOG.find((category) => category.id === categoryId);
}

export function formatThaiRequestDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function makeRequestId(category: RequestCategoryDefinition, now: Date) {
  return `${category.code}-${now.getFullYear() + 543}-${now.getTime().toString().slice(-6)}`;
}

export function progressForStatus(status: RequestStatus): string[] {
  if (status === "signed") {
    return ["ยื่นคำร้องแล้ว ✓", "เจ้าหน้าที่ตรวจสอบ ✓", "ประธานลงนาม ✓"];
  }
  if (status === "rejected") {
    return ["ยื่นคำร้องแล้ว ✓", "พิจารณาไม่ผ่าน ✗", "ปิดคำร้อง"];
  }
  if (status === "needs_information") {
    return ["ยื่นคำร้องแล้ว ✓", "เจ้าหน้าที่ขอข้อมูลเพิ่ม ◷", "รอผู้ยื่นดำเนินการ"];
  }
  if (status === "awaiting_president_signature") {
    return ["ยื่นคำร้องแล้ว ✓", "เจ้าหน้าที่ตรวจสอบ ✓", "รอประธานลงนาม ◷"];
  }
  return ["ยื่นคำร้องแล้ว ✓", "เจ้าหน้าที่ตรวจสอบ ◷", "รอประธานลงนาม"];
}

const TRANSITIONS: Record<RequestActorRole, Partial<Record<RequestStatus, readonly RequestStatus[]>>> = {
  student: {
    needs_information: ["staff_review"],
  },
  royal_college_staff: {
    staff_review: ["needs_information", "awaiting_president_signature", "rejected"],
    needs_information: ["rejected"],
  },
  president: {
    awaiting_president_signature: ["signed", "rejected"],
  },
  system: {},
};

export function canTransitionRequest(
  current: RequestStatus,
  next: RequestStatus,
  actorRole: RequestActorRole,
) {
  return TRANSITIONS[actorRole][current]?.includes(next) ?? false;
}

export function makeTimelineId(prefix: string, now: Date, sequence = 0) {
  return `${prefix}-${now.getTime().toString(36)}-${sequence.toString(36)}`;
}

function stableMockHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function makeMockDocumentFingerprint(
  request: MockRequest,
  signedAt: string,
  handwrittenSignature?: HandwrittenSignature,
) {
  const payload = JSON.stringify({
    id: request.id,
    categoryId: request.categoryId,
    collegeCode: request.collegeCode,
    requester: request.requester.memberId,
    fields: request.fields,
    applicantNote: request.applicantNote,
    courses: request.courses,
    documents: request.documents.map((document) => ({
      id: document.id,
      file: document.file,
    })),
    signedAt,
    handwrittenSignature,
  });
  return `DOC-${stableMockHash(payload)}`;
}

export function makeRequestDocumentFingerprint(request: MockRequest) {
  const payload = JSON.stringify({
    id: request.id,
    categoryId: request.categoryId,
    collegeCode: request.collegeCode,
    requester: request.requester.memberId,
    fields: request.fields,
    applicantNote: request.applicantNote,
    courses: request.courses,
    documents: request.documents.map((document) => ({
      id: document.id,
      file: document.file,
    })),
  });
  return `DOC-${stableMockHash(payload)}`;
}

export const REQUEST_EVENT_LABELS: Record<RequestEventType, string> = {
  submitted: "ยื่นคำร้อง",
  information_requested: "ขอข้อมูลเพิ่มเติม",
  resubmitted: "ส่งข้อมูลกลับเพื่อตรวจสอบ",
  forwarded_for_signature: "ส่งให้ประธานลงนาม",
  signature_step_completed: "ลงนามตามลำดับขั้นแล้ว",
  forwarded_to_next_signer: "ส่งต่อให้ผู้ลงนามระดับถัดไป",
  signed: "ประธานลงนามแล้ว",
  rejected: "ไม่อนุมัติคำร้อง",
  migrated: "ย้ายข้อมูลจากระบบเดิม",
};
