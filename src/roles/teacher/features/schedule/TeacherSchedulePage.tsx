"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import {
  EmptyState,
  LoadingState,
  MetricCard,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import {
  DEFAULT_TEACHING_SCHEDULE,
  selectTeacherSchedule,
  summarizeTeacherSchedule,
  type TeacherScheduleSelection,
  type TeachingMode,
  type TeachingWeekday,
} from "./teacher-schedule";

const WEEKDAYS: ReadonlyArray<{ value: TeachingWeekday; label: string; shortLabel: string }> = [
  { value: 1, label: "วันจันทร์", shortLabel: "จ." },
  { value: 2, label: "วันอังคาร", shortLabel: "อ." },
  { value: 3, label: "วันพุธ", shortLabel: "พ." },
  { value: 4, label: "วันพฤหัสบดี", shortLabel: "พฤ." },
  { value: 5, label: "วันศุกร์", shortLabel: "ศ." },
  { value: 6, label: "วันเสาร์", shortLabel: "ส." },
  { value: 7, label: "วันอาทิตย์", shortLabel: "อา." },
];

const MODE_META: Record<TeachingMode, {
  label: string;
  icon: string;
  badge: "info" | "success" | "warning";
  surface: string;
}> = {
  onsite: {
    label: "สอนในสถานที่",
    icon: "location_on",
    badge: "info",
    surface: "border-info-border bg-info-soft/50",
  },
  online: {
    label: "สอนออนไลน์",
    icon: "videocam",
    badge: "success",
    surface: "border-success-border bg-success-soft/50",
  },
  clinical: {
    label: "สอนภาคคลินิก",
    icon: "local_hospital",
    badge: "warning",
    surface: "border-warning-border bg-warning-soft/50",
  },
};

const selectClassName =
  "h-11 min-w-48 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

function filterSelectionByTerm(
  selection: TeacherScheduleSelection,
  term: string,
): TeacherScheduleSelection {
  if (term === "all") return selection;
  const courses = selection.courses.filter((course) => course.offering.term === term);
  const offeringIds = new Set(courses.map((course) => course.offering.id));
  return {
    courses,
    scheduledEntries: selection.scheduledEntries.filter((entry) => (
      offeringIds.has(entry.courseOfferingId)
    )),
    unscheduledCourses: selection.unscheduledCourses.filter((offering) => (
      offeringIds.has(offering.id)
    )),
  };
}

function formatHours(minutes: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(minutes / 60);
}

