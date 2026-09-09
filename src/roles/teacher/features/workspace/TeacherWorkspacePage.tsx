"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import {
  EmptyState,
  ForbiddenState,
  LoadingState,
  MetricCard,
  ScopeBadge,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  canTeacherAccessOfferingWithinAffiliation,
  formatSubjectResultValue,
  subjectResultStatusMeta,
  type ScopedAcademicActor,
  type SubjectResult,
  type SubjectResultValue,
} from "@/roles/shared/features/academic";
import {
  SensitiveViewAuditBoundary,
  useSensitiveViewAudit,
} from "@/roles/shared/features/audit";
import { getLicenseEligibility } from "@/roles/shared/features/license-eligibility";
import { hasResourceScope, ROLE_PRESENTATION } from "@/roles/shared/features/roles/access-model";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import {
  registrationStatusMeta,
  type RegistrationActor,
  type RegistrationStatus,
} from "@/roles/shared/features/registration";
import TeacherCourseHandoffPanels from "./TeacherCourseHandoffPanels";

type TeacherSection = "dashboard" | "courses" | "registrations" | "results" | "history";

const registrationActorLabel: Record<RegistrationActor, string> = {
  member: "ผู้เข้ารับการฝึกอบรม",
  student: "ผู้เข้ารับการฝึกอบรม",
  teacher: "อาจารย์ผู้สอน",
  registrar: "เจ้าหน้าที่ทะเบียน",
  royal_college_staff: "เจ้าหน้าที่ราชวิทยาลัย",
  system: "ระบบ",
  migration: "ระบบย้ายข้อมูล",
};

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function formatRegistrationStatus(value?: RegistrationStatus) {
  return value ? registrationStatusMeta[value].label : "เริ่มต้น";
}

