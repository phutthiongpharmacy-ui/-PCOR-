// ════════════════════════════════════════════════════════════════════════════
// Professional Passport — Standardized Schema (มาตรฐานกลาง)
// ────────────────────────────────────────────────────────────────────────────
// โครง "หนังสือเดินทางวิชาชีพ" (Professional Passport) ที่ออกแบบให้เป็นมาตรฐานกลาง
// ใช้ซ้ำได้ข้ามสภา/องค์กรวิชาชีพ (เภสัชกรรมเป็นที่แรก → แพทย์/พยาบาล/ทันตแพทย์ ฯลฯ ต่อยอด)
//
// อ้างอิงกรอบสากล:
//  • FIP Global Competency Framework (GbCFv2) — 4 คลัสเตอร์สมรรถนะ
//  • NHS Digital Clinical Competency Passport — แนวคิดพกพา + ยืนยันข้ามหน่วยงาน
//
// บล็อกมาตรฐาน A–H:
//  A. identity + license   E. cpd
//  B. qualifications       F. experience
//  C. specializations      G. academicWork
//  D. competencies         H. verification (ฝังในทุก VerifiableField)
// ════════════════════════════════════════════════════════════════════════════

/** วันที่แบบ ISO 8601 (YYYY-MM-DD) — เก็บเป็น machine-readable, แสดงผลค่อย format */
export type IsoDate = string;

// ─── H. Verification / Trust layer ──────────────────────────────────────────
// ฝังในทุกข้อมูลที่ต้อง "เชื่อถือได้" — ใครรับรอง เมื่อไหร่ ด้วยหลักฐานอะไร

export type VerificationStatus = "verified" | "pending" | "self_declared" | "rejected";

export interface Verification {
  status: VerificationStatus;
  /** องค์กร/บุคคลที่รับรอง (เช่น "สภาเภสัชกรรม", "วิทยาลัยเภสัชบำบัดฯ") */
  verifiedBy?: string;
  verifiedAt?: IsoDate;
  /** ไฟล์หลักฐานแนบ (เก็บ path/URL — DB จะเก็บเป็น object storage key) */
  evidenceUrl?: string;
  note?: string;
}

/** ค่าที่ผูกกับชั้นการยืนยันเสมอ */
export interface Verifiable {
  verification: Verification;
}

// ─── องค์กรผู้ออก (reusable ข้ามวิชาชีพ) ─────────────────────────────────────

export interface IssuingAuthority {
  /** slug ใช้เป็น key เวลาต่อยอดวิชาชีพอื่น เช่น "pharmacy" | "medical" | "nursing" */
  domain: string;
  nameTh: string;
  nameEn: string;
  /** สภา/องค์กรกำกับใบอนุญาต */
  regulatorTh: string;
  regulatorEn: string;
  logoUrl?: string;
  website?: string;
}

// ─── A. Identity + License ──────────────────────────────────────────────────

export type Gender = "male" | "female" | "other";

export interface PersonIdentity {
  titleTh: string;          // ภก. / ภญ. / นพ. ...
  firstNameTh: string;
  lastNameTh: string;
  firstNameEn: string;
  lastNameEn: string;
  gender: Gender;
  /** เลขบัตรประชาชน — sensitive, แสดงแบบ mask */
  citizenId?: string;
  dateOfBirth: IsoDate;
  nationality: string;
  photoUrl?: string;
  email: string;
  phone: string;
}

export type LicenseStatus = "active" | "suspended" | "revoked" | "expired" | "lapsed";

/** ใบประกอบวิชาชีพ + รอบชีวิต (License lifecycle) */
export interface ProfessionalLicense {
  /** เลขที่ใบประกอบวิชาชีพ เช่น ภ.12345 */
  licenseNumber: string;
  status: LicenseStatus;
  issuedAt: IsoDate;
  /** ใบอนุญาตต่ออายุทุก 5 ปี ผูกกับ CPD */
  expiresAt: IsoDate;
  /** รอบการต่ออายุปัจจุบัน (เช่น "2565-2570") */
  renewalCycle: string;
}

// ─── B. Qualifications (คุณวุฒิการศึกษา) ─────────────────────────────────────

export interface Qualification extends Verifiable {
  id: string;
  degreeTh: string;         // เภสัชศาสตรบัณฑิต (ภ.บ.)
  field: string;
  institution: string;
  graduationYear: string;   // พ.ศ.
  gpa?: string;
}

// ─── C. Specializations (ความเชี่ยวชาญเฉพาะทาง / วุฒิบัตร-หนังสืออนุมัติ) ─────

export type CredentialType =
  | "board_certificate"     // วุฒิบัตร (Board Certified)
  | "approval_certificate"  // หนังสืออนุมัติ
  | "diploma"               // ประกาศนียบัตร
  | "in_training";          // กำลังฝึกอบรม (ยังไม่ได้รับรอง)

