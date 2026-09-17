"use client";

import { useMemo, useState } from "react";
import { Tooltip } from "radix-ui";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { WorkspaceHeader } from "@/roles/shared/components/workspace/WorkspacePrimitives";

import {
  pharmacotherapyPathwayStages,
  pharmacotherapyPathwaySummary,
  type PharmacotherapyPathwayStage,
  type PathwayRequirement,
  type PathwayStageStatus,
} from "./pharmacotherapy-pathway";

const stageStatusConfig = {
  completed: {
    label: "ผ่านแล้ว",
    badge: "success" as const,
    node: "border-success bg-success text-success-foreground",
    stone: "border-success-border bg-success-soft/55",
  },
  current: {
    label: "กำลังศึกษา",
    badge: "info" as const,
    node: "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15",
    stone: "border-primary/45 bg-primary/10",
  },
  upcoming: {
    label: "ยังไม่เริ่ม",
    badge: "neutral" as const,
    node: "border-border bg-card text-muted-foreground",
    stone: "border-border bg-card",
  },
  locked: {
    label: "ยังไม่ปลดล็อก",
    badge: "warning" as const,
    node: "border-warning-border bg-warning-soft text-warning-on-soft",
    stone: "border-warning-border bg-warning-soft/50",
  },
} satisfies Record<
  PathwayStageStatus,
  {
    label: string;
    badge: "success" | "info" | "neutral" | "warning";
    node: string;
    stone: string;
  }
>;

const requirementStatusConfig = {
  met: {
    icon: "check_circle",
    label: "ผ่านแล้ว",
    className: "text-success",
  },
  in_progress: {
    icon: "pending",
    label: "กำลังดำเนินการ",
    className: "text-info",
  },
  not_started: {
    icon: "radio_button_unchecked",
    label: "ยังไม่เริ่ม",
    className: "text-muted-foreground",
  },
} as const;

const kindLabels = {
  entry: "จุดเริ่มต้น",
  year: "แผนการฝึกอบรม",
  gate: "เกณฑ์ผ่าน",
  completion: "จุดหมาย",
} as const;

const pathwayStagePositions = [
  { x: 9, className: "lg:left-[9%] lg:top-[22%]" },
  { x: 29.5, className: "lg:left-[29.5%] lg:top-[22%]" },
  { x: 50, className: "lg:left-1/2 lg:top-[22%]" },
  { x: 70.5, className: "lg:left-[70.5%] lg:top-[22%]" },
  { x: 91, className: "lg:left-[91%] lg:top-[22%]" },
  { x: 91, className: "lg:left-[91%] lg:top-[68%]" },
  { x: 64, className: "lg:left-[64%] lg:top-[68%]" },
  { x: 36, className: "lg:left-[36%] lg:top-[68%]" },
  { x: 9, className: "lg:left-[9%] lg:top-[68%]" },
] as const;

const pathwayTrackPath = "M 90 66 H 910 C 970 66 970 204 910 204 H 90";

function getPathwayProgressPath(stageIndex: number) {
  const lastIndex = pathwayStagePositions.length - 1;
  const safeIndex = Math.min(Math.max(stageIndex, 0), lastIndex);
  const target = pathwayStagePositions[safeIndex];

  if (safeIndex <= 4) {
    return `M 90 66 H ${target.x * 10}`;
  }

  return `M 90 66 H 910 C 970 66 970 204 910 204 H ${target.x * 10}`;
}

