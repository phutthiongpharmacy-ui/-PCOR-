"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { FileMetadata } from "@/roles/shared/features/file-metadata";
import {
  HISTORICAL_REQUESTS,
  getRequestCategory,
  isHandwrittenSignature,
  progressForStatus,
  type HandwrittenSignature,
  type MockESignature,
  type MockRequest,
  type RequestActorRole,
  type RequestCategoryId,
  type RequestComment,
  type RequestCourseSnapshot,
  type RequestDocument,
  type RequestEvent,
  type RequestEventType,
  type RequestStatus,
  type SignatureLevel,
  type SignatureWorkflow,
  type SignatureWorkflowKind,
  type SignatureWorkflowStep,
} from "./request-schema";

const STORAGE_KEY = "royal-college.mock-requests.v2";
const LEGACY_STORAGE_KEY = "royal-college.mock-requests.v1";
const STORAGE_EVENT = "royal-college:requests-updated";

function cloneHandwrittenSignature(signature: HandwrittenSignature): HandwrittenSignature {
  return {
    version: 1,
    strokes: signature.strokes.map((stroke) => stroke.map((point) => ({ ...point }))),
  };
}

function cloneMockSignature(signature: MockESignature): MockESignature {
  return {
    ...signature,
    handwrittenSignature: signature.handwrittenSignature
      ? cloneHandwrittenSignature(signature.handwrittenSignature)
      : undefined,
  };
}

function cloneRequest(request: MockRequest): MockRequest {
  return {
    ...request,
    requester: { ...request.requester },
    fields: request.fields.map((field) => ({ ...field })),
    courses: request.courses.map((course) => ({ ...course })),
    documents: request.documents.map((document) => ({
      ...document,
      file: document.file ? { ...document.file } : undefined,
    })),
    comments: request.comments.map((comment) => ({ ...comment })),
    events: request.events.map((event) => ({ ...event })),
    progress: [...request.progress],
    mockSignature: request.mockSignature ? cloneMockSignature(request.mockSignature) : undefined,
    signatures: request.signatures?.map(cloneMockSignature),
    signatureWorkflow: request.signatureWorkflow ? {
      ...request.signatureWorkflow,
      preparedBy: { ...request.signatureWorkflow.preparedBy },
      steps: request.signatureWorkflow.steps.map((step) => ({ ...step })),
    } : undefined,
  };
}

function cloneHistoricalRequests() {
  return HISTORICAL_REQUESTS.map(cloneRequest);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function normalizeStatus(value: unknown): RequestStatus | null {
  if (value === "pending") return "staff_review";
  if (value === "approved") return "signed";
  if (
    value === "staff_review" ||
    value === "needs_information" ||
    value === "awaiting_president_signature" ||
    value === "signed" ||
    value === "rejected"
  ) {
    return value;
  }
  return null;
}

function normalizeCategory(value: unknown): RequestCategoryId | "legacy" | null {
  if (
    value === "exam" ||
    value === "certificate" ||
    value === "training" ||
    value === "credit_transfer" ||
    value === "internship_letter" ||
    value === "completion" ||
    value === "legacy"
  ) {
    return value;
  }
  return null;
}

function normalizeFile(value: unknown): FileMetadata | undefined {
  if (!isObject(value)) return undefined;
  if (
    !isString(value.name) ||
    !isString(value.type) ||
    typeof value.size !== "number" ||
    typeof value.lastModified !== "number"
  ) {
    return undefined;
  }
  return {
    name: value.name,
    type: value.type,
    size: value.size,
    lastModified: value.lastModified,
  };
}

function normalizeCourses(value: unknown): RequestCourseSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((course) => {
    if (
      !isObject(course) ||
      !isString(course.code) ||
      !isString(course.title) ||
      typeof course.credits !== "number"
    ) {
      return [];
    }
    return [{
      code: course.code,
      title: course.title,
      credits: course.credits,
      term: isString(course.term) ? course.term : undefined,
      schedule: isString(course.schedule) ? course.schedule : undefined,
    }];
  });
}

