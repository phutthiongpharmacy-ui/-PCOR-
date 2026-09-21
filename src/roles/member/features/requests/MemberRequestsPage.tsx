"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SegmentedFilterButton, SegmentedFilterGroup } from "@/components/ui/segmented-filter";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadField } from "@/roles/shared/components/forms/FileUploadField";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { studentDetailData } from "@/roles/shared/data";
import { formatCourseCode } from "@/roles/shared/data/college-directory";
import { formatFileSize } from "@/roles/shared/features/file-metadata";
import { HandwrittenSignaturePreview } from "@/roles/shared/features/requests/HandwrittenSignature";
import { selectRequestsForStudentSession } from "@/roles/shared/features/requests/request-access";
import {
  REQUEST_CATALOG,
  REQUEST_EVENT_LABELS,
  REQUEST_STATUS_META,
  canTransitionRequest,
  formatThaiRequestDate,
  getRequestCategory,
  makeRequestId,
  makeTimelineId,
  progressForStatus,
  type MockRequest,
  type RequestCategoryDefinition,
  type RequestCategoryId,
  type RequestDocument,
  type RequestFieldDefinition,
  type RequestStatus,
} from "@/roles/shared/features/requests/request-schema";
import { useRequestStore } from "@/roles/shared/features/requests/request-store";
import { currentMemberPassport } from "@/roles/shared/member/domain";
import { CURRENT_COLLEGE_CODE } from "@/roles/shared/features/roles/role-assignment";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

type RequestFilter = RequestStatus | "all";
type FormValues = Record<string, string>;
type FormErrors = Record<string, string>;

const FILTERS: readonly { id: RequestFilter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "staff_review", label: "รอเจ้าหน้าที่" },
  { id: "needs_information", label: "ขอข้อมูลเพิ่มเติม" },
  { id: "awaiting_president_signature", label: "รอประธานลงนาม" },
  { id: "signed", label: "ลงนามแล้ว" },
  { id: "rejected", label: "ไม่อนุมัติ" },
];

function makeCategoryDocuments(category: RequestCategoryDefinition): RequestDocument[] {
  return (category.documents ?? []).map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    required: requirement.required ?? false,
    reviewStatus: "not_applicable",
  }));
}

function initialFieldValues(category: RequestCategoryDefinition) {
  return Object.fromEntries(category.fields.flatMap((field) =>
    field.id === "program" ? [[field.id, studentDetailData.program]] : [],
  ));
}

function formatRequestDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
}

function RequestFieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: RequestFieldDefinition;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const inputId = `request-field-${field.id}`;
  const describedBy = error
    ? `${inputId}-error`
    : field.helpText
      ? `${inputId}-help`
      : undefined;
  const sharedProps = {
    id: inputId,
    name: field.id,
    value,
    required: field.required,
    "aria-required": field.required || undefined,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
    onChange: (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => onChange(event.target.value),
  };

  return (
    <div className={field.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <label htmlFor={inputId} className="text-xs font-medium text-foreground">
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {field.type === "select" ? (
        <select
          {...sharedProps}
          className="flex h-9 w-full rounded-2xl border border-transparent bg-input/50 px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20"
        >
          <option value="">เลือก{field.label}</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <Textarea
          {...sharedProps}
          rows={4}
          placeholder={field.placeholder}
          className="min-h-24"
        />
      ) : (
        <Input
          {...sharedProps}
          type={field.type}
          min={field.min}
          placeholder={field.placeholder}
          className="h-9"
        />
      )}
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : field.helpText ? (
        <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
          {field.helpText}
        </p>
      ) : null}
    </div>
  );
}

