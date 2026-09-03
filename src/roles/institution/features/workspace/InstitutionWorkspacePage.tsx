"use client";

import { useMemo } from "react";

import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { LoadingState } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  selectInstitutionStudents,
  selectInstitutionTeachers,
} from "@/roles/shared/features/academic";
import {
  SensitiveViewAuditBoundary,
  useSensitiveViewAudit,
} from "@/roles/shared/features/audit";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import { selectInstitutionAdmissions } from "@/roles/institution/features/admissions/institution-admission-review";

import InstitutionAssignmentsSection from "./InstitutionAssignmentsSection";
import InstitutionAdmissionsSection from "./InstitutionAdmissionsSection";
import InstitutionCoursesSection from "./InstitutionCoursesSection";
import InstitutionDashboardSection from "./InstitutionDashboardSection";
import InstitutionRegistrationsSection from "./InstitutionRegistrationsSection";
import InstitutionResultsSection from "./InstitutionResultsSection";
import InstitutionStudentsSection from "./InstitutionStudentsSection";
import InstitutionTeachersSection from "./InstitutionTeachersSection";
import { institutionActor } from "./institution-workspace-utils";

type InstitutionSection =
  | "dashboard"
  | "students"
  | "teachers"
  | "assignments"
  | "courses"
  | "registrations"
  | "results"
  | "admissions";

export default function InstitutionWorkspacePage({ section }: { section: InstitutionSection }) {
  const { session, isReady: isSessionReady } = usePortalSession();
  const db = useMockDb();
  const institutionId = session?.role === "institution_admin" ? session.organisation.id : "";
  const institution = db.academicInstitutions.find((item) => item.id === institutionId);
  const studentAffiliations = useMemo(() => (
    db.studentAffiliations.filter((item) => item.institutionId === institutionId)
  ), [db.studentAffiliations, institutionId]);
  const teacherAffiliations = useMemo(() => (
    db.teacherAffiliations.filter((item) => item.institutionId === institutionId)
  ), [db.teacherAffiliations, institutionId]);
  const students = useMemo(() => (
    selectInstitutionStudents(db.academicStudents, studentAffiliations, institutionId)
  ), [db.academicStudents, institutionId, studentAffiliations]);
  const teachers = useMemo(() => (
    selectInstitutionTeachers(db.academicTeachers, teacherAffiliations, institutionId)
  ), [db.academicTeachers, institutionId, teacherAffiliations]);
  const offerings = useMemo(() => (
    db.courseOfferings.filter((item) => item.institutionId === institutionId)
  ), [db.courseOfferings, institutionId]);
  const offeringIds = useMemo(() => new Set(offerings.map((item) => item.id)), [offerings]);
  const registrations = useMemo(() => (
    db.registrations.filter((item) => (
      item.institutionId === institutionId &&
      Boolean(item.courseOfferingId && offeringIds.has(item.courseOfferingId))
    ))
  ), [db.registrations, institutionId, offeringIds]);
  const results = useMemo(() => (
    db.subjectResults.filter((item) => offeringIds.has(item.courseOfferingId))
  ), [db.subjectResults, offeringIds]);
  const admissions = useMemo(() => (
    selectInstitutionAdmissions(db.admissions, institutionId)
  ), [db.admissions, institutionId]);
  const isSensitiveSection = section === "students" ||
    section === "registrations" ||
    section === "results" ||
    section === "admissions";
  const sensitiveViewAudit = useSensitiveViewAudit({
    enabled: isSessionReady && db.isLoaded && isSensitiveSection && Boolean(institution),
    session,
    resource: {
      type: `institution_${section}`,
      id: `${institutionId || "unresolved-institution"}:${section}`,
      label: institution ? `${section} · ${institution.name}` : "ข้อมูลภายในสถาบัน",
      organisationId: institutionId || undefined,
    },
  });

  if (!isSessionReady || !db.isLoaded) {
    return (
      <PageShell size="full">
        <LoadingState label="กำลังตรวจสอบขอบเขตข้อมูลของสถาบัน" />
      </PageShell>
    );
  }

  const content = section === "dashboard" ? (
    <InstitutionDashboardSection
      institutionName={institution?.name ?? "สถาบันของคุณ"}
      studentCount={students.length}
      teacherCount={teachers.length}
      offeringCount={offerings.length}
      registrations={registrations}
      results={results}
    />
  ) : section === "students" ? (
    <InstitutionStudentsSection students={students} affiliations={studentAffiliations} />
  ) : section === "teachers" ? (
    <InstitutionTeachersSection />
  ) : section === "assignments" ? (
    <InstitutionAssignmentsSection />
  ) : section === "courses" ? (
    <InstitutionCoursesSection />
  ) : section === "registrations" ? (
    <InstitutionRegistrationsSection />
  ) : section === "admissions" ? (
    <InstitutionAdmissionsSection
      admissions={admissions}
      actor={institutionActor(session)}
      onReview={db.reviewInstitutionAdmission}
    />
  ) : (
    <InstitutionResultsSection />
  );

  return (
    <PageShell size="full" className="space-y-6">
      {isSensitiveSection ? (
        <SensitiveViewAuditBoundary status={sensitiveViewAudit.status} onRetry={sensitiveViewAudit.retry}>
          {content}
        </SensitiveViewAuditBoundary>
      ) : content}
    </PageShell>
  );
}
