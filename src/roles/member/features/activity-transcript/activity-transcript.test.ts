import { describe, expect, it } from "vitest";

import {
  activityTranscriptEntries,
  activityTranscriptRequirements,
} from "./activity-transcript-data";
import {
  filterActivityEntries,
  getActivityRequirementProgress,
  getActivityRequirementsForYear,
  summarizeActivityYear,
  type ActivityRequirement,
  type ActivityTranscriptEntry,
} from "./activity-transcript";

describe("activity transcript domain", () => {
  it("models the exact year 1-4 curriculum requirements without inventing a teaching minimum", () => {
    const expectedRequirements = {
      1: [
        ["y1-seminar", 1],
        ["y1-journal-club", 3],
        ["y1-case-presentation", 3],
        ["y1-teaching", undefined],
      ],
      2: [
        ["y2-seminar", 1],
        ["y2-journal-club", 6],
        ["y2-case-presentation", 6],
        ["y2-domestic-publication", 1],
        ["y2-teaching", undefined],
      ],
      3: [
        ["y3-seminar", 1],
        ["y3-journal-club", 6],
        ["y3-case-presentation", 6],
        ["y3-professional-project", 1],
        ["y3-practice-improvement", 1],
        ["y3-international-publication", 1],
        ["y3-teaching", undefined],
      ],
      4: [
        ["y4-seminar", 1],
        ["y4-journal-club", 6],
        ["y4-case-presentation", 6],
        ["y4-international-publication", 1],
        ["y4-teaching", undefined],
      ],
    } as const;

    for (const year of [1, 2, 3, 4] as const) {
      const actual = getActivityRequirementsForYear(
        activityTranscriptRequirements,
        year,
      ).map(({ id, targetCount }) => [id, targetCount]);

      expect(actual).toEqual(expectedRequirements[year]);
    }

    const teachingRequirements = activityTranscriptRequirements.filter(
      (requirement) => requirement.category === "teaching_supervision",
    );
    expect(teachingRequirements).toHaveLength(4);
    expect(
      teachingRequirements.every(
        (requirement) => requirement.targetCount === undefined,
      ),
    ).toBe(true);
  });

  it("counts only verified activities toward a numeric requirement", () => {
    const journalRequirement = activityTranscriptRequirements.find(
      (requirement) => requirement.id === "y2-journal-club",
    ) as ActivityRequirement;

    const progress = getActivityRequirementProgress(
      journalRequirement,
      activityTranscriptEntries,
    );

    expect(progress).toMatchObject({
      verifiedCount: 2,
      pendingCount: 1,
      rejectedCount: 0,
      isComplete: false,
      progressValue: 2,
      progressMax: 6,
    });
  });

  it("completes a presence-only requirement only after one item is verified", () => {
    const teachingRequirement = activityTranscriptRequirements.find(
      (requirement) => requirement.id === "y2-teaching",
    ) as ActivityRequirement;
    const pendingTeaching = activityTranscriptEntries.find(
      (entry) => entry.requirementId === teachingRequirement.id,
    ) as ActivityTranscriptEntry;

    expect(
      getActivityRequirementProgress(teachingRequirement, [pendingTeaching]),
    ).toMatchObject({
      verifiedCount: 0,
      pendingCount: 1,
      isComplete: false,
      progressValue: 0,
      progressMax: 1,
    });

    const verifiedTeaching: ActivityTranscriptEntry = {
      ...pendingTeaching,
      id: "verified-teaching",
      verification: { status: "verified" },
    };
    expect(
      getActivityRequirementProgress(teachingRequirement, [verifiedTeaching]),
    ).toMatchObject({
      verifiedCount: 1,
      pendingCount: 0,
      isComplete: true,
      progressValue: 1,
      progressMax: 1,
    });
  });

  it("summarizes verified, pending, rejected, and completed year 2 work separately", () => {
    expect(
      summarizeActivityYear(
        activityTranscriptRequirements,
        activityTranscriptEntries,
        2,
      ),
    ).toEqual({
      verifiedEntries: 5,
      pendingEntries: 4,
      rejectedEntries: 1,
      completedRequirements: 1,
      totalRequirements: 5,
    });
  });

  it("combines year, category, status, and text filters", () => {
    const results = filterActivityEntries(activityTranscriptEntries, 2, {
      category: "case_presentation",
      status: "verified",
      query: "ความเสี่ยงเลือดออก",
    });

    expect(results.map((entry) => entry.id)).toEqual(["activity-y2-case-02"]);
    expect(
      filterActivityEntries(activityTranscriptEntries, 1, {
        category: "case_presentation",
        status: "verified",
        query: "ความเสี่ยงเลือดออก",
      }),
    ).toEqual([]);
  });

  it("searches English text case-insensitively and sorts newest activities first", () => {
    const queryResults = filterActivityEntries(activityTranscriptEntries, 2, {
      category: "all",
      status: "all",
      query: "auc",
    });
    expect(queryResults.map((entry) => entry.id)).toEqual([
      "activity-y2-journal-03",
    ]);

    const pendingResults = filterActivityEntries(activityTranscriptEntries, 2, {
      category: "all",
      status: "pending",
      query: "",
    });
    expect(pendingResults.map((entry) => entry.id)).toEqual([
      "activity-y2-journal-03",
      "activity-y2-publication-01",
      "activity-y2-teaching-01",
    ]);
    expect(
      pendingResults.every((entry) => entry.verification.status === "pending"),
    ).toBe(true);
  });
});
