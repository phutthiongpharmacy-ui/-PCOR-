"use client";

import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMockDb } from "@/providers/mock-db-provider";
import {
  EmptyState,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  isAcademicAffiliationActive,
  teachingAssignmentStatusMeta,
  type TeachingAssignment,
} from "@/roles/shared/features/academic";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

import {
  dateInputValue,
  formatInstitutionDate,
  friendlyAssignmentError,
  institutionActor,
  selectClassName,
} from "./institution-workspace-utils";

type AssignmentDialog =
  | { mode: "edit" | "cancel"; assignment: TeachingAssignment }
  | null;

function isoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export default function InstitutionAssignmentsSection() {
  const db = useMockDb();
  const { session } = usePortalSession();
  const actor = institutionActor(session);
  const institutionId = actor?.organisationId ?? "";
  const [teacherId, setTeacherId] = useState("");
  const [courseOfferingId, setCourseOfferingId] = useState("");
  const [startsAt, setStartsAt] = useState(dateInputValue(new Date().toISOString()));
  const [endsAt, setEndsAt] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [dialog, setDialog] = useState<AssignmentDialog>(null);
  const [dialogTeacherId, setDialogTeacherId] = useState("");
  const [dialogCourseId, setDialogCourseId] = useState("");
  const [dialogStartsAt, setDialogStartsAt] = useState("");
  const [dialogEndsAt, setDialogEndsAt] = useState("");
  const [dialogReason, setDialogReason] = useState("");
  const [dialogError, setDialogError] = useState("");

  const institutionTeacherAffiliations = useMemo(() => (
    db.teacherAffiliations.filter((item) => item.institutionId === institutionId)
  ), [db.teacherAffiliations, institutionId]);
  const affiliatedTeacherIds = useMemo(() => new Set(
    institutionTeacherAffiliations.map((item) => item.teacherId),
  ), [institutionTeacherAffiliations]);
  const activeTeacherIds = useMemo(() => new Set(
    institutionTeacherAffiliations
      .filter((item) => isAcademicAffiliationActive(item))
      .map((item) => item.teacherId),
  ), [institutionTeacherAffiliations]);
  const scopedTeachers = useMemo(() => (
    db.academicTeachers.filter((teacher) => affiliatedTeacherIds.has(teacher.id))
  ), [affiliatedTeacherIds, db.academicTeachers]);
  const teachers = useMemo(() => (
    scopedTeachers.filter((teacher) => activeTeacherIds.has(teacher.id))
  ), [activeTeacherIds, scopedTeachers]);
  const offerings = useMemo(() => (
    db.courseOfferings.filter((item) => item.institutionId === institutionId)
  ), [db.courseOfferings, institutionId]);
  const offeringIds = useMemo(() => new Set(offerings.map((item) => item.id)), [offerings]);
  const assignments = useMemo(() => (
    db.teachingAssignments
      .filter((item) => (
        item.institutionId === institutionId &&
        affiliatedTeacherIds.has(item.teacherId) &&
        offeringIds.has(item.courseOfferingId) &&
        (!item.pendingChanges || (
          activeTeacherIds.has(item.pendingChanges.teacherId) &&
          offeringIds.has(item.pendingChanges.courseOfferingId)
        ))
      ))
      .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
  ), [activeTeacherIds, affiliatedTeacherIds, db.teachingAssignments, institutionId, offeringIds]);

  const clearAddForm = () => {
    setTeacherId("");
    setCourseOfferingId("");
    setStartsAt(dateInputValue(new Date().toISOString()));
    setEndsAt("");
    setReason("");
    setFormError("");
  };

  const submitAssignment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!actor || !teacherId || !courseOfferingId || !startsAt) {
      setFormError("กรุณาเลือกอาจารย์ รายวิชา และวันที่เริ่มมอบหมาย");
      return;
    }
    if (!reason.trim()) {
      setFormError("กรุณาระบุเหตุผลของการมอบหมาย");
      return;
    }
    try {
      db.assignTeacherToCourse({
        teacherId,
        courseOfferingId,
        actor,
        startsAt: isoDate(startsAt),
        endsAt: endsAt ? isoDate(endsAt) : undefined,
        reason: reason.trim(),
      });
      toast.success("ส่งการมอบหมายให้อาจารย์ตอบรับแล้ว");
      clearAddForm();
    } catch (cause) {
      setFormError(friendlyAssignmentError(cause));
    }
  };

  const closeDialog = () => {
    setDialog(null);
    setDialogTeacherId("");
    setDialogCourseId("");
    setDialogStartsAt("");
    setDialogEndsAt("");
    setDialogReason("");
    setDialogError("");
  };

  const openEdit = (assignment: TeachingAssignment) => {
    closeDialog();
    setDialogTeacherId(assignment.teacherId);
    setDialogCourseId(assignment.courseOfferingId);
    setDialogStartsAt(dateInputValue(assignment.startsAt));
    setDialogEndsAt(dateInputValue(assignment.endsAt));
    setDialog({ mode: "edit", assignment });
  };

  const openCancel = (assignment: TeachingAssignment) => {
    closeDialog();
    setDialog({ mode: "cancel", assignment });
  };

  const submitDialog = () => {
    if (!dialog || !actor) return;
    if (!dialogReason.trim()) {
      setDialogError("กรุณาระบุเหตุผลเพื่อใช้ตรวจสอบย้อนหลัง");
      return;
    }
    try {
      if (dialog.mode === "edit") {
        if (!dialogTeacherId || !dialogCourseId || !dialogStartsAt) {
          setDialogError("กรุณากรอกข้อมูลการมอบหมายให้ครบถ้วน");
          return;
        }
        db.updateTeachingAssignment({
          actor,
          assignmentId: dialog.assignment.id,
          teacherId: dialogTeacherId,
          courseOfferingId: dialogCourseId,
          startsAt: isoDate(dialogStartsAt),
          endsAt: dialogEndsAt ? isoDate(dialogEndsAt) : undefined,
          reason: dialogReason.trim(),
        });
        toast.success("ส่งข้อมูลที่แก้ไขให้อาจารย์ตอบรับแล้ว");
      } else {
        db.cancelTeachingAssignment({
          actor,
          assignmentId: dialog.assignment.id,
          reason: dialogReason.trim(),
        });
        toast.success("ยกเลิกการมอบหมายแล้ว");
      }
      closeDialog();
    } catch (cause) {
      setDialogError(friendlyAssignmentError(cause));
    }
  };

  return (
    <>
      <WorkspaceHeader
        eyebrow="การจัดผู้สอน"
        title="มอบหมายการสอน"
        description="เพิ่มหรือแก้ไขการมอบหมายแล้วส่งให้อาจารย์ตอบรับก่อนเริ่มปฏิบัติงาน"
      />

      <div className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <Card className="h-fit border-border">
          <CardHeader>
            <CardTitle className="text-lg">เพิ่มการมอบหมาย</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitAssignment} className="space-y-4" noValidate>
              {formError ? (
                <div
                  id="assignment-error"
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft"
                >
                  <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-lg">cancel</span>
                  <span>{formError}</span>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label htmlFor="assignment-teacher" className="text-sm font-medium">อาจารย์</label>
                <select
                  id="assignment-teacher"
                  value={teacherId}
                  onChange={(event) => { setTeacherId(event.target.value); setFormError(""); }}
                  aria-invalid={Boolean(formError && !teacherId)}
                  aria-describedby={formError ? "assignment-error" : undefined}
                  className={selectClassName}
                >
                  <option value="">เลือกอาจารย์</option>
                  {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="assignment-course" className="text-sm font-medium">รายการเปิดสอน</label>
                <select
                  id="assignment-course"
                  value={courseOfferingId}
                  onChange={(event) => { setCourseOfferingId(event.target.value); setFormError(""); }}
                  aria-invalid={Boolean(formError && !courseOfferingId)}
                  aria-describedby={formError ? "assignment-error" : undefined}
                  className={selectClassName}
                >
                  <option value="">เลือกรายการเปิดสอน</option>
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.courseCode} · {offering.courseTitle} · {offering.term}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="assignment-start" className="text-sm font-medium">วันที่เริ่ม</label>
                  <Input
                    id="assignment-start"
                    type="date"
                    value={startsAt}
                    onChange={(event) => { setStartsAt(event.target.value); setFormError(""); }}
                    aria-describedby={formError ? "assignment-error" : undefined}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="assignment-end" className="text-sm font-medium">วันที่สิ้นสุด</label>
                  <Input
                    id="assignment-end"
                    type="date"
                    value={endsAt}
                    onChange={(event) => { setEndsAt(event.target.value); setFormError(""); }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="assignment-reason" className="text-sm font-medium">
                  เหตุผล <span aria-hidden="true" className="text-danger">*</span>
                </label>
                <Textarea
                  id="assignment-reason"
                  value={reason}
                  onChange={(event) => { setReason(event.target.value); setFormError(""); }}
                  aria-invalid={Boolean(formError && !reason.trim())}
                  aria-describedby={formError ? "assignment-error" : undefined}
                  placeholder="เช่น มอบหมายผู้รับผิดชอบประจำภาคการศึกษา"
                />
              </div>

              <Button type="submit" className="w-full">ส่งให้อาจารย์ตอบรับ</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">รายการมอบหมาย</CardTitle>
            <p aria-live="polite" className="text-sm text-muted-foreground">ทั้งหมด {assignments.length} รายการ</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>อาจารย์</TableHead>
                  <TableHead>รายวิชา</TableHead>
                  <TableHead>ช่วงเวลา</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const teacher = scopedTeachers.find((item) => item.id === assignment.teacherId);
                  const offering = offerings.find((item) => item.id === assignment.courseOfferingId);
                  const pendingTeacher = assignment.pendingChanges
                    ? teachers.find((item) => item.id === assignment.pendingChanges?.teacherId)
                    : undefined;
                  const pendingOffering = assignment.pendingChanges
                    ? offerings.find((item) => item.id === assignment.pendingChanges?.courseOfferingId)
                    : undefined;
                  const meta = teachingAssignmentStatusMeta[assignment.status];
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{teacher?.name ?? "ไม่พบข้อมูลอาจารย์ในขอบเขต"}</TableCell>
                      <TableCell>
                        {offering?.courseCode ?? "ไม่พบข้อมูลรายวิชาในขอบเขต"}
                        <p className="text-xs text-muted-foreground">
                          {offering ? `${offering.courseTitle} · ${offering.term}` : "ไม่พบข้อมูลรายวิชา"}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatInstitutionDate(assignment.startsAt)} – {formatInstitutionDate(assignment.endsAt)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          {assignment.pendingChanges ? (
                            <div className="max-w-xs whitespace-normal rounded-lg border border-warning-border bg-warning-soft p-2 text-xs text-warning-on-soft">
                              <p className="font-medium">รออาจารย์ตอบรับข้อมูลใหม่</p>
                              <p className="mt-1">
                                {pendingTeacher?.name ?? "ไม่พบข้อมูลอาจารย์ในขอบเขต"} · {pendingOffering ? `${pendingOffering.courseCode} · ${pendingOffering.term}` : "ไม่พบข้อมูลรายวิชาในขอบเขต"}
                              </p>
                              <p className="mt-0.5">
                                {formatInstitutionDate(assignment.pendingChanges.startsAt)} – {formatInstitutionDate(assignment.pendingChanges.endsAt)}
                              </p>
                            </div>
                          ) : null}
                          {assignment.latestDecision?.reason ? (
                            <p className="max-w-xs whitespace-normal text-xs text-muted-foreground">
                              ความเห็นจากอาจารย์: {assignment.latestDecision.reason}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={assignment.status === "cancelled" || Boolean(assignment.pendingChanges)}
                            onClick={() => openEdit(assignment)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={assignment.status === "cancelled"}
                            onClick={() => openCancel(assignment)}
                          >
                            ยกเลิก
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {assignments.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="ยังไม่มีการมอบหมาย"
                  description="เลือกอาจารย์และรายวิชาเพื่อส่งคำขอให้อาจารย์ตอบรับ"
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(dialog)} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent aria-describedby="assignment-dialog-description">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "แก้ไขการมอบหมาย" : "ยกเลิกการมอบหมาย"}</DialogTitle>
            <DialogDescription id="assignment-dialog-description">
              {dialog?.mode === "edit"
                ? "ข้อมูลที่แก้ไขจะถูกส่งให้อาจารย์ตอบรับก่อนมีผล"
                : "รายการจะถูกเก็บไว้ในประวัติเพื่อตรวจสอบย้อนหลัง"}
            </DialogDescription>
          </DialogHeader>

          {dialogError ? (
            <div id="assignment-dialog-error" role="alert" className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">
              <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-lg">cancel</span>
              <span>{dialogError}</span>
            </div>
          ) : null}

          {dialog?.mode === "edit" ? (
            <>
              <div className="space-y-1.5">
                <label htmlFor="edit-assignment-teacher" className="text-sm font-medium">อาจารย์</label>
                <select
                  id="edit-assignment-teacher"
                  value={dialogTeacherId}
                  onChange={(event) => { setDialogTeacherId(event.target.value); setDialogError(""); }}
                  className={selectClassName}
                  aria-describedby={dialogError ? "assignment-dialog-error" : undefined}
                >
                  {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-assignment-course" className="text-sm font-medium">รายการเปิดสอน</label>
                <select
                  id="edit-assignment-course"
                  value={dialogCourseId}
                  onChange={(event) => { setDialogCourseId(event.target.value); setDialogError(""); }}
                  className={selectClassName}
                  aria-describedby={dialogError ? "assignment-dialog-error" : undefined}
                >
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.courseCode} · {offering.courseTitle} · {offering.term}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-assignment-start" className="text-sm font-medium">วันที่เริ่ม</label>
                  <Input
                    id="edit-assignment-start"
                    type="date"
                    value={dialogStartsAt}
                    onChange={(event) => { setDialogStartsAt(event.target.value); setDialogError(""); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-assignment-end" className="text-sm font-medium">วันที่สิ้นสุด</label>
                  <Input
                    id="edit-assignment-end"
                    type="date"
                    value={dialogEndsAt}
                    onChange={(event) => { setDialogEndsAt(event.target.value); setDialogError(""); }}
                  />
                </div>
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="assignment-dialog-reason" className="text-sm font-medium">
              เหตุผล <span aria-hidden="true" className="text-danger">*</span>
            </label>
            <Textarea
              id="assignment-dialog-reason"
              value={dialogReason}
              onChange={(event) => { setDialogReason(event.target.value); setDialogError(""); }}
              aria-invalid={Boolean(dialogError && !dialogReason.trim())}
              aria-describedby={dialogError ? "assignment-dialog-error" : undefined}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>ปิด</Button>
            <Button
              type="button"
              variant={dialog?.mode === "cancel" ? "destructive" : "default"}
              onClick={submitDialog}
            >
              {dialog?.mode === "cancel" ? "ยืนยันการยกเลิก" : "ส่งให้อาจารย์ตอบรับ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
