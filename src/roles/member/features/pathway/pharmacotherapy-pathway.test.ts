import { describe, expect, it } from "vitest";

import {
  curriculumForPathwayStage,
  pharmacotherapyCurriculumComponents,
  pharmacotherapyPathwaySummary,
} from "./pharmacotherapy-pathway";

describe("pharmacotherapy curriculum structure", () => {
  it("keeps the six year-one courses aligned with the official 37-credit plan", () => {
    const yearOne = curriculumForPathwayStage("year-1");

    expect(yearOne.map((item) => item.code)).toEqual([
      "01-1101",
      "01-1201",
      "01-1301",
      "01-1302",
      "01-1303",
      "01-1401",
    ]);
    expect(yearOne.reduce((total, item) => total + item.allocatedCredits, 0)).toBe(37);
  });

  it("splits one specialized residency across years two and three without double-counting tracks", () => {
    const [yearTwo] = curriculumForPathwayStage("year-2");
    const [yearThree] = curriculumForPathwayStage("year-3");
    const specialized = pharmacotherapyCurriculumComponents.find(
      (item) => item.id === "specialized-residency",
    );

    expect(yearTwo.componentId).toBe("specialized-residency");
    expect(yearThree.componentId).toBe("specialized-residency");
    expect(yearTwo.allocatedCredits).toBe(32);
    expect(yearThree.allocatedCredits).toBe(32);
    expect(specialized?.totalCredits).toBe(64);
    expect(specialized?.requirementMode).toBe("choose_one");
    expect(specialized?.options).toHaveLength(13);
    expect(new Set(specialized?.options?.map((option) => option.code)).size).toBe(13);
    expect(specialized?.options?.at(0)?.code).toBe("01-2401");
    expect(specialized?.options?.at(-1)?.code).toBe("01-2413");
  });

  it("reconciles all annual curriculum allocations to 133 credits", () => {
    const total = ["year-1", "year-2", "year-3", "year-4"]
      .flatMap(curriculumForPathwayStage)
      .reduce((sum, item) => sum + item.allocatedCredits, 0);
    const [yearFour] = curriculumForPathwayStage("year-4");

    expect(yearFour.code).toBe("01-4501");
    expect(yearFour.allocatedCredits).toBe(32);
    expect(total).toBe(pharmacotherapyPathwaySummary.totalCredits);
    expect(total).toBe(133);
  });
});
