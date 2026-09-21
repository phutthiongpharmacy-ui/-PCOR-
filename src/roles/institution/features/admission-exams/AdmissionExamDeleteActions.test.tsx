import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MockDbProvider } from "@/providers/mock-db-provider";
import { ORGANISATIONS } from "@/roles/shared/features/roles/access-model";
import { PORTAL_SESSION_KEY } from "@/roles/shared/features/roles/mock-login";

import AdmissionExamResultsPage from "./AdmissionExamResultsPage";
import AdmissionExamRoundsPage from "./AdmissionExamRoundsPage";

const exampleRoundTitle = "การสอบคัดเลือกเข้าศึกษา รอบตัวอย่าง 2569";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({
    role: "institution_admin",
    displayName: "ภก. วิชาญ อัครเวช",
    signedInAt: "2026-09-21T01:00:00.000Z",
    userId: "institution-admin-001",
    organisation: ORGANISATIONS.siriraj,
    resourceScopes: ["institution:org-inst-siriraj"],
  }));
});

function renderWithDb(page: React.ReactNode) {
  return render(<MockDbProvider>{page}</MockDbProvider>);
}

describe("Institution admission exam delete actions", () => {
  it("confirms before deleting an exam round and restores focus when cancelled", async () => {
    renderWithDb(<AdmissionExamRoundsPage />);
    await screen.findByRole("heading", { level: 1, name: "เปิดสอบ" });

    const deleteButton = screen.getByRole("button", {
      name: `ลบรอบสอบ ${exampleRoundTitle}`,
    });
    fireEvent.click(deleteButton);

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: "ลบรอบสอบนี้หรือไม่" })).toBeTruthy();
    expect(within(dialog).getByText(/ผลสอบที่เชื่อมโยง 1 รายการ/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByText(exampleRoundTitle)).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(deleteButton));
  });

  it("deletes the selected round and linked results from the exam rounds page", async () => {
    renderWithDb(<AdmissionExamRoundsPage />);
    await screen.findByRole("heading", { level: 1, name: "เปิดสอบ" });

    fireEvent.click(screen.getByRole("button", {
      name: `ลบรอบสอบ ${exampleRoundTitle}`,
    }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "ยืนยันการลบ",
    }));

    await screen.findByText("ยังไม่มีรอบสอบ");
    expect(screen.queryByText(exampleRoundTitle)).toBeNull();
    const totalLabel = screen.getByText("รอบสอบทั้งหมด");
    const totalCard = totalLabel.closest<HTMLElement>('[data-slot="card"]');
    expect(totalCard).not.toBeNull();
    expect(within(totalCard!).getByText("0")).toBeTruthy();
  });

  it("deletes the selected round and all results from the results page", async () => {
    renderWithDb(<AdmissionExamResultsPage />);
    await screen.findByRole("heading", { level: 1, name: "ประกาศผลสอบ" });

    fireEvent.click(screen.getByRole("button", {
      name: `ลบรอบสอบและผลสอบ ${exampleRoundTitle}`,
    }));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("heading", {
      name: "ลบรอบสอบและผลสอบทั้งหมดหรือไม่",
    })).toBeTruthy();
    expect(within(dialog).getByText(/ผลสอบ 1 รายการ/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "ยืนยันการลบ" }));

    await screen.findByText("ยังไม่มีรอบสอบที่พร้อมบันทึกผล");
    expect(screen.queryByText(exampleRoundTitle)).toBeNull();
  });
});
