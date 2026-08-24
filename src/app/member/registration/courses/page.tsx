"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { registrationData } from "@/roles/shared/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { EmptyState, LoadingState } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import { COLLEGE_OPTIONS, formatCollegeCourseCode, formatCourseCode } from "@/roles/shared/data/college-directory";
import { UNIVERSITY_OPTIONS } from "@/roles/shared/data/university-directory";
import { currentMemberPassport } from "@/roles/shared/member/domain/member";
import { findLicenseRegistryRecord, getLicenseEligibility } from "@/roles/shared/features/license-eligibility";
import { registrationStatusMeta, type RegistrationRecord, type RegistrationStatus } from "@/roles/shared/features/registration";
import { getRegistrationWindowStatus } from "@/roles/shared/features/registration/registration-window";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import {
  buildOpenRegistrationCourses,
  filterOpenRegistrationCourses,
  openRegistrationFilterOptions,
  type OpenRegistrationCourse,
  type OpenRegistrationFilters,
} from "@/roles/member/features/registration/open-registration-catalog";

type CourseViewStatus = RegistrationStatus | "available" | "full";

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
  full: { label: "เต็ม", variant: "danger" },
  ...registrationStatusMeta,
} as const;
const activeRegistrationStatuses = new Set<RegistrationStatus>([
  "submitted", "pending", "needs_info", "approved", "awaiting_payment", "enrolled", "drop_pending",
]);

function activeRegistrationForCourse(registrations: readonly RegistrationRecord[], course: OpenRegistrationCourse) {
  return registrations.find((registration) => (
    (registration.courseOfferingId === course.offering.id
      || registration.courseId === course.definition.id
      || registration.courseCode === course.definition.code)
    && activeRegistrationStatuses.has(registration.status)
  ));
}

function currentTimestamp() {
  return Date.now();
}

