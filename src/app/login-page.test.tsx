import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COLLEGE_OPTIONS } from "@/roles/shared/data/college-directory";
import { PORTAL_SESSION_KEY } from "@/roles/shared/features/roles/mock-login";
import LoginPage from "./page";

const ENTRY_PROFILE_STORAGE_KEY = "pcor:entry-profile:v1";
const OFFICIAL_COLLEGE_NAMES = [
  "วิทยาลัยเภสัชบำบัด",
  "วิทยาลัยการคุ้มครองผู้บริโภคด้านยาและสุขภาพ",
  "วิทยาลัยเภสัชกรรมสมุนไพร",
  "วิทยาลัยเภสัชกรรมอุตสาหการ",
  "วิทยาลัยเภสัชกรรมชุมชน",
  "วิทยาลัยการบริหารเภสัชกิจ",
  "วิทยาลัยเภสัชพันธุศาสตร์และเภสัชกรรมแม่นยำ",
];

const { push, toast } = vi.hoisted(() => ({
  push: vi.fn(),
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("@/roles/shared/features/roles/role-assignment-store", () => ({
  useRoleAssignmentStore: () => ({ assignments: [] }),
}));

function completeEntryProfile({
  collegeCode = "วภท.",
  firstName = "สมชาย",
  lastName = "ใจดี",
} = {}) {
  const dialog = screen.getByRole("dialog", { name: "ข้อมูลก่อนเข้าใช้งาน PCOR" });
  fireEvent.change(within(dialog).getByLabelText(/^วิทยาลัย/), { target: { value: collegeCode } });
  fireEvent.change(within(dialog).getByLabelText(/^ชื่อ/), { target: { value: firstName } });
  fireEvent.change(within(dialog).getByLabelText(/^นามสกุล/), { target: { value: lastName } });
  fireEvent.submit(within(dialog).getByRole("button", { name: /ดำเนินการต่อ/ }).closest("form")!);
}

describe("member login page", () => {
  beforeEach(() => {
    push.mockReset();
    toast.loading.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
  });

  it("blocks the login page until the visitor selects one of the seven colleges", () => {
    render(<LoginPage />);

    const dialog = screen.getByRole("dialog", { name: "ข้อมูลก่อนเข้าใช้งาน PCOR" });
    const collegeSelect = within(dialog).getByLabelText(/^วิทยาลัย/) as HTMLSelectElement;
    const collegeLabels = Array.from(collegeSelect.options)
      .filter((option) => option.value)
      .map((option) => option.text);

    expect(collegeSelect.value).toBe("");
    expect(COLLEGE_OPTIONS.map((college) => college.name)).toEqual(OFFICIAL_COLLEGE_NAMES);
    expect(collegeLabels).toEqual(OFFICIAL_COLLEGE_NAMES);
    expect(collegeLabels).toHaveLength(7);
    expect(screen.queryByRole("button", { name: "เข้าสู่ระบบ" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /close|ปิด/i })).toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "ข้อมูลก่อนเข้าใช้งาน PCOR" })).toBeTruthy();
  });

  it("announces missing entry information and keeps the dialog open", () => {
    render(<LoginPage />);

    const dialog = screen.getByRole("dialog", { name: "ข้อมูลก่อนเข้าใช้งาน PCOR" });
    fireEvent.change(within(dialog).getByLabelText(/^ชื่อ/), { target: { value: "   " } });
    fireEvent.change(within(dialog).getByLabelText(/^นามสกุล/), { target: { value: "   " } });
    fireEvent.submit(within(dialog).getByRole("button", { name: /ดำเนินการต่อ/ }).closest("form")!);

    expect(within(dialog).getByRole("alert").textContent).toContain("กรุณาเลือกวิทยาลัย");
    expect(within(dialog).getByLabelText(/^วิทยาลัย/).getAttribute("aria-invalid")).toBe("true");
    expect(within(dialog).getByLabelText(/^ชื่อ/).getAttribute("aria-invalid")).toBe("true");
    expect(within(dialog).getByLabelText(/^นามสกุล/).getAttribute("aria-invalid")).toBe("true");
  });

  it("stores trimmed entry information for the current session and hands focus to login", async () => {
    render(<LoginPage />);

    completeEntryProfile({ firstName: "  สมชาย ", lastName: " ใจดี  " });

    expect(screen.queryByRole("dialog", { name: "ข้อมูลก่อนเข้าใช้งาน PCOR" })).toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem(ENTRY_PROFILE_STORAGE_KEY)!)).toMatchObject({
      collegeCode: "วภท.",
      firstName: "สมชาย",
      lastName: "ใจดี",
    });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("เลขที่ใบประกอบวิชาชีพ")));
  });

  it("does not ask for entry information again within the same browser session", async () => {
    window.sessionStorage.setItem(ENTRY_PROFILE_STORAGE_KEY, JSON.stringify({
      collegeCode: "วภท.",
      firstName: "สมชาย",
      lastName: "ใจดี",
      recordedAt: "2026-09-23T00:00:00.000Z",
    }));

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "ข้อมูลก่อนเข้าใช้งาน PCOR" })).toBeNull();
    });
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeTruthy();
  });

  it("rejects an unknown license without saving or navigating and recovers the form", () => {
    render(<LoginPage />);
    completeEntryProfile();

    fireEvent.change(screen.getByLabelText("เลขที่ใบประกอบวิชาชีพ"), { target: { value: "ภ.99999" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน", { selector: "input" }), { target: { value: "2222" } });
    fireEvent.submit(screen.getByRole("button", { name: "เข้าสู่ระบบ" }).closest("form")!);

    expect(screen.getByRole("alert").textContent).toContain("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
    expect(window.localStorage.getItem(PORTAL_SESSION_KEY)).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "เข้าสู่ระบบ" }) as HTMLButtonElement).disabled).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง", { id: "login" });
  });

  it("authenticates the known professional license and routes to the member home", () => {
    render(<LoginPage />);
    completeEntryProfile();

    fireEvent.change(screen.getByLabelText("เลขที่ใบประกอบวิชาชีพ"), { target: { value: "ภ.12345" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน", { selector: "input" }), { target: { value: "2222" } });
    fireEvent.submit(screen.getByRole("button", { name: "เข้าสู่ระบบ" }).closest("form")!);
    expect(JSON.parse(window.localStorage.getItem(PORTAL_SESSION_KEY)!)).toMatchObject({
      userId: "วภท-2568-001",
      role: "student",
    });
    expect(push).toHaveBeenCalledWith("/member/dashboard");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rejects a password other than the demo password", () => {
    render(<LoginPage />);
    completeEntryProfile();

    fireEvent.change(screen.getByLabelText("เลขที่ใบประกอบวิชาชีพ"), { target: { value: "student" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน", { selector: "input" }), { target: { value: "1111" } });
    fireEvent.submit(screen.getByRole("button", { name: "เข้าสู่ระบบ" }).closest("form")!);

    expect(window.localStorage.getItem(PORTAL_SESSION_KEY)).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
  });

  it("exposes public contact and terms links in the login footer", () => {
    render(<LoginPage />);
    completeEntryProfile();

    expect(screen.getByRole("navigation", { name: "ลิงก์ส่วนท้าย" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ติดต่อเรา" }).getAttribute("href")).toBe("/contact");
    expect(screen.getByRole("link", { name: "ข้อตกลงการใช้งาน" }).getAttribute("href")).toBe("/terms");
  });
});
