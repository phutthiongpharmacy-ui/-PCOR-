"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { getCollegeOption } from "@/roles/shared/data/college-directory";
import {
  MetricCard,
  LoadingState,
  ScopeBadge,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";
import {
  ORGANISATION_LIST,
  ORGANISATIONS,
  ROLE_PRESENTATION,
  SYSTEM_ROLES,
  type SystemRole,
} from "@/roles/shared/features/roles/access-model";
import { createAuditActorSnapshot, useAuditLog } from "@/roles/shared/features/audit";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import {
  DEFAULT_GOVERNANCE_CONFIGURATION,
  commitAuditedGovernanceChange,
  persistGovernanceConfiguration,
  readGovernanceConfiguration,
  updateIntegrationConfiguration,
  updateUserAccessAssignment,
} from "./governance-configuration";

type GovernanceSection = "users" | "scopes" | "organisations" | "integrations" | "break-glass";

const users = [
  { id: "วภท-2568-001", name: "ภก. สมชาย ใจดี" },
  { id: "teacher-001", name: "อ. ภก. กิตติพงศ์ วัฒนเภสัช" },
  { id: "institution-admin-001", name: "ภก. วิชาญ อัครเวช" },
  { id: "staff-001", name: "ภญ. ปาริชาติ สุขเกษม" },
  { id: "president-vpt-current", name: "ภก. รศ. ดร. ธนกฤต ศรีวิชัย" },
  { id: "super-admin", name: "System Admin" },
] as const;

const integrations = [
  { id: "license", name: "ทะเบียนใบอนุญาตประกอบวิชาชีพ", detail: "ใช้ตรวจ Eligibility ก่อนส่งคำขอลงทะเบียน", icon: "verified_user" },
  { id: "payment", name: "Payment Gateway", detail: "รับผลการชำระจาก System Actor", icon: "credit_card" },
  { id: "email", name: "Email Notification", detail: "แจ้งผลการพิจารณาและสถานะเอกสาร", icon: "alternate_email" },
  { id: "document", name: "Document Verification", detail: "ตรวจหลักฐานอ้างอิงจากบริการภายนอก", icon: "document_scanner" },
] as const;

function UsersSection() {
  const { session, isReady: isSessionReady } = usePortalSession();
  const { appendEvent, isReady: isAuditReady } = useAuditLog();
  const [configuration, setConfiguration] = useState(DEFAULT_GOVERNANCE_CONFIGURATION);
  const [isConfigurationReady, setIsConfigurationReady] = useState(false);
  const [query, setQuery] = useState("");
  const [viewAuditStatus, setViewAuditStatus] = useState<"pending" | "allowed" | "error">("pending");
  const viewAuditAttempted = useRef(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<SystemRole>("student");
  const [organisationId, setOrganisationId] = useState<string>(ORGANISATIONS.siriraj.id);
  const [resourceScopes, setResourceScopes] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    // Browser storage is intentionally read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfiguration(readGovernanceConfiguration());
    setIsConfigurationReady(true);
  }, []);

  useEffect(() => {
    if (
      viewAuditStatus !== "pending" ||
      viewAuditAttempted.current ||
      !isSessionReady ||
      !isAuditReady
    ) return;
    viewAuditAttempted.current = true;
    if (!session || session.role !== "super_admin") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewAuditStatus("error");
      return;
    }
    const event = appendEvent({
      actor: createAuditActorSnapshot(session),
      action: "sensitive_data.view",
      resource: {
        type: "user_directory",
        id: "super-admin-users",
        label: "บัญชีผู้ใช้และการกำหนดสิทธิ์",
        organisationId: session.organisation.id,
      },
      before: { viewed: false },
      after: { viewed: true, fields: ["userId", "displayName", "role", "organisationScope", "resourceScopes"] },
      reason: "ตรวจบัญชีผู้ใช้และขอบเขตสิทธิ์",
      evidenceReference: "workspace:/admin/users",
    });
    setViewAuditStatus(event ? "allowed" : "error");
  }, [appendEvent, isAuditReady, isSessionReady, session, viewAuditStatus]);

  const assignmentsByUser = useMemo(
    () => new Map(configuration.userAssignments.map((item) => [item.userId, item])),
    [configuration.userAssignments],
  );
  const visibleUsers = useMemo(() => users.filter((user) => {
    const assignment = assignmentsByUser.get(user.id);
    if (!assignment) return false;
    const organisation = ORGANISATION_LIST.find((item) => item.id === assignment.organisationId);
    const haystack = `${user.name} ${user.id} ${ROLE_PRESENTATION[assignment.role].label} ${organisation?.name ?? ""}`;
    return haystack.toLocaleLowerCase("th-TH").includes(query.toLocaleLowerCase("th-TH"));
  }), [assignmentsByUser, query]);

  const selectedUser = users.find((user) => user.id === selectedUserId);
  const openAssignment = (userId: string) => {
    const assignment = assignmentsByUser.get(userId);
    if (!assignment) return;
    setSelectedUserId(userId);
    setRole(assignment.role);
    setOrganisationId(assignment.organisationId);
    setResourceScopes(assignment.resourceScopes.join(", "));
    setReason("");
    setFormError("");
  };
  const closeAssignment = () => {
    setSelectedUserId("");
    setFormError("");
  };
  const saveAssignment = () => {
    const current = assignmentsByUser.get(selectedUserId);
    const normalizedReason = reason.trim();
    if (!current || !selectedUser || !session || session.role !== "super_admin") {
      setFormError("ไม่พบข้อมูลผู้ดำเนินการหรือบัญชีเป้าหมาย");
      return;
    }
    if (!normalizedReason) {
      setFormError("กรุณาระบุเหตุผลการเปลี่ยนแปลง");
      return;
    }
    try {
      const next = updateUserAccessAssignment(configuration, {
        userId: current.userId,
        role,
        organisationId,
        resourceScopes: resourceScopes.split(","),
      });
      const updated = next.userAssignments.find((item) => item.userId === current.userId);
      if (!updated) throw new Error("ไม่พบ Assignment หลังการเปลี่ยนแปลง");
      if (JSON.stringify(current) === JSON.stringify(updated)) {
        setFormError("ข้อมูล Role และ Scope ไม่มีการเปลี่ยนแปลง");
        return;
      }
      const result = commitAuditedGovernanceChange({
        next,
        appendAudit: () => appendEvent({
          actor: createAuditActorSnapshot(session),
          action: "access.role_scope_change",
          resource: {
            type: "user_access_assignment",
            id: current.userId,
            label: selectedUser.name,
            organisationId: updated.organisationId,
          },
          before: current,
          after: updated,
          reason: normalizedReason,
          evidenceReference: "workspace:/admin/users",
        }),
        persist: persistGovernanceConfiguration,
        commit: setConfiguration,
      });
      if (result === "audit_failed") {
        setFormError("บันทึก User Audit Log ไม่สำเร็จ จึงยังไม่เปลี่ยน Role หรือ Scope");
        return;
      }
      if (result === "storage_failed") {
        setFormError("บันทึกการกำหนดค่าในเครื่องไม่สำเร็จ ข้อมูลหน้าจอจึงยังไม่เปลี่ยน");
        return;
      }
      closeAssignment();
      toast.success(`บันทึกสิทธิ์ของ ${selectedUser.name} แล้ว`, {
        description: "Role และ Scope ใหม่มีผลเมื่อบัญชีเข้าสู่ระบบครั้งถัดไป",
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "ตรวจสอบข้อมูล Role และ Scope ไม่สำเร็จ");
    }
  };

  const retrySensitiveView = () => {
    viewAuditAttempted.current = false;
    setViewAuditStatus("pending");
  };

  if (viewAuditStatus !== "allowed" || !isConfigurationReady) {
    return (
      <>
        <WorkspaceHeader eyebrow="Identity governance" title="บัญชีผู้ใช้" description="ตรวจบัญชีและสถานะสิทธิ์ โดยงานธุรกิจยังดำเนินการใน Workspace ของเจ้าของ Role" />
        {viewAuditStatus === "error" ? (
          <div role="alert" className="rounded-2xl border border-danger-border bg-danger-soft p-4 text-sm text-danger-on-soft">
            <p className="font-medium">บันทึกการเปิดดูข้อมูลบัญชีไม่สำเร็จ จึงยังไม่แสดงข้อมูลส่วนบุคคล</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={retrySensitiveView}>ลองบันทึกอีกครั้ง</Button>
          </div>
        ) : <LoadingState label="กำลังตรวจและบันทึกสิทธิ์การเปิดดูบัญชี" />}
      </>
    );
  }

  return (
    <>
      <WorkspaceHeader eyebrow="Identity governance" title="บัญชีผู้ใช้" description="ตรวจบัญชีและสถานะสิทธิ์ โดยงานธุรกิจยังดำเนินการใน Workspace ของเจ้าของ Role" />
      <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="บัญชีที่ใช้งาน" value={users.length} note="บัญชีที่อยู่ในขอบเขตระบบปัจจุบัน" icon="group" /><MetricCard label="Role ที่กำหนด" value={SYSTEM_ROLES.length} note="ตรงตาม Role เป้าหมายทั้งหมด" icon="badge" emphasis="success" /><MetricCard label="บัญชีระงับ" value="0" note="ไม่มีรายการในข้อมูลชุดนี้" icon="person_off" /></div>
      <Card className="border-border">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="text-lg">บัญชีทั้งหมด</CardTitle><p className="mt-1 text-xs text-muted-foreground">แก้ Assignment ปัจจุบันของแต่ละบัญชี โดยค่าที่บันทึกจะมีผลเมื่อเข้าสู่ระบบครั้งถัดไปและไม่กำหนดนโยบายหลาย Role ต่อบัญชี</p></div>
          <div className="relative w-full sm:max-w-xs"><span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">search</span><Input aria-label="ค้นหาบัญชีผู้ใช้" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ User ID หรือ Role" className="h-11 rounded-xl pl-10 text-sm" /></div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">ผู้ใช้</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Organisation Scope</th><th className="px-4 py-3 font-medium">Resource Scope</th><th className="px-4 py-3 font-medium">สถานะ</th><th className="px-4 py-3 text-right font-medium">จัดการ</th></tr></thead>
              <tbody className="divide-y divide-border">{visibleUsers.map((user) => {
                const assignment = assignmentsByUser.get(user.id);
                const organisation = ORGANISATION_LIST.find((item) => item.id === assignment?.organisationId);
                if (!assignment || !organisation) return null;
                return <tr key={user.id} className="hover:bg-muted/30"><td className="px-4 py-3"><p className="font-medium text-foreground">{user.name}</p><p className="text-xs text-muted-foreground">{user.id}</p></td><td className="px-4 py-3"><Badge variant="secondary">{ROLE_PRESENTATION[assignment.role].label}</Badge></td><td className="px-4 py-3"><ScopeBadge>{organisation.name}</ScopeBadge></td><td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">{assignment.resourceScopes.join(", ")}</td><td className="px-4 py-3"><Badge variant="success">ใช้งาน</Badge></td><td className="px-4 py-3 text-right"><Button type="button" variant="outline" size="sm" aria-label={`กำหนดสิทธิ์ ${user.name}`} onClick={() => openAssignment(user.id)}>กำหนดสิทธิ์</Button></td></tr>;
              })}</tbody>
            </table>
          </div>
          {visibleUsers.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">ไม่พบบัญชีที่ตรงกับคำค้น</p> : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedUserId)} onOpenChange={(open) => { if (!open) closeAssignment(); }}>
        <DialogContent aria-describedby="assignment-dialog-description">
          <DialogHeader><DialogTitle>กำหนด Role และ Scope</DialogTitle><DialogDescription id="assignment-dialog-description">{selectedUser?.name} · การเปลี่ยนแปลงจะบันทึกเหตุผลและข้อมูลก่อน–หลังใน User Audit Log</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><label htmlFor="assignment-role" className="mb-1.5 block text-sm font-medium">Role <span className="text-danger">*</span></label><select id="assignment-role" required value={role} onChange={(event) => { setRole(event.target.value as SystemRole); setFormError(""); }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{SYSTEM_ROLES.map((item) => <option key={item} value={item}>{ROLE_PRESENTATION[item].label}</option>)}</select></div>
            <div><label htmlFor="assignment-organisation" className="mb-1.5 block text-sm font-medium">Organisation Scope <span className="text-danger">*</span></label><select id="assignment-organisation" required value={organisationId} onChange={(event) => { setOrganisationId(event.target.value); setFormError(""); }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{ORGANISATION_LIST.map((item) => <option key={item.id} value={item.id}>{item.kind === "college" ? (getCollegeOption(item.code)?.label ?? item.name) : `${item.name} (${item.code})`}</option>)}</select></div>
            <div><label htmlFor="assignment-resources" className="mb-1.5 block text-sm font-medium">Resource Scope <span className="text-danger">*</span></label><Input id="assignment-resources" required value={resourceScopes} onChange={(event) => { setResourceScopes(event.target.value); setFormError(""); }} placeholder="คั่นหลายรายการด้วยเครื่องหมายจุลภาค" aria-invalid={Boolean(formError) && !resourceScopes.trim()} aria-describedby={formError ? "assignment-resources-help assignment-dialog-error" : "assignment-resources-help"} /><p id="assignment-resources-help" className="mt-1 text-xs text-muted-foreground">เช่น course:offering-bcp-101, course:offering-vpt-301</p></div>
            <div><label htmlFor="assignment-reason" className="mb-1.5 block text-sm font-medium">เหตุผลการเปลี่ยนแปลง <span className="text-danger">*</span></label><Textarea id="assignment-reason" required value={reason} onChange={(event) => { setReason(event.target.value); setFormError(""); }} placeholder="ระบุเหตุผลที่ตรวจสอบย้อนหลังได้" aria-invalid={Boolean(formError) && !reason.trim()} aria-describedby={formError ? "assignment-dialog-error" : undefined} /></div>
            {formError ? <p id="assignment-dialog-error" role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">{formError}</p> : null}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={closeAssignment}>ยกเลิก</Button><Button type="button" onClick={saveAssignment}>บันทึก Assignment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScopesSection() {
  const permissions = [
    ["ผู้เข้ารับการฝึกอบรม", "ข้อมูลของตนเอง", "ดูสถานะ ลงทะเบียน ชำระเงิน ผลแบบผ่าน/ไม่ผ่าน และคำร้อง"],
    ["อาจารย์ประจำวิชา", "สถาบัน + รายวิชาที่มอบหมาย", "พิจารณาลงทะเบียนและจัดการผลแบบผ่าน/ไม่ผ่าน"],
    ["ผู้ดูแลสถาบัน", "สถาบันของตน", "จัด Affiliation, Assignment และติดตามภาพรวม"],
    ["เจ้าหน้าที่ราชวิทยาลัย", "งานส่วนกลาง", "หลักสูตร เอกสาร การเงิน Exception และเตรียมลงนาม"],
    ["ประธาน / ผู้ลงนาม", "องค์กร + ขั้นตอนปัจจุบัน", "ลงนามหรือปฏิเสธตามลำดับ"],
    ["ผู้ดูแลระบบสูงสุด", "System governance", "บัญชี Role Scope Organisation Integration Audit"],
  ] as const;
  return (
    <>
      <WorkspaceHeader eyebrow="Authorization" title="Role และ Scope" description="สิทธิ์ทุก Workspace ประกอบจาก Role + Organisation Scope + Resource Scope" />
      <Card className="border-border"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">ขอบเขตบังคับ</th><th className="px-5 py-3 font-medium">Action ปกติ</th></tr></thead><tbody className="divide-y divide-border">{permissions.map(([role, scope, actions]) => <tr key={role}><td className="px-5 py-4 font-semibold text-foreground">{role}</td><td className="px-5 py-4"><ScopeBadge>{scope}</ScopeBadge></td><td className="px-5 py-4 text-muted-foreground">{actions}</td></tr>)}</tbody></table></div></CardContent></Card>
      <div role="note" className="rounded-2xl border border-warning-border bg-warning-soft p-4 text-sm text-warning-on-soft"><span aria-hidden="true" className="material-symbols-outlined mr-2 align-middle">policy</span>นโยบายหนึ่งบัญชีถือหลาย Role ยังรอข้อสรุป หน้านี้จึงไม่กำหนด Policy เพิ่มเอง</div>
    </>
  );
}

function OrganisationsSection() {
  return (
    <>
      <WorkspaceHeader eyebrow="Organisation governance" title="โครงสร้างองค์กร" description="ลำดับ Scope ใช้กำหนดการมองเห็นข้อมูลและระดับการลงนาม" />
      <Card className="border-border"><CardContent className="p-5 md:p-7"><div className="space-y-3"><div className="rounded-2xl border border-primary/30 bg-primary/5 p-4"><p className="font-semibold text-foreground">{ORGANISATIONS.royalCollege.name}</p><p className="text-xs text-muted-foreground">{ORGANISATIONS.royalCollege.code} · Royal College Scope</p></div><div className="ml-4 border-l-2 border-border pl-4 md:ml-8 md:pl-6"><div className="rounded-2xl border border-border bg-card p-4"><p className="font-semibold text-foreground">{ORGANISATIONS.therapeuticCollege.name}</p><p className="text-xs text-muted-foreground">{ORGANISATIONS.therapeuticCollege.code} · College Scope</p></div><div className="ml-4 mt-3 grid gap-3 border-l-2 border-border pl-4 md:ml-8 md:grid-cols-2 md:pl-6">{[ORGANISATIONS.siriraj, ORGANISATIONS.chula].map((organisation) => <div key={organisation.id} className="rounded-2xl border border-border bg-card p-4"><span aria-hidden="true" className="material-symbols-outlined text-primary">domain</span><p className="mt-2 font-medium text-foreground">{organisation.name}</p><p className="mt-1 text-xs text-muted-foreground">{organisation.code} · Institution Scope</p></div>)}</div></div></div></CardContent></Card>
      <p className="text-xs text-muted-foreground">มีมากกว่าหนึ่งสถาบันเพื่อแยก Organisation Scope อย่างชัดเจน</p>
    </>
  );
}

function IntegrationsSection() {
  const { session } = usePortalSession();
  const { appendEvent } = useAuditLog();
  const [configuration, setConfiguration] = useState(DEFAULT_GOVERNANCE_CONFIGURATION);
  const [isConfigurationReady, setIsConfigurationReady] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    // Browser storage is intentionally read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfiguration(readGovernanceConfiguration());
    setIsConfigurationReady(true);
  }, []);

  const selectedIntegration = integrations.find((item) => item.id === selectedIntegrationId);
  const openConfiguration = (integrationId: string) => {
    const current = configuration.integrations.find((item) => item.integrationId === integrationId);
    if (!current) return;
    setSelectedIntegrationId(integrationId);
    setEnabled(current.enabled);
    setReason("");
    setFormError("");
  };
  const closeConfiguration = () => {
    setSelectedIntegrationId("");
    setFormError("");
  };
  const saveConfiguration = () => {
    const current = configuration.integrations.find((item) => item.integrationId === selectedIntegrationId);
    const normalizedReason = reason.trim();
    if (!current || !selectedIntegration || !session || session.role !== "super_admin") {
      setFormError("ไม่พบข้อมูลผู้ดำเนินการหรือ Integration เป้าหมาย");
      return;
    }
    if (!normalizedReason) {
      setFormError("กรุณาระบุเหตุผลการเปลี่ยนแปลง");
      return;
    }
    if (current.enabled === enabled) {
      setFormError("สถานะ Integration ไม่มีการเปลี่ยนแปลง");
      return;
    }
    try {
      const next = updateIntegrationConfiguration(configuration, current.integrationId, enabled);
      const updated = next.integrations.find((item) => item.integrationId === current.integrationId);
      if (!updated) throw new Error("ไม่พบการกำหนดค่าหลังการเปลี่ยนแปลง");
      const result = commitAuditedGovernanceChange({
        next,
        appendAudit: () => appendEvent({
          actor: createAuditActorSnapshot(session),
          action: "business_record.update",
          resource: {
            type: "integration_configuration",
            id: current.integrationId,
            label: selectedIntegration.name,
            organisationId: session.organisation.id,
          },
          before: current,
          after: updated,
          reason: normalizedReason,
          evidenceReference: "workspace:/admin/integrations",
        }),
        persist: persistGovernanceConfiguration,
        commit: setConfiguration,
      });
      if (result === "audit_failed") {
        setFormError("บันทึก User Audit Log ไม่สำเร็จ จึงยังไม่เปลี่ยนการกำหนดค่า");
        return;
      }
      if (result === "storage_failed") {
        setFormError("บันทึกการกำหนดค่าในเครื่องไม่สำเร็จ ข้อมูลหน้าจอจึงยังไม่เปลี่ยน");
        return;
      }
      closeConfiguration();
      toast.success(`บันทึกการกำหนดค่า ${selectedIntegration.name} แล้ว`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "ตรวจสอบการกำหนดค่าไม่สำเร็จ");
    }
  };

  return (
    <>
      <WorkspaceHeader eyebrow="System configuration" title="การเชื่อมต่อระบบ" description="ตรวจสถานะและการกำหนดค่าของบริการที่เชื่อมกับ Workflow" />
      {!isConfigurationReady ? <LoadingState label="กำลังโหลดการกำหนดค่า Integration" /> : (
        <div className="grid gap-4 md:grid-cols-2">{integrations.map((integration) => {
          const current = configuration.integrations.find((item) => item.integrationId === integration.id);
          const isEnabled = current?.enabled ?? false;
          return <Card key={integration.id} className="border-border"><CardContent className="flex gap-4 p-5"><span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary"><span className="material-symbols-outlined text-2xl leading-none">{integration.icon}</span></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-foreground">{integration.name}</h2><Badge variant={isEnabled ? "success" : "warning"}>{isEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{integration.detail}</p><Button type="button" variant="outline" size="sm" className="mt-4" aria-label={`แก้การกำหนดค่า ${integration.name}`} onClick={() => openConfiguration(integration.id)}>แก้การกำหนดค่า</Button></div></CardContent></Card>;
        })}</div>
      )}
      <div role="note" className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">สถานะในหน้านี้ควบคุมการทำงานของ Workflow หน้าจอ และไม่ใช่การยืนยันว่าบริการภายนอกเชื่อมต่อสำเร็จแล้ว</div>

      <Dialog open={Boolean(selectedIntegrationId)} onOpenChange={(open) => { if (!open) closeConfiguration(); }}>
        <DialogContent aria-describedby="integration-dialog-description">
          <DialogHeader><DialogTitle>กำหนดค่า Integration</DialogTitle><DialogDescription id="integration-dialog-description">{selectedIntegration?.name} · ระบบจะบันทึกสถานะเดิม สถานะใหม่ เหตุผล ผู้ดำเนินการ และเวลา</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><label htmlFor="integration-status" className="mb-1.5 block text-sm font-medium">สถานะ <span className="text-danger">*</span></label><select id="integration-status" required value={enabled ? "enabled" : "disabled"} onChange={(event) => { setEnabled(event.target.value === "enabled"); setFormError(""); }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="enabled">เปิดใช้งาน</option><option value="disabled">ปิดใช้งาน</option></select></div>
            <div><label htmlFor="integration-reason" className="mb-1.5 block text-sm font-medium">เหตุผลการเปลี่ยนแปลง <span className="text-danger">*</span></label><Textarea id="integration-reason" required value={reason} onChange={(event) => { setReason(event.target.value); setFormError(""); }} placeholder="ระบุเหตุผลที่ตรวจสอบย้อนหลังได้" aria-invalid={Boolean(formError) && !reason.trim()} aria-describedby={formError ? "integration-dialog-error" : undefined} /></div>
            {formError ? <p id="integration-dialog-error" role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-on-soft">{formError}</p> : null}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={closeConfiguration}>ยกเลิก</Button><Button type="button" onClick={saveConfiguration}>บันทึกการกำหนดค่า</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BreakGlassSection() {
  const { session } = usePortalSession();
  const { appendEvent } = useAuditLog();
  const [resource, setResource] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!resource.trim() || !reason.trim() || !evidence.trim() || !confirmed) {
      setError("กรุณาระบุทรัพยากร เหตุผล หลักฐานอ้างอิง และยืนยันการใช้งานฉุกเฉิน");
      return;
    }
    if (!session) {
      setError("ไม่พบ Session ผู้ดำเนินการ");
      return;
    }
    const auditEvent = appendEvent({
      actor: createAuditActorSnapshot(session),
      action: "access.break_glass",
      resource: { type: "protected_resource", id: resource.trim(), label: resource.trim() },
      before: { emergencyAccess: false },
      after: { emergencyAccessRequested: true },
      reason: reason.trim(),
      evidenceReference: evidence.trim(),
    });
    if (!auditEvent) {
      setError("บันทึก User Audit Log ไม่สำเร็จ จึงไม่อนุญาตให้ดำเนินการต่อ");
      return;
    }
    setError("");
    toast.warning("บันทึกคำขอ Break-glass แล้ว", { description: "เหตุการณ์ถูกส่งไปยัง Audit Log" });
    setResource(""); setReason(""); setEvidence(""); setConfirmed(false);
  };
  return (
    <>
      <WorkspaceHeader eyebrow="Emergency access" title="Break-glass Access" description="ใช้เฉพาะเหตุจำเป็น บังคับระบุเหตุผลและหลักฐาน และต้องตรวจย้อนหลังได้" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><Card className="border-danger-border"><CardHeader><CardTitle className="flex items-center gap-2 text-lg text-danger"><span aria-hidden="true" className="material-symbols-outlined">emergency</span>ขอใช้งานฉุกเฉิน</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={submit} noValidate>{error ? <div id="break-glass-error" role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger">{error}</div> : null}<div className="space-y-1.5"><label htmlFor="break-resource" className="text-sm font-medium text-foreground">Resource ที่ต้องเข้าถึง</label><Input id="break-resource" value={resource} onChange={(event) => setResource(event.target.value)} aria-invalid={Boolean(error && !resource.trim())} aria-describedby={error ? "break-glass-error" : undefined} placeholder="เช่น registration:REG-2569-004" /></div><div className="space-y-1.5"><label htmlFor="break-reason" className="text-sm font-medium text-foreground">เหตุผล</label><Textarea id="break-reason" value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(error && !reason.trim())} aria-describedby={error ? "break-glass-error" : undefined} placeholder="อธิบายเหตุจำเป็นและขอบเขตที่ต้องดำเนินการ" /></div><div className="space-y-1.5"><label htmlFor="break-evidence" className="text-sm font-medium text-foreground">Evidence Reference</label><Input id="break-evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} aria-invalid={Boolean(error && !evidence.trim())} aria-describedby={error ? "break-glass-error" : undefined} placeholder="เช่น INC-2569-018" /></div><label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" /><span>ยืนยันว่า Action นี้อยู่นอก Normal Flow และยอมรับการบันทึกข้อมูลก่อน–หลังใน Audit Log</span></label><Button type="submit" variant="destructive"><span aria-hidden="true" className="material-symbols-outlined text-lg">lock_open</span>ส่งคำขอ Break-glass</Button></form></CardContent></Card><Card className="h-fit border-border"><CardHeader><CardTitle className="text-base">ข้อบังคับ</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>1. ระบุ Resource เป้าหมายให้เจาะจง</p><p>2. ระบุเหตุผลและ Evidence Reference</p><p>3. ระบบบันทึกผู้ใช้ Role Organisation เวลา และข้อมูลก่อน–หลัง</p><p>4. Break-glass ไม่เปลี่ยนเจ้าของ Normal Workflow</p></CardContent></Card></div>
    </>
  );
}

export default function SuperAdminGovernancePage({ section }: { section: GovernanceSection }) {
  return <PageShell size="full" className="space-y-6">{section === "users" ? <UsersSection /> : section === "scopes" ? <ScopesSection /> : section === "organisations" ? <OrganisationsSection /> : section === "integrations" ? <IntegrationsSection /> : <BreakGlassSection />}</PageShell>;
}
