"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { COLLEGE_OPTIONS, type CollegeCode } from "@/roles/shared/data/college-directory";
import {
  formatAssignmentPeriod,
  isRoleAssignmentActive,
  validateRoleAssignment,
  type RoleAssignment,
} from "@/roles/shared/features/roles/role-assignment";
import { useRoleAssignmentStore } from "@/roles/shared/features/roles/role-assignment-store";
import { COLLEGE_ORGANISATIONS, ORGANISATIONS } from "@/roles/shared/features/roles/access-model";
import { createAuditActorSnapshot, useAuditLog } from "@/roles/shared/features/audit";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

export default function AdminPresidentTermsPage() {
  const { session } = usePortalSession();
  const { appendEvent } = useAuditLog();
  const { assignments, addAssignment, isReady, storageError } = useRoleAssignmentStore();
  const [clock] = useState(() => new Date());
  const [termLevel, setTermLevel] = useState<"college" | "royal_college">("college");
  const [collegeCode, setCollegeCode] = useState<CollegeCode>(COLLEGE_OPTIONS[0].value);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [formError, setFormError] = useState("");
  const isSuperAdmin = session?.role === "super_admin";
  const terms = assignments
    .filter((assignment) => assignment.role === "president")
    .sort((left, right) => left.collegeCode.localeCompare(right.collegeCode, "th") || right.startsAt.localeCompare(left.startsAt));

  if (!isReady) {
    return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-admin-content-muted"><span className="material-symbols-outlined animate-spin">progress_activity</span>กำลังตรวจสอบสิทธิ์</div>;
  }
  if (!isSuperAdmin) {
    return <div className="mx-auto max-w-xl py-16 text-center"><span className="material-symbols-outlined text-5xl text-danger">admin_panel_settings</span><h1 className="mt-3 text-xl font-semibold text-admin-content">สงวนสิทธิ์สำหรับผู้ดูแลระบบสูงสุด</h1><p className="mt-2 text-sm text-admin-content-muted">Role อื่นไม่สามารถกำหนดวาระประธานได้</p><Button asChild className="mt-5"><Link href="/admin/dashboard">กลับหน้าภาพรวม</Link></Button></div>;
  }

  const addTerm = () => {
    setFormError("");
    if (!userName.trim() || !email.trim() || !startsAt || !endsAt) {
      setFormError("กรุณากรอกชื่อ อีเมล วันเริ่มต้น และวันสิ้นสุดวาระให้ครบ");
      return;
    }
    const organisationScope = termLevel === "royal_college"
      ? ORGANISATIONS.royalCollege
      : COLLEGE_ORGANISATIONS.find((organisation) => organisation.code === collegeCode)!;
    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
      setFormError("รูปแบบวันเริ่มต้นหรือวันสิ้นสุดไม่ถูกต้อง");
      return;
    }
    const sequence = Date.now().toString(36);
    const assignment: RoleAssignment = {
      id: `term-${organisationScope.code}-${sequence}`,
      userId: `president-${organisationScope.code}-${sequence}`,
      userName: userName.trim(),
      email: email.trim(),
      role: "president",
      organisationScope,
      resourceScopes: [termLevel === "royal_college" ? "signature:royal_college" : "signature:college"],
      collegeCode: organisationScope.code,
      collegeName: organisationScope.name,
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
      appointedBy: session.displayName,
    };
    const validationError = validateRoleAssignment(assignment, assignments);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const auditEvent = appendEvent({
      actor: createAuditActorSnapshot(session),
      action: "access.role_scope_change",
      resource: {
        type: "president_term",
        id: assignment.id,
        label: `${assignment.userName} · ${assignment.collegeCode}`,
        organisationId: assignment.organisationScope.id,
      },
      before: null,
      after: assignment,
      reason: "แต่งตั้งผู้ดำรงตำแหน่งตามช่วงวาระที่กำหนด",
      evidenceReference: `appointment:${assignment.id}`,
    });
    if (!auditEvent) {
      setFormError("บันทึก User Audit Log ไม่สำเร็จ จึงยังไม่เพิ่มวาระ");
      return;
    }
    const persistError = addAssignment(assignment);
    if (persistError) {
      setFormError(persistError);
      return;
    }
    setUserName("");
    setEmail("");
    setStartsAt("");
    setEndsAt("");
    toast.success("เพิ่มวาระประธานเรียบร้อยแล้ว", { description: `${organisationScope.code} · ${userName.trim()}` });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header><h1 className="text-2xl font-bold tracking-tight text-admin-content">จัดการวาระประธานวิทยาลัย</h1><p className="mt-1 text-sm text-admin-content-muted">กำหนดผู้ดำรงตำแหน่งตามช่วงวันที่ ระบบจะให้สิทธิ์เฉพาะวาระที่มีผลและไม่อนุญาตช่วงเวลาซ้อนกัน</p></header>
      {(storageError || formError) && <div role="alert" className={`rounded-2xl border p-3 text-sm ${formError ? "border-danger-border bg-danger-soft text-danger" : "border-warning-border bg-warning-soft text-warning-on-soft"}`}>{formError || storageError}</div>}
      <Card className="border-admin-border bg-surface-raised">
        <CardContent className="space-y-4 px-5">
          <div>
            <h2 className="text-base font-semibold text-admin-content">เพิ่มวาระใหม่</h2>
            <p className="mt-1 text-xs text-admin-content-muted">วันสิ้นสุดเป็นขอบเขตแบบไม่รวมเวลานั้น เพื่อส่งต่อสิทธิ์ได้ต่อเนื่อง ผู้ดำรงตำแหน่งใช้ email ที่ระบุและรหัส 2323 เพื่อเข้าสู่ระบบในช่วงวาระ</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="term-level" className="text-xs font-medium text-admin-content">ระดับประธาน</label>
              <select
                id="term-level"
                value={termLevel}
                onChange={(event) => setTermLevel(event.target.value as typeof termLevel)}
                className="flex h-9 w-full rounded-2xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <option value="college">ประธานวิทยาลัย</option>
                <option value="royal_college">ประธานราชวิทยาลัย</option>
              </select>
            </div>
            {termLevel === "college" && (
            <div className="space-y-1.5">
              <label htmlFor="term-college" className="text-xs font-medium text-admin-content">วิทยาลัย</label>
              <select
                id="term-college"
                value={collegeCode}
                onChange={(event) => setCollegeCode(event.target.value as CollegeCode)}
                className="flex h-9 w-full rounded-2xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {COLLEGE_OPTIONS.map((college) => <option key={college.value} value={college.value}>{college.label}</option>)}
              </select>
            </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="term-name" className="text-xs font-medium text-admin-content">ชื่อผู้ดำรงตำแหน่ง</label>
              <Input id="term-name" value={userName} onChange={(event) => { setUserName(event.target.value); setFormError(""); }} placeholder="ชื่อและนามสกุล" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="term-email" className="text-xs font-medium text-admin-content">อีเมล</label>
              <Input id="term-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setFormError(""); }} placeholder="president@example.org" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="term-start" className="text-xs font-medium text-admin-content">เริ่มวาระ</label>
              <Input id="term-start" type="datetime-local" value={startsAt} onChange={(event) => { setStartsAt(event.target.value); setFormError(""); }} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="term-end" className="text-xs font-medium text-admin-content">สิ้นสุดวาระ</label>
              <Input id="term-end" type="datetime-local" value={endsAt} onChange={(event) => { setEndsAt(event.target.value); setFormError(""); }} />
            </div>
            <div className="flex items-end">
              <Button onClick={addTerm} className="w-full"><span className="material-symbols-outlined text-base">add</span>เพิ่มวาระ</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-admin-border bg-surface-raised"><CardContent className="space-y-4 px-5"><div><h2 className="text-base font-semibold text-admin-content">วาระทั้งหมด</h2><p className="mt-1 text-xs text-admin-content-muted">{terms.length} วาระใน {new Set(terms.map((term) => term.collegeCode)).size} วิทยาลัย</p></div><div className="overflow-x-auto rounded-2xl border border-admin-border"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-admin-surface-soft text-xs text-admin-content-muted"><tr><th className="px-4 py-3 font-medium">วิทยาลัย</th><th className="px-4 py-3 font-medium">ผู้ดำรงตำแหน่ง</th><th className="px-4 py-3 font-medium">ช่วงวาระ</th><th className="px-4 py-3 font-medium">สถานะ</th><th className="px-4 py-3 font-medium">แต่งตั้งโดย</th></tr></thead><tbody className="divide-y divide-admin-border">{terms.map((term) => { const active = isRoleAssignmentActive(term, clock); const expired = new Date(term.endsAt).getTime() <= clock.getTime(); return <tr key={term.id} className="hover:bg-admin-surface-soft"><td className="px-4 py-3"><p className="font-medium text-admin-content">{term.collegeCode}</p><p className="max-w-xs truncate text-xs text-admin-content-muted">{term.collegeName}</p></td><td className="px-4 py-3"><p className="font-medium text-admin-content">{term.userName}</p><p className="text-xs text-admin-content-muted">{term.email}</p></td><td className="whitespace-nowrap px-4 py-3 text-admin-content-secondary">{formatAssignmentPeriod(term)}</td><td className="px-4 py-3"><Badge variant={active ? "success" : expired ? "secondary" : "info"} className="h-auto py-1">{active ? "มีผล" : expired ? "สิ้นสุดแล้ว" : "กำหนดไว้"}</Badge></td><td className="px-4 py-3 text-admin-content-secondary">{term.appointedBy}</td></tr>; })}{terms.length === 0 && <tr><td colSpan={5} className="px-4 py-14 text-center text-admin-content-muted">ยังไม่มีข้อมูลวาระ</td></tr>}</tbody></table></div></CardContent></Card>
    </div>
  );
}
