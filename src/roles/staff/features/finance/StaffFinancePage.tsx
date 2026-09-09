"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { LoadingState } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  appendAuditEvent,
  createAuditActorSnapshot,
  SensitiveViewAuditBoundary,
  useSensitiveViewAudit,
  type AuditActorSnapshot,
} from "@/roles/shared/features/audit";
import { invoicePolicy } from "@/roles/shared/features/finance";
import { ORGANISATIONS } from "@/roles/shared/features/roles/access-model";
import { readPortalSession } from "@/roles/shared/features/roles/mock-login";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

import {
  buildStaffFinanceRows,
  filterStaffFinanceRows,
  staffFinanceDisplayAmount,
  staffFinanceDisplayLateFee,
  type StaffFinanceAction,
  type StaffFinanceFilters,
  type StaffFinanceRow,
  type StaffPaymentState,
  type StaffReconciliationState,
} from "./staff-finance-model";

type BadgeVariant = "neutral" | "warning" | "danger" | "success" | "info";

const paymentStateMeta: Record<StaffPaymentState, { label: string; variant: BadgeVariant }> = {
  locked: { label: "รออนุมัติคำขอ", variant: "neutral" },
  awaiting_payment: { label: "รอชำระเงิน", variant: "warning" },
  overdue: { label: "เกินกำหนดชำระ", variant: "danger" },
  pending_verification: { label: "รอตรวจหลักฐาน", variant: "info" },
  rejected: { label: "หลักฐานไม่ผ่าน", variant: "danger" },
  paid: { label: "รับชำระแล้ว", variant: "success" },
  cancelled: { label: "ยกเลิกแล้ว", variant: "neutral" },
  refunded: { label: "คืนเงินแล้ว", variant: "neutral" },
};

const reconciliationStateMeta: Record<StaffReconciliationState, { label: string; variant: BadgeVariant }> = {
  not_ready: { label: "ยังไม่ถึงขั้นตอน", variant: "neutral" },
  pending: { label: "รอตรวจสอบ", variant: "warning" },
  exception: { label: "พบข้อผิดปกติ", variant: "danger" },
  reconciled: { label: "ตรวจสอบแล้ว", variant: "success" },
};

const actionMeta: Record<StaffFinanceAction, {
  label: string;
  shortLabel: string;
  description: string;
  auditAction: "payment.review_approved" | "payment.review_rejected" | "payment.reconcile" | "payment.exception";
  phase: "payment_verification" | "reconciliation";
  tone: "default" | "outline" | "destructive";
}> = {
  approve_payment: {
    label: "ยืนยันหลักฐานการชำระเงิน",
    shortLabel: "ยืนยันรับชำระ",
    description: "ตรวจยอด เลขอ้างอิง และไฟล์หลักฐานให้ครบก่อนยืนยัน ระบบจะปรับการลงทะเบียนเป็นสำเร็จ",
    auditAction: "payment.review_approved",
    phase: "payment_verification",
    tone: "default",
  },
  reject_payment: {
    label: "ไม่ผ่านการตรวจสอบหลักฐาน",
    shortLabel: "หลักฐานไม่ผ่าน",
    description: "ระบุสิ่งที่ไม่ถูกต้อง เพื่อให้ผู้เรียนแก้ไขและส่งหลักฐานใหม่",
    auditAction: "payment.review_rejected",
    phase: "payment_verification",
    tone: "destructive",
  },
  reconcile: {
    label: "ยืนยันการตรวจสอบ",
    shortLabel: "ตรวจสอบ",
    description: "ยืนยันว่าเงินที่รับชำระตรงกับรายการเดินบัญชีและเลขอ้างอิง",
    auditAction: "payment.reconcile",
    phase: "reconciliation",
    tone: "default",
  },
  exception: {
    label: "บันทึกข้อผิดปกติในการตรวจสอบ",
    shortLabel: "พบข้อผิดปกติ",
    description: "บันทึกความคลาดเคลื่อนของยอด เลขอ้างอิง หรือรายการเดินบัญชีเพื่อรอตรวจแก้",
    auditAction: "payment.exception",
    phase: "reconciliation",
    tone: "outline",
  },
};

