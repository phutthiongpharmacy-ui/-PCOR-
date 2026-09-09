import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CourseRegistrationPage from "./page";

const db = vi.hoisted(() => ({
  isLoaded: true,
  settings: { registrationOpen: true },
  registrations: [1, 2, 3].map((id) => ({
    id: `registration-${id}`, studentId: "student-demo", courseOfferingId: `offering-${id}`,
    courseId: `course-${id}`, courseCode: `TEST-${id}`, credits: 4, status: "enrolled",
  })),
  academicInstitutions: [], courseOfferings: [],
  submitRegistrations: vi.fn(), resubmitRegistration: vi.fn(), requestRegistrationDrop: vi.fn(),
}));

vi.mock("@/providers/mock-db-provider", () => ({ useMockDb: () => db }));
vi.mock("@/roles/shared/features/roles/use-portal-session", () => ({
  usePortalSession: () => ({ session: { role: "student", userId: "student-demo" } }),
}));
vi.mock("@/roles/shared/features/registration/registration-window", () => ({
  getRegistrationWindowStatus: () => ({ canRegister: true, tone: "success", label: "เปิดลงทะเบียน", detail: "ทดสอบ" }),
}));
vi.mock("@/roles/shared/features/license-eligibility", () => ({
  findLicenseRegistryRecord: () => ({ status: "active" }),
  getLicenseEligibility: () => ({ canRegisterCourses: true }),
}));
vi.mock("@/roles/member/features/registration/open-registration-catalog", () => ({
  buildOpenRegistrationCourses: () => [1, 2, 3, 4, 5].map((id) => ({
    definition: { id: `course-${id}`, code: `TEST-${id}`, collegeCode: "CPHC", titleTh: `วิชาทดสอบ ${id}`, credits: 4, capacity: 10, enrolled: id === 5 ? 10 : 0 },
    offering: { id: `offering-${id}`, institutionId: "institution-test", term: "1/2569" },
    universityName: "สถาบันทดสอบ", institutionName: "สถาบันทดสอบ", academicYear: "2569", term: "1", schedule: "วันเสาร์", room: "101",
  })),
  filterOpenRegistrationCourses: (courses: unknown[]) => courses,
  openRegistrationFilterOptions: () => ({ universities: [], academicYears: [], terms: [] }),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function courseCard(number: number) {
  return within(screen.getByRole("heading", { name: `วิชาทดสอบ ${number}` }).closest("article")!);
}

describe("repeatable course registration interactions", () => {
  it("can select, confirm, remove and reselect repeatedly without writing registrations", () => {
    render(<CourseRegistrationPage />);
    expect(screen.queryByRole("button", { name: /โหมดสาธิต/ })).toBeNull();

    for (let attempt = 0; attempt < 3; attempt++) {
      const backgroundCardBefore = screen.getByRole("heading", { name: "วิชาทดสอบ 1" }).closest("article")!;
      const backgroundContentBefore = backgroundCardBefore.textContent;
      fireEvent.click(courseCard(1).getByRole("button", { name: "เลือกวิชา" }));
      expect(screen.getByRole("dialog").textContent).toContain("ยืนยันการลงทะเบียน");
      const card = screen.getByRole("heading", { name: "วิชาทดสอบ 1", hidden: true }).closest("article")!;
      expect(card.textContent).toBe(backgroundContentBefore);
      expect(within(card).getByText("ว่าง", { exact: true })).toBeTruthy();
      expect(within(card).queryByText("รอยืนยัน")).toBeNull();
      expect(within(card).queryByText("ลงทะเบียนแล้ว")).toBeNull();
      expect(within(card).queryByRole("button", { name: "ถอนวิชา", hidden: true })).toBeNull();
      expect(within(card).getByRole("button", { name: "เลือกวิชา", hidden: true })).toBeTruthy();
      const overlay = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
      expect(overlay?.className).toContain("bg-scrim-soft");
      expect(overlay?.className).toContain("supports-backdrop-filter:backdrop-blur-sm");
      expect(screen.queryByText("ตรวจสอบรายการที่เลือก", { exact: true })).toBeNull();
      expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
      expect(screen.getByRole("dialog").textContent).not.toContain("fact_check");
      fireEvent.click(screen.getByRole("button", { name: "ยืนยันการลงทะเบียน" }));
      expect(courseCard(1).getByText("ลงทะเบียนแล้ว")).toBeTruthy();
      expect(screen.queryByText("ตรวจสอบรายการที่เลือก")).toBeNull();
      fireEvent.click(courseCard(1).getByRole("button", { name: "ถอนวิชา" }));
      expect(courseCard(1).queryByText("ลงทะเบียนแล้ว")).toBeNull();
      expect(courseCard(1).getByRole("button", { name: "เลือกวิชา" }).hasAttribute("disabled")).toBe(false);
    }

    expect(db.submitRegistrations).not.toHaveBeenCalled();
    expect(db.requestRegistrationDrop).not.toHaveBeenCalled();
    expect(db.resubmitRegistration).not.toHaveBeenCalled();
  });

  it("allows choosing more than three courses and removing them from the main list", () => {
    render(<CourseRegistrationPage />);
    for (const number of [1, 2, 3, 4, 5]) {
      fireEvent.click(courseCard(number).getByRole("button", { name: "เลือกวิชา" }));
      fireEvent.click(screen.getByRole("button", { name: "ยืนยันการลงทะเบียน" }));
    }
    expect(screen.getAllByText("ลงทะเบียนแล้ว")).toHaveLength(5);
    for (const number of [1, 2, 3, 4, 5]) {
      fireEvent.click(courseCard(number).getByRole("button", { name: "ถอนวิชา" }));
    }
    expect(screen.queryByText("ตรวจสอบรายการที่เลือก")).toBeNull();
    expect(screen.getAllByRole("button", { name: "เลือกวิชา" })).toHaveLength(5);
    expect(db.submitRegistrations).not.toHaveBeenCalled();
  });

  it("discards cancelled selections without affecting confirmed courses", () => {
    render(<CourseRegistrationPage />);
    const firstCourseButton = courseCard(1).getByRole("button", { name: "เลือกวิชา" });
    fireEvent.click(firstCourseButton);
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(document.activeElement).toBe(firstCourseButton);
    expect(courseCard(1).queryByText("รอยืนยัน")).toBeNull();
    expect(courseCard(1).queryByText("ลงทะเบียนแล้ว")).toBeNull();
    expect(courseCard(1).queryByRole("button", { name: "ถอนวิชา" })).toBeNull();
    expect(screen.queryByText("ตรวจสอบรายการที่เลือก")).toBeNull();
    fireEvent.click(courseCard(1).getByRole("button", { name: "เลือกวิชา" }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการลงทะเบียน" }));
    expect(courseCard(1).getByText("ลงทะเบียนแล้ว")).toBeTruthy();

    fireEvent.click(courseCard(2).getByRole("button", { name: "เลือกวิชา" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("วิชาทดสอบ 2")).toBeTruthy();
    expect(dialog.queryByText("วิชาทดสอบ 1")).toBeNull();
    fireEvent.click(dialog.getByRole("button", { name: "ยกเลิก" }));
    expect(courseCard(1).getByText("ลงทะเบียนแล้ว")).toBeTruthy();
    expect(courseCard(2).getByRole("button", { name: "เลือกวิชา" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "เอาออก" })).toBeNull();
  });

  it("discards unconfirmed selections on Escape and allows selecting again", () => {
    render(<CourseRegistrationPage />);
    for (let attempt = 0; attempt < 3; attempt++) {
      const selectButton = courseCard(1).getByRole("button", { name: "เลือกวิชา" });
      fireEvent.click(selectButton);
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(selectButton);
      expect(courseCard(1).queryByRole("button", { name: "ถอนวิชา" })).toBeNull();
      expect(courseCard(1).queryByText("ลงทะเบียนแล้ว")).toBeNull();
      expect(screen.queryByText("ตรวจสอบรายการที่เลือก")).toBeNull();
    }
    expect(db.submitRegistrations).not.toHaveBeenCalled();
  });

  it("starts fresh on remount without changing existing registrations", () => {
    const originalRegistrations = structuredClone(db.registrations);
    const page = render(<CourseRegistrationPage />);
    fireEvent.click(courseCard(4).getByRole("button", { name: "เลือกวิชา" }));
    expect(screen.getByRole("dialog").textContent).toContain("ไม่มีการส่งคำขอจริง");
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการลงทะเบียน" }));
    page.unmount();
    render(<CourseRegistrationPage />);
    expect(screen.queryByText("ตรวจสอบรายการที่เลือก")).toBeNull();
    expect(courseCard(4).getByRole("button", { name: "เลือกวิชา" }).hasAttribute("disabled")).toBe(false);
    expect(db.registrations).toEqual(originalRegistrations);
    expect(db.submitRegistrations).not.toHaveBeenCalled();
    expect(db.requestRegistrationDrop).not.toHaveBeenCalled();
  });
});
