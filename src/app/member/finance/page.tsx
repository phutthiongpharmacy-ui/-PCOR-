"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getInvoiceBreakdown,
  type RegistrationInvoice,
} from "@/roles/shared/features/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import PaymentDialog, { type PromptPaySubmission } from "@/roles/member/features/finance/components/PaymentDialog";
import { useMockDb } from "@/providers/mock-db-provider";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import {
  resolveStudentInvoiceDisplayStatus,
  selectStudentRegistrationInvoices,
  type StudentInvoiceDisplayStatus,
} from "./payment-flow";

type InvoiceView = RegistrationInvoice & {
  displayStatus: StudentInvoiceDisplayStatus;
  amountDue: number;
  lateFee: number;
};

const statusMeta = {
  locked: { variant: "warning", label: "รอตรวจสอบการลงทะเบียน" },
  awaiting_payment: { variant: "warning", label: "รอชำระเงิน" },
  overdue: { variant: "danger", label: "ค้างชำระ" },
  pending_review: { variant: "info", label: "รอตรวจสอบการชำระเงิน" },
  payment_rejected: { variant: "danger", label: "หลักฐานไม่ผ่านการตรวจสอบ" },
  paid: { variant: "success", label: "ชำระแล้ว" },
  cancelled: { variant: "neutral", label: "ยกเลิก" },
} as const;

const interactiveInvoiceId = "LOCAL-REGISTRATION-FEE";

