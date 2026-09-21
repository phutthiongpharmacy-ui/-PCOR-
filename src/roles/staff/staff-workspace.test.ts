import { describe, expect, it } from "vitest";

import { STAFF_NAV_ITEMS } from "./staff-workspace";

describe("Officer workspace navigation", () => {
  it("does not expose the disabled business history feature", () => {
    expect(STAFF_NAV_ITEMS.some((item) => item.href === "/staff/audit")).toBe(false);
    expect(STAFF_NAV_ITEMS.some((item) => item.label === "ประวัติงานธุรกิจ")).toBe(false);
  });
});
