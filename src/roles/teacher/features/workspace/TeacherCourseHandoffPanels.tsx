"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMockDb } from "@/providers/mock-db-provider";
import {
  canTeacherAccessOfferingWithinAffiliation,
  courseOfferingChangeStatusMeta,
  teachingAssignmentStatusMeta,
  type CourseOfferingChangeDecision,
  type CourseOfferingChangeRequest,
  type ScopedAcademicActor,
  type TeachingAssignment,
} from "@/roles/shared/features/academic";
import { hasResourceScope } from "@/roles/shared/features/roles/access-model";

interface TeacherCourseHandoffPanelsProps {
  actor: ScopedAcademicActor;
}

interface AssignmentDialogState {
  assignment: TeachingAssignment;
  decision: "accept" | "decline";
}

interface CourseChangeDialogState {
  request: CourseOfferingChangeRequest;
  decision: CourseOfferingChangeDecision;
}

const courseFieldCopy = {
  courseTitle: "ชื่อรายวิชา",
  credits: "หน่วยกิต",
  term: "ภาคการศึกษา",
} as const;

function formatDate(value?: string) {
  if (!value) return "ไม่มีกำหนด";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function displayValue(value: string | number | undefined) {
  if (value === undefined || value === "") return "—";
  return String(value);
}

function hasTeacherCourseScope(resourceScopes: readonly string[], courseOfferingId: string) {
  return hasResourceScope(resourceScopes, "course:assigned") ||
    hasResourceScope(resourceScopes, `course:${courseOfferingId}`);
}

export default function TeacherCourseHandoffPanels({ actor }: TeacherCourseHandoffPanelsProps) {
  const db = useMockDb();
  const [assignmentDialog, setAssignmentDialog] = useState<AssignmentDialogState | null>(null);
  const [courseChangeDialog, setCourseChangeDialog] = useState<CourseChangeDialogState | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const {
    organisationId: actorOrganisationId,
    resourceScopes: actorResourceScopes,
    role: actorRole,
    userId: actorUserId,
  } = actor;

  const assignmentRequests = useMemo(() => db.teachingAssignments.filter((assignment) => {
    const reviewerTeacherId = assignment.pendingChanges?.teacherId ?? assignment.teacherId;
    const courseOfferingId = assignment.pendingChanges?.courseOfferingId ?? assignment.courseOfferingId;
    const requiresResponse = assignment.status === "pending_teacher_response" ||
      (assignment.status === "accepted" && Boolean(assignment.pendingChanges));
    return actorRole === "teacher" &&
      requiresResponse &&
      reviewerTeacherId === actorUserId &&
      assignment.institutionId === actorOrganisationId &&
      hasTeacherCourseScope(actorResourceScopes, courseOfferingId);
  }), [actorOrganisationId, actorResourceScopes, actorRole, actorUserId, db.teachingAssignments]);

  const courseChangeRequests = useMemo(() => db.courseOfferingChangeRequests.filter((request) => (
    actorRole === "teacher" &&
    request.status === "pending_teacher_review" &&
    request.reviewerTeacherId === actorUserId &&
    request.institutionId === actorOrganisationId &&
    hasTeacherCourseScope(actorResourceScopes, request.courseOfferingId) &&
    canTeacherAccessOfferingWithinAffiliation(
      db.teachingAssignments,
      db.teacherAffiliations,
      actorUserId,
      actorOrganisationId,
      request.courseOfferingId,
    )
  )), [
    actorOrganisationId,
    actorResourceScopes,
    actorRole,
    actorUserId,
    db.courseOfferingChangeRequests,
    db.teacherAffiliations,
    db.teachingAssignments,
  ]);

  const closeDialog = () => {
    setAssignmentDialog(null);
    setCourseChangeDialog(null);
    setReason("");
    setError("");
  };

  const openAssignmentDialog = (
    assignment: TeachingAssignment,
    decision: AssignmentDialogState["decision"],
  ) => {
    setCourseChangeDialog(null);
    setAssignmentDialog({ assignment, decision });
    setReason("");
    setError("");
  };

  const openCourseChangeDialog = (
    request: CourseOfferingChangeRequest,
    decision: CourseOfferingChangeDecision,
  ) => {
    setAssignmentDialog(null);
    setCourseChangeDialog({ request, decision });
    setReason("");
    setError("");
  };

  const submitAssignmentResponse = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assignmentDialog) return;
    const normalizedReason = reason.trim();
    if (assignmentDialog.decision === "decline" && !normalizedReason) {
      setError("กรุณาระบุเหตุผลที่ไม่ตอบรับการมอบหมาย");
      return;
    }
    try {
      db.respondTeachingAssignment({
        actor,
        assignmentId: assignmentDialog.assignment.id,
        decision: assignmentDialog.decision,
        reason: normalizedReason || undefined,
      });
      toast.success(assignmentDialog.decision === "accept"
        ? "ตอบรับการมอบหมายการสอนแล้ว"
        : "ส่งผลไม่ตอบรับพร้อมเหตุผลแล้ว");
      closeDialog();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถบันทึกผลการตอบรับได้");
    }
  };

  const submitCourseChangeReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!courseChangeDialog) return;
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError("กรุณาระบุเหตุผลประกอบผลการตรวจสอบ");
      return;
    }
    try {
      db.reviewCourseOfferingChange({
        actor,
        requestId: courseChangeDialog.request.id,
        decision: courseChangeDialog.decision,
        reason: normalizedReason,
      });
      toast.success(courseChangeDialog.decision === "approved"
        ? "ยืนยันการแก้ไขข้อมูลรายวิชาแล้ว"
        : courseChangeDialog.decision === "needs_revision"
          ? "ส่งคำขอให้สถาบันปรับแก้แล้ว"
          : "ส่งผลไม่อนุมัติพร้อมเหตุผลแล้ว");
      closeDialog();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถบันทึกผลการตรวจสอบได้");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">คำเชิญมอบหมายการสอน</CardTitle>
            <Badge variant={assignmentRequests.length ? "warning" : "secondary"}>
              {assignmentRequests.length} รายการ
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            ตรวจรายละเอียดก่อนตอบรับ รายวิชาใหม่จะเปิดให้ใช้งานหลังตอบรับแล้วเท่านั้น
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignmentRequests.map((assignment) => {
            const changes = assignment.pendingChanges;
            const currentOffering = db.courseOfferings.find((item) => item.id === assignment.courseOfferingId);
            const proposedOffering = db.courseOfferings.find((item) => (
              item.id === (changes?.courseOfferingId ?? assignment.courseOfferingId)
            ));
            const isChange = assignment.status === "accepted" && Boolean(changes);
            const statusMeta = teachingAssignmentStatusMeta[assignment.status];
            return (
              <article key={assignment.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {proposedOffering?.courseCode ?? changes?.courseOfferingId ?? assignment.courseOfferingId}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {proposedOffering?.courseTitle ?? "ไม่พบข้อมูลรายวิชา"}
                    </p>
                  </div>
                  <Badge variant={isChange ? "warning" : statusMeta.variant}>
                    {isChange ? "รอยืนยันการเปลี่ยนแปลง" : statusMeta.label}
                  </Badge>
                </div>

                <dl className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-3 text-sm sm:grid-cols-2">
                  {isChange ? (
                    <>
                      <div>
                        <dt className="text-xs text-muted-foreground">ข้อมูลปัจจุบัน</dt>
                        <dd className="mt-1 font-medium text-foreground">
                          {currentOffering?.courseCode ?? assignment.courseOfferingId} · {formatDate(assignment.startsAt)} – {formatDate(assignment.endsAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">ข้อมูลที่เสนอ</dt>
                        <dd className="mt-1 font-medium text-foreground">
                          {proposedOffering?.courseCode ?? changes?.courseOfferingId} · {formatDate(changes?.startsAt)} – {formatDate(changes?.endsAt)}
                        </dd>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <dt className="text-xs text-muted-foreground">ภาคการศึกษา</dt>
                        <dd className="mt-1 font-medium text-foreground">
                          {proposedOffering?.term ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">ช่วงเวลาที่มอบหมาย</dt>
                        <dd className="mt-1 font-medium text-foreground">
                          {formatDate(assignment.startsAt)} – {formatDate(assignment.endsAt)}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openAssignmentDialog(assignment, "decline")}
                  >
                    ไม่ตอบรับ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openAssignmentDialog(assignment, "accept")}
                  >
                    {isChange ? "ยืนยันการเปลี่ยนแปลง" : "ตอบรับการสอน"}
                  </Button>
                </div>
              </article>
            );
          })}
          {assignmentRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-muted-foreground">mark_email_read</span>
              <p className="mt-2 text-sm font-medium text-foreground">ไม่มีคำเชิญที่รอตอบรับ</p>
              <p className="mt-1 text-xs text-muted-foreground">คำเชิญใหม่หรือคำขอเปลี่ยนแปลงจะแสดงที่นี่</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">คำขอแก้ไขข้อมูลรายวิชา</CardTitle>
            <Badge variant={courseChangeRequests.length ? "warning" : "secondary"}>
              {courseChangeRequests.length} รายการ
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            เปรียบเทียบข้อมูลเดิมและข้อมูลที่สถาบันเสนอ ก่อนบันทึกผลการตรวจสอบ
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {courseChangeRequests.map((request) => {
            const offering = db.courseOfferings.find((item) => item.id === request.courseOfferingId);
            const changedFields = (Object.keys(courseFieldCopy) as (keyof typeof courseFieldCopy)[])
              .filter((field) => request.proposedChanges[field] !== undefined);
            const meta = courseOfferingChangeStatusMeta[request.status];
            return (
              <article key={request.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {offering?.courseCode ?? request.courseOfferingId}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{offering?.courseTitle ?? "ไม่พบข้อมูลรายวิชา"}</p>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <div className="grid grid-cols-3 bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>ข้อมูล</span>
                    <span>ปัจจุบัน</span>
                    <span>ที่เสนอ</span>
                  </div>
                  <dl className="divide-y divide-border">
                    {changedFields.map((field) => (
                      <div key={field} className="grid grid-cols-3 gap-2 px-3 py-2 text-sm">
                        <dt className="text-muted-foreground">{courseFieldCopy[field]}</dt>
                        <dd className="break-words text-foreground">{displayValue(offering?.[field])}</dd>
                        <dd className="break-words font-medium text-foreground">{displayValue(request.proposedChanges[field])}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="mt-3 rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">เหตุผลจากสถาบัน</p>
                  <p className="mt-1 text-sm text-foreground">{request.reason}</p>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openCourseChangeDialog(request, "rejected")}
                  >
                    ไม่อนุมัติ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openCourseChangeDialog(request, "needs_revision")}
                  >
                    ขอให้ปรับแก้
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openCourseChangeDialog(request, "approved")}
                  >
                    อนุมัติการแก้ไข
                  </Button>
                </div>
              </article>
            );
          })}
          {courseChangeRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-muted-foreground">task_alt</span>
              <p className="mt-2 text-sm font-medium text-foreground">ไม่มีคำขอแก้ไขที่รอตรวจสอบ</p>
              <p className="mt-1 text-xs text-muted-foreground">รายการจากสถาบันจะแสดงพร้อมข้อมูลเดิมและข้อมูลที่เสนอ</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(assignmentDialog)} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assignmentDialog?.decision === "accept" ? "ยืนยันการตอบรับ" : "ไม่ตอบรับการมอบหมาย"}
            </DialogTitle>
            <DialogDescription>
              ระบบจะส่งผลการตัดสินใจกลับไปยังผู้ดูแลสถาบันและบันทึกประวัติการดำเนินการ
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAssignmentResponse} noValidate className="space-y-4">
            {error ? (
              <div id="assignment-response-error" role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">
                {error}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <label htmlFor="assignment-response-reason" className="text-sm font-medium">
                {assignmentDialog?.decision === "decline" ? "เหตุผลที่ไม่ตอบรับ" : "หมายเหตุ (ถ้ามี)"}
              </label>
              <Textarea
                id="assignment-response-reason"
                value={reason}
                onChange={(event) => { setReason(event.target.value); setError(""); }}
                required={assignmentDialog?.decision === "decline"}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "assignment-response-error" : undefined}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>ยกเลิก</Button>
              <Button type="submit">
                {assignmentDialog?.decision === "accept" ? "ยืนยันการตอบรับ" : "ส่งผลไม่ตอบรับ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(courseChangeDialog)} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {courseChangeDialog?.decision === "approved"
                ? "อนุมัติการแก้ไขข้อมูลรายวิชา"
                : courseChangeDialog?.decision === "needs_revision"
                  ? "ขอให้สถาบันปรับแก้ข้อมูล"
                  : "ไม่อนุมัติการแก้ไขข้อมูล"}
            </DialogTitle>
            <DialogDescription>
              ระบุเหตุผลเพื่อให้สถาบันเห็นผลการตรวจสอบและดำเนินการขั้นถัดไปได้ชัดเจน
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCourseChangeReview} noValidate className="space-y-4">
            {error ? (
              <div id="course-change-review-error" role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">
                {error}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <label htmlFor="course-change-review-reason" className="text-sm font-medium">เหตุผลประกอบผลการตรวจสอบ</label>
              <Textarea
                id="course-change-review-reason"
                value={reason}
                onChange={(event) => { setReason(event.target.value); setError(""); }}
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "course-change-review-error" : undefined}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>ยกเลิก</Button>
              <Button type="submit">ยืนยันผลการตรวจสอบ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
