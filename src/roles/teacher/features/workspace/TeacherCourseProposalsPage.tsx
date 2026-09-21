"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import {
  EmptyState,
  LoadingState,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import type { CourseProposalStatus } from "@/roles/shared/features/academic";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

const statusMeta: Record<CourseProposalStatus, {
  label: string;
  variant: "neutral" | "warning" | "success" | "danger";
}> = {
  submitted: { label: "รอเจ้าหน้าที่ตรวจ", variant: "neutral" },
  needs_revision: { label: "ต้องแก้ไขข้อมูล", variant: "warning" },
  passed: { label: "ผ่านการตรวจ", variant: "success" },
  rejected: { label: "ไม่ผ่านการตรวจ", variant: "danger" },
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

export default function TeacherCourseProposalsPage() {
  const db = useMockDb();
  const { session, isReady } = usePortalSession();
  const proposals = useMemo(() => db.courseProposals
    .filter((proposal) => (
      proposal.proposerId === session?.userId &&
      proposal.institutionId === session?.organisation.id
    ))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)), [db.courseProposals, session]);

  if (!isReady || !db.isLoaded) {
    return <PageShell size="full"><LoadingState label="กำลังโหลดคำขอหลักสูตร" /></PageShell>;
  }

  return (
    <PageShell size="full" className="space-y-6">
      <WorkspaceHeader
        eyebrow="ขั้นตอนเสนอหลักสูตร"
        title="คำขอหลักสูตร"
        description="เสนอข้อมูลระดับหลักสูตร ติดตามผลตรวจ และแก้ไขตามข้อเสนอแนะของราชวิทยาลัย"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(statusMeta) as CourseProposalStatus[]).map((status) => (
          <Card key={status} size="sm">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">{statusMeta[status].label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {proposals.filter((proposal) => proposal.status === status).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">รายการที่ฉันเสนอ</CardTitle>
            <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">ทั้งหมด {proposals.length} รายการ</p>
          </div>
          <Button asChild>
            <Link href="/teacher/course-proposals/new">
              <span aria-hidden="true" className="material-symbols-outlined text-lg">add</span>
              เสนอหลักสูตรใหม่
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {proposals.length ? (
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">หลักสูตร</TableHead>
                    <TableHead scope="col">หน่วยกิตรวม</TableHead>
                    <TableHead scope="col">อัปเดตล่าสุด</TableHead>
                    <TableHead scope="col">สถานะ</TableHead>
                    <TableHead scope="col">ผลตรวจล่าสุด</TableHead>
                    <TableHead scope="col" className="text-right">ดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((proposal) => {
                    const meta = statusMeta[proposal.status];
                    const curriculum = proposal.curriculum;
                    return (
                      <TableRow key={proposal.id}>
                        <TableCell>
                          <p className="max-w-sm whitespace-normal font-medium text-foreground">
                            {curriculum?.curriculumNameTh ?? proposal.courseTitle}
                          </p>
                          <p className="mt-1 max-w-sm whitespace-normal text-xs text-muted-foreground">
                            {curriculum
                              ? `${curriculum.collegeOrSpecialty} · ${curriculum.pharmacyCouncilAnnouncementNo}`
                              : `${proposal.courseCode} · ข้อมูลรูปแบบเดิม`}
                          </p>
                        </TableCell>
                        <TableCell>{curriculum?.credits.total ?? proposal.credits}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDateTime(proposal.updatedAt)}</TableCell>
                        <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                        <TableCell>
                          {proposal.latestReview ? (
                            <div className="max-w-md whitespace-normal">
                              <p className="text-sm font-medium text-foreground">{proposal.latestReview.note}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {proposal.latestReview.actor.userName} · {formatDateTime(proposal.latestReview.reviewedAt)}
                              </p>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {proposal.status === "needs_revision" ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/teacher/course-proposals/edit?proposalId=${encodeURIComponent(proposal.id)}`}>
                                แก้ไขและส่งใหม่
                              </Link>
                            </Button>
                          ) : <span className="text-xs text-muted-foreground">ไม่มีงานที่ต้องทำ</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                icon="post_add"
                title="ยังไม่มีคำขอหลักสูตร"
                description="เสนอหลักสูตรแรกเพื่อส่งให้เจ้าหน้าที่ราชวิทยาลัยตรวจสอบ"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
