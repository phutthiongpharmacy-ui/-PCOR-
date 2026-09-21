"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import {
  EmptyState,
  ForbiddenState,
  LoadingState,
  MetricCard,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import { selectInstitutionStudents } from "@/roles/shared/features/academic";
import type { ActivityReviewDecision } from "@/roles/shared/features/activity-transcript";
import {
  SensitiveViewAuditBoundary,
  useSensitiveViewAudit,
} from "@/roles/shared/features/audit";
import { hasResourceScope } from "@/roles/shared/features/roles/access-model";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import { activityTranscriptRequirements } from "@/roles/member/features/activity-transcript/activity-transcript-data";
import { institutionActor } from "@/roles/institution/features/workspace/institution-workspace-utils";

import {
  InstitutionActivityEntryDialog,
  type InstitutionActivityEntryFormValue,
} from "./InstitutionActivityEntryDialog";
import { InstitutionActivityReviewDialog } from "./InstitutionActivityReviewDialog";

const sourceLabels = {
  student: "ผู้เรียนบันทึก",
  officer: "เจ้าหน้าที่สถาบันบันทึก",
  college_checkin: "Check-in ของสถาบัน",
  system: "ข้อมูลจากระบบ",
} as const;

const statusMeta = {
  verified: { label: "ยืนยันแล้ว", variant: "success" },
  pending: { label: "รอตรวจสอบ", variant: "warning" },
  self_declared: { label: "ผู้เรียนกรอกเอง", variant: "info" },
  rejected: { label: "ไม่ผ่าน", variant: "danger" },
} as const;

