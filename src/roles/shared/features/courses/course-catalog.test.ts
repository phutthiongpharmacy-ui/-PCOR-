import { describe, expect, it } from "vitest";
import { allocateCourseCode, courseCatalog } from "./course-catalog";

describe("course catalog", () => {
  it("contains 25 stable definitions including code-less short courses", () => {
    expect(courseCatalog).toHaveLength(25);
    expect(courseCatalog.filter((item) => item.kind === "short_course")).toHaveLength(5);
    expect(courseCatalog.filter((item) => item.kind === "short_course").every((item) => item.code === undefined)).toBe(true);
  });

  it("allocates deterministic codes without colliding with persisted definitions", () => {
    expect(allocateCourseCode("วภท.", "required")).toBe("CPhT-R-001");
    const existing = ["CPhT-R-001"];
    expect(allocateCourseCode("วภท.", "required", existing)).toBe("CPhT-R-002");
  });
});
