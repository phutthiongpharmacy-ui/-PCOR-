"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Admission } from "@/providers/mock-db-provider";
import type { ScopedAcademicActor } from "@/roles/shared/features/academic";
import { formatFileSize } from "@/roles/shared/features/file-metadata";
import {
  LicenseEligibilityNotice,
} from "@/roles/shared/features/license-eligibility";
import {
  EmptyState,
  MetricCard,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  institutionAdmissionApprovalIssue,
  orderInstitutionAdmissionsBySubmissionTime,
  type AdmissionApplicationType,
  type InstitutionAdmissionReviewDecision,
  type InstitutionAdmissionReviewInput,
} from "@/roles/institution/features/admissions/institution-admission-review";

import {
  filterSelectClassName,
  formatInstitutionDateTime,
} from "./institution-workspace-utils";

const applicationTypeMeta = {
  exam: { label: "สมัครสอบ", icon: "quiz", variant: "info" as const },
  study: { label: "สมัครเรียน", icon: "school", variant: "brand" as const },
} satisfies Record<AdmissionApplicationType, {
  label: string;
  icon: string;
  variant: "info" | "brand";
}>;

const admissionStatusMeta = {
  pending: { label: "รอพิจารณา", variant: "warning" as const },
  approved: { label: "อนุมัติแล้ว", variant: "success" as const },
  rejected: { label: "ไม่อนุมัติ", variant: "danger" as const },
};

const documentStatusMeta = {
  pending: { label: "มีเอกสารรอตรวจ", variant: "info" as const },
  complete: { label: "เอกสารครบถ้วน", variant: "success" as const },
  incomplete: { label: "รอผู้สมัครแก้ไข", variant: "warning" as const },
};

const documentReviewMeta = {
  pending: { label: "รอตรวจ", variant: "info" as const },
  accepted: { label: "ผ่านแล้ว", variant: "success" as const },
  missing: { label: "ต้องแก้ไข", variant: "danger" as const },
  not_applicable: { label: "ไม่บังคับ", variant: "outline" as const },
};

type StatusFilter = "all" | Admission["status"];
type ApplicationTypeFilter = "all" | AdmissionApplicationType;
type AdmissionListSize = 4 | 8 | "all";

function successMessage(decision: InstitutionAdmissionReviewDecision, id: string) {
  return {
    documents_complete: `ยืนยันเอกสารของ ${id} แล้ว`,
    request_information: `ส่งคำขอแก้ไขเอกสาร ${id} แล้ว`,
    approve: `อนุมัติคำสมัคร ${id} แล้ว`,
    reject: `บันทึกการไม่อนุมัติ ${id} แล้ว`,
  }[decision];
}

function initials(name: string) {
  return name.replace(/^(ภก\.|ภญ\.)\s*/, "").trim().charAt(0) || "ผ";
}

