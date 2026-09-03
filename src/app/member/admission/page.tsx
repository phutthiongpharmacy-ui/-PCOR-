"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { profileData } from "@/roles/shared/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PersonalInfoCard } from "@/roles/shared/member/components/PersonalInfoCard";
import { AddressCard } from "@/roles/shared/member/components/AddressCard";
import { WorkplaceCard } from "@/roles/shared/member/components/WorkplaceCard";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { useMockDb, type Payment } from "@/providers/mock-db-provider";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FileUploadField } from "@/roles/shared/components/forms/FileUploadField";
import {
  createAdmissionDocuments,
  getAdmissionDocumentProgress,
  type AdmissionDocument,
} from "@/roles/shared/features/admissions/documents";
import {
  findLicenseRegistryRecord,
  getLicenseEligibility,
  LicenseEligibilityNotice,
} from "@/roles/shared/features/license-eligibility";
import { currentMemberPassport } from "@/roles/shared/member/domain/member";
import type { PaymentMethod } from "@/roles/shared/features/finance";
import { ORGANISATIONS } from "@/roles/shared/features/roles/access-model";

// ─── Data ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "เลือกสาขาที่สอบ" },
  { id: 2, title: "ตรวจสอบคุณสมบัติ" },
  { id: 3, title: "ยืนยันการสมัคร" },
];

const stepProgressWidthClass: Record<number, string> = {
  1: "w-0",
  2: "w-1/2",
  3: "w-full",
};

