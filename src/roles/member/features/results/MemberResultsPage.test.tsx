import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MemberResultsPage from "./MemberResultsPage";

const db = vi.hoisted(() => ({
  isLoaded: true,
  subjectResults: [
    {
      id: "result-2569",
      studentId: "student-demo",
      courseOfferingId: "offering-2569",
      status: "published",
      currentValue: "S",
    },
    {
      id: "result-2568",
      studentId: "student-demo",
      courseOfferingId: "offering-2568",
      status: "revised",
      currentValue: "U",
    },
    {
      id: "result-2572",
      studentId: "student-demo",
      courseOfferingId: "offering-2572",
      status: "published",
      currentValue: "S",
    },
  ],
  courseOfferings: [
    {
      id: "offering-2569",
      courseCode: "วภท-301",
      collegeCode: "วภท.",
      courseTitle: "เภสัชบำบัดเฉพาะทาง",
      credits: 12,
      term: "1/2569",
    },
    {
      id: "offering-2568",
      courseCode: "วภท-201",
      collegeCode: "วภท.",
      courseTitle: "เภสัชบำบัดพื้นฐาน",
      credits: 8,
      term: "2/2568",
    },
    {
      id: "offering-2572",
      courseCode: "วภท-401",
      collegeCode: "วภท.",
      courseTitle: "การวิจัยทางเภสัชบำบัด",
      credits: 6,
      term: "1/2572",
    },
  ],
}));

vi.mock("@/providers/mock-db-provider", () => ({ useMockDb: () => db }));
vi.mock("@/roles/shared/features/roles/use-portal-session", () => ({
  usePortalSession: () => ({
    isReady: true,
    session: { role: "student", userId: "student-demo" },
  }),
}));

afterEach(cleanup);

describe("MemberResultsPage", () => {
  it("shows all results by default and offers only all or yearly view modes", () => {
    render(<MemberResultsPage />);

    expect(screen.getByRole("button", { name: "ทั้งหมด" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "รายปี" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "ภาคต้น" })).toBeNull();
    expect(screen.queryByRole("button", { name: "ภาคปลาย" })).toBeNull();
    expect(screen.getByText("ปีการศึกษา 2572")).toBeTruthy();
    expect(screen.getByText("ปีการศึกษา 2569")).toBeTruthy();
    expect(screen.getByText("ปีการศึกษา 2568")).toBeTruthy();
  });

  it("limits results to the selected year in yearly mode", () => {
    render(<MemberResultsPage />);

    fireEvent.click(screen.getByRole("button", { name: "รายปี" }));
    fireEvent.click(screen.getByRole("button", { name: "2568" }));

    expect(screen.getByText("ปีการศึกษา 2568")).toBeTruthy();
    expect(screen.queryByText("ปีการศึกษา 2569")).toBeNull();
    expect(screen.getByText("เภสัชบำบัดพื้นฐาน")).toBeTruthy();
    expect(screen.queryByText("เภสัชบำบัดเฉพาะทาง")).toBeNull();
    expect(screen.queryByText("การวิจัยทางเภสัชบำบัด")).toBeNull();
  });

  it("derives yearly filter options from the member's published result data", () => {
    render(<MemberResultsPage />);

    fireEvent.click(screen.getByRole("button", { name: "รายปี" }));

    expect(screen.getByRole("button", { name: "2572" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2569" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2568" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "2567" })).toBeNull();
    expect(screen.getByText("ปีการศึกษา 2572")).toBeTruthy();
    expect(screen.queryByText("ปีการศึกษา 2569")).toBeNull();
  });
});
