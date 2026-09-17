import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import MemberActivityTranscriptPage from "./MemberActivityTranscriptPage";

afterEach(cleanup);

describe("MemberActivityTranscriptPage", () => {
  it("opens on the current training year and shows verified-only requirement progress", () => {
    render(<MemberActivityTranscriptPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Activity Transcript" }),
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

    expect(screen.getByText(/แสดงผลอย่างเดียว/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /เพิ่มกิจกรรม/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /แก้ไขกิจกรรม/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /บันทึกกิจกรรม/ })).toBeNull();
  });

  it("switches training years while retaining requirements and a clear empty state", () => {
    render(<MemberActivityTranscriptPage />);

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

  it("filters year 2 activities by category, status, and search and can reset them", () => {
    render(<MemberActivityTranscriptPage />);

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
    render(<MemberActivityTranscriptPage />);

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
});
