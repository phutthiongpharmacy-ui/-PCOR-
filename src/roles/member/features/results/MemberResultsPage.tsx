"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedFilterButton, SegmentedFilterGroup } from "@/components/ui/segmented-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMockDb } from "@/providers/mock-db-provider";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { EmptyState, LoadingState } from "@/roles/shared/components/workspace/WorkspacePrimitives";
import { formatCollegeCourseCode } from "@/roles/shared/data/college-directory";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

type ResultViewMode = "all" | "year";

export default function MemberResultsPage() {
  const db = useMockDb();
  const { session, isReady } = usePortalSession();
  const [viewMode, setViewMode] = useState<ResultViewMode>("all");
  const [academicYear, setAcademicYear] = useState("");
  const [queryDraft, setQueryDraft] = useState("");
  const [query, setQuery] = useState("");

  if (!db.isLoaded || !isReady) {
    return <PageShell><LoadingState label="กำลังโหลดผลการประเมิน" /></PageShell>;
  }

  const memberId = session?.userId ?? "";
  const resultRows = db.subjectResults.flatMap((result) => {
    if (result.studentId !== memberId || (result.status !== "published" && result.status !== "revised")) return [];
    const offering = db.courseOfferings.find((item) => item.id === result.courseOfferingId);
    if (!offering || !result.currentValue) return [];
    const [termNumber, academicYear] = offering.term.split("/");
    return [{ result, offering, termNumber, academicYear }];
  });
  const academicYears = [...new Set(resultRows.map((row) => row.academicYear))]
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left, "th", { numeric: true }));
  const selectedAcademicYear = academicYears.includes(academicYear)
    ? academicYear
    : (academicYears[0] ?? "");
  const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
  const visibleRows = resultRows.filter(({ offering, academicYear: rowAcademicYear }) => {
    const matchesQuery = !normalizedQuery || `${offering.courseCode} ${formatCollegeCourseCode(offering.courseCode, offering.collegeCode)} ${offering.courseTitle}`
      .toLocaleLowerCase("th-TH")
      .includes(normalizedQuery);
    return (viewMode === "all" || rowAcademicYear === selectedAcademicYear)
      && matchesQuery;
  });
  const cumulativeCredits = resultRows.reduce((total, { result, offering }) => {
    return result.currentValue === "S" ? total + offering.credits : total;
  }, 0);
  const filteredCredits = visibleRows.reduce((total, { result, offering }) => {
    return result.currentValue === "S" ? total + offering.credits : total;
  }, 0);
  const visibleResultGroups = [...new Set(visibleRows.map((row) => row.academicYear))]
    .sort((left, right) => right.localeCompare(left, "th", { numeric: true }))
    .map((year) => ({
      year,
      rows: visibleRows.filter((row) => row.academicYear === year),
    }));

  const resetFilters = () => {
    setViewMode("all");
    setAcademicYear(academicYears[0] ?? "");
    setQueryDraft("");
    setQuery("");
  };

  return (
    <PageShell size="full" className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="order-2 space-y-3 lg:order-1">
        {visibleResultGroups.map((group) => (
          <Card key={group.year} className="gap-0 py-0">
            <CardHeader className="border-b border-primary bg-primary py-4">
              <CardTitle className="text-lg text-primary-foreground">ปีการศึกษา {group.year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto bg-card">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัสรายวิชา</TableHead>
                      <TableHead>ชื่อรายวิชา</TableHead>
                      <TableHead>ภาคการศึกษา</TableHead>
                      <TableHead>หน่วยกิต</TableHead>
                      <TableHead>ผลการประเมิน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.rows.map(({ result, offering }) => {
                      const didNotPass = result.currentValue === "U";
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="font-mono text-sm font-medium">{formatCollegeCourseCode(offering.courseCode, offering.collegeCode)}</TableCell>
                          <TableCell className="max-w-md whitespace-normal font-medium">{offering.courseTitle}</TableCell>
                          <TableCell>{offering.term}</TableCell>
                          <TableCell className="tabular-nums">{offering.credits}</TableCell>
                          <TableCell><strong className={didNotPass ? "text-danger" : "text-success"}>{result.currentValue}</strong></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
        {visibleResultGroups.length === 0 ? (
          <Card>
            <CardContent className="p-5">
              <EmptyState title="ไม่พบผลการเรียน" description="ลองเปลี่ยนรูปแบบการแสดงผล ปีการศึกษา หรือคำค้นหา" />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <aside className="order-1 space-y-3 lg:order-2" aria-label="สรุปและตัวกรองผลการเรียน">
        <div className="grid grid-cols-2 gap-3">
          <Card className="py-0">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">หน่วยกิตสะสม</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{cumulativeCredits}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">หน่วยกิตที่ผ่านทั้งหมด</p>
            </CardContent>
          </Card>
          <Card className="py-0">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">หน่วยกิตตามตัวกรอง</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{filteredCredits}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">จาก {visibleRows.length} รายวิชา</p>
            </CardContent>
          </Card>
        </div>

        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="mb-2 text-sm font-medium">แสดงผล</p>
              <SegmentedFilterGroup aria-label="รูปแบบการแสดงผลผลการเรียน" className="grid grid-cols-2">
                <SegmentedFilterButton active={viewMode === "all"} onClick={() => setViewMode("all")}>
                  ทั้งหมด
                </SegmentedFilterButton>
                <SegmentedFilterButton active={viewMode === "year"} onClick={() => setViewMode("year")}>
                  รายปี
                </SegmentedFilterButton>
              </SegmentedFilterGroup>
            </div>

            {viewMode === "year" ? (
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-sm font-medium">ปีการศึกษา</p>
                <div className="grid grid-cols-4 gap-2">
                  {academicYears.map((year) => (
                    <Button
                      key={year}
                      type="button"
                      size="sm"
                      variant={selectedAcademicYear === year ? "outline" : "secondary"}
                      className={selectedAcademicYear === year ? "border-primary px-2 text-primary" : "px-2"}
                      onClick={() => setAcademicYear(year)}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            <form
              role="search"
              className="border-t border-border pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(queryDraft);
              }}
            >
              <label htmlFor="result-course-search" className="mb-2 block text-sm font-medium">ค้นหารายวิชา</label>
              <Input
                id="result-course-search"
                type="search"
                value={queryDraft}
                onChange={(event) => setQueryDraft(event.target.value)}
                placeholder="ชื่อรายวิชา หรือรหัสวิชา"
                className="h-10"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={resetFilters}>ล้าง</Button>
                <Button type="submit" size="sm">ค้นหา</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </aside>
    </PageShell>
  );
}
