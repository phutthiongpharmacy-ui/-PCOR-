import type { Payment } from "@/providers/mock-db-provider";
import type { UserAuditEvent } from "@/roles/shared/features/audit";
import type { RegistrationInvoice } from "@/roles/shared/features/finance";
import type { RegistrationRecord } from "@/roles/shared/features/registration";
import {
  buildStaffFinanceRows,
  type StaffFinanceRow,
} from "@/roles/staff/features/finance/staff-finance-model";

export function buildInstitutionFinanceRows(input: {
  institutionId: string;
  invoices: readonly RegistrationInvoice[];
  registrations: readonly RegistrationRecord[];
  payments: readonly Payment[];
  auditEvents: readonly UserAuditEvent[];
  now?: Date | string;
}): StaffFinanceRow[] {
  if (!input.institutionId) return [];

  const registrations = input.registrations.filter((registration) => (
    registration.institutionId === input.institutionId
  ));
  const registrationIds = new Set(registrations.map((registration) => registration.id));
  const invoices = input.invoices.filter((invoice) => registrationIds.has(invoice.registrationId));
  const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
  const payments = input.payments.filter((payment) => (
    Boolean(payment.invoiceId && invoiceIds.has(payment.invoiceId))
  ));
  const auditEvents = input.auditEvents.filter((event) => (
    event.resource.type === "invoice" && invoiceIds.has(event.resource.id)
  ));

  return buildStaffFinanceRows({
    invoices,
    registrations,
    payments,
    auditEvents,
    now: input.now,
  }).map((row) => ({ ...row, allowedActions: [] }));
}
