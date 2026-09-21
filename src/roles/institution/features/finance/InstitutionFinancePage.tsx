"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import {
  EmptyState,
  LoadingState,
  MetricCard,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  SensitiveViewAuditBoundary,
  useSensitiveViewAudit,
} from "@/roles/shared/features/audit";
import { invoicePolicy } from "@/roles/shared/features/finance";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import {
  filterStaffFinanceRows,
  staffFinanceDisplayAmount,
  staffFinanceDisplayLateFee,
  summarizeStaffFinance,
  type StaffFinanceFilters,
  type StaffFinanceRow,
  type StaffPaymentState,
  type StaffReconciliationState,
} from "@/roles/staff/features/finance/staff-finance-model";

import { filterSelectClassName, formatInstitutionDateTime } from "../workspace/institution-workspace-utils";
import { buildInstitutionFinanceRows } from "./institution-finance-model";

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
  reconciled: { label: "ผ่านการตรวจสอบ", variant: "success" },
};

const paymentFilterOptions = Object.entries(paymentStateMeta) as [
  StaffPaymentState,
  (typeof paymentStateMeta)[StaffPaymentState],
][];
const reconciliationFilterOptions = Object.entries(reconciliationStateMeta) as [
  StaffReconciliationState,
  (typeof reconciliationStateMeta)[StaffReconciliationState],
][];

function baht(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function paymentMethodLabel(method?: string) {
  if (method === "promptpay") return "PromptPay";
  if (method === "credit_card") return "บัตรเครดิต (รายการเดิม)";
  if (method === "debit_card") return "บัตรเดบิต (รายการเดิม)";
  return "ไม่ระบุช่องทาง";
}

const redundantReconciliationReasons = new Set([
  "ผ่าน",
  "ตรวจสอบแล้ว",
  "ผ่านการตรวจสอบ",
]);

function ReconciliationStatus({ row }: { row: StaffFinanceRow }) {
  const meta = reconciliationStateMeta[row.reconciliationState];
  const event = row.latestReconciliationEvent;
  const reason = event?.reason?.trim();
  const detail = reason && !redundantReconciliationReasons.has(reason) ? reason : null;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Badge variant={meta.variant}>{meta.label}</Badge>
      {event ? (
        <div className="flex max-w-52 flex-col gap-0.5 whitespace-normal text-xs text-muted-foreground">
          {detail ? <p>{detail}</p> : null}
          <p>{formatInstitutionDateTime(event.occurredAt)}</p>
        </div>
      ) : null}
    </div>
  );
}

function EvidenceLink({ row, fullWidth = false }: { row: StaffFinanceRow; fullWidth?: boolean }) {
  if (!row.evidenceDataUrl || !row.latestPayment?.evidenceFileName) {
    return <span className="text-xs text-muted-foreground">ไม่มีไฟล์หลักฐานที่เปิดดูได้</span>;
  }

  return (
    <Button asChild size="sm" variant="outline" className={fullWidth ? "min-h-11 w-full" : "min-h-11"}>
      <a
        href={row.evidenceDataUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`เปิดหลักฐาน ${row.latestPayment.evidenceFileName} ของ ${row.id}`}
      >
        <span aria-hidden="true" className="material-symbols-outlined">visibility</span>
        เปิดหลักฐาน
      </a>
    </Button>
  );
}

