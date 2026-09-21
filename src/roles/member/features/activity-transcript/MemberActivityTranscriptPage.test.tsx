import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MockDbProvider } from "@/providers/mock-db-provider";
import { ORGANISATIONS } from "@/roles/shared/features/roles/access-model";
import { PORTAL_SESSION_KEY } from "@/roles/shared/features/roles/mock-login";

import MemberActivityTranscriptPage from "./MemberActivityTranscriptPage";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({
    role: "student",
    displayName: "ภก. สมชาย ใจดี",
    signedInAt: "2026-09-21T01:00:00.000Z",
    userId: "วภท-2568-001",
    organisation: ORGANISATIONS.siriraj,
    resourceScopes: ["student:self"],
  }));
});

function renderPage() {
  return render(
    <MockDbProvider>
      <MemberActivityTranscriptPage />
    </MockDbProvider>,
  );
}

describe("MemberActivityTranscriptPage", () => {
  it("opens on the current training year and shows verified-only requirement progress", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Activity Transcript" }),
    ).toBeTruthy();

    const currentYear = screen.getByRole("button", {
      name: /^ปีการฝึกอบรม 2/,
    });
    expect(currentYear.getAttribute("aria-pressed")).toBe("true");

    const requirements = screen.getByRole("region", {
      name: "ความคืบหน้าตามเงื่อนไข",
    });
    const journalProgress = within(requirements).getByRole("progressbar", {
      name: "ความคืบหน้า Journal Club",
    }) as HTMLProgressElement;
    expect(journalProgress.value).toBe(2);
    expect(journalProgress.max).toBe(6);

    expect(screen.getByText(/เพิ่มกิจกรรมได้ด้วยตนเอง/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /เพิ่มกิจกรรม/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /แก้ไขกิจกรรม/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /บันทึกกิจกรรม/ })).toBeNull();
  });

  it("switches training years while retaining requirements and a clear empty state", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Activity Transcript" });

    const yearOne = screen.getByRole("button", {
      name: /^ปีการฝึกอบรม 1/,
    });
    fireEvent.click(yearOne);

    expect(yearOne.getAttribute("aria-pressed")).toBe("true");
    const yearOneJournal = screen.getByRole("progressbar", {
      name: "ความคืบหน้า Journal Club",
    }) as HTMLProgressElement;
    expect(yearOneJournal.value).toBe(3);
    expect(yearOneJournal.max).toBe(3);
    expect(
      screen.getByRole("button", {
        name: /ดูรายละเอียด: การใช้ยาต้านการแข็งตัวของเลือดในผู้ป่วยสูงอายุ/,
      }),
    ).toBeTruthy();

    const yearThree = screen.getByRole("button", {
      name: /^ปีการฝึกอบรม 3/,
    });
    fireEvent.click(yearThree);

    expect(yearThree.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Professional Project")).toBeTruthy();
    expect(screen.getByText("ไม่พบกิจกรรม")).toBeTruthy();
    expect(
      screen.getByText(
        "ยังไม่มีกิจกรรมในปีนี้ หรือไม่มีรายการที่ตรงกับตัวกรอง",
      ),
    ).toBeTruthy();
  });

  it("filters year 2 activities by category, status, and search and can reset them", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Activity Transcript" });

    const [activityList] = screen.getAllByRole("region", {
      name: "รายการกิจกรรม",
    });
    expect(screen.getByRole("status").textContent).toContain("พบ 10 จาก 10 รายการ");
    expect(
      within(activityList).getAllByRole("button", { name: /ดูรายละเอียด:/ }),
    ).toHaveLength(10);

    fireEvent.change(screen.getByLabelText("ประเภทกิจกรรม"), {
      target: { value: "journal_club" },
    });
    expect(
      within(activityList).getAllByRole("button", { name: /ดูรายละเอียด:/ }),
    ).toHaveLength(3);
    expect(screen.getByRole("status").textContent).toContain("พบ 3 จาก 10 รายการ");

    fireEvent.change(screen.getByLabelText("สถานะการตรวจสอบ"), {
      target: { value: "pending" },
    });
    expect(
      within(activityList).getAllByRole("button", { name: /ดูรายละเอียด:/ }),
    ).toHaveLength(1);
    expect(
      within(activityList).getByRole("button", {
        name: /ดูรายละเอียด: Precision dosing of vancomycin using AUC-guided monitoring/,
      }),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("ค้นหากิจกรรม"), {
      target: { value: "ไม่พบแน่นอน" },
    });
    expect(within(activityList).getByText("ไม่พบกิจกรรม")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "ล้างตัวกรอง" }));
    expect(
      within(activityList).getAllByRole("button", { name: /ดูรายละเอียด:/ }),
    ).toHaveLength(10);
  });

  it("opens a read-only detail dialog with evidence and verification context", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Activity Transcript" });

    fireEvent.click(
      screen.getByRole("button", {
        name: /ดูรายละเอียด: Precision dosing of vancomycin using AUC-guided monitoring/,
      }),
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", {
        name: "Precision dosing of vancomycin using AUC-guided monitoring",
      }),
    ).toBeTruthy();
    expect(within(dialog).getByText("รอตรวจสอบ")).toBeTruthy();
    expect(within(dialog).getByText("ผู้เรียนบันทึก")).toBeTruthy();
    expect(
      within(dialog).getByText("สไลด์และแบบลงชื่อผู้เข้าร่วม"),
    ).toBeTruthy();
    expect(
      within(dialog).getByText(
        "รออาจารย์ผู้ควบคุมการฝึกยืนยันผลการนำเสนอ",
      ),
    ).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: /แก้ไข/ })).toBeNull();

    fireEvent.click(within(dialog).getByRole("button", { name: "ปิด" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("lets the signed-in student submit only their own activity with evidence", async () => {
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Activity Transcript" });

    fireEvent.click(screen.getByRole("button", { name: /เพิ่มกิจกรรม/ }));
    const dialog = screen.getByRole("dialog");
    const evidenceButton = within(dialog).getByRole("button", {
      name: "เลือกไฟล์แนบหลักฐาน",
    });
    expect(evidenceButton).toBeTruthy();
    expect(within(evidenceButton).getByText("attach_file")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("ชื่อกิจกรรม *"), {
      target: { value: "สัมมนาการดูแลผู้ป่วยสูงอายุ" },
    });
    fireEvent.change(within(dialog).getByLabelText("วันที่ทำกิจกรรม *"), {
      target: { value: "2026-09-20" },
    });
    fireEvent.change(within(dialog).getByLabelText("บทบาทของผู้เรียน *"), {
      target: { value: "ผู้นำเสนอ" },
    });
    fireEvent.change(within(dialog).getByLabelText("หน่วยงาน / สถานที่ *"), {
      target: { value: "มหาวิทยาลัยมหิดล" },
    });
    fireEvent.change(within(dialog).getByLabelText("รายละเอียด *"), {
      target: { value: "นำเสนอแนวทางติดตามความปลอดภัยจากการใช้ยา" },
    });
    fireEvent.change(within(dialog).getByLabelText("แนบหลักฐาน *"), {
      target: { files: [new File(["proof"], "seminar-proof.pdf", { type: "application/pdf" })] },
    });
    expect(
      within(dialog).getByRole("button", {
        name: "เปลี่ยนไฟล์แนบหลักฐาน ปัจจุบัน seminar-proof.pdf",
      }),
    ).toBeTruthy();
    fireEvent.submit(dialog.querySelector("form")!);

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("สัมมนาการดูแลผู้ป่วยสูงอายุ")).toBeTruthy();
    expect(screen.getAllByText("บันทึกโดยผู้เรียน").length).toBeGreaterThan(0);
  });
});
