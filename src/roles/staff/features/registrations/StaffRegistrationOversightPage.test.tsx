import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import StaffRegistrationOversightPage from "./StaffRegistrationOversightPage";

const db = vi.hoisted(() => ({
  registrations: [
    {
      id: "REG-MEMBER-001",
      studentId: "RPC-2569-001",
      studentName: "ภญ. คารินา วัฒนกุล",
      courseId: "วภท-301",
      courseCode: "วภท-301",
      courseTitle: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง (สอบข้อเขียน)",
      credits: 12,
      term: "1/2569",
      status: "enrolled",
      submittedAt: "2026-06-14T03:00:00.000Z",
      updatedAt: "2026-06-16T03:00:00.000Z",
      history: [],
    },
    {
      id: "REG-001",
      studentId: "RPC-2569-002",
      studentName: "ภก. สมชาย ใจดี",
      courseId: "BCP-101",
      courseCode: "BCP-101",
      courseTitle: "เภสัชบำบัดพื้นฐาน",
      credits: 3,
      term: "1/2569",
      status: "submitted",
      submittedAt: "2026-06-24T03:00:00.000Z",
      updatedAt: "2026-06-24T03:00:00.000Z",
      history: [],
    },
  ],
  registrationInvoices: [
    {
      id: "INV-REG-MEMBER-001",
      registrationId: "REG-MEMBER-001",
      studentId: "RPC-2569-001",
      description: "ค่าลงทะเบียน วภท-301 องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง (สอบข้อเขียน)",
      baseAmount: 12_000,
      status: "paid",
      createdAt: "2026-06-14T03:00:00.000Z",
      updatedAt: "2026-06-16T03:00:00.000Z",
      paidAt: "2026-06-16T03:00:00.000Z",
    },
    {
      id: "INV-REG-001",
      registrationId: "REG-001",
      studentId: "RPC-2569-002",
      description: "ค่าลงทะเบียน BCP-101 เภสัชบำบัดพื้นฐาน",
      baseAmount: 3_000,
      status: "locked",
      createdAt: "2026-06-24T03:00:00.000Z",
      updatedAt: "2026-06-24T03:00:00.000Z",
    },
  ],
  payments: [],
  auditEvents: [],
  subjectResults: [],
  academicStudents: [],
  courseOfferings: [],
  academicTeachers: [],
  isLoaded: true,
}));

vi.mock("@/providers/mock-db-provider", () => ({ useMockDb: () => db }));
vi.mock("@/roles/shared/features/roles/use-portal-session", () => ({
  usePortalSession: () => ({
    isReady: true,
    session: {
      role: "royal_college_staff",
      organisation: { id: "org-royal-college" },
    },
  }),
}));
vi.mock("@/roles/shared/features/audit", () => ({
  useSensitiveViewAudit: () => ({ status: "logged", retry: vi.fn() }),
  SensitiveViewAuditBoundary: ({ children }: { children: ReactNode }) => children,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StaffRegistrationOversightPage payment proof", () => {
  it("opens the slip and keeps the viewed marker only for the current mount", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const page = render(<StaffRegistrationOversightPage />);

    expect(screen.getByText("พร้อมตรวจ")).toBeTruthy();
    expect(screen.getByText("ยังไม่มีสลิป")).toBeTruthy();
    setItem.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "ตรวจสอบสลิป REG-MEMBER-001" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("ตรวจสอบสลิปการชำระเงิน")).toBeTruthy();
    expect(dialog.getAllByText(/12,000/).length).toBeGreaterThan(0);
    expect(dialog.getAllByText("PP-25690616-120001").length).toBeGreaterThan(0);
    expect(screen.getByText("เปิดดูแล้ว")).toBeTruthy();
    expect(setItem).not.toHaveBeenCalled();

    fireEvent.click(dialog.getByRole("button", { name: "ปิด" }));
    page.unmount();
    render(<StaffRegistrationOversightPage />);

    expect(screen.getByText("พร้อมตรวจ")).toBeTruthy();
    expect(screen.queryByText("เปิดดูแล้ว")).toBeNull();
  });
});
