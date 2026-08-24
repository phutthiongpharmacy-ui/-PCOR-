"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMockDb } from "@/providers/mock-db-provider";
import { COLLEGE_OPTIONS } from "@/roles/shared/data/college-directory";
import {
  allocateCourseCode,
  courseCatalog,
  courseInstitutions,
  type CollegeCode,
  type CourseClassification,
} from "@/roles/shared/features/courses/course-catalog";

export default function CreateCoursePage() {
  const router = useRouter();
  const { courseRequests, setCourseRequests } = useMockDb();
  const [kind, setKind] = useState<"course" | "short_course">("course");
  const [collegeCode, setCollegeCode] = useState<CollegeCode>("วภท.");
  const [classification, setClassification] = useState<CourseClassification>("required");
  const [institutionId, setInstitutionId] = useState<keyof typeof courseInstitutions>("inst-siriraj");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [capacity, setCapacity] = useState("");
  const existingCodes = [
    ...courseCatalog.flatMap((item) => item.kind === "course" ? [item.code] : []),
    ...courseRequests.flatMap((item) => item.courseCode ? [item.courseCode] : []),
  ];
  const generatedCode = kind === "course"
    ? allocateCourseCode(collegeCode, classification, existingCodes)
    : undefined;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const numericCapacity = Number(capacity);
    if (!title.trim() || !duration.trim() || !Number.isInteger(numericCapacity) || numericCapacity < 1) return;

    setCourseRequests((current) => [{
      id: `CRQ-${Date.now()}`,
      collegeName: collegeCode,
      courseCode: generatedCode,
      courseTitle: title.trim(),
      type: kind === "course"
        ? (classification === "required" ? "รายวิชาบังคับ" : "รายวิชาทั่วไป")
        : "หลักสูตรระยะสั้น",
      kind,
      classification: kind === "course" ? classification : "general",
      institutionId,
      duration: duration.trim(),
      capacity: numericCapacity,
      status: "pending",
      submittedAt: new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date()),
    }, ...current]);
    toast.success("บันทึกคำขอเรียบร้อยแล้ว");
    router.push("/admin/courses");
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 pb-24 md:p-6">
      <header className="flex items-start gap-3">
        <Button variant="outline" size="icon" asChild aria-label="กลับไปหน้าจัดการรายวิชา">
          <Link href="/admin/courses"><span aria-hidden="true" className="material-symbols-outlined">arrow_back</span></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">สร้างรายการเปิดสอน</h1>
          <p className="mt-1 text-sm text-muted-foreground">เลือกโครงสร้างให้ตรงกับรายวิชาปกติหรือหลักสูตรระยะสั้น</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setKind("course")} className={`rounded-xl border p-4 text-left ${kind === "course" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
          <strong className="block">รายวิชาปกติ</strong>
          <span className="mt-1 block text-xs text-muted-foreground">ระบบสร้างรหัสและบันทึกหน่วยกิตตามโครงสร้างวิทยาลัย</span>
        </button>
        <button type="button" onClick={() => setKind("short_course")} className={`rounded-xl border p-4 text-left ${kind === "short_course" ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
          <strong className="block">หลักสูตรระยะสั้น</strong>
          <span className="mt-1 block text-xs text-muted-foreground">ระยะเวลา 3-4 เดือน และไม่กำหนดรหัสวิชา</span>
        </button>
      </div>

      <Card>
        <CardHeader><CardTitle>{kind === "course" ? "ข้อมูลรายวิชา" : "ข้อมูลหลักสูตรระยะสั้น"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldSelect
                label="วิทยาลัย"
                value={collegeCode}
                onChange={(value) => setCollegeCode(value as CollegeCode)}
                options={COLLEGE_OPTIONS.map(({ value, label }) => ({ value, label }))}
              />
              <FieldSelect
                label="สถาบันผู้รับผิดชอบ"
                value={institutionId}
                onChange={(value) => setInstitutionId(value as keyof typeof courseInstitutions)}
                options={Object.entries(courseInstitutions).map(([value, item]) => ({ value, label: `${item.name} (${item.code})` }))}
              />
            </div>

            {kind === "course" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldSelect
                  label="ประเภทวิชา"
                  value={classification}
                  onChange={(value) => setClassification(value as CourseClassification)}
                  options={[{ value: "required", label: "วิชาบังคับ" }, { value: "general", label: "วิชาทั่วไป" }]}
                />
                <div>
                  <label className="mb-2 block text-sm font-medium">รหัสที่จะได้รับ</label>
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono font-semibold">{generatedCode}</div>
                  <p className="mt-1 text-xs text-muted-foreground">ระบบจองรหัสเมื่อบันทึกคำขอสำเร็จ</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="course-title" className="mb-2 block text-sm font-medium">ชื่อ{kind === "course" ? "รายวิชา" : "หลักสูตร"}</label>
              <Input id="course-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={180} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="course-duration" className="mb-2 block text-sm font-medium">ระยะเวลา</label>
                <Input id="course-duration" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder={kind === "course" ? "1 ภาคการศึกษา" : "3 เดือน"} required />
              </div>
              <div>
                <label htmlFor="course-capacity" className="mb-2 block text-sm font-medium">จำนวนที่เปิดรับ</label>
                <Input id="course-capacity" type="number" min="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} required />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-5">
              <Button variant="outline" asChild><Link href="/admin/courses">ยกเลิก</Link></Button>
              <Button type="submit">บันทึกคำขอ</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 font-normal">
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}
