"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import {
  EmptyState,
  LoadingState,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import type { CourseProposalActor } from "@/roles/shared/features/academic";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

import { CurriculumProposalFormFields } from "./CurriculumProposalFormFields";
import {
  curriculumDetailsFromForm,
  emptyCurriculumProposalForm,
  proposalToCurriculumForm,
  type CurriculumProposalFormState,
} from "./curriculum-proposal-form";

interface TeacherCurriculumProposalFormPageProps {
  proposalId?: string;
}

function friendlyFormError(error: unknown) {
  if (!(error instanceof Error)) return "ไม่สามารถส่งคำขอหลักสูตรได้";
  if (error.message.includes("credit categories cannot exceed")) {
    return "ผลรวมหน่วยกิตแต่ละประเภทต้องไม่เกินหน่วยกิตรวม";
  }
  if (error.message.includes("Effective date cannot")) {
    return "วันที่มีผลต้องไม่อยู่ก่อนวันที่ประกาศ";
  }
  if (error.message.includes("is required")) {
    return "กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง";
  }
  if (error.message.includes("credits")) {
    return "กรุณาตรวจสอบข้อมูลหน่วยกิตให้ถูกต้อง";
  }
  return error.message;
}

export default function TeacherCurriculumProposalFormPage({
  proposalId,
}: TeacherCurriculumProposalFormPageProps) {
  const router = useRouter();
  const db = useMockDb();
  const { session, isReady } = usePortalSession();
  const [form, setForm] = useState(() => emptyCurriculumProposalForm());
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedKey = useRef("");
  const proposal = useMemo(
    () => db.courseProposals.find((item) => item.id === proposalId),
    [db.courseProposals, proposalId],
  );
  const actor: CourseProposalActor | null = session?.role === "teacher"
    ? {
        userId: session.userId,
        userName: session.displayName,
        role: session.role,
        organisationId: session.organisation.id,
        resourceScopes: session.resourceScopes,
      }
    : null;
  const isRevision = Boolean(proposalId);

  useEffect(() => {
    if (!isReady || !db.isLoaded || !session) return;
    const key = proposalId ?? `new:${session.organisation.id}`;
    if (initializedKey.current === key) return;
    setForm(
      proposal
        ? proposalToCurriculumForm(proposal)
        : emptyCurriculumProposalForm(session.organisation.name),
    );
    initializedKey.current = key;
  }, [db.isLoaded, isReady, proposal, proposalId, session]);

  if (!isReady || !db.isLoaded) {
    return <PageShell size="full"><LoadingState label="กำลังเตรียมแบบฟอร์มหลักสูตร" /></PageShell>;
  }

  const canEditProposal = !proposal || (
    proposal.proposerId === session?.userId &&
    proposal.institutionId === session?.organisation.id &&
    proposal.status === "needs_revision"
  );
  if (isRevision && (!proposal || !canEditProposal)) {
    return (
      <PageShell size="full" className="space-y-6">
        <WorkspaceHeader
          eyebrow="Curriculum proposal"
          title="ไม่สามารถแก้ไขคำขอนี้ได้"
          description="ตรวจสอบว่าคำขอยังอยู่ในสถานะต้องแก้ไขและเป็นคำขอของบัญชีนี้"
          action={{ href: "/teacher/course-proposals", label: "กลับไปรายการ", icon: "arrow_back" }}
        />
        <EmptyState
          icon="lock"
          title="ไม่มีคำขอที่แก้ไขได้"
          description="คำขออาจถูกพิจารณาแล้ว หรือไม่อยู่ในขอบเขตของบัญชีนี้"
        />
      </PageShell>
    );
  }

  const updateForm = (field: keyof CurriculumProposalFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  };

  const submitProposal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!actor) {
      setFormError("บัญชีนี้ไม่มีสิทธิ์ส่งคำขอหลักสูตร");
      return;
    }
    if (proposal && !form.revisionReason.trim()) {
      setFormError("กรุณาสรุปสิ่งที่แก้ไขก่อนส่งกลับไปตรวจอีกครั้ง");
      return;
    }
    setIsSubmitting(true);
    try {
      const curriculum = curriculumDetailsFromForm(form);
      const payload = {
        actor,
        courseCode: curriculum.pharmacyCouncilAnnouncementNo,
        courseTitle: curriculum.curriculumNameTh,
        credits: curriculum.credits.total,
        rationale: curriculum.philosophyAndObjectives,
        curriculum,
        evidenceReference: form.evidenceReference || undefined,
      };
      if (proposal) {
        db.resubmitCourseProposal({
          ...payload,
          proposalId: proposal.id,
          reason: form.revisionReason,
        });
        toast.success("ส่งหลักสูตรที่แก้ไขกลับไปตรวจแล้ว");
      } else {
        db.submitCourseProposal(payload);
        toast.success("ส่งคำขอหลักสูตรให้เจ้าหน้าที่ตรวจแล้ว");
      }
      router.push("/teacher/course-proposals");
    } catch (error) {
      setFormError(friendlyFormError(error));
      setIsSubmitting(false);
      globalThis.requestAnimationFrame?.(() => {
        document.getElementById("curriculum-proposal-error")?.focus();
      });
    }
  };

  return (
    <PageShell size="full" className="space-y-6">
      <WorkspaceHeader
        eyebrow="Curriculum proposal"
        title={proposal ? "แก้ไขคำขอหลักสูตร" : "เสนอหลักสูตรใหม่"}
        description={proposal
          ? "ปรับข้อมูลตามข้อเสนอแนะ และส่งกลับให้เจ้าหน้าที่ตรวจอีกครั้ง"
          : "กรอกข้อมูลระดับหลักสูตรเพื่อส่งให้เจ้าหน้าที่ราชวิทยาลัยตรวจสอบ"}
        action={{ href: "/teacher/course-proposals", label: "กลับไปรายการ", icon: "arrow_back" }}
      />

      <Card>
        <CardContent className="px-4 sm:px-6 lg:px-8">
          <form onSubmit={submitProposal} aria-busy={isSubmitting} className="space-y-6">
            <p className="text-sm text-muted-foreground">
              ช่องที่ไม่มีคำว่า “ถ้ามี” จำเป็นต้องกรอก
            </p>
            {formError ? (
              <div
                id="curriculum-proposal-error"
                role="alert"
                tabIndex={-1}
                className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {formError}
              </div>
            ) : null}
            <CurriculumProposalFormFields
              form={form}
              onChange={updateForm}
              isRevision={isRevision}
              errorId={formError ? "curriculum-proposal-error" : undefined}
            />
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" size="lg" onClick={() => router.push("/teacher/course-proposals")}>
                ยกเลิก
              </Button>
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting
                  ? "กำลังส่ง..."
                  : proposal
                    ? "ส่งข้อมูลที่แก้ไข"
                    : "ส่งให้เจ้าหน้าที่ตรวจ"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