function RequirementRow({ requirement }: { requirement: PathwayRequirement }) {
  const config = requirementStatusConfig[requirement.status];

  return (
    <li className="flex min-h-14 items-start gap-3 rounded-xl border border-border bg-surface-container-low p-3">
      <span
        aria-hidden="true"
        className={cn("material-symbols-outlined mt-0.5 shrink-0 text-xl", config.className)}
      >
        {config.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{requirement.label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {requirement.detail}
        </p>
      </div>
      <span className={cn("shrink-0 text-xs font-medium", config.className)}>
        {config.label}
      </span>
    </li>
  );
}

function PathwayStagePreview({
  stage,
  order,
}: {
  stage: PharmacotherapyPathwayStage;
  order: number;
}) {
  const config = stageStatusConfig[stage.status];
  const completedRequirements = stage.requirements.filter(
    (requirement) => requirement.status === "met",
  ).length;

  return (
    <Tooltip.Portal>
      <Tooltip.Content
        side="top"
        sideOffset={12}
        collisionPadding={16}
        aria-label={`รายละเอียดย่อ ${stage.title}`}
        className="glass-panel z-[70] hidden w-72 origin-(--radix-tooltip-content-transform-origin) rounded-2xl p-4 text-left text-popover-foreground shadow-app-float backdrop-blur-xl duration-150 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-reduce:animate-none md:block"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
            ขั้นที่ {order}
          </span>
          <Badge variant={config.badge}>{config.label}</Badge>
        </div>

        <p className="mt-3 font-heading text-base font-bold leading-snug text-foreground">
          {stage.title}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {stage.description}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-container-low/90 px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">หน่วยกิต</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-foreground">
              {stage.credits
                ? `${stage.credits.earned} / ${stage.credits.planned}`
                : "ไม่ระบุ"}
            </dd>
          </div>
          <div className="rounded-xl bg-surface-container-low/90 px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">เงื่อนไขที่ผ่าน</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-foreground">
              {completedRequirements} / {stage.requirements.length}
            </dd>
          </div>
        </dl>

        {stage.unlocks ? (
          <div className="mt-3 flex gap-2 rounded-xl bg-brand-soft/80 px-3 py-2.5 text-brand-on-soft">
            <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-base">
              key
            </span>
            <p className="line-clamp-2 text-xs leading-relaxed">
              <span className="font-semibold">ปลดล็อกถัดไป:</span> {stage.unlocks}
            </p>
          </div>
        ) : null}

        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-primary">
          <span aria-hidden="true" className="material-symbols-outlined text-sm">
            touch_app
          </span>
          คลิกเพื่อดูรายละเอียดทั้งหมด
        </p>
        <Tooltip.Arrow className="fill-popover/90" width={16} height={8} />
      </Tooltip.Content>
    </Tooltip.Portal>
  );
}

function PathwayRoadmap({
  selectedStageId,
  onSelect,
}: {
  selectedStageId: string;
  onSelect: (stageId: string) => void;
}) {
  const currentStageIndex = pharmacotherapyPathwayStages.findIndex(
    (stage) => stage.status === "current",
  );

  return (
    <Tooltip.Provider delayDuration={180} skipDelayDuration={100}>
      <div className="overflow-x-auto px-1 pb-3 pt-1">
        <ol
          aria-label="ลำดับเส้นทางการเรียนเภสัชบำบัด 4 ปี"
          className="relative grid gap-3 lg:block lg:h-[22rem] lg:min-w-[46rem]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 1000 300"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block"
          >
            <path
              d={pathwayTrackPath}
              fill="none"
              stroke="var(--border)"
              strokeWidth="6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={getPathwayProgressPath(currentStageIndex)}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {pharmacotherapyPathwayStages.map((stage, index) => {
            const config = stageStatusConfig[stage.status];
            const selected = selectedStageId === stage.id;
            const position = pathwayStagePositions[index];

            return (
              <li
                key={stage.id}
                className={cn(
                  "relative lg:absolute lg:z-10 lg:w-32 lg:-translate-x-1/2 lg:-translate-y-7",
                  position.className,
                  index < pharmacotherapyPathwayStages.length - 1 &&
                    "after:absolute after:-bottom-3 after:left-9 after:top-[4.5rem] after:w-0.5 after:bg-border after:content-[''] lg:after:hidden",
                )}
              >
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      aria-current={stage.status === "current" ? "step" : undefined}
                      aria-pressed={selected}
                      aria-label={`${stage.shortLabel}: ${stage.title}, ${config.label}`}
                      onClick={() => onSelect(stage.id)}
                      className={cn(
                        "group/stone relative z-10 grid min-h-[5.75rem] w-full grid-cols-[3.25rem_1fr] items-center gap-3 overflow-hidden rounded-[1.4rem] border p-3 text-left shadow-app-card outline-none transition-[transform,box-shadow,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:shadow-app-float focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none lg:flex lg:min-h-0 lg:w-32 lg:grid-cols-none lg:flex-col lg:gap-1.5 lg:overflow-visible lg:rounded-2xl lg:border-0 lg:bg-transparent lg:p-0 lg:text-center lg:shadow-none lg:ring-0 lg:hover:shadow-none lg:focus-visible:ring-2 lg:focus-visible:ring-offset-4",
                        config.stone,
                        selected && "border-primary ring-2 ring-primary/20 lg:border-0 lg:ring-0",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent lg:hidden"
                      />
                      <span className="absolute right-3 top-2.5 rounded-full bg-card/80 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground ring-1 ring-foreground/5 backdrop-blur-sm lg:-right-1 lg:-top-1">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-12 shrink-0 items-center justify-center rounded-[1.05rem] border-2 shadow-app-card transition-transform duration-150 group-hover/stone:scale-105 motion-reduce:transform-none lg:size-14 lg:rounded-full",
                          config.node,
                          selected && "lg:ring-4 lg:ring-primary/20",
                        )}
                      >
                        <span className="material-symbols-outlined text-xl lg:text-2xl">
                          {stage.icon}
                        </span>
                      </span>

                      <span className="min-w-0 pr-7 lg:flex lg:w-32 lg:flex-col lg:items-center lg:pr-0">
                        <span className="block text-xs font-semibold text-primary">
                          {stage.shortLabel}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold leading-snug text-foreground lg:line-clamp-2">
                          {stage.title}
                        </span>
                        <Badge variant={config.badge} className="mt-1.5">
                          {config.label}
                        </Badge>
                      </span>
                    </button>
                  </Tooltip.Trigger>
                  <PathwayStagePreview stage={stage} order={index + 1} />
                </Tooltip.Root>
              </li>
            );
          })}
        </ol>
      </div>
    </Tooltip.Provider>
  );
}

