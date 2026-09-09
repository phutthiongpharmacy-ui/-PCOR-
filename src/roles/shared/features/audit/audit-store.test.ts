import { beforeEach, describe, expect, it, vi } from "vitest";

import * as auditStore from "./audit-store";
import { ORGANISATIONS } from "@/roles/shared/features/roles/access-model";
import { createAuditEvent } from "./audit-model";

describe("append-only User Audit Log", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("seeds complete audit evidence from more than one user", () => {
    const events = auditStore.readAuditEvents();
    expect(new Set(events.map((event) => event.actor.userId)).size).toBeGreaterThan(1);
    for (const event of events) {
      expect(event.actor).toMatchObject({
        userId: expect.any(String),
        userName: expect.any(String),
        role: expect.any(String),
        organisation: { id: expect.any(String), name: expect.any(String) },
        resourceScopes: expect.any(Array),
      });
      expect(event).toMatchObject({
        action: expect.any(String),
        resource: { type: expect.any(String), id: expect.any(String) },
        before: expect.anything(),
        after: expect.anything(),
        reason: expect.any(String),
        evidenceReference: expect.any(String),
        occurredAt: expect.any(String),
      });
    }
  });

  it("appends without replacing prior events and emits a same-window event", () => {
    const listener = vi.fn();
    window.addEventListener(auditStore.AUDIT_STORE_EVENT, listener);
    const before = auditStore.readAuditEvents();
    const appended = auditStore.appendAuditEvent({
      actor: {
        userId: "institution-admin-001",
        userName: "ภก. วิชาญ อัครเวช",
        role: "institution_admin",
        organisation: ORGANISATIONS.siriraj,
        resourceScopes: ["*"],
      },
      action: "teaching_assignment.change",
      resource: {
        type: "teaching_assignment",
        id: "TA-DEMO-001",
        organisationId: ORGANISATIONS.siriraj.id,
      },
      before: { teacherId: null },
      after: { teacherId: "teacher-001" },
      reason: "จัดอาจารย์ตามรุ่นเรียนที่เปิดสอน",
      evidenceReference: "COURSE-OFFERING-DEMO-001",
      occurredAt: "2026-08-11T02:00:00.000Z",
    });
    const after = auditStore.readAuditEvents();
    expect(after).toHaveLength(before.length + 1);
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after.at(-1)?.id).toBe(appended.id);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(auditStore.AUDIT_STORE_EVENT, listener);
  });

  it.each(["payment.exception", "payment.review_approved", "payment.review_rejected"])(
    "requires reason and evidence for financial action %s",
    (action) => {
      const base = {
        actor: {
          userId: "staff-001",
          userName: "ภญ. ปาริชาติ สุขเกษม",
          role: "royal_college_staff" as const,
          organisation: ORGANISATIONS.royalCollege,
          resourceScopes: ["*"],
        },
        action,
        resource: { type: "invoice", id: "INV-001" },
        before: { status: "paid" },
        after: { status: "exception" },
      };
      expect(() => createAuditEvent(base)).toThrow("requires a reason");
      expect(() => createAuditEvent({ ...base, reason: "ยอดไม่ตรง" }))
        .toThrow("requires an evidence reference");
    },
  );

  it.each([
    "course_proposal.submit",
    "course_proposal.resubmit",
    "course_proposal.review",
  ])("requires a reason but keeps evidence optional for %s", (action) => {
    const base = {
      actor: {
        userId: "teacher-001",
        userName: "อ. ภก. กิตติพงศ์ วัฒนเภสัช",
        role: "teacher" as const,
        organisation: ORGANISATIONS.siriraj,
        resourceScopes: ["course:proposal"],
      },
      action,
      resource: { type: "course_proposal", id: "CPROP-TEST-001" },
      before: null,
      after: { status: "submitted" },
    };

    expect(() => createAuditEvent(base)).toThrow("requires a reason");
    expect(createAuditEvent({ ...base, reason: "เหตุผลประกอบการดำเนินการ" }))
      .not.toHaveProperty("evidenceReference");
  });

  it("records a System Actor without adding a seventh logged-in role", () => {
    const event = createAuditEvent({
      actor: {
        userId: "system-payment-actor",
        userName: "System Actor",
        role: "system_actor",
        organisation: ORGANISATIONS.system,
        resourceScopes: ["payment:confirmation"],
      },
      action: "payment.confirmed",
      resource: { type: "invoice", id: "INV-SYSTEM-001" },
      before: { status: "awaiting_payment" },
      after: { status: "paid", registrationStatus: "enrolled" },
      evidenceReference: "TXN-SYSTEM-001",
      occurredAt: "2026-08-11T02:30:00.000Z",
    });

    expect(event.actor.role).toBe("system_actor");
  });

  it("exposes no edit, delete, or reset operation", () => {
    expect("updateAuditEvent" in auditStore).toBe(false);
    expect("deleteAuditEvent" in auditStore).toBe(false);
    expect("resetAuditEvents" in auditStore).toBe(false);
  });
});
