"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { LoadingState } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import type { UserAuditEvent } from "@/roles/shared/features/audit";
import {
  buildStaffFinanceRows,
  receivedBreakdownByCourse,
  receivedRowsForPeriod,
  summarizeStaffFinance,
} from "@/roles/staff/features/finance/staff-finance-model";

const AUDIT_ACTION_LABELS: Readonly<Record<string, string>> = {
  "sensitive_data.export": "ส่งออกรายงานข้อมูลสำคัญ",
  "admission.documents_reviewed": "ตรวจเอกสารใบสมัคร",
  "admission.request_information": "ขอข้อมูลใบสมัครเพิ่มเติม",
  "admission.approve": "อนุมัติใบสมัคร",
  "admission.reject": "ไม่อนุมัติใบสมัคร",
  "registration.request_information": "ขอข้อมูลลงทะเบียนเพิ่มเติม",
  "registration.approve": "อนุมัติคำขอลงทะเบียน",
  "registration.reject": "ไม่อนุมัติคำขอลงทะเบียน",
  "request.request_information": "ขอข้อมูลคำร้องเพิ่มเติม",
  "request.review_complete": "ตรวจคำร้องครบถ้วน",
  "request.reject": "ไม่อนุมัติคำร้อง",
  "course_proposal.submit": "ส่งคำขอสร้างรายวิชา",
  "course_proposal.resubmit": "ส่งคำขอรายวิชาอีกครั้ง",
  "course_proposal.review": "พิจารณาคำขอรายวิชา",
  "course_offering.update": "ปรับข้อมูลรายวิชาเปิดสอน",
  "teaching_assignment.change": "ปรับการมอบหมายผู้สอน",
  "result.publish": "ประกาศผลการเรียน",
  "result.revise": "แก้ไขผลการเรียน",
  "payment.confirmed": "ระบบยืนยันรับชำระและลงทะเบียน",
  "payment.review_approved": "ยืนยันรับชำระเงิน",
  "payment.review_rejected": "หลักฐานการชำระเงินไม่ผ่าน",
  "payment.reconcile": "ตรวจสอบรายการเงินเข้า",
  "payment.exception": "บันทึกรายการการเงินผิดปกติ",
  "payment.cancel": "ยกเลิกรายการการเงิน",
  "payment.refund": "คืนเงิน",
  "document.prepare": "เตรียมเอกสารลงนาม",
  "document.sign": "ลงนามเอกสาร",
  "document.reject": "ส่งเอกสารกลับแก้ไข",
  "business_record.create": "สร้างรายการดำเนินงาน",
  "business_record.update": "แก้ไขรายการดำเนินงาน",
  "access.role_scope_change": "ปรับขอบเขตสิทธิ์ผู้ใช้",
  "access.break_glass": "เปิดสิทธิ์ฉุกเฉิน",
};

const QUICK_ACTIONS = [
  { href: "/staff/requests", icon: "description", label: "ตรวจคำร้อง", detail: "ตรวจเอกสารและส่งต่องาน" },
  { href: "/staff/course-proposals", icon: "library_add_check", label: "ตรวจคำขอรายวิชา", detail: "พิจารณาข้อเสนอจากสถาบัน" },
  { href: "/staff/exams", icon: "quiz", label: "งานสอบ", detail: "จัดการรอบสอบและผลสอบ" },
  { href: "/staff/signatures", icon: "draw", label: "เตรียมเอกสารลงนาม", detail: "ตรวจความครบถ้วนและจัดคิว" },
] as const;

function auditActionLabel(event: UserAuditEvent) {
  if (
    event.action === "payment.exception" &&
    event.after &&
    typeof event.after === "object" &&
    "phase" in event.after &&
    event.after.phase === "payment_verification"
  ) return "หลักฐานการชำระเงินไม่ผ่าน (รายการเดิม)";
  return AUDIT_ACTION_LABELS[event.action] ?? event.action;
}

function baht(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
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
  const recentActivity = useMemo(() => auditEvents
    .filter((event) => event.action !== "sensitive_data.view")
    .slice()
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 6), [auditEvents]);
  if (!isLoaded) {
    return (
      <PageShell size="full">
        <LoadingState label="กำลังสรุปข้อมูลการเงินและงานล่าสุด" />
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
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

        <Card>
          <CardHeader className="border-b border-border"><div className="flex items-center justify-between gap-3"><div><h2 className="font-heading text-lg font-medium">กิจกรรมล่าสุด</h2><p className="mt-1 text-xs text-muted-foreground">อ่านจาก Business Audit ของเบราว์เซอร์นี้</p></div><Button asChild variant="ghost" size="sm"><Link href="/staff/audit">ดูทั้งหมด</Link></Button></div></CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <ol className="space-y-4">
                {recentActivity.map((event) => (
                  <li key={event.id} className="relative border-l-2 border-border pl-4">
                    <span aria-hidden="true" className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary ring-4 ring-card" />
                    <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-medium text-foreground">{auditActionLabel(event)}</p><time dateTime={event.occurredAt} className="shrink-0 text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</time></div>
                    <p className="mt-1 break-words text-xs text-muted-foreground">{event.resource.label ?? event.resource.id}</p><p className="mt-1 text-xs text-muted-foreground">{event.actor.userName} · {event.actor.organisation.code}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center text-center"><span aria-hidden="true" className="material-symbols-outlined text-4xl text-muted-foreground">history</span><p className="mt-2 text-sm font-medium text-foreground">ยังไม่มีกิจกรรมที่บันทึกไว้</p></div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
