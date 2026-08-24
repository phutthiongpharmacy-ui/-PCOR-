"use client";

import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useMockDb } from "@/providers/mock-db-provider";
import {
  EmptyState,
  ScopeBadge,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  courseOfferingChangeStatusMeta,
  isAcademicAffiliationActive,
  isAcademicAssignmentActive,
  type CourseOffering,
  type CourseOfferingChangeRequest,
  type CourseOfferingEditablePatch,
} from "@/roles/shared/features/academic";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

import {
  filterSelectClassName,
  formatInstitutionDateTime,
  friendlyInstitutionError,
  institutionActor,
  selectClassName,
} from "./institution-workspace-utils";

type CourseDialog =
  | { mode: "request"; offering: CourseOffering }
  | { mode: "resubmit"; offering: CourseOffering; request: CourseOfferingChangeRequest }
  | { mode: "status"; offering: CourseOffering }
  | null;

export default function InstitutionCoursesSection() {
  const db = useMockDb();
  const { session } = usePortalSession();
  const actor = institutionActor(session);
  const institutionId = actor?.organisationId ?? "";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CourseOffering["status"]>("all");
  const [dialog, setDialog] = useState<CourseDialog>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [credits, setCredits] = useState("");
  const [term, setTerm] = useState("");
  const [reviewerTeacherId, setReviewerTeacherId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const offerings = useMemo(() => (
    db.courseOfferings.filter((item) => item.institutionId === institutionId)
  ), [db.courseOfferings, institutionId]);
  const requests = useMemo(() => (
    db.courseOfferingChangeRequests
      .filter((item) => item.institutionId === institutionId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  ), [db.courseOfferingChangeRequests, institutionId]);
  const teachers = useMemo(() => {
    const ids = new Set(db.teacherAffiliations
      .filter((item) => item.institutionId === institutionId && isAcademicAffiliationActive(item))
      .map((item) => item.teacherId));
    return db.academicTeachers.filter((teacher) => ids.has(teacher.id));
  }, [db.academicTeachers, db.teacherAffiliations, institutionId]);
  const filteredOfferings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th-TH");
    return offerings.filter((offering) => (
      (statusFilter === "all" || offering.status === statusFilter) &&
      (!normalized || `${offering.courseCode} ${offering.courseTitle} ${offering.term}`
        .toLocaleLowerCase("th-TH")
        .includes(normalized))
    ));
  }, [offerings, query, statusFilter]);
  const dialogReviewers = useMemo(() => {
    if (!dialog || dialog.mode === "status") return [];
    const eligibleIds = new Set(db.teachingAssignments
      .filter((assignment) => (
        assignment.institutionId === institutionId &&
        assignment.courseOfferingId === dialog.offering.id &&
        assignment.status === "accepted" &&
        isAcademicAssignmentActive(assignment)
      ))
      .map((assignment) => assignment.teacherId));
    return teachers.filter((teacher) => eligibleIds.has(teacher.id));
  }, [db.teachingAssignments, dialog, institutionId, teachers]);

  const closeDialog = () => {
    setDialog(null);
    setCourseTitle("");
    setCredits("");
    setTerm("");
    setReviewerTeacherId("");
    setReason("");
    setError("");
  };

  const openRequest = (offering: CourseOffering) => {
    closeDialog();
    const assignedTeacherId = db.teachingAssignments.find((assignment) => (
      assignment.institutionId === institutionId &&
      assignment.courseOfferingId === offering.id &&
      assignment.status === "accepted" &&
      isAcademicAssignmentActive(assignment) &&
      teachers.some((teacher) => teacher.id === assignment.teacherId)
    ))?.teacherId;
    setCourseTitle(offering.courseTitle);
    setCredits(String(offering.credits));
    setTerm(offering.term);
    setReviewerTeacherId(assignedTeacherId ?? teachers[0]?.id ?? "");
    setDialog({ mode: "request", offering });
  };

  const openResubmit = (offering: CourseOffering, request: CourseOfferingChangeRequest) => {
    closeDialog();
    setCourseTitle(request.proposedChanges.courseTitle ?? offering.courseTitle);
    setCredits(String(request.proposedChanges.credits ?? offering.credits));
    setTerm(request.proposedChanges.term ?? offering.term);
    setReviewerTeacherId(request.reviewerTeacherId);
    setDialog({ mode: "resubmit", offering, request });
  };

  const openStatus = (offering: CourseOffering) => {
    closeDialog();
    setDialog({ mode: "status", offering });
  };

  const proposedChanges = (offering: CourseOffering): CourseOfferingEditablePatch => {
    const patch: CourseOfferingEditablePatch = {};
    const normalizedCredits = Number(credits);
    if (courseTitle.trim() !== offering.courseTitle) patch.courseTitle = courseTitle.trim();
    if (Number.isFinite(normalizedCredits) && normalizedCredits !== offering.credits) patch.credits = normalizedCredits;
    if (term.trim() !== offering.term) patch.term = term.trim();
    return patch;
  };

  const submitDialog = () => {
    if (!dialog || !actor) return;
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError("กรุณาระบุเหตุผลเพื่อใช้ตรวจสอบย้อนหลัง");
      return;
    }

    try {
      if (dialog.mode === "status") {
        db.updateCourseOfferingStatus({
          actor,
          courseOfferingId: dialog.offering.id,
          status: dialog.offering.status === "open" ? "closed" : "open",
          reason: normalizedReason,
        });
        toast.success(dialog.offering.status === "open" ? "ปิดรายวิชาแล้ว" : "เปิดรายวิชาแล้ว");
        closeDialog();
        return;
      }

      if (!reviewerTeacherId) {
        setError("กรุณาเลือกอาจารย์ผู้ตรวจสอบ");
        return;
      }
      if (!courseTitle.trim() || !term.trim() || Number(credits) <= 0) {
        setError("กรุณากรอกข้อมูลรายวิชาให้ครบถ้วน");
        return;
      }
      const changes = proposedChanges(dialog.offering);
      if (Object.keys(changes).length === 0) {
        setError("กรุณาแก้ไขข้อมูลอย่างน้อยหนึ่งรายการก่อนส่ง");
        return;
      }

      if (dialog.mode === "request") {
        db.requestCourseOfferingChange({
          actor,
          courseOfferingId: dialog.offering.id,
          reviewerTeacherId,
          proposedChanges: changes,
          reason: normalizedReason,
        });
        toast.success("ส่งคำขอแก้ไขให้อาจารย์ตรวจสอบแล้ว");
      } else {
        db.resubmitCourseOfferingChange({
          actor,
          requestId: dialog.request.id,
          proposedChanges: changes,
          reason: normalizedReason,
        });
        toast.success("ส่งข้อมูลที่ปรับแก้ให้อาจารย์ตรวจสอบแล้ว");
      }
      closeDialog();
    } catch (cause) {
      setError(friendlyInstitutionError(cause, "ไม่สามารถบันทึกคำขอได้ กรุณาลองอีกครั้ง"));
    }
  };

  return (
    <>
      <WorkspaceHeader
        eyebrow="การเปิดสอนของสถาบัน"
        title="รายวิชาที่เปิดสอน"
        description="ติดตามรายการเปิดสอนของสถาบันในแต่ละภาคการศึกษา พร้อมส่งคำขอแก้ไขให้อาจารย์ผู้รับผิดชอบตรวจสอบ"
      />

      <Card className="border-info-border bg-info-soft">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-info-on-soft">
          <span aria-hidden="true" className="material-symbols-outlined shrink-0">info</span>
          <p>
            หน้านี้ใช้จัดการข้อมูลรายการเปิดสอนของสถาบัน เช่น รายวิชา ภาคการศึกษา และจำนวนหน่วยกิต
            ส่วนการสร้างรายวิชาใหม่เป็นอีกกระบวนการหนึ่ง
          </p>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="space-y-1.5">
            <label htmlFor="institution-course-search" className="text-sm font-medium text-foreground">
              ค้นหารายวิชา
            </label>
            <Input
              id="institution-course-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหารหัส ชื่อ หรือภาคการศึกษา"
              className="h-11 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="institution-course-status" className="text-sm font-medium text-foreground">
              สถานะการเปิดรายวิชา
            </label>
            <select
              id="institution-course-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className={filterSelectClassName}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="open">เปิดอยู่</option>
              <option value="closed">ปิดแล้ว</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        พบ {filteredOfferings.length} รายการเปิดสอน
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredOfferings.map((offering) => {
          const offeringRequests = requests.filter((request) => request.courseOfferingId === offering.id);
          const latestRequest = offeringRequests[0];
          const requestMeta = latestRequest ? courseOfferingChangeStatusMeta[latestRequest.status] : null;
          const reviewer = latestRequest
            ? teachers.find((teacher) => teacher.id === latestRequest.reviewerTeacherId)
            : null;
          const acceptedTeacherCount = db.teachingAssignments.filter((item) => (
            item.institutionId === institutionId &&
            item.courseOfferingId === offering.id &&
            item.status === "accepted" &&
            isAcademicAssignmentActive(item) &&
            teachers.some((teacher) => teacher.id === item.teacherId)
          )).length;
          const reviewerHasActiveAssignment = latestRequest ? db.teachingAssignments.some((item) => (
            item.institutionId === institutionId &&
            item.courseOfferingId === offering.id &&
            item.teacherId === latestRequest.reviewerTeacherId &&
            item.status === "accepted" &&
            isAcademicAssignmentActive(item) &&
            teachers.some((teacher) => teacher.id === item.teacherId)
          )) : false;
          const canSubmitNew = !latestRequest || latestRequest.status === "approved" || latestRequest.status === "rejected";
          const isRevisionRequest = latestRequest?.status === "needs_revision";
          const changeActionDisabled = isRevisionRequest
            ? !reviewerHasActiveAssignment
            : !canSubmitNew || acceptedTeacherCount === 0;
          const actionDisabledReason = latestRequest?.status === "pending_teacher_review"
            ? "คำขออยู่ระหว่างการตรวจสอบ โปรดรอผลจากอาจารย์ก่อนส่งคำขอใหม่"
            : acceptedTeacherCount === 0
              ? "ต้องมีอาจารย์ที่ตอบรับและอยู่ในช่วงมอบหมายของรายวิชานี้ก่อนเสนอการแก้ไข"
              : isRevisionRequest && !reviewerHasActiveAssignment
                ? "อาจารย์ผู้ตรวจสอบไม่ได้อยู่ในช่วงมอบหมายแล้ว กรุณาจัดการมอบหมายการสอนก่อนส่งใหม่"
                : null;
          return (
            <Card key={offering.id} className="border-border">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <ScopeBadge>{offering.term}</ScopeBadge>
                  <Badge variant={offering.status === "open" ? "success" : "secondary"}>
                    {offering.status === "open" ? "เปิดอยู่" : "ปิดแล้ว"}
                  </Badge>
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{offering.courseCode} · {offering.courseTitle}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {offering.credits} หน่วยกิต
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    อาจารย์ที่ตอบรับการสอน {acceptedTeacherCount} คน
                  </p>
                </div>

                {latestRequest && requestMeta ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">คำขอแก้ไขล่าสุด</span>
                      <Badge variant={requestMeta.variant}>{requestMeta.label}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      ผู้ตรวจสอบ: {reviewer?.name ?? "ไม่พบอาจารย์ผู้ตรวจสอบในขอบเขต"} · {formatInstitutionDateTime(latestRequest.updatedAt)}
                    </p>
                    {latestRequest.latestReview?.reason ? (
                      <p className="mt-2 text-xs text-foreground">ข้อเสนอแนะ: {latestRequest.latestReview.reason}</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {latestRequest?.status === "needs_revision" ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={changeActionDisabled}
                      onClick={() => openResubmit(offering, latestRequest)}
                    >
                      ปรับแก้และส่งใหม่
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={changeActionDisabled}
                      onClick={() => openRequest(offering)}
                    >
                      เสนอการแก้ไข
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => openStatus(offering)}>
                    {offering.status === "open" ? "ปิดรายวิชา" : "เปิดรายวิชา"}
                  </Button>
                </div>
                {actionDisabledReason ? (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-base">info</span>
                    <span>{actionDisabledReason}</span>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredOfferings.length === 0 ? (
        <EmptyState
          icon="menu_book"
          title="ไม่พบรายวิชา"
          description="ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
        />
      ) : null}

      <Dialog open={Boolean(dialog)} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent aria-describedby="institution-course-dialog-description">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "status"
                ? `${dialog.offering.status === "open" ? "ปิด" : "เปิด"}รายวิชา`
                : dialog?.mode === "resubmit"
                  ? "ปรับแก้คำขอ"
                  : "เสนอการแก้ไขรายวิชา"}
            </DialogTitle>
            <DialogDescription id="institution-course-dialog-description">
              {dialog?.offering.courseCode} · {dialog?.offering.courseTitle}
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div id="institution-course-error" role="alert" className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">
              <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-lg">cancel</span>
              <span>{error}</span>
            </div>
          ) : null}

          {dialog?.mode === "request" || dialog?.mode === "resubmit" ? (
            <>
              <div className="space-y-1.5">
                <label htmlFor="course-change-title" className="text-sm font-medium">ชื่อรายวิชา</label>
                <Input
                  id="course-change-title"
                  value={courseTitle}
                  onChange={(event) => { setCourseTitle(event.target.value); setError(""); }}
                  aria-describedby={error ? "institution-course-error" : undefined}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="course-change-credits" className="text-sm font-medium">หน่วยกิต</label>
                  <Input
                    id="course-change-credits"
                    type="number"
                    min="1"
                    value={credits}
                    onChange={(event) => { setCredits(event.target.value); setError(""); }}
                    aria-describedby={error ? "institution-course-error" : undefined}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="course-change-term" className="text-sm font-medium">ภาคการศึกษา</label>
                  <Input
                    id="course-change-term"
                    value={term}
                    onChange={(event) => { setTerm(event.target.value); setError(""); }}
                    aria-describedby={error ? "institution-course-error" : undefined}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="course-change-reviewer" className="text-sm font-medium">อาจารย์ผู้ตรวจสอบ</label>
                <select
                  id="course-change-reviewer"
                  value={reviewerTeacherId}
                  onChange={(event) => { setReviewerTeacherId(event.target.value); setError(""); }}
                  className={selectClassName}
                  disabled={dialog.mode === "resubmit"}
                  aria-describedby={error ? "institution-course-error" : undefined}
                >
                  <option value="">เลือกอาจารย์</option>
                  {dialogReviewers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                </select>
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="institution-course-reason" className="text-sm font-medium">
              เหตุผล <span aria-hidden="true" className="text-danger">*</span>
            </label>
            <Textarea
              id="institution-course-reason"
              value={reason}
              onChange={(event) => { setReason(event.target.value); setError(""); }}
              aria-invalid={Boolean(error && !reason.trim())}
              aria-describedby={error ? "institution-course-error" : undefined}
              placeholder="อธิบายเหตุผลและผลกระทบของการเปลี่ยนแปลง"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>ยกเลิก</Button>
            <Button type="button" onClick={submitDialog}>
              {dialog?.mode === "status" ? "ยืนยัน" : "ส่งให้อาจารย์ตรวจสอบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
