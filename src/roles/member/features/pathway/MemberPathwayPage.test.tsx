import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import MemberPathwayPage from "./MemberPathwayPage";
import {
  pharmacotherapyPathwayStages,
  pharmacotherapyPathwaySummary,
} from "./pharmacotherapy-pathway";

const originalResizeObserver = globalThis.ResizeObserver;

beforeAll(() => {
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
});

afterAll(() => {
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: originalResizeObserver,
  });
});

describe("MemberPathwayPage", () => {
  afterEach(cleanup);

  it("renders the four-year pharmacotherapy pathway with coherent credit totals", () => {
    render(<MemberPathwayPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "เส้นทางการเรียนเภสัชบำบัด 4 ปี",
      }),
    ).toBeTruthy();

    const plannedCredits = pharmacotherapyPathwayStages
      .filter((stage) => stage.kind === "year")
      .reduce((total, stage) => total + (stage.credits?.planned ?? 0), 0);
    const earnedCredits = pharmacotherapyPathwayStages
      .filter((stage) => stage.kind === "year")
      .reduce((total, stage) => total + (stage.credits?.earned ?? 0), 0);
    const currentStages = pharmacotherapyPathwayStages.filter(
      (stage) => stage.status === "current",
    );
    expect(plannedCredits).toBe(pharmacotherapyPathwaySummary.totalCredits);
    expect(plannedCredits).toBe(133);
    expect(earnedCredits).toBe(pharmacotherapyPathwaySummary.earnedCredits);
    expect(currentStages).toHaveLength(1);
    expect(currentStages[0].credits).toEqual({ earned: 18, planned: 32 });

    const overallProgress = screen.getByRole("progressbar", {
      name: "ความคืบหน้าหน่วยกิตรวม",
    }) as HTMLProgressElement;
    expect(overallProgress.value).toBe(55);
    expect(overallProgress.max).toBe(133);

    const roadmap = screen.getByRole("list", {
      name: "ลำดับเส้นทางการเรียนเภสัชบำบัด 4 ปี",
    });
    expect(within(roadmap).getAllByRole("button")).toHaveLength(9);

    const currentStage = within(roadmap).getByRole("button", {
      name: /ปี 2: Specialized Residency ปี 2, กำลังศึกษา/,
    });
    expect(currentStage.getAttribute("aria-current")).toBe("step");
    expect(currentStage.getAttribute("aria-pressed")).toBe("true");
  });

  it("lets the student inspect hard-gate and final-gate requirements", () => {
    render(<MemberPathwayPage />);

    const roadmap = screen.getByRole("list", {
      name: "ลำดับเส้นทางการเรียนเภสัชบำบัด 4 ปี",
    });
    const yearThreeGate = within(roadmap).getByRole("button", {
      name: /Gate ปี 3: การประเมินก่อนเข้าสู่ปี 4/,
    });
    fireEvent.click(yearThreeGate);

    const yearThreeDetail = screen.getByRole("region", {
      name: "การประเมินก่อนเข้าสู่ปี 4",
    });
    expect(within(yearThreeDetail).getByText("written เฉพาะทาง")).toBeTruthy();
    expect(within(yearThreeDetail).getAllByText("ไม่น้อยกว่า 80%")).toHaveLength(2);
    expect(yearThreeGate.getAttribute("aria-pressed")).toBe("true");

    const finalGate = within(roadmap).getByRole("button", {
      name: /Final Gate: การประเมินเพื่อสำเร็จวุฒิบัตร/,
    });
    fireEvent.click(finalGate);

    const finalDetail = screen.getByRole("region", {
      name: "การประเมินเพื่อสำเร็จวุฒิบัตร",
    });
    expect(within(finalDetail).getByText("อย่างน้อย 1 เรื่อง")).toBeTruthy();
    expect(within(finalDetail).getByText("ส่งภายใน 45 วัน")).toBeTruthy();
    expect(finalGate.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows a glass summary on keyboard focus while keeping click for full details", async () => {
    render(<MemberPathwayPage />);

    const roadmap = screen.getByRole("list", {
      name: "ลำดับเส้นทางการเรียนเภสัชบำบัด 4 ปี",
    });
    const yearThree = within(roadmap).getByRole("button", {
      name: /ปี 3: Specialized Residency ปี 3, ยังไม่เริ่ม/,
    });

    fireEvent.focus(yearThree);

    const preview = await screen.findByRole("tooltip");
    expect(preview.textContent).toBe("รายละเอียดย่อ Specialized Residency ปี 3");
    expect(await screen.findByText("ขั้นที่ 5")).toBeTruthy();
    expect(
      screen.getByText("ฝึกเฉพาะทาง เตรียม Proposal และผลงานตามกำหนด"),
    ).toBeTruthy();
    expect(screen.getByText("0 / 32")).toBeTruthy();

    fireEvent.click(yearThree);
    expect(yearThree.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("region", { name: "Specialized Residency ปี 3" }),
    ).toBeTruthy();
  });
});