function normalizeDocuments(
  value: unknown,
  legacyAttachment: unknown,
  categoryId: RequestCategoryId | "legacy",
): RequestDocument[] {
  if (Array.isArray(value)) {
    return value.flatMap((document) => {
      if (!isObject(document) || !isString(document.id) || !isString(document.label)) {
        return [];
      }
      const reviewStatus = document.reviewStatus === "accepted" ||
        document.reviewStatus === "missing" ||
        document.reviewStatus === "not_applicable"
        ? document.reviewStatus
        : "pending";
      return [{
        id: document.id,
        label: document.label,
        required: document.required === true,
        file: normalizeFile(document.file),
        reviewStatus,
        reviewerNote: isString(document.reviewerNote) ? document.reviewerNote : undefined,
      }];
    });
  }

  const file = normalizeFile(legacyAttachment);
  if (file) {
    return [{
      id: "legacy-attachment",
      label: "ไฟล์แนบจากระบบเดิม",
      required: false,
      file,
      reviewStatus: "pending",
    }];
  }

  if (categoryId === "legacy") return [];
  return (getRequestCategory(categoryId)?.documents ?? []).map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    required: requirement.required ?? false,
    reviewStatus: "not_applicable",
  }));
}

function normalizeActorRole(value: unknown): RequestActorRole | null {
  if (value === "member") return "student";
  if (value === "staff") return "royal_college_staff";
  if (value === "student" || value === "royal_college_staff" || value === "president" || value === "system") {
    return value;
  }
  return null;
}

function isEventType(value: unknown): value is RequestEventType {
  return value === "submitted" ||
    value === "information_requested" ||
    value === "resubmitted" ||
    value === "forwarded_for_signature" ||
    value === "signature_step_completed" ||
    value === "forwarded_to_next_signer" ||
    value === "signed" ||
    value === "rejected" ||
    value === "migrated";
}

function normalizeComments(value: unknown, raw: Record<string, unknown>): RequestComment[] {
  const comments = Array.isArray(value)
    ? value.flatMap((comment) => {
        const actorRole = isObject(comment) ? normalizeActorRole(comment.actorRole) : null;
        if (
          !isObject(comment) ||
          !isString(comment.id) ||
          !actorRole ||
          !isString(comment.actorName) ||
          !isString(comment.message) ||
          !isString(comment.createdAt)
        ) {
          return [];
        }
        return [{
          id: comment.id,
          actorRole,
          actorName: comment.actorName,
          message: comment.message,
          createdAt: comment.createdAt,
        }];
      })
    : [];

  if (comments.length === 0 && isString(raw.reviewerNote)) {
    comments.push({
      id: `comment-migrated-${isString(raw.id) ? raw.id : "unknown"}`,
      actorRole: "royal_college_staff",
      actorName: isString(raw.reviewedBy) ? raw.reviewedBy : "เจ้าหน้าที่",
      message: raw.reviewerNote,
      createdAt: isString(raw.reviewedAt)
        ? raw.reviewedAt
        : isString(raw.updatedAt) ? raw.updatedAt : new Date(0).toISOString(),
    });
  }
  return comments;
}

function normalizeEvents(value: unknown, raw: Record<string, unknown>, status: RequestStatus): RequestEvent[] {
  const events = Array.isArray(value)
    ? value.flatMap((event) => {
        const actorRole = isObject(event) ? normalizeActorRole(event.actorRole) : null;
        if (
          !isObject(event) ||
          !isString(event.id) ||
          !isEventType(event.type) ||
          !actorRole ||
          !isString(event.actorName) ||
          !isString(event.createdAt)
        ) {
          return [];
        }
        return [{
          id: event.id,
          type: event.type,
          actorRole,
          actorName: event.actorName,
          createdAt: event.createdAt,
          note: isString(event.note) ? event.note : undefined,
        }];
      })
    : [];

  if (events.length > 0) return events;
  const id = isString(raw.id) ? raw.id : "unknown";
  const createdAt = isString(raw.createdAt) ? raw.createdAt : new Date(0).toISOString();
  const updatedAt = isString(raw.updatedAt) ? raw.updatedAt : createdAt;
  const requester = isObject(raw.requester) && isString(raw.requester.name)
    ? raw.requester.name
    : "สมาชิก";
  const migrated: RequestEvent[] = [
    { id: `event-migrated-${id}-submitted`, type: "submitted", actorRole: "student", actorName: requester, createdAt },
    { id: `event-migrated-${id}`, type: "migrated", actorRole: "system", actorName: "ระบบ", createdAt: updatedAt },
  ];
  if (status === "signed") {
    migrated.push({ id: `event-migrated-${id}-signed`, type: "signed", actorRole: "system", actorName: "ระบบเดิม", createdAt: updatedAt });
  } else if (status === "rejected") {
    migrated.push({ id: `event-migrated-${id}-rejected`, type: "rejected", actorRole: "royal_college_staff", actorName: "เจ้าหน้าที่", createdAt: updatedAt });
  }
  return migrated;
}

