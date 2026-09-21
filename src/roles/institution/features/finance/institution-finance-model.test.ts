import { describe, expect, it } from "vitest";

import type { Payment } from "@/providers/mock-db-provider";
import type { UserAuditEvent } from "@/roles/shared/features/audit";
import type { RegistrationInvoice } from "@/roles/shared/features/finance";
import type { RegistrationRecord } from "@/roles/shared/features/registration";

import { buildInstitutionFinanceRows } from "./institution-finance-model";

const sirirajRegistration = {
  id: "REG-SIRIRAJ",
  studentId: "STUDENT-SIRIRAJ",
  studentName: "ผู้เรียนศิริราช",
  courseCode: "BCP-101",
  courseTitle: "เภสัชบำบัดพื้นฐาน",
  institutionId: "org-inst-siriraj",
} as RegistrationRecord;

const chulaRegistration = {
  id: "REG-CHULA",
  studentId: "STUDENT-CHULA",
  studentName: "ผู้เรียนจุฬาฯ",
  courseCode: "BCP-201",
  courseTitle: "เภสัชบำบัดขั้นสูง",
  institutionId: "org-inst-chula",
} as RegistrationRecord;

function invoice(registration: RegistrationRecord): RegistrationInvoice {
  return {
    id: `INV-${registration.id}`,
    registrationId: registration.id,
    studentId: registration.studentId,
    description: `ค่าลงทะเบียน ${registration.courseCode}`,
    baseAmount: 3_000,
    status: "awaiting_payment",
    createdAt: "2026-08-01T03:00:00.000Z",
    updatedAt: "2026-08-01T03:00:00.000Z",
    dueAt: "2026-08-31T16:59:59.000Z",
  };
}

function payment(registration: RegistrationRecord): Payment {
  return {
    id: `PAY-${registration.id}`,
    invoiceId: `INV-${registration.id}`,
    studentId: registration.studentId,
    name: registration.studentName,
    program: "เภสัชบำบัด",
    amount: 3_000,
    date: "3 ส.ค. 2569",
    status: "pending",
    type: `ค่าลงทะเบียน ${registration.courseCode}`,
    method: "promptpay",
    referenceNo: `REF-${registration.id}`,
    submittedAt: "2026-08-03T03:00:00.000Z",
    evidenceFileName: `${registration.id}.png`,
    evidenceFileType: "image/png",
    evidenceFileSize: 5,
    evidenceDataUrl: "data:image/png;base64,cHJvb2Y=",
  };
}

function audit(registration: RegistrationRecord): UserAuditEvent {
  return {
    schemaVersion: 1,
    id: `AUDIT-${registration.id}`,
    actor: {
      userId: "staff-001",
      userName: "เจ้าหน้าที่",
      role: "royal_college_staff",
      organisation: {
        id: "org-royal-college",
        code: "RPC",
        name: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย",
        kind: "royal_college",
      },
      resourceScopes: ["staff:central"],
    },
    action: "payment.exception",
    resource: { type: "invoice", id: `INV-${registration.id}` },
    before: { phase: "reconciliation" },
    after: { phase: "reconciliation" },
    reason: "ทดสอบขอบเขตข้อมูล",
    evidenceReference: `REF-${registration.id}`,
    occurredAt: "2026-08-04T03:00:00.000Z",
  };
}

describe("institution finance model", () => {
  it("returns only rows linked to the exact institution and removes mutation actions", () => {
    const rows = buildInstitutionFinanceRows({
      institutionId: "org-inst-siriraj",
      registrations: [sirirajRegistration, chulaRegistration],
      invoices: [invoice(sirirajRegistration), invoice(chulaRegistration)],
      payments: [payment(sirirajRegistration), payment(chulaRegistration)],
      auditEvents: [audit(sirirajRegistration), audit(chulaRegistration)],
      now: "2026-08-05T03:00:00.000Z",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      registrationId: sirirajRegistration.id,
      latestPayment: { id: `PAY-${sirirajRegistration.id}` },
      allowedActions: [],
    });
  });

  it("returns no finance data without a resolved institution scope", () => {
    expect(buildInstitutionFinanceRows({
      institutionId: "",
      registrations: [sirirajRegistration],
      invoices: [invoice(sirirajRegistration)],
      payments: [payment(sirirajRegistration)],
      auditEvents: [],
    })).toEqual([]);
  });
});
