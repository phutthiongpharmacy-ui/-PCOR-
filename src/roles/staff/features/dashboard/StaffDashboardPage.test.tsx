import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/providers/mock-db-provider", () => ({
  useMockDb: () => ({
    registrations: [],
    registrationInvoices: [],
    payments: [],
    auditEvents: [],
    isLoaded: true,
  }),
}));

vi.mock("@/roles/staff/features/finance/staff-finance-model", () => ({
  buildStaffFinanceRows: () => [],
  receivedRowsForPeriod: () => [],
  summarizeStaffFinance: () => ({ totalReceived: 0 }),
  receivedBreakdownByCourse: () => [],
}));

import StaffDashboardPage from "./StaffDashboardPage";

describe("StaffDashboardPage", () => {
  it("does not expose the disabled business history feature", () => {
    const { container } = render(<StaffDashboardPage />);

    expect(screen.queryByText("ประวัติงานธุรกิจ")).toBeNull();
    expect(screen.queryByText("กิจกรรมล่าสุด")).toBeNull();
    expect(container.querySelector('a[href="/staff/audit"]')).toBeNull();
  });
});
