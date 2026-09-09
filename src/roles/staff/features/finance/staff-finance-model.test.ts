import { describe, expect, it } from "vitest";

import type { Payment } from "@/providers/mock-db-provider";
import type { UserAuditEvent } from "@/roles/shared/features/audit";
import { createLockedRegistrationInvoice, unlockRegistrationInvoice } from "@/roles/shared/features/finance";
import type { RegistrationRecord } from "@/roles/shared/features/registration";
import {
  buildStaffFinanceRows,
  receivedBreakdownByCourse,
  receivedRowsForPeriod,
  staffFinanceDisplayAmount,
  staffFinanceDisplayLateFee,
  summarizeStaffFinance,
} from "./staff-finance-model";

const registration = {
  id: "REG-1",
  studentId: "STUDENT-1",
  studentName: "ภญ. ทดสอบ ระบบ",
  courseCode: "BCP-101",
  courseTitle: "เภสัชบำบัดพื้นฐาน",
} as RegistrationRecord;

const awaitingInvoice = unlockRegistrationInvoice(createLockedRegistrationInvoice({
  registrationId: registration.id,
  studentId: registration.studentId,
  courseCode: registration.courseCode,
  courseTitle: registration.courseTitle,
  credits: 3,
  at: "2026-08-01T03:00:00.000Z",
}), "2026-08-01T03:00:00.000Z");

function payment(status: Payment["status"], submittedAt = "2026-08-03T03:00:00.000Z"): Payment {
  return {
    id: `PAY-${status}`,
    invoiceId: awaitingInvoice.id,
    studentId: registration.studentId,
    name: registration.studentName,
    program: "เภสัชบำบัด",
    amount: 3_000,
    date: "3 ส.ค. 2569",
    status,
    type: awaitingInvoice.description,
    method: "promptpay",
    referenceNo: "PP-001",
    submittedAt,
    evidenceFileName: "proof.png",
    evidenceFileType: "image/png",
    evidenceFileSize: 5,
    evidenceDataUrl: "data:image/png;base64,cHJvb2Y=",
  };
}

