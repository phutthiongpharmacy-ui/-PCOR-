"use client";

import { useRef, useState, type MouseEvent } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import {
  EmptyState,
  LoadingState,
  MetricCard,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  eligibleAdmissionExamCandidates,
  type AdmissionExamMode,
  type AdmissionExamRoundStatus,
} from "@/roles/shared/features/admissions/admission-exam-workflow";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import { institutionActor } from "@/roles/institution/features/workspace/institution-workspace-utils";

const statusMeta: Record<AdmissionExamRoundStatus, {
  label: string;
  variant: "secondary" | "info" | "warning" | "success" | "danger";
}> = {
  draft: { label: "ฉบับร่าง", variant: "secondary" },
  open: { label: "เปิดรอบสอบแล้ว", variant: "info" },
  closed: { label: "ปิดสอบแล้ว", variant: "warning" },
  results_draft: { label: "กำลังบันทึกผล", variant: "warning" },
  published: { label: "ประกาศผลแล้ว", variant: "success" },
  cancelled: { label: "ยกเลิกแล้ว", variant: "danger" },
};

const modeOptions: ReadonlyArray<{ value: AdmissionExamMode; label: string }> = [
  { value: "written", label: "สอบข้อเขียน" },
  { value: "bedside", label: "สอบข้างเตียง" },
  { value: "interview", label: "สอบสัมภาษณ์" },
];

const modeLabel = new Map(modeOptions.map((mode) => [mode.value, mode.label]));

