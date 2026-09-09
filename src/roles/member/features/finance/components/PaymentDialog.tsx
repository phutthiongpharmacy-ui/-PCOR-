"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PaymentItem = {
  id: string;
  description: string;
  amount: number;
  baseAmount: number;
  lateFee: number;
  dueAt?: string;
};

export type PromptPaySubmission = {
  referenceNo: string;
  evidenceFileName: string;
  evidenceFileType: string;
  evidenceFileSize: number;
  evidenceDataUrl: string;
};

type PaymentDialogProps = {
  successDescription?: string;
  item: PaymentItem;
  onOpenChange: (open: boolean) => void;
  onSubmitted: (itemId: string, submission: PromptPaySubmission) => boolean;
};

const MAX_FILE_SIZE = 1024 * 1024;
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("File could not be read as a data URL"));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("File could not be read")));
    reader.readAsDataURL(file);
  });
}

export default function PaymentDialog({ item, onOpenChange, onSubmitted, successDescription }: PaymentDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const successTitleRef = useRef<HTMLHeadingElement>(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const [referenceNo, setReferenceNo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (submitted) successTitleRef.current?.focus();
  }, [submitted]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleFile = (selectedFile?: File) => {
    setError("");
    if (!selectedFile) return setFile(null);
    if (!ACCEPTED_FILE_TYPES.includes(selectedFile.type)) {
      setFile(null);
      return setError("รองรับเฉพาะไฟล์ JPG, PNG หรือ PDF");
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      return setError("ไฟล์ต้องมีขนาดไม่เกิน 1MB");
    }
    setFile(selectedFile);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError("");
    if (!referenceNo.trim()) return setError("กรุณากรอก Reference No.");
    if (!file) return setError("กรุณาแนบหลักฐานการชำระเงิน");

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const evidenceDataUrl = await fileToDataUrl(file);
      if (!mountedRef.current) return;
      const accepted = onSubmitted(item.id, {
        referenceNo: referenceNo.trim(),
        evidenceFileName: file.name,
        evidenceFileType: file.type,
        evidenceFileSize: file.size,
        evidenceDataUrl,
      });
      if (accepted) setSubmitted(true);
      else setError("สถานะรายการเปลี่ยนแล้ว กรุณาปิดหน้าต่างและตรวจสอบรายการอีกครั้ง");
    } catch {
      if (mountedRef.current) setError("ไม่สามารถอ่านไฟล์หลักฐานได้ กรุณาเลือกไฟล์ใหม่");
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!(isSubmitting && !open)) onOpenChange(open); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-3xl">
        {submitted ? (
          <div className="flex min-h-[380px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span aria-hidden="true" className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <DialogTitle ref={successTitleRef} tabIndex={-1} className="mb-2 text-xl outline-none">
              ส่งหลักฐานการชำระเงินแล้ว
            </DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-6">
              {successDescription ?? "เจ้าหน้าที่จะตรวจสอบยอด เลขอ้างอิง และหลักฐาน ก่อนยืนยันการรับชำระ"}
            </DialogDescription>
            <Button className="mt-6 min-h-11 min-w-32" onClick={() => onOpenChange(false)}>เสร็จสิ้น</Button>
          </div>
        ) : (
          <>
            <DialogHeader className="border-b border-border px-6 py-5 pr-16">
              <DialogTitle className="text-xl">ชำระเงินด้วย PromptPay</DialogTitle>
              <DialogDescription>{item.description} · ฿{item.amount.toLocaleString()}</DialogDescription>
            </DialogHeader>
            <form className="space-y-5 px-6 pb-6" onSubmit={handleSubmit}>
              <p role="note" className="rounded-xl border border-warning-border bg-warning-soft p-3 text-sm text-warning-on-soft">
                QR นี้เป็นภาพประกอบ ไม่สามารถใช้โอนเงินจริงได้ ใช้เลขอ้างอิงและไฟล์ที่ไม่มีข้อมูลส่วนตัวเพื่อกดลองขั้นตอน
              </p>
              <div className="flex items-start gap-3 rounded-xl border border-info-border bg-info-soft p-4 text-info-on-soft">
                <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-xl">qr_code_scanner</span>
                <div>
                  <p className="text-sm font-semibold">ช่องทางชำระเงิน: พร้อมเพย์</p>
                  <p className="mt-1 text-xs leading-5">กรอกเลขอ้างอิงและแนบไฟล์เพื่อดูขั้นตอนการส่งหลักฐาน</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-container-low p-4 text-sm">
                <div className="flex justify-between"><span>ยอดลงทะเบียน</span><span>฿{item.baseAmount.toLocaleString()}</span></div>
                {item.lateFee > 0 && <div className="mt-2 flex justify-between text-danger"><span>ค่าปรับค้างชำระ</span><span>฿{item.lateFee.toLocaleString()}</span></div>}
                <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold"><span>ยอดชำระรวม</span><span>฿{item.amount.toLocaleString()}</span></div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-5 text-center">
                  <div className="flex h-40 w-40 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
                    <span aria-hidden="true" className="material-symbols-outlined text-7xl text-muted-foreground">qr_code_2</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold">พร้อมเพย์ (PromptPay)</p>
                  <p className="mt-1 text-xs text-content-muted">ภาพประกอบ QR — ไม่รองรับการโอนเงินจริง</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="payment-reference" className="text-xs font-medium">Reference No.</label>
                    <Input
                      id="payment-reference"
                      className="h-11"
                      placeholder="เลขอ้างอิงจากรายการ PromptPay"
                      value={referenceNo}
                      required
                      aria-required="true"
                      onChange={(event) => { setReferenceNo(event.target.value); setError(""); }}
                      aria-invalid={Boolean(error) && !referenceNo.trim()}
                      aria-describedby={error && !referenceNo.trim() ? "payment-form-error" : undefined}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="payment-evidence" className="text-xs font-medium">หลักฐานการชำระเงิน <span className="text-danger">*</span></label>
                    <input id="payment-evidence" ref={fileRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={(event) => handleFile(event.target.files?.[0])} />
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-28 w-full flex-col border-dashed"
                      onClick={() => fileRef.current?.click()}
                      aria-label="เลือกไฟล์หลักฐานการชำระเงิน (จำเป็น)"
                      aria-invalid={Boolean(error) && !file}
                      aria-describedby={error && !file ? "payment-form-error" : undefined}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">{file ? "check_circle" : "cloud_upload"}</span>
                      <span className="max-w-full break-all text-xs font-medium">{file ? file.name : "เลือกไฟล์ JPG, PNG หรือ PDF (ไม่เกิน 1MB)"}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {error && <p id="payment-form-error" role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
              <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>{isSubmitting ? "กำลังเตรียมหลักฐาน..." : "ส่งหลักฐานการชำระเงิน"}</Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