export default function CourseRegistrationPage() {
  const { session } = usePortalSession();
  const {
    isLoaded, settings, registrations, academicInstitutions, courseOfferings,
    submitRegistrations, resubmitRegistration, requestRegistrationDrop,
  } = useMockDb();
  const [selectedOfferingIds, setSelectedOfferingIds] = useState<Set<string>>(new Set());
  const [expandedOfferingId, setExpandedOfferingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Required<OpenRegistrationFilters>>(defaultFilters);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const member = currentMemberPassport;
  const eligibility = getLicenseEligibility(findLicenseRegistryRecord(member.license.licenseNumber)?.status ?? "unverified");
  const memberName = `${member.identity.titleTh}${member.identity.firstNameTh} ${member.identity.lastNameTh}`;
  const memberId = session?.role === "student" ? session.userId : "";
  const memberRegistrations = useMemo(
    () => registrations.filter((registration) => registration.studentId === memberId),
    [memberId, registrations],
  );
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
  const activeRegistrations = memberRegistrations.filter((registration) => activeRegistrationStatuses.has(registration.status));
  const selectedCoursesCount = activeRegistrations.length + selectedCourses.length;
  const selectedCredits = activeRegistrations.reduce((sum, registration) => sum + registration.credits, 0)
    + selectedCourses.reduce((sum, course) => sum + course.definition.credits, 0);
  const displayedCourseCount = new Set(displayedCourses.map((course) => course.definition.id)).size;
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => (
    key === "query" ? value.trim().length > 0 : value !== "all"
  )).length;

  const canSelect = (course: OpenRegistrationCourse) => (
    registrationWindow.canRegister
    && eligibility.canRegisterCourses
    && course.definition.enrolled < course.definition.capacity
    && selectedCoursesCount < registrationData.maxCourses
    && selectedCredits + course.definition.credits <= registrationData.maxCredits
  );

  const selectionBlockedReason = (course: OpenRegistrationCourse) => {
    if (!registrationWindow.canRegister) return registrationWindow.label;
    if (!eligibility.canRegisterCourses) return "ยังไม่สามารถเลือกวิชาได้ กรุณาติดต่อหน่วยงานเพื่อตรวจสอบสิทธิ์";
    if (course.definition.enrolled >= course.definition.capacity) return "จำนวนผู้ลงทะเบียนครบแล้ว";
    if (selectedCoursesCount >= registrationData.maxCourses) return `เลือกได้ไม่เกิน ${registrationData.maxCourses} วิชา`;
    if (selectedCredits + course.definition.credits > registrationData.maxCredits) return `หน่วยกิตเกินเกณฑ์ ${registrationData.maxCredits} หน่วยกิต`;
    return null;
  };

  const handleAdd = (course: OpenRegistrationCourse) => {
    if (!canSelect(course)) {
      toast.error(selectionBlockedReason(course) ?? "ไม่สามารถเลือกวิชานี้ได้");
      return;
    }
    setSelectedOfferingIds((previous) => new Set(previous).add(course.offering.id));
  };

  const handleRemoveSelection = (offeringId: string) => {
    setSelectedOfferingIds((previous) => {
      const next = new Set(previous);
      next.delete(offeringId);
      return next;
    });
  };

  const handleSubmit = () => {
    const currentWindow = getRegistrationWindowStatus({
      enabled: settings.registrationOpen,
      opensAt: settings.registrationOpensAt,
      closesAt: settings.registrationClosesAt,
      now: currentTimestamp(),
    });
    if (!currentWindow.canRegister) {
      toast.error(currentWindow.label);
      return;
    }
    if (!eligibility.canRegisterCourses || selectedCourses.length === 0) return;
    try {
      const created = submitRegistrations(selectedCourses.map((course) => ({
        studentId: memberId,
        studentName: memberName,
        courseId: course.definition.id,
        courseOfferingId: course.offering.id,
        institutionId: course.offering.institutionId,
        courseCode: course.definition.code,
        courseTitle: course.definition.titleTh,
        credits: course.definition.credits,
        term: course.offering.term,
      })));
      if (created.length === 0) {
        toast.error("ไม่พบรายวิชาใหม่สำหรับส่งลงทะเบียน");
        return;
      }
      setSelectedOfferingIds(new Set());
      toast.success(`ส่งคำขอลงทะเบียน ${created.length} วิชาแล้ว`, {
        description: "ติดตามผลได้ที่หน้าสถานะการลงทะเบียน",
      });
    } catch {
      toast.error("ไม่สามารถส่งคำขอลงทะเบียนได้ กรุณาตรวจสอบรายการแล้วลองอีกครั้ง");
    }
  };

  const updateFilter = (key: keyof Required<OpenRegistrationFilters>, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const handleDropRequest = (registration: RegistrationRecord) => {
    if (!window.confirm(`ยืนยันส่งคำขอถอนวิชา ${formatCourseCode(registration.courseCode)}?`)) return;
    requestRegistrationDrop(registration.id, "ผู้เข้าศึกษาขอถอนผ่านระบบ");
    toast.success("ส่งคำขอถอนแล้ว");
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
          <p className="text-xs leading-5 sm:max-w-sm sm:text-right">เลือกวิชาและตรวจสอบรายการก่อนส่งคำขอ</p>
        </div>
      </div>

      {selectedCourses.length > 0 && (
        <Card className="border-brand-border">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>ตรวจสอบรายการที่เลือก</CardTitle>
              <p className="text-sm font-medium tabular-nums text-primary">{selectedCourses.length} วิชา · {selectedCourses.reduce((sum, course) => sum + course.definition.credits, 0)} หน่วยกิต</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedCourses.map((course) => (
              <div key={course.offering.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{formatCollegeCourseCode(course.definition.code, course.definition.collegeCode)} · {course.definition.titleTh}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{course.universityName} · {course.definition.credits} หน่วยกิต · {course.schedule}</p>
                </div>
                <Button variant="ghost" className="min-h-11 shrink-0 text-destructive" onClick={() => handleRemoveSelection(course.offering.id)}>เอาออก</Button>
              </div>
            ))}
            <Button className="min-h-11 w-full" onClick={handleSubmit} disabled={!registrationWindow.canRegister || !eligibility.canRegisterCourses}>ส่งคำขอลงทะเบียน</Button>
          </CardContent>
        </Card>
      )}

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
              const registration = activeRegistrationForCourse(memberRegistrations, course);
              const isSelected = selectedOfferingIds.has(course.offering.id);
              const isExpanded = expandedOfferingId === course.offering.id;
              const status: CourseViewStatus = registration?.status ?? (isSelected ? "selected" : course.definition.enrolled >= course.definition.capacity ? "full" : "available");
              const statusInfo = courseStatusMeta[status];
              const blockedReason = status === "available" ? selectionBlockedReason(course) : null;
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
                      {status === "available" ? (
                        <Button className="min-h-11" disabled={!canSelect(course)} onClick={() => handleAdd(course)}>เลือกวิชา</Button>
                      ) : status === "selected" ? (
                        <Button variant="outline" className="min-h-11 text-destructive" onClick={() => handleRemoveSelection(course.offering.id)}>เอาออก</Button>
                      ) : status === "needs_info" && registration ? (
                        <Button className="min-h-11" onClick={() => { resubmitRegistration(registration.id); toast.success("ส่งข้อมูลกลับไปตรวจสอบแล้ว"); }}>ส่งข้อมูลเพื่อตรวจใหม่</Button>
                      ) : (status === "approved" || status === "awaiting_payment" || status === "enrolled") && registration ? (
                        <Button variant="outline" className="min-h-11 text-destructive" onClick={() => handleDropRequest(registration)}>ขอถอนรายวิชา</Button>
                      ) : null}
                    </div>
                  </div>

                  {isExpanded && (
                    <div id={detailsId} className="border-t border-border bg-surface-container-low p-4">
                      <p className="mb-3 text-xs leading-5 text-muted-foreground">{course.definition.titleEn}</p>
                      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div><dt className="text-xs text-muted-foreground">ปี / ภาคการศึกษา</dt><dd className="mt-0.5 font-medium">{course.academicYear} / {course.term}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">สถานที่เรียน</dt><dd className="mt-0.5 font-medium">{course.room}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">สถาบันผู้รับผิดชอบ</dt><dd className="mt-0.5 font-medium">{course.institutionName}</dd></div>
                      </dl>
                      <div className="mt-4 max-w-xl">
                        <div className="flex justify-between gap-3 text-xs"><span>จำนวนรับ {course.definition.capacity} คน</span><span>ลงทะเบียนแล้ว {course.definition.enrolled} คน</span></div>
                        <Progress value={course.definition.enrolled} max={course.definition.capacity} tone={course.definition.enrolled >= course.definition.capacity ? "warning" : "brand"} className="mt-2" aria-label={`ลงทะเบียนแล้ว ${course.definition.enrolled} จาก ${course.definition.capacity} คน วิชา ${formatCollegeCourseCode(course.definition.code, course.definition.collegeCode)}`} />
                      </div>
                      {registration?.reviewReason ? <p className="mt-3 text-xs text-danger">หมายเหตุ: {registration.reviewReason}</p> : null}
                      {blockedReason ? <p className="mt-3 text-xs text-muted-foreground">{blockedReason}</p> : null}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
