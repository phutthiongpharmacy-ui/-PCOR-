"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { LoadingState } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  SensitiveViewAuditBoundary,
  useSensitiveViewAudit,
} from "@/roles/shared/features/audit";
import { formatSubjectResultValue } from "@/roles/shared/features/academic";
import { registrationStatusMeta } from "@/roles/shared/features/registration";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import { StaffPageHeader } from "@/roles/staff/components/StaffPageHeader";
import {
  buildStaffFinanceRows,
  type StaffFinanceRow,
} from "@/roles/staff/features/finance/staff-finance-model";

type SeededSlipFixture = {
  referenceNo: string;
  submittedAt: string;
  bankName: string;
  maskedAccount: string;
};

type RegistrationSlipProof = {
  registrationId: string;
  invoiceId: string;
  studentName: string;
  courseLabel: string;
  amount: number;
  referenceNo: string;
  submittedAt: string;
  bankName: string;
  maskedAccount: string;
  evidenceFileName: string;
  evidenceFileType?: string;
  evidenceDataUrl?: string;
  source: "uploaded" | "seeded_receipt";
};

const seededSlipFixtures: Record<string, SeededSlipFixture> = {
  "REG-MEMBER-001": { referenceNo: "PP-25690616-120001", submittedAt: "2026-06-16T02:42:00.000Z", bankName: "ธนาคารกสิกรไทย", maskedAccount: "xxx-x-xx045-x" },
  "REG-SIRIRAJ-005": { referenceNo: "PP-25690612-030005", submittedAt: "2026-06-12T04:18:00.000Z", bankName: "ธนาคารกรุงไทย", maskedAccount: "xxx-x-xx205-x" },
  "REG-SIRIRAJ-006": { referenceNo: "PP-25690613-030006", submittedAt: "2026-06-13T05:05:00.000Z", bankName: "ธนาคารไทยพาณิชย์", maskedAccount: "xxx-x-xx406-x" },
  "REG-SIRIRAJ-007": { referenceNo: "PP-25690614-120007", submittedAt: "2026-06-14T03:36:00.000Z", bankName: "ธนาคารกรุงเทพ", maskedAccount: "xxx-x-xx607-x" },
  "REG-SIRIRAJ-008": { referenceNo: "PP-25690615-120008", submittedAt: "2026-06-15T06:24:00.000Z", bankName: "ธนาคารกรุงศรีอยุธยา", maskedAccount: "xxx-x-xx808-x" },
  "REG-CHULA-003": { referenceNo: "PP-25690621-120003", submittedAt: "2026-06-21T02:51:00.000Z", bankName: "ธนาคารกสิกรไทย", maskedAccount: "xxx-x-xx103-x" },
  "REG-CHULA-004": { referenceNo: "PP-25690622-120004", submittedAt: "2026-06-22T04:09:00.000Z", bankName: "ธนาคารกรุงไทย", maskedAccount: "xxx-x-xx304-x" },
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
}

