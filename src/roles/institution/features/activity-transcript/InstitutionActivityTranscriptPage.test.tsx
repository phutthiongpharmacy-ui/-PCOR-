import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MockDbProvider } from "@/providers/mock-db-provider";
import { activityTranscriptEntries as defaultActivityEntries } from "@/roles/member/features/activity-transcript/activity-transcript-data";
import { ORGANISATIONS } from "@/roles/shared/features/roles/access-model";
import { PORTAL_SESSION_KEY } from "@/roles/shared/features/roles/mock-login";

import InstitutionActivityTranscriptPage from "./InstitutionActivityTranscriptPage";

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

function renderPage() {
  return render(
    <MockDbProvider>
      <InstitutionActivityTranscriptPage />
    </MockDbProvider>,
  );
}

describe("InstitutionActivityTranscriptPage", () => {
  it("records a verified check-in for the explicitly selected member", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Activity Transcript" });

    fireEvent.click(screen.getByRole("button", { name: "บันทึกกิจกรรม" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("ผู้เรียน *"), {
      target: { value: "RPC-2569-001" },
    });
    fireEvent.change(within(dialog).getByLabelText("แหล่งข้อมูล *"), {
      target: { value: "college_checkin" },
    });
    fireEvent.change(within(dialog).getByLabelText("ชื่อกิจกรรม *"), {
      target: { value: "กิจกรรม Check-in การดูแลผู้ป่วย" },
    });
    fireEvent.change(within(dialog).getByLabelText("วันที่ทำกิจกรรม *"), {
      target: { value: "2026-09-20" },
    });
    fireEvent.change(within(dialog).getByLabelText("บทบาทของผู้เรียน *"), {
      target: { value: "ผู้เข้าร่วม" },
    });
    fireEvent.change(within(dialog).getByLabelText("หน่วยงาน / สถานที่ *"), {
      target: { value: "สถาบันฝึกอบรมโรงพยาบาลศิริราช" },
    });
    fireEvent.change(within(dialog).getByLabelText("รายละเอียด *"), {
      target: { value: "เข้าร่วมกิจกรรมและลงชื่อ Check-in ครบถ้วน" },
    });
    fireEvent.change(within(dialog).getByLabelText("แนบหลักฐาน *"), {
      target: { files: [new File(["proof"], "check-in.pdf", { type: "application/pdf" })] },
    });
    fireEvent.submit(dialog.querySelector("form")!);

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("กิจกรรม Check-in การดูแลผู้ป่วย")).toBeTruthy();
    expect(screen.getByText("ภญ. คารินา วัฒนกุล")).toBeTruthy();
    expect(screen.getByText("Check-in ของสถาบัน")).toBeTruthy();
    expect(screen.getAllByText("ยืนยันแล้ว").length).toBeGreaterThan(0);
  });

  it("shows only learners and activity records owned by the signed-in institution", async () => {
    window.localStorage.setItem("mock_activity_transcript_entries", JSON.stringify([{
      ...defaultActivityEntries[0],
      id: "activity-cross-institution",
      memberId: "RPC-2569-003",
      organisationId: ORGANISATIONS.chula.id,
      title: "รายการข้ามสถาบันที่ต้องไม่แสดง",
    }]));

    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Activity Transcript" });

    const studentFilter = screen.getByLabelText("ผู้เรียน");
    expect(within(studentFilter).queryByRole("option", { name: /ภก\. นที พิพัฒน์/ })).toBeNull();
    expect(screen.queryByText("รายการข้ามสถาบันที่ต้องไม่แสดง")).toBeNull();
    expect(screen.getByText(`พบ ${defaultActivityEntries.length} รายการ`)).toBeTruthy();
  });

  it("rejects the former Officer role even when the component is rendered directly", async () => {
    window.localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({
      role: "royal_college_staff",
      displayName: "ภญ. ปาริชาติ สุขเกษม",
      signedInAt: "2026-09-21T01:00:00.000Z",
      userId: "staff-001",
      organisation: ORGANISATIONS.royalCollege,
      resourceScopes: ["staff:central"],
    }));

    renderPage();
    expect((await screen.findByRole("alert")).textContent).toContain("ต้องใช้บัญชีผู้ดูแลสถาบัน");
    expect(screen.queryByRole("button", { name: "บันทึกกิจกรรม" })).toBeNull();
  });

  it("opens details for an existing activity and shows its student, description, evidence, and verification note", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Activity Transcript" });

    const title = "การปรับการรักษาด้วยยาในผู้ป่วยโรคไตเรื้อรัง";
    fireEvent.click(screen.getByRole("button", { name: `ดูรายละเอียด: ${title}` }));

    const dialog = screen.getByRole("dialog", { name: title });
    expect(within(dialog).getByText("ภก. สมชาย ใจดี")).toBeTruthy();
    expect(within(dialog).getByText("วภท-2568-001")).toBeTruthy();
    expect(within(dialog).getByText("ทบทวนแนวทางการรักษาและการปรับขนาดยาตามการทำงานของไต")).toBeTruthy();
    expect(within(dialog).getByText("แบบประเมิน Seminar ปี 2")).toBeTruthy();
    expect(within(dialog).getByText("ยังไม่มีหมายเหตุจากผู้ตรวจสอบ")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "อนุมัติรายการ" })).toBeNull();
  });

  it("approves a pending student activity without requiring a note", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Activity Transcript" });

    const title = "Precision dosing of vancomycin using AUC-guided monitoring";
    fireEvent.click(screen.getByRole("button", { name: `ดูรายละเอียด: ${title}` }));

    const dialog = screen.getByRole("dialog", { name: title });
    expect(within(dialog).getByText("รออาจารย์ผู้ควบคุมการฝึกยืนยันผลการนำเสนอ")).toBeTruthy();
    expect(within(dialog).getByText("สไลด์และแบบลงชื่อผู้เข้าร่วม")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "อนุมัติรายการ" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: title })).toBeNull());
    const activityCard = screen.getByText(title).closest<HTMLElement>('[data-slot="card"]');
    expect(activityCard).not.toBeNull();
    expect(within(activityCard!).getByText("ยืนยันแล้ว")).toBeTruthy();
  });

  it("requires a rejection note before rejecting a student activity", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Activity Transcript" });

    const title = "ผู้ป่วยติดเชื้อดื้อยาที่ได้รับยาหลายชนิด";
    fireEvent.click(screen.getByRole("button", { name: `ดูรายละเอียด: ${title}` }));

    const dialog = screen.getByRole("dialog", { name: title });
    fireEvent.click(within(dialog).getByRole("button", { name: "ไม่อนุมัติรายการ" }));
    expect(within(dialog).getByRole("alert").textContent).toContain("กรุณาระบุเหตุผลที่ไม่อนุมัติรายการ");
    expect(within(dialog).getByLabelText("หมายเหตุการตรวจสอบ").getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(within(dialog).getByLabelText("หมายเหตุการตรวจสอบ"), {
      target: { value: "หลักฐานยังไม่แสดงผลการติดตามผู้ป่วย" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "ไม่อนุมัติรายการ" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: title })).toBeNull());
    const activityCard = screen.getByText(title).closest<HTMLElement>('[data-slot="card"]');
    expect(activityCard).not.toBeNull();
    expect(within(activityCard!).getByText("ไม่ผ่าน")).toBeTruthy();

    fireEvent.click(within(activityCard!).getByRole("button", { name: `ดูรายละเอียด: ${title}` }));
    expect(within(screen.getByRole("dialog", { name: title })).getByText("หลักฐานยังไม่แสดงผลการติดตามผู้ป่วย")).toBeTruthy();
  });
});
