import { describe, expect, it } from "vitest";

import { currentMemberPaymentOwner } from "@/roles/shared/data";
import {
  createLockedRegistrationInvoice,
} from "@/roles/shared/features/finance";

import {
  promptPaySubmissionStatus,
  resolveStudentInvoiceDisplayStatus,
  selectStudentRegistrationInvoices,
  studentFinanceOwnerIds,
} from "./payment-flow";

const currentInvoice = createLockedRegistrationInvoice({
  registrationId: "REG-CURRENT",
  studentId: currentMemberPaymentOwner.studentId,
  courseCode: "BCP-101",
  courseTitle: "เภสัชบำบัดพื้นฐาน",
  credits: 3,
  at: "2026-08-18T03:00:00.000Z",
});

describe("Student payment flow", () => {
  it("sends PromptPay evidence for staff verification before confirmation", () => {
    expect(promptPaySubmissionStatus()).toBe("pending");
  });

  it("keeps legacy aliases only for the matching current Student", () => {
    expect(studentFinanceOwnerIds(currentMemberPaymentOwner.studentId)).toEqual([
      currentMemberPaymentOwner.studentId,
      ...currentMemberPaymentOwner.legacyStudentIds,
    ]);
    expect(studentFinanceOwnerIds("STUDENT-OTHER")).toEqual(["STUDENT-OTHER"]);
  });

  it("does not expose another Student's invoices", () => {
    expect(selectStudentRegistrationInvoices([currentInvoice], "STUDENT-OTHER"))
      .toEqual([]);
  });

  it.each([
    ["paid", "pending", "paid"],
    ["cancelled", "rejected", "cancelled"],
    ["locked", "pending", "locked"],
  ] as const)("keeps canonical %s state ahead of stale %s evidence", (invoiceStatus, paymentStatus, expected) => {
    expect(resolveStudentInvoiceDisplayStatus(
      { ...currentInvoice, status: invoiceStatus },
      paymentStatus,
      "2026-08-18T03:00:00.000Z",
    )).toBe(expected);
  });

  it("shows review states only while the invoice can accept payment evidence", () => {
    const awaiting = {
      ...currentInvoice,
      status: "awaiting_payment" as const,
      dueAt: "2026-08-20T23:59:59+07:00",
    };
    expect(resolveStudentInvoiceDisplayStatus(awaiting, "pending", "2026-08-19T03:00:00.000Z"))
      .toBe("pending_review");
    expect(resolveStudentInvoiceDisplayStatus(awaiting, "rejected", "2026-08-21T03:00:00.000Z"))
      .toBe("payment_rejected");
  });
});