export default function MemberPathwayPage() {
  const currentStage = pharmacotherapyPathwayStages.find(
    (stage) => stage.status === "current",
  );
  const [selectedStageId, setSelectedStageId] = useState(
    currentStage?.id ?? pharmacotherapyPathwayStages[0].id,
  );

  const selectedStage = useMemo(
    () =>
      pharmacotherapyPathwayStages.find((stage) => stage.id === selectedStageId) ??
      pharmacotherapyPathwayStages[0],
    [selectedStageId],
  );
  const selectedStatus = stageStatusConfig[selectedStage.status];
  const overallPercent = Math.round(
    (pharmacotherapyPathwaySummary.earnedCredits /
      pharmacotherapyPathwaySummary.totalCredits) *
      100,
  );

  return (
    <PageShell size="app" className="space-y-6">
      <WorkspaceHeader
        eyebrow="Learning Pathway"
        title="เส้นทางการเรียนเภสัชบำบัด 4 ปี"
        description={pharmacotherapyPathwaySummary.programName}
      />

      <Card className="border-border">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(8rem,0.6fr))] lg:items-center">
          <div className="min-w-0 lg:pr-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">กำลังศึกษา</Badge>
              <span className="text-xs text-muted-foreground">ความคืบหน้าหลักสูตร</span>
            </div>
            <h2 className="mt-3 font-heading text-xl font-bold text-foreground">
              {currentStage?.title ?? "สถานะการฝึกอบรมปัจจุบัน"}
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <Progress
                aria-label="ความคืบหน้าหน่วยกิตรวม"
                value={pharmacotherapyPathwaySummary.earnedCredits}
                max={pharmacotherapyPathwaySummary.totalCredits}
                tone="brand"
                className="h-2.5 flex-1"
              />
              <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                {overallPercent}%
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              ขั้นถัดไป: {pharmacotherapyPathwaySummary.nextAction}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-container-low p-4">
            <p className="text-xs text-muted-foreground">ปีการฝึกอบรม</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {pharmacotherapyPathwaySummary.currentYear}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                จาก {pharmacotherapyPathwaySummary.yearCount}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-container-low p-4">
            <p className="text-xs text-muted-foreground">หน่วยกิตปีปัจจุบัน</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {pharmacotherapyPathwaySummary.currentYearCredits}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                / {pharmacotherapyPathwaySummary.currentYearPlannedCredits}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-container-low p-4">
            <p className="text-xs text-muted-foreground">หน่วยกิตสะสม</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {pharmacotherapyPathwaySummary.earnedCredits}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                / {pharmacotherapyPathwaySummary.totalCredits}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <CardTitle className="text-lg font-bold">แผนการเรียนและจุดประเมิน</CardTitle>
            <CardDescription className="mt-1">
              เริ่มจากจุด 01 แล้วตามเส้นทาง วางเมาส์หรือกด Tab เพื่อดูสรุป และเลือกเพื่อดูรายละเอียดทั้งหมด
            </CardDescription>
          </div>
          <div aria-label="คำอธิบายสถานะ" className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge variant="success">ผ่านแล้ว</Badge>
            <Badge variant="info">กำลังศึกษา</Badge>
            <Badge variant="neutral">ยังไม่เริ่ม</Badge>
            <Badge variant="warning">ยังไม่ปลดล็อก</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <PathwayRoadmap selectedStageId={selectedStageId} onSelect={setSelectedStageId} />
        </CardContent>
      </Card>

      <section aria-live="polite" aria-labelledby="pathway-stage-detail-title">
        <Card className="border-border">
          <CardHeader className="border-b border-border pb-5 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">{kindLabels[selectedStage.kind]}</Badge>
                <Badge variant={selectedStatus.badge}>{selectedStatus.label}</Badge>
              </div>
              <h2
                id="pathway-stage-detail-title"
                className="mt-3 font-heading text-xl font-bold text-foreground"
              >
                {selectedStage.title}
              </h2>
              <CardDescription className="mt-1 leading-relaxed">
                {selectedStage.description}
              </CardDescription>
            </div>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-12 items-center justify-center rounded-full border-2",
                selectedStatus.node,
              )}
            >
              <span className="material-symbols-outlined text-2xl">{selectedStage.icon}</span>
            </span>
          </CardHeader>

          <CardContent className="grid gap-6 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-4">
              {selectedStage.credits ? (
                <div className="rounded-xl border border-border bg-surface-container-low p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">หน่วยกิตในขั้นนี้</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                        {selectedStage.credits.earned}
                        <span className="ml-1 text-sm font-medium text-muted-foreground">
                          / {selectedStage.credits.planned}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {Math.round(
                        (selectedStage.credits.earned / selectedStage.credits.planned) * 100,
                      )}%
                    </span>
                  </div>
                  <Progress
                    aria-label={`ความคืบหน้าหน่วยกิต ${selectedStage.title}`}
                    value={selectedStage.credits.earned}
                    max={selectedStage.credits.planned}
                    tone={selectedStage.status === "completed" ? "success" : "brand"}
                    className="mt-3 h-2"
                  />
                </div>
              ) : null}

              {selectedStage.unlocks ? (
                <div className="rounded-xl border border-brand-border bg-brand-soft p-4 text-brand-on-soft">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-xl">
                      key
                    </span>
                    <div>
                      <p className="text-xs font-semibold">เมื่อผ่านขั้นนี้จะปลดล็อก</p>
                      <p className="mt-1 text-sm leading-relaxed">{selectedStage.unlocks}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedStage.note ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">หมายเหตุ:</span>{" "}
                  {selectedStage.note}
                </p>
              ) : null}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">เงื่อนไขและสถานะ</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {selectedStage.requirements.map((requirement) => (
                  <RequirementRow key={`${selectedStage.id}-${requirement.label}`} requirement={requirement} />
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        อ้างอิงโครงสร้าง 133 หน่วยกิตจากไฟล์เปรียบเทียบหลักสูตร: ปี 1 จำนวน 37 หน่วยกิต
        และปี 2–4 ปีละ 32 หน่วยกิต เกณฑ์สอบบางส่วนอ้างประกาศปี 2559 จึงควรยืนยันกับเจ้าของหลักสูตรก่อนนำไปใช้เป็นกฎล็อกในระบบจริง
      </p>
    </PageShell>
  );
}
