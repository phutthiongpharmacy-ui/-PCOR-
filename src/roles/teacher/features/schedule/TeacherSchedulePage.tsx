"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import {
  WeeklyTimetable,
  type TimetableTone,
  type WeeklyTimetableBreak,
  type WeeklyTimetableEvent,
  type WeeklyTimetableRow,
} from "@/roles/shared/components/schedule/WeeklyTimetable";
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
  tone: TimetableTone;
}> = {
  onsite: {
    label: "สอนในสถานที่",
    tone: "info",
  },
  online: {
    label: "สอนออนไลน์",
    tone: "success",
  },
  clinical: {
    label: "สอนภาคคลินิก",
    tone: "warning",
  },
};

const LUNCH_BREAKS = [{
  id: "lunch",
  label: "พักรับประทานอาหารกลางวัน",
  startTime: "12:00",
  endTime: "13:00",
}] as const satisfies readonly WeeklyTimetableBreak[];

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
  const timetableRows = useMemo<WeeklyTimetableRow[]>(() => scheduleDays.map((day) => ({
    id: String(day.value),
    label: day.label,
    shortLabel: day.shortLabel,
  })), [scheduleDays]);
  const timetableEvents = useMemo<WeeklyTimetableEvent[]>(() => (
    filteredSelection.scheduledEntries.map((entry) => {
      const mode = MODE_META[entry.mode];
      return {
        id: entry.id,
        rowId: String(entry.weekday),
        kicker: entry.offering.courseCode,
        title: entry.offering.courseTitle,
        meta: mode.label,
        location: entry.room,
        startTime: entry.startTime,
        endTime: entry.endTime,
        tone: mode.tone,
        href: `/teacher/courses/${entry.offering.id}`,
      };
    })
  ), [filteredSelection.scheduledEntries]);

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
        <CardContent className={scheduleDays.length > 0 ? "p-0" : "pt-1"}>
          {scheduleDays.length > 0 ? (
            <WeeklyTimetable
              ariaLabel="ตารางสอนประจำสัปดาห์"
              breaks={LUNCH_BREAKS}
              dayEndTime="21:00"
              dayStartTime="08:00"
              events={timetableEvents}
              rows={timetableRows}
            />
          ) : (
            <EmptyState
              icon="event_busy"
              title="ไม่พบคาบสอนในภาคการศึกษานี้"
              description="เลือกภาคการศึกษาอื่น หรือตรวจสอบการมอบหมายรายวิชากับสถาบัน"
            />
          )}
        </CardContent>
      </Card>

    </PageShell>
  );
}
