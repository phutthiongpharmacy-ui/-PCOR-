"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { WorkflowStateTimeline } from "@/roles/shared/components/workspace/WorkflowStateTimeline";
import { EmptyState, LoadingState } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import { formatCourseCode } from "@/roles/shared/data/college-directory";
import { registrationStatusMeta } from "@/roles/shared/features/registration";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import {
  registrationTimelineSteps,
} from "./registration-timeline";

export default function RegistrationStatusPage() {
  const { session } = usePortalSession();
  const { isLoaded, registrations, registrationInvoices, payments } = useMockDb();
  const memberId = session?.role === "student" ? session.userId : "";
  const memberRegistrations = useMemo(
    () => registrations.filter((registration) => registration.studentId === memberId),
    [memberId, registrations],
  );

  if (!isLoaded) {
    return (
      <PageShell className="py-10">
        <LoadingState label="กำลังโหลดสถานะการลงทะเบียน" />
      </PageShell>
    );
  }

  return (
    <PageShell size="wide" bottom="roomy" className="space-y-5">
      <div className="flex justify-end">
        <Button asChild className="min-h-11 sm:min-h-9">
          <Link href="/member/registration/courses">
            <span aria-hidden="true" className="material-symbols-outlined text-lg">add_circle</span>
            ลงทะเบียนเรียน
          </Link>
        </Button>
      </div>

      {memberRegistrations.length === 0 ? (
        <EmptyState
          icon="timeline"
          title="ยังไม่มีคำขอลงทะเบียน"
          description="เลือกวิชาจากหน้าลงทะเบียนเรียน แล้วสถานะและลำดับการดำเนินงานจะแสดงที่นี่"
        />
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            {memberRegistrations.map((registration) => {
              const status = registrationStatusMeta[registration.status];
              const invoice = registrationInvoices.find((item) => item.registrationId === registration.id);
              const payment = invoice ? payments.find((item) => item.invoiceId === invoice.id) : undefined;
              const teacherDecisionEvent = [...registration.history].reverse().find((event) => event.actorRole === "teacher");
              const teacherDecision = registration.teacherDecision;
              const timelineSteps = registrationTimelineSteps(registration, invoice?.status, payment?.status);
              const displayCourseCode = formatCourseCode(registration.courseCode);

              return (
                <article key={registration.id} className="overflow-hidden rounded-2xl border border-border">
                  <details className="group">
                    <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{displayCourseCode} · {registration.courseTitle}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">คำขอ {registration.id}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <span aria-hidden="true" className="material-symbols-outlined text-xl text-muted-foreground transition-transform group-open:rotate-180">expand_more</span>
                      </span>
                    </summary>
                    <div className="border-t border-border px-4 pb-4">
                      <WorkflowStateTimeline steps={timelineSteps} label={`สถานะการลงทะเบียน ${displayCourseCode}`} className="mt-4" />
                      {registration.status === "drop_pending" ? (
                        <div role="note" className="mt-2 flex items-start gap-2 rounded-lg border border-neutral-border bg-neutral-soft px-3 py-2 text-xs text-neutral-on-soft">
                          <span aria-hidden="true" className="material-symbols-outlined text-base">schedule</span>
                          <span><strong>รอตรวจสอบคำขอถอนรายวิชา</strong> ขั้นตอนด้านบนแสดงสถานะก่อนยื่นถอน</span>
                        </div>
                      ) : registration.status === "withdrawn" ? (
                        <div role="note" className="mt-2 flex items-start gap-2 rounded-lg border border-neutral-border bg-neutral-soft px-3 py-2 text-xs text-neutral-on-soft">
                          <span aria-hidden="true" className="material-symbols-outlined text-base">cancel</span>
                          <span><strong>ถอนรายวิชาแล้ว</strong> ขั้นตอนด้านบนเป็นประวัติก่อนถอนรายวิชา</span>
                        </div>
                      ) : null}
                      {(teacherDecision?.reason || teacherDecisionEvent?.reason || registration.reviewReason) ? (
                        <div role="note" className="mt-3 rounded-lg border border-info-border bg-info-soft px-3 py-2 text-xs text-info-on-soft">
                          <span className="font-semibold">เหตุผลจากผู้พิจารณา:</span> {teacherDecision?.reason ?? teacherDecisionEvent?.reason ?? registration.reviewReason}
                        </div>
                      ) : null}
                    </div>
                  </details>
                </article>
              );
            })}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