export default function TeacherWorkspacePage({
  section,
  resourceId,
}: {
  section: TeacherSection;
  resourceId?: string;
}) {
  const { session, isReady: isSessionReady } = usePortalSession();
  const db = useMockDb();
  const [query, setQuery] = useState("");
  const selectedRegistrationId = resourceId ?? "";
  const [reviewDecision, setReviewDecision] = useState<"approve" | "needs_info" | "reject">("approve");
  const [reviewReason, setReviewReason] = useState("");
  const [reviewEvidence, setReviewEvidence] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [resultDialog, setResultDialog] = useState<{ resultId: string; mode: "draft" | "publish" | "revise" } | null>(null);
  const [resultValue, setResultValue] = useState<SubjectResultValue>("S");
  const [revisionReason, setRevisionReason] = useState("");
  const [resultError, setResultError] = useState("");
  const [now] = useState(() => Date.now());

  const teacherId = session?.role === "teacher" ? session.userId : "";
  const institutionId = session?.organisation.id ?? "";
  const resourceScopes = useMemo(
    () => session?.role === "teacher" ? session.resourceScopes : [],
    [session],
  );
  const assignments = useMemo(() => db.teachingAssignments.filter((assignment) => {
    const active = new Date(assignment.startsAt).getTime() <= now && (!assignment.endsAt || new Date(assignment.endsAt).getTime() > now);
    const resourceGranted = resourceScopes.includes("course:assigned") ||
      hasResourceScope(resourceScopes, `course:${assignment.courseOfferingId}`);
    const affiliationGranted = canTeacherAccessOfferingWithinAffiliation(
      db.teachingAssignments,
      db.teacherAffiliations,
      teacherId,
      institutionId,
      assignment.courseOfferingId,
      new Date(now),
    );
    return assignment.status === "accepted" &&
      active &&
      resourceGranted &&
      affiliationGranted &&
      assignment.teacherId === teacherId &&
      assignment.institutionId === institutionId;
  }), [db.teacherAffiliations, db.teachingAssignments, institutionId, now, resourceScopes, teacherId]);
  const assignmentIds = useMemo(() => new Set(assignments.map((assignment) => assignment.courseOfferingId)), [assignments]);
  const offerings = useMemo(() => db.courseOfferings.filter((offering) => assignmentIds.has(offering.id)), [assignmentIds, db.courseOfferings]);
  const offeringIds = useMemo(() => new Set(offerings.map((offering) => offering.id)), [offerings]);
  const registrations = useMemo(() => db.registrations.filter((registration) => (
    Boolean(registration.courseOfferingId) &&
    offeringIds.has(registration.courseOfferingId!) &&
    (registration.eligibility?.decision === "eligible" || registration.eligibility?.decision === "eligible_with_warning")
  )), [db.registrations, offeringIds]);
  const pendingRegistrations = registrations.filter((registration) => registration.status === "pending");
  const visibleRegistrations = pendingRegistrations.filter((registration) => `${registration.studentName} ${registration.courseCode}`.toLowerCase().includes(query.toLowerCase()));
  const results = useMemo(() => db.subjectResults.filter((result) => result.teacherId === teacherId && offeringIds.has(result.courseOfferingId)), [db.subjectResults, offeringIds, teacherId]);
  const selectedRegistration = registrations.find((item) => item.id === selectedRegistrationId);
  const selectedOffering = selectedRegistration ? offerings.find((item) => item.id === selectedRegistration.courseOfferingId) : undefined;
  const actor: ScopedAcademicActor | null = session ? {
    userId: session.userId,
    userName: session.displayName,
    role: session.role,
    organisationId: session.organisation.id,
    resourceScopes: session.resourceScopes,
  } : null;

  if (!isSessionReady || !db.isLoaded) return <PageShell size="full"><LoadingState label="กำลังโหลดรายวิชาและขอบเขตการสอน" /></PageShell>;

  const reviewRegistration = () => {
    if (!selectedRegistration || !selectedOffering || !actor) return;
    if (!reviewReason.trim()) {
      setReviewError("กรุณาระบุเหตุผลประกอบผลการพิจารณา");
      return;
    }
    setReviewError("");
    try {
      db.reviewRegistration({
        registrationId: selectedRegistration.id,
        decision: reviewDecision,
        actor,
        reason: reviewReason.trim() || undefined,
        evidenceReference: reviewEvidence.trim() || undefined,
      });
      toast.success(reviewDecision === "approve" ? "อนุมัติให้เข้าสู่ขั้นตอนชำระเงินแล้ว" : reviewDecision === "needs_info" ? "ส่งคำขอข้อมูลเพิ่มแล้ว" : "ปฏิเสธคำขอแล้ว");
      setReviewReason(""); setReviewEvidence("");
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "ไม่สามารถบันทึกผลการพิจารณาได้");
    }
  };

  const saveResult = () => {
    if (!resultDialog || !actor) return;
    const result = results.find((item) => item.id === resultDialog.resultId);
    if (!result) return;
    try {
      if (resultDialog.mode === "draft") db.saveSubjectResultDraft({ resultId: result.id, value: resultValue, actor });
      if (resultDialog.mode === "publish") db.publishSubjectResult({ resultId: result.id, actor });
      if (resultDialog.mode === "revise") {
        if (!revisionReason.trim()) { setResultError("กรุณาระบุเหตุผลการแก้ไขผลหลังประกาศ"); return; }
        db.reviseSubjectResult({ resultId: result.id, value: resultValue, reason: revisionReason.trim(), actor });
      }
      toast.success(resultDialog.mode === "draft" ? "บันทึกฉบับร่างแล้ว" : resultDialog.mode === "publish" ? "ประกาศผลแล้ว" : "แก้ไขผลและเก็บประวัติเดิมแล้ว");
      setResultDialog(null); setRevisionReason(""); setResultError("");
    } catch (error) {
      setResultError(error instanceof Error ? error.message : "ไม่สามารถบันทึกผลได้");
    }
  };

  const openResult = (result: SubjectResult, mode: "draft" | "publish" | "revise") => {
    setResultValue(result.draftValue ?? result.currentValue ?? "S");
    setRevisionReason(""); setResultError(""); setResultDialog({ resultId: result.id, mode });
  };

  const renderDashboard = () => {
    const enrolledStudents = new Set(
      registrations
        .filter((registration) => registration.status === "enrolled")
        .map((registration) => registration.studentId),
    ).size;
    const unpublished = results.filter((result) => result.status === "pending" || result.status === "draft").length;
    return (
      <>
        <WorkspaceHeader
          eyebrow="พื้นที่ทำงานอาจารย์"
          title="ภาพรวมงานสอน"
          description="เห็นเฉพาะสถาบันและรายวิชาที่ได้รับมอบหมายในช่วงเวลาปัจจุบัน"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="รายวิชาที่สอน" value={offerings.length} note="ตามการมอบหมายการสอนที่ตอบรับแล้ว" icon="menu_book" />
          <MetricCard label="ผู้เรียนในรายวิชา" value={enrolledStudents} note="นับผู้เรียนที่ลงทะเบียนแล้วโดยไม่ซ้ำคน" icon="groups" />
          <MetricCard label="ยังไม่ประกาศผล" value={unpublished} note="ยังไม่บันทึกและฉบับร่าง" icon="fact_check" emphasis={unpublished ? "warning" : "success"} />
        </div>
      </>
    );
  };

  const renderCourses = () => (
    <>
      <WorkspaceHeader
        eyebrow="ขอบเขตรายวิชาที่รับผิดชอบ"
        title="รายวิชาที่ได้รับมอบหมาย"
        description="ตอบรับคำเชิญและเปิดดูข้อมูลได้เฉพาะรายวิชาที่อยู่ในขอบเขตของบัญชีนี้"
        action={{ href: "/teacher/course-proposals", label: "สร้างคำขอรายวิชา", icon: "post_add" }}
      />
      {actor ? <TeacherCourseHandoffPanels actor={actor} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {offerings.map((offering) => {
          const roster = registrations.filter((registration) => (
            registration.courseOfferingId === offering.id && registration.status === "enrolled"
          ));
          return (
            <Card key={offering.id} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <ScopeBadge>{offering.term}</ScopeBadge>
                    <h2 className="mt-3 text-lg font-semibold text-foreground">{offering.courseCode} · {offering.courseTitle}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{offering.credits} หน่วยกิต · ผู้เรียนที่ลงทะเบียนแล้ว {roster.length} คน</p>
                  </div>
                  <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">menu_book</span>
                </div>
                <Button asChild variant="outline" className="mt-5"><Link href={`/teacher/courses/${offering.id}`}>เปิดรายชื่อผู้เรียน</Link></Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {offerings.length === 0 ? (
        <EmptyState icon="lock" title="ยังไม่มีรายวิชาที่ตอบรับแล้ว" description="ตอบรับคำเชิญการสอนก่อน หรือขอให้ผู้ดูแลตรวจสอบขอบเขตรายวิชา" />
      ) : null}
    </>
  );

  const renderRegistrations = () => (
    <>
      <WorkspaceHeader
        eyebrow="การพิจารณาของอาจารย์"
        title="คำขอลงทะเบียนรอตรวจ"
        description="แสดงเฉพาะคำขอที่รอการพิจารณา ในวิชาที่ได้รับมอบหมายและผ่านการตรวจคุณสมบัติจากระบบแล้ว"
      />
      <Card className="border-border">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">งานที่ต้องพิจารณา</CardTitle>
            <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">รอตรวจ {visibleRegistrations.length} คำขอ</p>
          </div>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="ค้นหาคำขอลงทะเบียน" placeholder="ค้นหาชื่อหรือรหัสวิชา" className="h-11 rounded-xl text-sm sm:max-w-xs" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">ผู้เรียน</TableHead>
                <TableHead scope="col">รายวิชา</TableHead>
                <TableHead scope="col">ผลตรวจคุณสมบัติ</TableHead>
                <TableHead scope="col">สถานะ</TableHead>
                <TableHead scope="col" className="text-right">ดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRegistrations.map((registration) => {
                const meta = registrationStatusMeta[registration.status];
                const warning = registration.eligibility?.decision === "eligible_with_warning";
                return (
                  <TableRow key={registration.id}>
                    <TableCell><p className="font-medium">{registration.studentName}</p><p className="text-xs text-muted-foreground">{registration.studentId}</p></TableCell>
                    <TableCell>{registration.courseCode}<p className="text-xs text-muted-foreground">{registration.courseTitle}</p></TableCell>
                    <TableCell><Badge variant={warning ? "warning" : "success"}>{warning ? "ผ่านแบบมีเงื่อนไข" : "ผ่าน"}</Badge></TableCell>
                    <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-right"><Button asChild size="sm"><Link href={`/teacher/registrations/${registration.id}`}>ตรวจคำขอ</Link></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {visibleRegistrations.length === 0 ? (
            <div className="p-5"><EmptyState title="ไม่มีคำขอรอตรวจ" description="พิจารณาคำขอครบแล้ว หรือไม่พบรายการที่ตรงกับคำค้นหา" /></div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );

  const renderRegistrationDetail = () => {
    if (!selectedRegistration || !selectedOffering) return <><WorkspaceHeader title="รายละเอียดคำขอลงทะเบียน" description="ตรวจข้อมูลและบันทึกผลการพิจารณาพร้อมหลักฐานย้อนหลัง" /><ForbiddenState description="คำขอนี้ไม่ได้อยู่ในรายวิชาที่ได้รับมอบหมายให้บัญชีปัจจุบัน" /></>;
    const canDecide = selectedRegistration.status === "pending";
    const currentStatus = registrationStatusMeta[selectedRegistration.status];
    const eligibility = getLicenseEligibility(selectedRegistration.eligibility?.status ?? "unverified");
    return (
      <>
        <WorkspaceHeader
          eyebrow={selectedRegistration.id}
          title="พิจารณาคำขอลงทะเบียน"
          description={`${selectedRegistration.courseCode} · ${selectedRegistration.courseTitle}`}
          action={{ href: "/teacher/registrations", label: "กลับรายการรอตรวจ", icon: "arrow_back" }}
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <Card className="border-border">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="text-lg">ข้อมูลประกอบการพิจารณา</CardTitle>
              <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {[
                ["ผู้ยื่นคำขอ", selectedRegistration.studentName],
                ["รหัสผู้เรียน", selectedRegistration.studentId],
                ["สถาบัน", db.academicInstitutions.find((item) => item.id === selectedRegistration.institutionId)?.name ?? "—"],
                ["รายการเปิดสอน", `${selectedRegistration.courseCode} · ${selectedOffering.courseTitle} · ${selectedOffering.term}`],
                ["ผลตรวจคุณสมบัติ", selectedRegistration.eligibility?.decision === "eligible" ? `ผ่าน · ${eligibility.label}` : `ผ่านแบบมีเงื่อนไข · ${eligibility.label}`],
                ["ตรวจเมื่อ", formatDateTime(selectedRegistration.eligibility?.checkedAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="h-fit border-primary/30 shadow-sm">
            <CardHeader><CardTitle className="text-lg">บันทึกผลการพิจารณา</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {reviewError ? <div id="review-error" role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">{reviewError}</div> : null}
              <div className="space-y-1.5">
                <label htmlFor="teacher-decision" className="text-sm font-medium">ผลการพิจารณา</label>
                <select id="teacher-decision" value={reviewDecision} onChange={(event) => { setReviewDecision(event.target.value as typeof reviewDecision); setReviewError(""); }} disabled={!canDecide} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="approve">อนุมัติให้รอชำระเงิน</option>
                  <option value="needs_info">ขอข้อมูลเพิ่ม</option>
                  <option value="reject">ไม่อนุมัติ</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="teacher-reason" className="text-sm font-medium">เหตุผล</label>
                <Textarea id="teacher-reason" value={reviewReason} onChange={(event) => { setReviewReason(event.target.value); setReviewError(""); }} disabled={!canDecide} aria-invalid={Boolean(reviewError && !reviewReason.trim())} aria-describedby={reviewError ? "review-error" : undefined} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="teacher-evidence" className="text-sm font-medium">หลักฐานอ้างอิง (ถ้ามี)</label>
                <Input id="teacher-evidence" value={reviewEvidence} onChange={(event) => setReviewEvidence(event.target.value)} disabled={!canDecide} />
              </div>
              <Button type="button" className="w-full" disabled={!canDecide} onClick={reviewRegistration}>{canDecide ? "ยืนยันผลการพิจารณา" : "คำขอนี้พิจารณาแล้ว"}</Button>
              <p className="text-xs text-muted-foreground">ขั้นตอนสร้างใบแจ้งชำระและยืนยันการชำระเงินดำเนินการโดยระบบส่วนกลาง</p>
            </CardContent>
          </Card>
        </div>
        <Card className="border-border">
          <CardHeader><CardTitle className="text-lg">ประวัติสถานะ</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {selectedRegistration.history.map((event) => (
              <div key={event.id} className="flex gap-3 border-l-2 border-primary/30 pl-4">
                <span aria-hidden="true" className="material-symbols-outlined text-lg text-primary">history</span>
                <div>
                  <p className="text-sm font-medium">{formatRegistrationStatus(event.from)} → {formatRegistrationStatus(event.to)}</p>
                  <p className="text-xs text-muted-foreground">{event.actorName ?? registrationActorLabel[event.actor]} · {formatDateTime(event.at)}</p>
                  {event.reason ? <p className="mt-1 text-sm text-muted-foreground">{event.reason}</p> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </>
    );
  };

  const renderResults = () => (
    <>
      <WorkspaceHeader
        eyebrow="ขั้นตอนบันทึกผลการเรียน"
        title="บันทึกและประกาศผลแบบผ่าน/ไม่ผ่าน"
        description="บันทึกได้เฉพาะผู้เรียนที่ลงทะเบียนแล้วในรายวิชาของตน การแก้ไขหลังประกาศจะเก็บประวัติผลเดิมไว้"
      />
      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-table-header [&_th]:text-table-header-foreground">
              <TableRow className="divide-x divide-table-header-foreground border-table-header-foreground hover:bg-table-header">
                <TableHead scope="col">ผู้เรียน</TableHead>
                <TableHead scope="col">รายวิชา</TableHead>
                <TableHead scope="col">ผลล่าสุด</TableHead>
                <TableHead scope="col">สถานะ</TableHead>
                <TableHead scope="col">ประกาศเมื่อ</TableHead>
                <TableHead scope="col" className="text-right">ดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => {
                const student = db.academicStudents.find((item) => item.id === result.studentId);
                const offering = db.courseOfferings.find((item) => item.id === result.courseOfferingId);
                const meta = subjectResultStatusMeta[result.status];
                return (
                  <TableRow key={result.id}>
                    <TableCell><p className="font-medium">{student?.name ?? result.studentId}</p><p className="text-xs text-muted-foreground">{result.studentId}</p></TableCell>
                    <TableCell>{offering?.courseCode}<p className="text-xs text-muted-foreground">{offering?.courseTitle}</p></TableCell>
                    <TableCell className="text-base font-bold">{formatSubjectResultValue(result.currentValue ?? result.draftValue)}</TableCell>
                    <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateTime(result.publishedAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {result.status === "pending" || result.status === "draft" ? (
                          <>
                            <Button type="button" size="sm" variant="outline" onClick={() => openResult(result, "draft")}>บันทึกฉบับร่าง</Button>
                            {result.status === "draft" ? <Button type="button" size="sm" onClick={() => openResult(result, "publish")}>ประกาศผล</Button> : null}
                          </>
                        ) : <Button type="button" size="sm" variant="outline" onClick={() => openResult(result, "revise")}>แก้ไขผล</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {results.length === 0 ? <div className="p-5"><EmptyState title="ยังไม่มีผู้เรียนที่พร้อมบันทึกผล" description="รายการผลจะสร้างเมื่อผู้เรียนลงทะเบียนรายวิชาสำเร็จแล้ว" /></div> : null}
        </CardContent>
      </Card>
      <Dialog open={Boolean(resultDialog)} onOpenChange={(open) => { if (!open) setResultDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resultDialog?.mode === "draft" ? "บันทึกฉบับร่าง" : resultDialog?.mode === "publish" ? "ยืนยันประกาศผล" : "แก้ไขผลหลังประกาศ"}</DialogTitle>
            <DialogDescription>{resultDialog?.mode === "publish" ? "ผู้เรียนจะเห็นผลทันทีหลังยืนยัน" : resultDialog?.mode === "revise" ? "ระบบจะเก็บประวัติผลเดิมและบังคับระบุเหตุผล" : "ฉบับร่างยังไม่แสดงต่อผู้เรียน"}</DialogDescription>
          </DialogHeader>
          {resultError ? <div id="result-error" role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">{resultError}</div> : null}
          {resultDialog?.mode !== "publish" ? (
            <div className="space-y-1.5">
              <label htmlFor="result-value" className="text-sm font-medium">ผลการประเมิน</label>
              <select id="result-value" value={resultValue} onChange={(event) => setResultValue(event.target.value as SubjectResultValue)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="S">{formatSubjectResultValue("S")}</option>
                <option value="U">{formatSubjectResultValue("U")}</option>
              </select>
            </div>
          ) : null}
          {resultDialog?.mode === "revise" ? (
            <div className="space-y-1.5">
              <label htmlFor="revision-reason" className="text-sm font-medium">เหตุผลการแก้ไข</label>
              <Textarea id="revision-reason" value={revisionReason} onChange={(event) => { setRevisionReason(event.target.value); setResultError(""); }} aria-invalid={Boolean(resultError)} aria-describedby={resultError ? "result-error" : undefined} />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setResultDialog(null)}>ยกเลิก</Button>
            <Button type="button" onClick={saveResult}>{resultDialog?.mode === "publish" ? "ประกาศผล" : "บันทึก"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  const renderHistory = () => { const revisions = results.flatMap((result) => result.revisions.map((revision) => ({ ...revision, result }))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); return <><WorkspaceHeader eyebrow="ประวัติที่ตรวจสอบย้อนหลังได้" title="ประวัติการแก้ไขผล" description="แสดงผลเดิม ผลใหม่ เหตุผล ผู้แก้ และเวลา โดยไม่ลบประวัติเดิม" /><Card className="border-border"><CardContent className="p-0"><div className="divide-y divide-border">{revisions.map((revision) => { const student = db.academicStudents.find((item) => item.id === revision.result.studentId); const offering = db.courseOfferings.find((item) => item.id === revision.result.courseOfferingId); return <div key={revision.id} className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_auto]"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{offering?.courseCode} · {student?.name}</p><Badge variant={revision.previousValue ? "info" : "secondary"}>{revision.previousValue ? `${formatSubjectResultValue(revision.previousValue)} → ${formatSubjectResultValue(revision.newValue)}` : `บันทึก ${formatSubjectResultValue(revision.newValue)}`}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{revision.reason || "บันทึกผลตามขั้นตอนการประเมิน"}</p><p className="mt-1 text-xs text-muted-foreground">{revision.actor.userName} · {ROLE_PRESENTATION[revision.actor.role].label}</p></div><time className="text-xs text-muted-foreground">{formatDateTime(revision.createdAt)}</time></div>; })}</div>{revisions.length === 0 ? <div className="p-5"><EmptyState title="ยังไม่มีประวัติการแก้ไข" description="การบันทึก ประกาศ หรือแก้ไขผลจะถูกเก็บไว้ที่นี่" /></div> : null}</CardContent></Card></>; };

  return <PageShell size="full" className="space-y-6">{resourceId ? renderRegistrationDetail() : section === "dashboard" ? renderDashboard() : section === "courses" ? renderCourses() : section === "registrations" ? renderRegistrations() : section === "results" ? renderResults() : renderHistory()}</PageShell>;
}

export function TeacherCourseRosterPage({ courseOfferingId }: { courseOfferingId: string }) {
  const { session, isReady } = usePortalSession();
  const db = useMockDb();
  const [now] = useState(() => Date.now());
  const assigned = session?.role === "teacher" &&
    (session.resourceScopes.includes("course:assigned") ||
      hasResourceScope(session.resourceScopes, `course:${courseOfferingId}`)) &&
    canTeacherAccessOfferingWithinAffiliation(
      db.teachingAssignments,
      db.teacherAffiliations,
      session.userId,
      session.organisation.id,
      courseOfferingId,
      new Date(now),
    );
  const offering = assigned ? db.courseOfferings.find((item) => item.id === courseOfferingId) : undefined;
  const sensitiveViewAudit = useSensitiveViewAudit({
    enabled: isReady && db.isLoaded && Boolean(offering),
    session,
    resource: {
      type: "course_roster",
      id: courseOfferingId,
      label: offering ? `${offering.courseCode} · รายชื่อผู้เรียน` : "รายชื่อผู้เรียนในรายวิชา",
      organisationId: session?.organisation.id,
    },
  });

  if (!isReady || !db.isLoaded) return <PageShell size="full"><LoadingState /></PageShell>;
  if (!offering) return <PageShell size="full" className="space-y-6"><WorkspaceHeader title="รายชื่อผู้เรียน" description="ตรวจขอบเขตรายวิชาก่อนแสดงข้อมูล" /><ForbiddenState description="บัญชีนี้ยังไม่ได้ตอบรับการมอบหมาย หรือไม่มีสิทธิ์เข้าถึงรายวิชานี้" /></PageShell>;
  const roster = db.registrations.filter((registration) => registration.courseOfferingId === courseOfferingId && registration.status === "enrolled");
  return <PageShell size="full" className="space-y-6"><WorkspaceHeader eyebrow={offering.courseCode} title={offering.courseTitle} description={`${offering.term} · ${offering.credits} หน่วยกิต`} /><SensitiveViewAuditBoundary status={sensitiveViewAudit.status} onRetry={sensitiveViewAudit.retry}><Card className="border-border"><CardHeader><CardTitle className="text-lg">ผู้เรียนที่ลงทะเบียนแล้ว</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead scope="col">รหัส</TableHead><TableHead scope="col">ชื่อผู้เรียน</TableHead><TableHead scope="col">สถานะ</TableHead><TableHead scope="col">ผลล่าสุด</TableHead></TableRow></TableHeader><TableBody>{roster.map((registration) => { const result = db.subjectResults.find((item) => item.studentId === registration.studentId && item.courseOfferingId === courseOfferingId); return <TableRow key={registration.id}><TableCell>{registration.studentId}</TableCell><TableCell className="font-medium">{registration.studentName}</TableCell><TableCell><Badge variant="success">ลงทะเบียนแล้ว</Badge></TableCell><TableCell>{formatSubjectResultValue(result?.currentValue ?? result?.draftValue)}</TableCell></TableRow>; })}</TableBody></Table>{roster.length === 0 ? <div className="p-5"><EmptyState title="ยังไม่มีผู้เรียนที่ลงทะเบียนแล้ว" description="รายชื่อจะแสดงหลังระบบยืนยันการชำระเงิน" /></div> : null}</CardContent></Card></SensitiveViewAuditBoundary></PageShell>;
}
