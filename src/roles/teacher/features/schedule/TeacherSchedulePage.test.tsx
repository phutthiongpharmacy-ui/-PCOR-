import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_COURSE_OFFERINGS,
  DEFAULT_TEACHER_AFFILIATIONS,
  DEFAULT_TEACHING_ASSIGNMENTS,
} from "@/roles/shared/features/academic";
import { ORGANISATIONS } from "@/roles/shared/features/roles/access-model";
import TeacherSchedulePage from "./TeacherSchedulePage";

const useMockDb = vi.hoisted(() => vi.fn());
const usePortalSession = vi.hoisted(() => vi.fn());

vi.mock("@/providers/mock-db-provider", () => ({ useMockDb }));
vi.mock("@/roles/shared/features/roles/use-portal-session", () => ({ usePortalSession }));

const teacherSession = {
  role: "teacher" as const,
  userId: "teacher-001",
  displayName: "อ. ภก. กิตติพงศ์ วัฒนเภสัช",
  organisation: ORGANISATIONS.siriraj,
  resourceScopes: ["course:assigned"],
};

function loadedDb(overrides: Record<string, unknown> = {}) {
  return {
    isLoaded: true,
    courseOfferings: DEFAULT_COURSE_OFFERINGS,
    teachingAssignments: DEFAULT_TEACHING_ASSIGNMENTS,
    teacherAffiliations: DEFAULT_TEACHER_AFFILIATIONS,
    ...overrides,
  };
}

describe("TeacherSchedulePage", () => {
  beforeEach(() => {
    useMockDb.mockReturnValue(loadedDb());
    usePortalSession.mockReturnValue({ session: teacherSession, isReady: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows only the signed-in Teacher's accepted teaching schedule", () => {
    render(<TeacherSchedulePage today={new Date("2026-09-21T03:00:00.000Z")} />);

    expect(screen.getByRole("heading", { level: 2, name: "ตารางสอน" })).toBeTruthy();
    expect(screen.getByText("วภท-301")).toBeTruthy();
    expect(screen.getByText("วภช-201")).toBeTruthy();
    expect(screen.queryByText("BCP-101")).toBeNull();
    expect(screen.queryByText("BCP-220")).toBeNull();
    expect(screen.queryByText("วภท-302")).toBeNull();
    expect(screen.queryByText("รายวิชาที่ยังไม่กำหนดเวลา")).toBeNull();

    const schedule = screen.getByRole("region", { name: "ตารางสอนประจำสัปดาห์" });
    expect(within(schedule).getAllByRole("link")).toHaveLength(2);
    expect(within(schedule).getByRole("link", { name: /วภช-201.*18:00–21:00/ })).toBeTruthy();
  });

  it("filters the timetable by academic term", () => {
    const offerings = DEFAULT_COURSE_OFFERINGS.map((offering) => (
      offering.id === "offering-vpt-301" ? { ...offering, term: "2/2569" } : offering
    ));
    useMockDb.mockReturnValue(loadedDb({ courseOfferings: offerings }));
    render(<TeacherSchedulePage today={new Date("2026-09-21T03:00:00.000Z")} />);

    fireEvent.change(screen.getByLabelText("กรองตามภาคการศึกษา"), {
      target: { value: "2/2569" },
    });

    expect(screen.getByText("วภท-301")).toBeTruthy();
    expect(screen.queryByText("วภช-201")).toBeNull();
    expect(screen.queryByText("BCP-101")).toBeNull();
    expect(screen.getByText(/1 คาบ · 1 รายวิชา/)).toBeTruthy();
  });

  it("shows loading and empty states clearly", () => {
    useMockDb.mockReturnValue(loadedDb({ isLoaded: false }));
    const { rerender } = render(
      <TeacherSchedulePage today={new Date("2026-09-21T03:00:00.000Z")} />,
    );
    expect(screen.getByRole("status").textContent).toContain("กำลังโหลดตารางสอน");

    useMockDb.mockReturnValue(loadedDb({ teachingAssignments: [] }));
    rerender(<TeacherSchedulePage today={new Date("2026-09-21T03:00:00.000Z")} />);
    expect(screen.getByText("ไม่พบคาบสอนในภาคการศึกษานี้")).toBeTruthy();
  });
});
