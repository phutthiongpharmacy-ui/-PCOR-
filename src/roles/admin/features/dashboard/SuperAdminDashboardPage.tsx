import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/roles/shared/components/layout/PageShell";

const metrics = [
  { label: "บัญชีผู้ใช้", value: "6", note: "ครบ 6 Role", icon: "group", tone: "bg-admin-metric-info-soft text-admin-metric-info" },
  { label: "Organisation Scope", value: "5", note: "2 สถาบัน · 2 ระดับผู้ลงนาม", icon: "account_tree", tone: "bg-admin-metric-accent-soft text-admin-metric-accent" },
  { label: "วาระที่มีผล", value: "3", note: "ตรวจช่วงเวลาล่าสุดแล้ว", icon: "badge", tone: "bg-admin-metric-success-soft text-admin-metric-success" },
  { label: "เหตุการณ์ Audit", value: "18", note: "บันทึกแบบเพิ่มอย่างเดียว", icon: "manage_search", tone: "bg-admin-metric-warning-soft text-admin-metric-warning" },
] as const;

const governanceLinks = [
  { href: "/admin/users", label: "จัดการบัญชีผู้ใช้", detail: "สร้างและระงับบัญชีโดยไม่ทำงานธุรกิจแทนผู้ใช้", icon: "manage_accounts" },
  { href: "/admin/scopes", label: "Role และ Scope", detail: "กำหนดขอบเขตองค์กรและทรัพยากร", icon: "shield_person" },
  { href: "/admin/organisations", label: "Organisation Tree", detail: "ตรวจลำดับราชวิทยาลัย วิทยาลัย และสถาบัน", icon: "account_tree" },
  { href: "/admin/audit", label: "ตรวจ Audit Log", detail: "ติดตาม Action สำคัญจากทุก Workspace", icon: "history" },
] as const;

export default function SuperAdminDashboardPage() {
  return (
    <PageShell size="full" className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">Super Admin</Badge>
            <span className="text-xs text-muted-foreground">System Scope</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-admin-content md:text-3xl">ภาพรวมการกำกับระบบ</h1>
          <p className="mt-1 text-sm text-admin-content-muted">ดูแลบัญชี สิทธิ์ โครงสร้างองค์กร การเชื่อมต่อ และ Audit โดยไม่อนุมัติงานธุรกิจตามปกติ</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/audit">
            <span aria-hidden="true" className="material-symbols-outlined text-lg">manage_search</span>
            เปิด Audit Log
          </Link>
        </Button>
      </header>

      <section aria-label="สรุประบบ" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-admin-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-admin-content-muted">{metric.label}</p>
                  <p className="mt-2 text-3xl font-bold text-admin-content">{metric.value}</p>
                </div>
                <span aria-hidden="true" className={`material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-full ${metric.tone}`}>{metric.icon}</span>
              </div>
              <p className="mt-3 text-xs text-admin-content-muted">{metric.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card className="border-admin-border shadow-sm">
          <CardHeader><CardTitle className="text-lg">งานกำกับระบบ</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {governanceLinks.map((item) => (
              <Link key={item.href} href={item.href} className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">{item.icon}</span>
                <h2 className="mt-3 font-semibold text-foreground group-hover:text-primary">{item.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card className="border-admin-border shadow-sm">
          <CardHeader><CardTitle className="text-lg">ขอบเขตความรับผิดชอบ</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="rounded-xl bg-success-soft p-3 text-success-on-soft">บัญชีผู้ใช้ · Role · Organisation · Resource · Settings · Integration · Audit</p>
            <p className="rounded-xl bg-warning-soft p-3 text-warning-on-soft">งานหลักสูตร การสอบ คำร้อง วิจัย ใบรับรอง การเงิน และเตรียมลงนาม อยู่ที่ Royal College Staff</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
