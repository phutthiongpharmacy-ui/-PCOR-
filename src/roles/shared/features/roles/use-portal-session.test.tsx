import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PORTAL_SESSION_EVENT,
  PORTAL_SESSION_KEY,
  resolvePortalLogin,
  savePortalSession,
} from "./mock-login";
import { usePortalSession } from "./use-portal-session";

function SessionProbe() {
  const { session, isReady } = usePortalSession();
  return (
    <output data-testid="session">
      {isReady ? `${session?.role ?? "none"}:${session?.organisation.code ?? "none"}` : "loading"}
    </output>
  );
}

describe("usePortalSession", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reacts to the custom same-window session event", async () => {
    render(<SessionProbe />);
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe("none:none"));

    act(() => {
      savePortalSession(resolvePortalLogin("teacher", "2222").session);
    });

    await waitFor(() => expect(screen.getByTestId("session").textContent)
      .toBe("teacher:INST-SIRIRAJ"));
  });

  it("normalizes a valid stored session without dispatching during render", async () => {
    const session = resolvePortalLogin("officer", "2222").session;
    const reorderedSession = {
      signedInAt: session.signedInAt,
      resourceScopes: session.resourceScopes,
      organisation: session.organisation,
      userId: session.userId,
      displayName: session.displayName,
      role: session.role,
      collegeCode: session.collegeCode,
    };
    window.localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(reorderedSession));
    const listener = vi.fn();
    window.addEventListener(PORTAL_SESSION_EVENT, listener);

    render(<SessionProbe />);

    await waitFor(() => expect(screen.getByTestId("session").textContent)
      .toBe("royal_college_staff:รวภท."));
    expect(listener).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(PORTAL_SESSION_KEY)!))
      .toEqual(reorderedSession);
    window.removeEventListener(PORTAL_SESSION_EVENT, listener);
  });
});
