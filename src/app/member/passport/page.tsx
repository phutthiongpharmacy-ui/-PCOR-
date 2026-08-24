"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { registrationData, studentDetailData } from "@/roles/shared/data";
import { formatCourseCode } from "@/roles/shared/data/college-directory";
import {
  getCurrentPassportSync,
  fullNameTh,
  fullNameEn,
  ageFromDob,
  maskCitizenId,
  formatThaiDate,
  competenciesByCluster,
  effectiveLevel,
  daysUntilLicenseExpiry,
  verifyUrl,
  proficiencyLabels,
  specializationsForDisplay,
  licenseStatusLabels,
  credentialTypeLabels,
  verificationLabels,
  type Verification,
  type ProficiencyLevel,
} from "@/roles/shared/member/domain";

// ─── UI helpers ──────────────────────────────────────────────────────────────

const toneVariant: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ok: "success",
  warn: "warning",
  danger: "danger",
  muted: "neutral",
};

function VerifyBadge({ verification }: { verification: Verification }) {
  const meta = verificationLabels[verification.status];
  const icon =
    verification.status === "verified" ? "verified"
    : verification.status === "pending" ? "hourglass_top"
    : verification.status === "rejected" ? "cancel"
    : "edit_note";
  return (
    <Badge
      variant={toneVariant[meta.tone]}
      className="h-auto rounded-full text-2xs"
      title={verification.verifiedBy ? `${meta.th} · ${verification.verifiedBy}` : meta.th}
    >
      <span className="material-symbols-outlined text-caption">{icon}</span>
      {meta.th}
    </Badge>
  );
}