function normalizeSignature(value: unknown): MockESignature | undefined {
  if (!isObject(value) || value.kind !== "mock_e_sign") return undefined;
  const keys = [
    "signerAssignmentId",
    "signerUserId",
    "signerName",
    "signerRoleLabel",
    "collegeCode",
    "signedAt",
    "documentFingerprint",
    "consentText",
  ] as const;
  if (!keys.every((key) => isString(value[key]))) return undefined;
  return {
    kind: "mock_e_sign",
    signerAssignmentId: value.signerAssignmentId as string,
    signerUserId: value.signerUserId as string,
    signerName: value.signerName as string,
    signerRoleLabel: value.signerRoleLabel as string,
    collegeCode: value.collegeCode as string,
    signedAt: value.signedAt as string,
    documentFingerprint: value.documentFingerprint as string,
    stampLabel: isString(value.stampLabel)
      ? value.stampLabel
      : "ลงนามอิเล็กทรอนิกส์โดยประธานวิทยาลัย",
    consentText: value.consentText as string,
    handwrittenSignature: isHandwrittenSignature(value.handwrittenSignature)
      ? cloneHandwrittenSignature(value.handwrittenSignature)
      : undefined,
    workflowStepId: isString(value.workflowStepId) ? value.workflowStepId : undefined,
    level: value.level === "college" || value.level === "royal_college"
      ? value.level
      : undefined,
    organisationId: isString(value.organisationId) ? value.organisationId : undefined,
  };
}

function isWorkflowKind(value: unknown): value is SignatureWorkflowKind {
  return value === "college_only" || value === "royal_only" || value === "two_level";
}

function isSignatureLevel(value: unknown): value is SignatureLevel {
  return value === "college" || value === "royal_college";
}

function normalizeWorkflowStep(value: unknown): SignatureWorkflowStep | null {
  if (!isObject(value)) return null;
  const status = value.status === "pending" || value.status === "awaiting_signature" ||
    value.status === "signed" || value.status === "rejected"
    ? value.status
    : null;
  if (
    !isString(value.id) ||
    typeof value.order !== "number" ||
    !isSignatureLevel(value.level) ||
    !isString(value.organisationId) ||
    !isString(value.organisationCode) ||
    !isString(value.organisationName) ||
    !status
  ) {
    return null;
  }
  return {
    id: value.id,
    order: value.order,
    level: value.level,
    organisationId: value.organisationId,
    organisationCode: value.organisationCode,
    organisationName: value.organisationName,
    status,
    signerAssignmentId: isString(value.signerAssignmentId) ? value.signerAssignmentId : undefined,
    signerUserId: isString(value.signerUserId) ? value.signerUserId : undefined,
    signerName: isString(value.signerName) ? value.signerName : undefined,
    decidedAt: isString(value.decidedAt) ? value.decidedAt : undefined,
    note: isString(value.note) ? value.note : undefined,
  };
}

function normalizeSignatureWorkflow(value: unknown): SignatureWorkflow | undefined {
  if (!isObject(value) || !isWorkflowKind(value.kind) || !isString(value.preparedAt) ||
      !isString(value.documentFingerprint) || !isObject(value.preparedBy) ||
      !Array.isArray(value.steps)) {
    return undefined;
  }
  const preparedBy = value.preparedBy;
  if (
    !isString(preparedBy.userId) || !isString(preparedBy.userName) ||
    preparedBy.role !== "royal_college_staff" ||
    !isString(preparedBy.organisationId) || !isString(preparedBy.organisationCode) ||
    !isString(preparedBy.organisationName)
  ) {
    return undefined;
  }
  const steps = value.steps.map(normalizeWorkflowStep);
  if (steps.length === 0 || steps.some((step) => step === null)) return undefined;
  return {
    kind: value.kind,
    preparedAt: value.preparedAt,
    preparedBy: {
      userId: preparedBy.userId,
      userName: preparedBy.userName,
      role: "royal_college_staff",
      organisationId: preparedBy.organisationId,
      organisationCode: preparedBy.organisationCode,
      organisationName: preparedBy.organisationName,
    },
    documentFingerprint: value.documentFingerprint,
    evidenceReference: isString(value.evidenceReference) ? value.evidenceReference : undefined,
    steps: steps as SignatureWorkflowStep[],
  };
}

