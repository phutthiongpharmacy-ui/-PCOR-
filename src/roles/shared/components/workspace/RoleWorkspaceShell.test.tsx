import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PORTAL_SESSION_KEY, resolvePortalLogin, savePortalSession } from "@/roles/shared/features/roles/mock-login";
import {
  RoleWorkspaceShell,
  groupWorkspaceNavigationItems,
  resolveWorkspaceNavigationTitle,
  type WorkspaceNavItem,
} from "./RoleWorkspaceShell";

const push = vi.fn();
let pathname = "/teacher/courses/offering-001";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

const navItems = [
  { href: "/teacher/dashboard", icon: "dashboard", label: "ภาพรวม" },
  { href: "/teacher/courses", icon: "menu_book", label: "รายวิชาที่ได้รับมอบหมาย" },
] as const satisfies readonly WorkspaceNavItem[];

describe("RoleWorkspaceShell", () => {
  beforeEach(() => {
    pathname = "/teacher/courses/offering-001";
    push.mockReset();
    window.localStorage.clear();
    savePortalSession(resolvePortalLogin("teacher", "2222").session);
  });

  afterEach(cleanup);

  it("resolves the closest navigation title for nested routes", () => {
    const nestedItems = [
      ...navItems,
      { href: "/teacher/courses/history", icon: "history", label: "ประวัติรายวิชา" },
    ];

    expect(resolveWorkspaceNavigationTitle("/teacher/courses/history/entry-1/", nestedItems, "พื้นที่อาจารย์"))
      .toBe("ประวัติรายวิชา");
    expect(resolveWorkspaceNavigationTitle("/teacher/unknown", nestedItems, "พื้นที่อาจารย์"))
      .toBe("พื้นที่อาจารย์");
  });

  it("keeps labelled navigation sections in their declared order", () => {
    const actionSection = { id: "actions", label: "งานที่ดำเนินการได้" };
    const readOnlySection = { id: "read-only", label: "ติดตามและตรวจสอบ (ดูอย่างเดียว)" };
    const groups = groupWorkspaceNavigationItems([
      navItems[0],
      { ...navItems[1], section: actionSection },
      { href: "/teacher/results", icon: "grading", label: "บันทึกผล", section: actionSection },
      { href: "/teacher/history", icon: "history", label: "ประวัติ", section: readOnlySection },
    ]);

    expect(groups.map((group) => ({
      section: group.section?.label,
      hrefs: group.items.map((item) => item.href),
    }))).toEqual([
      { section: undefined, hrefs: ["/teacher/dashboard"] },
      { section: "งานที่ดำเนินการได้", hrefs: ["/teacher/courses", "/teacher/results"] },
      { section: "ติดตามและตรวจสอบ (ดูอย่างเดียว)", hrefs: ["/teacher/history"] },
    ]);
  });

  it("uses opaque navigation surfaces and closes the mobile menu after navigation", async () => {
    render(
      <RoleWorkspaceShell area="teacher" role="teacher" navItems={navItems}>
        <p>เนื้อหา</p>
      </RoleWorkspaceShell>,
    );

    const topBar = screen.getByRole("banner");
    expect(topBar.className).toContain("bg-card");
    expect(topBar.className).toContain("width-before-scroll-bar");
    expect(topBar.className).toContain("h-14");
    expect(topBar.className).toContain("justify-between");
    expect(topBar.className).toContain("px-4");
    expect(topBar.className).not.toContain("glass-panel");
    expect(within(topBar).getByRole("heading", { level: 1, name: "รายวิชาที่ได้รับมอบหมาย" })).toBeTruthy();
    expect(within(topBar).getByRole("button", { name: /เมนูบัญชีผู้ใช้ของ/ }).className).toContain("h-11");

    const desktopSidebar = document.querySelector("aside");
    expect(desktopSidebar?.className).toContain("bg-sidebar");
    expect(desktopSidebar?.className).not.toContain("glass-panel-primary");
    expect(within(desktopSidebar as HTMLElement).queryByRole("button", { name: "ออกจากระบบ" })).toBeNull();
    expect(screen.getAllByRole("link", { name: /รายวิชาที่ได้รับมอบหมาย/ })[0].getAttribute("aria-current"))
      .toBe("page");

    const trigger = screen.getByRole("button", { name: "เปิดเมนู" });
    expect(trigger.className).toContain("h-11");
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog.className).toContain("w-72");
    expect(dialog.className).toContain("bg-sidebar");
    expect(within(dialog).getByRole("button", { name: "ปิดเมนู" }).className).toContain("h-11");
    expect(within(dialog).getByText("เมนูหลัก")).toBeTruthy();

    const dashboardLink = within(dialog).getByRole("link", { name: /ภาพรวม/ });
    dashboardLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(dashboardLink);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("moves account identity and logout into the top bar", async () => {
    render(
      <RoleWorkspaceShell area="teacher" role="teacher" navItems={navItems}>
        <p>เนื้อหา</p>
      </RoleWorkspaceShell>,
    );

    fireEvent.pointerDown(
      within(screen.getByRole("banner")).getByRole("button", { name: /เมนูบัญชีผู้ใช้ของ/ }),
      { button: 0, ctrlKey: false },
    );
    const logout = await screen.findByRole("menuitem", { name: /ออกจากระบบ/ });
    expect(logout.className).toContain("min-h-11");
    fireEvent.click(logout);

    await waitFor(() => expect(window.localStorage.getItem(PORTAL_SESSION_KEY)).toBeNull());
    expect(push).toHaveBeenCalledWith("/");
  });
});
