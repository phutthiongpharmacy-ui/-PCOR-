"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ActivityEntryDraft,
  ActivityEvidenceKind,
  ActivityRequirement,
  ActivityTrainingYear,
} from "@/roles/shared/features/activity-transcript";

const fieldClassName =
  "h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

const evidenceKinds: Array<{ value: ActivityEvidenceKind; label: string }> = [
  { value: "attendance", label: "หลักฐานการเข้าร่วม" },
  { value: "presentation", label: "สไลด์ / แบบประเมินการนำเสนอ" },
  { value: "report", label: "รายงาน / ผลงาน" },
  { value: "publication", label: "บทความ / หนังสือตอบรับ" },
  { value: "certificate", label: "หนังสือรับรอง / เกียรติบัตร" },
];

function requirementsForYear(
  requirements: readonly ActivityRequirement[],
  year: ActivityTrainingYear,
) {
  return requirements.filter((requirement) => requirement.trainingYear === year);
}

export function StudentActivityEntryDialog({
  open,
  onOpenChange,
  currentYear,
  requirements,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentYear: ActivityTrainingYear;
  requirements: readonly ActivityRequirement[];
  onSubmit: (draft: ActivityEntryDraft) => void;
}) {
  const [trainingYear, setTrainingYear] = useState(currentYear);
  const yearRequirements = useMemo(
    () => requirementsForYear(requirements, trainingYear),
    [requirements, trainingYear],
  );
  const [requirementId, setRequirementId] = useState(
    requirementsForYear(requirements, currentYear)[0]?.id ?? "",
  );
  const [academicYear, setAcademicYear] = useState("2569");
  const [title, setTitle] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [institution, setInstitution] = useState("");
  const [activityRole, setActivityRole] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceKind, setEvidenceKind] = useState<ActivityEvidenceKind>("certificate");
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceError, setEvidenceError] = useState("");
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const evidenceButtonRef = useRef<HTMLButtonElement>(null);

  const changeYear = (value: ActivityTrainingYear) => {
    setTrainingYear(value);
    setRequirementId(requirementsForYear(requirements, value)[0]?.id ?? "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">เพิ่มกิจกรรมด้วยตนเอง</DialogTitle>
          <DialogDescription>
            รายการจะอยู่ในสถานะรอตรวจสอบ และนับความคืบหน้าเมื่อได้รับการยืนยันแล้ว
          </DialogDescription>
        </DialogHeader>

        <form
          id="student-activity-entry-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!evidenceName) {
              setEvidenceError("กรุณาแนบหลักฐานประกอบกิจกรรม");
              evidenceButtonRef.current?.focus();
              return;
            }
            onSubmit({
              trainingYear,
              academicYear,
              requirementId,
              title,
              activityDate,
              institution,
              role: activityRole,
              description,
              evidenceName,
              evidenceKind,
            });
          }}
        >
          <FormField label="ปีการฝึกอบรม" htmlFor="student-activity-year">
            <select
              id="student-activity-year"
              className={fieldClassName}
              value={trainingYear}
              onChange={(event) => changeYear(Number(event.target.value) as ActivityTrainingYear)}
            >
              {[1, 2, 3, 4].map((year) => <option key={year} value={year}>ปี {year}</option>)}
            </select>
          </FormField>
          <FormField label="ปีการศึกษา" htmlFor="student-activity-academic-year">
            <Input
              id="student-activity-academic-year"
              inputMode="numeric"
              pattern="25[0-9]{2}"
              maxLength={4}
              required
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="เงื่อนไขหลักสูตร" htmlFor="student-activity-requirement">
              <select
                id="student-activity-requirement"
                className={fieldClassName}
                required
                value={requirementId}
                onChange={(event) => setRequirementId(event.target.value)}
              >
                {yearRequirements.map((requirement) => (
                  <option key={requirement.id} value={requirement.id}>{requirement.label}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="ชื่อกิจกรรม" htmlFor="student-activity-title">
              <Input id="student-activity-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
            </FormField>
          </div>
          <FormField label="วันที่ทำกิจกรรม" htmlFor="student-activity-date">
            <Input id="student-activity-date" type="date" required value={activityDate} onChange={(event) => setActivityDate(event.target.value)} />
          </FormField>
          <FormField label="บทบาทของผู้เรียน" htmlFor="student-activity-role">
            <Input id="student-activity-role" required placeholder="เช่น ผู้นำเสนอ" value={activityRole} onChange={(event) => setActivityRole(event.target.value)} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="หน่วยงาน / สถานที่" htmlFor="student-activity-institution">
              <Input id="student-activity-institution" required value={institution} onChange={(event) => setInstitution(event.target.value)} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="รายละเอียด" htmlFor="student-activity-description">
              <Textarea id="student-activity-description" required className="min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} />
            </FormField>
          </div>
          <FormField label="ประเภทหลักฐาน" htmlFor="student-activity-evidence-kind">
            <select id="student-activity-evidence-kind" className={fieldClassName} value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value as ActivityEvidenceKind)}>
              {evidenceKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
            </select>
          </FormField>
          <FormField label="แนบหลักฐาน" htmlFor="student-activity-evidence">
            <input
              ref={evidenceInputRef}
              id="student-activity-evidence"
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(event) => {
                setEvidenceName(event.target.files?.[0]?.name ?? "");
                setEvidenceError("");
              }}
            />
            <button
              ref={evidenceButtonRef}
              type="button"
              className="flex min-h-11 w-full items-center gap-2 rounded-2xl border border-dashed border-border bg-input/50 px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              aria-label={evidenceName ? `เปลี่ยนไฟล์แนบหลักฐาน ปัจจุบัน ${evidenceName}` : "เลือกไฟล์แนบหลักฐาน"}
              aria-describedby={evidenceError ? "student-activity-evidence-error" : undefined}
              onClick={() => evidenceInputRef.current?.click()}
            >
              <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-xl text-primary">
                {evidenceName ? "description" : "attach_file"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {evidenceName || "เลือกไฟล์ PDF หรือรูปภาพ"}
              </span>
            </button>
            {evidenceError && (
              <p id="student-activity-evidence-error" role="alert" className="mt-1.5 text-xs text-danger">
                {evidenceError}
              </p>
            )}
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <DialogClose asChild><Button type="button" variant="outline">ยกเลิก</Button></DialogClose>
            <Button type="submit">ส่งกิจกรรมเพื่อตรวจสอบ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label} <span aria-hidden="true" className="text-danger">*</span>
      </label>
      {children}
    </div>
  );
}
