"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { EmptyState, LoadingState } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import { COLLEGE_OPTIONS, formatCollegeCourseCode } from "@/roles/shared/data/college-directory";
import { UNIVERSITY_OPTIONS } from "@/roles/shared/data/university-directory";
import { getRegistrationWindowStatus } from "@/roles/shared/features/registration/registration-window";
import {
  buildOpenRegistrationCourses,
  filterOpenRegistrationCourses,
  openRegistrationFilterOptions,
  type OpenRegistrationCourse,
  type OpenRegistrationFilters,
} from "@/roles/member/features/registration/open-registration-catalog";

type CourseViewStatus = "available" | "enrolled";

const defaultFilters: Required<OpenRegistrationFilters> = {
  query: "",
  college: "all",
  university: "all",
  academicYear: "all",
  term: "all",
};

const filterSelectClassName = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";
const courseStatusMeta = {
  available: { label: "ว่าง", variant: "success" },
  enrolled: { label: "ลงทะเบียนแล้ว", variant: "success" },
} as const;
export default function CourseRegistrationPage() {
  const {
    isLoaded, settings, academicInstitutions, courseOfferings,
  } = useMockDb();
  const [selectedOfferingIds, setSelectedOfferingIds] = useState<Set<string>>(new Set());
  const [enrolledOfferingIds, setEnrolledOfferingIds] = useState<Set<string>>(new Set());
  const [expandedOfferingId, setExpandedOfferingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Required<OpenRegistrationFilters>>(defaultFilters);
  const [now, setNow] = useState(() => Date.now());
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const confirmationTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!confirmationOpen) confirmationTriggerRef.current?.focus();
  }, [confirmationOpen]);

  const registrationWindow = getRegistrationWindowStatus({
    enabled: settings.registrationOpen,
    opensAt: settings.registrationOpensAt,
    closesAt: settings.registrationClosesAt,
    now,
  });
  const openRegistrationCourses = useMemo(
    () => buildOpenRegistrationCourses(courseOfferings, academicInstitutions),
    [academicInstitutions, courseOfferings],
  );
  const filterOptions = useMemo(() => openRegistrationFilterOptions(openRegistrationCourses), [openRegistrationCourses]);
  const institutionOptions = useMemo(() => [
    ...UNIVERSITY_OPTIONS,
    ...filterOptions.universities.filter((institution) => !UNIVERSITY_OPTIONS.some((option) => option === institution)),
  ], [filterOptions.universities]);
  const displayedCourses = useMemo(
    () => filterOpenRegistrationCourses(openRegistrationCourses, filters),
    [filters, openRegistrationCourses],
  );
  const selectedCourses = openRegistrationCourses.filter((course) => selectedOfferingIds.has(course.offering.id));
  const selectedNewCredits = selectedCourses.reduce((sum, course) => sum + course.definition.credits, 0);
  const displayedCourseCount = new Set(displayedCourses.map((course) => course.definition.id)).size;
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => (
    key === "query" ? value.trim().length > 0 : value !== "all"
  )).length;

  const handleAdd = (course: OpenRegistrationCourse, trigger: HTMLButtonElement) => {
    confirmationTriggerRef.current = trigger;
    setSelectedOfferingIds((previous) => new Set(previous).add(course.offering.id));
    setConfirmationOpen(true);
  };

  const handleConfirmationOpenChange = (open: boolean) => {
    setConfirmationOpen(open);
    if (!open) setSelectedOfferingIds(new Set());
  };

  const handleRemoveSelection = (offeringId: string) => {
    setSelectedOfferingIds((previous) => {
      const next = new Set(previous);
      next.delete(offeringId);
      return next;
    });
    setEnrolledOfferingIds((previous) => {
      const next = new Set(previous);
      next.delete(offeringId);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedCourses.length === 0) return;
    setEnrolledOfferingIds((previous) => new Set([
      ...previous,
      ...selectedCourses.map((course) => course.offering.id),
    ]));
    setSelectedOfferingIds(new Set());
    setConfirmationOpen(false);
    toast.success("ยืนยันรายการที่เลือกแล้ว", {
      description: "ยังไม่มีการส่งคำขอจริง สามารถถอนวิชาแล้วเลือกใหม่ได้ทันที",
    });
  };

  const updateFilter = (key: keyof Required<OpenRegistrationFilters>, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  if (!isLoaded) {
    return <PageShell className="py-10"><LoadingState label="กำลังโหลดข้อมูลการลงทะเบียน" /></PageShell>;
  }

  return (
    <PageShell size="wide" bottom="roomy" className="space-y-5">
      <div className="rounded-2xl border border-warning-border bg-warning-soft px-4 py-3 text-warning-on-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-xl">schedule</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-sm font-semibold">ช่วงเวลาลงทะเบียน</h2>
                <Badge variant={registrationWindow.tone}>{registrationWindow.label}</Badge>
              </div>
              <p role="timer" aria-live="off" className="mt-0.5 text-xs tabular-nums">{registrationWindow.detail}</p>
            </div>
          </div>
          <p className="text-xs leading-5 sm:max-w-sm sm:text-right">เลือก–ถอนวิชาและยืนยันซ้ำได้ ขณะนี้ยังไม่ส่งคำขอจริง</p>
        </div>
      </div>

      <section aria-labelledby="open-courses-heading" className="space-y-4">
        <div>
          <h2 id="open-courses-heading" className="font-heading text-xl font-semibold text-foreground sm:text-2xl">รายวิชาที่เปิดลงทะเบียน</h2>
          <p className="mt-1 text-sm text-muted-foreground">ค้นหาจากรหัสหรือชื่อรายวิชา แล้วกรองเฉพาะข้อมูลที่ต้องการ</p>
        </div>

        <Card>
          <CardContent className="p-5">
            <form role="search" onSubmit={(event) => event.preventDefault()} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="sm:col-span-2 xl:col-span-1">
                <label htmlFor="course-search" className="mb-1.5 block text-sm font-medium">ค้นหารายวิชา</label>
                <div className="relative">
                  <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">search</span>
                  <Input id="course-search" type="search" value={filters.query} onChange={(event) => updateFilter("query", event.target.value)} placeholder="รหัสหรือชื่อรายวิชา" className="h-11 rounded-xl pl-10 text-sm" />
                </div>
              </div>
              <div><label htmlFor="course-college" className="mb-1.5 block text-sm font-medium">วิทยาลัย</label><select id="course-college" value={filters.college} onChange={(event) => updateFilter("college", event.target.value)} className={filterSelectClassName}><option value="all">ทุกวิทยาลัย</option>{COLLEGE_OPTIONS.map((college) => <option key={college.value} value={college.value}>{college.label}</option>)}</select></div>
              <div><label htmlFor="course-institution" className="mb-1.5 block text-sm font-medium">สถาบัน</label><select id="course-institution" value={filters.university} onChange={(event) => updateFilter("university", event.target.value)} className={filterSelectClassName}><option value="all">ทุกสถาบัน</option>{institutionOptions.map((institution) => <option key={institution}>{institution}</option>)}</select></div>
              <div><label htmlFor="course-year" className="mb-1.5 block text-sm font-medium">ปีการศึกษา</label><select id="course-year" value={filters.academicYear} onChange={(event) => updateFilter("academicYear", event.target.value)} className={filterSelectClassName}><option value="all">ทุกปีการศึกษา</option>{filterOptions.academicYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>
              <div><label htmlFor="course-term" className="mb-1.5 block text-sm font-medium">ภาคการศึกษา</label><select id="course-term" value={filters.term} onChange={(event) => updateFilter("term", event.target.value)} className={filterSelectClassName}><option value="all">ทุกภาคการศึกษา</option>{filterOptions.terms.map((term) => <option key={term} value={term}>ภาคการศึกษาที่ {term}</option>)}</select></div>
            </form>
            <div className="mt-4 flex min-h-11 flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p role="status" aria-live="polite" className="text-sm text-muted-foreground">พบ <strong className="font-semibold tabular-nums text-foreground">{displayedCourses.length}</strong> รายการเปิดสอน จาก {displayedCourseCount} รายวิชา</p>
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => setFilters(defaultFilters)} disabled={activeFilterCount === 0}><span aria-hidden="true" className="material-symbols-outlined text-lg">filter_alt_off</span>ล้างตัวกรอง{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</Button>
            </div>
          </CardContent>
        </Card>

        {displayedCourses.length === 0 ? (
          <EmptyState icon="search_off" title={openRegistrationCourses.length === 0 ? "ยังไม่มีรายวิชาเปิดลงทะเบียน" : "ไม่พบรายวิชาที่ตรงกับเงื่อนไข"} description={openRegistrationCourses.length === 0 ? "เมื่อมีรายวิชาเปิดรับ รายการจะแสดงในส่วนนี้" : "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองเพื่อดูรายวิชาอื่น"} />
        ) : (
          <div className="space-y-3">
            {displayedCourses.map((course) => {
              const isExpanded = expandedOfferingId === course.offering.id;
              const status: CourseViewStatus = enrolledOfferingIds.has(course.offering.id) ? "enrolled" : "available";
              const statusInfo = courseStatusMeta[status];
              const detailsId = `course-details-${course.offering.id}`;

              return (
                <article key={course.offering.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-app-card">
                  <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">{formatCollegeCourseCode(course.definition.code, course.definition.collegeCode)}</span>
                        <Badge variant="outline">{course.definition.collegeCode}</Badge>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </div>
                      <h3 className="mt-2 text-base font-semibold leading-6 text-foreground">{course.definition.titleTh}</h3>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span>{course.universityName}</span>
                        <span>{course.definition.credits} หน่วยกิต</span>
                        <span>{course.schedule}</span>
                        <span>ว่าง {Math.max(0, course.definition.capacity - course.definition.enrolled)} / {course.definition.capacity} ที่นั่ง</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Button variant="ghost" className="min-h-11" aria-expanded={isExpanded} aria-controls={detailsId} onClick={() => setExpandedOfferingId(isExpanded ? null : course.offering.id)}>
                        {isExpanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">{isExpanded ? "expand_less" : "expand_more"}</span>
                      </Button>
                      {status !== "enrolled" ? (
                        <Button className="min-h-11" onClick={(event) => handleAdd(course, event.currentTarget)}>เลือกวิชา</Button>
                      ) : (
                        <Button variant="outline" className="min-h-11 text-destructive" onClick={() => handleRemoveSelection(course.offering.id)}>ถอนวิชา</Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div id={detailsId} className="border-t border-border bg-surface-container-low p-4">
                      <p className="mb-3 text-xs leading-5 text-muted-foreground">{course.definition.titleEn}</p>
                      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div><dt className="text-xs text-muted-foreground">ปี / ภาคการศึกษา</dt><dd className="mt-0.5 font-medium">{course.academicYear} / {course.term}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">สถานที่เรียน</dt><dd className="mt-0.5 font-medium">{course.room}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">หน่วยงานผู้ดูแล</dt><dd className="mt-0.5 font-medium">{course.universityName}</dd></div>
                      </dl>
                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="w-full max-w-xl">
                          <div className="flex justify-between gap-3 text-xs"><span>จำนวนรับ {course.definition.capacity} คน</span><span>ลงทะเบียนแล้ว {course.definition.enrolled} คน</span></div>
                          <Progress value={course.definition.enrolled} max={course.definition.capacity} tone={course.definition.enrolled >= course.definition.capacity ? "warning" : "brand"} className="mt-2" aria-label={`ลงทะเบียนแล้ว ${course.definition.enrolled} จาก ${course.definition.capacity} คน วิชา ${formatCollegeCourseCode(course.definition.code, course.definition.collegeCode)}`} />
                        </div>
                        {course.syllabus ? (
                          <Button asChild variant="outline" className="min-h-11 shrink-0">
                            <a href={course.syllabus.url} target="_blank" rel="noopener noreferrer">
                              <span aria-hidden="true" className="material-symbols-outlined text-lg">picture_as_pdf</span>
                              เปิด Syllabus PDF
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={confirmationOpen} onOpenChange={handleConfirmationOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          aria-describedby="registration-confirmation-description"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            confirmationTriggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl">ยืนยันการลงทะเบียน</DialogTitle>
            <DialogDescription id="registration-confirmation-description" className="leading-6">
              รายวิชาจะขึ้นว่าลงทะเบียนแล้วเมื่อกดยืนยันเท่านั้น สามารถถอนวิชาและเลือกใหม่ได้ทุกครั้ง
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-container-low p-4">
              <div><p className="text-xs text-muted-foreground">รายวิชาที่เลือก</p><p className="mt-1 text-lg font-semibold tabular-nums">{selectedCourses.length} วิชา</p></div>
              <div><p className="text-xs text-muted-foreground">หน่วยกิตรวมที่เลือก</p><p className="mt-1 text-lg font-semibold tabular-nums">{selectedNewCredits} หน่วยกิต</p></div>
            </div>

            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1" aria-label="รายวิชาที่เลือก">
              {selectedCourses.map((course) => (
                <li key={course.offering.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-primary">{formatCollegeCourseCode(course.definition.code, course.definition.collegeCode)}</p>
                      <p className="mt-1 text-sm font-semibold leading-6">{course.definition.titleTh}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{course.universityName} · ภาคการศึกษาที่ {course.term} · {course.schedule}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{course.definition.credits} หน่วยกิต</span>
                  </div>
                </li>
              ))}
            </ul>

            <div role="note" className="flex gap-3 rounded-xl border border-info-border bg-info-soft p-3 text-sm text-info-on-soft">
              <span aria-hidden="true" className="material-symbols-outlined text-xl">info</span>
              <p>ขณะนี้ใช้สำหรับกดลองในหน้านี้เท่านั้น ไม่มีการส่งคำขอจริง หลังยืนยันยังถอนวิชาแล้วเลือกใหม่ได้ ข้อมูลจะเริ่มใหม่เมื่อโหลดหน้าใหม่</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => handleConfirmationOpenChange(false)}>ยกเลิก</Button>
            <Button className="min-h-11" onClick={handleSubmit} disabled={selectedCourses.length === 0}>
              ยืนยันการลงทะเบียน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
