"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { EmptyState, LoadingState } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import type {
  CourseProposalActor,
  CourseProposalDecision,
  CourseProposalStatus,
} from "@/roles/shared/features/academic";
import { CurriculumProposalDetailsView } from "@/roles/shared/features/academic";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import { StaffPageHeader } from "@/roles/staff/components/StaffPageHeader";

const statusMeta: Record<CourseProposalStatus, {
  label: string;
  variant: "neutral" | "warning" | "success" | "danger";
}> = {
  submitted: { label: "รอตรวจสอบ", variant: "neutral" },
  needs_revision: { label: "ส่งกลับให้แก้ไข", variant: "warning" },
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

export default function StaffCourseProposalsPage() {
  const db = useMockDb();
  const { session, isReady } = usePortalSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CourseProposalStatus | "all">("submitted");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<CourseProposalDecision>("passed");
  const [reason, setReason] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actor: CourseProposalActor | null = session?.role === "royal_college_staff"
    ? {
        userId: session.userId,
        userName: session.displayName,
        role: session.role,
        organisationId: session.organisation.id,
        resourceScopes: session.resourceScopes,
      }
    : null;
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th-TH");
    return db.courseProposals
      .filter((proposal) => status === "all" || proposal.status === status)
      .filter((proposal) => !query || [
        proposal.id,
        proposal.courseCode,
        proposal.courseTitle,
        proposal.proposerName,
        proposal.curriculum?.collegeOrSpecialty ?? "",
        proposal.curriculum?.mainInstitution ?? "",
        proposal.curriculum?.curriculumNameEn ?? "",
      ].some((value) => value.toLocaleLowerCase("th-TH").includes(query)))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [db.courseProposals, search, status]);
  const selected = db.courseProposals.find((proposal) => proposal.id === selectedId);

  if (!isReady || !db.isLoaded) {
    return <PageShell size="full"><LoadingState label="กำลังโหลดคำขอหลักสูตร" /></PageShell>;
  }

  const closeReview = () => {
    setSelectedId(null);
    setDecision("passed");
    setReason("");
    setEvidenceReference("");
    setFormError("");
    setIsSubmitting(false);
  };

  const openReview = (proposalId: string) => {
    setSelectedId(proposalId);
    setDecision("passed");
    setReason("");
    setEvidenceReference("");
    setFormError("");
  };

  const saveReview = () => {
    if (!selected || !actor) return;
    if (!reason.trim()) {
      setFormError("กรุณาระบุเหตุผลประกอบผลการตรวจ");
      return;
    }
    setIsSubmitting(true);
    try {
      db.reviewCourseProposal({
        proposalId: selected.id,
        actor,
        decision,
        reason,
        evidenceReference: evidenceReference || undefined,
      });
      toast.success(
        decision === "passed"
          ? "บันทึกว่าหลักสูตรผ่านการตรวจแล้ว"
          : decision === "needs_revision"
            ? "ส่งข้อเสนอแนะกลับให้อาจารย์แก้ไขแล้ว"
            : "บันทึกว่าหลักสูตรไม่ผ่านการตรวจแล้ว",
      );
      closeReview();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "ไม่สามารถบันทึกผลการตรวจได้");
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell size="full" className="space-y-6">
      <StaffPageHeader
        eyebrow="Course proposal review"
        title="ตรวจคำขอหลักสูตร"
        description="ตรวจข้อมูลหลักสูตรที่อาจารย์เสนอ แล้วบันทึกผลหรือส่งกลับให้แก้ไข"
      />

      <Card>
        <CardContent className="space-y-4 px-4 md:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">รายการคำขอ</h2>
              <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">แสดง {filtered.length} จาก {db.courseProposals.length} รายการ</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="ค้นหาคำขอหลักสูตร" placeholder="ค้นหาชื่อหลักสูตร สาขา หรือผู้เสนอ" className="h-11 rounded-xl text-sm sm:w-72" />
              <label className="sr-only" htmlFor="course-proposal-status-filter">กรองสถานะคำขอ</label>
              <select id="course-proposal-status-filter" value={status} onChange={(event) => setStatus(event.target.value as CourseProposalStatus | "all")} className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="all">ทุกสถานะ</option>
                <option value="submitted">รอตรวจสอบ</option>
                <option value="needs_revision">ส่งกลับให้แก้ไข</option>
                <option value="passed">ผ่านการตรวจ</option>
                <option value="rejected">ไม่ผ่านการตรวจ</option>
              </select>
            </div>
          </div>

          {filtered.length ? (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">รหัสคำขอ</TableHead>
                    <TableHead scope="col">หลักสูตร</TableHead>
                    <TableHead scope="col">ผู้เสนอ</TableHead>
                    <TableHead scope="col">อัปเดตล่าสุด</TableHead>
                    <TableHead scope="col">สถานะ</TableHead>
                    <TableHead scope="col" className="text-right">ดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((proposal) => {
                    const meta = statusMeta[proposal.status];
                    return (
                      <TableRow key={proposal.id}>
                        <TableCell className="font-mono text-xs font-medium">{proposal.id}</TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">{proposal.curriculum?.curriculumNameTh ?? proposal.courseTitle}</p>
                          <p className="mt-1 max-w-md whitespace-normal text-xs text-muted-foreground">
                            {proposal.curriculum
                              ? `${proposal.curriculum.collegeOrSpecialty} · ${proposal.curriculum.credits.total} หน่วยกิต`
                              : `${proposal.courseCode} · ${proposal.credits} หน่วยกิต · ข้อมูลรูปแบบเดิม`}
                          </p>
                        </TableCell>
                        <TableCell>{proposal.proposerName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDateTime(proposal.updatedAt)}</TableCell>
                        <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                        <TableCell className="text-right">
                          {proposal.status === "submitted" ? (
                            <Button type="button" size="sm" onClick={() => openReview(proposal.id)}>ตรวจคำขอ</Button>
                          ) : <span className="text-xs text-muted-foreground">พิจารณาแล้ว</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon="fact_check" title="ไม่พบคำขอหลักสูตร" description="ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ" />
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) closeReview(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>ตรวจคำขอ {selected?.courseCode}</DialogTitle>
            <DialogDescription>{selected?.curriculum?.curriculumNameTh ?? selected?.courseTitle} · เสนอโดย {selected?.proposerName}</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
              <CurriculumProposalDetailsView proposal={selected} />
            </div>
          ) : null}
          {formError ? <div id="course-proposal-review-error" role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">{formError}</div> : null}
          <div className="space-y-1.5">
            <label htmlFor="course-proposal-decision" className="text-sm font-medium">ผลการตรวจ</label>
            <select id="course-proposal-decision" value={decision} onChange={(event) => { setDecision(event.target.value as CourseProposalDecision); setFormError(""); }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="passed">ผ่านการตรวจ</option>
              <option value="needs_revision">ต้องแก้ไขข้อมูล</option>
              <option value="rejected">ไม่ผ่านการตรวจ</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="course-proposal-review-reason" className="text-sm font-medium">เหตุผลและข้อเสนอแนะ</label>
            <Textarea id="course-proposal-review-reason" value={reason} onChange={(event) => { setReason(event.target.value); setFormError(""); }} aria-invalid={Boolean(formError && !reason.trim())} aria-describedby={formError ? "course-proposal-review-error" : undefined} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="course-proposal-review-evidence" className="text-sm font-medium">หลักฐานอ้างอิง (ถ้ามี)</label>
            <Input id="course-proposal-review-evidence" value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} placeholder="เช่น URL หรือเลขที่เอกสาร" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeReview}>ยกเลิก</Button>
            <Button type="button" onClick={saveReview} disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกผลการตรวจ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
