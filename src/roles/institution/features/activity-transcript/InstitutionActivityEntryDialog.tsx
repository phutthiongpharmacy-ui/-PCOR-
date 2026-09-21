"use client";

import { useMemo, useState, type ReactNode } from "react";

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
import type { AcademicStudent } from "@/roles/shared/features/academic";
import type {
  ActivityEntryDraft,
  ActivityEvidenceKind,
  ActivityRequirement,
  ActivityInstitutionSource,
  ActivityTrainingYear,
} from "@/roles/shared/features/activity-transcript";

const fieldClassName =
  "h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

export interface InstitutionActivityEntryFormValue {
  memberId: string;
  source: ActivityInstitutionSource;
  draft: ActivityEntryDraft;
}

function requirementsForYear(
  requirements: readonly ActivityRequirement[],
  year: ActivityTrainingYear,
) {
  return requirements.filter((requirement) => requirement.trainingYear === year);
}

export function InstitutionActivityEntryDialog({
  open,
  onOpenChange,
  students,
  requirements,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: readonly AcademicStudent[];
  requirements: readonly ActivityRequirement[];
  onSubmit: (value: InstitutionActivityEntryFormValue) => void;
}) {
  const [memberId, setMemberId] = useState(students[0]?.id ?? "");
  const [source, setSource] = useState<ActivityInstitutionSource>("officer");
  const [trainingYear, setTrainingYear] = useState<ActivityTrainingYear>(1);
  const yearRequirements = useMemo(
    () => requirementsForYear(requirements, trainingYear),
    [requirements, trainingYear],
  );
  const [requirementId, setRequirementId] = useState(
    requirementsForYear(requirements, 1)[0]?.id ?? "",
  );
  const [academicYear, setAcademicYear] = useState("2569");
  const [title, setTitle] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [institution, setInstitution] = useState("");
  const [activityRole, setActivityRole] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceKind, setEvidenceKind] = useState<ActivityEvidenceKind>("attendance");
  const [evidenceName, setEvidenceName] = useState("");

  const changeYear = (value: ActivityTrainingYear) => {
    setTrainingYear(value);
    setRequirementId(requirementsForYear(requirements, value)[0]?.id ?? "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">บันทึกกิจกรรมให้ผู้เรียน</DialogTitle>
          <DialogDescription>
            เลือกผู้เรียนและแหล่งข้อมูล รายการที่สถาบันบันทึกจะยืนยันผลทันที
          </DialogDescription>
        </DialogHeader>

        <form
          id="institution-activity-entry-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              memberId,
              source,
              draft: {
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
              },
            });
          }}
        >
          <div className="sm:col-span-2">
            <FormField label="ผู้เรียน" htmlFor="institution-activity-member">
              <select id="institution-activity-member" className={fieldClassName} required value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name} · {student.id}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="แหล่งข้อมูล" htmlFor="institution-activity-source">
            <select id="institution-activity-source" className={fieldClassName} value={source} onChange={(event) => setSource(event.target.value as ActivityInstitutionSource)}>
              <option value="officer">เจ้าหน้าที่สถาบันบันทึก</option>
              <option value="college_checkin">ข้อมูล Check-in ของสถาบัน</option>
            </select>
          </FormField>
          <FormField label="ปีการศึกษา" htmlFor="institution-activity-academic-year">
            <Input id="institution-activity-academic-year" inputMode="numeric" pattern="25[0-9]{2}" maxLength={4} required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} />
          </FormField>
          <FormField label="ปีการฝึกอบรม" htmlFor="institution-activity-year">
            <select id="institution-activity-year" className={fieldClassName} value={trainingYear} onChange={(event) => changeYear(Number(event.target.value) as ActivityTrainingYear)}>
              {[1, 2, 3, 4].map((year) => <option key={year} value={year}>ปี {year}</option>)}
            </select>
          </FormField>
          <FormField label="เงื่อนไขหลักสูตร" htmlFor="institution-activity-requirement">
            <select id="institution-activity-requirement" className={fieldClassName} required value={requirementId} onChange={(event) => setRequirementId(event.target.value)}>
              {yearRequirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.label}</option>)}
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="ชื่อกิจกรรม" htmlFor="institution-activity-title">
              <Input id="institution-activity-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
            </FormField>
          </div>
          <FormField label="วันที่ทำกิจกรรม" htmlFor="institution-activity-date">
            <Input id="institution-activity-date" type="date" required value={activityDate} onChange={(event) => setActivityDate(event.target.value)} />
          </FormField>
          <FormField label="บทบาทของผู้เรียน" htmlFor="institution-activity-role">
            <Input id="institution-activity-role" required placeholder="เช่น ผู้เข้าร่วม" value={activityRole} onChange={(event) => setActivityRole(event.target.value)} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="หน่วยงาน / สถานที่" htmlFor="institution-activity-institution">
              <Input id="institution-activity-institution" required value={institution} onChange={(event) => setInstitution(event.target.value)} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="รายละเอียด" htmlFor="institution-activity-description">
              <Textarea id="institution-activity-description" required className="min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} />
            </FormField>
          </div>
          <FormField label="ประเภทหลักฐาน" htmlFor="institution-activity-evidence-kind">
            <select id="institution-activity-evidence-kind" className={fieldClassName} value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value as ActivityEvidenceKind)}>
              <option value="attendance">หลักฐานการเข้าร่วม</option>
              <option value="presentation">แบบประเมินการนำเสนอ</option>
              <option value="report">รายงาน / ผลงาน</option>
              <option value="publication">บทความ / หนังสือตอบรับ</option>
              <option value="certificate">หนังสือรับรอง / เกียรติบัตร</option>
            </select>
          </FormField>
          <FormField label="แนบหลักฐาน" htmlFor="institution-activity-evidence">
            <Input
              id="institution-activity-evidence"
              type="file"
              accept=".pdf,image/*"
              required
              className="h-11 cursor-pointer border-border bg-card p-1.5 file:mr-3 file:h-8 file:cursor-pointer file:rounded-xl file:border file:border-border file:bg-background file:px-3 file:font-semibold file:shadow-sm hover:file:bg-muted/60"
              onChange={(event) => setEvidenceName(event.target.files?.[0]?.name ?? "")}
            />
          </FormField>
          <DialogFooter className="sm:col-span-2">
            <DialogClose asChild><Button type="button" variant="outline">ยกเลิก</Button></DialogClose>
            <Button type="submit">บันทึกและยืนยัน</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label} <span aria-hidden="true" className="text-danger">*</span>
      </label>
      {children}
    </div>
  );
}
