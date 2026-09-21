"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import {
  WeeklyTimetable,
  type WeeklyTimetableBreak,
  type WeeklyTimetableEvent,
  type WeeklyTimetableRow,
} from "@/roles/shared/components/schedule/WeeklyTimetable";

const scheduleRows = [
  { id: "saturday-week-1", label: "เสาร์ (สัปดาห์ที่ 1)", shortLabel: "ส. 1" },
  { id: "sunday-week-1", label: "อาทิตย์ (สัปดาห์ที่ 1)", shortLabel: "อา. 1" },
  { id: "saturday-week-3", label: "เสาร์ (สัปดาห์ที่ 3)", shortLabel: "ส. 3" },
  { id: "sunday-week-3", label: "อาทิตย์ (สัปดาห์ที่ 3)", shortLabel: "อา. 3" },
] as const satisfies readonly WeeklyTimetableRow[];

const scheduleEvents = [
  {
    id: "advanced-pharmacotherapeutics",
    rowId: "saturday-week-1",
    title: "Adv. Pharmacotherapeutics I",
    meta: "ทฤษฎี",
    location: "Online (Zoom)",
    startTime: "09:00",
    endTime: "12:00",
    tone: "info",
  },
  {
    id: "evidence-based-medicine",
    rowId: "saturday-week-1",
    title: "Evidence-Based Medicine",
    meta: "ทฤษฎี",
    location: "Online (Zoom)",
    startTime: "13:00",
    endTime: "16:00",
    tone: "info",
  },
  {
    id: "clinical-pharmacokinetics",
    rowId: "sunday-week-1",
    title: "Clinical Pharmacokinetics",
    meta: "ทฤษฎี",
    location: "Online (Zoom)",
    startTime: "09:00",
    endTime: "12:00",
    tone: "info",
  },
  {
    id: "research-methodology",
    rowId: "sunday-week-1",
    title: "Research Methodology",
    meta: "ทฤษฎี",
    location: "Online (Zoom)",
    startTime: "13:00",
    endTime: "16:00",
    tone: "info",
  },
  {
    id: "case-discussion",
    rowId: "saturday-week-3",
    title: "Case Discussion: Internal Med.",
    meta: "ปฏิบัติการ",
    location: "ห้องประชุมวิทยาลัย",
    startTime: "09:00",
    endTime: "12:00",
    tone: "success",
  },
  {
    id: "pharmacotherapy-workshop",
    rowId: "saturday-week-3",
    title: "Workshop: Pharmacotherapy Plan",
    meta: "ปฏิบัติการ",
    location: "ห้องประชุมวิทยาลัย",
    startTime: "13:00",
    endTime: "17:00",
    tone: "success",
  },
  {
    id: "bedside-teaching",
    rowId: "sunday-week-3",
    title: "Bedside Teaching",
    meta: "ปฏิบัติการ",
    location: "ศูนย์จำลองสถานการณ์",
    startTime: "09:00",
    endTime: "13:00",
    tone: "success",
  },
  {
    id: "seminar-presentation",
    rowId: "sunday-week-3",
    title: "Seminar & Presentation",
    meta: "ทฤษฎี",
    location: "ห้องประชุมวิทยาลัย",
    startTime: "14:00",
    endTime: "17:00",
    tone: "info",
  },
] as const satisfies readonly WeeklyTimetableEvent[];

const lunchBreaks = [{
  id: "lunch",
  label: "พักรับประทานอาหารกลางวัน",
  startTime: "12:00",
  endTime: "13:00",
}] as const satisfies readonly WeeklyTimetableBreak[];

export default function SchedulePage() {
  return (
    <PageShell bottom="roomy">
      <div className="mb-5 flex justify-end gap-3">
        <div className="flex flex-wrap justify-end gap-2" aria-label="คำอธิบายประเภทรายวิชา">
          <Badge variant="info" className="px-2 py-1 text-xs">ทฤษฎี (Lecture)</Badge>
          <Badge variant="success" className="px-2 py-1 text-xs">ปฏิบัติการ (Lab)</Badge>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <WeeklyTimetable
            ariaLabel="ตารางเรียนตามสัปดาห์"
            breaks={lunchBreaks}
            dayEndTime="17:00"
            dayStartTime="08:00"
            events={scheduleEvents}
            rows={scheduleRows}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
