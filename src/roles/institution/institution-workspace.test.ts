import { describe, expect, it } from "vitest";

import { INSTITUTION_NAV_ITEMS } from "./institution-workspace";

describe("Institution workspace navigation", () => {
  it("groups Institution work in a clear operational order", () => {
    expect(INSTITUTION_NAV_ITEMS.map((item) => ({
      href: item.href,
      section: item.section?.label ?? null,
    }))).toEqual([
      { href: "/institution/dashboard", section: null },
      { href: "/institution/courses", section: "การเรียนการสอน" },
      { href: "/institution/teachers", section: "การเรียนการสอน" },
      { href: "/institution/assignments", section: "การเรียนการสอน" },
      { href: "/institution/students", section: "ผู้เรียนและผลการศึกษา" },
      { href: "/institution/registrations", section: "ผู้เรียนและผลการศึกษา" },
      { href: "/institution/results", section: "ผู้เรียนและผลการศึกษา" },
      { href: "/institution/activity-transcript", section: "ผู้เรียนและผลการศึกษา" },
      { href: "/institution/admissions", section: "งานรับสมัคร" },
      { href: "/institution/admission-exams", section: "งานรับสมัคร" },
      { href: "/institution/admission-results", section: "งานรับสมัคร" },
      { href: "/institution/finance", section: "งานสนับสนุน" },
    ]);
  });

  it("exposes Activity Transcript in the Institution workspace", () => {
    expect(INSTITUTION_NAV_ITEMS).toContainEqual(expect.objectContaining({
      href: "/institution/activity-transcript",
      label: "Activity Transcript",
    }));
  });
});