const fieldClassName =
  "h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function InstitutionActivityTranscriptPage() {
  const db = useMockDb();
  const { session, isReady } = usePortalSession();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState("all");
  const [query, setQuery] = useState("");
  const institutionId = session?.role === "institution_admin" ? session.organisation.id : "";
  const institutionStudents = useMemo(() => (
    selectInstitutionStudents(db.academicStudents, db.studentAffiliations, institutionId)
  ), [db.academicStudents, db.studentAffiliations, institutionId]);
  const institutionStudentIds = useMemo(
    () => new Set(institutionStudents.map((student) => student.id)),
    [institutionStudents],
  );
  const institutionEntries = useMemo(() => db.activityTranscriptEntries.filter((entry) => (
    entry.organisationId === institutionId && institutionStudentIds.has(entry.memberId)
  )), [db.activityTranscriptEntries, institutionId, institutionStudentIds]);

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
    return institutionEntries
      .filter((entry) => memberFilter === "all" || entry.memberId === memberFilter)
      .filter((entry) => {
        const student = institutionStudents.find((item) => item.id === entry.memberId);
        return !normalizedQuery || [entry.title, entry.memberId, student?.name, entry.institution]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("th-TH")
          .includes(normalizedQuery);
      })
      .sort((left, right) => right.activityDate.localeCompare(left.activityDate));
  }, [institutionEntries, institutionStudents, memberFilter, query]);
  const selectedEntry = institutionEntries.find(
    (entry) => entry.id === selectedEntryId,
  ) ?? null;
  const sensitiveViewAudit = useSensitiveViewAudit({
    enabled: isReady && db.isLoaded && session?.role === "institution_admin" && Boolean(institutionId),
    session,
    resource: {
      type: "institution_activity_transcript",
      id: `${institutionId || "unresolved-institution"}:activity-transcript`,
      label: "Activity Transcript ของผู้เรียนในสถาบัน",
      organisationId: institutionId || undefined,
    },
  });

  if (!db.isLoaded || !isReady) {
    return <PageShell><LoadingState label="กำลังโหลด Activity Transcript" /></PageShell>;
  }

  if (
    !session ||
    session.role !== "institution_admin" ||
    !hasResourceScope(session.resourceScopes, `institution:${session.organisation.id}`)
  ) {
    return <PageShell><ForbiddenState description="ต้องใช้บัญชีผู้ดูแลสถาบันที่มีสิทธิ์ในสถาบันนี้เพื่อจัดการ Activity Transcript" /></PageShell>;
  }
  const actor = institutionActor(session);
  if (!actor) {
    return <PageShell><ForbiddenState description="ไม่สามารถระบุขอบเขตสถาบันของบัญชีนี้ได้" /></PageShell>;
  }

  const submitActivity = (value: InstitutionActivityEntryFormValue) => {
    try {
      db.recordInstitutionActivity({
        actor,
        ...value,
      });
      setMemberFilter(value.memberId);
      setIsCreateOpen(false);
      toast.success("บันทึกและยืนยันกิจกรรมแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ไม่สามารถบันทึกกิจกรรมได้");
    }
  };

  const reviewActivity = (
    activityId: string,
    decision: ActivityReviewDecision,
    note?: string,
  ) => {
    try {
      db.reviewInstitutionActivity({
        actor,
        activityId,
        decision,
        note,
      });
      setSelectedEntryId(null);
      toast.success(decision === "approve" ? "อนุมัติกิจกรรมแล้ว" : "บันทึกการไม่อนุมัติกิจกรรมแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ไม่สามารถบันทึกผลการตรวจสอบได้");
    }
  };

  const verifiedCount = institutionEntries.filter((entry) => entry.verification.status === "verified").length;
  const studentPendingCount = institutionEntries.filter((entry) => (
    entry.source === "student" &&
    (entry.verification.status === "pending" || entry.verification.status === "self_declared")
  )).length;
  const institutionRecordedCount = institutionEntries.filter((entry) => (
    entry.source === "officer" || entry.source === "college_checkin"
  )).length;

  return (
    <PageShell size="full">
      <SensitiveViewAuditBoundary status={sensitiveViewAudit.status} onRetry={sensitiveViewAudit.retry}>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <WorkspaceHeader
              eyebrow="กิจกรรมของสถาบัน"
              title="Activity Transcript"
              description="บันทึกและตรวจสอบกิจกรรมของผู้เรียนที่มีสังกัดอยู่ในสถาบันนี้"
            />
          <Button type="button" className="min-h-11 shrink-0" disabled={institutionStudents.length === 0} onClick={() => setIsCreateOpen(true)}>
            <span aria-hidden="true" className="material-symbols-outlined text-lg">add</span>
            บันทึกกิจกรรม
          </Button>
          </div>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="สรุปรายการ Activity Transcript">
        <MetricCard size="sm" label="รายการทั้งหมด" value={institutionEntries.length} note="เฉพาะผู้เรียนในสถาบัน" icon="receipt_long" />
        <MetricCard size="sm" label="ยืนยันแล้ว" value={verifiedCount} note={`สถาบัน / Check-in ${institutionRecordedCount} รายการ`} icon="verified" emphasis="success" />
        <MetricCard size="sm" label="รอตรวจรายการจากผู้เรียน" value={studentPendingCount} note="รายการนี้ยังไม่ถูกนับเป็นความคืบหน้า" icon="pending_actions" emphasis={studentPendingCount > 0 ? "warning" : "default"} />
      </section>

      <Card size="sm">
        <CardContent className="grid gap-3 px-4 md:grid-cols-2 md:items-end">
          <div>
            <label htmlFor="institution-activity-search" className="mb-1.5 block text-sm font-medium">ค้นหา</label>
            <Input id="institution-activity-search" type="search" className="h-11" placeholder="ชื่อผู้เรียน รหัส หรือชื่อกิจกรรม" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div>
            <label htmlFor="institution-activity-member-filter" className="mb-1.5 block text-sm font-medium">ผู้เรียน</label>
            <select id="institution-activity-member-filter" className={fieldClassName} value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}>
              <option value="all">ผู้เรียนทั้งหมด</option>
              {institutionStudents.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.id}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="institution-activity-list-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="institution-activity-list-title" className="text-xl font-semibold">รายการกิจกรรม</h2>
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">พบ {visibleEntries.length} รายการ</p>
        </div>
        {visibleEntries.length === 0 ? (
          <EmptyState icon="event_busy" title="ไม่พบกิจกรรม" description="ลองเปลี่ยนผู้เรียนหรือคำค้นหา แล้วตรวจสอบอีกครั้ง" />
        ) : (
          <div className="space-y-3">
            {visibleEntries.map((entry) => {
              const student = institutionStudents.find((item) => item.id === entry.memberId);
              const requirement = activityTranscriptRequirements.find((item) => item.id === entry.requirementId);
              const status = statusMeta[entry.verification.status];
              return (
                <Card key={entry.id} size="sm">
                  <CardContent className="grid gap-4 px-4 lg:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.5fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{student?.name ?? entry.memberId}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{entry.memberId}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">ปี {entry.trainingYear}</Badge>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <Badge variant="neutral">{sourceLabels[entry.source]}</Badge>
                      </div>
                      <h3 className="mt-2 font-semibold text-foreground">{entry.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {requirement?.label ?? entry.requirementId} · {formatThaiDate(entry.activityDate)} · {entry.institution}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 text-sm text-muted-foreground lg:items-end lg:text-right">
                      <div>
                        <p className="font-medium text-foreground">{entry.evidence.length} หลักฐาน</p>
                        <p className="mt-1">{entry.role}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 w-full lg:w-auto"
                        aria-label={`ดูรายละเอียด: ${entry.title}`}
                        onClick={() => setSelectedEntryId(entry.id)}
                      >
                        ดูรายละเอียด
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">
                          chevron_right
                        </span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {isCreateOpen ? (
        <InstitutionActivityEntryDialog
          open
          onOpenChange={setIsCreateOpen}
          students={institutionStudents}
          requirements={activityTranscriptRequirements}
          onSubmit={submitActivity}
        />
      ) : null}
      {selectedEntry ? (
        <InstitutionActivityReviewDialog
          entry={selectedEntry}
          student={institutionStudents.find((student) => student.id === selectedEntry.memberId)}
          requirement={activityTranscriptRequirements.find(
            (requirement) => requirement.id === selectedEntry.requirementId,
          )}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedEntryId(null);
          }}
          onReview={(decision, note) => reviewActivity(selectedEntry.id, decision, note)}
        />
      ) : null}
        </div>
      </SensitiveViewAuditBoundary>
    </PageShell>
  );
}
