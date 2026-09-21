import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PORTAL_SESSION_KEY } from "@/roles/shared/features/roles/mock-login";
import LoginPage from "./page";

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

describe("member login page", () => {
  beforeEach(() => {
    push.mockReset();
    toast.loading.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
  });

  it("rejects an unknown license without saving or navigating and recovers the form", () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("เลขที่ใบประกอบวิชาชีพ"), { target: { value: "ภ.99999" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน", { selector: "input" }), { target: { value: "2323" } });
    fireEvent.submit(screen.getByRole("button", { name: "เข้าสู่ระบบ" }).closest("form")!);

    expect(screen.getByRole("alert").textContent).toContain("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง");
    expect(window.localStorage.getItem(PORTAL_SESSION_KEY)).toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "เข้าสู่ระบบ" }) as HTMLButtonElement).disabled).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง", { id: "login" });
  });

  it("authenticates the known professional license and routes to the member home", () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("เลขที่ใบประกอบวิชาชีพ"), { target: { value: "ภ.12345" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน", { selector: "input" }), { target: { value: "2323" } });
    fireEvent.submit(screen.getByRole("button", { name: "เข้าสู่ระบบ" }).closest("form")!);
    expect(JSON.parse(window.localStorage.getItem(PORTAL_SESSION_KEY)!)).toMatchObject({
      userId: "วภท-2568-001",
      role: "student",
    });
    expect(push).toHaveBeenCalledWith("/member/dashboard");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("accepts the alternate demo password", () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("เลขที่ใบประกอบวิชาชีพ"), { target: { value: "student" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน", { selector: "input" }), { target: { value: "2222" } });
    fireEvent.submit(screen.getByRole("button", { name: "เข้าสู่ระบบ" }).closest("form")!);

    expect(JSON.parse(window.localStorage.getItem(PORTAL_SESSION_KEY)!)).toMatchObject({
      userId: "วภท-2568-001",
      role: "student",
    });
    expect(push).toHaveBeenCalledWith("/member/dashboard");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("exposes public contact and terms links in the login footer", () => {
    render(<LoginPage />);

    expect(screen.getByRole("navigation", { name: "ลิงก์ส่วนท้าย" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ติดต่อเรา" }).getAttribute("href")).toBe("/contact");
    expect(screen.getByRole("link", { name: "ข้อตกลงการใช้งาน" }).getAttribute("href")).toBe("/terms");
  });
});