export function normalizeStoredRequest(value: unknown): MockRequest | null {
  if (!isObject(value)) return null;
  const categoryId = normalizeCategory(value.categoryId);
  const status = normalizeStatus(value.status);
  const requester = isObject(value.requester) ? value.requester : null;
  if (
    !categoryId ||
    !status ||
    !isString(value.id) ||
    !isString(value.typeLabel) ||
    !isString(value.title) ||
    !isString(value.displayDate) ||
    !isString(value.createdAt) ||
    !isString(value.updatedAt) ||
    !requester ||
    !isString(requester.memberId) ||
    !isString(requester.name) ||
    !isString(requester.email) ||
    !Array.isArray(value.fields)
  ) {
    return null;
  }

  const fields = value.fields.flatMap((field) => {
    if (!isObject(field) || !isString(field.id) || !isString(field.label) || !isString(field.value)) {
      return [];
    }
    return [{ id: field.id, label: field.label, value: field.value }];
  });

  return {
    id: value.id,
    categoryId,
    typeLabel: value.typeLabel,
    title: value.title,
    displayDate: value.displayDate,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    status,
    collegeCode: isString(value.collegeCode) ? value.collegeCode : "วภท.",
    requester: {
      memberId: requester.memberId,
      name: requester.name,
      email: requester.email,
    },
    fields,
    applicantNote: isString(value.applicantNote) ? value.applicantNote : undefined,
    courses: normalizeCourses(value.courses),
    documents: normalizeDocuments(value.documents, value.attachment, categoryId),
    comments: normalizeComments(value.comments, value),
    events: normalizeEvents(value.events, value, status),
    progress: progressForStatus(status),
    mockSignature: normalizeSignature(value.mockSignature),
    signatures: Array.isArray(value.signatures)
      ? value.signatures.flatMap((signature) => {
          const normalized = normalizeSignature(signature);
          return normalized ? [normalized] : [];
        })
      : undefined,
    signatureWorkflow: normalizeSignatureWorkflow(value.signatureWorkflow),
  };
}

function mergeHistoricalRequests(storedRequests: MockRequest[]) {
  const storedIds = new Set(storedRequests.map((request) => request.id));
  const missingHistorical = cloneHistoricalRequests().filter(
    (request) => !storedIds.has(request.id),
  );
  return [...storedRequests, ...missingHistorical].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

function readStoredRequests(): MockRequest[] {
  const current = window.localStorage.getItem(STORAGE_KEY);
  const legacy = current ? null : window.localStorage.getItem(LEGACY_STORAGE_KEY);
  const serialized = current ?? legacy;
  if (!serialized) return cloneHistoricalRequests();

  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed)) throw new Error("รูปแบบข้อมูลคำร้องที่บันทึกไว้ไม่ถูกต้อง");
  const normalized = parsed.map(normalizeStoredRequest);
  if (normalized.some((request) => request === null)) {
    throw new Error("รูปแบบข้อมูลคำร้องที่บันทึกไว้ไม่ถูกต้อง");
  }
  const migrated = normalized as MockRequest[];
  if (legacy) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return mergeHistoricalRequests(migrated);
}

export function useRequestStore() {
  const [requests, setRequests] = useState<MockRequest[]>(cloneHistoricalRequests);
  const requestsRef = useRef(requests);
  const [storageError, setStorageError] = useState("");
  const [isReady, setIsReady] = useState(false);

  const reload = useCallback(() => {
    try {
      const storedRequests = readStoredRequests();
      requestsRef.current = storedRequests;
      setRequests(storedRequests);
      setStorageError("");
    } catch {
      const fallbackRequests = cloneHistoricalRequests();
      requestsRef.current = fallbackRequests;
      setRequests(fallbackRequests);
      setStorageError("ไม่สามารถอ่านข้อมูลคำร้องที่บันทึกไว้ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    window.addEventListener("storage", reload);
    window.addEventListener(STORAGE_EVENT, reload);
    return () => {
      window.removeEventListener("storage", reload);
      window.removeEventListener(STORAGE_EVENT, reload);
    };
  }, [reload]);

  const persist = useCallback((nextRequests: MockRequest[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRequests));
      setStorageError("");
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch {
      setStorageError("บันทึกข้อมูลลงเครื่องไม่สำเร็จ การเปลี่ยนแปลงนี้อาจหายไปเมื่อรีเฟรชหน้า");
    }
  }, []);

  const addRequest = useCallback((request: MockRequest) => {
    const next = [request, ...requestsRef.current];
    requestsRef.current = next;
    setRequests(next);
    persist(next);
  }, [persist]);

  const updateRequest = useCallback(
    (requestId: string, updater: (request: MockRequest) => MockRequest) => {
      const next = requestsRef.current.map((request) =>
        request.id === requestId ? updater(cloneRequest(request)) : request,
      );
      requestsRef.current = next;
      setRequests(next);
      persist(next);
    },
    [persist],
  );

  return { requests, storageError, isReady, addRequest, updateRequest };
}
