// ════════════════════════════════════════════════════════════════════════════
// Selectors — ค่าที่ derive จาก passport (คำนวณครั้งเดียว ใช้ซ้ำทุกหน้า)
// ════════════════════════════════════════════════════════════════════════════

import type {
  ContinuingEducationStatus,
  CpdSummary,
  ProfessionalPassport,
  CompetencyRating,
  CredentialType,
  ProficiencyLevel,
  Specialization,
} from "./passport";
import { fipFramework, type CompetencyArea, type CompetencyCluster } from "./competency-framework";

const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** ISO (ค.ศ.) → "11 เม.ย. 2543" (พ.ศ.) */
export function formatThaiDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function fullNameTh(p: ProfessionalPassport): string {
  return `${p.identity.titleTh}${p.identity.firstNameTh} ${p.identity.lastNameTh}`;
}

export function fullNameEn(p: ProfessionalPassport): string {
  return `${p.identity.firstNameEn} ${p.identity.lastNameEn}`;
}

const credentialTypeOrder: Record<CredentialType, number> = {
  diploma: 0,
  approval_certificate: 1,
  board_certificate: 2,
  in_training: 3,
};

export function specializationsForDisplay(
  p: ProfessionalPassport,
  verifiedOnly = false,
): Specialization[] {
  return p.specializations
    .filter((specialization) => !verifiedOnly || specialization.verification.status === "verified")
    .slice()
    .sort((left, right) => credentialTypeOrder[left.type] - credentialTypeOrder[right.type]);
}

export function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

/** ปิดบังเลขบัตรประชาชน: 1-1002-01234-56-7 → 1-XXXX-XXXXX-56-7 */
export function maskCitizenId(id?: string): string {
  if (!id) return "—";
  const digits = id.replace(/\D/g, "");
  if (digits.length !== 13) return id;
  return `${digits[0]}-XXXX-XXX${digits.slice(8, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
}

export function cpdProgressPct(p: ProfessionalPassport): number {
  return Math.min(100, Math.round((p.cpd.currentCredits / p.cpd.targetCredits) * 100));
}

export function cpdRemaining(p: ProfessionalPassport): number {
  return Math.max(0, p.cpd.targetCredits - p.cpd.currentCredits);
}

export const continuingEducationStatusMeta = {
  active: { label: "สถานะปกติ", variant: "success" },
  warning: { label: "ควรเร่งสะสมหน่วยกิต", variant: "warning" },
  completed: { label: "ครบเกณฑ์การศึกษาต่อเนื่อง", variant: "info" },
  non_compliant: { label: "ไม่ครบเกณฑ์", variant: "danger" },
} as const satisfies Record<
  ContinuingEducationStatus,
  { label: string; variant: "success" | "warning" | "info" | "danger" }
>;

export function getContinuingEducationStatus(
  cpd: CpdSummary,
  now: Date | string = new Date(),
): ContinuingEducationStatus {
  if (cpd.currentCredits >= cpd.targetCredits) return "completed";
  const nowMs = typeof now === "string" ? new Date(now).getTime() : now.getTime();
  const expiresAt = new Date(cpd.cycleExpiresAt).getTime();
  if (!Number.isNaN(nowMs) && !Number.isNaN(expiresAt) && nowMs > expiresAt) {
    return "non_compliant";
  }
  const daysRemaining = Number.isNaN(nowMs) || Number.isNaN(expiresAt)
    ? Number.POSITIVE_INFINITY
    : Math.ceil((expiresAt - nowMs) / (24 * 3600 * 1000));
  return daysRemaining <= 365 || cpd.currentCredits < cpd.perYearMinimum
    ? "warning"
    : "active";
}

export interface ClusterCompetency {
  cluster: CompetencyCluster;
  ratings: { area: CompetencyArea; rating: CompetencyRating }[];
  /** ค่าเฉลี่ยระดับ (self ถ้าไม่มี verified) ต่อคลัสเตอร์ ใช้ทำ radar/แถบสรุป */
  averageLevel: number;
}

/** จัดกลุ่มสมรรถนะตามคลัสเตอร์ FIP */
export function competenciesByCluster(p: ProfessionalPassport): ClusterCompetency[] {
  return fipFramework.map((cluster) => {
    const ratings = cluster.areas
      .map((area) => {
        const rating = p.competencies.find((c) => c.areaId === area.id);
        return rating ? { area, rating } : null;
      })
      .filter((x): x is { area: CompetencyArea; rating: CompetencyRating } => x !== null);

    const levels = ratings.map((r) => r.rating.verifiedLevel ?? r.rating.selfLevel);
    const averageLevel = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;

    return { cluster, ratings, averageLevel };
  });
}

/** ระดับที่ใช้แสดงผล (verified ถ้ามี ไม่งั้น self) */
export function effectiveLevel(rating: CompetencyRating): ProficiencyLevel {
  return rating.verifiedLevel ?? rating.selfLevel;
}

/** จำนวนวันคงเหลือก่อนใบอนุญาตหมดอายุ */
export function daysUntilLicenseExpiry(p: ProfessionalPassport): number {
  const exp = new Date(p.license.expiresAt).getTime();
  return Math.ceil((exp - Date.now()) / (24 * 3600 * 1000));
}

/** URL สำหรับ QR ตรวจสอบสาธารณะ */
export function verifyUrl(token: string, origin = ""): string {
  return `${origin}/verify/${token}`;
}