export default function InstitutionAdmissionsSection({
  admissions,
  actor,
  onReview,
}: {
  admissions: readonly Admission[];
  actor: ScopedAcademicActor | null;
  onReview: (input: InstitutionAdmissionReviewInput) => void;
}) {
  const orderedAdmissions = useMemo(
    () => orderInstitutionAdmissionsBySubmissionTime(admissions),
    [admissions],
  );
  const initialAdmission = orderedAdmissions[0];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [applicationTypeFilter, setApplicationTypeFilter] = useState<ApplicationTypeFilter>("all");
  const [admissionListSize, setAdmissionListSize] = useState<AdmissionListSize>(4);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(initialAdmission?.id ?? "");
  const [missingDocumentIds, setMissingDocumentIds] = useState<string[]>(
    initialAdmission?.documents
      .filter((document) => document.reviewStatus === "missing")
      .map((document) => document.id) ?? [],
  );
  const [reviewNote, setReviewNote] = useState(initialAdmission?.documentNote ?? "");
  const [reviewError, setReviewError] = useState("");

  const filteredAdmissions = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("th-TH");
    return orderedAdmissions.filter((admission) => {
      const matchesSearch = !query || [
        admission.id,
        admission.name,
        admission.license,
        admission.program,
      ].some((value) => value.toLocaleLowerCase("th-TH").includes(query));
      const matchesStatus = statusFilter === "all" || admission.status === statusFilter;
      const matchesType = applicationTypeFilter === "all" || admission.applicationType === applicationTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [applicationTypeFilter, orderedAdmissions, searchTerm, statusFilter]);

  const visibleAdmissions = admissionListSize === "all"
    ? filteredAdmissions
    : filteredAdmissions.slice(0, admissionListSize);

  const selectedAdmission = admissions.find((admission) => admission.id === selectedAdmissionId) ??
    filteredAdmissions[0] ??
    null;
  const studyApplicationCount = admissions.filter((admission) => admission.applicationType === "study").length;
  const examApplicationCount = admissions.filter((admission) => admission.applicationType === "exam").length;
  const pendingCount = admissions.filter((admission) => admission.status === "pending").length;
  const incompleteCount = admissions.filter((admission) => admission.documentStatus === "incomplete").length;
  const approvedCount = admissions.filter((admission) => admission.status === "approved").length;

  const selectAdmission = (admission: Admission) => {
    setSelectedAdmissionId(admission.id);
    setMissingDocumentIds(
      admission.documents
        .filter((document) => document.reviewStatus === "missing")
        .map((document) => document.id),
    );
    setReviewNote(admission.documentNote ?? admission.decisionNote ?? "");
    setReviewError("");
  };

  const changeAdmissionListSize = (value: string) => {
    const nextSize: AdmissionListSize = value === "all" ? "all" : value === "8" ? 8 : 4;
    const nextVisibleAdmissions = nextSize === "all"
      ? filteredAdmissions
      : filteredAdmissions.slice(0, nextSize);

    setAdmissionListSize(nextSize);
    if (
      nextVisibleAdmissions.length > 0 &&
      !nextVisibleAdmissions.some((admission) => admission.id === selectedAdmissionId)
    ) {
      selectAdmission(nextVisibleAdmissions[0]);
    }
  };

  const toggleMissingDocument = (documentId: string) => {
    setReviewError("");
    setMissingDocumentIds((previous) => previous.includes(documentId)
      ? previous.filter((id) => id !== documentId)
      : [...previous, documentId]);
  };

  const reviewAdmission = (decision: InstitutionAdmissionReviewDecision) => {
    if (!selectedAdmission || !actor) {
      setReviewError("ไม่พบสิทธิ์ผู้ดูแลสถาบันสำหรับพิจารณาคำสมัคร");
      return;
    }

    try {
      onReview({
        admissionId: selectedAdmission.id,
        actor,
        decision,
        reason: reviewNote,
        missingDocumentIds,
      });
      toast.success(successMessage(decision, selectedAdmission.id));
      setReviewError("");
      if (decision === "documents_complete") {
        setMissingDocumentIds([]);
        setReviewNote("");
      }
    } catch (cause) {
      const message = cause instanceof Error && cause.message.trim()
        ? cause.message
        : "ไม่สามารถบันทึกผลการพิจารณาได้ กรุณาลองอีกครั้ง";
      setReviewError(message);
      toast.error("บันทึกผลไม่สำเร็จ", { description: message });
    }
  };

  const approvalIssue = selectedAdmission
    ? missingDocumentIds.length > 0
      ? "ยกเลิกการเลือกเอกสารที่ต้องแก้ไขก่อนอนุมัติ"
      : institutionAdmissionApprovalIssue(selectedAdmission)
    : null;

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="งานรับสมัครของสถาบัน"
        title="อนุมัติการสมัครของผู้เรียน"
        description="ตรวจสอบข้อมูลและเอกสารประกอบ ก่อนอนุมัติผู้ที่สมัครสอบหรือสมัครเข้าศึกษาในสถาบันของคุณ"
      />

      <section aria-label="สรุปคำสมัคร" className="grid gap-3 min-[320px]:grid-cols-2 min-[480px]:grid-cols-3 min-[760px]:grid-cols-5">
        <MetricCard
          label="สมัครเรียน"
          value={studyApplicationCount}
          note="ประเภทการสมัคร"
          icon="school"
          size="sm"
        />
        <MetricCard
          label="สมัครสอบ"
          value={examApplicationCount}
          note="ประเภทการสมัคร"
          icon="quiz"
          size="sm"
        />
        <MetricCard
          label="รอพิจารณา"
          value={pendingCount}
          note="คำสมัครที่ต้องดำเนินการ"
          icon="pending_actions"
          emphasis={pendingCount > 0 ? "warning" : "default"}
          size="sm"
        />
        <MetricCard
          label="เอกสารต้องแก้ไข"
          value={incompleteCount}
          note="ส่งกลับให้ผู้สมัครแล้ว"
          icon="rule"
          emphasis={incompleteCount > 0 ? "danger" : "default"}
          size="sm"
        />
        <MetricCard
          label="อนุมัติแล้ว"
          value={approvedCount}
          note="ภายในขอบเขตสถาบันนี้"
          icon="verified"
          emphasis="success"
          size="sm"
        />
      </section>

      <Card size="sm" className="gap-3">
        <CardHeader className="gap-1">
          <CardTitle>ค้นหาและกรองคำสมัคร</CardTitle>
          <CardDescription>ค้นหาจากชื่อ รหัสคำสมัคร เลขใบอนุญาต หรือหลักสูตร</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-x-3 gap-y-2 min-[520px]:grid-cols-2 min-[760px]:grid-cols-[minmax(0,1.6fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)]">
          <div className="min-[520px]:col-span-2 min-[760px]:col-span-1">
            <label htmlFor="institution-admission-search" className="block text-sm font-medium text-foreground">ค้นหาคำสมัคร</label>
            <div className="relative mt-1.5">
              <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">search</span>
              <Input
                id="institution-admission-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาชื่อ รหัส ใบอนุญาต หรือหลักสูตร"
                className="h-11 pl-10"
              />
            </div>
            <p
              role="status"
              aria-live="polite"
              className="mt-1.5 text-sm text-muted-foreground"
            >
              พบ <strong className="font-semibold tabular-nums text-foreground">{filteredAdmissions.length}</strong>
              {" "}จาก <strong className="font-semibold tabular-nums text-foreground">{admissions.length}</strong> รายการ
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="institution-admission-type" className="block text-sm font-medium text-foreground">ประเภทการสมัคร</label>
            <select
              id="institution-admission-type"
              value={applicationTypeFilter}
              onChange={(event) => setApplicationTypeFilter(event.target.value as ApplicationTypeFilter)}
              className={filterSelectClassName}
            >
              <option value="all">ทั้งหมด</option>
              <option value="exam">สมัครสอบ</option>
              <option value="study">สมัครเรียน</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="institution-admission-status" className="block text-sm font-medium text-foreground">สถานะการพิจารณา</label>
            <select
              id="institution-admission-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className={filterSelectClassName}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="pending">รอพิจารณา</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-5 min-[1180px]:grid-cols-[minmax(19rem,0.78fr)_minmax(0,1.22fr)]">
        <div className="min-w-0 min-[1180px]:relative min-[1180px]:min-h-0">
          <div className="min-[1180px]:absolute min-[1180px]:inset-0">
            <Card className="min-w-0 min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:h-max min-[1180px]:max-h-[min(100%,calc(100dvh-6rem))] min-[1180px]:min-h-0">
              <CardHeader className="shrink-0 border-b border-border">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle>รายการใบสมัคร</CardTitle>
                    <CardDescription className="mt-1" role="status" aria-live="polite">
                      แสดง <strong className="font-semibold tabular-nums text-foreground">{visibleAdmissions.length}</strong>
                      {" "}จาก <strong className="font-semibold tabular-nums text-foreground">{filteredAdmissions.length}</strong> คน
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="institution-admission-list-size" className="text-sm font-medium text-foreground">
                      จำนวนที่แสดง
                    </label>
                    <div className="w-24">
                      <select
                        id="institution-admission-list-size"
                        value={admissionListSize}
                        onChange={(event) => changeAdmissionListSize(event.target.value)}
                        aria-controls="institution-admission-list"
                        className={filterSelectClassName}
                      >
                        <option value="4">4 คน</option>
                        <option value="8">8 คน</option>
                        <option value="all">ทั้งหมด</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent id="institution-admission-list" className="flex min-h-0 flex-auto flex-col px-3 sm:px-4">
                {filteredAdmissions.length > 0 ? (
                  <div className="custom-scrollbar min-h-0 max-h-[42rem] flex-auto space-y-2 overflow-y-auto pr-1 min-[1180px]:max-h-none" aria-label="รายการใบสมัคร">
                    {visibleAdmissions.map((admission) => {
                      const status = admissionStatusMeta[admission.status];
                      const application = applicationTypeMeta[admission.applicationType];
                      const isSelected = selectedAdmission?.id === admission.id;
                      return (
                        <button
                          key={admission.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => selectAdmission(admission)}
                          className={`w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/60"}`}
                        >
                          <div className="flex items-start gap-3">
                            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                              {initials(admission.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-foreground">{admission.name}</span>
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </span>
                              <span className="mt-1 block truncate text-sm text-muted-foreground">{admission.program}</span>
                              <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant={application.variant}>
                                  <span aria-hidden="true" className="material-symbols-outlined text-sm">{application.icon}</span>
                                  {application.label}
                                </Badge>
                                <span>{admission.id}</span>
                                <span aria-hidden="true">•</span>
                                <span>{admission.date}</span>
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon="manage_search"
                    title="ไม่พบคำสมัคร"
                    description="ลองเปลี่ยนคำค้นหา ประเภท หรือสถานะคำสมัคร"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="min-w-0">
          {selectedAdmission ? (
            <>
              <CardHeader className="border-b border-border">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{selectedAdmission.name}</CardTitle>
                      <Badge variant={admissionStatusMeta[selectedAdmission.status].variant}>
                        {admissionStatusMeta[selectedAdmission.status].label}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {selectedAdmission.id} · {selectedAdmission.program}
                    </CardDescription>
                  </div>
                  <Badge variant={applicationTypeMeta[selectedAdmission.applicationType].variant} className="h-7 px-3">
                    <span aria-hidden="true" className="material-symbols-outlined text-base">{applicationTypeMeta[selectedAdmission.applicationType].icon}</span>
                    {applicationTypeMeta[selectedAdmission.applicationType].label}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <section aria-labelledby="admission-applicant-heading">
                  <h2 id="admission-applicant-heading" className="text-base font-semibold">ข้อมูลคำสมัคร</h2>
                  <dl className="mt-3 grid gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">เลขใบประกอบวิชาชีพ</dt>
                      <dd className="mt-1 font-medium">{selectedAdmission.license}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">วันที่ส่งคำสมัคร</dt>
                      <dd className="mt-1 font-medium">{selectedAdmission.date}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">ประเภทการสมัคร</dt>
                      <dd className="mt-1 font-medium">{applicationTypeMeta[selectedAdmission.applicationType].label}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">สถานะเอกสาร</dt>
                      <dd className="mt-1">
                        <Badge variant={documentStatusMeta[selectedAdmission.documentStatus].variant}>
                          {documentStatusMeta[selectedAdmission.documentStatus].label}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </section>

                <section aria-labelledby="admission-license-heading">
                  <h2 id="admission-license-heading" className="mb-3 text-base font-semibold">ผลตรวจสอบใบอนุญาต</h2>
                  <LicenseEligibilityNotice
                    status={selectedAdmission.licenseStatus}
                    licenseNumber={selectedAdmission.license}
                    checkedAt={selectedAdmission.licenseCheckedAt}
                  />
                </section>

                <section aria-labelledby="admission-documents-heading">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 id="admission-documents-heading" className="text-base font-semibold">เอกสารประกอบการสมัคร</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        เลือกรายการที่ต้องแก้ไข แล้วส่งคำแนะนำกลับให้ผู้สมัคร
                      </p>
                    </div>
                    <Badge variant={documentStatusMeta[selectedAdmission.documentStatus].variant}>
                      {documentStatusMeta[selectedAdmission.documentStatus].label}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2">
                    {selectedAdmission.documents.map((document) => {
                      const isSelectedMissing = missingDocumentIds.includes(document.id);
                      const review = documentReviewMeta[document.reviewStatus];
                      return (
                        <div
                          key={document.id}
                          className={`rounded-2xl border p-3 ${isSelectedMissing ? "border-danger-border bg-danger-soft" : "border-border bg-background"}`}
                        >
                          <div className="flex items-start gap-3">
                            {selectedAdmission.status === "pending" ? (
                              <input
                                type="checkbox"
                                checked={isSelectedMissing}
                                onChange={() => toggleMissingDocument(document.id)}
                                className="mt-1 size-5 shrink-0 rounded border-border accent-brand"
                                aria-label={`เลือก ${document.label} เป็นเอกสารที่ต้องแก้ไข`}
                              />
                            ) : (
                              <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-xl text-muted-foreground">description</span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{document.label}</p>
                                {!document.required ? <Badge variant="outline">ทางเลือก</Badge> : null}
                              </div>
                              {document.hint ? <p className="mt-1 text-xs text-muted-foreground">{document.hint}</p> : null}
                              {document.file ? (
                                <button
                                  type="button"
                                  onClick={() => toast.info(`ไฟล์แนบ: ${document.file?.name}`, {
                                    description: "ระบบตัวอย่างบันทึกเฉพาะข้อมูลไฟล์สำหรับการตรวจสอบ",
                                  })}
                                  className="mt-2 inline-flex min-h-11 max-w-full items-center gap-2 text-left text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <span aria-hidden="true" className="material-symbols-outlined text-lg">draft</span>
                                  <span className="truncate">{document.file.name}</span>
                                  <span className="shrink-0 text-muted-foreground">({formatFileSize(document.file.size)})</span>
                                </button>
                              ) : (
                                <p className="mt-2 text-xs text-muted-foreground">ยังไม่ได้แนบไฟล์</p>
                              )}
                            </div>
                            <Badge variant={isSelectedMissing ? "danger" : review.variant}>
                              {isSelectedMissing ? "เลือกให้แก้ไข" : review.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {selectedAdmission.status === "pending" ? (
                  <section aria-labelledby="admission-review-note-heading" className="space-y-2">
                    <label id="admission-review-note-heading" htmlFor="institution-admission-review-note" className="text-sm font-semibold">
                      บันทึกการพิจารณา
                    </label>
                    <Textarea
                      id="institution-admission-review-note"
                      rows={3}
                      value={reviewNote}
                      onChange={(event) => {
                        setReviewNote(event.target.value);
                        setReviewError("");
                      }}
                      placeholder="ระบุคำแนะนำเมื่อส่งกลับเอกสาร หรือเหตุผลเมื่อไม่อนุมัติ"
                    />
                    {selectedAdmission.documentNote ? (
                      <p className="text-xs text-warning-on-soft">คำแนะนำล่าสุด: {selectedAdmission.documentNote}</p>
                    ) : null}
                    {reviewError ? <p role="alert" className="text-sm text-danger">{reviewError}</p> : null}
                  </section>
                ) : (
                  <section aria-labelledby="admission-decision-heading" className="rounded-2xl border border-border bg-muted/30 p-4">
                    <h2 id="admission-decision-heading" className="font-semibold">ผลการพิจารณา</h2>
                    <p className="mt-2 text-sm">{selectedAdmission.decisionNote ?? "ไม่มีบันทึกเพิ่มเติม"}</p>
                    {selectedAdmission.reviewedBy || selectedAdmission.reviewedAt ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {selectedAdmission.reviewedBy ?? "ผู้ดูแลสถาบัน"}
                        {selectedAdmission.reviewedAt ? ` · ${formatInstitutionDateTime(selectedAdmission.reviewedAt)}` : ""}
                      </p>
                    ) : null}
                  </section>
                )}

                {selectedAdmission.status === "pending" ? (
                  <section aria-label="การพิจารณาคำสมัคร" className="space-y-3 border-t border-border pt-5">
                    {approvalIssue ? (
                      <div role="status" className="flex items-start gap-2 rounded-xl border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-on-soft">
                        <span aria-hidden="true" className="material-symbols-outlined text-xl">info</span>
                        <span>{approvalIssue}</span>
                      </div>
                    ) : (
                      <div role="status" className="flex items-start gap-2 rounded-xl border border-success-border bg-success-soft px-3 py-2 text-sm text-success-on-soft">
                        <span aria-hidden="true" className="material-symbols-outlined text-xl">verified</span>
                        <span>เอกสารและคุณสมบัติพร้อมสำหรับการอนุมัติ</span>
                      </div>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="min-h-11"
                        disabled={missingDocumentIds.length > 0}
                        onClick={() => reviewAdmission("documents_complete")}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">task_alt</span>
                        ยืนยันเอกสารครบถ้วน
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="min-h-11 border-warning-border text-warning-on-soft hover:bg-warning-soft"
                        onClick={() => reviewAdmission("request_information")}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">outgoing_mail</span>
                        ส่งกลับแก้ไขเอกสาร
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="lg"
                        className="min-h-11"
                        onClick={() => reviewAdmission("reject")}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">cancel</span>
                        ไม่อนุมัติ
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        className="min-h-11"
                        disabled={Boolean(approvalIssue)}
                        onClick={() => reviewAdmission("approve")}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">person_check</span>
                        {selectedAdmission.applicationType === "exam" ? "อนุมัติให้สมัครสอบ" : "อนุมัติให้เข้าศึกษา"}
                      </Button>
                    </div>
                  </section>
                ) : null}
              </CardContent>
            </>
          ) : (
            <CardContent>
              <EmptyState
                icon="assignment_ind"
                title="ยังไม่มีคำสมัครในสถาบันนี้"
                description="คำสมัครสอบและสมัครเรียนที่เลือกสถาบันนี้จะแสดงที่นี่"
              />
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