const selectClassName = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export default function AdmissionExamRoundsPage() {
  const { session, isReady } = usePortalSession();
  const db = useMockDb();
  const actor = institutionActor(session);
  const institutionId = actor?.organisationId ?? "";
  const eligibleCandidates = eligibleAdmissionExamCandidates(db.admissions, institutionId);
  const rounds = db.admissionExamRounds.filter((round) => round.institutionId === institutionId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("การสอบคัดเลือกเข้าศึกษา ปีการศึกษา 2569");
  const [program, setProgram] = useState("");
  const [startsAt, setStartsAt] = useState("2026-10-15T09:00");
  const [endsAt, setEndsAt] = useState("2026-10-15T12:00");
  const [venue, setVenue] = useState("ห้องสอบศูนย์การแพทย์ศิริราช");
  const [capacity, setCapacity] = useState(20);
  const [modes, setModes] = useState<AdmissionExamMode[]>(["written"]);
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [roundIdPendingDelete, setRoundIdPendingDelete] = useState<string | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const programCandidates = eligibleCandidates.filter((candidate) => candidate.program === program);
  const roundPendingDelete = rounds.find((round) => round.id === roundIdPendingDelete);
  const pendingDeleteResultCount = roundPendingDelete
    ? db.admissionExamResults.filter((result) => result.roundId === roundPendingDelete.id).length
    : 0;

  if (!isReady || !db.isLoaded) {
    return <PageShell size="full"><LoadingState label="กำลังโหลดข้อมูลรอบสอบ" /></PageShell>;
  }

  const toggleMode = (mode: AdmissionExamMode) => {
    setModes((previous) => previous.includes(mode)
      ? previous.filter((item) => item !== mode)
      : [...previous, mode]);
  };
  const toggleCandidate = (id: string) => {
    setCandidateIds((previous) => previous.includes(id)
      ? previous.filter((item) => item !== id)
      : [...previous, id]);
  };
  const openCreate = () => {
    const firstCandidate = eligibleCandidates[0];
    setProgram(firstCandidate?.program ?? "เภสัชบำบัด");
    setCandidateIds(firstCandidate ? [firstCandidate.id] : []);
    setFormError("");
    setIsCreateOpen(true);
  };
  const createRound = () => {
    if (!actor) return;
    try {
      db.createAdmissionExamRound({
        actor,
        draft: {
          title,
          program,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          venue,
          capacity,
          modes,
          candidateAdmissionIds: candidateIds,
        },
      });
      setIsCreateOpen(false);
      toast.success("สร้างร่างรอบสอบแล้ว");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "ไม่สามารถสร้างรอบสอบได้");
    }
  };
  const runAction = (
    roundId: string,
    action: "open" | "close" | "cancel",
  ) => {
    if (!actor) return;
    try {
      if (action === "open") {
        if (!window.confirm("ยืนยันเปิดรอบสอบและแจ้งกำหนดการแก่ผู้สมัครหรือไม่")) return;
        db.openAdmissionExamRound({ actor, roundId });
        toast.success("เปิดรอบสอบแล้ว");
      } else if (action === "close") {
        if (!window.confirm("ยืนยันว่าการสอบเสร็จสิ้นและพร้อมบันทึกผลหรือไม่")) return;
        db.closeAdmissionExamRound({ actor, roundId });
        toast.success("ปิดรอบสอบแล้ว");
      } else {
        const reason = window.prompt("ระบุเหตุผลที่ยกเลิกรอบสอบ");
        if (!reason?.trim()) return;
        db.cancelAdmissionExamRound({ actor, roundId, reason });
        toast.success("ยกเลิกรอบสอบแล้ว");
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "ดำเนินการไม่สำเร็จ");
    }
  };
  const deleteRound = (event: MouseEvent<HTMLButtonElement>) => {
    if (!actor || !roundPendingDelete) return;
    try {
      db.deleteAdmissionExamRound({
        actor,
        roundId: roundPendingDelete.id,
        reason: "ยืนยันลบรอบสอบและผลสอบที่เชื่อมโยงจากหน้าจัดการรอบสอบ",
      });
      setRoundIdPendingDelete(null);
      toast.success("ลบรอบสอบและผลสอบที่เชื่อมโยงแล้ว");
    } catch (cause) {
      event.preventDefault();
      toast.error(cause instanceof Error ? cause.message : "ลบรอบสอบไม่สำเร็จ");
    }
  };

  const openCount = rounds.filter((round) => round.status === "open").length;
  const awaitingResults = rounds.filter((round) => (
    round.status === "closed" || round.status === "results_draft"
  )).length;

  return (
    <PageShell size="full" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <WorkspaceHeader
          eyebrow="งานรับสมัครของสถาบัน"
          title="เปิดสอบ"
          description="สร้างรอบสอบและจัดรายชื่อผู้สมัครที่ผ่านการอนุมัติแล้ว"
        />
        <Button onClick={openCreate} className="shrink-0 gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-lg">add</span>
          สร้างรอบสอบ
        </Button>
      </div>

      <section aria-label="สรุปรอบสอบ" className="grid gap-3 sm:grid-cols-3">
        <MetricCard size="sm" label="รอบสอบทั้งหมด" value={rounds.length} note="เฉพาะสถาบันนี้" icon="quiz" />
        <MetricCard size="sm" label="กำลังเปิดสอบ" value={openCount} note="แจ้งกำหนดการแล้ว" icon="event_available" emphasis="success" />
        <MetricCard size="sm" label="รอบันทึกผล" value={awaitingResults} note="การสอบสิ้นสุดแล้ว" icon="pending_actions" emphasis={awaitingResults ? "warning" : "default"} />
      </section>

      {rounds.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-8">
            <EmptyState icon="event_upcoming" title="ยังไม่มีรอบสอบ" description="สร้างรอบสอบแรกจากผู้สมัครที่ได้รับอนุมัติแล้ว" />
            <div className="flex justify-center">
              <Button onClick={openCreate}>สร้างรอบสอบ</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {rounds.map((round) => {
            const meta = statusMeta[round.status];
            const candidates = round.candidateAdmissionIds
              .map((id) => db.admissions.find((admission) => admission.id === id))
              .filter(Boolean);
            return (
              <Card key={round.id}>
                <CardHeader className="gap-3 border-b border-border">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-primary">{round.id}</p>
                      <CardTitle className="mt-1 text-lg">{round.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{round.program}</p>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs text-muted-foreground">กำหนดสอบ</dt><dd className="mt-1 font-medium">{formatDateTime(round.startsAt)}–{formatTime(round.endsAt)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">สถานที่</dt><dd className="mt-1 font-medium">{round.venue}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">รูปแบบ</dt><dd className="mt-1">{round.modes.map((mode) => modeLabel.get(mode)).join(" · ")}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">ผู้มีสิทธิ์สอบ</dt><dd className="mt-1 font-medium">{candidates.length} / {round.capacity} คน</dd></div>
                  </dl>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-xs font-medium text-muted-foreground">รายชื่อผู้มีสิทธิ์สอบ</p>
                    <p className="mt-1 text-sm">{candidates.map((candidate) => candidate?.name).join(", ") || "—"}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="destructive"
                      onClick={(event) => {
                        deleteTriggerRef.current = event.currentTarget;
                        setRoundIdPendingDelete(round.id);
                      }}
                      aria-label={`ลบรอบสอบ ${round.title}`}
                      className="min-h-11 gap-2"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-lg">delete</span>
                      ลบรอบสอบ
                    </Button>
                    <div className="flex flex-wrap justify-end gap-2">
                      {round.status === "draft" ? <Button variant="outline" onClick={() => runAction(round.id, "cancel")}>ยกเลิกรอบสอบ</Button> : null}
                      {round.status === "draft" ? <Button onClick={() => runAction(round.id, "open")}>เปิดรอบสอบ</Button> : null}
                      {round.status === "open" ? <Button variant="outline" onClick={() => runAction(round.id, "cancel")}>ยกเลิกรอบสอบ</Button> : null}
                      {round.status === "open" ? <Button onClick={() => runAction(round.id, "close")}>ปิดสอบและบันทึกผล</Button> : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>สร้างรอบสอบใหม่</DialogTitle>
            <DialogDescription>กำหนดการสอบและเลือกผู้สมัครที่ได้รับอนุมัติแล้ว</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <label className="grid gap-1.5 text-sm font-medium">ชื่อรอบสอบ<Input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="grid gap-1.5 text-sm font-medium">หลักสูตร<select className={selectClassName} value={program} onChange={(event) => { setProgram(event.target.value); setCandidateIds([]); setFormError(""); }}>{[...new Set(eligibleCandidates.map((candidate) => candidate.program))].map((value) => <option key={value}>{value}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">เริ่มสอบ<Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
              <label className="grid gap-1.5 text-sm font-medium">สิ้นสุดสอบ<Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <label className="grid gap-1.5 text-sm font-medium">สถานที่สอบ<Input value={venue} onChange={(event) => setVenue(event.target.value)} /></label>
              <label className="grid gap-1.5 text-sm font-medium">จำนวนที่รับ<Input type="number" min={1} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} /></label>
            </div>
            <fieldset className="grid gap-2"><legend className="text-sm font-medium">รูปแบบการสอบ</legend><div className="flex flex-wrap gap-2">{modeOptions.map((mode) => <label key={mode.value} className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm"><input type="checkbox" checked={modes.includes(mode.value)} onChange={() => toggleMode(mode.value)} />{mode.label}</label>)}</div></fieldset>
            <fieldset className="grid gap-2"><legend className="text-sm font-medium">ผู้มีสิทธิ์สอบ</legend>{programCandidates.length === 0 ? <p className="rounded-xl border border-warning-border bg-warning-soft p-3 text-sm text-warning-on-soft">ยังไม่มีผู้สมัครเรียนที่ได้รับอนุมัติในหลักสูตรนี้</p> : <div className="grid gap-2 sm:grid-cols-2">{programCandidates.map((candidate) => <label key={candidate.id} className="flex min-h-14 items-start gap-3 rounded-xl border border-border p-3 text-sm"><input className="mt-1" type="checkbox" checked={candidateIds.includes(candidate.id)} onChange={() => toggleCandidate(candidate.id)} /><span><span className="block font-medium">{candidate.name}</span><span className="text-xs text-muted-foreground">{candidate.id} · {candidate.license}</span></span></label>)}</div>}</fieldset>
            {formError ? <p role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">{formError}</p> : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>ยกเลิก</Button><Button onClick={createRound} disabled={!actor || programCandidates.length === 0}>บันทึกร่างรอบสอบ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogTitle>ลบรอบสอบนี้หรือไม่</AlertDialogTitle>
            <AlertDialogDescription>
              คุณกำลังจะลบ “{roundPendingDelete?.title}” พร้อมผลสอบที่เชื่อมโยง {pendingDeleteResultCount} รายการ
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
