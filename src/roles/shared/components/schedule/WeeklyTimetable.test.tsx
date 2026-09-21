import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeeklyTimetable } from "./WeeklyTimetable";

describe("WeeklyTimetable", () => {
  it("renders an accessible, horizontally scrollable timetable through the evening", () => {
    render(
      <WeeklyTimetable
        ariaLabel="ตารางทดสอบ"
        dayStartTime="08:00"
        dayEndTime="21:00"
        rows={[
          { id: "monday", label: "วันจันทร์", shortLabel: "จ." },
          { id: "wednesday", label: "วันพุธ", shortLabel: "พ." },
        ]}
        events={[{
          id: "evening-class",
          rowId: "wednesday",
          kicker: "วภช-201",
          title: "การบริบาลเภสัชกรรมชุมชน",
          meta: "สอนในสถานที่",
          location: "ห้องเรียน 204",
          startTime: "18:00",
          endTime: "21:00",
          tone: "info",
          href: "/teacher/courses/offering-community-201",
        }]}
        breaks={[{
          id: "lunch",
          label: "พักกลางวัน",
          startTime: "12:00",
          endTime: "13:00",
        }]}
      />,
    );

    const timetable = screen.getByRole("region", { name: "ตารางทดสอบ" });
    expect(timetable.getAttribute("tabindex")).toBe("0");
    expect(timetable.querySelector('time[datetime="20:00"]')).toBeTruthy();
    expect(timetable.querySelector('time[datetime="21:00"]')).toBeTruthy();
    expect(within(timetable).getByRole("note", { name: "พักกลางวัน 12:00–13:00" })).toBeTruthy();
    expect(within(timetable).getByRole("link", {
      name: /วภช-201 · การบริบาลเภสัชกรรมชุมชน · สอนในสถานที่ · 18:00–21:00 · ห้องเรียน 204/,
    }).getAttribute("href")).toBe("/teacher/courses/offering-community-201");
  });

  it("omits events outside the visible time range without hiding in-range events", () => {
    render(
      <WeeklyTimetable
        ariaLabel="ตารางช่วงกลางวัน"
        rows={[{ id: "saturday", label: "วันเสาร์" }]}
        events={[
          {
            id: "visible",
            rowId: "saturday",
            title: "รายวิชาช่วงเช้า",
            location: "ออนไลน์",
            startTime: "09:00",
            endTime: "12:00",
          },
          {
            id: "outside",
            rowId: "saturday",
            title: "รายวิชาช่วงค่ำ",
            location: "ออนไลน์",
            startTime: "18:00",
            endTime: "20:00",
          },
        ]}
      />,
    );

    expect(screen.getByText("รายวิชาช่วงเช้า")).toBeTruthy();
    expect(screen.queryByText("รายวิชาช่วงค่ำ")).toBeNull();
  });
});
