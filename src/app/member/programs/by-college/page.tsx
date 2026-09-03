"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgramSectionNav } from "@/roles/member/features/programs/ProgramSectionNav";
import { PageShell } from "@/roles/shared/components/layout/PageShell";
import { formatCollegeCourseCode, getCollegeOption } from "@/roles/shared/data/college-directory";
import {
  getCourseTypeLabel,
  groupCoursesByCollege,
} from "@/roles/shared/features/courses/course-catalog";

export default function ByCollegePage() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("th-TH");
  const groups = groupCoursesByCollege().map((group) => ({ ...group, courses: group.courses.filter((item) => !normalized || `${item.code ?? ""} ${formatCollegeCourseCode(item.code, item.collegeCode)} ${item.titleTh} ${item.titleEn}`.toLocaleLowerCase("th-TH").includes(normalized)) })).filter((group) => group.courses.length > 0);

  return (
    <PageShell className="space-y-5">
      <ProgramSectionNav active="by-college" />
      <Card className="max-w-xl">
        <CardContent className="p-5">
          <form role="search" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="college-course-search" className="mb-1.5 block text-sm font-medium">ค้นหารายวิชา</label>
            <Input
              id="college-course-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหารายวิชาในทุกวิทยาลัย"
              className="h-11 rounded-xl text-sm"
            />
          </form>
        </CardContent>
      </Card>
      <Accordion
        type="multiple"
        defaultValue={groups.slice(0, 1).map((group) => group.collegeCode)}
        className="space-y-3"
      >
        {groups.map((group) => (
          <AccordionItem key={group.collegeCode} value={group.collegeCode} className="rounded-xl border border-border bg-card px-5">
            <AccordionTrigger className="hover:no-underline">
              <span className="min-w-0 text-left">
                <span className="block font-semibold">{getCollegeOption(group.collegeCode)?.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{group.courses.length} รายการ</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="divide-y rounded-lg border border-border">
                {group.courses.map((item) => (
                  <div key={item.id} className="grid gap-2 p-4 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center">
                    <span className="font-mono text-xs text-muted-foreground">{item.code ? formatCollegeCourseCode(item.code, item.collegeCode) : "ไม่มีรหัสวิชา"}</span>
                    <span>
                      <span className="block font-medium">{item.titleTh}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{item.titleEn} · {item.duration}</span>
                    </span>
                    <Badge variant="secondary">
                      {getCourseTypeLabel(item)}
                    </Badge>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {groups.length === 0 && <div className="py-14 text-center text-sm text-muted-foreground">ไม่พบรายการที่ค้นหา</div>}
    </PageShell>
  );
}
