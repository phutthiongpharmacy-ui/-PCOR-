"use client";

// ════════════════════════════════════════════════════════════════════════════
// Public Verification — หน้าตรวจสอบสาธารณะ (สแกน QR จาก Professional Passport)
// แสดงเฉพาะข้อมูลที่เปิดเผยได้ (ไม่มีเลขบัตร ปชช./ที่อยู่) — สำหรับหน่วยงานภายนอกยืนยันตัวตน
// ════════════════════════════════════════════════════════════════════════════

import { use } from "react";
import Link from "next/link";
import {
  findByVerifyTokenSync,
  fullNameTh,
  fullNameEn,
  formatThaiDate,
  specializationsForDisplay,
  credentialTypeLabels,
  licenseStatusLabels,
} from "@/roles/shared/member/domain";

type CellTone = "ok" | "warn" | "danger";

const CELL_TONE_CLASSES: Record<CellTone, string> = {
  ok: "text-success",
  warn: "text-warning",
  danger: "text-danger",
};

export default function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const p = findByVerifyTokenSync(token);

  if (!p) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6 text-center">
        <span className="material-symbols-outlined mb-3 text-5xl text-danger">gpp_bad</span>
        <h1 className="text-xl font-bold">ไม่พบ Pharmacist Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">รหัสตรวจสอบ <span className="font-mono">{token}</span> ไม่ถูกต้องหรือถูกยกเลิก</p>
      </div>
    );
  }

  const licMeta = licenseStatusLabels[p.license.status];
  const verifiedCompetencies = p.competencies.filter((c) => c.verification.status === "verified").length;
  const specializations = specializationsForDisplay(p, true);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-primary/5 to-muted/20 p-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
        {/* Header */}
        <div className="border-b-2 border-primary bg-brand-soft px-6 py-5 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface-raised p-1.5">
            <img src={p.issuingAuthority.logoUrl} alt={`ตราสัญลักษณ์${p.issuingAuthority.nameTh}`} className="h-full w-full object-contain" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-on-soft">
            <span className="material-symbols-outlined text-15">verified</span>
            ยืนยันโดย{p.issuingAuthority.regulatorTh}
          </div>
        </div>

        {/* Identity */}
        <div className="flex flex-col items-center px-6 py-6 text-center">
          <div className="h-24 w-20 overflow-hidden rounded-md border-2 border-border bg-muted shadow-sm">
            <img src={p.identity.photoUrl} alt={fullNameTh(p)} className="h-full w-full object-cover object-top" />
          </div>
          <h1 className="mt-3 text-lg font-bold">{fullNameTh(p)}</h1>
          <p className="text-sm text-muted-foreground">{fullNameEn(p)}</p>

          <div className="mt-4 grid w-full grid-cols-2 gap-2 text-left">
            <Cell label="เลขที่ใบประกอบฯ" value={p.license.licenseNumber} />
            <Cell label="สถานะใบอนุญาต" value={licMeta.th} tone={licMeta.tone} />
            <Cell label="รหัสสมาชิก" value={p.memberId} />
            <Cell label="หมดอายุ" value={formatThaiDate(p.license.expiresAt)} />
          </div>

          {/* Specializations */}
          {specializations.length > 0 && (
            <div className="mt-4 w-full text-left">
              <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">ความเชี่ยวชาญเฉพาะทาง</div>
              <div className="space-y-1.5">
                {specializations.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-xs font-medium">{s.specialtyTh} · {s.collegeShort}</span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary">{credentialTypeLabels[s.type]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex w-full items-center justify-center gap-6 rounded-lg bg-muted/40 py-3 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{verifiedCompetencies}</div>
              <div className="text-2xs text-muted-foreground">สมรรถนะที่รับรอง</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-lg font-bold text-primary">{p.cpd.currentCredits}</div>
              <div className="text-2xs text-muted-foreground">หน่วยกิต CPD</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/20 px-6 py-3 text-center text-2xs text-muted-foreground">
          ตรวจสอบเมื่อ {formatThaiDate(new Date().toISOString())} · รหัส <span className="font-mono">{p.verifyToken}</span>
        </div>
      </div>
      <Link href="/" className="mt-4 text-xs text-muted-foreground hover:text-primary">← กลับหน้าหลัก</Link>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: CellTone }) {
  const color = tone ? CELL_TONE_CLASSES[tone] : "text-foreground";
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
