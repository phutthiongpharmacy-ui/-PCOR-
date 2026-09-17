import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  activityCategoryMeta,
  activitySourceLabels,
  activityVerificationMeta,
  type ActivityTranscriptEntry,
} from "./activity-transcript";

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function ActivityDetailDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: ActivityTranscriptEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entry) return null;

  const category = activityCategoryMeta[entry.category];
  const status = activityVerificationMeta[entry.verification.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
      >
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-3 top-3 h-11 w-11 bg-secondary"
            aria-label="ปิดหน้าต่างรายละเอียด"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </Button>
        </DialogClose>
        <DialogHeader className="pr-12">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant={status.badge}>{status.label}</Badge>
            <Badge variant="outline">{category.shortLabel}</Badge>
          </div>
          <DialogTitle className="text-xl leading-7">{entry.title}</DialogTitle>
          <DialogDescription>
            รายละเอียดกิจกรรมและหลักฐานที่บันทึกใน Activity Transcript
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-4 rounded-2xl bg-secondary/60 p-4 sm:grid-cols-2">
          <DetailItem label="วันที่ทำกิจกรรม" value={formatThaiDate(entry.activityDate)} />
          <DetailItem label="ปีการฝึกอบรม" value={`ปี ${entry.trainingYear} · ปีการศึกษา ${entry.academicYear}`} />
          <DetailItem label="ประเภทกิจกรรม" value={category.label} />
          <DetailItem label="หน่วยงาน / สถานที่" value={entry.institution} />
          <DetailItem label="บทบาท" value={entry.role} />
          <DetailItem label="แหล่งข้อมูล" value={activitySourceLabels[entry.source]} />
        </dl>

        <section aria-labelledby="activity-description-title">
          <h3 id="activity-description-title" className="font-semibold text-foreground">
            รายละเอียด
          </h3>
          <p className="mt-2 leading-6 text-muted-foreground">{entry.description}</p>
        </section>

        <section aria-labelledby="activity-evidence-title">
          <h3 id="activity-evidence-title" className="font-semibold text-foreground">
            หลักฐานประกอบ
          </h3>
          {entry.evidence.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {entry.evidence.map((evidence) => (
                <li
                  key={evidence.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-lg text-primary">
                    description
                  </span>
                  <span className="min-w-0 truncate text-sm">{evidence.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">ไม่มีไฟล์หลักฐานในรายการนี้</p>
          )}
        </section>

        <section
          aria-labelledby="activity-verification-title"
          className="rounded-2xl border border-border p-4"
        >
          <h3 id="activity-verification-title" className="font-semibold text-foreground">
            การตรวจสอบ
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {entry.verification.note ?? "ยังไม่มีหมายเหตุจากผู้ตรวจสอบ"}
          </p>
          {entry.verification.verifiedBy ? (
            <p className="mt-2 text-xs text-muted-foreground">
              ตรวจสอบโดย {entry.verification.verifiedBy}
              {entry.verification.verifiedAt
                ? ` · ${formatThaiDate(entry.verification.verifiedAt.slice(0, 10))}`
                : ""}
            </p>
          ) : null}
        </section>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">ปิด</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