export default function InstitutionFinancePage() {
  const db = useMockDb();
  const { session, isReady: isSessionReady } = usePortalSession();
  const institutionId = session?.role === "institution_admin" ? session.organisation.id : "";
  const institutionName = session?.role === "institution_admin"
    ? session.organisation.name
    : "สถาบันของคุณ";
  const [query, setQuery] = useState("");
  const [paymentState, setPaymentState] = useState<StaffFinanceFilters["paymentState"]>("all");
  const [reconciliationState, setReconciliationState] = useState<StaffFinanceFilters["reconciliationState"]>("all");

  const rows = useMemo(() => buildInstitutionFinanceRows({
    institutionId,
    invoices: db.registrationInvoices,
    registrations: db.registrations,
    payments: db.payments,
    auditEvents: db.auditEvents,
  }), [db.auditEvents, db.payments, db.registrationInvoices, db.registrations, institutionId]);
  const filters = useMemo<StaffFinanceFilters>(() => ({
    query,
    paymentState,
    reconciliationState,
  }), [paymentState, query, reconciliationState]);
  const filtered = useMemo(() => filterStaffFinanceRows(rows, filters), [filters, rows]);
  const summary = useMemo(() => summarizeStaffFinance(rows), [rows]);
  const hasFilters = Boolean(query.trim()) || paymentState !== "all" || reconciliationState !== "all";
  const sensitiveViewAudit = useSensitiveViewAudit({
    enabled: isSessionReady && db.isLoaded && session?.role === "institution_admin",
    session,
    resource: {
      type: "institution_finance_register",
      id: `${institutionId || "unresolved-institution"}:finance`,
      label: `ทะเบียนการเงิน · ${institutionName}`,
      organisationId: institutionId || undefined,
    },
  });

  const clearFilters = () => {
    setQuery("");
    setPaymentState("all");
    setReconciliationState("all");
  };

  if (!isSessionReady || !db.isLoaded) {
    return (
      <PageShell size="full">
        <LoadingState label="กำลังโหลดข้อมูลการเงินของสถาบัน" />
      </PageShell>
    );
  }

  return (
    <PageShell size="full" className="flex flex-col gap-6">
      <SensitiveViewAuditBoundary status={sensitiveViewAudit.status} onRetry={sensitiveViewAudit.retry}>
        <div className="flex flex-col gap-5">
          <WorkspaceHeader
            eyebrow="ข้อมูลเฉพาะสถาบัน · อ่านอย่างเดียว"
            title="การเงิน"
            description={`ติดตามยอดชำระ สถานะหลักฐาน และผลการตรวจสอบของ ${institutionName} โดยการยืนยันและตรวจสอบรายการยังเป็นหน้าที่ของเจ้าหน้าที่ราชวิทยาลัย`}
          />

          <section aria-label="สรุปข้อมูลการเงิน" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              size="sm"
              label="รับชำระแล้ว"
              value={baht(summary.totalReceived)}
              note="ยอดที่เจ้าหน้าที่ราชวิทยาลัยยืนยันแล้ว"
              icon="payments"
              emphasis="success"
            />
            <MetricCard
              size="sm"
              label="รอตรวจหลักฐาน"
              value={baht(summary.pendingVerificationAmount)}
              note={`${summary.pendingVerificationCount} รายการกำลังรอตรวจ`}
              icon="fact_check"
              emphasis="warning"
            />
            <MetricCard
              size="sm"
              label="รอชำระเงิน"
              value={baht(summary.awaitingAmount)}
              note={`ค่าปรับเมื่อเกินกำหนด ${baht(invoicePolicy.lateFee)}`}
              icon="schedule"
            />
            <MetricCard
              size="sm"
              label="เกินกำหนดชำระ"
              value={baht(summary.overdueAmount)}
              note={`${summary.overdueCount} รายการเกินกำหนด`}
              icon="event_busy"
              emphasis="danger"
            />
          </section>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">ค้นหาและกรองรายการ</CardTitle>
              <CardDescription aria-live="polite">
                พบ <strong className="font-semibold text-foreground">{filtered.length}</strong> จาก{" "}
                <strong className="font-semibold text-foreground">{rows.length}</strong> รายการในสถาบัน
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_minmax(12rem,0.55fr)_minmax(12rem,0.55fr)_auto] xl:items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="institution-finance-search" className="text-sm font-medium text-foreground">
                  ค้นหา
                </label>
                <Input
                  id="institution-finance-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Invoice, รหัสผู้เรียน, รายวิชา หรือ Reference No."
                  className="h-11 rounded-xl text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="institution-finance-payment-filter" className="text-sm font-medium text-foreground">
                  สถานะการชำระ
                </label>
                <select
                  id="institution-finance-payment-filter"
                  value={paymentState}
                  onChange={(event) => setPaymentState(event.target.value as typeof paymentState)}
                  className={filterSelectClassName}
                >
                  <option value="all">ทั้งหมด</option>
                  {paymentFilterOptions.map(([value, meta]) => (
                    <option key={value} value={value}>{meta.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="institution-finance-reconciliation-filter" className="text-sm font-medium text-foreground">
                  สถานะการตรวจสอบ
                </label>
                <select
                  id="institution-finance-reconciliation-filter"
                  value={reconciliationState}
                  onChange={(event) => setReconciliationState(event.target.value as typeof reconciliationState)}
                  className={filterSelectClassName}
                >
                  <option value="all">ทั้งหมด</option>
                  {reconciliationFilterOptions.map(([value, meta]) => (
                    <option key={value} value={value}>{meta.label}</option>
                  ))}
                </select>
              </div>
              <Button type="button" variant="outline" className="h-11" disabled={!hasFilters} onClick={clearFilters}>
                ล้างตัวกรอง
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">รายการการเงิน</CardTitle>
              <CardDescription>ตรวจสอบข้อมูลและหลักฐานได้โดยไม่มีปุ่มเปลี่ยนสถานะหรืออนุมัติรายการ</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length > 0 ? (
                <>
                  <div className="hidden xl:block">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="px-4">Invoice / ผู้เรียน</TableHead>
                          <TableHead className="px-4">รายการ</TableHead>
                          <TableHead className="px-4 text-right">ยอดเงิน</TableHead>
                          <TableHead className="px-4">สถานะการชำระ</TableHead>
                          <TableHead className="px-4">สถานะการตรวจสอบ</TableHead>
                          <TableHead className="px-4 text-right">หลักฐาน</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((row) => {
                          const paymentMeta = paymentStateMeta[row.paymentState];
                          const lateFee = staffFinanceDisplayLateFee(row);
                          return (
                            <TableRow key={row.id} className="align-top">
                              <TableCell className="px-4 py-4">
                                <p className="font-mono text-xs font-semibold">{row.id}</p>
                                <p className="mt-1 font-medium">{row.studentName}</p>
                                <p className="text-xs text-muted-foreground">{row.studentId} · {row.registrationId}</p>
                              </TableCell>
                              <TableCell className="max-w-sm whitespace-normal px-4 py-4">
                                <p className="font-medium">{row.courseCode} · {row.courseTitle}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{row.description}</p>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-right">
                                <p className="font-semibold tabular-nums">{baht(staffFinanceDisplayAmount(row))}</p>
                                {lateFee > 0 ? <p className="mt-1 text-xs text-danger">รวมค่าปรับ {baht(lateFee)}</p> : null}
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge>
                                {row.latestPayment ? (
                                  <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
                                    <p>{paymentMethodLabel(row.latestPayment.method)}</p>
                                    <p className="break-all font-mono">Ref: {row.latestPayment.referenceNo ?? "—"}</p>
                                    <p>{formatInstitutionDateTime(row.latestPayment.submittedAt)}</p>
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <ReconciliationStatus row={row} />
                              </TableCell>
                              <TableCell className="px-4 py-4 text-right">
                                <EvidenceLink row={row} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-3 p-3 xl:hidden">
                    {filtered.map((row) => {
                      const paymentMeta = paymentStateMeta[row.paymentState];
                      const lateFee = staffFinanceDisplayLateFee(row);
                      return (
                        <article key={row.id} className="rounded-2xl border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-semibold">{row.id}</p>
                              <h2 className="mt-1 font-semibold">{row.studentName}</h2>
                              <p className="text-xs text-muted-foreground">{row.studentId} · {row.registrationId}</p>
                            </div>
                            <p className="shrink-0 font-bold tabular-nums">{baht(staffFinanceDisplayAmount(row))}</p>
                          </div>
                          <div className="mt-4 rounded-xl bg-muted/40 p-3">
                            <p className="font-medium">{row.courseCode} · {row.courseTitle}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{row.description}</p>
                            {lateFee > 0 ? <p className="mt-1 text-xs text-danger">รวมค่าปรับ {baht(lateFee)}</p> : null}
                          </div>
                          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <dt className="mb-1.5 text-muted-foreground">สถานะการชำระ</dt>
                              <dd><Badge variant={paymentMeta.variant}>{paymentMeta.label}</Badge></dd>
                            </div>
                            <div>
                              <dt className="mb-1.5 text-muted-foreground">สถานะการตรวจสอบ</dt>
                              <dd><ReconciliationStatus row={row} /></dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Reference No.</dt>
                              <dd className="mt-1 break-all font-mono font-medium">{row.latestPayment?.referenceNo ?? "—"}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">ส่งหลักฐานเมื่อ</dt>
                              <dd className="mt-1 font-medium">{formatInstitutionDateTime(row.latestPayment?.submittedAt)}</dd>
                            </div>
                          </dl>
                          <div className="mt-4 border-t border-border pt-4">
                            <EvidenceLink row={row} fullWidth />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="p-5">
                  <EmptyState
                    icon="receipt_long"
                    title={rows.length === 0 ? "ยังไม่มีรายการการเงินในสถาบันนี้" : "ไม่พบรายการตามตัวกรอง"}
                    description={rows.length === 0
                      ? "รายการจะปรากฏเมื่อมีการลงทะเบียนและออกใบแจ้งชำระสำหรับสถาบันนี้"
                      : "ลองเปลี่ยนคำค้นหา สถานะการชำระ หรือสถานะการตรวจสอบ"}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SensitiveViewAuditBoundary>
    </PageShell>
  );
}
