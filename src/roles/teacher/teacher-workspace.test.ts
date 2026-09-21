import { describe, expect, it } from "vitest";

import { TEACHER_NAV_ITEMS } from "./teacher-workspace";

describe("Teacher workspace navigation", () => {
  it("exposes the teaching schedule immediately after assigned courses", () => {
    const scheduleIndex = TEACHER_NAV_ITEMS.findIndex((item) => item.href === "/teacher/schedule");

    expect(scheduleIndex).toBeGreaterThan(0);
    expect(TEACHER_NAV_ITEMS[scheduleIndex]).toMatchObject({
      icon: "calendar_month",
      label: "ตารางสอน",
    });
    expect(TEACHER_NAV_ITEMS[scheduleIndex - 1]?.href).toBe("/teacher/courses");
  });
});
