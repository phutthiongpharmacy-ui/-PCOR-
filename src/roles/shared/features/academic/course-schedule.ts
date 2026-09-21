export type CourseScheduleWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type CourseScheduleMode = "onsite" | "online" | "clinical";

export interface CourseScheduleDetails {
  weekday: CourseScheduleWeekday;
  startTime: string;
  endTime: string;
  room: string;
  mode: CourseScheduleMode;
}

const WEEKDAY_LABELS: Readonly<Record<CourseScheduleWeekday, string>> = {
  1: "วันจันทร์",
  2: "วันอังคาร",
  3: "วันพุธ",
  4: "วันพฤหัสบดี",
  5: "วันศุกร์",
  6: "วันเสาร์",
  7: "วันอาทิตย์",
};

export const COURSE_SCHEDULE_DETAILS: Readonly<Record<string, CourseScheduleDetails>> = {
  "offering-cpc-101": {
    weekday: 6,
    startTime: "09:00",
    endTime: "12:00",
    room: "ห้องเรียน 301 อาคารเภสัชศาสตร์",
    mode: "onsite",
  },
  "offering-admin-401": {
    weekday: 7,
    startTime: "09:00",
    endTime: "16:00",
    room: "ห้องประชุม 2 อาคารบริหารการศึกษา",
    mode: "onsite",
  },
  "offering-community-201": {
    weekday: 3,
    startTime: "18:00",
    endTime: "21:00",
    room: "ห้องเรียน 204 อาคารบริการสุขภาพชุมชน",
    mode: "onsite",
  },
  "offering-herbal-501": {
    weekday: 6,
    startTime: "13:00",
    endTime: "16:00",
    room: "ห้องปฏิบัติการเภสัชเวท 2",
    mode: "onsite",
  },
  "offering-vpt-301": {
    weekday: 1,
    startTime: "09:00",
    endTime: "12:00",
    room: "ห้องบรรยาย 1 อาคารศูนย์การแพทย์",
    mode: "onsite",
  },
  "offering-vpt-302": {
    weekday: 3,
    startTime: "13:00",
    endTime: "16:00",
    room: "หอผู้ป่วยอายุรกรรม ชั้น 12",
    mode: "clinical",
  },
  "offering-vpt-303": {
    weekday: 5,
    startTime: "09:00",
    endTime: "12:00",
    room: "ห้องสัมมนาวิจัย 3",
    mode: "onsite",
  },
};

export function formatCourseSchedule(details: CourseScheduleDetails) {
  return `${WEEKDAY_LABELS[details.weekday]} ${details.startTime}–${details.endTime} น.`;
}
