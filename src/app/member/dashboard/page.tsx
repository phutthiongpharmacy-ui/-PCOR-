"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { colleges, dashboardData } from "@/roles/shared/data";
import { formatCourseCode } from "@/roles/shared/data/college-directory";
import { useMockDb } from "@/providers/mock-db-provider";
import { getRegistrationWindowStatus } from "@/roles/shared/features/registration/registration-window";

export default function DashboardPage() {
  const { settings } = useMockDb();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer); }, []);
  const registration = getRegistrationWindowStatus({
    enabled: settings.registrationOpen,
    opensAt: settings.registrationOpensAt,
    closesAt: settings.registrationClosesAt,
    now,
  });
  const college = colleges["วภท."];

  return (
    <PageShell className="space-y-5">
      <header className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b-2 border-primary bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><h2 className="text-xl font-bold md:text-2xl">ยินดีต้อนรับ {dashboardData.studentName}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{college.fullName} · รหัสสมาชิกนักศึกษา <span className="font-mono">{dashboardData.studentId}</span></p></div>
            <Link href="/member/passport" className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"><span aria-hidden="true" className="material-symbols-outlined text-lg">badge</span>เปิด Pharmacist Profile</Link>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="ข้อมูลการศึกษาโดยสรุป">
        {[{ icon: "credit_score", label: "หน่วยกิตสะสมทั้งหมด", value: `${dashboardData.creditsEarned} / ${dashboardData.creditsTotal}` }, { icon: "school", label: "สถานะการศึกษา", value: dashboardData.trainingStatus }, { icon: "menu_book", label: "รายวิชาที่ลงทะเบียน", value: `${dashboardData.schedule.length} รายวิชา` }].map((item) => <Card key={item.label}><CardContent className="flex items-center gap-3 p-4"><span aria-hidden="true" className="material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{item.icon}</span><div className="min-w-0"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-0.5 break-words text-lg font-bold">{item.value}</p></div></CardContent></Card>)}
      </section>

      <Card className="overflow-hidden"><CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">การลงทะเบียนภาคการศึกษาปัจจุบัน</h2><Badge variant={registration.tone}>{registration.label}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{registration.detail}</p></div><Link href="/member/registration" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">ตรวจสอบการลงทะเบียน<span aria-hidden="true" className="material-symbols-outlined text-base">chevron_right</span></Link></CardContent></Card>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Card><CardHeader><CardTitle className="text-lg">ตารางเรียนที่กำลังจะมาถึง</CardTitle></CardHeader><CardContent className="divide-y p-0">{dashboardData.schedule.map((item) => <div key={item.code} className="grid gap-2 px-5 py-4 sm:grid-cols-[120px_1fr_auto] sm:items-center"><p className="font-medium text-primary">{item.time}</p><div className="min-w-0"><p className="font-medium">{item.course}</p><p className="mt-1 text-xs text-muted-foreground">{formatCourseCode(item.code)}</p></div><p className="text-sm text-muted-foreground">{item.room}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">หน่วยกิตตามหมวด</CardTitle></CardHeader><CardContent className="space-y-3">{dashboardData.creditsBreakdown.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-3"><span className="text-sm">{item.name}</span><strong>{item.value} หน่วยกิต</strong></div>)}</CardContent></Card>
      </div>
    </PageShell>
  );
}
