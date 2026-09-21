import { describe, expect, it } from "vitest";

import {
  DEFAULT_COURSE_OFFERINGS,
  DEFAULT_TEACHER_AFFILIATIONS,
  DEFAULT_TEACHING_ASSIGNMENTS,
} from "@/roles/shared/features/academic";
import {
  DEFAULT_TEACHING_SCHEDULE,
  selectTeacherSchedule,
  summarizeTeacherSchedule,
  teachingMinutes,
} from "./teacher-schedule";

const now = new Date("2026-09-21T03:00:00.000Z");

function teacherOneSchedule(resourceScopes: readonly string[] = ["course:assigned"]) {
  return selectTeacherSchedule({
    entries: DEFAULT_TEACHING_SCHEDULE,
    offerings: DEFAULT_COURSE_OFFERINGS,
    assignments: DEFAULT_TEACHING_ASSIGNMENTS,
    affiliations: DEFAULT_TEACHER_AFFILIATIONS,
    teacherId: "teacher-001",
    institutionId: "org-inst-siriraj",
    resourceScopes,
    at: now,
  });
}

describe("Teacher schedule", () => {
  it("keeps only accepted, active, in-scope courses for the signed-in Teacher", () => {
    const selection = teacherOneSchedule();

    expect(selection.courses.map((course) => course.offering.id).sort()).toEqual([
      "offering-bcp-101",
      "offering-community-201",
      "offering-vpt-301",
    ]);
    expect(selection.courses.some((course) => course.offering.id === "offering-bcp-220")).toBe(false);
    expect(selection.courses.some((course) => course.offering.id === "offering-vpt-302")).toBe(false);
  });

  it("sorts scheduled entries by weekday and time and keeps unscheduled courses visible", () => {
    const selection = teacherOneSchedule();

    expect(selection.scheduledEntries.map((entry) => entry.courseOfferingId)).toEqual([
      "offering-vpt-301",
      "offering-community-201",
    ]);
    expect(selection.scheduledEntries.map((entry) => entry.room)).toEqual([
      "ห้องบรรยาย 1 อาคารศูนย์การแพทย์",
      "ห้องเรียน 204 อาคารบริการสุขภาพชุมชน",
    ]);
    expect(selection.unscheduledCourses.map((offering) => offering.id)).toEqual([
      "offering-bcp-101",
    ]);
  });

  it("removes the schedule when the Teacher has no assigned-course resource scope", () => {
    expect(teacherOneSchedule(["course:proposal"]).courses).toHaveLength(0);
  });

  it("limits an exact offering scope to that course", () => {
    const selection = teacherOneSchedule(["course:offering-vpt-301"]);

    expect(selection.courses.map((course) => course.offering.id)).toEqual([
      "offering-vpt-301",
    ]);
  });

  it("removes courses when the Teacher affiliation is inactive", () => {
    const selection = selectTeacherSchedule({
      entries: DEFAULT_TEACHING_SCHEDULE,
      offerings: DEFAULT_COURSE_OFFERINGS,
      assignments: DEFAULT_TEACHING_ASSIGNMENTS,
      affiliations: DEFAULT_TEACHER_AFFILIATIONS.map((affiliation) => (
        affiliation.teacherId === "teacher-001"
          ? { ...affiliation, status: "inactive" as const }
          : affiliation
      )),
      teacherId: "teacher-001",
      institutionId: "org-inst-siriraj",
      resourceScopes: ["course:assigned"],
      at: now,
    });

    expect(selection.courses).toHaveLength(0);
  });

  it("summarizes weekly hours and teaching days", () => {
    const summary = summarizeTeacherSchedule(teacherOneSchedule());

    expect(summary).toEqual({
      courseCount: 3,
      teachingMinutes: 360,
      teachingDayCount: 2,
    });
    expect(teachingMinutes("09:30", "12:00")).toBe(150);
    expect(teachingMinutes("12:00", "09:00")).toBe(0);
  });
});
