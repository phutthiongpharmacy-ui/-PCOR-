import type { Payment } from "@/providers/mock-db-provider";
import type { UserAuditEvent } from "@/roles/shared/features/audit";
import {
  getInvoiceBreakdown,
  resolveInvoiceStatus,
  type RegistrationInvoice,
} from "@/roles/shared/features/finance";
import type { RegistrationRecord } from "@/roles/shared/features/registration";

export type StaffPaymentState =
  | "locked"
  | "awaiting_payment"
  | "overdue"
  | "pending_verification"
  | "rejected"
  | "paid"
  | "cancelled"
  | "refunded";

export type StaffReconciliationState = "not_ready" | "pending" | "exception" | "reconciled";
export type StaffFinanceAction = "approve_payment" | "reject_payment" | "reconcile" | "exception";
export type StaffFinancePeriod = "all" | "today" | "month" | "custom";

export interface StaffFinanceRow {
  id: string;
  registrationId: string;
  studentId: string;
  studentName: string;
  courseCode: string;
  courseTitle: string;
  description: string;
  baseAmount: number;
  lateFee: number;
  amountDue: number;
  expectedPaymentAmount: number;
  submittedAmount?: number;
  paymentAmountMatchesInvoice: boolean;
  evidenceDataUrl?: string;
  hasInspectableEvidence: boolean;
  receivedAmount: number;
  receivedAt?: string;
  paymentState: StaffPaymentState;
  reconciliationState: StaffReconciliationState;
  latestPayment?: Payment;
  latestLifecycleEvent?: UserAuditEvent;
  latestReconciliationEvent?: UserAuditEvent;
  allowedActions: readonly StaffFinanceAction[];
}

export interface StaffFinanceFilters {
  query: string;
  paymentState: StaffPaymentState | "all";
  reconciliationState: StaffReconciliationState | "all";
}

export interface StaffFinanceSummary {
  totalReceived: number;
  receivedBaseAmount: number;
  receivedLateFees: number;
  awaitingAmount: number;
  overdueAmount: number;
  overdueCount: number;
  pendingVerificationAmount: number;
  pendingVerificationCount: number;
  pendingReconciliationAmount: number;
  pendingReconciliationCount: number;
  exceptionCount: number;
}

export function staffFinanceDisplayAmount(row: StaffFinanceRow) {
  if (row.paymentState === "refunded") return 0;
  if (row.receivedAmount > 0) return row.receivedAmount;
  if (row.paymentState === "pending_verification") return row.submittedAmount ?? row.amountDue;
  return row.amountDue;
}

export function staffFinanceDisplayLateFee(row: StaffFinanceRow) {
  if (row.paymentState === "refunded") return 0;
  return row.receivedAmount > 0
    ? Math.max(0, row.receivedAmount - row.baseAmount)
    : row.lateFee;
}

function timestamp(value?: string) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function latestPaymentForInvoice(payments: readonly Payment[], invoiceId: string) {
  return payments
    .filter((payment) => payment.invoiceId === invoiceId)
    .map((payment, index) => ({ payment, index }))
    .sort((left, right) => (
      timestamp(right.payment.submittedAt) - timestamp(left.payment.submittedAt) || left.index - right.index
    ))[0]?.payment;
}

