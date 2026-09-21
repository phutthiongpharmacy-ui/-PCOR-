"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { LoadingState } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  buildStaffFinanceRows,
  receivedBreakdownByCourse,
  receivedRowsForPeriod,
  summarizeStaffFinance,
} from "@/roles/staff/features/finance/staff-finance-model";

const QUICK_ACTIONS = [
  { href: "/staff/requests", icon: "description", label: "ตรวจคำร้อง", detail: "ตรวจเอกสารและส่งต่องาน" },
  { href: "/staff/course-proposals", icon: "library_add_check", label: "ตรวจคำขอรายวิชา", detail: "พิจารณาข้อเสนอจากสถาบัน" },
  { href: "/staff/exams", icon: "quiz", label: "งานสอบ", detail: "จัดการรอบสอบและผลสอบ" },
  { href: "/staff/signatures", icon: "draw", label: "เตรียมเอกสารลงนาม", detail: "ตรวจความครบถ้วนและจัดคิว" },
] as const;

function baht(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StaffDashboardPage() {
  const { registrations, registrationInvoices, payments, auditEvents, isLoaded } = useMockDb();
  const [asOf] = useState(() => new Date());

  const financeRows = useMemo(() => buildStaffFinanceRows({
    invoices: registrationInvoices,
    registrations,
    payments,
    auditEvents,
    now: asOf,
  }), [asOf, auditEvents, payments, registrationInvoices, registrations]);
  const receivedRows = useMemo(() => receivedRowsForPeriod({
    rows: financeRows,
    period: "all",
  }), [financeRows]);
  const summary = useMemo(
    () => summarizeStaffFinance(financeRows, receivedRows),
    [financeRows, receivedRows],
  );
  const courseBreakdown = useMemo(
    () => receivedBreakdownByCourse(receivedRows),
    [receivedRows],
  );
  if (!isLoaded) {
    return (
      <PageShell size="full">
        <LoadingState label="กำลังสรุปข้อมูลการเงิน" />
      </PageShell>
    );
  }

  return (
    <PageShell size="full" className="space-y-6">
      <section aria-labelledby="staff-quick-actions-heading">
        <h2 id="staff-quick-actions-heading" className="mb-3 font-heading text-lg font-semibold text-foreground">ทางลัดงานดำเนินการ</h2>
        <Card size="sm">
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_ACTIONS.map((item) => (
              <Link key={item.href} href={item.href} className="group flex min-h-16 items-center gap-3 rounded-xl px-3 py-3 outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-3 focus-visible:ring-ring/30">
                <span aria-hidden="true" className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{item.icon}</span>
                <span className="min-w-0"><span className="block text-sm font-semibold text-foreground group-hover:text-primary">{item.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span></span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="border-b border-border"><h2 className="font-heading text-lg font-medium">รายรับแยกตามรายวิชา</h2><p className="text-xs text-muted-foreground">ยอดที่ยืนยันรับชำระทั้งหมด</p></CardHeader>
        <CardContent>
          {courseBreakdown.length > 0 ? (
            <ol className="space-y-5">
              {courseBreakdown.map((course) => {
                const percentage = summary.totalReceived > 0 ? Math.round((course.amount / summary.totalReceived) * 100) : 0;
                return (
                  <li key={course.label}>
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><p className="min-w-0 text-sm font-medium text-foreground sm:truncate">{course.label}</p><p className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{baht(course.amount)} <span className="text-xs font-normal text-muted-foreground">({percentage}%)</span></p></div>
                    <Progress value={course.amount} max={summary.totalReceived || 1} aria-label={`${course.label} ${percentage} เปอร์เซ็นต์ของยอดรับชำระ`} />
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center px-4 text-center"><span aria-hidden="true" className="material-symbols-outlined text-4xl text-muted-foreground">payments</span><p className="mt-2 text-sm font-medium text-foreground">ยังไม่มียอดรับชำระ</p><p className="mt-1 text-xs text-muted-foreground">เมื่อมีรายการที่รับชำระแล้ว ข้อมูลจะแสดงที่นี่</p></div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