function ScheduleEntryCard({
  entry,
}: {
  entry: TeacherScheduleSelection["scheduledEntries"][number];
}) {
  const mode = MODE_META[entry.mode];
  return (
    <article className={cn("rounded-2xl border p-4", mode.surface)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-semibold text-primary">{entry.offering.courseCode}</p>
          <h3 className="mt-1 font-semibold leading-snug text-foreground">
            {entry.offering.courseTitle}
          </h3>
        </div>
        <Badge variant={mode.badge}>{mode.label}</Badge>
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-lg text-muted-foreground">schedule</span>
          <div>
            <dt className="sr-only">เวลา</dt>
            <dd className="font-medium text-foreground">
              <time dateTime={entry.startTime}>{entry.startTime}</time>
              {" – "}
              <time dateTime={entry.endTime}>{entry.endTime}</time>
            </dd>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-lg text-muted-foreground">{mode.icon}</span>
          <div className="min-w-0">
            <dt className="sr-only">สถานที่</dt>
            <dd className="break-words text-muted-foreground">{entry.room}</dd>
          </div>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-foreground/10 pt-3">
        <span className="text-xs text-muted-foreground">ภาคการศึกษา {entry.offering.term}</span>
        <Button asChild variant="outline" size="sm">
          <Link href={`/teacher/courses/${entry.offering.id}`}>
            เปิดรายวิชา
            <span aria-hidden="true" className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </Button>
      </div>
    </article>
  );
}

export default function TeacherSchedulePage({
  today = new Date(),
}: {
  today?: Date;
}) {
  const { session, isReady: isSessionReady } = usePortalSession();
  const db = useMockDb();
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [now] = useState(() => new Date(today));

  const selection = useMemo(() => {
    if (session?.role !== "teacher") {
      return { courses: [], scheduledEntries: [], unscheduledCourses: [] };
    }
    return selectTeacherSchedule({
      entries: DEFAULT_TEACHING_SCHEDULE,
      offerings: db.courseOfferings,
      assignments: db.teachingAssignments,
      affiliations: db.teacherAffiliations,
      teacherId: session.userId,
      institutionId: session.organisation.id,
      resourceScopes: session.resourceScopes,
      at: now,
    });
  }, [db.courseOfferings, db.teacherAffiliations, db.teachingAssignments, now, session]);

  const terms = useMemo(() => Array.from(new Set(selection.courses.map((course) => (
    course.offering.term
  )))).sort((left, right) => right.localeCompare(left, "th")), [selection.courses]);

  const filteredSelection = useMemo(
    () => filterSelectionByTerm(selection, selectedTerm),
    [selectedTerm, selection],
  );
  const summary = useMemo(
    () => summarizeTeacherSchedule(filteredSelection),
    [filteredSelection],
  );
  const scheduleDays = useMemo(() => WEEKDAYS
    .map((day) => ({
      ...day,
      entries: filteredSelection.scheduledEntries.filter((entry) => entry.weekday === day.value),
    }))
    .filter((day) => day.entries.length > 0), [filteredSelection.scheduledEntries]);

  if (!isSessionReady || !db.isLoaded) {
    return (
      <PageShell size="full">
        <LoadingState label="กำลังโหลดตารางสอน" />
      </PageShell>
    );
  }

  return (
    <PageShell size="full" className="space-y-6">
      <WorkspaceHeader
        eyebrow="ภาระงานสอนประจำสัปดาห์"
        title="ตารางสอน"
        description="ดูวัน เวลา สถานที่ และรายวิชาที่อยู่ในขอบเขตการสอนของคุณ"
        headingLevel="h2"
      />

      <section aria-label="สรุปตารางสอน" className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          size="sm"
          label="รายวิชาที่รับผิดชอบ"
          value={summary.courseCount}
          note="เฉพาะรายวิชาที่ตอบรับแล้ว"
          icon="menu_book"
        />
        <MetricCard
          size="sm"
          label="ชั่วโมงสอนต่อสัปดาห์"
          value={formatHours(summary.teachingMinutes)}
          note="คำนวณจากคาบที่กำหนดเวลาแล้ว"
          icon="schedule"
          emphasis="success"
        />
        <MetricCard
          size="sm"
          label="วันที่มีคาบสอน"
          value={summary.teachingDayCount}
          note="จำนวนวันสอนที่ไม่ซ้ำกัน"
          icon="calendar_month"
          emphasis="warning"
        />
      </section>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-lg">ตารางสอนประจำสัปดาห์</CardTitle>
              <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">
                {filteredSelection.scheduledEntries.length} คาบ · {summary.courseCount} รายวิชา
              </p>
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              ภาคการศึกษา
              <select
                aria-label="กรองตามภาคการศึกษา"
                className={selectClassName}
                value={selectedTerm}
                onChange={(event) => setSelectedTerm(event.target.value)}
              >
                <option value="all">ทั้งหมด</option>
                {terms.map((term) => <option key={term} value={term}>{term}</option>)}
              </select>
            </label>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          {scheduleDays.length > 0 ? (
            <ol aria-label="คาบสอนเรียงตามวัน" className="divide-y divide-border">
              {scheduleDays.map((day) => (
                <li key={day.value} className="grid gap-4 py-5 md:grid-cols-[8rem_minmax(0,1fr)]">
                  <div className="flex items-center gap-3 md:block">
                    <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary md:mb-2">
                      {day.shortLabel}
                    </span>
                    <div>
                      <h2 className="font-semibold text-foreground">{day.label}</h2>
                      <p className="text-xs text-muted-foreground">{day.entries.length} คาบ</p>
                    </div>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                    {day.entries.map((entry) => (
                      <ScheduleEntryCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon="event_busy"
              title="ไม่พบคาบสอนในภาคการศึกษานี้"
              description="เลือกภาคการศึกษาอื่น หรือตรวจสอบการมอบหมายรายวิชากับสถาบัน"
            />
          )}
        </CardContent>
      </Card>

      {filteredSelection.unscheduledCourses.length > 0 ? (
        <section aria-labelledby="unscheduled-courses-title" className="rounded-2xl border border-warning-border bg-warning-soft p-4 md:p-5">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-warning">event_busy</span>
            <div className="min-w-0 flex-1">
              <h2 id="unscheduled-courses-title" className="font-semibold text-warning-on-soft">
                รายวิชาที่ยังไม่กำหนดเวลา
              </h2>
              <p className="mt-1 text-xs text-warning-on-soft">
                ติดต่อสถาบันเพื่อยืนยันวัน เวลา และสถานที่ก่อนเริ่มสอน
              </p>
              <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {filteredSelection.unscheduledCourses.map((offering) => (
                  <li key={offering.id} className="flex items-center justify-between gap-3 rounded-xl border border-warning-border bg-card p-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-primary">{offering.courseCode}</p>
                      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{offering.courseTitle}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link href={`/teacher/courses/${offering.id}`}>เปิดรายวิชา</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