function latestApprovedPaymentForInvoice(payments: readonly Payment[], invoiceId: string) {
  return payments
    .filter((payment) => payment.invoiceId === invoiceId && payment.status === "approved")
    .map((payment, index) => ({ payment, index }))
    .sort((left, right) => (
      timestamp(right.payment.submittedAt) - timestamp(left.payment.submittedAt) || left.index - right.index
    ))[0]?.payment;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function lifecycleStateFromEvent(event: UserAuditEvent): "cancelled" | "refunded" | null {
  if (!isRecord(event.after)) return null;
  if (event.action === "payment.cancel" && event.after.status === "cancelled") return "cancelled";
  if (event.action === "payment.refund" && event.after.status === "refunded") return "refunded";
  return null;
}

function latestLifecycleEvent(
  events: readonly UserAuditEvent[],
  invoice: RegistrationInvoice,
) {
  const invoiceUpdatedAt = timestamp(invoice.updatedAt);
  return events
    .map((event, index) => ({ event, index, state: lifecycleStateFromEvent(event) }))
    .filter((entry): entry is { event: UserAuditEvent; index: number; state: "cancelled" | "refunded" } => (
      Boolean(entry.state) &&
      entry.event.resource.type === "invoice" &&
      entry.event.resource.id === invoice.id &&
      timestamp(entry.event.occurredAt) >= invoiceUpdatedAt
    ))
    .sort((left, right) => (
      timestamp(right.event.occurredAt) - timestamp(left.event.occurredAt) || right.index - left.index
    ))[0];
}

const MAX_INSPECTABLE_EVIDENCE_BYTES = 1024 * 1024;
const EVIDENCE_DATA_URL = /^data:(image\/jpeg|image\/png|application\/pdf);base64,[A-Za-z0-9+/]+=*$/;

function inspectableEvidenceDataUrl(payment?: Payment) {
  if (
    !payment?.evidenceDataUrl ||
    !payment.evidenceFileSize ||
    payment.evidenceFileSize > MAX_INSPECTABLE_EVIDENCE_BYTES ||
    !EVIDENCE_DATA_URL.test(payment.evidenceDataUrl)
  ) return undefined;
  return payment.evidenceDataUrl;
}

function reconciliationStateFromEvent(event: UserAuditEvent): StaffReconciliationState | null {
  if (event.action === "payment.reconcile") return "reconciled";
  if (event.action !== "payment.exception") return null;
  if (isRecord(event.after) && event.after.phase === "payment_verification") return null;
  return "exception";
}

function latestReconciliationEvent(events: readonly UserAuditEvent[], invoiceId: string) {
  return events
    .filter((event) => event.resource.type === "invoice" && event.resource.id === invoiceId)
    .map((event) => ({ event, state: reconciliationStateFromEvent(event) }))
    .filter((entry): entry is { event: UserAuditEvent; state: Exclude<StaffReconciliationState, "not_ready" | "pending"> } => Boolean(entry.state))
    .sort((left, right) => timestamp(right.event.occurredAt) - timestamp(left.event.occurredAt))[0];
}

function allowedActions(
  paymentState: StaffPaymentState,
  reconciliationState: StaffReconciliationState,
  canApprovePayment: boolean,
): readonly StaffFinanceAction[] {
  if (paymentState === "pending_verification") {
    return canApprovePayment ? ["approve_payment", "reject_payment"] : ["reject_payment"];
  }
  if (paymentState !== "paid") return [];
  if (reconciliationState === "pending") return ["reconcile", "exception"];
  if (reconciliationState === "exception") return ["reconcile"];
  if (reconciliationState === "reconciled") return ["exception"];
  return [];
}

export function buildStaffFinanceRows(input: {
  invoices: readonly RegistrationInvoice[];
  registrations: readonly RegistrationRecord[];
  payments: readonly Payment[];
  auditEvents: readonly UserAuditEvent[];
  now?: Date | string;
}): StaffFinanceRow[] {
  const now = input.now ?? new Date();
  const registrationById = new Map(input.registrations.map((registration) => [registration.id, registration]));

  return input.invoices.map((invoice) => {
    const registration = registrationById.get(invoice.registrationId);
    const latestPayment = latestPaymentForInvoice(input.payments, invoice.id);
    const approvedPayment = latestApprovedPaymentForInvoice(input.payments, invoice.id);
    const invoiceState = resolveInvoiceStatus(invoice, now);
    const lifecycle = latestLifecycleEvent(input.auditEvents, invoice);
    const canHaveSubmittedEvidence = invoiceState === "awaiting_payment" || invoiceState === "overdue";
    let paymentState: StaffPaymentState;
    if (lifecycle) paymentState = lifecycle.state;
    else if (invoiceState === "paid") paymentState = "paid";
    else if (invoiceState === "cancelled") paymentState = "cancelled";
    else if (canHaveSubmittedEvidence && latestPayment?.status === "pending") paymentState = "pending_verification";
    else if (canHaveSubmittedEvidence && latestPayment?.status === "rejected") paymentState = "rejected";
    else paymentState = invoiceState;
    const reconciliation = paymentState === "paid"
      ? latestReconciliationEvent(input.auditEvents, invoice.id)
      : undefined;
    const reconciliationState: StaffReconciliationState = paymentState !== "paid"
      ? "not_ready"
      : reconciliation?.state ?? "pending";
    const submittedAt = latestPayment?.status === "pending" && latestPayment.submittedAt
      ? latestPayment.submittedAt
      : now;
    const breakdown = getInvoiceBreakdown(invoice, submittedAt);
    const expectedPaymentAmount = breakdown.total;
    const submittedAmount = latestPayment?.status === "pending" ? latestPayment.amount : undefined;
    const paymentAmountMatchesInvoice = submittedAmount === undefined || (
      Number.isFinite(submittedAmount) && Math.abs(submittedAmount - expectedPaymentAmount) < 0.01
    );
    const evidenceDataUrl = inspectableEvidenceDataUrl(latestPayment);
    const hasInspectableEvidence = Boolean(evidenceDataUrl);
    const receivedBeforeLifecycle = invoice.status === "paid"
      ? approvedPayment?.amount ?? invoice.baseAmount
      : 0;
    const receivedAmount = paymentState === "refunded" ? 0 : receivedBeforeLifecycle;

    return {
      id: invoice.id,
      registrationId: invoice.registrationId,
      studentId: invoice.studentId,
      studentName: registration?.studentName ?? latestPayment?.name ?? "ผู้เข้ารับการฝึกอบรม",
      courseCode: registration?.courseCode ?? "ไม่ระบุรหัส",
      courseTitle: registration?.courseTitle ?? invoice.description,
      description: invoice.description,
      baseAmount: invoice.baseAmount,
      lateFee: breakdown.lateFee,
      amountDue: breakdown.total,
      expectedPaymentAmount,
      submittedAmount,
      paymentAmountMatchesInvoice,
      evidenceDataUrl,
      hasInspectableEvidence,
      receivedAmount,
      receivedAt: invoice.paidAt ?? approvedPayment?.submittedAt,
      paymentState,
      reconciliationState,
      latestPayment,
      latestLifecycleEvent: lifecycle?.event,
      latestReconciliationEvent: reconciliation?.event,
      allowedActions: allowedActions(
        paymentState,
        reconciliationState,
        hasInspectableEvidence && paymentAmountMatchesInvoice,
      ),
    };
  });
}

export function filterStaffFinanceRows(
  rows: readonly StaffFinanceRow[],
  filters: StaffFinanceFilters,
) {
  const query = filters.query.trim().toLocaleLowerCase("th-TH");
  return rows.filter((row) => (
    (filters.paymentState === "all" || row.paymentState === filters.paymentState) &&
    (filters.reconciliationState === "all" || row.reconciliationState === filters.reconciliationState) &&
    (!query || [row.id, row.registrationId, row.studentId, row.studentName, row.courseCode, row.courseTitle, row.description, row.latestPayment?.referenceNo]
      .some((value) => value?.toLocaleLowerCase("th-TH").includes(query)))
  ));
}

export function bangkokDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function receivedRowsForPeriod(input: {
  rows: readonly StaffFinanceRow[];
  period: StaffFinancePeriod;
  now?: Date | string;
  from?: string;
  to?: string;
}) {
  const today = bangkokDateKey(input.now ?? new Date());
  return input.rows.filter((row) => {
    if (row.receivedAmount <= 0 || row.paymentState === "refunded" || !row.receivedAt) return false;
    const receivedDate = bangkokDateKey(row.receivedAt);
    if (!receivedDate) return false;
    if (input.period === "all") return true;
    if (input.period === "today") return receivedDate === today;
    if (input.period === "month") return receivedDate.slice(0, 7) === today.slice(0, 7);
    return (!input.from || receivedDate >= input.from) && (!input.to || receivedDate <= input.to);
  });
}

export function summarizeStaffFinance(
  rows: readonly StaffFinanceRow[],
  receivedRows: readonly StaffFinanceRow[] = rows.filter((row) => row.receivedAmount > 0 && row.paymentState !== "refunded"),
): StaffFinanceSummary {
  return {
    totalReceived: receivedRows.reduce((sum, row) => sum + row.receivedAmount, 0),
    receivedBaseAmount: receivedRows.reduce((sum, row) => sum + Math.min(row.baseAmount, row.receivedAmount), 0),
    receivedLateFees: receivedRows.reduce((sum, row) => sum + Math.max(0, row.receivedAmount - row.baseAmount), 0),
    awaitingAmount: rows
      .filter((row) => row.paymentState === "awaiting_payment" || row.paymentState === "rejected")
      .reduce((sum, row) => sum + row.amountDue, 0),
    overdueAmount: rows.filter((row) => row.paymentState === "overdue").reduce((sum, row) => sum + row.amountDue, 0),
    overdueCount: rows.filter((row) => row.paymentState === "overdue").length,
    pendingVerificationAmount: rows
      .filter((row) => row.paymentState === "pending_verification")
      .reduce((sum, row) => sum + (row.submittedAmount ?? row.amountDue), 0),
    pendingVerificationCount: rows.filter((row) => row.paymentState === "pending_verification").length,
    pendingReconciliationAmount: rows.filter((row) => row.reconciliationState === "pending").reduce((sum, row) => sum + row.receivedAmount, 0),
    pendingReconciliationCount: rows.filter((row) => row.reconciliationState === "pending").length,
    exceptionCount: rows.filter((row) => row.reconciliationState === "exception").length,
  };
}

export function receivedBreakdownByCourse(rows: readonly StaffFinanceRow[]) {
  const totals = new Map<string, { label: string; amount: number }>();
  rows.forEach((row) => {
    const key = `${row.courseCode}:${row.courseTitle}`;
    const current = totals.get(key);
    totals.set(key, {
      label: `${row.courseCode} · ${row.courseTitle}`,
      amount: (current?.amount ?? 0) + row.receivedAmount,
    });
  });
  return [...totals.values()].sort((left, right) => right.amount - left.amount);
}
