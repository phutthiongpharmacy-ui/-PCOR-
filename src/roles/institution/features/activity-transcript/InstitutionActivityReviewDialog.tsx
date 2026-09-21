"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { AcademicStudent } from "@/roles/shared/features/academic";
import type {
  ActivityRequirement,
  ActivityReviewDecision,
  ActivityTranscriptEntry,
} from "@/roles/shared/features/activity-transcript";

const sourceLabels = {
  student: "ผู้เรียนบันทึก",
  officer: "เจ้าหน้าที่สถาบันบันทึก",
  college_checkin: "Check-in ของสถาบัน",
  system: "ข้อมูลจากระบบ",
} as const;

const statusMeta = {
  verified: { label: "ยืนยันแล้ว", variant: "success" },
  pending: { label: "รอตรวจสอบ", variant: "warning" },
  self_declared: { label: "ผู้เรียนกรอกเอง", variant: "info" },
  rejected: { label: "ไม่ผ่าน", variant: "danger" },
} as const;

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function InstitutionActivityReviewDialog({
  entry,
  student,
  requirement,
  open,
  onOpenChange,
  onReview,
}: {
  entry: ActivityTranscriptEntry;
  student?: AcademicStudent;
  requirement?: ActivityRequirement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (decision: ActivityReviewDecision, note?: string) => void;
}) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const status = statusMeta[entry.verification.status];
  const canReview = entry.source === "student" && (
    entry.verification.status === "pending" ||
    entry.verification.status === "self_declared"
  );

  const review = (decision: ActivityReviewDecision) => {
    const normalizedNote = note.trim();
    if (decision === "reject" && !normalizedNote) {
      setNoteError("กรุณาระบุเหตุผลที่ไม่อนุมัติรายการ");
      return;
    }

    setNoteError("");
    onReview(decision, normalizedNote || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6"
      >
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-3 top-3 h-11 w-11 bg-secondary"
            aria-label="ปิดหน้าต่างตรวจสอบกิจกรรม"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </Button>
        </DialogClose>

        <DialogHeader className="pr-12">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant="neutral">{sourceLabels[entry.source]}</Badge>
          </div>
          <DialogTitle className="text-xl leading-7">{entry.title}</DialogTitle>
          <DialogDescription>
            ตรวจรายละเอียดผู้เรียน กิจกรรม และหลักฐานก่อนบันทึกผลการพิจารณา
          </DialogDescription>
        </DialogHeader>

        <section aria-labelledby="institution-activity-student-title">
          <h3 id="institution-activity-student-title" className="font-semibold text-foreground">
            ข้อมูลผู้เรียน
          </h3>
          <dl className="mt-2 grid gap-3 rounded-2xl bg-secondary/60 p-4 sm:grid-cols-2">
            <DetailItem label="ชื่อผู้เรียน" value={student?.name ?? entry.memberId} />
            <DetailItem label="รหัสผู้เรียน" value={entry.memberId} />
            {student?.licenseNumber ? (
              <DetailItem label="เลขที่ใบอนุญาต" value={student.licenseNumber} />
            ) : null}
            <DetailItem
              label="ปีการฝึกอบรม"
              value={`ปี ${entry.trainingYear} · ปีการศึกษา ${entry.academicYear}`}
            />
          </dl>
        </section>

        <section aria-labelledby="institution-activity-detail-title">
          <h3 id="institution-activity-detail-title" className="font-semibold text-foreground">
            รายละเอียดกิจกรรม
          </h3>
          <dl className="mt-2 grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-2">
            <DetailItem label="เงื่อนไขหลักสูตร" value={requirement?.label ?? entry.requirementId} />
            <DetailItem label="วันที่ทำกิจกรรม" value={formatThaiDate(entry.activityDate)} />
            <DetailItem label="หน่วยงาน / สถานที่" value={entry.institution} />
            <DetailItem label="บทบาท" value={entry.role} />
          </dl>
          <div className="mt-3 rounded-2xl border border-border p-4">
            <h4 className="text-sm font-semibold text-foreground">คำอธิบายกิจกรรม</h4>
            <p className="mt-2 whitespace-pre-wrap break-words leading-6 text-muted-foreground">
              {entry.description}
            </p>
          </div>
        </section>

        <section aria-labelledby="institution-activity-evidence-title">
          <h3 id="institution-activity-evidence-title" className="font-semibold text-foreground">
            หลักฐานประกอบ
          </h3>
          {entry.evidence.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {entry.evidence.map((evidence) => (
                <li
                  key={evidence.id}
                  className="flex min-w-0 items-start gap-2 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-lg text-primary">
                    description
                  </span>
                  <span className="min-w-0 break-all text-sm">{evidence.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">ไม่มีไฟล์หลักฐานในรายการนี้</p>
          )}
        </section>

        <section
          aria-labelledby="institution-activity-verification-title"
          className="rounded-2xl border border-border p-4"
        >
          <h3 id="institution-activity-verification-title" className="font-semibold text-foreground">
            ผลการตรวจสอบปัจจุบัน
          </h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {entry.verification.note ?? "ยังไม่มีหมายเหตุจากผู้ตรวจสอบ"}
          </p>
          {entry.verification.verifiedBy ? (
            <p className="mt-2 text-xs text-muted-foreground">
              ตรวจสอบโดย {entry.verification.verifiedBy}
              {entry.verification.verifiedAt
                ? ` · ${formatThaiDate(entry.verification.verifiedAt)}`
                : ""}
            </p>
          ) : null}
        </section>

        {canReview ? (
          <section aria-labelledby="institution-activity-review-title" className="space-y-3">
            <div>
              <h3 id="institution-activity-review-title" className="font-semibold text-foreground">
                บันทึกผลการพิจารณา
              </h3>
              <p id="institution-activity-review-note-help" className="mt-1 text-xs text-muted-foreground">
                หมายเหตุไม่บังคับเมื่ออนุมัติ แต่ต้องระบุเหตุผลเมื่อไม่อนุมัติ
              </p>
            </div>
            <div>
              <label htmlFor="institution-activity-review-note" className="mb-1.5 block text-sm font-medium">
                หมายเหตุการตรวจสอบ
              </label>
              <Textarea
                id="institution-activity-review-note"
                className="min-h-24"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  if (noteError) setNoteError("");
                }}
                aria-invalid={Boolean(noteError)}
                aria-describedby={noteError
                  ? "institution-activity-review-note-help institution-activity-review-note-error"
                  : "institution-activity-review-note-help"}
                placeholder="สรุปผลการตรวจหลักฐานหรือเหตุผลที่ต้องแก้ไข"
              />
              {noteError ? (
                <p
                  id="institution-activity-review-note-error"
                  role="alert"
                  className="mt-2 rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft"
                >
                  {noteError}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto">
              ปิด
            </Button>
          </DialogClose>
          {canReview ? (
            <>
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => review("reject")}
              >
                ไม่อนุมัติรายการ
              </Button>
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => review("approve")}
              >
                อนุมัติรายการ
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