function audit(action: "payment.reconcile" | "payment.exception", occurredAt: string): UserAuditEvent {
  return {
    schemaVersion: 1,
    id: `${action}-${occurredAt}`,
    actor: {
      userId: "staff-1",
      userName: "เจ้าหน้าที่",
      role: "royal_college_staff",
      organisation: { id: "org-royal-college", code: "RPC", name: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย", kind: "royal_college" },
      resourceScopes: ["staff:central"],
    },
    action,
    resource: { type: "invoice", id: awaitingInvoice.id },
    before: { phase: "reconciliation" },
    after: { phase: "reconciliation" },
    reason: "ตรวจสอบแล้ว",
    evidenceReference: "BANK-001",
    occurredAt,
  };
}

function lifecycleAudit(
  action: "payment.cancel" | "payment.refund",
  status: "cancelled" | "refunded" | "paid",
  occurredAt: string,
): UserAuditEvent {
  return {
    ...audit("payment.exception", occurredAt),
    id: `${action}-${occurredAt}`,
    action,
    after: { status },
  };
}

describe("staff finance model", () => {
  it("keeps payment verification separate from reconciliation", () => {
    const [pending] = buildStaffFinanceRows({
      invoices: [awaitingInvoice], registrations: [registration], payments: [payment("pending")], auditEvents: [],
      now: "2026-08-03T03:00:00.000Z",
    });
    expect(pending).toMatchObject({
      paymentState: "pending_verification",
      reconciliationState: "not_ready",
      allowedActions: ["approve_payment", "reject_payment"],
    });

    const paidInvoice = { ...awaitingInvoice, status: "paid" as const, paidAt: "2026-08-03T03:00:00.000Z" };
    const [paid] = buildStaffFinanceRows({
      invoices: [paidInvoice], registrations: [registration], payments: [payment("approved")], auditEvents: [],
    });
    expect(paid).toMatchObject({
      paymentState: "paid",
      reconciliationState: "pending",
      receivedAmount: 3_000,
      allowedActions: ["reconcile", "exception"],
    });
  });

  it("does not expose proof-review actions for a locked invoice", () => {
    const lockedInvoice = createLockedRegistrationInvoice({
      registrationId: registration.id,
      studentId: registration.studentId,
      courseCode: registration.courseCode,
      courseTitle: registration.courseTitle,
      credits: 3,
      at: "2026-08-01T03:00:00.000Z",
    });
    const [row] = buildStaffFinanceRows({
      invoices: [lockedInvoice],
      registrations: [registration],
      payments: [{ ...payment("pending"), invoiceId: lockedInvoice.id }],
      auditEvents: [],
    });

    expect(row).toMatchObject({ paymentState: "locked", allowedActions: [] });
  });

  it("freezes a pending proof at the amount due when it was submitted", () => {
    const [row] = buildStaffFinanceRows({
      invoices: [awaitingInvoice],
      registrations: [registration],
      payments: [payment("pending")],
      auditEvents: [],
      now: "2026-08-20T03:00:00.000Z",
    });

    expect(row).toMatchObject({
      paymentState: "pending_verification",
      amountDue: 3_000,
      submittedAmount: 3_000,
      expectedPaymentAmount: 3_000,
      paymentAmountMatchesInvoice: true,
    });
    expect(summarizeStaffFinance([row]).pendingVerificationAmount).toBe(3_000);
  });

  it.each([
    ["missing proof", { evidenceDataUrl: undefined }, false],
    ["amount mismatch", { amount: 3_500 }, true],
  ] as const)("blocks approval for %s but keeps rejection available", (_label, patch, hasEvidence) => {
    const [row] = buildStaffFinanceRows({
      invoices: [awaitingInvoice],
      registrations: [registration],
      payments: [{ ...payment("pending"), ...patch }],
      auditEvents: [],
      now: "2026-08-03T03:00:00.000Z",
    });

    expect(row.hasInspectableEvidence).toBe(hasEvidence);
    expect(row.allowedActions).toEqual(["reject_payment"]);
  });

  it("uses the latest reconciliation event and ignores verification rejection events", () => {
    const paidInvoice = { ...awaitingInvoice, status: "paid" as const, paidAt: "2026-08-03T03:00:00.000Z" };
    const verificationRejection = {
      ...audit("payment.exception", "2026-08-06T03:00:00.000Z"),
      after: { phase: "payment_verification", status: "rejected" },
    };
    const [row] = buildStaffFinanceRows({
      invoices: [paidInvoice], registrations: [registration], payments: [payment("approved")],
      auditEvents: [audit("payment.exception", "2026-08-04T03:00:00.000Z"), audit("payment.reconcile", "2026-08-05T03:00:00.000Z"), verificationRejection],
    });
    expect(row.reconciliationState).toBe("reconciled");
    expect(row.latestReconciliationEvent?.action).toBe("payment.reconcile");
  });

  it("counts each paid invoice once and uses payment amount for late fees", () => {
    const paidInvoice = { ...awaitingInvoice, status: "paid" as const, paidAt: "2026-08-17T03:00:00.000Z", updatedAt: "2026-08-17T03:00:00.000Z" };
    const rows = buildStaffFinanceRows({
      invoices: [paidInvoice], registrations: [registration],
      payments: [{ ...payment("approved", "2026-08-17T03:00:00.000Z"), amount: 3_500 }, payment("rejected", "2026-08-02T03:00:00.000Z")], auditEvents: [],
    });
    expect(summarizeStaffFinance(rows)).toMatchObject({
      totalReceived: 3_500,
      receivedBaseAmount: 3_000,
      receivedLateFees: 500,
      pendingReconciliationAmount: 3_500,
      pendingReconciliationCount: 1,
    });
    expect(receivedBreakdownByCourse(rows)).toEqual([{ label: "BCP-101 · เภสัชบำบัดพื้นฐาน", amount: 3_500 }]);
  });

  it("filters received totals by Bangkok calendar period and excludes unlinked legacy payments", () => {
    const paidInvoice = { ...awaitingInvoice, status: "paid" as const, paidAt: "2026-08-31T18:30:00.000Z" };
    const unlinkedPayment = { ...payment("approved"), id: "PAY-UNLINKED", invoiceId: "INV-UNLINKED", amount: 99_999 };
    const rows = buildStaffFinanceRows({
      invoices: [paidInvoice], registrations: [registration], payments: [unlinkedPayment], auditEvents: [],
    });
    expect(rows).toHaveLength(1);
    expect(summarizeStaffFinance(rows).totalReceived).toBe(3_000);
    expect(receivedRowsForPeriod({ rows, period: "month", now: "2026-09-15T03:00:00.000Z" })).toHaveLength(1);
    expect(receivedRowsForPeriod({ rows, period: "custom", from: "2026-09-02", to: "2026-09-30" })).toHaveLength(0);
  });

  it("restores a legacy cancellation from append-only audit without removing received cash", () => {
    const paidInvoice = { ...awaitingInvoice, status: "paid" as const, paidAt: "2026-08-03T03:00:00.000Z", updatedAt: "2026-08-03T03:00:00.000Z" };
    const [row] = buildStaffFinanceRows({
      invoices: [paidInvoice], registrations: [registration], payments: [{ ...payment("approved"), amount: 3_500 }],
      auditEvents: [lifecycleAudit("payment.cancel", "cancelled", "2026-08-04T03:00:00.000Z")],
    });

    expect(row).toMatchObject({ paymentState: "cancelled", receivedAmount: 3_500, baseAmount: 3_000, allowedActions: [] });
    expect(staffFinanceDisplayAmount(row)).toBe(3_500);
    expect(staffFinanceDisplayLateFee(row)).toBe(500);
    expect(summarizeStaffFinance([row])).toMatchObject({ totalReceived: 3_500, receivedLateFees: 500 });
    expect(receivedRowsForPeriod({ rows: [row], period: "all" })).toHaveLength(1);
  });

  it("shows an audited refund as terminal and excludes it from received totals", () => {
    const paidInvoice = { ...awaitingInvoice, status: "paid" as const, paidAt: "2026-08-03T03:00:00.000Z", updatedAt: "2026-08-03T03:00:00.000Z" };
    const [row] = buildStaffFinanceRows({
      invoices: [paidInvoice], registrations: [registration], payments: [payment("approved")],
      auditEvents: [lifecycleAudit("payment.refund", "refunded", "2026-08-04T03:00:00.000Z")],
    });

    expect(row).toMatchObject({ paymentState: "refunded", receivedAmount: 0, allowedActions: [] });
    expect(staffFinanceDisplayAmount(row)).toBe(0);
    expect(staffFinanceDisplayLateFee(row)).toBe(0);
    expect(summarizeStaffFinance([row]).totalReceived).toBe(0);
  });

  it("lets a newer canonical invoice update supersede old lifecycle audit", () => {
    const paidInvoice = { ...awaitingInvoice, status: "paid" as const, paidAt: "2026-08-05T03:00:00.000Z", updatedAt: "2026-08-05T03:00:00.000Z" };
    const [row] = buildStaffFinanceRows({
      invoices: [paidInvoice], registrations: [registration], payments: [payment("approved", "2026-08-05T03:00:00.000Z")],
      auditEvents: [lifecycleAudit("payment.cancel", "cancelled", "2026-08-04T03:00:00.000Z")],
    });

    expect(row.paymentState).toBe("paid");
  });

  it("requires the exact lifecycle marker and uses the latest append on timestamp ties", () => {
    const first = lifecycleAudit("payment.cancel", "cancelled", "2026-08-04T03:00:00.000Z");
    const invalidRefund = lifecycleAudit("payment.refund", "paid", "2026-08-05T03:00:00.000Z");
    const latest = lifecycleAudit("payment.refund", "refunded", "2026-08-04T03:00:00.000Z");
    const [row] = buildStaffFinanceRows({
      invoices: [awaitingInvoice], registrations: [registration], payments: [],
      auditEvents: [first, invalidRefund, latest],
    });

    expect(row.paymentState).toBe("refunded");
    expect(row.latestLifecycleEvent?.action).toBe("payment.refund");
  });
});
