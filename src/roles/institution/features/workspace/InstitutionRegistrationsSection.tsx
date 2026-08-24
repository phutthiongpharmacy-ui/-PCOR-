"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useMockDb } from "@/providers/mock-db-provider";
import {
  EmptyState,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import { getLicenseEligibility } from "@/roles/shared/features/license-eligibility";
import {
  registrationStatuses,
  registrationStatusMeta,
  type RegistrationActor,
  type RegistrationRecord,
  type RegistrationStatus,
} from "@/roles/shared/features/registration";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

import {
  filterSelectClassName,
  formatInstitutionDateTime,
  institutionActor,
} from "./institution-workspace-utils";

const actorLabels: Record<RegistrationActor, string> = {
  member: "ผู้เรียน",
  student: "ผู้เรียน",
  teacher: "อาจารย์",
  registrar: "เจ้าหน้าที่ทะเบียน",
  royal_college_staff: "เจ้าหน้าที่ราชวิทยาลัย",
  system: "ระบบอัตโนมัติ",
  migration: "การนำเข้าข้อมูล",
};

const teacherDecisionLabels = {
  approved: "อาจารย์อนุมัติ",
  needs_info: "อาจารย์ขอข้อมูลเพิ่ม",
  rejected: "อาจารย์ไม่อนุมัติ",
} as const;

export default function InstitutionRegistrationsSection() {
  const db = useMockDb();
  const { session } = usePortalSession();
  const actor = institutionActor(session);
  const institutionId = actor?.organisationId ?? "";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RegistrationStatus>("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selected, setSelected] = useState<RegistrationRecord | null>(null);

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
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th-TH");
    return registrations.filter((registration) => (
      (statusFilter === "all" || registration.status === statusFilter) &&
      (courseFilter === "all" || registration.courseOfferingId === courseFilter) &&
      (!normalized || `${registration.id} ${registration.studentId} ${registration.studentName} ${registration.courseCode} ${registration.courseTitle}`
        .toLocaleLowerCase("th-TH")
        .includes(normalized))
    ));
  }, [courseFilter, query, registrations, statusFilter]);

  return (
    <>
      <WorkspaceHeader
        eyebrow="ติดตามข้อมูลแบบอ่านอย่างเดียว"
        title="ติดตามสถานะลงทะเบียน"
        description="ค้นหา กรอง และตรวจสอบรายละเอียดคำขอภายในสถาบัน โดยการอนุมัติยังเป็นหน้าที่ของอาจารย์ผู้รับผิดชอบ"
      />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">ค้นหาคำขอลงทะเบียน</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_16rem]">
          <div className="space-y-1.5">
            <label htmlFor="institution-registration-search" className="text-sm font-medium text-foreground">
              ค้นหาคำขอ
            </label>
            <Input
              id="institution-registration-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาเลขคำขอ ชื่อผู้เรียน หรือรายวิชา"
              className="h-11 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="institution-registration-status" className="text-sm font-medium text-foreground">
              สถานะลงทะเบียน
            </label>
            <select
              id="institution-registration-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className={filterSelectClassName}
            >
              <option value="all">ทุกสถานะ</option>
              {registrationStatuses.map((status) => (
                <option key={status} value={status}>{registrationStatusMeta[status].label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="institution-registration-course" className="text-sm font-medium text-foreground">
              รายการเปิดสอน
            </label>
            <select
              id="institution-registration-course"
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              className={filterSelectClassName}
            >
              <option value="all">ทุกรายการเปิดสอน</option>
              {offerings.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {offering.courseCode} · {offering.courseTitle} · {offering.term}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="sm:flex-row sm:items-end sm:justify-between">
          <CardTitle className="text-lg">รายการลงทะเบียน</CardTitle>
          <p aria-live="polite" className="text-sm text-muted-foreground">พบ {filtered.length} รายการ</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขคำขอ</TableHead>
                <TableHead>ผู้เรียน</TableHead>
                <TableHead>รายวิชา</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>อัปเดตล่าสุด</TableHead>
                <TableHead className="text-right">รายละเอียด</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((registration) => {
                const meta = registrationStatusMeta[registration.status];
                return (
                  <TableRow key={registration.id}>
                    <TableCell className="font-mono text-xs font-medium">{registration.id}</TableCell>
                    <TableCell>
                      <p className="font-medium">{registration.studentName}</p>
                      <p className="text-xs text-muted-foreground">{registration.studentId}</p>
                    </TableCell>
                    <TableCell>
                      {registration.courseCode}
                      <p className="text-xs text-muted-foreground">{registration.courseTitle} · {registration.term}</p>
                    </TableCell>
                    <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatInstitutionDateTime(registration.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelected(registration)}>
                        <span aria-hidden="true" className="material-symbols-outlined text-base">visibility</span>
                        ตรวจสอบ
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon="manage_search"
                title="ไม่พบคำขอลงทะเบียน"
                description="ลองเปลี่ยนคำค้นหา สถานะ หรือรายการเปิดสอน"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" aria-describedby="registration-detail-description">
          <DialogHeader>
            <DialogTitle>รายละเอียดการลงทะเบียน</DialogTitle>
            <DialogDescription id="registration-detail-description">
              {selected?.id} · {selected?.studentName} · {selected?.courseCode}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5">
              <dl className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">สถานะปัจจุบัน</dt>
                  <dd className="mt-1"><Badge variant={registrationStatusMeta[selected.status].variant}>{registrationStatusMeta[selected.status].label}</Badge></dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ภาคการศึกษา</dt>
                  <dd className="mt-1 font-medium">{selected.term}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ส่งคำขอเมื่อ</dt>
                  <dd className="mt-1 font-medium">{formatInstitutionDateTime(selected.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">อัปเดตล่าสุด</dt>
                  <dd className="mt-1 font-medium">{formatInstitutionDateTime(selected.updatedAt)}</dd>
                </div>
              </dl>

              <section aria-labelledby="registration-eligibility-heading">
                <h3 id="registration-eligibility-heading" className="font-semibold">ผลตรวจสอบคุณสมบัติ</h3>
                {selected.eligibility ? (() => {
                  const eligibility = getLicenseEligibility(selected.eligibility.status);
                  return (
                    <div className="mt-2 rounded-xl border border-border p-4 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={eligibility.tone}>{eligibility.label}</Badge>
                        <span className="text-muted-foreground">ตรวจเมื่อ {formatInstitutionDateTime(selected.eligibility.checkedAt)}</span>
                      </div>
                      <p className="mt-2 text-muted-foreground">{eligibility.description}</p>
                    </div>
                  );
                })() : (
                  <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีผลตรวจสอบคุณสมบัติ</p>
                )}
              </section>

              <section aria-labelledby="registration-teacher-heading">
                <h3 id="registration-teacher-heading" className="font-semibold">ผลพิจารณาจากอาจารย์</h3>
                {selected.teacherDecision ? (
                  <div className="mt-2 rounded-xl border border-border p-4 text-sm">
                    <p className="font-medium">{teacherDecisionLabels[selected.teacherDecision.decision]}</p>
                    <p className="mt-1 text-muted-foreground">
                      {selected.teacherDecision.teacherName} · {formatInstitutionDateTime(selected.teacherDecision.decidedAt)}
                    </p>
                    {selected.teacherDecision.reason ? <p className="mt-2">เหตุผล: {selected.teacherDecision.reason}</p> : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">ยังรออาจารย์พิจารณา</p>
                )}
              </section>

              <section aria-labelledby="registration-history-heading">
                <h3 id="registration-history-heading" className="font-semibold">ประวัติสถานะ</h3>
                <ol className="mt-2 space-y-3 border-l-2 border-border pl-4">
                  {selected.history.map((entry) => (
                    <li key={entry.id} className="relative rounded-xl border border-border p-3 text-sm before:absolute before:-left-[1.35rem] before:top-4 before:h-2 before:w-2 before:rounded-full before:bg-primary">
                      <p className="font-medium">
                        {entry.from ? `${registrationStatusMeta[entry.from].label} → ` : ""}
                        {registrationStatusMeta[entry.to].label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.actorName ?? actorLabels[entry.actor]} · {formatInstitutionDateTime(entry.at)}
                      </p>
                      {entry.reason ? <p className="mt-2 text-muted-foreground">เหตุผล: {entry.reason}</p> : null}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
