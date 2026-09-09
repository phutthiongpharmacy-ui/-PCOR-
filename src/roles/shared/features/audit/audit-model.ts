import {
  isOrganisationScope,
  isSystemRole,
  type OrganisationScope,
  type SystemRole,
} from "@/roles/shared/features/roles/access-model";
import type { PortalSession } from "@/roles/shared/features/roles/mock-login";

export const AUDIT_ACTIONS = [
  "sensitive_data.view",
  "sensitive_data.export",
  "registration.request_information",
  "registration.approve",
  "registration.reject",
  "admission.documents_reviewed",
  "admission.request_information",
  "admission.approve",
  "admission.reject",
  "request.request_information",
  "request.review_complete",
  "request.reject",
  "teaching_assignment.change",
  "course_offering.update",
  "course_proposal.submit",
  "course_proposal.resubmit",
  "course_proposal.review",
  "result.publish",
  "result.revise",
  "payment.confirmed",
  "payment.review_approved",
  "payment.review_rejected",
  "payment.reconcile",
  "payment.exception",
  "payment.cancel",
  "payment.refund",
  "document.prepare",
  "document.sign",
  "document.reject",
  "business_record.create",
  "business_record.update",
  "access.role_scope_change",
  "access.break_glass",
] as const;

export type KnownAuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditActorRole = SystemRole | "system_actor";

export interface AuditActorSnapshot {
  userId: string;
  userName: string;
  role: AuditActorRole;
  organisation: OrganisationScope;
  resourceScopes: readonly string[];
}

export interface AuditResourceSnapshot {
  type: string;
  id: string;
  label?: string;
  organisationId?: string;
}

export interface AuditEventInput {
  actor: AuditActorSnapshot;
  action: string;
  resource: AuditResourceSnapshot;
  before: unknown;
  after: unknown;
  reason?: string;
  evidenceReference?: string;
  occurredAt?: string;
}

export interface UserAuditEvent {
  schemaVersion: 1;
  id: string;
  actor: AuditActorSnapshot;
  action: string;
  resource: AuditResourceSnapshot;
  before: unknown;
  after: unknown;
  reason?: string;
  evidenceReference?: string;
  occurredAt: string;
}

const REASON_REQUIRED_ACTIONS = new Set<string>([
  "registration.request_information",
  "registration.approve",
  "registration.reject",
  "admission.documents_reviewed",
  "admission.request_information",
  "admission.approve",
  "admission.reject",
  "request.request_information",
  "request.review_complete",
  "request.reject",
  "teaching_assignment.change",
  "course_offering.update",
  "course_proposal.submit",
  "course_proposal.resubmit",
  "course_proposal.review",
  "result.publish",
  "result.revise",
  "payment.review_approved",
  "payment.review_rejected",
  "payment.exception",
  "payment.cancel",
  "payment.refund",
  "document.reject",
  "business_record.update",
  "access.role_scope_change",
  "access.break_glass",
]);

const EVIDENCE_REQUIRED_ACTIONS = new Set<string>([
  "payment.review_approved",
  "payment.review_rejected",
  "payment.exception",
  "payment.cancel",
  "payment.refund",
]);

function cloneAuditValue(value: unknown) {
  if (value === undefined) return null;
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return null;
  return JSON.parse(serialized) as unknown;
}

function makeAuditId(occurredAt: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2);
  return `audit-${new Date(occurredAt).getTime().toString(36)}-${randomId}`;
}

export function createAuditActorSnapshot(session: PortalSession): AuditActorSnapshot {
  return {
    userId: session.userId,
    userName: session.displayName,
    role: session.role,
    organisation: { ...session.organisation },
    resourceScopes: [...session.resourceScopes],
  };
}

export function createAuditEvent(input: AuditEventInput): UserAuditEvent {
  const action = input.action.trim();
  const resourceType = input.resource.type.trim();
  const resourceId = input.resource.id.trim();
  const reason = input.reason?.trim();
  const evidenceReference = input.evidenceReference?.trim();
  const occurredAt = input.occurredAt ?? new Date().toISOString();

  if (!input.actor.userId.trim() || !input.actor.userName.trim()) {
    throw new Error("Audit actor requires user ID and name");
  }
  if (!(isSystemRole(input.actor.role) || input.actor.role === "system_actor") || !isOrganisationScope(input.actor.organisation)) {
    throw new Error("Audit actor role or organisation is invalid");
  }
  if (
    !Array.isArray(input.actor.resourceScopes) ||
    !input.actor.resourceScopes.every((scope) => typeof scope === "string")
  ) {
    throw new Error("Audit actor resource scope is invalid");
  }
  if (!action || !resourceType || !resourceId) {
    throw new Error("Audit action and resource are required");
  }
  if (!Number.isFinite(new Date(occurredAt).getTime())) {
    throw new Error("Audit timestamp is invalid");
  }
  if (REASON_REQUIRED_ACTIONS.has(action) && !reason) {
    throw new Error(`Audit action ${action} requires a reason`);
  }
  if (EVIDENCE_REQUIRED_ACTIONS.has(action) && !evidenceReference) {
    throw new Error(`Audit action ${action} requires an evidence reference`);
  }

  return {
    schemaVersion: 1,
    id: makeAuditId(occurredAt),
    actor: {
      userId: input.actor.userId.trim(),
      userName: input.actor.userName.trim(),
      role: input.actor.role,
      organisation: { ...input.actor.organisation },
      resourceScopes: [...input.actor.resourceScopes],
    },
    action,
    resource: {
      type: resourceType,
      id: resourceId,
      ...(input.resource.label?.trim() ? { label: input.resource.label.trim() } : {}),
      ...(input.resource.organisationId?.trim()
        ? { organisationId: input.resource.organisationId.trim() }
        : {}),
    },
    before: cloneAuditValue(input.before),
    after: cloneAuditValue(input.after),
    ...(reason ? { reason } : {}),
    ...(evidenceReference ? { evidenceReference } : {}),
    occurredAt,
  };
}

export function isUserAuditEvent(value: unknown): value is UserAuditEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<UserAuditEvent>;
  const actor = event.actor as Partial<AuditActorSnapshot> | undefined;
  const resource = event.resource as Partial<AuditResourceSnapshot> | undefined;
  return event.schemaVersion === 1 &&
    typeof event.id === "string" &&
    Boolean(actor) &&
    typeof actor?.userId === "string" &&
    typeof actor.userName === "string" &&
    (isSystemRole(actor.role) || actor.role === "system_actor") &&
    isOrganisationScope(actor.organisation) &&
    Array.isArray(actor.resourceScopes) &&
    actor.resourceScopes.every((scope) => typeof scope === "string") &&
    typeof event.action === "string" &&
    Boolean(resource) &&
    typeof resource?.type === "string" &&
    typeof resource.id === "string" &&
    (resource.label === undefined || typeof resource.label === "string") &&
    (resource.organisationId === undefined || typeof resource.organisationId === "string") &&
    Object.prototype.hasOwnProperty.call(event, "before") &&
    Object.prototype.hasOwnProperty.call(event, "after") &&
    (event.reason === undefined || typeof event.reason === "string") &&
    (event.evidenceReference === undefined || typeof event.evidenceReference === "string") &&
    typeof event.occurredAt === "string" &&
    Number.isFinite(new Date(event.occurredAt).getTime());
}
