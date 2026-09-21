"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { EmptyState, LoadingState, WorkspaceHeader } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import type { AdmissionExamDecision } from "@/roles/shared/features/admissions/admission-exam-workflow";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import { institutionActor } from "@/roles/institution/features/workspace/institution-workspace-utils";

const decisionOptions: ReadonlyArray<{ value: AdmissionExamDecision; label: string }> = [
  { value: "passed", label: "ผ่าน" },
  { value: "failed", label: "ไม่ผ่าน" },
  { value: "absent", label: "ขาดสอบ" },
  { value: "withheld", label: "ระงับผล" },
];

const decisionLabel = new Map(decisionOptions.map((item) => [item.value, item.label]));
const selectClassName = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ResultDraft {
  decision: AdmissionExamDecision;
  score: string;
  note: string;
}

export default function AdmissionExamResultsPage() {
  const { session, isReady } = usePortalSession();
  const db = useMockDb();
  const actor = institutionActor(session);
  const institutionId = actor?.organisationId ?? "";
  const rounds = useMemo(() => db.admissionExamRounds.filter((round) => (
    round.institutionId === institutionId &&
    ["closed", "results_draft", "published"].includes(round.status)
  )), [db.admissionExamRounds, institutionId]);
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const selectedRound = rounds.find((round) => round.id === selectedRoundId) ?? rounds[0];
  const [drafts, setDrafts] = useState<Record<string, ResultDraft>>({});
  const [roundIdPendingDelete, setRoundIdPendingDelete] = useState<string | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const roundPendingDelete = rounds.find((round) => round.id === roundIdPendingDelete);
  const pendingDeleteResultCount = roundPendingDelete
    ? db.admissionExamResults.filter((result) => result.roundId === roundPendingDelete.id).length
    : 0;

  if (!isReady || !db.isLoaded) {
    return <PageShell size="full"><LoadingState label="กำลังโหลดผลสอบ" /></PageShell>;
  }

  const persistedDraftFor = (admissionId: string): ResultDraft => {
    const result = db.admissionExamResults.find((item) => (
      item.roundId === selectedRound?.id && item.admissionId === admissionId
    ));
    return {
      decision: result?.draftDecision ?? result?.currentDecision ?? "passed",
      score: result?.score?.toString() ?? "",
      note: result?.note ?? "",
    };
  };
  const draftFor = (admissionId: string): ResultDraft => (
    drafts[admissionId] ?? persistedDraftFor(admissionId)
  );
  const updateDraft = (admissionId: string, patch: Partial<ResultDraft>) => {
    setDrafts((previous) => ({
      ...previous,
      [admissionId]: { ...(previous[admissionId] ?? persistedDraftFor(admissionId)), ...patch },
    }));
  };
  const saveResult = (admissionId: string) => {
    if (!actor || !selectedRound) return;
    const draft = draftFor(admissionId);
    const existing = db.admissionExamResults.find((item) => (
      item.roundId === selectedRound.id && item.admissionId === admissionId
    ));
    const score = draft.score.trim() ? Number(draft.score) : undefined;
    try {
      if (existing?.status === "published" || existing?.status === "revised") {
        const reason = window.prompt("ระบุเหตุผลการแก้ไขผลที่ประกาศแล้ว");
        if (!reason?.trim()) return;
        db.reviseAdmissionExamResult({ actor, roundId: selectedRound.id, admissionId, decision: draft.decision, score, note: draft.note, reason });
        toast.success("แก้ไขผลและเก็บประวัติเดิมแล้ว");
      } else {
        db.saveAdmissionExamResultDraft({ actor, roundId: selectedRound.id, admissionId, decision: draft.decision, score, note: draft.note });
        toast.success("บันทึกร่างผลสอบแล้ว");
      }
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[admissionId];
        return next;
      });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "บันทึกผลไม่สำเร็จ");
    }
  };

  const persistedRoundResults = selectedRound
    ? db.admissionExamResults.filter((result) => result.roundId === selectedRound.id)
    : [];
  const savedDraftCount = selectedRound
    ? selectedRound.candidateAdmissionIds.filter((admissionId) => {
      const result = persistedRoundResults.find((item) => item.admissionId === admissionId);
      return result?.status === "draft" && Boolean(result.draftDecision);
    }).length
    : 0;
  const hasUnsavedChanges = Object.keys(drafts).length > 0;
  const canPublish = Boolean(
    selectedRound &&
    selectedRound.status !== "published" &&
    selectedRound.candidateAdmissionIds.length > 0 &&
    savedDraftCount === selectedRound.candidateAdmissionIds.length &&
    !hasUnsavedChanges,
  );
  const publishResults = () => {
    if (!actor || !selectedRound) return;
    if (!window.confirm("ยืนยันประกาศผลให้ผู้สมัครทุกคนในรอบนี้หรือไม่")) return;
    try {
      db.publishAdmissionExamResults({ actor, roundId: selectedRound.id, reason: "ตรวจสอบผลสอบครบถ้วนและอนุมัติให้ประกาศ" });
      toast.success("ประกาศผลสอบแล้ว");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "ประกาศผลไม่สำเร็จ");
    }
  };
  const deleteRound = (event: MouseEvent<HTMLButtonElement>) => {
    if (!actor || !roundPendingDelete) return;
    try {
      db.deleteAdmissionExamRound({
        actor,
        roundId: roundPendingDelete.id,
        reason: "ยืนยันลบรอบสอบและผลสอบทั้งหมดจากหน้าประกาศผลสอบ",
      });
      setRoundIdPendingDelete(null);
      setSelectedRoundId("");
      setDrafts({});
      toast.success("ลบรอบสอบและผลสอบทั้งหมดแล้ว");
    } catch (cause) {
      event.preventDefault();
      toast.error(cause instanceof Error ? cause.message : "ลบผลสอบไม่สำเร็จ");
    }
  };

  return (
    <PageShell size="full" className="space-y-6">
      <WorkspaceHeader eyebrow="งานรับสมัครของสถาบัน" title="ประกาศผลสอบ" description="บันทึกร่าง ตรวจทาน และประกาศผลสอบของผู้สมัคร" />
      {rounds.length === 0 || !selectedRound ? (
        <Card><CardContent className="py-8"><EmptyState icon="fact_check" title="ยังไม่มีรอบสอบที่พร้อมบันทึกผล" description="ปิดรอบสอบจากหน้าเปิดสอบก่อน แล้วจึงกลับมาบันทึกผลที่หน้านี้" /></CardContent></Card>
      ) : (
        <>
          <Card size="sm">
            <CardContent className="grid gap-4 pt-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="grid gap-1.5 text-sm font-medium">เลือกรอบสอบ<select className={selectClassName} value={selectedRound.id} onChange={(event) => { setSelectedRoundId(event.target.value); setDrafts({}); }}>{rounds.map((round) => <option key={round.id} value={round.id}>{round.title} · {round.program}</option>)}</select></label>
              <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                <div className="text-right">
                  <Badge variant={selectedRound.status === "published" ? "success" : "warning"}>{selectedRound.status === "published" ? "ประกาศผลแล้ว" : "รอบันทึกผล"}</Badge>
                  {selectedRound.status !== "published" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      บันทึกแล้ว {savedDraftCount}/{selectedRound.candidateAdmissionIds.length} คน{hasUnsavedChanges ? " · มีข้อมูลที่ยังไม่บันทึก" : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="destructive"
                    onClick={(event) => {
                      deleteTriggerRef.current = event.currentTarget;
                      setRoundIdPendingDelete(selectedRound.id);
                    }}
                    aria-label={`ลบรอบสอบและผลสอบ ${selectedRound.title}`}
                    className="min-h-11 gap-2"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">delete</span>
                    ลบรอบสอบและผลสอบ
                  </Button>
                  {selectedRound.status !== "published" ? <Button onClick={publishResults} disabled={!canPublish}>ประกาศผลทั้งหมด</Button> : null}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {selectedRound.candidateAdmissionIds.map((admissionId) => {
              const admission = db.admissions.find((item) => item.id === admissionId);
              const existing = db.admissionExamResults.find((item) => item.roundId === selectedRound.id && item.admissionId === admissionId);
              const draft = draftFor(admissionId);
              return (
                <Card key={admissionId}>
                  <CardHeader className="border-b border-border"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-primary">{admissionId}</p><CardTitle className="mt-1 text-lg">{admission?.name ?? "ผู้สมัคร"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{admission?.license} · {admission?.program}</p></div>{existing ? <Badge variant={existing.status === "draft" ? "warning" : "success"}>{existing.status === "draft" ? "ฉบับร่าง" : existing.status === "revised" ? "แก้ไขแล้ว" : "ประกาศแล้ว"}</Badge> : <Badge variant="secondary">ยังไม่บันทึก</Badge>}</div></CardHeader>
                  <CardContent className="grid gap-4 pt-5 lg:grid-cols-[12rem_10rem_minmax(0,1fr)_auto] lg:items-end">
                    <label className="grid gap-1.5 text-sm font-medium">ผลสอบ<select className={selectClassName} value={draft.decision} onChange={(event) => updateDraft(admissionId, { decision: event.target.value as AdmissionExamDecision })}>{decisionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                    <label className="grid gap-1.5 text-sm font-medium">คะแนน (ถ้ามี)<Input type="number" min={0} max={100} value={draft.score} onChange={(event) => updateDraft(admissionId, { score: event.target.value })} /></label>
                    <label className="grid gap-1.5 text-sm font-medium">หมายเหตุ<Textarea rows={1} value={draft.note} onChange={(event) => updateDraft(admissionId, { note: event.target.value })} placeholder="ข้อมูลประกอบผลสอบ" /></label>
                    <Button variant={existing?.status === "published" || existing?.status === "revised" ? "outline" : "default"} onClick={() => saveResult(admissionId)}>{existing?.status === "published" || existing?.status === "revised" ? "แก้ไขผล" : "บันทึกร่าง"}</Button>
                  </CardContent>
                  {existing?.currentDecision ? <div className="border-t border-border px-6 py-3 text-sm text-muted-foreground">ผลล่าสุด: <span className="font-medium text-foreground">{decisionLabel.get(existing.currentDecision)}</span>{existing.score !== undefined ? ` · ${existing.score} คะแนน` : ""}</div> : null}
                </Card>
              );
            })}
          </div>
        </>
      )}

      <AlertDialog
        open={Boolean(roundPendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setRoundIdPendingDelete(null);
            window.requestAnimationFrame(() => deleteTriggerRef.current?.focus());
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบรอบสอบและผลสอบทั้งหมดหรือไม่</AlertDialogTitle>
            <AlertDialogDescription>
              คุณกำลังจะลบ “{roundPendingDelete?.title}” และผลสอบ {pendingDeleteResultCount} รายการออกจากหน้านี้
              การดำเนินการนี้เรียกคืนไม่ได้ แต่ประวัติการลบจะยังถูกเก็บใน Audit Log
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" className="min-h-11 w-full sm:w-auto">ยกเลิก</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" className="min-h-11 w-full sm:w-auto" onClick={deleteRound}>
                ยืนยันการลบ
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
