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
import {
  formatSubjectResultValue,
  subjectResultStatusMeta,
  type SubjectResult,
  type SubjectResultStatus,
  type SubjectResultValue,
} from "@/roles/shared/features/academic";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

import {
  filterSelectClassName,
  formatInstitutionDateTime,
  institutionActor,
} from "./institution-workspace-utils";

const resultStatuses = ["pending", "draft", "published", "revised"] as const satisfies readonly SubjectResultStatus[];
type ResultValueFilter = "all" | SubjectResultValue | "unrecorded";

export default function InstitutionResultsSection() {
  const db = useMockDb();
  const { session } = usePortalSession();
  const actor = institutionActor(session);
  const institutionId = actor?.organisationId ?? "";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SubjectResultStatus>("all");
  const [valueFilter, setValueFilter] = useState<ResultValueFilter>("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selected, setSelected] = useState<SubjectResult | null>(null);

  const offerings = useMemo(() => (
    db.courseOfferings.filter((item) => item.institutionId === institutionId)
  ), [db.courseOfferings, institutionId]);
  const offeringIds = useMemo(() => new Set(offerings.map((item) => item.id)), [offerings]);
  const results = useMemo(() => (
    db.subjectResults.filter((item) => offeringIds.has(item.courseOfferingId))
  ), [db.subjectResults, offeringIds]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th-TH");
    return results.filter((result) => {
      const student = db.academicStudents.find((item) => item.id === result.studentId);
      const offering = offerings.find((item) => item.id === result.courseOfferingId);
      const matchesValue = valueFilter === "all" ||
        (valueFilter === "unrecorded" ? !result.currentValue && !result.draftValue : (result.currentValue ?? result.draftValue) === valueFilter);
      return (
        (statusFilter === "all" || result.status === statusFilter) &&
        matchesValue &&
        (courseFilter === "all" || result.courseOfferingId === courseFilter) &&
        (!normalized || `${result.id} ${result.studentId} ${student?.name ?? ""} ${offering?.courseCode ?? ""} ${offering?.courseTitle ?? ""}`
          .toLocaleLowerCase("th-TH")
          .includes(normalized))
      );
    });
  }, [courseFilter, db.academicStudents, offerings, query, results, statusFilter, valueFilter]);

  const selectedStudent = selected
    ? db.academicStudents.find((item) => item.id === selected.studentId)
    : undefined;
  const selectedOffering = selected
    ? offerings.find((item) => item.id === selected.courseOfferingId)
    : undefined;
  const selectedTeacher = selected
    ? db.academicTeachers.find((item) => item.id === selected.teacherId)
    : undefined;

  return (
    <>
      <WorkspaceHeader
        eyebrow="ติดตามข้อมูลแบบอ่านอย่างเดียว"
        title="ติดตามผลการเรียน"
        description="ค้นหา กรอง และตรวจสอบผลล่าสุดกับประวัติการแก้ไข โดยผู้ดูแลสถาบันไม่มีสิทธิ์บันทึกหรือแก้ผลแทนอาจารย์"
      />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">ค้นหาผลการเรียน</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_15rem]">
          <div className="space-y-1.5">
            <label htmlFor="institution-result-search" className="text-sm font-medium text-foreground">
              ค้นหาผลการเรียน
            </label>
            <Input
              id="institution-result-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อผู้เรียน รหัส หรือรายวิชา"
              className="h-11 rounded-xl text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="institution-result-status" className="text-sm font-medium text-foreground">
              สถานะผลการเรียน
            </label>
            <select
              id="institution-result-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className={filterSelectClassName}
            >
              <option value="all">ทุกสถานะ</option>
              {resultStatuses.map((status) => (
                <option key={status} value={status}>{subjectResultStatusMeta[status].label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="institution-result-value" className="text-sm font-medium text-foreground">
              ผลผ่านหรือไม่ผ่าน
            </label>
            <select
              id="institution-result-value"
              value={valueFilter}
              onChange={(event) => setValueFilter(event.target.value as ResultValueFilter)}
              className={filterSelectClassName}
            >
              <option value="all">ทุกผลการเรียน</option>
              <option value="S">ผ่าน (S)</option>
              <option value="U">ไม่ผ่าน (U)</option>
              <option value="unrecorded">ยังไม่มีผล</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="institution-result-course" className="text-sm font-medium text-foreground">
              รายการเปิดสอน
            </label>
            <select
              id="institution-result-course"
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
          <CardTitle className="text-lg">รายการผลการเรียน</CardTitle>
          <p aria-live="polite" className="text-sm text-muted-foreground">พบ {filtered.length} รายการ</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้เรียน</TableHead>
                <TableHead>รายวิชา</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>ผลล่าสุด</TableHead>
                <TableHead>แก้ไขแล้ว</TableHead>
                <TableHead className="text-right">รายละเอียด</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((result) => {
                const student = db.academicStudents.find((item) => item.id === result.studentId);
                const offering = offerings.find((item) => item.id === result.courseOfferingId);
                const meta = subjectResultStatusMeta[result.status];
                return (
                  <TableRow key={result.id}>
                    <TableCell>
                      <p className="font-medium">{student?.name ?? result.studentId}</p>
                      <p className="text-xs text-muted-foreground">{result.studentId}</p>
                    </TableCell>
                    <TableCell>
                      {offering?.courseCode ?? result.courseOfferingId}
                      <p className="text-xs text-muted-foreground">
                        {offering ? `${offering.courseTitle} · ${offering.term}` : "ไม่พบข้อมูลรายวิชา"}
                      </p>
                    </TableCell>
                    <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-base font-bold text-foreground">
                      {formatSubjectResultValue(result.currentValue ?? result.draftValue)}
                    </TableCell>
                    <TableCell>{result.revisions.length} ครั้ง</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelected(result)}>
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
                title="ไม่พบผลการเรียน"
                description="ลองเปลี่ยนคำค้นหา สถานะ ผลการเรียน หรือรายการเปิดสอน"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" aria-describedby="result-detail-description">
          <DialogHeader>
            <DialogTitle>รายละเอียดผลการเรียน</DialogTitle>
            <DialogDescription id="result-detail-description">
              {selectedStudent?.name ?? selected?.studentId} · {selectedOffering?.courseCode}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5">
              <dl className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">สถานะ</dt>
                  <dd className="mt-1"><Badge variant={subjectResultStatusMeta[selected.status].variant}>{subjectResultStatusMeta[selected.status].label}</Badge></dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ผลล่าสุด</dt>
                  <dd className="mt-1 text-lg font-bold">{formatSubjectResultValue(selected.currentValue ?? selected.draftValue)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">อาจารย์ผู้รับผิดชอบ</dt>
                  <dd className="mt-1 font-medium">{selectedTeacher?.name ?? selected.teacherId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">วันประกาศผล</dt>
                  <dd className="mt-1 font-medium">{formatInstitutionDateTime(selected.publishedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">อัปเดตล่าสุด</dt>
                  <dd className="mt-1 font-medium">{formatInstitutionDateTime(selected.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">จำนวนครั้งที่แก้ไข</dt>
                  <dd className="mt-1 font-medium">{selected.revisions.length} ครั้ง</dd>
                </div>
              </dl>

              <section aria-labelledby="result-revision-heading">
                <h3 id="result-revision-heading" className="font-semibold">ประวัติการแก้ไขผล</h3>
                {selected.revisions.length > 0 ? (
                  <ol className="mt-2 space-y-3">
                    {selected.revisions.map((revision, index) => (
                      <li key={revision.id} className="rounded-xl border border-border p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">
                            ครั้งที่ {index + 1}: {formatSubjectResultValue(revision.previousValue)} → {formatSubjectResultValue(revision.newValue)}
                          </p>
                          <span className="text-xs text-muted-foreground">{formatInstitutionDateTime(revision.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-muted-foreground">ผู้แก้ไข: {revision.actor.userName}</p>
                        <p className="mt-1 text-muted-foreground">เหตุผล: {revision.reason ?? "ไม่ได้ระบุเหตุผล"}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">ผลรายการนี้ยังไม่เคยถูกแก้ไข</p>
                )}
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