function formatDueAt(dueAt?: string) {
  if (!dueAt) return "รออนุมัติ";
  return new Date(dueAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FinancePage() {
  const { registrationInvoices, payments } = useMockDb();
  const { session } = usePortalSession();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, PromptPaySubmission>>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const studentId = session?.role === "student" ? session.userId : "";
  const studentInvoices = useMemo(
    () => selectStudentRegistrationInvoices(registrationInvoices, studentId),
    [registrationInvoices, studentId],
  );

  useEffect(() => {
    const currentTime = Date.now();
    const nextDueAt = studentInvoices
      .filter((invoice) => (
        invoice.status === "awaiting_payment" &&
        Boolean(invoice.dueAt)
      ))
      .map((invoice) => new Date(invoice.dueAt!).getTime())
      .filter((dueAt) => !Number.isNaN(dueAt) && dueAt >= currentTime)
      .sort((left, right) => left - right)[0];

    if (nextDueAt === undefined) return;

    // Schedule only the next boundary; long deadlines are re-scheduled in safe chunks.
    const delay = Math.min(nextDueAt - currentTime + 1, 2_147_483_647);
    const timeoutId = window.setTimeout(() => setNowMs(Date.now()), delay);
    return () => window.clearTimeout(timeoutId);
  }, [nowMs, studentInvoices]);

  const invoices = useMemo<InvoiceView[]>(() => {
    const now = new Date(nowMs);
    const sourceInvoices: RegistrationInvoice[] = studentId ? [{
      id: interactiveInvoiceId,
      registrationId: "LOCAL-REGISTRATION",
      studentId,
      description: "ค่าลงทะเบียนรายวิชา",
      baseAmount: 3_000,
      status: "awaiting_payment",
      createdAt: new Date(nowMs).toISOString(),
      updatedAt: new Date(nowMs).toISOString(),
    }, ...studentInvoices] : [];
    return sourceInvoices
      .map((invoice) => {
        const latestPayment = payments.find((payment) => payment.invoiceId === invoice.id);
        const breakdown = getInvoiceBreakdown(invoice, now);
        const displayStatus = resolveStudentInvoiceDisplayStatus(
          invoice,
          submissions[`${studentId}:${invoice.id}`] ? "pending" : latestPayment?.status === "pending" || latestPayment?.status === "rejected"
            ? latestPayment.status
            : null,
          now,
        );
        return {
          ...invoice,
          displayStatus,
          amountDue: breakdown.total,
          lateFee: breakdown.lateFee,
        };
      });
  }, [nowMs, payments, studentInvoices, studentId, submissions]);

  const selectedInvoice = selectedInvoiceId
    ? invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null
    : null;

  const totalFees = invoices
    .filter((invoice) => invoice.displayStatus !== "cancelled")
    .reduce((total, invoice) => total + invoice.baseAmount, 0);
  const outstandingBalance = invoices
    .filter((invoice) => invoice.displayStatus === "awaiting_payment" || invoice.displayStatus === "overdue" || invoice.displayStatus === "payment_rejected")
    .reduce((total, invoice) => total + invoice.amountDue, 0);
  const hasLockedInvoice = invoices.some((invoice) => invoice.displayStatus === "locked");

  const handleSubmitted = (invoiceId: string, submission: PromptPaySubmission) => {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice || !["awaiting_payment", "overdue", "payment_rejected"].includes(invoice.displayStatus)) {
      toast.error("รายการนี้ยังไม่พร้อมชำระเงิน");
      return false;
    }
    setSubmissions((previous) => ({ ...previous, [`${studentId}:${invoiceId}`]: submission }));
    return true;
  };

  return (
    <>
      <PageShell>
        {hasLockedInvoice && (
          <div role="note" className="mb-5 flex items-start gap-3 rounded-xl border border-warning-border bg-warning-soft p-4 text-warning-on-soft">
            <span className="material-symbols-outlined">hourglass_top</span>
            <div>
              <p className="text-sm font-semibold">รอการตรวจสอบก่อนชำระเงิน</p>
              <p className="mt-1 text-xs">อาจารย์ผู้รับผิดชอบต้องอนุมัติคำขอก่อน System Actor จึงจะเปิดยอดและวันครบกำหนดชำระ</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card><CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><span className="material-symbols-outlined text-xl text-primary">account_balance_wallet</span></div>
            <div><h2 className="text-xs font-medium text-muted-foreground mb-0.5">ค่าใช้จ่ายทั้งหมด</h2><div className="text-2xl font-bold">฿{totalFees.toLocaleString()}</div></div>
          </CardContent></Card>
          <Card className="border-danger-border"><CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><span className="material-symbols-outlined text-xl text-destructive">warning</span></div>
            <div><h2 className="text-xs font-medium text-muted-foreground mb-0.5">ยอดรอชำระ/ค้างชำระ</h2><div className="text-2xl font-bold text-destructive">฿{outstandingBalance.toLocaleString()}</div></div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader className="pb-0 pt-4 px-5"><CardTitle className="text-sm">รายการชำระเงิน</CardTitle></CardHeader>
          <CardContent className="p-0 mt-3">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs h-9">รายการ</TableHead>
                <TableHead className="text-xs h-9">ยอดชำระ</TableHead>
                <TableHead className="text-xs h-9">กำหนดชำระ</TableHead>
                <TableHead className="text-xs h-9">สถานะ</TableHead>
                <TableHead className="text-xs h-9">การดำเนินการ</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const status = statusMeta[invoice.displayStatus];
                  const payable = invoice.displayStatus === "awaiting_payment" || invoice.displayStatus === "overdue" || invoice.displayStatus === "payment_rejected";
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-xs py-3">{invoice.description}</TableCell>
                      <TableCell className="text-xs py-3 font-medium">
                        ฿{invoice.amountDue.toLocaleString()}
                        {invoice.lateFee > 0 && <p className="mt-1 text-xs text-danger">รวมค่าปรับ ฿{invoice.lateFee.toLocaleString()}</p>}
                      </TableCell>
                      <TableCell className="text-xs py-3">{invoice.id === interactiveInvoiceId ? "ไม่มีกำหนด" : formatDueAt(invoice.dueAt)}</TableCell>
                      <TableCell className="text-xs py-3"><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell className="text-xs py-3">
                        {payable && <Button size="sm" className="min-h-11 text-xs" onClick={() => setSelectedInvoiceId(invoice.id)}>{invoice.displayStatus === "payment_rejected" ? "ส่งหลักฐานใหม่" : "ชำระเงิน"}</Button>}
                        {invoice.displayStatus === "pending_review" && (submissions[`${studentId}:${invoice.id}`] ? (
                          <Button variant="outline" size="sm" className="min-h-11" onClick={() => setSubmissions((previous) => {
                            const next = { ...previous };
                            delete next[`${studentId}:${invoice.id}`];
                            return next;
                          })}>เริ่มใหม่</Button>
                        ) : <span className="text-muted-foreground">กำลังตรวจสอบ</span>)}
                        {invoice.displayStatus === "paid" && <Button variant="ghost" size="sm" className="min-h-11" onClick={() => toast.info("กำลังจัดเตรียมใบเสร็จ PDF")}>ใบเสร็จ</Button>}
                        {invoice.displayStatus === "locked" && <span className="text-muted-foreground">ยังชำระไม่ได้</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="h-28 text-center text-content-muted">ยังไม่มีใบแจ้งชำระเงิน</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageShell>
      {selectedInvoice && (
        <PaymentDialog
          successDescription="แสดงสถานะรอตรวจสอบในหน้านี้แล้ว ยังไม่มีการส่งข้อมูลให้เจ้าหน้าที่หรือรับชำระเงินจริง กดเสร็จสิ้นแล้วเริ่มใหม่เพื่อทำซ้ำได้"
          item={{
            id: selectedInvoice.id,
            description: selectedInvoice.description,
            amount: selectedInvoice.amountDue,
            baseAmount: selectedInvoice.baseAmount,
            lateFee: selectedInvoice.lateFee,
            dueAt: selectedInvoice.dueAt,
          }}
          onSubmitted={handleSubmitted}
          onOpenChange={(open) => { if (!open) setSelectedInvoiceId(null); }}
        />
      )}
    </>
  );
}
