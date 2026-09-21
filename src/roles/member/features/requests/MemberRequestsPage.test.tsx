import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MockRequest } from "@/roles/shared/features/requests/request-schema";

import MemberRequestsPage from "./MemberRequestsPage";

const requestStore = vi.hoisted(() => ({
  requests: [] as MockRequest[],
  storageError: "",
  isReady: true,
  addRequest: vi.fn(),
  updateRequest: vi.fn(),
}));

vi.mock("@/roles/shared/features/requests/request-store", () => ({
  useRequestStore: () => requestStore,
}));

vi.mock("@/roles/shared/features/roles/use-portal-session", () => ({
  usePortalSession: () => ({
    isReady: true,
    session: {
      role: "student",
      displayName: "ภก. สมชาย ใจดี",
      signedInAt: "2026-09-21T00:00:00.000Z",
      userId: "วภท-2568-001",
      organisation: { id: "institution-siriraj" },
      resourceScopes: ["student:self"],
    },
  }),
}));

beforeEach(() => {
  requestStore.requests = [];
  requestStore.addRequest.mockReset();
  requestStore.updateRequest.mockReset();
});

afterEach(cleanup);

describe("MemberRequestsPage", () => {
  it("omits related courses from the new-request wizard and submitted request", () => {
    render(<MemberRequestsPage />);

    fireEvent.click(screen.getByRole("button", { name: /ยื่นคำร้องใหม่/ }));
    fireEvent.click(screen.getByRole("button", { name: /ขอสอบ/ }));
    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

    expect(screen.queryByText("รายวิชาที่เกี่ยวข้อง")).toBeNull();

    fireEvent.change(screen.getByLabelText(/ประเภทการสอบ/), {
      target: { value: "สอบปากเปล่าข้างเตียงผู้ป่วย" },
    });
    fireEvent.change(screen.getByLabelText(/รอบสอบที่ต้องการ/), {
      target: { value: "รอบเดือนกรกฎาคม 2569" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการยื่นคำร้อง" }));

    expect(requestStore.addRequest).toHaveBeenCalledOnce();
    expect(requestStore.addRequest.mock.calls[0][0].courses).toEqual([]);
  });

  it("still shows course snapshots already stored on legacy request details", () => {
    requestStore.requests = [{
      id: "REQ-LEGACY-001",
      categoryId: "legacy",
      typeLabel: "คำร้องเดิม",
      title: "คำร้องเดิมที่มีรายวิชา",
      displayDate: "1 ก.ย. 2569",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      status: "signed",
      collegeCode: "วภท.",
      requester: {
        memberId: "วภท-2568-001",
        name: "ภก. สมชาย ใจดี",
        email: "student@example.com",
      },
      fields: [],
      courses: [{
        code: "วภท-301",
        title: "เภสัชบำบัดเฉพาะทาง",
        credits: 12,
        term: "1/2569",
      }],
      documents: [],
      comments: [],
      events: [],
      progress: ["ยื่นคำร้อง", "ลงนามแล้ว"],
    }];

    render(<MemberRequestsPage />);
    fireEvent.click(screen.getByRole("button", { name: /คำร้องเดิมที่มีรายวิชา/ }));

    expect(screen.getByRole("heading", { name: "รายวิชาที่เกี่ยวข้อง" })).toBeTruthy();
    expect(screen.getByText(/เภสัชบำบัดเฉพาะทาง/)).toBeTruthy();
  });
});
