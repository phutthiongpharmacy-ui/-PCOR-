"use client";

import { useMemo, useState } from "react";

import { PageShell } from "@/roles/shared/components/layout/PageShell";
import {
  MetricCard,
  WorkspaceHeader,
} from "@/roles/shared/components/workspace/WorkspacePrimitives";

import { ActivityDetailDialog } from "./ActivityDetailDialog";
import { ActivityRequirementGrid } from "./ActivityRequirementGrid";
import {
  ActivityFiltersCard,
  ActivityYearSelector,
} from "./ActivityTranscriptControls";
import { ActivityTranscriptList } from "./ActivityTranscriptList";
import {
  filterActivityEntries,
  getActivityEntriesForYear,
  getActivityRequirementProgress,
  getActivityRequirementsForYear,
  summarizeActivityYear,
  type ActivityFilters,
  type ActivityTrainingYear,
  type ActivityTranscriptEntry,
} from "./activity-transcript";
import {
  activityTranscriptEntries,
  activityTranscriptProfile,
  activityTranscriptRequirements,
} from "./activity-transcript-data";

const initialFilters: ActivityFilters = {
  category: "all",
  status: "all",
  query: "",
};

export default function MemberActivityTranscriptPage() {
  const [trainingYear, setTrainingYear] = useState<ActivityTrainingYear>(
    activityTranscriptProfile.currentTrainingYear,
  );
  const [filters, setFilters] = useState<ActivityFilters>(initialFilters);
  const [selectedEntry, setSelectedEntry] =
    useState<ActivityTranscriptEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const requirements = useMemo(
    () =>
      getActivityRequirementsForYear(
        activityTranscriptRequirements,
        trainingYear,
      ),
    [trainingYear],
  );
  const yearEntries = useMemo(
    () => getActivityEntriesForYear(activityTranscriptEntries, trainingYear),
    [trainingYear],
  );
  const progress = useMemo(
    () =>
      requirements.map((requirement) =>
        getActivityRequirementProgress(requirement, yearEntries),
      ),
    [requirements, yearEntries],
  );
  const summary = useMemo(
    () =>
      summarizeActivityYear(
        activityTranscriptRequirements,
        activityTranscriptEntries,
        trainingYear,
      ),
    [trainingYear],
  );
  const filteredEntries = useMemo(
    () => filterActivityEntries(activityTranscriptEntries, trainingYear, filters),
    [filters, trainingYear],
  );
  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(requirements.map((requirement) => requirement.category))),
    [requirements],
  );

  const selectYear = (year: ActivityTrainingYear) => {
    setTrainingYear(year);
    setFilters(initialFilters);
  };

  const openDetails = (entry: ActivityTranscriptEntry) => {
    setSelectedEntry(entry);
    setIsDetailOpen(true);
  };

  return (
    <PageShell size="app" className="space-y-6">
      <WorkspaceHeader
        eyebrow={activityTranscriptProfile.programName}
        title="Activity Transcript"
        description="ติดตามกิจกรรมตามเงื่อนไขของหลักสูตรและหลักฐานที่ผ่านการตรวจสอบในแต่ละปีการฝึกอบรม"
      />

      <ActivityYearSelector
        value={trainingYear}
        currentYear={activityTranscriptProfile.currentTrainingYear}
        onChange={selectYear}
      />

      <section aria-label={`สรุปกิจกรรมปีการฝึกอบรม ${trainingYear}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            size="sm"
            label="เงื่อนไขที่ครบแล้ว"
            value={`${summary.completedRequirements}/${summary.totalRequirements}`}
            note="นับจากรายการที่ยืนยันแล้ว"
            icon="task_alt"
            emphasis={
              summary.completedRequirements === summary.totalRequirements
                ? "success"
                : "default"
            }
          />
          <MetricCard
            size="sm"
            label="กิจกรรมที่ยืนยันแล้ว"
            value={summary.verifiedEntries}
            note="นำไปคิดความคืบหน้าของหลักสูตร"
            icon="verified"
            emphasis="success"
          />
          <MetricCard
            size="sm"
            label="รายการที่ยังไม่ยืนยัน"
            value={summary.pendingEntries}
            note={
              summary.rejectedEntries > 0
                ? `ไม่ผ่านการตรวจสอบ ${summary.rejectedEntries} รายการ`
                : "ยังไม่มีรายการที่ไม่ผ่านการตรวจสอบ"
            }
            icon="pending_actions"
            emphasis={summary.pendingEntries > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      <section aria-labelledby="requirement-progress-title">
        <div className="mb-3">
          <h2 id="requirement-progress-title" className="text-xl font-semibold text-foreground">
            ความคืบหน้าตามเงื่อนไข
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            รายการที่รอตรวจหรือบันทึกโดยผู้เรียนจะยังไม่ถูกนับจนกว่าจะได้รับการยืนยัน
          </p>
        </div>
        <ActivityRequirementGrid progress={progress} />
      </section>

      <section aria-labelledby="activity-list-title" className="space-y-4">
        <div>
          <h2 id="activity-list-title" className="text-xl font-semibold text-foreground">
            รายการกิจกรรม
          </h2>
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="mt-1 text-sm text-muted-foreground"
          >
            พบ {filteredEntries.length} จาก {yearEntries.length} รายการในปีการฝึกอบรม {trainingYear}
          </p>
        </div>

        <ActivityFiltersCard
          filters={filters}
          categories={categoryOptions}
          onChange={setFilters}
          onReset={() => setFilters(initialFilters)}
        />

        <div>
          <ActivityTranscriptList entries={filteredEntries} onSelect={openDetails} />
        </div>
      </section>

      <ActivityDetailDialog
        entry={selectedEntry}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </PageShell>
  );
}
