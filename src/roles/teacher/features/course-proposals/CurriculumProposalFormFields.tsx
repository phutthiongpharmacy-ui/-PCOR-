"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { CurriculumProposalFormState } from "./curriculum-proposal-form";

interface CurriculumProposalFormFieldsProps {
  form: CurriculumProposalFormState;
  onChange: (field: keyof CurriculumProposalFormState, value: string) => void;
  isRevision: boolean;
  errorId?: string;
}

interface FieldProps {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function Field({ id, label, optional = false, hint, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {optional ? <> <span className="font-normal text-muted-foreground">(ถ้ามี)</span></> : null}
      </label>
      {children}
      {hint ? <p id={hintId} className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const inputClassName = "h-11 rounded-xl bg-input/50";

export function CurriculumProposalFormFields({
  form,
  onChange,
  isRevision,
  errorId,
}: CurriculumProposalFormFieldsProps) {
  const describedBy = (hintId?: string) => [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const inputProps = (field: keyof CurriculumProposalFormState, hintId?: string) => ({
    value: form[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(field, event.target.value),
    "aria-describedby": describedBy(hintId),
  });
  const textareaProps = (field: keyof CurriculumProposalFormState, hintId?: string) => ({
    value: form[field],
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => onChange(field, event.target.value),
    "aria-describedby": describedBy(hintId),
  });

  return (
    <div className="divide-y divide-border">
      <fieldset className="space-y-5 pb-6">
        <legend className="mb-4 w-full">
          <span className="block text-base font-semibold text-foreground">1. ข้อมูลหลักสูตร</span>
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            ชื่อหลักสูตร วุฒิ และหน่วยงานที่รับผิดชอบ
          </span>
        </legend>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field id="curriculum-college" label="วิทยาลัย / สาขาเฉพาะทาง">
            <Input id="curriculum-college" required {...inputProps("collegeOrSpecialty")} className={inputClassName} />
          </Field>
          <Field id="curriculum-responsible-unit" label="หน่วยงานรับผิดชอบ">
            <Input id="curriculum-responsible-unit" required {...inputProps("responsibleUnit")} className={inputClassName} />
          </Field>
          <Field id="curriculum-name-th" label="ชื่อหลักสูตรภาษาไทย">
            <Input id="curriculum-name-th" required {...inputProps("curriculumNameTh")} className={inputClassName} />
          </Field>
          <Field id="curriculum-name-en" label="ชื่อหลักสูตรภาษาอังกฤษ">
            <Input id="curriculum-name-en" required lang="en" {...inputProps("curriculumNameEn")} className={inputClassName} />
          </Field>
          <Field id="qualification-name-th" label="ชื่อวุฒิหรือประกาศนียบัตรภาษาไทย">
            <Input id="qualification-name-th" required {...inputProps("qualificationNameTh")} className={inputClassName} />
          </Field>
          <Field id="qualification-name-en" label="ชื่อวุฒิหรือประกาศนียบัตรภาษาอังกฤษ">
            <Input id="qualification-name-en" required lang="en" {...inputProps("qualificationNameEn")} className={inputClassName} />
          </Field>
          <Field id="main-institution" label="สถาบันหลัก">
            <Input id="main-institution" required {...inputProps("mainInstitution")} className={inputClassName} />
          </Field>
          <Field id="affiliated-institutions" label="สถาบันสมทบ" optional>
            <Input id="affiliated-institutions" {...inputProps("affiliatedInstitutions")} className={inputClassName} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5 py-6">
        <legend className="mb-4 w-full pt-6">
          <span className="block text-base font-semibold text-foreground">2. โครงสร้างการฝึกอบรม</span>
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            รูปแบบ ระยะเวลา และหน่วยกิตของหลักสูตร
          </span>
        </legend>
        <Field id="philosophy-objectives" label="ปรัชญาและวัตถุประสงค์">
          <Textarea id="philosophy-objectives" required rows={4} {...textareaProps("philosophyAndObjectives")} />
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field id="training-duration" label="ระยะเวลาฝึกอบรม" hint="เช่น 4 ปี หรือ 48 เดือน">
            <Input id="training-duration" required {...inputProps("trainingDuration", "training-duration-hint")} className={inputClassName} />
          </Field>
          <Field id="education-system" label="ระบบการจัดการศึกษา">
            <Input id="education-system" required {...inputProps("educationManagementSystem")} className={inputClassName} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Field id="total-credits" label="หน่วยกิตรวม">
            <Input id="total-credits" required type="number" min="0.5" step="0.5" {...inputProps("totalCredits")} className={inputClassName} />
          </Field>
          <Field id="theory-credits" label="ภาคทฤษฎี">
            <Input id="theory-credits" required type="number" min="0" step="0.5" {...inputProps("theoryCredits")} className={inputClassName} />
          </Field>
          <Field id="laboratory-credits" label="ภาคปฏิบัติการ">
            <Input id="laboratory-credits" required type="number" min="0" step="0.5" {...inputProps("laboratoryCredits")} className={inputClassName} />
          </Field>
          <Field id="practice-credits" label="ฝึกปฏิบัติวิชาชีพ">
            <Input id="practice-credits" required type="number" min="0" step="0.5" {...inputProps("professionalPracticeCredits")} className={inputClassName} />
          </Field>
          <Field id="research-credits" label="วิจัย / โครงงาน">
            <Input id="research-credits" required type="number" min="0" step="0.5" {...inputProps("researchOrProjectCredits")} className={inputClassName} />
          </Field>
        </div>
        <Field id="hour-calculation" label="หลักเกณฑ์การคำนวณชั่วโมง">
          <Textarea id="hour-calculation" required rows={3} {...textareaProps("hourCalculationRule")} />
        </Field>
        <Field id="related-short-courses" label="หลักสูตรระยะสั้นที่เกี่ยวข้อง" optional>
          <Textarea id="related-short-courses" rows={3} {...textareaProps("relatedShortCourses")} />
        </Field>
      </fieldset>

      <fieldset className="space-y-5 py-6">
        <legend className="mb-4 w-full pt-6">
          <span className="block text-base font-semibold text-foreground">3. การรับเข้าและการประเมิน</span>
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            คุณสมบัติผู้สมัคร การคัดเลือก และเกณฑ์สำเร็จการฝึกอบรม
          </span>
        </legend>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field id="applicant-qualifications" label="คุณสมบัติผู้สมัคร">
            <Textarea id="applicant-qualifications" required rows={4} {...textareaProps("applicantQualifications")} />
          </Field>
          <Field id="selection-method" label="วิธีคัดเลือก">
            <Textarea id="selection-method" required rows={4} {...textareaProps("selectionMethod")} />
          </Field>
          <Field id="assessment-method" label="วิธีประเมินผล">
            <Textarea id="assessment-method" required rows={4} {...textareaProps("assessmentMethod")} />
          </Field>
          <Field id="completion-criteria" label="เกณฑ์สำเร็จการฝึกอบรม">
            <Textarea id="completion-criteria" required rows={4} {...textareaProps("completionCriteria")} />
          </Field>
          <Field id="provider-qualifications" label="คุณสมบัติของหน่วยงานจัดฝึกอบรม">
            <Textarea id="provider-qualifications" required rows={4} {...textareaProps("trainingProviderQualifications")} />
          </Field>
          <Field id="site-qualifications" label="คุณสมบัติของแหล่งฝึก">
            <Textarea id="site-qualifications" required rows={4} {...textareaProps("trainingSiteQualifications")} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5 pt-6">
        <legend className="mb-4 w-full pt-6">
          <span className="block text-base font-semibold text-foreground">4. ประกาศและเอกสารอ้างอิง</span>
          <span className="mt-1 block text-sm font-normal text-muted-foreground">
            ข้อมูลประกาศสภาเภสัชกรรมและหลักฐานประกอบ
          </span>
        </legend>
        <Field id="announcement-number" label="เลขที่ประกาศสภาเภสัชกรรม">
          <Input id="announcement-number" required {...inputProps("pharmacyCouncilAnnouncementNo")} className={inputClassName} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="announcement-date" label="วันที่ประกาศ">
            <Input id="announcement-date" required type="date" {...inputProps("announcementDate")} className={inputClassName} />
          </Field>
          <Field id="effective-date" label="วันที่มีผล">
            <Input id="effective-date" required type="date" {...inputProps("effectiveDate")} className={inputClassName} />
          </Field>
        </div>
        <Field id="proposal-evidence" label="หลักฐานอ้างอิง" optional hint="ระบุ URL หรือเลขที่เอกสาร">
          <Input id="proposal-evidence" {...inputProps("evidenceReference", "proposal-evidence-hint")} className={inputClassName} />
        </Field>
        <Field id="proposal-notes" label="หมายเหตุ" optional>
          <Textarea id="proposal-notes" rows={3} {...textareaProps("notes")} />
        </Field>
        {isRevision ? (
          <Field id="revision-reason" label="สรุปสิ่งที่แก้ไข">
            <Textarea id="revision-reason" required rows={3} {...textareaProps("revisionReason")} />
          </Field>
        ) : null}
      </fieldset>
    </div>
  );
}