const paymentFilterOptions = Object.entries(paymentStateMeta) as [StaffPaymentState, (typeof paymentStateMeta)[StaffPaymentState]][];
const reconciliationFilterOptions = Object.entries(reconciliationStateMeta) as [StaffReconciliationState, (typeof reconciliationStateMeta)[StaffReconciliationState]][];
const paymentStates = new Set<StaffPaymentState>(paymentFilterOptions.map(([value]) => value));
const reconciliationStates = new Set<StaffReconciliationState>(reconciliationFilterOptions.map(([value]) => value));
const FINANCE_FILTER_EVENT = "royal-college:staff-finance-filter-updated";

function getLocationSearchSnapshot() {
  return window.location.search;
}

function subscribeToLocationSearch(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(FINANCE_FILTER_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(FINANCE_FILTER_EVENT, onStoreChange);
  };
}

function parseFilters(search: string): StaffFinanceFilters {
  const params = new URLSearchParams(search);
  const paymentState = params.get("paymentState");
  const reconciliationState = params.get("reconciliationState");
  return {
    query: params.get("q") ?? "",
    paymentState: paymentState && paymentStates.has(paymentState as StaffPaymentState)
      ? paymentState as StaffPaymentState
      : "all",
    reconciliationState: reconciliationState && reconciliationStates.has(reconciliationState as StaffReconciliationState)
      ? reconciliationState as StaffReconciliationState
      : "all",
  };
}

