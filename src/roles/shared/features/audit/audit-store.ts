import { ORGANISATIONS } from "@/roles/shared/features/roles/access-model";

import {
  createAuditEvent,
  isUserAuditEvent,
  type AuditEventInput,
  type UserAuditEvent,
} from "./audit-model";

export const AUDIT_STORAGE_KEY = "royal-college.user-audit.v1";
export const AUDIT_STORE_EVENT = "royal-college:user-audit-updated";

export const DEFAULT_AUDIT_EVENTS: readonly UserAuditEvent[] = [
  {
    schemaVersion: 1,
    id: "audit-seed-registration-approved",
    actor: {
      userId: "teacher-001",
      userName: "อ. ภก. กิตติพงศ์ วัฒนเภสัช",
      role: "teacher",
      organisation: ORGANISATIONS.siriraj,
      resourceScopes: ["course:offering-bcp-101"],
    },
    action: "registration.approve",
    resource: {
      type: "registration",
      id: "REG-2569-001",
      label: "คำขอลงทะเบียน BCP-101",
      organisationId: ORGANISATIONS.siriraj.id,
    },
    before: { status: "pending_teacher_review" },
    after: { status: "awaiting_payment" },
    reason: "ตรวจคุณสมบัติและข้อมูลรายวิชาครบถ้วน",
    evidenceReference: "ELIG-2569-001",
    occurredAt: "2026-08-10T03:15:00.000Z",
  },
  {
    schemaVersion: 1,
    id: "audit-seed-payment-exception",
    actor: {
      userId: "staff-001",
      userName: "ภญ. ปาริชาติ สุขเกษม",
      role: "royal_college_staff",
      organisation: ORGANISATIONS.royalCollege,
      resourceScopes: ["*"],
    },
    action: "payment.exception",
    resource: {
      type: "invoice",
      id: "INV-2569-002",
      label: "รายการตรวจสอบที่ผิดปกติ",
      organisationId: ORGANISATIONS.royalCollege.id,
    },
    before: { status: "paid", matched: false },
    after: { status: "exception", matched: false },
    reason: "ยอดชำระไม่ตรงกับเลขอ้างอิง",
    evidenceReference: "PAY-REF-2569-002",
    occurredAt: "2026-08-10T04:30:00.000Z",
  },
  {
    schemaVersion: 1,
    id: "audit-seed-document-signed",
    actor: {
      userId: "president-vpt-current",
      userName: "ภก. รศ. ดร. ธนกฤต ศรีวิชัย",
      role: "president",
      organisation: ORGANISATIONS.therapeuticCollege,
      resourceScopes: ["signature:college"],
    },
    action: "document.sign",
    resource: {
      type: "document",
      id: "DOC-2569-003",
      label: "หนังสือรับรองการฝึกอบรม",
      organisationId: ORGANISATIONS.therapeuticCollege.id,
    },
    before: { status: "awaiting_college_signature" },
    after: { status: "signed" },
    reason: "ตรวจเอกสารและหลักฐานต้นทางครบถ้วน",
    evidenceReference: "DOC-FINGERPRINT-2569-003",
    occurredAt: "2026-08-10T05:45:00.000Z",
  },
] as const;

function cloneEvent(event: UserAuditEvent): UserAuditEvent {
  return JSON.parse(JSON.stringify(event)) as UserAuditEvent;
}

function cloneDefaults() {
  return DEFAULT_AUDIT_EVENTS.map(cloneEvent);
}

export function readAuditEvents(): UserAuditEvent[] {
  const serialized = window.localStorage.getItem(AUDIT_STORAGE_KEY);
  if (!serialized) return cloneDefaults();
  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed) || !parsed.every(isUserAuditEvent)) {
    throw new Error("รูปแบบข้อมูล User Audit Log ไม่ถูกต้อง");
  }
  return parsed.map(cloneEvent);
}

export function appendAuditEvent(input: AuditEventInput | UserAuditEvent) {
  const event = isUserAuditEvent(input)
    ? {
        ...createAuditEvent({
          actor: input.actor,
          action: input.action,
          resource: input.resource,
          before: input.before,
          after: input.after,
          reason: input.reason,
          evidenceReference: input.evidenceReference,
          occurredAt: input.occurredAt,
        }),
        id: input.id,
      }
    : createAuditEvent(input);
  const current = readAuditEvents();
  if (current.some((item) => item.id === event.id)) {
    throw new Error(`Audit event ${event.id} already exists`);
  }
  window.localStorage.setItem(
    AUDIT_STORAGE_KEY,
    JSON.stringify([...current, event]),
  );
  window.dispatchEvent(new Event(AUDIT_STORE_EVENT));
  return cloneEvent(event);
}

export function getAuditStorageSnapshot() {
  return window.localStorage.getItem(AUDIT_STORAGE_KEY) ?? "audit:defaults";
}

export function subscribeToAuditStore(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(AUDIT_STORE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(AUDIT_STORE_EVENT, onStoreChange);
  };
}
