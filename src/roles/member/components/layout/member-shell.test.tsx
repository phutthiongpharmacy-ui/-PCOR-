import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PORTAL_SESSION_KEY, resolvePortalLogin, savePortalSession } from "@/roles/shared/features/roles/mock-login";
import TopNav, { resolveMemberNavigationTitle } from "@/roles/shared/components/layout/TopNav";
import Sidebar from "./Sidebar";

const push = vi.fn();
let pathname = "/member/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

describe("member shell", () => {
  beforeEach(() => {
    push.mockReset();
    pathname = "/member/dashboard";
    window.localStorage.clear();
    savePortalSession(resolvePortalLogin("ภ.12345", "2222").session);
  });

  afterEach(cleanup);

  it("shows a compact member page title without breadcrumbs or role disclosure", async () => {
    render(<TopNav />);

    expect(screen.queryByPlaceholderText("ค้นหา...")).toBeNull();
    expect(screen.queryByText(/Student|ผู้เข้ารับการฝึกอบรม|บทบาท/)).toBeNull();
    const topBar = screen.getByRole("banner");
    expect(within(topBar).getByRole("heading", { level: 1, name: "ภาพรวม" }).className).toContain("font-semibold");
    expect(within(topBar).queryByRole("link", { name: "หน้าหลัก" })).toBeNull();
    expect(topBar.className).toContain("bg-card");
    expect(topBar.className).not.toContain("glass-panel");
    expect(topBar.className).toContain("left-14");
    expect(topBar.className).toContain("width-before-scroll-bar");
    expect(topBar.className).toContain("h-14");
    expect(topBar.className).toContain("justify-between");
    expect(topBar.className).toContain("px-4");
    expect(within(topBar).getByRole("group", { name: "การทำงานของผู้ใช้" }).className).toContain("shrink-0");

    fireEvent.click(screen.getByRole("button", { name: "ศูนย์ช่วยเหลือ" }));
    expect(push).toHaveBeenCalledWith("/member/help");

    const notificationButton = screen.getByRole("button", { name: /การแจ้งเตือน/ });
    const helpButton = screen.getByRole("button", { name: "ศูนย์ช่วยเหลือ" });
    const accountButton = screen.getByRole("button", { name: /เมนูบัญชีผู้ใช้ของ/ });
    for (const control of [notificationButton, helpButton, accountButton]) {
      expect(control.className).toContain("h-11");
      expect(control.className).not.toContain("sm:h-10");
      expect(control.className).not.toContain("sm:w-10");
    }

    fireEvent.pointerDown(accountButton, { button: 0, ctrlKey: false });
    for (const menuItem of await screen.findAllByRole("menuitem")) {
      expect(menuItem.className).toContain("min-h-11");
    }
    fireEvent.click(await screen.findByRole("menuitem", { name: /Pharmacist Profile/ }));
    expect(push).toHaveBeenCalledWith("/member/passport");

    fireEvent.pointerDown(screen.getByRole("button", { name: /เมนูบัญชีผู้ใช้ของ/ }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("menuitem", { name: /การตั้งค่าบัญชี/ }));
    expect(push).toHaveBeenCalledWith("/member/settings");

    fireEvent.pointerDown(screen.getByRole("button", { name: /เมนูบัญชีผู้ใช้ของ/ }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole("menuitem", { name: /ออกจากระบบ/ }));
    await waitFor(() => expect(window.localStorage.getItem(PORTAL_SESSION_KEY)).toBeNull());
    expect(push).toHaveBeenCalledWith("/");
  });

  it.each([
    ["/member/dashboard", "ภาพรวม"],
    ["/member/students", "Pharmacist Profile"],
    ["/member/schedule", "ตารางกิจกรรมการฝึกอบรม"],
    ["/member/registration", "สถานะการลงทะเบียน"],
    ["/member/registration/courses", "ลงทะเบียนเรียน"],
    ["/member/results", "ผลการประเมินรายวิชา"],
    ["/member/activity-transcript", "Activity Transcript"],
    ["/member/finance", "การชำระเงิน"],
    ["/member/finance/channels", "ช่องทางการชำระเงิน"],
    ["/member/requests", "คำร้องของฉัน"],
    ["/member/research", "ค้นหางานวิจัยและบทความวิชาการ"],
    ["/member/admission", "ระบบสมัครสอบหนังสืออนุมัติ / วุฒิบัตร"],
    ["/member/passport", "Pharmacist Profile"],
    ["/member/cpd", "ระบบสะสมหน่วยกิตการศึกษาต่อเนื่อง (CPD)"],
    ["/member/pathway", "เส้นทางการศึกษา (Learning Pathway)"],
    ["/member/news", "ข่าวสารและประกาศ"],
    ["/member/notifications", "การแจ้งเตือน"],
    ["/member/help", "ศูนย์ช่วยเหลือ"],
    ["/member/settings", "การตั้งค่า"],
    ["/member/programs", "หลักสูตรและรายวิชา"],
    ["/member/programs/by-college", "รายการแยกตามวิทยาลัย"],
    ["/member/programs/all", "รายวิชาและหลักสูตรระยะสั้น"],
  ])("maps %s to its member navigation title", (route, title) => {
    expect(resolveMemberNavigationTitle(route)).toBe(title);
  });

  it("uses the closest member context for dynamic routes and a neutral fallback", () => {
    expect(resolveMemberNavigationTitle("/member/requests/REQ-2569-001")).toBe("คำร้องของฉัน");
    expect(resolveMemberNavigationTitle("/member/programs/all/course-001/")).toBe("รายวิชาและหลักสูตรระยะสั้น");
    expect(resolveMemberNavigationTitle("/member/future-feature")).toBe("พื้นที่สมาชิก");
  });

  it("preserves the existing admin breadcrumb on an opaque top bar", () => {
    pathname = "/admin/dashboard";
    render(<TopNav />);

    const topBar = screen.getByRole("banner");
    expect(topBar.className).toContain("bg-card");
    expect(topBar.className).not.toContain("glass-panel");
    expect(within(topBar).getByRole("link", { name: "แอดมิน" })).toBeTruthy();
    expect(within(topBar).getByText("ภาพรวม")).toBeTruthy();
    for (const control of [
      within(topBar).getByRole("button", { name: /การแจ้งเตือน/ }),
      within(topBar).getByRole("button", { name: "ศูนย์ช่วยเหลือ" }),
      within(topBar).getByRole("button", { name: /เมนูบัญชีผู้ใช้ของ/ }),
    ]) {
      expect(control.className).toContain("h-11");
      expect(control.className).not.toContain("sm:h-10");
      expect(control.className).not.toContain("sm:w-10");
    }
  });

  it("keeps notification actions at least 44px tall", async () => {
    render(<TopNav />);

    fireEvent.pointerDown(screen.getByRole("button", { name: /การแจ้งเตือน/ }), { button: 0, ctrlKey: false });
    expect((await screen.findByRole("menuitem", { name: "ดูการแจ้งเตือนทั้งหมด" })).className)
      .toContain("min-h-11");
    expect(screen.getByRole("menuitem", { name: "ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว" }).className)
      .toContain("min-h-11");
  });

  it("keeps the sidebar focused on navigation and closes the mobile menu after navigation", async () => {
    render(<Sidebar />);

    expect(screen.queryByRole("link", { name: /ข้อมูลของฉัน/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /สมัครสอบ/ })).toBeNull();
    const schedule = screen.getAllByRole("link", { name: /ตารางเรียน/ })[0];
    const results = screen.getAllByRole("link", { name: /ผลการเรียน/ })[0];
    const activityTranscript = screen.getAllByRole("link", { name: /Activity Transcript/ })[0];
    const pathway = screen.getAllByRole("link", { name: /เส้นทางการเรียน/ })[0];
    expect(schedule.nextElementSibling).toBe(results);
    expect(results.nextElementSibling).toBe(activityTranscript);
    expect(activityTranscript.nextElementSibling).toBe(pathway);
    expect(screen.queryByText(/ผู้เข้ารับการฝึกอบรม|Student|บทบาท/)).toBeNull();
    expect(screen.queryByRole("button", { name: "ออกจากระบบ" })).toBeNull();
    const memberNavigations = screen.getAllByRole("navigation", { name: "เมนูสมาชิก" });
    expect(memberNavigations).toHaveLength(1);
    expect(memberNavigations[0].closest("aside")?.className).toContain("bg-sidebar");
    expect(memberNavigations[0].querySelector("a")?.className).toContain("text-sm");

    fireEvent.click(screen.getByRole("button", { name: "เปิดเมนูหลัก" }));
    const mobileMenu = await screen.findByRole("dialog");
    expect(mobileMenu.className).toContain("bg-sidebar");
    expect(within(mobileMenu).getByRole("navigation", { name: "เมนูสมาชิก" })).toBeTruthy();
    expect(within(mobileMenu).getByRole("button", { name: "ปิดเมนูหลัก" }).className).toContain("h-11");
    expect(within(mobileMenu).getByText("PCOR")).toBeTruthy();
    expect(within(mobileMenu).getByText("Pharmacy College Online Registry")).toBeTruthy();
    const dashboardLink = within(mobileMenu).getByRole("link", { name: /Pharmacy College Online Registry/ });
    dashboardLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(dashboardLink);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
