import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FinancePage from "./page";

const db = vi.hoisted(() => ({
  registrationInvoices: [{
    id: "INV-EXISTING", registrationId: "REG-EXISTING", studentId: "student-test",
    description: "ใบแจ้งชำระเดิม", baseAmount: 5_000, status: "locked",
    createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
  }],
  payments: [], addPayment: vi.fn(),
}));
vi.mock("@/providers/mock-db-provider", () => ({ useMockDb: () => db }));
vi.mock("@/roles/shared/features/roles/use-portal-session", () => ({
  usePortalSession: () => ({ session: { role: "student", userId: "student-test", displayName: "ผู้เรียน" } }),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("interactive student finance", () => {
  it("opens PromptPay from the main payment table without a separate preview", () => {
    render(<FinancePage />);
    expect(screen.queryByRole("button", { name: "ดูตัวอย่าง PromptPay" })).toBeNull();
    const row = within(screen.getByText("ค่าลงทะเบียนรายวิชา").closest("tr")!);
    expect(row.getByText("รอชำระเงิน")).toBeTruthy();
    fireEvent.click(row.getByRole("button", { name: "ชำระเงิน" }));
    expect(screen.getByRole("dialog").textContent).toContain("ไม่สามารถใช้โอนเงินจริงได้");
    expect(screen.getByRole("button", { name: "ส่งหลักฐานการชำระเงิน" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "ปิดตัวอย่าง" })).toBeNull();
    expect(db.addPayment).not.toHaveBeenCalled();
  });

  it("requires evidence, then shows pending review and can restart repeatedly without database writes", async () => {
    const originalInvoices = structuredClone(db.registrationInvoices);
    render(<FinancePage />);
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = within(screen.getByText("ค่าลงทะเบียนรายวิชา").closest("tr")!);
      fireEvent.click(row.getByRole("button", { name: "ชำระเงิน" }));
      fireEvent.change(screen.getByLabelText("Reference No."), { target: { value: `REF-${attempt}` } });
      fireEvent.click(screen.getByRole("button", { name: "ส่งหลักฐานการชำระเงิน" }));
      expect(screen.getByRole("alert").textContent).toContain("กรุณาแนบหลักฐาน");
      fireEvent.change(screen.getByLabelText(/หลักฐานการชำระเงิน/, { selector: "input" }), {
        target: { files: [new File(["proof"], "proof.png", { type: "image/png" })] },
      });
      fireEvent.click(screen.getByRole("button", { name: "ส่งหลักฐานการชำระเงิน" }));
      await waitFor(() => expect(screen.getByRole("heading", { name: "ส่งหลักฐานการชำระเงินแล้ว" })).toBeTruthy());
      fireEvent.click(screen.getByRole("button", { name: "เสร็จสิ้น" }));
      expect(row.getByText("รอตรวจสอบการชำระเงิน")).toBeTruthy();
      expect(row.queryByText("ชำระแล้ว")).toBeNull();
      fireEvent.click(row.getByRole("button", { name: "เริ่มใหม่" }));
      expect(row.getByText("รอชำระเงิน")).toBeTruthy();
    }
    expect(db.addPayment).not.toHaveBeenCalled();
    expect(db.registrationInvoices).toEqual(originalInvoices);
    expect(screen.getByText("ยังชำระไม่ได้")).toBeTruthy();
  });
});
