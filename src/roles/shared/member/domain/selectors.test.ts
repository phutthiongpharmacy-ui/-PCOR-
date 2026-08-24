import { describe, expect, it } from "vitest";

import { currentMemberPassport } from "./member";
import { getContinuingEducationStatus, specializationsForDisplay } from "./selectors";
import type { CpdSummary, Specialization } from "./passport";

const cpd: CpdSummary = {
  currentCredits: 65,
  targetCredits: 100,
  perYearMinimum: 10,
  cycleExpiresAt: "2027-04-14",
  activities: [],
};

describe("getContinuingEducationStatus", () => {
  it("returns active when progress and time are healthy", () => {
    expect(getContinuingEducationStatus(cpd, "2026-01-01T00:00:00.000Z")).toBe("active");
  });

  it("warns during the final year", () => {
    expect(getContinuingEducationStatus(cpd, "2026-08-11T00:00:00.000Z")).toBe("warning");
  });

  it("returns completed before checking the cycle deadline", () => {
    expect(getContinuingEducationStatus({ ...cpd, currentCredits: 100 }, "2028-01-01T00:00:00.000Z"))
      .toBe("completed");
  });

  it("returns non-compliant after an incomplete cycle expires", () => {
    expect(getContinuingEducationStatus(cpd, "2027-04-15T00:00:00.000Z"))
      .toBe("non_compliant");
  });
});

describe("specializationsForDisplay", () => {
  const base = currentMemberPassport.specializations[0];
  const specializations: Specialization[] = [
    { ...base, id: "board", type: "board_certificate", verification: { status: "verified" } },
    { ...base, id: "training", type: "in_training", verification: { status: "pending" } },
    { ...base, id: "approval", type: "approval_certificate", verification: { status: "self_declared" } },
    { ...base, id: "diploma", type: "diploma", verification: { status: "verified" } },
  ];
  const passport = { ...currentMemberPassport, specializations };

  it("orders credentials from diploma through board certification", () => {
    expect(specializationsForDisplay(passport).map((item) => item.type)).toEqual([
      "diploma",
      "approval_certificate",
      "board_certificate",
      "in_training",
    ]);
    expect(specializations.map((item) => item.id)).toEqual(["board", "training", "approval", "diploma"]);
  });

  it("keeps only verified credentials for public display", () => {
    expect(specializationsForDisplay(passport, true).map((item) => item.id)).toEqual([
      "diploma",
      "board",
    ]);
  });
});