function RequestDetail({ request }: { request: MockRequest }) {
  const status = REQUEST_STATUS_META[request.status];
  const attachedDocuments = request.documents.filter((document) => document.file);
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{request.id}</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">{request.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {request.typeLabel} · ยื่นเมื่อ {request.displayDate}
          </p>
        </div>
        <Badge variant={status.variant} className="h-auto self-start py-1">
          {status.label}
        </Badge>
      </div>

      <section aria-labelledby="member-request-data-heading">
        <h4 id="member-request-data-heading" className="mb-2 text-xs font-semibold text-foreground">
          ข้อมูลในคำร้อง
        </h4>
        <dl className="grid gap-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-2">
          {request.fields.map((field) => (
            <div key={field.id} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-foreground">
                {field.value}
              </dd>
            </div>
          ))}
          {request.applicantNote && (
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">หมายเหตุจากผู้ยื่น</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-foreground">{request.applicantNote}</dd>
            </div>
          )}
        </dl>
      </section>

      {request.courses.length > 0 && (
        <section aria-labelledby="request-courses-heading">
          <h4 id="request-courses-heading" className="mb-2 text-xs font-semibold text-foreground">รายวิชาที่เกี่ยวข้อง</h4>
          <div className="space-y-2 rounded-2xl border border-border p-3">
            {request.courses.map((course) => (
              <div key={course.code} className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-foreground">{formatCourseCode(course.code)} · {course.title}</span>
                <span className="text-muted-foreground">{course.credits} หน่วยกิต{course.term ? ` · ${course.term}` : ""}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {attachedDocuments.length > 0 && (
        <section aria-labelledby="request-documents-heading">
          <h4 id="request-documents-heading" className="mb-2 text-xs font-semibold text-foreground">เอกสารแนบ</h4>
          <div className="space-y-2 rounded-2xl border border-border p-3">
            {attachedDocuments.map((document) => (
              <div key={document.id} className="flex min-w-0 items-center gap-2 text-xs">
                <span className="material-symbols-outlined text-lg text-primary">attach_file</span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{document.label}: {document.file?.name}</span>
                <span className="shrink-0 text-muted-foreground">{formatFileSize(document.file?.size ?? 0)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {request.comments.length > 0 && (
        <section className="rounded-2xl border border-info-border bg-info-soft p-4" aria-labelledby="request-comments-heading">
          <h4 id="request-comments-heading" className="text-xs font-semibold text-info-on-soft">หมายเหตุและการสนทนา</h4>
          <div className="mt-2 space-y-3">
            {request.comments.map((comment) => (
              <div key={comment.id} className="border-t border-info-border/60 pt-2 first:border-t-0 first:pt-0">
                <p className="whitespace-pre-wrap text-sm text-info-on-soft">{comment.message}</p>
                <p className="mt-1 text-xs text-info-on-soft/80">{comment.actorName} · {formatRequestDateTime(comment.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {request.mockSignature && (
        <section className="rounded-2xl border border-success-border bg-success-soft p-4" aria-labelledby="electronic-signature-heading">
          <div className="flex items-center gap-2 text-success-on-soft">
            <span className="material-symbols-outlined">draw</span>
            <h4 id="electronic-signature-heading" className="text-xs font-semibold">ข้อมูลการลงนามอิเล็กทรอนิกส์</h4>
          </div>
          {request.mockSignature.handwrittenSignature && (
            <div className="mt-3 max-w-md rounded-2xl border border-success-border bg-logo-surface px-4 py-2">
              <HandwrittenSignaturePreview
                signature={request.mockSignature.handwrittenSignature}
                ariaLabel={`ลายมือชื่อของ ${request.mockSignature.signerName}`}
              />
            </div>
          )}
          <p className="mt-2 text-sm font-medium text-success-on-soft">{request.mockSignature.signerName}</p>
          <p className="mt-1 text-xs text-success-on-soft/80">{formatRequestDateTime(request.mockSignature.signedAt)} · {request.mockSignature.documentFingerprint}</p>
        </section>
      )}

      <section aria-labelledby="request-progress-heading">
        <h4 id="request-progress-heading" className="mb-3 text-xs font-semibold text-foreground">
          ความคืบหน้า
        </h4>
        <ol className="space-y-3 border-l-2 border-border pl-5">
          {request.events.map((event) => (
            <li key={event.id} className="relative text-xs text-foreground">
              <span className="absolute -left-[27px] top-0.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
              <span className="font-medium">{REQUEST_EVENT_LABELS[event.type]}</span>
              <span className="ml-1 text-muted-foreground">โดย {event.actorName} · {formatRequestDateTime(event.createdAt)}</span>
              {event.note && <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{event.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default function MemberRequestsPage() {
  const { requests, storageError, isReady, addRequest, updateRequest } = useRequestStore();
  const { session, isReady: isSessionReady } = usePortalSession();
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState<RequestCategoryId | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [applicantNote, setApplicantNote] = useState("");
  const [documents, setDocuments] = useState<RequestDocument[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  const category = categoryId ? getRequestCategory(categoryId) : undefined;
  const memberId = session?.role === "student" ? session.userId : "";
  const memberRequests = useMemo(
    () => selectRequestsForStudentSession(requests, session),
    [requests, session],
  );
  const detailRequest = memberRequests.find((request) => request.id === detailId) ?? null;
  const filteredRequests = useMemo(
    () =>
      filter === "all"
        ? memberRequests
        : memberRequests.filter((request) => request.status === filter),
    [filter, memberRequests],
  );

  const resetDraft = () => {
    setStep(1);
    setCategoryId(null);
    setValues({});
    setErrors({});
    setApplicantNote("");
    setDocuments([]);
    setEditingRequestId(null);
  };

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) resetDraft();
  };

  const selectCategory = (nextCategoryId: RequestCategoryId) => {
    const nextCategory = getRequestCategory(nextCategoryId);
    if (!nextCategory) return;
    setCategoryId(nextCategoryId);
    setValues(initialFieldValues(nextCategory));
    setErrors({});
    setApplicantNote("");
    setDocuments(makeCategoryDocuments(nextCategory));
  };

  const startRevision = (request: MockRequest) => {
    if (request.categoryId === "legacy") return;
    const requestCategory = getRequestCategory(request.categoryId);
    if (!requestCategory) return;

    setEditingRequestId(request.id);
    setCategoryId(request.categoryId);
    setValues(Object.fromEntries(request.fields.map((field) => [field.id, field.value])));
    setErrors({});
    setApplicantNote(request.applicantNote ?? "");
    const storedDocuments = request.documents;
    setDocuments((requestCategory.documents ?? []).map((requirement, index) => {
      const stored = storedDocuments.find((document) => document.id === requirement.id)
        ?? (index === 0 ? storedDocuments.find((document) => document.file) : undefined);
      return {
        id: requirement.id,
        label: requirement.label,
        required: requirement.required ?? false,
        file: stored?.file ? { ...stored.file } : undefined,
        reviewStatus: stored?.file ? "pending" : "not_applicable",
      };
    }));
    setStep(2);
    setDetailId(null);
    window.setTimeout(() => setIsCreateOpen(true), 150);
  };

  const updateValue = (fieldId: string, value: string) => {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  };

  const validateDetails = (selectedCategory: RequestCategoryDefinition) => {
    const nextErrors: FormErrors = {};
    selectedCategory.fields.forEach((field) => {
      const value = values[field.id]?.trim() ?? "";
      if (field.required && !value) {
        nextErrors[field.id] = `กรุณากรอก${field.label}`;
      } else if (field.type === "number" && value) {
        const numberValue = Number(value);
        if (!Number.isFinite(numberValue) || numberValue < (field.min ?? 0)) {
          nextErrors[field.id] = `กรุณาระบุ${field.label}ให้ถูกต้อง`;
        }
      }
    });
    if (
      selectedCategory.id === "internship_letter" &&
      values.internshipStartDate &&
      values.internshipEndDate &&
      values.internshipStartDate > values.internshipEndDate
    ) {
      nextErrors.internshipEndDate = "วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่มฝึกงาน";
    }
    const missingDocument = documents.find((document) => document.required && !document.file);
    if (missingDocument) nextErrors.__documents = `กรุณาแนบ${missingDocument.label}`;
    setErrors(nextErrors);
    const firstInvalidField = selectedCategory.fields.find(
      (field) => nextErrors[field.id],
    );
    if (firstInvalidField) {
      window.requestAnimationFrame(() => {
        document.getElementById(`request-field-${firstInvalidField.id}`)?.focus();
      });
    }
    return Object.keys(nextErrors).length === 0;
  };

  const updateDocument = (documentId: string, file?: RequestDocument["file"]) => {
    setDocuments((current) => current.map((document) =>
      document.id === documentId
        ? {
            ...document,
            file,
            reviewStatus: file ? "pending" : "not_applicable",
            reviewerNote: undefined,
          }
        : document,
    ));
    setErrors((current) => {
      if (!current.__documents) return current;
      const next = { ...current };
      delete next.__documents;
      return next;
    });
  };

  const goNext = () => {
    if (step === 1) {
      if (!category) return;
      setStep(2);
      return;
    }
    if (step === 2 && category && validateDetails(category)) {
      setStep(3);
    }
  };

  const submitRequest = () => {
    if (!category || !validateDetails(category)) {
      setStep(2);
      return;
    }
    const editingRequest = editingRequestId
      ? memberRequests.find((current) => current.id === editingRequestId)
      : undefined;
    if (
      editingRequestId
      && (!editingRequest || !canTransitionRequest(editingRequest.status, "staff_review", "student"))
    ) {
      toast.error("สถานะคำร้องเปลี่ยนแล้ว กรุณาปิดแบบฟอร์มและลองอีกครั้ง");
      return;
    }
    const now = new Date();
    const nowIso = now.toISOString();
    const identity = currentMemberPassport.identity;
    const memberName = `${identity.titleTh} ${identity.firstNameTh} ${identity.lastNameTh}`;
    const fieldEntries = category.fields
      .map((field) => ({
        id: field.id,
        label: field.label,
        value: values[field.id]?.trim() ?? "",
      }))
      .filter((field) => field.value);
    const headline = fieldEntries[0]?.value;
    const normalizedDocuments = documents.map((document) => ({
      ...document,
      file: document.file ? { ...document.file } : undefined,
      reviewStatus: document.file ? "pending" as const : "not_applicable" as const,
      reviewerNote: undefined,
    }));
    const note = applicantNote.trim();
    const request: MockRequest = {
      id: makeRequestId(category, now),
      categoryId: category.id,
      typeLabel: category.name,
      title: headline ? `${category.name}: ${headline}` : category.name,
      displayDate: formatThaiRequestDate(now),
      createdAt: nowIso,
      updatedAt: nowIso,
      status: "staff_review",
      collegeCode: CURRENT_COLLEGE_CODE,
      requester: {
        memberId,
        name: session?.displayName ?? memberName,
        email: identity.email,
      },
      fields: fieldEntries,
      applicantNote: note || undefined,
      courses: [],
      documents: normalizedDocuments,
      comments: [],
      events: [{
        id: makeTimelineId("event-submitted", now),
        type: "submitted",
        actorRole: "student",
        actorName: memberName,
        createdAt: nowIso,
      }],
      progress: progressForStatus("staff_review"),
    };
    if (editingRequestId && editingRequest) {
      const noteChanged = Boolean(note) && note !== (editingRequest.applicantNote ?? "").trim();
      updateRequest(editingRequestId, (current) => ({
        ...current,
        typeLabel: request.typeLabel,
        title: request.title,
        updatedAt: nowIso,
        status: "staff_review",
        fields: request.fields,
        applicantNote: request.applicantNote,
        documents: request.documents,
        comments: [
          ...current.comments,
          ...(noteChanged ? [{
            id: makeTimelineId("comment-member", now, current.comments.length),
            actorRole: "student" as const,
            actorName: memberName,
            message: note,
            createdAt: nowIso,
          }] : []),
        ],
        events: [
          ...current.events,
          {
            id: makeTimelineId("event-resubmitted", now, current.events.length),
            type: "resubmitted",
            actorRole: "student",
            actorName: memberName,
            createdAt: nowIso,
          },
        ],
        progress: progressForStatus("staff_review"),
      }));
    } else {
      addRequest(request);
    }
    handleCreateOpenChange(false);
    setFilter("all");
    toast.success(editingRequestId ? "ส่งข้อมูลเพิ่มเติมเรียบร้อยแล้ว" : "ยื่นคำร้องเรียบร้อยแล้ว", {
      description: `หมายเลขคำร้อง ${editingRequestId ?? request.id}`,
    });
  };

  return (
    <>
      <PageShell>
        <div className="mb-5 flex justify-end">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5">
            <span className="material-symbols-outlined text-base">add</span>
            ยื่นคำร้องใหม่
          </Button>
        </div>

        {storageError && (
          <div role="alert" className="mb-4 flex gap-2 rounded-2xl border border-warning-border bg-warning-soft p-3 text-xs text-warning-on-soft">
            <span className="material-symbols-outlined text-lg">warning</span>
            <span>{storageError}</span>
          </div>
        )}

        <SegmentedFilterGroup className="mb-4" aria-label="กรองสถานะคำร้อง">
          {FILTERS.map((item) => {
            const count =
              item.id === "all"
                ? memberRequests.length
                : memberRequests.filter((request) => request.status === item.id).length;
            return (
              <SegmentedFilterButton
                key={item.id}
                active={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label} ({count})
              </SegmentedFilterButton>
            );
          })}
        </SegmentedFilterGroup>

        {!isReady || !isSessionReady ? (
          <Card>
            <CardContent className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              กำลังโหลดคำร้อง
            </CardContent>
          </Card>
        ) : filteredRequests.length > 0 ? (
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const status = REQUEST_STATUS_META[request.status];
              const latestStaffComment = request.comments
                .filter((comment) => comment.actorRole === "royal_college_staff")
                .at(-1);
              return (
                <Card key={request.id} className="border-border">
                  <CardContent className="px-4">
                    <button
                      type="button"
                      onClick={() => setDetailId(request.id)}
                      className="w-full rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{request.id}</span>
                            <Badge variant={status.variant} className="h-auto py-1 text-xs">
                              {status.label}
                            </Badge>
                          </div>
                          <h2 className="truncate text-sm font-semibold text-foreground">{request.title}</h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {request.typeLabel} · {request.displayDate}
                          </p>
                          {request.status === "needs_information" && latestStaffComment && (
                            <p className="mt-2 line-clamp-2 rounded-xl bg-info-soft px-3 py-2 text-xs text-info-on-soft">
                              เจ้าหน้าที่: {latestStaffComment.message}
                            </p>
                          )}
                        </div>
                        <span className="material-symbols-outlined self-end text-xl text-muted-foreground sm:self-center">
                          chevron_right
                        </span>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined mb-3 text-4xl text-muted-foreground">inbox</span>
              <h2 className="text-sm font-semibold text-foreground">ไม่พบคำร้องในสถานะนี้</h2>
              <p className="mt-1 text-xs text-muted-foreground">เลือกสถานะอื่นหรือยื่นคำร้องใหม่ได้ทันที</p>
            </CardContent>
          </Card>
        )}

        <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingRequestId ? "ส่งข้อมูลเพิ่มเติม" : "ยื่นคำร้องใหม่"}</DialogTitle>
              <DialogDescription>
                {editingRequestId && "แก้ไขตามหมายเหตุเจ้าหน้าที่ · "}
                ขั้นตอนที่ {step} จาก 3: {step === 1 ? "เลือกประเภทคำร้อง" : step === 2 ? "กรอกข้อมูล" : "ตรวจสอบและยืนยัน"}
              </DialogDescription>
            </DialogHeader>

            <ol className="grid grid-cols-3 gap-2" aria-label="ขั้นตอนการยื่นคำร้อง">
              {["เลือกประเภท", "กรอกข้อมูล", "ยืนยัน"].map((label, index) => {
                const number = index + 1;
                return (
                  <li key={label} className="flex min-w-0 items-center gap-2">
                    <span
                      aria-current={step === number ? "step" : undefined}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        step >= number
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {number}
                    </span>
                    <span className={`truncate text-xs ${step >= number ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {step === 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {REQUEST_CATALOG.map((item) => {
                  const selected = item.id === categoryId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectCategory(item.id)}
                      className={`rounded-2xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-muted/50"
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl text-primary">{item.icon}</span>
                      <span className="mt-2 block text-sm font-semibold text-foreground">{item.name}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.description}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && category && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-brand-border bg-brand-soft p-3">
                  <p className="text-xs font-semibold text-brand-on-soft">{category.name}</p>
                  <p className="mt-0.5 text-xs text-brand-on-soft/80">{category.description}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {category.fields.map((field) => (
                    <RequestFieldControl
                      key={field.id}
                      field={field}
                      value={values[field.id] ?? ""}
                      error={errors[field.id]}
                      onChange={(value) => updateValue(field.id, value)}
                    />
                  ))}
                </div>
                <div className="space-y-1.5 border-t border-border pt-4">
                  <label htmlFor="request-applicant-note" className="text-xs font-medium text-foreground">หมายเหตุจากผู้ยื่น</label>
                  <Textarea
                    id="request-applicant-note"
                    value={applicantNote}
                    onChange={(event) => setApplicantNote(event.target.value)}
                    rows={4}
                    placeholder="ระบุข้อมูลเพิ่มเติมที่ต้องการแจ้งเจ้าหน้าที่ (ถ้ามี)"
                  />
                  <p className="text-xs text-muted-foreground">หมายเหตุใหม่จะถูกเพิ่มในประวัติ ไม่เขียนทับข้อความเดิม</p>
                </div>

                {(category.documents?.length ?? 0) > 0 && (
                  <section className="space-y-4 border-t border-border pt-4" aria-labelledby="request-documents-form-heading">
                    <div>
                      <h3 id="request-documents-form-heading" className="text-xs font-semibold text-foreground">เอกสารประกอบ</h3>
                      <p className="mt-1 text-xs text-muted-foreground">แนบเอกสารได้หลายรายการตามประเภทคำร้อง</p>
                    </div>
                    {category.documents?.map((requirement) => {
                      const documentValue = documents.find((document) => document.id === requirement.id);
                      return (
                        <FileUploadField
                          key={requirement.id}
                          label={requirement.label}
                          description={requirement.helpText}
                          value={documentValue?.file}
                          onChange={(file) => updateDocument(requirement.id, file)}
                          required={requirement.required}
                          maxBytes={requirement.maxBytes}
                          acceptedTypes={requirement.acceptedTypes}
                          error={errors.__documents && requirement.required && !documentValue?.file ? errors.__documents : undefined}
                          compact
                        />
                      );
                    })}
                  </section>
                )}
              </div>
            )}

            {step === 3 && category && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-success-border bg-success-soft p-4">
                  <div className="flex items-center gap-2 text-success-on-soft">
                    <span className="material-symbols-outlined">fact_check</span>
                    <h3 className="text-sm font-semibold">ตรวจสอบข้อมูลก่อนยืนยัน</h3>
                  </div>
                  <p className="mt-1 text-xs text-success-on-soft/80">คำร้องจะถูกส่งให้เจ้าหน้าที่ตรวจสอบหลังจากกดยืนยัน</p>
                </div>
                <dl className="grid gap-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">ประเภทคำร้อง</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">{category.name}</dd>
                  </div>
                  {category.fields.map((field) => {
                    const value = values[field.id]?.trim();
                    if (!value) return null;
                    return (
                      <div key={field.id} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
                        <dt className="text-xs text-muted-foreground">{field.label}</dt>
                        <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-foreground">{value}</dd>
                      </div>
                    );
                  })}
                  {applicantNote.trim() && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">หมายเหตุจากผู้ยื่น</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-foreground">{applicantNote.trim()}</dd>
                    </div>
                  )}
                  {documents.some((document) => document.file) && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">เอกสารแนบ</dt>
                      <dd className="mt-1 space-y-1 text-sm font-medium text-foreground">
                        {documents.filter((document) => document.file).map((document) => (
                          <span key={document.id} className="block">{document.label}: {document.file?.name} ({formatFileSize(document.file?.size ?? 0)})</span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            <DialogFooter className="border-t border-border pt-4">
              <Button variant="outline" onClick={() => handleCreateOpenChange(false)}>
                ยกเลิก
              </Button>
              {step > (editingRequestId ? 2 : 1) && (
                <Button variant="outline" onClick={() => setStep((current) => current - 1)}>
                  ย้อนกลับ
                </Button>
              )}
              {step < 3 ? (
                <Button onClick={goNext} disabled={step === 1 && !category}>
                  ถัดไป
                </Button>
              ) : (
                <Button onClick={submitRequest}>
                  {editingRequestId ? "ยืนยันและส่งตรวจอีกครั้ง" : "ยืนยันการยื่นคำร้อง"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(detailRequest)} onOpenChange={(open) => !open && setDetailId(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                รายละเอียดคำร้อง
              </DialogTitle>
              <DialogDescription>ข้อมูลและสถานะล่าสุดของคำร้อง</DialogDescription>
            </DialogHeader>
            {detailRequest && <RequestDetail request={detailRequest} />}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailId(null)}>ปิด</Button>
              {detailRequest?.status === "needs_information" && detailRequest.categoryId !== "legacy" && (
                <Button onClick={() => startRevision(detailRequest)}>
                  แก้ไขและส่งข้อมูลเพิ่ม
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageShell>
    </>
  );
}
