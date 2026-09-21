import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  activityCategoryMeta,
  activityVerificationMeta,
  type ActivityCategory,
  type ActivityFilters,
  type ActivityTrainingYear,
} from "./activity-transcript";

const trainingYears: ActivityTrainingYear[] = [1, 2, 3, 4];

export function ActivityYearSelector({
  value,
  currentYear,
  onChange,
}: {
  value: ActivityTrainingYear;
  currentYear: ActivityTrainingYear;
  onChange: (year: ActivityTrainingYear) => void;
}) {
  return (
    <section aria-labelledby="training-year-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="training-year-title" className="text-lg font-semibold text-foreground">
            ปีการฝึกอบรม
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            เลือกปีเพื่อดูเงื่อนไขและกิจกรรมที่บันทึกไว้
          </p>
        </div>
        <Badge variant="info">เพิ่มกิจกรรมได้ด้วยตนเอง</Badge>
      </div>

      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-4">
        {trainingYears.map((year) => {
          const isSelected = value === year;
          const isCurrent = currentYear === year;
          return (
            <Button
              key={year}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className="h-auto min-h-14 flex-col items-start justify-center gap-0.5 whitespace-normal px-4 text-left lg:min-h-12 lg:flex-row lg:items-center lg:justify-between lg:gap-2"
              aria-pressed={isSelected}
              onClick={() => onChange(year)}
            >
              <span>ปีการฝึกอบรม {year}</span>
              {isCurrent ? <span className="text-xs opacity-80">ปีปัจจุบัน</span> : null}
            </Button>
          );
        })}
      </div>
    </section>
  );
}

export function ActivityFiltersCard({
  filters,
  categories,
  onChange,
  onReset,
}: {
  filters: ActivityFilters;
  categories: ActivityCategory[];
  onChange: (filters: ActivityFilters) => void;
  onReset: () => void;
}) {
  const isPristine =
    filters.query === "" && filters.category === "all" && filters.status === "all";

  return (
    <Card size="sm" className="border-border">
      <CardContent className="px-4">
        <form
          role="search"
          className="grid gap-3 md:grid-cols-2 md:items-end xl:grid-cols-[minmax(220px,1fr)_220px_220px_auto]"
          onSubmit={(event) => event.preventDefault()}
        >
          <div>
            <label htmlFor="activity-query" className="mb-1.5 block text-xs font-medium">
              ค้นหากิจกรรม
            </label>
            <Input
              id="activity-query"
              type="search"
              className="h-11"
              value={filters.query}
              placeholder="ชื่อกิจกรรม หน่วยงาน หรือบทบาท"
              onChange={(event) => onChange({ ...filters, query: event.target.value })}
            />
          </div>

          <div>
            <label htmlFor="activity-category" className="mb-1.5 block text-xs font-medium">
              ประเภทกิจกรรม
            </label>
            <select
              id="activity-category"
              className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              value={filters.category}
              onChange={(event) =>
                onChange({
                  ...filters,
                  category: event.target.value as ActivityCategory | "all",
                })
              }
            >
              <option value="all">ทุกประเภท</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {activityCategoryMeta[category].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="activity-status" className="mb-1.5 block text-xs font-medium">
              สถานะการตรวจสอบ
            </label>
            <select
              id="activity-status"
              className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              value={filters.status}
              onChange={(event) =>
                onChange({
                  ...filters,
                  status: event.target.value as ActivityFilters["status"],
                })
              }
            >
              <option value="all">ทุกสถานะ</option>
              {Object.entries(activityVerificationMeta).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onReset}
            disabled={isPristine}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              filter_alt_off
            </span>
            ล้างตัวกรอง
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
