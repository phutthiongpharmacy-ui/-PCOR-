import type {
  CourseOffering,
  CourseScheduleMode,
  CourseScheduleWeekday,
  TeacherAffiliation,
  TeachingAssignment,
} from "@/roles/shared/features/academic";
import {
  canTeacherAccessOfferingWithinAffiliation,
  COURSE_SCHEDULE_DETAILS,
} from "@/roles/shared/features/academic";
import { hasResourceScope } from "@/roles/shared/features/roles/access-model";

export type TeachingWeekday = CourseScheduleWeekday;
export type TeachingMode = CourseScheduleMode;

export interface TeachingScheduleEntry {
  id: string;
  courseOfferingId: string;
  weekday: TeachingWeekday;
  startTime: string;
  endTime: string;
  room: string;
  mode: TeachingMode;
}

export interface TeacherScheduleCourse {
  offering: CourseOffering;
  entries: TeachingScheduleEntry[];
}

export interface TeacherScheduleSelection {
  courses: TeacherScheduleCourse[];
  scheduledEntries: Array<TeachingScheduleEntry & { offering: CourseOffering }>;
  unscheduledCourses: CourseOffering[];
}

export const DEFAULT_TEACHING_SCHEDULE: readonly TeachingScheduleEntry[] = Object.entries(
  COURSE_SCHEDULE_DETAILS,
).map(([courseOfferingId, details]) => ({
  id: `schedule-${courseOfferingId.replace(/^offering-/, "")}`,
  courseOfferingId,
  ...details,
}));

function assignmentIsActive(assignment: TeachingAssignment, at: Date) {
  const current = at.getTime();
  return new Date(assignment.startsAt).getTime() <= current &&
    (!assignment.endsAt || current < new Date(assignment.endsAt).getTime());
}

function compareEntries(left: TeachingScheduleEntry, right: TeachingScheduleEntry) {
  return left.weekday - right.weekday || left.startTime.localeCompare(right.startTime);
}

export function selectTeacherSchedule({
  entries,
  offerings,
  assignments,
  affiliations,
  teacherId,
  institutionId,
  resourceScopes,
  at = new Date(),
}: {
  entries: readonly TeachingScheduleEntry[];
  offerings: readonly CourseOffering[];
  assignments: readonly TeachingAssignment[];
  affiliations: readonly TeacherAffiliation[];
  teacherId: string;
  institutionId: string;
  resourceScopes: readonly string[];
  at?: Date;
}): TeacherScheduleSelection {
  const accessibleOfferingIds = new Set(assignments
    .filter((assignment) => {
      const hasCourseScope = resourceScopes.includes("course:assigned") ||
        hasResourceScope(resourceScopes, `course:${assignment.courseOfferingId}`);

      return assignment.status === "accepted" &&
        assignment.teacherId === teacherId &&
        assignment.institutionId === institutionId &&
        assignmentIsActive(assignment, at) &&
        hasCourseScope &&
        canTeacherAccessOfferingWithinAffiliation(
          assignments,
          affiliations,
          teacherId,
          institutionId,
          assignment.courseOfferingId,
          at,
        );
    })
    .map((assignment) => assignment.courseOfferingId));

  const accessibleOfferings = offerings
    .filter((offering) => (
      accessibleOfferingIds.has(offering.id) && offering.institutionId === institutionId
    ))
    .sort((left, right) => left.courseCode.localeCompare(right.courseCode, "th"));

  const courses = accessibleOfferings.map((offering) => ({
    offering,
    entries: entries
      .filter((entry) => entry.courseOfferingId === offering.id)
      .sort(compareEntries),
  }));

  const scheduledEntries = courses
    .flatMap(({ offering, entries: courseEntries }) => (
      courseEntries.map((entry) => ({ ...entry, offering }))
    ))
    .sort(compareEntries);

  return {
    courses,
    scheduledEntries,
    unscheduledCourses: courses
      .filter((course) => course.entries.length === 0)
      .map((course) => course.offering),
  };
}

export function teachingMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return Math.max(0, (endHour * 60 + endMinute) - (startHour * 60 + startMinute));
}

export function summarizeTeacherSchedule(selection: TeacherScheduleSelection) {
  return {
    courseCount: selection.courses.length,
    teachingMinutes: selection.scheduledEntries.reduce(
      (total, entry) => total + teachingMinutes(entry.startTime, entry.endTime),
      0,
    ),
    teachingDayCount: new Set(selection.scheduledEntries.map((entry) => entry.weekday)).size,
  };
}
