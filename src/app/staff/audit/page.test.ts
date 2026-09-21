import { beforeEach, describe, expect, it, vi } from "vitest";

import StaffAuditRoute from "./page";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));

describe("disabled Officer business history route", () => {
  beforeEach(() => redirect.mockReset());

  it("redirects the business history page to the Officer dashboard", () => {
    StaffAuditRoute();

    expect(redirect).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/staff/dashboard");
  });
});