function formatBaht(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function slipProofForFinanceRow(row: StaffFinanceRow): RegistrationSlipProof | null {
  if (row.latestPayment) {
    if (!row.hasInspectableEvidence || !row.evidenceDataUrl) return null;
    return {
      registrationId: row.registrationId,
      invoiceId: row.id,
      studentName: row.studentName,
      courseLabel: `${row.courseCode} · ${row.courseTitle}`,
      amount: row.latestPayment.amount,
      referenceNo: row.latestPayment.referenceNo ?? "ไม่ระบุ",
      submittedAt: row.latestPayment.submittedAt ?? row.receivedAt ?? new Date(0).toISOString(),
      bankName: "PromptPay",
      maskedAccount: "หลักฐานที่ผู้เรียนแนบ",
      evidenceFileName: row.latestPayment.evidenceFileName ?? "payment-proof",
      evidenceFileType: row.latestPayment.evidenceFileType,
      evidenceDataUrl: row.evidenceDataUrl,
      source: "uploaded",
    };
  }

  const fixture = seededSlipFixtures[row.registrationId];
  if (!fixture || row.paymentState !== "paid") return null;
  return {
    registrationId: row.registrationId,
    invoiceId: row.id,
    studentName: row.studentName,
    courseLabel: `${row.courseCode} · ${row.courseTitle}`,
    amount: row.receivedAmount || row.baseAmount,
    referenceNo: fixture.referenceNo,
    submittedAt: fixture.submittedAt,
    bankName: fixture.bankName,
    maskedAccount: fixture.maskedAccount,
    evidenceFileName: `slip-${row.registrationId.toLocaleLowerCase("en-US")}.png`,
    source: "seeded_receipt",
  };
}

function PaymentSlipPreview({ proof }: { proof: RegistrationSlipProof }) {
  if (proof.evidenceDataUrl?.startsWith("data:image/")) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-container-low p-3">
        <Image
          src={proof.evidenceDataUrl}
          alt={`สลิปการชำระเงินของ ${proof.studentName}`}
          width={900}
          height={1200}
          unoptimized
          className="mx-auto max-h-[32rem] w-auto rounded-xl object-contain"
        />
      </div>
    );
  }

  if (proof.evidenceDataUrl?.startsWith("data:application/pdf")) {
    return (
      <object
        data={proof.evidenceDataUrl}
        type="application/pdf"
        aria-label={`เอกสารสลิปการชำระเงินของ ${proof.studentName}`}
        className="h-[32rem] w-full rounded-2xl border border-border bg-card"
      >
        <Button asChild variant="outline" className="min-h-11 w-full">
          <a href={proof.evidenceDataUrl} target="_blank" rel="noopener noreferrer">เปิดเอกสารสลิป PDF</a>
        </Button>
      </object>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-[1.75rem] border border-border bg-card p-5 shadow-app-card">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand-on-soft">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">account_balance</span>
          </span>
          <div>
            <p className="text-xs text-muted-foreground">โอนผ่าน PromptPay</p>
            <p className="font-semibold text-foreground">{proof.bankName}</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-3xl text-success" aria-hidden="true">check_circle</span>
      </div>

      <div className="py-5 text-center">
        <p className="text-xs text-muted-foreground">จำนวนเงิน</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{formatBaht(proof.amount)}</p>
        <p className="mt-2 text-xs font-medium text-success">ทำรายการสำเร็จ</p>
      </div>

      <dl className="space-y-3 rounded-2xl bg-surface-container-low p-4 text-xs">
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">จากบัญชี</dt><dd className="text-right font-medium text-foreground">{proof.maskedAccount}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">ผู้รับเงิน</dt><dd className="max-w-52 text-right font-medium text-foreground">ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">วันที่และเวลา</dt><dd className="text-right font-medium text-foreground">{formatDateTime(proof.submittedAt)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">เลขอ้างอิง</dt><dd className="break-all text-right font-mono font-medium text-foreground">{proof.referenceNo}</dd></div>
      </dl>
    </div>
  );
}

