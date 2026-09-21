import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminBreakGlassRoute from "./page";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));

describe("disabled Admin Break-glass route", () => {
  beforeEach(() => redirect.mockReset());

  it("redirects the disabled feature to the Admin dashboard", () => {
    AdminBreakGlassRoute();

    expect(redirect).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/admin/dashboard");
  });
});