/** แถบระดับความชำนาญ 1–4 */
function ProficiencyMeter({ level, verified }: { level: ProficiencyLevel; verified: boolean }) {
  return (
    <div className="flex items-center gap-0.5" title={proficiencyLabels[level]}>
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={`h-1.5 w-5 rounded-full ${
            n <= level ? (verified ? "bg-primary" : "bg-primary/40") : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

/** หัวข้อ section แบบเอกสารราชการ */
function SectionHeader({ label, icon, sub }: { label: string; icon: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5 border-b border-border pb-3">
      <span className="material-symbols-outlined text-xl text-primary">{icon}</span>
      <div>
        <h2 className="text-15 font-bold tracking-tight text-foreground">{label}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PassportPage() {
  const p = getCurrentPassportSync();
  const clusters = competenciesByCluster(p);
  const specializations = specializationsForDisplay(p);
  const [origin, setOrigin] = useState("");

  // อ่าน origin หลัง mount เพื่อประกอบลิงก์/QR ตรวจสอบแบบ absolute (client-only)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), []);

  const licMeta = licenseStatusLabels[p.license.status];
  const expiryDays = daysUntilLicenseExpiry(p);
  const qrData = encodeURIComponent(verifyUrl(p.verifyToken, origin));

  return (
    <PageShell size="wide" className="space-y-5">
      {/* ══ Official Document Header ══ */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b-2 border-primary bg-gradient-to-r from-primary/[0.07] to-transparent px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised p-1.5">
              <img src={p.issuingAuthority.logoUrl} alt={`ตราสัญลักษณ์${p.issuingAuthority.nameTh}`} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold leading-tight text-foreground md:text-lg">{p.issuingAuthority.nameTh}</h2>
              <p className="text-xs text-muted-foreground">{p.issuingAuthority.nameEn}</p>
              <p className="mt-0.5 text-2xs text-muted-foreground">ภายใต้การกำกับของ{p.issuingAuthority.regulatorTh} · {p.issuingAuthority.regulatorEn}</p>
            </div>
            <div className="hidden shrink-0 text-right md:block">
              <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <span className="material-symbols-outlined text-15">badge</span>
                 Pharmacist Profile
              </div>
              <p className="mt-1 text-2xs text-muted-foreground">ข้อมูลประวัติและสถานะทางวิชาชีพ</p>
            </div>
          </div>
        </div>

        {/* Identity band (A) */}
        <div className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[auto_1fr_auto]">
          {/* Photo */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-32 w-28 overflow-hidden rounded-md border-2 border-border bg-muted shadow-sm">
              <img src={p.identity.photoUrl} alt={fullNameTh(p)} className="h-full w-full object-cover object-top" />
            </div>
            <Badge variant={toneVariant[licMeta.tone]} className="h-auto rounded-full text-2xs font-semibold">
              <span className="material-symbols-outlined text-caption">
                {licMeta.tone === "ok" ? "verified_user" : "gpp_maybe"}
              </span>
              ใบอนุญาต{licMeta.th}
            </Badge>
          </div>

          {/* Identity fields */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">{fullNameTh(p)}</h2>
              <p className="text-sm text-muted-foreground">{fullNameEn(p)} · อายุ {ageFromDob(p.identity.dateOfBirth)} ปี</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Field label="รหัสสมาชิก" value={p.memberId} mono />
              <Field label="เลขที่ใบประกอบวิชาชีพ" value={p.license.licenseNumber} mono />
              <Field label="เลขบัตรประชาชน" value={maskCitizenId(p.identity.citizenId)} mono />
              <Field label="วันเกิด" value={formatThaiDate(p.identity.dateOfBirth)} />
              <Field label="สัญชาติ" value={p.identity.nationality} />
              <Field label="อีเมล" value={p.identity.email} />
              <Field label="สถาบันที่กำลังศึกษา" value="สถาบันฝึกอบรมโรงพยาบาลศิริราช" />
            </div>
            {/* focus areas */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">สาขาที่มุ่งพัฒนา:</span>
              {p.focusAreas.map((f) => (
                <span key={f} className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary">{f}</span>
              ))}
            </div>
          </div>

          {/* License + QR */}
          <div className="flex flex-col items-center gap-3 md:w-52 md:border-l md:border-border md:pl-6">
            <div className="w-full rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground">รอบต่ออายุ</span>
                <span className="font-semibold">{p.license.renewalCycle}</span>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground">หมดอายุ</span>
                <span className="font-semibold">{formatThaiDate(p.license.expiresAt)}</span>
              </div>
              <Badge variant={expiryDays < 180 ? "warning" : "success"} className="flex h-auto w-full rounded-md border-0 px-2 py-1 text-2xs">
                {expiryDays > 0 ? `เหลืออีก ${expiryDays} วัน` : "หมดอายุแล้ว"}
              </Badge>
            </div>
            <div className="flex flex-col items-center rounded-lg border border-border bg-surface-raised p-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`}
                alt="QR ตรวจสอบ"
                className="h-24 w-24"
              />
              <span className="mt-1 font-mono text-3xs text-muted-foreground">{p.verifyToken}</span>
              <span className="text-3xs text-muted-foreground">สแกนเพื่อตรวจสอบ</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            const url = origin + verifyUrl(p.verifyToken);
            navigator.clipboard?.writeText(url).then(() => toast.success("คัดลอกลิงก์ตรวจสอบแล้ว")).catch(() => {});
          }}>
            <span className="material-symbols-outlined text-base">link</span> คัดลอกลิงก์ตรวจสอบ
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
            <span className="material-symbols-outlined text-base">print</span> พิมพ์
          </Button>
        </div>
      </div>

      {/* ══ D. Competencies (FIP) ══ */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <SectionHeader label="สมรรถนะวิชาชีพ (Competencies)" icon="radar" sub="อ้างอิงกรอบสมรรถนะสากล FIP Global Competency Framework — 4 ด้าน" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {clusters.map(({ cluster, ratings, averageLevel }) => (
            <div key={cluster.id} className="rounded-lg border border-border bg-background/40 p-4">
              <div className="mb-3 flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-lg">{cluster.icon}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-foreground">{cluster.labelTh}</h3>
                  <p className="text-2xs text-muted-foreground">{cluster.labelEn}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">{averageLevel.toFixed(1)}</div>
                  <div className="text-3xs text-muted-foreground">/ 4.0</div>
                </div>
              </div>
              <div className="space-y-2.5">
                {ratings.length === 0 && (
                  <p className="text-xs text-muted-foreground">ยังไม่มีการประเมินในด้านนี้</p>
                )}
                {ratings.map(({ area, rating }) => (
                  <div key={area.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground" title={area.labelTh}>{area.labelTh}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <ProficiencyMeter level={effectiveLevel(rating)} verified={rating.verification.status === "verified"} />
                      <span
                        className={`material-symbols-outlined text-sm ${rating.verification.status === "verified" ? "text-primary" : "text-muted-foreground"}`}
                        title={rating.verification.status === "verified" ? "ยืนยันแล้ว" : "แจ้งด้วยตนเอง"}
                      >
                        {rating.verification.status === "verified" ? "verified" : "person"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-2xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-primary" /> ระดับที่ถูกรับรอง</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full bg-primary/40" /> แจ้งด้วยตนเอง</span>
          <span>ระดับ: 1 พื้นฐาน · 2 ปฏิบัติได้ · 3 ชำนาญ · 4 เชี่ยวชาญ</span>
        </div>
      </div>

      {/* ══ Two-column: Specializations + Qualifications ══ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* C. Specializations */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader label="ความเชี่ยวชาญเฉพาะทาง" icon="workspace_premium" sub="ประกาศนียบัตร → หนังสืออนุมัติ → วุฒิบัตร" />
          <div className="space-y-3">
            {specializations.map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">{credentialTypeLabels[s.type]}</span>
                  <VerifyBadge verification={s.verification} />
                </div>
                <h3 className="text-sm font-semibold leading-snug text-foreground">{s.titleTh}</h3>
                <p className="mt-1 text-xs text-muted-foreground">สาขา{s.specialtyTh} · {s.collegeShort}</p>
              </div>
            ))}
          </div>
        </div>

        {/* B. Qualifications */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader label="คุณวุฒิการศึกษา" icon="history_edu" />
          <div className="space-y-3">
            {p.qualifications.map((q) => (
              <div key={q.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{q.degreeTh}</h3>
                    <p className="mt-0.5 text-xs font-medium text-primary">{q.institution}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{q.field} · จบปี {q.graduationYear}{q.gpa ? ` · GPA ${q.gpa}` : ""}</p>
                  </div>
                  <VerifyBadge verification={q.verification} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Two-column: Experience + Academic ══ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* F. Experience */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader label="ประสบการณ์วิชาชีพ" icon="work" />
          <div className="relative ml-3 space-y-5 border-l-2 border-primary/20">
            {p.experience.map((e) => (
              <div key={e.id} className="relative pl-6">
                <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ring-4 ring-card ${e.isCurrent ? "bg-primary" : "bg-muted-foreground/40"}`} />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{e.position}</h3>
                    <p className="text-xs font-medium text-primary">{e.organization}</p>
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      {e.startYear} – {e.isCurrent ? "ปัจจุบัน" : e.endYear}{e.employmentType ? ` · ${e.employmentType}` : ""}
                    </p>
                    {e.responsibilities && <p className="mt-1 text-xs text-muted-foreground">{e.responsibilities}</p>}
                  </div>
                  <VerifyBadge verification={e.verification} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* G. Academic work */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader label="ผลงานวิชาการและวิจัย" icon="biotech" />
          <div className="space-y-3">
            {p.academicWork.map((a) => (
              <div key={a.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="mb-1 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-3xs font-medium text-muted-foreground">
                      {a.kind === "publication" ? "ตีพิมพ์" : a.kind === "research_project" ? "โครงการวิจัย" : a.kind === "speaker" ? "วิทยากร" : "รางวัล"}
                    </div>
                    <h3 className="text-sm font-medium leading-snug text-foreground">{a.title}</h3>
                    <p className="mt-1 text-2xs text-muted-foreground">
                      {a.role ? `${a.role} · ` : ""}{a.venue ? `${a.venue} · ` : ""}ปี {a.year}
                    </p>
                  </div>
                  <VerifyBadge verification={a.verification} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <SectionHeader label="การศึกษาปัจจุบัน" icon="school" sub={studentDetailData.program} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="วิทยาลัย" value={studentDetailData.college} />
          <Field label="สถาบันฝึกอบรม" value="สถาบันฝึกอบรมโรงพยาบาลศิริราช" />
          <Field label="หน่วยกิตสะสมทั้งหมด" value={`${studentDetailData.creditsEarned} จาก ${studentDetailData.creditsTotal} หน่วยกิต`} />
        </div>
        <div className="mt-5 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">รหัสวิชา</th><th className="px-4 py-3 font-medium">รายวิชา</th><th className="px-4 py-3 font-medium">เวลาเรียน</th><th className="px-4 py-3 font-medium">สถานะ</th></tr></thead><tbody className="divide-y">{registrationData.courses.map((course) => <tr key={course.code}><td className="px-4 py-3 font-mono text-xs">{formatCourseCode(course.code)}</td><td className="px-4 py-3 font-medium">{course.title}</td><td className="px-4 py-3 text-muted-foreground">{course.schedule}</td><td className="px-4 py-3"><Badge variant="success">ลงทะเบียนแล้ว</Badge></td></tr>)}</tbody></table>
        </div>
      </div>

      {/* Footer note */}
      <p className="flex items-center justify-center gap-1.5 text-center text-2xs text-muted-foreground">
        <span className="material-symbols-outlined text-sm">shield</span>
        Pharmacist Profile จัดทำโดย{p.issuingAuthority.nameTh} · ปรับปรุงล่าสุด {formatThaiDate(p.updatedAt)}
      </p>

    </PageShell>
  );
}