export default function StaffRegistrationOversightPage() {
  const { session, isReady: isSessionReady } = usePortalSession();
  const {
    registrations,
    registrationInvoices,
    payments,
    auditEvents,
    subjectResults,
    academicStudents,
    courseOfferings,
    academicTeachers,
    isLoaded,
  } = useMockDb();
  const [search, setSearch] = useState("");
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [viewedRegistrationIds, setViewedRegistrationIds] = useState<ReadonlySet<string>>(() => new Set());

  const financeRows = useMemo(() => buildStaffFinanceRows({
    invoices: registrationInvoices,
    registrations,
    payments,
    auditEvents,
  }), [auditEvents, payments, registrationInvoices, registrations]);
  const financeRowByRegistrationId = useMemo(
    () => new Map(financeRows.map((row) => [row.registrationId, row])),
    [financeRows],
  );
  const slipProofByRegistrationId = useMemo(() => {
    const entries = financeRows.flatMap((row) => {
      const proof = slipProofForFinanceRow(row);
      return proof ? [[row.registrationId, proof] as const] : [];
    });
    return new Map(entries);
  }, [financeRows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th-TH");
    return registrations.filter((registration) => !query || [
      registration.id,
      registration.studentName,
      registration.studentId,
      registration.courseCode,
      registration.courseTitle,
    ].some((value) => value.toLocaleLowerCase("th-TH").includes(query)));
  }, [registrations, search]);
  const resultAudit = useMemo(() => subjectResults.map((result) => {
    const student = academicStudents.find((item) => item.id === result.studentId);
    const offering = courseOfferings.find((item) => item.id === result.courseOfferingId);
    const teacher = academicTeachers.find((item) => item.id === result.teacherId);
    const latestRevision = result.revisions.at(-1);
    return {
      id: result.id,
      student: student?.name ?? result.studentId,
      course: offering?.courseCode ?? result.courseOfferingId,
      result: formatSubjectResultValue(result.currentValue ?? result.draftValue),
      state: result.status === "published" ? "ประกาศแล้ว" : result.status === "revised" ? "แก้ไขแล้ว" : result.status === "draft" ? "ฉบับร่าง" : "รอบันทึกผล",
      revision: result.status === "revised" && latestRevision?.previousValue
        ? `${formatSubjectResultValue(latestRevision.previousValue)} → ${formatSubjectResultValue(latestRevision.newValue)}`
        : "—",
      teacher: teacher?.name ?? result.teacherId,
    };
  }), [academicStudents, academicTeachers, courseOfferings, subjectResults]);
  const selectedProof = selectedRegistrationId ? slipProofByRegistrationId.get(selectedRegistrationId) ?? null : null;
  const selectedFinanceRow = selectedRegistrationId ? financeRowByRegistrationId.get(selectedRegistrationId) ?? null : null;

  const sensitiveViewAudit = useSensitiveViewAudit({
    enabled: isSessionReady && isLoaded && session?.role === "royal_college_staff",
    session,
    resource: {
      type: "registration_oversight",
      id: "royal-college-registration-and-results",
      label: "การลงทะเบียนและผลแบบผ่าน/ไม่ผ่านส่วนกลาง",
      organisationId: session?.organisation.id,
    },
  });

  const openSlip = (registrationId: string) => {
    if (!slipProofByRegistrationId.has(registrationId)) return;
    setSelectedRegistrationId(registrationId);
    setViewedRegistrationIds((current) => {
      const next = new Set(current);
      next.add(registrationId);
      return next;
    });
  };

  if (!isSessionReady || !isLoaded) {
    return <PageShell size="full"><LoadingState label="กำลังโหลดข้อมูล Registration และ Audit" /></PageShell>;
  }

  return (
    <PageShell size="full" className="space-y-6">
      <StaffPageHeader title="Registration Oversight" description="ติดตามสถานะข้ามสถาบันเพื่อช่วยตรวจกรณีผิดปกติ โดยการตัดสินคำขอและผลแบบผ่าน/ไม่ผ่านยังเป็นหน้าที่ของอาจารย์" eyebrow="Read-only oversight" />
      <SensitiveViewAuditBoundary status={sensitiveViewAudit.status} onRetry={sensitiveViewAudit.retry}>
        <div className="rounded-2xl border border-info-border bg-info-soft p-4 text-sm leading-relaxed text-info-on-soft">
          <p><strong>ขอบเขตการทำงาน:</strong> หน้านี้ไม่แสดงปุ่มอนุมัติ ปฏิเสธ หรือแก้ผล เจ้าหน้าที่ใช้ข้อมูลเพื่อประสานงานและ Audit เท่านั้น</p>
          <p className="mt-1">สถานะ “เปิดดูแล้ว” เก็บเฉพาะรอบที่เปิดหน้านี้และจะเริ่มใหม่เมื่อรีเฟรช โดยไม่แก้ไขข้อมูลการชำระเงินจริง</p>
        </div>

        <Card>
          <CardHeader className="border-b border-border sm:flex-row sm:items-end sm:justify-between">
            <div><CardTitle>สถานะคำขอลงทะเบียน</CardTitle><p className="mt-1 text-xs text-muted-foreground">ข้อมูลจาก Registration Workflow กลาง พร้อมหลักฐานการชำระเงินที่เกี่ยวข้อง</p></div>
            <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหานักศึกษา รายวิชา หรือรหัสคำขอ" aria-label="ค้นหาคำขอลงทะเบียน" className="mt-3 h-11 rounded-xl text-sm sm:mt-0 sm:w-80" />
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1060px] text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">คำขอ</th><th scope="col" className="px-5 py-3 font-medium">นักศึกษา</th><th scope="col" className="px-5 py-3 font-medium">รายวิชา</th><th scope="col" className="px-5 py-3 font-medium">ภาคการศึกษา</th><th scope="col" className="px-5 py-3 font-medium">สถานะ</th><th scope="col" className="px-5 py-3 font-medium">สลิปการชำระเงิน</th><th scope="col" className="px-5 py-3 font-medium">อัปเดตล่าสุด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((registration) => {
                    const proof = slipProofByRegistrationId.get(registration.id);
                    const viewed = viewedRegistrationIds.has(registration.id);
                    return (
                      <tr key={registration.id} className="align-top">
                        <td className="px-5 py-3 font-mono text-xs font-medium">{registration.id}</td>
                        <td className="px-5 py-3"><p className="font-medium">{registration.studentName}</p><p className="text-xs text-muted-foreground">{registration.studentId}</p></td>
                        <td className="px-5 py-3"><p className="font-medium">{registration.courseCode}</p><p className="text-xs text-muted-foreground">{registration.courseTitle}</p></td>
                        <td className="px-5 py-3">{registration.term}</td>
                        <td className="px-5 py-3"><Badge variant={registrationStatusMeta[registration.status].variant}>{registrationStatusMeta[registration.status].label}</Badge></td>
                        <td className="px-5 py-3">
                          {proof ? (
                            <div className="flex flex-col items-start gap-2">
                              <Badge variant={viewed ? "success" : "info"}>{viewed ? "เปิดดูแล้ว" : "พร้อมตรวจ"}</Badge>
                              <Button type="button" size="xs" variant="outline" className="min-h-10 px-3" onClick={() => openSlip(registration.id)} aria-label={`ตรวจสอบสลิป ${registration.id}`}>
                                <span aria-hidden="true" className="material-symbols-outlined text-lg">receipt_long</span>
                                {viewed ? "ดูอีกครั้ง" : "ตรวจสอบสลิป"}
                              </Button>
                            </div>
                          ) : <Badge variant="neutral">ยังไม่มีสลิป</Badge>}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{formatDateTime(registration.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 ? <div className="py-14 text-center"><span aria-hidden="true" className="material-symbols-outlined text-4xl text-muted-foreground">fact_check</span><p className="mt-2 text-sm font-medium">ไม่พบคำขอลงทะเบียน</p><p className="mt-1 text-xs text-muted-foreground">ข้อมูลอาจยังไม่ถูกส่งเข้าระบบหรือไม่ตรงกับคำค้นหา</p></div> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ผลแบบผ่าน/ไม่ผ่านและประวัติการแก้ไข</CardTitle><p className="text-xs text-muted-foreground">มุมมองตรวจสอบย้อนหลังเท่านั้น การแก้ผลต้องทำโดยอาจารย์ที่ได้รับมอบหมาย</p></CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th scope="col" className="px-5 py-3 font-medium">นักศึกษา</th><th scope="col" className="px-5 py-3 font-medium">รายวิชา</th><th scope="col" className="px-5 py-3 font-medium">ผลล่าสุด</th><th scope="col" className="px-5 py-3 font-medium">สถานะ</th><th scope="col" className="px-5 py-3 font-medium">ประวัติการแก้ไข</th><th scope="col" className="px-5 py-3 font-medium">ผู้สอน</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {resultAudit.map((result) => <tr key={result.id}><td className="px-5 py-3 font-medium">{result.student}</td><td className="px-5 py-3 font-mono text-xs">{result.course}</td><td className="px-5 py-3 font-semibold">{result.result}</td><td className="px-5 py-3"><Badge variant={result.state === "แก้ไขแล้ว" ? "warning" : result.state === "ประกาศแล้ว" ? "success" : "neutral"}>{result.state}</Badge></td><td className="px-5 py-3">{result.revision}</td><td className="px-5 py-3 text-muted-foreground">{result.teacher}</td></tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </SensitiveViewAuditBoundary>

      <Dialog open={Boolean(selectedProof)} onOpenChange={(open) => { if (!open) setSelectedRegistrationId(null); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl" aria-describedby="registration-slip-description">
          <DialogHeader className="pr-12">
            <DialogTitle>ตรวจสอบสลิปการชำระเงิน</DialogTitle>
            <DialogDescription id="registration-slip-description">{selectedProof ? `${selectedProof.invoiceId} · ${selectedProof.studentName}` : "ตรวจสอบหลักฐานการชำระเงิน"}</DialogDescription>
          </DialogHeader>
          {selectedProof ? (
            <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(15rem,0.9fr)]">
              <PaymentSlipPreview proof={selectedProof} />
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-surface-container-low p-4">
                  <div className="flex items-center justify-between gap-3"><p className="font-semibold text-foreground">รายละเอียดรายการ</p><Badge variant="success">รับชำระแล้ว</Badge></div>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div><dt className="text-xs text-muted-foreground">รายวิชา</dt><dd className="mt-1 font-medium text-foreground">{selectedProof.courseLabel}</dd></div>
                    <div className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-muted-foreground">ยอดชำระ</dt><dd className="mt-1 font-bold tabular-nums text-foreground">{formatBaht(selectedProof.amount)}</dd></div><div><dt className="text-xs text-muted-foreground">ช่องทาง</dt><dd className="mt-1 font-medium text-foreground">PromptPay</dd></div></div>
                    <div><dt className="text-xs text-muted-foreground">Reference No.</dt><dd className="mt-1 break-all font-mono text-xs font-medium text-foreground">{selectedProof.referenceNo}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">ส่งหลักฐานเมื่อ</dt><dd className="mt-1 font-medium text-foreground">{formatDateTime(selectedProof.submittedAt)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">ชื่อไฟล์</dt><dd className="mt-1 break-all font-medium text-foreground">{selectedProof.evidenceFileName}</dd></div>
                  </dl>
                </div>
                <div className="rounded-2xl border border-info-border bg-info-soft p-4 text-sm leading-relaxed text-info-on-soft"><div className="flex items-start gap-3"><span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-xl">info</span><p>การเปิดดูครั้งนี้ไม่เปลี่ยนสถานะการชำระเงินและไม่บันทึกสถานะ “เปิดดูแล้ว” ลงแคช เมื่อรีเฟรชหน้าจะกลับเป็น “พร้อมตรวจ”</p></div></div>
                {selectedFinanceRow && selectedFinanceRow.expectedPaymentAmount !== selectedProof.amount ? <p role="alert" className="rounded-2xl border border-danger-border bg-danger-soft p-4 text-sm text-danger-on-soft">ยอดในหลักฐานไม่ตรงกับยอดในใบแจ้งหนี้ ({formatBaht(selectedFinanceRow.expectedPaymentAmount)})</p> : null}
              </div>
            </div>
          ) : null}
          <DialogFooter><Button type="button" variant="outline" className="min-h-11" onClick={() => setSelectedRegistrationId(null)}>ปิด</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
