import { resolveMockPaymentOwner } from "@/roles/shared/data";
import {
  resolveInvoiceStatus,
  type InvoiceDisplayStatus,
  RegistrationInvoice,
} from "@/roles/shared/features/finance";

export type StudentInvoiceDisplayStatus =
  | InvoiceDisplayStatus
  | "pending_review"
  | "payment_rejected";

export function promptPaySubmissionStatus(): "pending" {
  return "pending";
}

export function resolveStudentInvoiceDisplayStatus(
  invoice: RegistrationInvoice,
  latestPaymentStatus: "pending" | "rejected" | null | undefined,
  now: Date | string = new Date(),
): StudentInvoiceDisplayStatus {
  const invoiceStatus = resolveInvoiceStatus(invoice, now);
  const acceptsPaymentEvidence = invoiceStatus === "awaiting_payment" || invoiceStatus === "overdue";

  if (!acceptsPaymentEvidence) return invoiceStatus;
  if (latestPaymentStatus === "pending") return "pending_review";
  if (latestPaymentStatus === "rejected") return "payment_rejected";
  return invoiceStatus;
}

export function studentFinanceOwnerIds(studentId: string) {
  const normalizedStudentId = studentId.trim();
  if (!normalizedStudentId) return [];
  const owner = resolveMockPaymentOwner(normalizedStudentId);
  return [owner.studentId, ...(owner.legacyStudentIds ?? [])];
}

export function selectStudentRegistrationInvoices(
  invoices: readonly RegistrationInvoice[],
  studentId: string,
) {
  const ownerIds = new Set(studentFinanceOwnerIds(studentId));
  return invoices.filter((invoice) => ownerIds.has(invoice.studentId));
}