export interface Specialization extends Verifiable {
  id: string;
  type: CredentialType;
  titleTh: string;
  specialtyTh: string;      // สาขา เช่น เภสัชบำบัด
  collegeShort: string;     // วภท. / วคบท. / CPAT ...
  issuedAt?: IsoDate;       // ว่างได้ถ้ากำลังฝึกอบรม
  expiresAt?: IsoDate;
  /** ความคืบหน้าถ้ายังอยู่ระหว่างฝึกอบรม (0–100) */
  progress?: number;
}

// ─── D. Competencies (สมรรถนะ ตามกรอบ FIP) — หัวใจของการ "จับคู่" ────────────

/** ระดับความชำนาญ 1–4 (สอดคล้อง FIP: Foundation → Advanced) */
export type ProficiencyLevel = 1 | 2 | 3 | 4;

export interface CompetencyRating extends Verifiable {
  /** key ชี้ไป CompetencyArea ใน framework */
  areaId: string;
  selfLevel: ProficiencyLevel;
  /** ระดับที่ถูกรับรอง (ว่างได้ถ้ายังไม่ประเมิน) */
  verifiedLevel?: ProficiencyLevel;
}

// ─── E. CPD / CPE (การศึกษาต่อเนื่อง + รอบต่ออายุ) ───────────────────────────

export interface CpdActivity {
  id: string;
  title: string;
  category: string;
  date: IsoDate;
  credits: number;
}

export interface CpdSummary {
  currentCredits: number;
  targetCredits: number;      // 100 ต่อรอบ 5 ปี
  perYearMinimum: number;     // 10 ต่อปี
  cycleExpiresAt: IsoDate;
  activities: CpdActivity[];
}

export type ContinuingEducationStatus =
  | "active"
  | "warning"
  | "completed"
  | "non_compliant";

// ─── F. Professional Experience (ประสบการณ์วิชาชีพ) ─────────────────────────

export interface WorkExperience extends Verifiable {
  id: string;
  organization: string;
  position: string;
  /** ช่วงเวลา ปีเริ่ม (พ.ศ.) */
  startYear: string;
  endYear?: string;           // ว่าง = ปัจจุบัน
  isCurrent: boolean;
  responsibilities?: string;
  employmentType?: string;    // ราชการ / เอกชน / รัฐวิสาหกิจ
}

// ─── G. Academic Work (ผลงานวิชาการ/วิจัย) ──────────────────────────────────

export type AcademicKind = "publication" | "research_project" | "speaker" | "award";

export interface AcademicWork extends Verifiable {
  id: string;
  kind: AcademicKind;
  title: string;
  year: string;
  role?: string;
  venue?: string;
}

// ─── The Passport (ประกอบทุกบล็อก) ──────────────────────────────────────────

export interface ProfessionalPassport {
  /** รหัสสมาชิกราชวิทยาลัย เช่น วภท-2568-001 */
  memberId: string;
  /** โทเคนสำหรับ QR ตรวจสอบสาธารณะ (public verification) */
  verifyToken: string;
  issuingAuthority: IssuingAuthority;

  identity: PersonIdentity;        // A
  license: ProfessionalLicense;    // A
  qualifications: Qualification[]; // B
  specializations: Specialization[]; // C
  competencies: CompetencyRating[];  // D
  cpd: CpdSummary;                 // E
  experience: WorkExperience[];    // F
  academicWork: AcademicWork[];    // G

  /** สาขาที่สนใจ/มุ่งพัฒนา (ใช้เสริมการจับคู่) — ยังไม่ใช่ certified */
  focusAreas: string[];
  updatedAt: IsoDate;
}

// ─── ป้ายกำกับภาษาไทย (labels) สำหรับแสดงผล ─────────────────────────────────

export const proficiencyLabels: Record<ProficiencyLevel, string> = {
  1: "ระดับพื้นฐาน",
  2: "ระดับปฏิบัติได้",
  3: "ระดับชำนาญ",
  4: "ระดับเชี่ยวชาญ",
};

export const licenseStatusLabels: Record<LicenseStatus, { th: string; tone: "ok" | "warn" | "danger" }> = {
  active: { th: "ปกติ", tone: "ok" },
  suspended: { th: "พักใช้", tone: "danger" },
  revoked: { th: "เพิกถอน", tone: "danger" },
  expired: { th: "หมดอายุ", tone: "danger" },
  lapsed: { th: "ขาดต่ออายุ", tone: "warn" },
};

export const credentialTypeLabels: Record<CredentialType, string> = {
  diploma: "ประกาศนียบัตร",
  approval_certificate: "หนังสืออนุมัติ",
  board_certificate: "วุฒิบัตร",
  in_training: "กำลังฝึกอบรม",
};

export const verificationLabels: Record<VerificationStatus, { th: string; tone: "ok" | "warn" | "muted" | "danger" }> = {
  verified: { th: "ยืนยันแล้ว", tone: "ok" },
  pending: { th: "รอตรวจสอบ", tone: "warn" },
  self_declared: { th: "แจ้งด้วยตนเอง", tone: "muted" },
  rejected: { th: "ไม่ผ่าน", tone: "danger" },
};