function replaceFilterParams(patch: Partial<{ q: string; paymentState: string; reconciliationState: string }>) {
  const url = new URL(window.location.href);
  Object.entries(patch).forEach(([key, value]) => {
    if (!value || value === "all") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new Event(FINANCE_FILTER_EVENT));
}

function auditActor(): AuditActorSnapshot {
  const session = readPortalSession();
  return session ? createAuditActorSnapshot(session) : {
    userId: "staff-unknown",
    userName: "เจ้าหน้าที่ราชวิทยาลัย",
    role: "royal_college_staff",
    organisation: ORGANISATIONS.royalCollege,
    resourceScopes: ["*"],
  };
}

function baht(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function paymentMethodLabel(method?: string) {
  if (method === "promptpay") return "PromptPay";
  if (method === "credit_card") return "บัตรเครดิต (รายการเดิม)";
  if (method === "debit_card") return "บัตรเดบิต (รายการเดิม)";
  return "ไม่ระบุช่องทาง";
}

function EvidenceLink({ row, compact = false }: { row: StaffFinanceRow; compact?: boolean }) {
  if (!row.evidenceDataUrl || !row.latestPayment?.evidenceFileName) return null;
  return (
    <Button asChild size="sm" variant="outline" className={compact ? "mt-2 min-h-11 px-3 text-xs" : "mt-3 min-h-11 w-full"}>
      <a
        href={row.evidenceDataUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`เปิดหลักฐาน ${row.latestPayment.evidenceFileName} ของ ${row.id}`}
      >
        <span aria-hidden="true" className="material-symbols-outlined text-lg">visibility</span>
        เปิดดูหลักฐาน
      </a>
    </Button>
  );
}

function FinanceActions({ row, onSelect }: {
  row: StaffFinanceRow;
  onSelect: (row: StaffFinanceRow, action: StaffFinanceAction) => void;
}) {
  if (row.allowedActions.length === 0) {
    return <span className="text-xs text-muted-foreground">ไม่มีงานที่ต้องดำเนินการ</span>;
  }
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end" aria-label={`การดำเนินการสำหรับ ${row.id}`}>
      {row.allowedActions.map((action) => {
        const meta = actionMeta[action];
        const label = action === "reconcile" && row.reconciliationState === "exception"
          ? "แก้ไขและตรวจสอบ"
          : meta.shortLabel;
        return (
          <Button key={action} size="xs" variant={meta.tone} className="min-h-11 px-3" onClick={() => onSelect(row, action)} aria-label={`${label} ${row.id}`}>
            {label}
          </Button>
        );
      })}
    </div>
  );
}

export default function StaffFinancePage() {
  const {
    registrations,
    registrationInvoices,
    payments,
    auditEvents,
    updatePaymentStatus,
    isLoaded,
  } = useMockDb();
  const { session, isReady: isSessionReady } = usePortalSession();
  const locationSearch = useSyncExternalStore(subscribeToLocationSearch, getLocationSearchSnapshot, () => "");
  const filters = useMemo(() => parseFilters(locationSearch), [locationSearch]);
  const [selected, setSelected] = useState<{ rowId: string; action: StaffFinanceAction } | null>(null);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sensitiveViewAudit = useSensitiveViewAudit({
    enabled: isSessionReady && isLoaded && session?.role === "royal_college_staff",
    session,
    resource: {
      type: "finance_register",
      id: "FINANCE-REGISTER",
      label: "ทะเบียนข้อมูลการเงิน",
      organisationId: ORGANISATIONS.royalCollege.id,
    },
  });

  const rows = useMemo(() => buildStaffFinanceRows({
    invoices: registrationInvoices,
    registrations,
    payments,
    auditEvents,
  }), [auditEvents, payments, registrationInvoices, registrations]);
  const filtered = useMemo(() => filterStaffFinanceRows(rows, filters), [filters, rows]);
  const selectedRow = selected ? rows.find((row) => row.id === selected.rowId) ?? null : null;
  const hasFilters = Boolean(filters.query) || filters.paymentState !== "all" || filters.reconciliationState !== "all";

  const closeDialog = () => {
    setSelected(null);
    setReason("");
    setEvidence("");
    setFormError("");
    setIsSubmitting(false);
  };

  const openAction = (row: StaffFinanceRow, action: StaffFinanceAction) => {
    if (!row.allowedActions.includes(action)) return;
    setSelected({ rowId: row.id, action });
    setReason("");
    setEvidence(row.latestPayment?.referenceNo ?? row.latestPayment?.evidenceFileName ?? "");
    setFormError("");
  };

  const submitAction = () => {
    if (!selected || !selectedRow) return;
    if (!selectedRow.allowedActions.includes(selected.action)) {
      setFormError("สถานะรายการเปลี่ยนแล้ว กรุณาปิดหน้าต่างและตรวจสอบรายการอีกครั้ง");
      return;
    }
    if (selected.action === "approve_payment" && (!selectedRow.hasInspectableEvidence || !selectedRow.paymentAmountMatchesInvoice)) {
      setFormError("ยังยืนยันรับชำระไม่ได้ กรุณาเปิดตรวจไฟล์หลักฐานและตรวจสอบยอดให้ตรงกับระบบก่อน");
      return;
    }
    const cleanReason = reason.trim();
    const cleanEvidence = evidence.trim();
    if (!cleanReason || !cleanEvidence) {
      setFormError("กรุณาระบุเหตุผลและหลักฐานอ้างอิงให้ครบถ้วน");
      return;
    }

    const meta = actionMeta[selected.action];
    const occurredAt = new Date().toISOString();
    setIsSubmitting(true);
    try {
      if (meta.phase === "payment_verification") {
        const payment = selectedRow.latestPayment;
        if (!payment || payment.status !== "pending") throw new Error("Payment is no longer pending verification");
        const nextPaymentStatus = selected.action === "approve_payment" ? "approved" : "rejected";
        appendAuditEvent({
          actor: auditActor(),
          action: meta.auditAction,
          resource: { type: "invoice", id: selectedRow.id, label: selectedRow.description, organisationId: ORGANISATIONS.royalCollege.id },
          before: { phase: meta.phase, paymentId: payment.id, paymentStatus: payment.status },
          after: { phase: meta.phase, paymentId: payment.id, paymentStatus: nextPaymentStatus },
          reason: cleanReason,
          evidenceReference: cleanEvidence,
          occurredAt,
        });
        updatePaymentStatus(payment.id, nextPaymentStatus);
      } else {
        const nextReconciliationState = selected.action === "reconcile" ? "reconciled" : "exception";
        appendAuditEvent({
          actor: auditActor(),
          action: meta.auditAction,
          resource: { type: "invoice", id: selectedRow.id, label: selectedRow.description, organisationId: ORGANISATIONS.royalCollege.id },
          before: { phase: meta.phase, reconciliationState: selectedRow.reconciliationState },
          after: { phase: meta.phase, reconciliationState: nextReconciliationState },
          reason: cleanReason,
          evidenceReference: cleanEvidence,
          occurredAt,
        });
      }
      toast.success(`${meta.shortLabel} ${selectedRow.id} แล้ว`);
      closeDialog();
    } catch {
      setIsSubmitting(false);
      setFormError("บันทึกสถานะและ Audit Log ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const exportReport = () => {
    try {
      appendAuditEvent({
        actor: auditActor(),
        action: "sensitive_data.export",
        resource: { type: "finance_report", id: "FINANCE-REPORT", label: "รายงานตรวจสอบการเงิน", organisationId: ORGANISATIONS.royalCollege.id },
        before: { exported: false },
        after: { exported: true, filters, recordCount: filtered.length },
        reason: "จัดทำรายงานการเงินตามตัวกรองปัจจุบัน",
        evidenceReference: `EXPORT-${Date.now().toString(36).toUpperCase()}`,
        occurredAt: new Date().toISOString(),
      });
      toast.success(`เตรียมรายงาน ${filtered.length} รายการแล้ว`);
    } catch {
      toast.error("ไม่สามารถบันทึกการออกรายงานลง Audit Log ได้");
    }
  };

  if (!isSessionReady || !isLoaded) {
    return <PageShell size="full"><LoadingState label="กำลังโหลดข้อมูลการเงินและ Audit" /></PageShell>;
  }

  return (
    <PageShell size="full" className="space-y-6">
      <SensitiveViewAuditBoundary status={sensitiveViewAudit.status} onRetry={sensitiveViewAudit.retry}>
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-4 p-4 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-semibold">ค้นหาและกรองรายการ</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    พบ <strong className="font-bold text-foreground">{filtered.length}</strong> จาก <strong className="font-bold text-foreground">{rows.length}</strong> รายการ · ค่าปรับเมื่อเกินกำหนด {baht(invoicePolicy.lateFee)}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="min-h-11 shrink-0 self-start" onClick={exportReport}>
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">download</span>
                  ออกรายงาน
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_minmax(12rem,0.55fr)_minmax(12rem,0.55fr)_auto] xl:items-end">
                <div>
                  <label htmlFor="staff-finance-search" className="mb-1.5 block text-xs font-medium">ค้นหา</label>
                  <Input id="staff-finance-search" type="search" value={filters.query} onChange={(event) => replaceFilterParams({ q: event.target.value })} placeholder="Invoice, รหัสผู้เรียน, รายวิชา หรือ Reference No." className="h-11 rounded-xl text-sm" />
                </div>
                <div>
                  <label htmlFor="staff-finance-payment-filter" className="mb-1.5 block text-xs font-medium">สถานะการชำระ</label>
                  <select id="staff-finance-payment-filter" value={filters.paymentState} onChange={(event) => replaceFilterParams({ paymentState: event.target.value })} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="all">ทั้งหมด</option>
                    {paymentFilterOptions.map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="staff-finance-reconciliation-filter" className="mb-1.5 block text-xs font-medium">สถานะการตรวจสอบ</label>
                  <select id="staff-finance-reconciliation-filter" value={filters.reconciliationState} onChange={(event) => replaceFilterParams({ reconciliationState: event.target.value })} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="all">ทั้งหมด</option>
                    {reconciliationFilterOptions.map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                  </select>
                </div>
                <Button variant="outline" className="h-11" disabled={!hasFilters} onClick={() => replaceFilterParams({ q: "", paymentState: "all", reconciliationState: "all" })}>ล้างตัวกรอง</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Invoice / ผู้เรียน</th>
                      <th scope="col" className="px-4 py-3 font-medium">รายการ</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">ยอดเงิน</th>
                      <th scope="col" className="px-4 py-3 font-medium">สถานะการชำระ</th>
                      <th scope="col" className="px-4 py-3 font-medium">สถานะการตรวจสอบ</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((row) => {
                      const paymentMeta = paymentStateMeta[row.paymentState];
                      const reconciliationMeta = reconciliationStateMeta[row.reconciliationState];
                      const displayedLateFee = staffFinanceDisplayLateFee(row);
                      return (
                        <tr key={row.id} className="align-top">
                          <td className="px-4 py-4"><p className="font-mono text-xs font-semibold">{row.id}</p><p className="mt-1 font-medium">{row.studentName}</p><p className="text-xs text-muted-foreground">{row.studentId} · {row.registrationId}</p></td>
                          <td className="max-w-xs px-4 py-4"><p className="font-medium">{row.courseCode} · {row.courseTitle}</p><p className="mt-1 text-xs text-muted-foreground">{row.description}</p></td>
                           <td className="px-4 py-4 text-right"><p className="font-semibold tabular-nums">{baht(staffFinanceDisplayAmount(row))}</p>{displayedLateFee > 0 ? <p className="mt-1 text-xs text-danger">รวมค่าปรับ {baht(displayedLateFee)}</p> : null}</td>
                          <td className="px-4 py-4">
                            <Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge>
                            {row.latestPayment ? <div className="mt-2 space-y-0.5 text-xs text-muted-foreground"><p>{paymentMethodLabel(row.latestPayment.method)}</p><p className="break-all font-mono">Ref: {row.latestPayment.referenceNo ?? "—"}</p>{row.latestPayment.evidenceFileName ? <p className="max-w-48 truncate" title={row.latestPayment.evidenceFileName}>{row.latestPayment.evidenceFileName}</p> : null}<EvidenceLink row={row} compact /></div> : null}
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={reconciliationMeta.variant}>{reconciliationMeta.label}</Badge>
                            {row.latestReconciliationEvent ? <div className="mt-2 max-w-52 text-xs text-muted-foreground"><p>{row.latestReconciliationEvent.reason ?? "ไม่มีหมายเหตุ"}</p><p className="mt-0.5">{formatDateTime(row.latestReconciliationEvent.occurredAt)}</p></div> : null}
                          </td>
                          <td className="px-4 py-4"><FinanceActions row={row} onSelect={openAction} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-3 xl:hidden">
                {filtered.map((row) => {
                  const paymentMeta = paymentStateMeta[row.paymentState];
                  const reconciliationMeta = reconciliationStateMeta[row.reconciliationState];
                  const displayedLateFee = staffFinanceDisplayLateFee(row);
                  return (
                    <article key={row.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs font-semibold">{row.id}</p><h3 className="mt-1 font-semibold">{row.studentName}</h3><p className="text-xs text-muted-foreground">{row.studentId} · {row.registrationId}</p></div><p className="shrink-0 font-bold tabular-nums">{baht(staffFinanceDisplayAmount(row))}</p></div>
                      <div className="mt-4 rounded-xl bg-muted/40 p-3"><p className="text-sm font-medium">{row.courseCode} · {row.courseTitle}</p><p className="mt-1 text-xs text-muted-foreground">{row.description}</p>{displayedLateFee > 0 ? <p className="mt-1 text-xs text-danger">รวมค่าปรับ {baht(displayedLateFee)}</p> : null}</div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div><dt className="mb-1.5 text-muted-foreground">สถานะการชำระ</dt><dd><Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge></dd></div>
                        <div><dt className="mb-1.5 text-muted-foreground">สถานะการตรวจสอบ</dt><dd><Badge variant={reconciliationMeta.variant}>{reconciliationMeta.label}</Badge></dd></div>
                        <div><dt className="text-muted-foreground">Reference No.</dt><dd className="mt-1 break-all font-mono font-medium">{row.latestPayment?.referenceNo ?? "—"}</dd></div>
                        <div><dt className="text-muted-foreground">ส่งหลักฐานเมื่อ</dt><dd className="mt-1 font-medium">{formatDateTime(row.latestPayment?.submittedAt)}</dd></div>
                      </dl>
                      {row.latestPayment?.evidenceFileName ? <p className="mt-3 break-all text-xs text-muted-foreground">ไฟล์: {row.latestPayment.evidenceFileName}</p> : null}
                      <EvidenceLink row={row} compact />
                      <div className="mt-4 border-t border-border pt-4"><FinanceActions row={row} onSelect={openAction} /></div>
                    </article>
                  );
                })}
              </div>

              {filtered.length === 0 ? <div className="px-4 py-14 text-center"><span aria-hidden="true" className="material-symbols-outlined text-4xl text-muted-foreground">receipt_long</span><p className="mt-2 text-sm font-medium">ไม่พบรายการการเงิน</p><p className="mt-1 text-xs text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p></div> : null}
            </CardContent>
          </Card>
        </div>
      </SensitiveViewAuditBoundary>

      <Dialog open={Boolean(selected && selectedRow)} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto" aria-describedby="finance-action-description">
          <DialogHeader className="pr-12">
            <DialogTitle>{selected ? actionMeta[selected.action].label : "ดำเนินการการเงิน"}</DialogTitle>
            <DialogDescription id="finance-action-description">{selected && selectedRow ? `${selectedRow.id} · ${actionMeta[selected.action].description}` : "ตรวจสอบข้อมูลก่อนยืนยัน"}</DialogDescription>
          </DialogHeader>
          {selectedRow?.latestPayment && selected && actionMeta[selected.action].phase === "payment_verification" ? (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
              <p><strong>ยอดที่แจ้ง:</strong> {baht(selectedRow.latestPayment.amount)}</p>
              <p className="mt-1"><strong>ยอดที่ระบบคำนวณ ณ เวลาส่ง:</strong> {baht(selectedRow.expectedPaymentAmount)}</p>
              <p className="mt-1 break-all"><strong>Reference No.:</strong> {selectedRow.latestPayment.referenceNo ?? "—"}</p>
              <p className="mt-1 break-all"><strong>ไฟล์หลักฐาน:</strong> {selectedRow.latestPayment.evidenceFileName ?? "—"}</p>
              <EvidenceLink row={selectedRow} />
              {!selectedRow.hasInspectableEvidence ? <p role="note" className="mt-3 rounded-lg border border-warning-border bg-warning-soft p-2 text-warning-on-soft">รายการนี้ไม่มีไฟล์ที่เปิดตรวจได้ จึงยืนยันรับชำระไม่ได้ แต่สามารถปฏิเสธเพื่อให้ผู้เรียนส่งใหม่ได้</p> : null}
              {!selectedRow.paymentAmountMatchesInvoice ? <p role="alert" className="mt-3 rounded-lg border border-danger-border bg-danger-soft p-2 text-danger-on-soft">ยอดที่แจ้งไม่ตรงกับยอดที่ระบบคำนวณ จึงยืนยันรับชำระไม่ได้</p> : null}
            </div>
          ) : null}
          <div className="space-y-4">
            <div>
              <label htmlFor="finance-reason" className="mb-1.5 block text-sm font-medium">เหตุผล <span className="text-danger">*</span></label>
              <Textarea id="finance-reason" required aria-required="true" value={reason} onChange={(event) => { setReason(event.target.value); setFormError(""); }} placeholder="สรุปผลการตรวจสอบหรือเหตุผลของการดำเนินการ" aria-invalid={Boolean(formError) && !reason.trim()} aria-describedby={formError ? "finance-form-error" : undefined} />
            </div>
            <div>
              <label htmlFor="finance-evidence" className="mb-1.5 block text-sm font-medium">หลักฐานอ้างอิง <span className="text-danger">*</span></label>
              <Input id="finance-evidence" required aria-required="true" value={evidence} onChange={(event) => { setEvidence(event.target.value); setFormError(""); }} placeholder="เช่น Reference No., เลขรายการเดินบัญชี หรือชื่อไฟล์" aria-invalid={Boolean(formError) && !evidence.trim()} aria-describedby={formError ? "finance-form-error" : undefined} />
            </div>
            {formError ? <p id="finance-form-error" role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={closeDialog} disabled={isSubmitting}>กลับไปตรวจสอบ</Button>
            <Button variant={selected ? actionMeta[selected.action].tone : "default"} className="min-h-11" onClick={submitAction} disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก..." : "ยืนยันการบันทึก"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
