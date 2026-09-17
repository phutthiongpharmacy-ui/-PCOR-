import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import type { ActivityRequirementProgress } from "./activity-transcript";

export function ActivityRequirementGrid({
  progress,
}: {
  progress: ActivityRequirementProgress[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {progress.map((item) => {
        const targetLabel = item.requirement.targetCount
          ? `${item.verifiedCount} / ${item.requirement.targetCount} ${item.requirement.unit}`
          : item.verifiedCount > 0
            ? "มีรายการที่ยืนยันแล้ว"
            : "ต้องมีรายการที่ยืนยันแล้ว";

        return (
          <Card
            key={item.requirement.id}
            size="sm"
            className={cn(
              "border",
              item.isComplete
                ? "border-success-border bg-success-soft/35"
                : "border-border",
            )}
          >
            <CardContent className="space-y-3 px-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "material-symbols-outlined flex size-10 shrink-0 items-center justify-center rounded-2xl text-xl",
                    item.isComplete
                      ? "bg-success-soft text-success-on-soft"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {item.requirement.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground">
                      {item.requirement.label}
                    </h3>
                    <Badge variant={item.isComplete ? "success" : "neutral"}>
                      {item.isComplete ? "ครบแล้ว" : "ยังไม่ครบ"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.requirement.description}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">{targetLabel}</span>
                  {item.pendingCount > 0 ? (
                    <span className="text-warning-on-soft">
                      ยังไม่ยืนยัน {item.pendingCount}
                    </span>
                  ) : null}
                </div>
                <Progress
                  value={item.progressValue}
                  max={item.progressMax}
                  tone={item.isComplete ? "success" : "brand"}
                  aria-label={`ความคืบหน้า ${item.requirement.label}`}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
