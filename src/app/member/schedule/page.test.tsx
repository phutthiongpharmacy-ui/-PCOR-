import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SchedulePage from "./page";

describe("Member schedule page", () => {
  it("keeps the Student timetable rows, course types, and lunch break visible", () => {
    render(<SchedulePage />);

    expect(screen.getByLabelText("คำอธิบายประเภทรายวิชา").textContent).toContain("ทฤษฎี");
    expect(screen.getByLabelText("คำอธิบายประเภทรายวิชา").textContent).toContain("ปฏิบัติการ");

    const timetable = screen.getByRole("region", { name: "ตารางเรียนตามสัปดาห์" });
    expect(within(timetable).getByText("เสาร์ (สัปดาห์ที่ 1)")).toBeTruthy();
    expect(within(timetable).getByText("อาทิตย์ (สัปดาห์ที่ 3)")).toBeTruthy();
    expect(within(timetable).getByText("Adv. Pharmacotherapeutics I")).toBeTruthy();
    expect(within(timetable).getByText("Bedside Teaching")).toBeTruthy();
    expect(within(timetable).getByRole("note", {
      name: "พักรับประทานอาหารกลางวัน 12:00–13:00",
    })).toBeTruthy();
  });
});