const colleges = [
  {
    id: "วิทยาลัยเภสัชบำบัด",
    name: "วิทยาลัยเภสัชบำบัด",
    abbr: "วภท.",
    icon: "local_hospital",
    examDesc: "สอบประเมินความรู้ Board Certified Pharmacotherapy (BCP): สอบข้อเขียน, ปากเปล่าข้างเตียง, โครงร่างวิทยานิพนธ์",
    credential: "วุฒิบัตรฯ สาขาเภสัชบำบัด",
  },
  {
    id: "วิทยาลัยการคุ้มครองผู้บริโภค",
    name: "วิทยาลัยการคุ้มครองผู้บริโภคด้านยาฯ",
    abbr: "วคบท.",
    icon: "shield",
    examDesc: "สอบหนังสืออนุมัติฯ สาขาการคุ้มครองผู้บริโภคด้านยาและสุขภาพ",
    credential: "หนังสืออนุมัติฯ สาขาการคุ้มครองผู้บริโภคฯ",
  },
  {
    id: "วิทยาลัยเภสัชกรรมชุมชน",
    name: "วิทยาลัยเภสัชกรรมชุมชน",
    abbr: "วภช.",
    icon: "storefront",
    examDesc: "สอบหนังสืออนุมัติฯ สาขาเภสัชกรรมชุมชน (ประเมินตามเกณฑ์ ต้องมีประสบการณ์ ≥ 10 ปี)",
    credential: "หนังสืออนุมัติฯ สาขาเภสัชกรรมชุมชน",
  },
  {
    id: "วิทยาลัยการบริหารเภสัชกิจ",
    name: "วิทยาลัยการบริหารเภสัชกิจ",
    abbr: "CPAT",
    icon: "business_center",
    examDesc: "สอบวุฒิบัตรฯ สาขาการบริหารเภสัชกิจ (ประเมินให้ผ่านครบ 12 ด้าน)",
    credential: "วุฒิบัตรฯ สาขาการบริหารเภสัชกิจ",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExamApplicationPage() {
  const router = useRouter();
  const {
    settings,
    admissions,
    payments,
    setAdmissions,
    updateAdmissionDocuments,
    addPayment,
  } = useMockDb();

  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCollege, setSelectedCollege] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionKind, setCompletionKind] = useState<"application" | "documents" | null>(null);
  const [payingApp, setPayingApp] = useState<typeof admissions[0] | null>(null);
  const [documents, setDocuments] = useState<AdmissionDocument[]>(createAdmissionDocuments);
  const [editingAdmissionId, setEditingAdmissionId] = useState<string>();
  const licenseRegistryRecord = findLicenseRegistryRecord(currentMemberPassport.license.licenseNumber);
  const licenseStatus = licenseRegistryRecord?.status ?? "unverified";
  const licenseEligibility = getLicenseEligibility(licenseStatus);

  // Payment dialog state
  const [payRef, setPayRef] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payFile, setPayFile] = useState<File | null>(null);
  const [payError, setPayError] = useState("");
  const [payDone, setPayDone] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("promptpay");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const payFileRef = useRef<HTMLInputElement>(null);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
  }, []);

  const openPayment = (app: typeof admissions[0]) => {
    setPayingApp(app);
    setPayRef(`EXM-${app.id}`);
    setPayAmount("2500");
    setPayFile(null);
    setPayError("");
    setPayDone(false);
    setPayMethod("promptpay");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
  };

  const handlePayFile = (f?: File) => {
    setPayError("");
    if (!f) { setPayFile(null); return; }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(f.type)) { setPayError("รองรับเฉพาะ JPG, PNG, PDF"); return; }
    if (f.size > 5 * 1024 * 1024) { setPayError("ไฟล์ไม่เกิน 5MB"); return; }
    setPayFile(f);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payRef.trim()) { setPayError("กรุณากรอกเลขที่อ้างอิง"); return; }
    if (!payAmount || Number(payAmount) <= 0) { setPayError("กรุณาระบุจำนวนเงิน"); return; }
    if (payMethod === "promptpay" && !payFile) {
      setPayError("กรุณาแนบหลักฐานการชำระเงิน");
      return;
    }
    if (payMethod !== "promptpay") {
      const normalizedNumber = cardNumber.replace(/\s/g, "");
      if (!cardName.trim()) { setPayError("กรุณาระบุชื่อบนบัตร"); return; }
      if (!/^\d{16}$/.test(normalizedNumber)) { setPayError("กรุณาระบุหมายเลขบัตร 16 หลัก"); return; }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) { setPayError("กรุณาระบุวันหมดอายุรูปแบบ MM/YY"); return; }
      if (!/^\d{3,4}$/.test(cardCvv)) { setPayError("กรุณาระบุรหัสความปลอดภัย 3 หรือ 4 หลัก"); return; }
    }
    if (!payingApp) return;
    const invoiceId = `admission-${payingApp.id}`;
    if (payments.some((payment) => payment.invoiceId === invoiceId && payment.status !== "rejected")) {
      setPayError("รายการนี้ถูกส่งชำระแล้ว กรุณารอเจ้าหน้าที่ตรวจสอบ");
      return;
    }
    const submittedAt = new Date().toISOString();
    const payment: Payment = {
      id: `PAY-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      invoiceId,
      studentId: currentMemberPassport.memberId,
      name: payingApp.name,
      program: payingApp.program,
      amount: 2500,
      date: new Date(submittedAt).toLocaleDateString("th-TH"),
      status: payMethod === "promptpay" ? "pending" : "approved",
      type: "ค่าสมัครสอบ",
      method: payMethod,
      referenceNo: payMethod === "promptpay" ? payRef : `${payMethod === "credit_card" ? "CARD" : "DEBIT"}-${Date.now()}`,
      submittedAt,
    };
    addPayment(payment);
    setCardNumber("");
    setCardCvv("");
    toast.success(payMethod === "promptpay" ? "ส่งรายการชำระเงินเรียบร้อย" : "ชำระเงินเรียบร้อย", {
      description: payMethod === "promptpay" ? "เจ้าหน้าที่จะตรวจสอบภายใน 1-2 วันทำการ" : "ระบบบันทึกผลการชำระเงินแล้ว",
    });
    setPayDone(true);
  };

  const handleNext = () => {
    if (!licenseEligibility.canApplyForExam) {
      toast.error("ไม่สามารถดำเนินการสมัครสอบได้", {
        description: licenseEligibility.description,
      });
      return;
    }
    if (currentStep === 3) submitApplication();
    else setCurrentStep((p) => Math.min(p + 1, 3));
  };

  const handlePrev = () => {
    if (editingAdmissionId && currentStep === 2) return;
    setCurrentStep((previous) => Math.max(previous - 1, 1));
  };

  const documentProgress = getAdmissionDocumentProgress(documents);
  const memberAdmissions = admissions.filter((application) => (
    application.license === profileData.personalInfo.licenseNumber
  ));

  const updateDocumentFile = (id: string, file?: AdmissionDocument["file"]) => {
    setDocuments((previous) => previous.map((document) => (
      document.id === id
        ? {
            ...document,
            file,
            reviewStatus: file ? "pending" : document.required ? "pending" : "not_applicable",
            reviewerNote: undefined,
          }
        : document
    )));
  };

  const continueDocuments = (application: typeof admissions[number]) => {
    setDocuments(application.documents);
    setEditingAdmissionId(application.id);
    setSelectedCollege(colleges.find((college) => (
      application.program.includes(college.id.replace("วิทยาลัย", "")) ||
      college.name.includes(application.program) ||
      college.credential.includes(application.program)
    ))?.id ?? colleges[0].id);
    setCurrentStep(2);
    setStarted(true);
  };

  const submitApplication = () => {
    if (!licenseEligibility.canApplyForExam) {
      toast.error("ไม่สามารถส่งใบสมัครสอบได้", {
        description: licenseEligibility.description,
      });
      return;
    }
    setIsSubmitting(true);
    submitTimerRef.current = setTimeout(() => {
      submitTimerRef.current = null;
      setIsSubmitting(false);
      const hasDocumentsToReview = documents.some((document) => (
        Boolean(document.file) || document.reviewStatus === "missing"
      ));
      const documentStatus = hasDocumentsToReview ? "pending" : "complete";

      if (editingAdmissionId) {
        updateAdmissionDocuments(
          editingAdmissionId,
          documents,
          documentStatus,
        );
        toast.success("ส่งเอกสารเพิ่มเติมเรียบร้อยแล้ว", {
          description: "เจ้าหน้าที่จะตรวจสอบเอกสารอีกครั้ง",
        });
        setEditingAdmissionId(undefined);
        setCompletionKind("documents");
        return;
      }

      const submittedAt = new Date();
      const newId = `EXM-2569-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
      setAdmissions((prev) => [
        {
          id: newId,
          name: `${profileData.personalInfo.title}${profileData.personalInfo.firstName} ${profileData.personalInfo.lastName}`,
          license: profileData.personalInfo.licenseNumber || "รอตรวจสอบ",
          program: selectedCollege || "ไม่ระบุ",
          date: submittedAt.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }),
          submittedAt: submittedAt.toISOString(),
          institutionId: ORGANISATIONS.siriraj.id,
          applicationType: "exam",
          status: "pending",
          documents,
          documentStatus,
          licenseStatus,
          licenseCheckedAt: licenseRegistryRecord?.checkedAt ?? new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success("ส่งใบสมัครสอบเรียบร้อยแล้ว", {
        description: "ระบบได้รับข้อมูลของคุณแล้ว กรุณารอการตรวจสอบจากเจ้าหน้าที่",
      });
      setCompletionKind("application");
    }, 1500);
  };

  const resetToLanding = () => {
    setStarted(false);
    setCurrentStep(1);
    setSelectedCollege("");
    setDocuments(createAdmissionDocuments());
    setEditingAdmissionId(undefined);
  };

  // ── Closed ──────────────────────────────────────────────────────────────────
  if (!settings.admissionOpen) {
    return (
      <PageShell className="min-h-[70vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl text-muted-foreground">event_busy</span>
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">ปิดรับสมัครสอบ</h2>
        <p className="text-muted-foreground max-w-md">
          ขณะนี้อยู่นอกช่วงเวลาการเปิดรับสมัครสอบ<br />
          กรุณาติดตามประกาศเปิดรับสมัครรอบถัดไปทางหน้าเว็บไซต์
        </p>
        <Button className="mt-6" onClick={() => window.history.back()}>กลับไปหน้าก่อนหน้า</Button>
      </PageShell>
    );
  }

  // ── Complete ─────────────────────────────────────────────────────────────────
  if (completionKind) {
    const isDocumentResubmission = completionKind === "documents";
    const returnToAdmission = () => {
      setCompletionKind(null);
      resetToLanding();
      router.replace("/member/admission");
    };

    return (
        <PageShell size="content" className="flex min-h-[70vh] flex-col items-center justify-center text-center duration-500 animate-in fade-in zoom-in-95">
          <div className="w-24 h-24 bg-success-soft rounded-full flex items-center justify-center mb-6 shadow-sm">
            <span className="material-symbols-outlined text-success text-5xl">check_circle</span>
        </div>
        <h2 className="text-3xl font-bold mb-2">
          {isDocumentResubmission ? "ส่งเอกสารเพิ่มเติมสำเร็จแล้ว!" : "ส่งใบสมัครสอบสำเร็จแล้ว!"}
        </h2>
        <p className="text-muted-foreground max-w-md mb-8">
          {isDocumentResubmission
            ? "ระบบได้รับเอกสารเพิ่มเติมของคุณแล้ว เจ้าหน้าที่จะตรวจสอบอีกครั้ง"
            : "ระบบได้รับข้อมูลการสมัครสอบของคุณเรียบร้อยแล้ว"}
          <br />
          คุณสามารถติดตามสถานะได้ที่หน้าสมัครสอบ
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={returnToAdmission}>กลับหน้าสมัครสอบ</Button>
          <Button onClick={returnToAdmission}>ดูสถานะการสมัคร</Button>
        </div>
      </PageShell>
    );
  }

  // ── Landing: สถานะการสมัคร + ปุ่มเริ่มสมัครสอบ ───────────────────────────────
  if (!started) {
    return (
      <>
        <PageShell size="form" className="duration-500 animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">info</span>
                ระบบจะดึงข้อมูลจาก Pharmacist Profile มาใช้โดยอัตโนมัติ
              </p>
              <Button
                className="gap-1.5 shrink-0"
                onClick={() => setStarted(true)}
                disabled={!licenseEligibility.canApplyForExam}
              >
                <span className="material-symbols-outlined text-lg">edit_document</span>
                เริ่มสมัครสอบ
              </Button>
            </div>
            <div className="border-t border-border px-6 py-4">
              <LicenseEligibilityNotice
                status={licenseStatus}
                licenseNumber={currentMemberPassport.license.licenseNumber}
                checkedAt={licenseRegistryRecord?.checkedAt}
                compact
              />
            </div>
          </div>

          {/* ── สถานะการสมัคร ───────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-primary">receipt_long</span>
                สถานะการสมัครสอบ
              </h2>
              <span className="text-xs text-muted-foreground">{memberAdmissions.length} รายการ</span>
            </div>

            {memberAdmissions.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl py-10 text-center text-muted-foreground">
                <span className="material-symbols-outlined text-3xl mb-2 block">inbox</span>
                <p className="text-sm">ยังไม่มีประวัติการสมัครสอบ</p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden bg-card divide-y divide-border">
                <div className="hidden md:grid grid-cols-[1fr_1.5fr_100px_auto] gap-4 px-5 py-2.5 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>เลขที่คำร้อง</span>
                  <span>วิทยาลัย/สาขาที่สอบ</span>
                  <span>วันที่ยื่น</span>
                  <span className="text-right">สถานะ</span>
                </div>
                {memberAdmissions.map((app) => {
                  const statusMap: Record<string, { label: string; variant: "warning" | "success" | "danger" | "info"; icon: string }> = {
                    pending: { label: "รอดำเนินการ", variant: "warning", icon: "pending" },
                    approved: { label: "อนุมัติให้สอบ", variant: "success", icon: "check_circle" },
                    rejected: { label: "ไม่ผ่านการพิจารณา", variant: "danger", icon: "cancel" },
                    reviewing: { label: "กำลังตรวจสอบ", variant: "info", icon: "manage_search" },
                  };
                  const s = statusMap[app.status] ?? statusMap.pending;
                  const documentStatusMap = {
                    pending: { label: "มีเอกสารรอตรวจ", variant: "info" as const },
                    complete: { label: "ตรวจเอกสารแล้ว", variant: "success" as const },
                    incomplete: { label: "มีข้อเสนอแนะเรื่องเอกสาร", variant: "warning" as const },
                  };
                  const documentStatus = documentStatusMap[app.documentStatus];
                  const isApproved = app.status === "approved";
                  return (
                    <div key={app.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_100px_auto] gap-2 md:gap-4 px-5 py-4 hover:bg-muted/20 transition-colors items-center">
                      <div><span className="font-mono text-xs text-primary font-semibold">{app.id}</span></div>
                      <div>
                        <p className="text-sm font-medium leading-snug">{app.program}</p>
                        <p className="text-xs text-muted-foreground">{app.name}</p>
                        {app.documentNote && <p className="mt-1 text-xs text-danger">{app.documentNote}</p>}
                      </div>
                      <div className="flex items-center"><span className="text-xs text-muted-foreground">{app.date}</span></div>
                      <div className="flex md:justify-end items-center gap-2 flex-wrap">
                        <Badge variant={s.variant} className="h-auto px-2 py-1 text-2xs">
                          <span className="material-symbols-outlined text-caption">{s.icon}</span>
                          {s.label}
                        </Badge>
                        <Badge variant={documentStatus.variant} className="h-auto px-2 py-1 text-2xs">
                          {documentStatus.label}
                        </Badge>
                        {app.status === "pending" && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => continueDocuments(app)}>
                            จัดการเอกสาร
                          </Button>
                        )}
                        {isApproved && (
                          <Button
                            size="sm"
                            className="h-7 gap-1 bg-success px-3 text-xs text-success-foreground shadow-none hover:bg-success/90"
                            onClick={() => openPayment(app)}
                          >
                            <span className="material-symbols-outlined text-sm">payments</span>
                            ชำระค่าสมัครสอบ
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Payment Dialog ────────────────────────────────────────────── */}
          {payingApp && (
            <Dialog open onOpenChange={(o) => { if (!o) setPayingApp(null); }}>
              <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-5xl">
                {payDone ? (
                  <div className="flex min-h-[380px] flex-col items-center justify-center text-center px-6 py-12">
                    <div className="w-16 h-16 bg-success-soft rounded-full flex items-center justify-center mb-5">
                      <span className="material-symbols-outlined text-success text-4xl">check_circle</span>
                    </div>
                    <DialogTitle className="text-xl mb-2">{payMethod === "promptpay" ? "ส่งหลักฐานการชำระเงินแล้ว" : "ชำระเงินเรียบร้อยแล้ว"}</DialogTitle>
                    <DialogDescription className="max-w-sm">
                      {payMethod === "promptpay"
                        ? "เจ้าหน้าที่จะตรวจสอบหลักฐานและยืนยันสิทธิ์การสอบภายใน 1-2 วันทำการ"
                        : "ระบบบันทึกผลการชำระเงินและยืนยันรายการเรียบร้อยแล้ว"}
                    </DialogDescription>
                    <Button className="mt-6 min-w-32" onClick={() => setPayingApp(null)}>ปิด</Button>
                  </div>
                ) : (
                  <>
                    <DialogHeader className="border-b border-border px-6 py-5 pr-16">
                      <DialogTitle className="text-lg">รายละเอียดการสมัครสอบและชำระเงิน</DialogTitle>
                      <DialogDescription className="text-sm">
                        {payingApp.program} · เลขที่คำร้อง {payingApp.id}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                      {/* Left — Exam Details */}
                      <div className="lg:col-span-7 border-r border-border p-6 space-y-5">
                        <div>
                          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-border">ข้อมูลการสมัครสอบ</h3>
                          <div className="space-y-2.5 text-sm">
                            {[
                              { label: "วิทยาลัย/สาขาที่สอบ", value: payingApp.program },
                              { label: "ผู้สมัครสอบ", value: payingApp.name },
                              { label: "เลขที่ใบประกอบวิชาชีพ", value: profileData.personalInfo.licenseNumber || "รอตรวจสอบ" },
                              { label: "รอบการสอบ", value: "ครั้งที่ 2/2569" },
                              { label: "วันสอบ (โดยประมาณ)", value: "15 กันยายน 2569" },
                              { label: "สถานที่สอบ", value: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย" },
                              { label: "รหัสอ้างอิง", value: payingApp.id },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex gap-3">
                                <span className="text-muted-foreground w-44 flex-shrink-0">{label}</span>
                                <span className="font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-border">รายการค่าธรรมเนียม</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ค่าสมัครสอบหนังสืออนุมัติ/วุฒิบัตร</span>
                              <span>2,500 บาท</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2 border-t border-border">
                              <span>รวมทั้งสิ้น</span>
                              <span className="text-primary text-base">2,500 บาท</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="mb-3 border-b border-border pb-2 text-sm font-semibold">ช่องทางการชำระเงิน</h3>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <button
                              type="button"
                              aria-pressed={payMethod === "promptpay"}
                              onClick={() => { setPayMethod("promptpay"); setPayError(""); }}
                              className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                payMethod === "promptpay"
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-card hover:bg-muted/30"
                              }`}
                            >
                              <span className="material-symbols-outlined text-2xl text-primary" aria-hidden="true">qr_code_2</span>
                              <span className="mt-2 block text-sm font-semibold">พร้อมเพย์</span>
                              <span className="mt-1 block text-xs text-muted-foreground">สแกน QR และแนบหลักฐาน</span>
                            </button>
                            <button
                              type="button"
                              aria-pressed={payMethod === "credit_card"}
                              onClick={() => { setPayMethod("credit_card"); setPayError(""); }}
                              className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                payMethod === "credit_card"
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-card hover:bg-muted/30"
                              }`}
                            >
                              <span className="material-symbols-outlined text-2xl text-primary" aria-hidden="true">credit_card</span>
                              <span className="mt-2 block text-sm font-semibold">บัตรเครดิต</span>
                              <span className="mt-1 block text-xs text-muted-foreground">ยืนยันรายการผ่านหน้าบัตร</span>
                            </button>
                            <button
                              type="button"
                              aria-pressed={payMethod === "debit_card"}
                              onClick={() => { setPayMethod("debit_card"); setPayError(""); }}
                              className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                payMethod === "debit_card"
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-card hover:bg-muted/30"
                              }`}
                            >
                              <span className="material-symbols-outlined text-2xl text-primary" aria-hidden="true">credit_card</span>
                              <span className="mt-2 block text-sm font-semibold">บัตรเดบิต</span>
                              <span className="mt-1 block text-xs text-muted-foreground">ยืนยันรายการผ่านหน้าบัตร</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right — Upload slip */}
                      <form className="lg:col-span-5 p-6 space-y-4" onSubmit={handlePaySubmit}>
                        <h3 className="border-b border-border pb-2 text-sm font-semibold">
                          {payMethod === "promptpay" ? "ชำระด้วยพร้อมเพย์" : payMethod === "credit_card" ? "ชำระด้วยบัตรเครดิต" : "ชำระด้วยบัตรเดบิต"}
                        </h3>

                        <div className="space-y-1.5">
                          <label htmlFor="admission-payment-reference" className="text-xs font-medium">เลขที่อ้างอิง / Reference No.</label>
                          <Input id="admission-payment-reference" value={payRef} readOnly aria-readonly="true" />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="admission-payment-amount" className="text-xs font-medium">จำนวนเงินที่ชำระ</label>
                          <div className="relative">
                            <Input id="admission-payment-amount" type="number" className="pr-12" value={payAmount} readOnly aria-readonly="true" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">บาท</span>
                          </div>
                        </div>

                        {payMethod === "promptpay" ? (
                          <>
                            <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                              <span className="material-symbols-outlined text-5xl text-primary" aria-hidden="true">qr_code_2</span>
                              <p className="mt-2 text-xs text-muted-foreground">สแกน QR เพื่อชำระ 2,500 บาท</p>
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-xs font-medium">หลักฐานการชำระเงิน</span>
                              <input ref={payFileRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => handlePayFile(e.target.files?.[0])} />
                              <button
                                type="button"
                                onClick={() => payFileRef.current?.click()}
                                className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <span className={`material-symbols-outlined mb-1 text-4xl ${payFile ? "text-primary" : "text-muted-foreground"}`}>
                                  {payFile ? "check_circle" : "cloud_upload"}
                                </span>
                                <span className="break-all text-xs font-medium">{payFile ? payFile.name : "คลิกเพื่อเลือกไฟล์"}</span>
                                <span className="mt-1 text-xs text-muted-foreground">JPG, PNG หรือ PDF · ไม่เกิน 5MB</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label htmlFor="admission-card-name" className="text-xs font-medium">ชื่อบนบัตร</label>
                              <Input id="admission-card-name" value={cardName} onChange={(event) => setCardName(event.target.value)} autoComplete="cc-name" />
                            </div>
                            <div className="space-y-1.5">
                              <label htmlFor="admission-card-number" className="text-xs font-medium">หมายเลขบัตร</label>
                              <Input
                                id="admission-card-number"
                                inputMode="numeric"
                                autoComplete="cc-number"
                                maxLength={19}
                                value={cardNumber}
                                onChange={(event) => setCardNumber(event.target.value.replace(/[^\d ]/g, ""))}
                                placeholder="0000 0000 0000 0000"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label htmlFor="admission-card-expiry" className="text-xs font-medium">วันหมดอายุ</label>
                                <Input id="admission-card-expiry" value={cardExpiry} onChange={(event) => setCardExpiry(event.target.value)} autoComplete="cc-exp" placeholder="MM/YY" maxLength={5} />
                              </div>
                              <div className="space-y-1.5">
                                <label htmlFor="admission-card-cvv" className="text-xs font-medium">รหัสความปลอดภัย</label>
                                <Input id="admission-card-cvv" value={cardCvv} onChange={(event) => setCardCvv(event.target.value.replace(/\D/g, ""))} autoComplete="cc-csc" inputMode="numeric" type="password" maxLength={4} />
                              </div>
                            </div>
                            <p className="rounded-lg border border-info-border bg-info-soft px-3 py-2 text-xs text-info-on-soft">
                              ข้อมูลบัตรใช้ยืนยันรายการนี้เท่านั้น และจะไม่ถูกบันทึกในระบบ
                            </p>
                          </div>
                        )}

                        {payError && (
                          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{payError}</p>
                        )}

                        <Button type="submit" className="w-full gap-2">
                          <span className="material-symbols-outlined text-lg">send</span>
                          ยืนยันการชำระเงิน
                        </Button>
                      </form>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          )}
        </PageShell>
      </>
    );
  }

  // ── Multi-step Flow (สมัครสอบ) ───────────────────────────────────────────────
  const selectedCollegeObj = colleges.find((c) => c.id === selectedCollege);

  return (
    <>
      <PageShell size="content" className="space-y-6 duration-500 animate-in fade-in slide-in-from-bottom-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={resetToLanding}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span> กลับหน้าสถานะ
          </button>
          <span className="text-muted-foreground/30">|</span>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <span className="material-symbols-outlined text-base">quiz</span>
            สมัครสอบหนังสืออนุมัติ / วุฒิบัตร
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between relative px-4 md:px-10 mb-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full" />
          <div
            className={cn(
              "absolute left-0 top-1/2 -z-10 h-1 -translate-y-1/2 rounded-full bg-primary transition-all duration-500 ease-in-out",
              stepProgressWidthClass[currentStep]
            )}
          />
          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div
                  className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm
                    ${isActive ? "bg-primary text-primary-foreground scale-110 ring-4 ring-primary/20" :
                      isCompleted ? "bg-primary text-primary-foreground" :
                      "bg-card border-2 border-muted text-muted-foreground"}`}
                >
                  {isCompleted ? <span className="material-symbols-outlined text-lg">check</span> : step.id}
                </div>
                <span className={`text-3xs md:text-xs font-medium absolute top-12 whitespace-nowrap ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="mt-12">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: เลือกสาขาที่สอบ ────────────────────────────────────── */}
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                <div className="mb-5">
                  <h2 className="text-lg font-bold mb-1">เลือกวิทยาลัยและสาขาที่ต้องการสมัครสอบ</h2>
                  <p className="text-sm text-muted-foreground">กรุณาเลือก 1 สาขา</p>
                </div>

                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
                  {colleges.map((college) => {
                    const isSelected = selectedCollege === college.id;
                    return (
                      <button
                        key={college.id}
                        onClick={() => setSelectedCollege(college.id)}
                        className={`w-full text-left flex items-center gap-5 px-5 py-5 transition-colors duration-150
                          ${isSelected ? "bg-primary/5 font-medium" : "hover:bg-muted/40"}`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? "border-primary bg-primary" : "border-border"}`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-content-inverse" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="font-semibold text-15 text-foreground">{college.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">({college.abbr})</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{college.examDesc}</p>
                        </div>
                        <div className="hidden md:flex flex-col items-end gap-1 flex-shrink-0 text-right">
                          <span className="material-symbols-outlined text-primary/60">{college.icon}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: ตรวจสอบคุณสมบัติ ───────────────────────────────────── */}
            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5">auto_awesome</span>
                  <div>
                    <h4 className="font-semibold text-primary text-sm">ดึงข้อมูลจาก Pharmacist Profile สำเร็จ</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      ระบบดึงประวัติของคุณมาใช้ประกอบการสมัครสอบแล้ว กรุณาตรวจสอบความถูกต้องก่อนไปขั้นตอนถัดไป
                    </p>
                  </div>
                </div>
                <LicenseEligibilityNotice
                  status={licenseStatus}
                  licenseNumber={currentMemberPassport.license.licenseNumber}
                  checkedAt={licenseRegistryRecord?.checkedAt}
                />
                <PersonalInfoCard data={profileData.personalInfo} isReadOnly={true} />
                <AddressCard title="ที่อยู่ตามบัตรประชาชน" icon="home" data={profileData.personalInfo} isReadOnly={true} showContactInfo={false} />
                <AddressCard title="ที่อยู่ปัจจุบัน/ที่ติดต่อได้" icon="contact_mail" data={profileData.personalInfo} isReadOnly={true} showContactInfo={true} />
                <WorkplaceCard data={profileData.workHistory} isReadOnly={true} />

                <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="admission-documents-heading">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 id="admission-documents-heading" className="text-base font-semibold">เอกสารประกอบการสมัคร</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        เอกสารทุกประเภทเป็นทางเลือก สามารถส่งคำร้องได้ทันทีและกลับมาแนบเพิ่มเติมภายหลัง
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit shrink-0">
                      แนบแล้ว {documentProgress.attached}/{documentProgress.total} รายการ
                    </Badge>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {documents.map((document) => (
                      <div key={document.id} className="rounded-lg border border-border bg-muted/20 p-3">
                        <FileUploadField
                          compact
                          label={document.label}
                          description={document.hint ?? "เอกสารแนบทางเลือก"}
                          required={false}
                          value={document.file}
                          onChange={(file) => updateDocumentFile(document.id, file)}
                        />
                        {document.reviewerNote && (
                          <p className="mt-2 rounded-md bg-danger-soft px-2.5 py-2 text-xs text-danger-on-soft">
                            เจ้าหน้าที่: {document.reviewerNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                </section>
              </motion.div>
            )}

            {/* ── STEP 3: ยืนยัน ───────────────────────────────────────────────── */}
            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                <Card className="border-t-4 border-t-primary">
                  <CardHeader className="text-center pb-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-primary text-3xl">task_alt</span>
                    </div>
                    <CardTitle className="text-xl">สรุปการสมัครสอบ</CardTitle>
                    <CardDescription>กรุณาตรวจสอบข้อมูลทั้งหมดอีกครั้งก่อนกดส่งคำร้อง</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-4">
                    <div className="bg-muted/30 p-5 rounded-xl border space-y-0 divide-y divide-border">
                      <div className="flex justify-between items-center py-3">
                        <span className="text-sm text-muted-foreground">ประเภทคำร้อง</span>
                        <Badge className="text-sm px-3 py-1 border-0 bg-primary/10 text-primary">
                          <span className="material-symbols-outlined text-sm mr-1">quiz</span>
                          สมัครสอบ
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-sm text-muted-foreground">วิทยาลัย/สาขาที่สอบ</span>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{selectedCollegeObj?.name}</div>
                          <div className="text-xs text-muted-foreground">{selectedCollegeObj?.credential}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-sm text-muted-foreground">ผู้สมัครสอบ</span>
                        <span className="text-sm font-semibold">
                          {profileData.personalInfo.title}{profileData.personalInfo.firstName} {profileData.personalInfo.lastName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-sm text-muted-foreground">เลขที่ใบประกอบวิชาชีพ</span>
                        <span className="text-sm font-semibold font-mono">{profileData.personalInfo.licenseNumber}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 py-3">
                        <span className="text-sm text-muted-foreground">เอกสารประกอบ</span>
                        <div className="text-right">
                          <Badge variant="outline">
                            {documentProgress.attached > 0
                              ? `แนบแล้ว ${documentProgress.attached}/${documentProgress.total} รายการ`
                              : "ยังไม่ได้แนบเอกสาร"}
                          </Badge>
                          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            การแนบเอกสารเป็นทางเลือกและไม่ขัดขวางการส่งคำร้อง
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-start gap-2.5 p-4 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                      <span className="material-symbols-outlined text-base mt-0.5 flex-shrink-0">info</span>
                      <p>
                        เมื่อกดส่งคำร้อง ระบบจะบันทึกข้อมูลการสมัครสอบและแจ้งไปยังเจ้าหน้าที่เพื่อพิจารณาคุณสมบัติ
                        เจ้าหน้าที่จะติดต่อกลับผ่านอีเมลที่ลงทะเบียนไว้
                      </p>
                    </div>

                    <div className="mt-5 flex justify-center">
                      <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={() => window.open("/print/admission", "_blank")}>
                        <span className="material-symbols-outlined text-lg">print</span>
                        พิมพ์ใบสมัครสอบ (PDF)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 mt-4 border-t">
          <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1 || Boolean(editingAdmissionId && currentStep === 2)} className="w-24 gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span> กลับ
          </Button>
          <Button
            onClick={handleNext}
            disabled={(currentStep === 1 && !selectedCollege) || isSubmitting || !licenseEligibility.canApplyForExam}
            className="w-40 gap-1 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                กำลังส่ง...
              </>
            ) : currentStep === 3 ? (
              <>
                <span className="material-symbols-outlined text-sm">send</span>
                ส่งคำร้อง
              </>
            ) : (
              <>
                ถัดไป
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </Button>
        </div>

      </PageShell>
    </>
  );
}
