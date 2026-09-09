import { beforeEach, describe, expect, it, vi } from "vitest";

import RegistrationDetailPage from "./[id]/page";
import RegistrationListPage from "./page";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));

describe("disabled Teacher registration request routes", () => {
  beforeEach(() => redirect.mockReset());

  it("redirects the registration request list to the Teacher dashboard", () => {
    RegistrationListPage();

    expect(redirect).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/teacher/dashboard");
  });

  it("redirects registration request details to the Teacher dashboard", () => {
    RegistrationDetailPage();

    expect(redirect).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/teacher/dashboard");
  });
});
