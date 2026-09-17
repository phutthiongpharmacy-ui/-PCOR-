import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/roles/shared/components/workspace/WorkspacePrimitives";

import {
  activityCategoryMeta,
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

export function ActivityTranscriptList({
  entries,
  onSelect,
}: {
  entries: ActivityTranscriptEntry[];
  onSelect: (entry: ActivityTranscriptEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon="event_busy"
        title="ไม่พบกิจกรรม"
        description="ยังไม่มีกิจกรรมในปีนี้ หรือไม่มีรายการที่ตรงกับตัวกรอง"
      />
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const category = activityCategoryMeta[entry.category];
        const status = activityVerificationMeta[entry.verification.status];

        return (
          <Card key={entry.id} size="sm" className="border-border">
            <CardContent className="px-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl text-primary"
                >
                  {category.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{category.shortLabel}</Badge>
                    <Badge variant={status.badge}>{status.label}</Badge>
                  </div>
                  <h3 className="mt-2 font-semibold text-foreground">{entry.title}</h3>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatThaiDate(entry.activityDate)}</span>
                    <span>{entry.institution}</span>
                    <span>{entry.role}</span>
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full shrink-0 sm:w-auto"
                  aria-label={`ดูรายละเอียด: ${entry.title}`}
                  onClick={() => onSelect(entry)}
                >
                  ดูรายละเอียด
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    chevron_right
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
