import { describe, expect, it } from "vitest";
import { allocateCourseCode, courseCatalog } from "./course-catalog";

describe("course catalog", () => {
  it("contains 25 stable definitions including code-less short courses", () => {
    expect(courseCatalog).toHaveLength(25);
    const shortCourses = courseCatalog.filter((item) => item.kind === "short_course");
    expect(shortCourses).toHaveLength(5);
    expect(shortCourses.filter((item) => item.shortCourseTrack === "standard")).toHaveLength(2);
    expect(shortCourses.filter((item) => item.shortCourseTrack === "advanced")).toHaveLength(3);
    expect(shortCourses.every((item) => item.code === undefined)).toBe(true);
  });

  it("allocates deterministic codes without colliding with persisted definitions", () => {
    expect(allocateCourseCode("วภท.", "required")).toBe("CPhT-R-001");
    const existing = ["CPhT-R-001"];
    expect(allocateCourseCode("วภท.", "required", existing)).toBe("CPhT-R-002");
  });
});
