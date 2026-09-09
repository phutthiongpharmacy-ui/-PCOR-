import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PresidentSidebar from "./PresidentSidebar";
import PresidentTopBar from "./PresidentTopBar";
import { PORTAL_SESSION_KEY } from "@/roles/shared/features/roles/mock-login";

let pathname = "/president/signatures/request-001";
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

vi.mock("@/roles/president/president-access", () => ({
  usePresidentAccess: () => ({
    assignment: {
      userName: "ภก. ธนกฤต ศรีวิชัย",
      organisationScope: {
        code: "วภท.",
        name: "วิทยาลัยเภสัชบำบัดแห่งประเทศไทย",
      },
    },
  }),
}));

describe("president shell", () => {
  beforeEach(() => {
    pathname = "/president/signatures/request-001";
    push.mockReset();
    window.localStorage.setItem(PORTAL_SESSION_KEY, "president-session");
  });

  afterEach(cleanup);

  it("uses an opaque top bar with the nested signature title", () => {
    render(<PresidentTopBar />);

    const topBar = screen.getByRole("banner");
    expect(topBar.className).toContain("bg-card");
    expect(topBar.className).toContain("width-before-scroll-bar");
    expect(topBar.className).toContain("h-14");
    expect(topBar.className).toContain("justify-between");
    expect(topBar.className).toContain("px-4");
    expect(topBar.className).not.toContain("glass-panel");
    expect(within(topBar).getByRole("heading", { level: 1, name: "ตรวจสอบและลงนามคำร้อง" })).toBeTruthy();
    expect(within(topBar).getByRole("button", { name: /เมนูบัญชีผู้ใช้ของ/ }).className).toContain("h-11");
  });

  it("provides an accessible mobile drawer that closes after navigation", async () => {
    render(<PresidentSidebar />);

    const desktopSidebar = document.querySelector("aside");
    expect(desktopSidebar?.className).toContain("bg-sidebar");
    expect(within(desktopSidebar as HTMLElement).queryByRole("button", { name: "ออกจากระบบ" })).toBeNull();
    expect(screen.getAllByRole("link", { name: /เอกสารรอลงนาม/ })[0].getAttribute("aria-current"))
      .toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "เปิดเมนู" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.className).toContain("w-72");
    expect(dialog.className).toContain("bg-sidebar");
    expect(within(dialog).getByRole("button", { name: "ปิดเมนู" }).className).toContain("h-11");
    expect(within(dialog).getByText("เมนูประธานและผู้ลงนาม")).toBeTruthy();

    const dashboardLink = within(dialog).getByRole("link", { name: /President Portal/ });
    dashboardLink.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(dashboardLink);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("moves logout into the top bar account menu", async () => {
    render(<PresidentTopBar />);

    fireEvent.pointerDown(
      within(screen.getByRole("banner")).getByRole("button", { name: /เมนูบัญชีผู้ใช้ของ/ }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: /ออกจากระบบ/ }));

    await waitFor(() => expect(window.localStorage.getItem(PORTAL_SESSION_KEY)).toBeNull());
    expect(push).toHaveBeenCalledWith("/");
  });
});
