"use client";

import { toast } from "sonner";
import { useState } from "react";
import { programsData } from "@/roles/shared/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLLEGE_OPTIONS, type CollegeCode } from "@/roles/shared/data/college-directory";
import { ProgramSectionNav } from "@/roles/member/features/programs/ProgramSectionNav";
import { PageShell } from "@/roles/shared/components/layout/PageShell";

const PAGE_SIZE = 3;

export default function ProgramsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [collegeFilter, setCollegeFilter] = useState<"all" | CollegeCode>("all");
  const [page, setPage] = useState(1);

  // Filter
  const filtered = programsData.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCollege = collegeFilter === "all" || p.college === collegeFilter;
    return matchSearch && matchCollege;
  });

  // Paginate
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <PageShell>
      <div className="mb-5">
        <ProgramSectionNav active="overview" />
      </div>

      <Card className="mb-5">
        <CardContent className="p-5">
          <form role="search" onSubmit={(event) => event.preventDefault()} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.4fr)]">
            <div>
              <label htmlFor="program-search" className="mb-1.5 block text-sm font-medium">ค้นหาหลักสูตร</label>
              <div className="relative">
                <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">search</span>
                <Input
                  id="program-search"
                  type="search"
                  placeholder="พิมพ์ชื่อหลักสูตร"
                  className="h-11 rounded-xl pl-10 text-sm"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div>
              <label htmlFor="program-college" className="mb-1.5 block text-sm font-medium">วิทยาลัย</label>
              <select
                id="program-college"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                value={collegeFilter}
                onChange={(e) => { setCollegeFilter(e.target.value as "all" | CollegeCode); setPage(1); }}
              >
                <option value="all">ทุกวิทยาลัย</option>
                {COLLEGE_OPTIONS.map((college) => <option key={college.value} value={college.value}>{college.label}</option>)}
              </select>
            </div>
          </form>
          <div className="mt-4 flex min-h-11 flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              {searchQuery || collegeFilter !== "all"
                ? <>พบ <strong className="font-semibold tabular-nums text-foreground">{filtered.length}</strong> หลักสูตร จากทั้งหมด {programsData.length}</>
                : <>พบ <strong className="font-semibold tabular-nums text-foreground">{programsData.length}</strong> หลักสูตร</>}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={!searchQuery && collegeFilter === "all"}
              onClick={() => { setSearchQuery(""); setCollegeFilter("all"); setPage(1); }}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">filter_alt_off</span>
              ล้างตัวกรอง
            </Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
          <p className="text-sm">ไม่พบหลักสูตรที่ค้นหา</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Badge variant="outline" className="text-xs opacity-90 px-1.5 py-0">{p.college}</Badge>
                    <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs opacity-90 px-1.5 py-0">
                      {p.status === "active" ? "สมัครสอบประเมินผล" : "กำลังดำเนินการ"}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5 line-clamp-2">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">bookmark</span>{p.credits} หน่วยกิต</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span>{p.duration}</span>
                  </div>
                  <div className="flex -space-x-2 mt-4 pt-3 border-t border-border/50 mb-3">
                    {["male_1", "female_2", "male_2"].slice(0, (p.id % 3) + 1).map((avatar, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-card overflow-hidden bg-muted">
                        <img src={`/images/assets/member/learning/instructors/${avatar}.png`} alt="Instructor" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <span className="text-3xs text-muted-foreground ml-3 self-center">คณาจารย์ประจำวิชา</span>
                  </div>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs text-primary gap-1"
                    onClick={() => toast.info(`ดูรายละเอียดหลักสูตร\n\n${p.title}\nวิทยาลัย: ${p.collegeFull}\nรหัส: ${p.code}\nหน่วยกิต: ${p.credits}\nระยะเวลา: ${p.duration}\nผู้เข้าศึกษา: ${p.students} คน\n\n${p.description}`)}
                  >
                    ดูรายละเอียด <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="การแบ่งหน้าหลักสูตร" className="mt-6 flex items-center justify-center gap-1.5">
              <Button
                variant="outline" size="icon" className="size-11 rounded-xl"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="หน้าก่อนหน้า"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-lg">chevron_left</span>
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variant={page === n ? "default" : "outline"}
                  size="icon"
                  className="size-11 rounded-xl text-sm"
                  onClick={() => setPage(n)}
                  aria-label={`หน้า ${n}`}
                  aria-current={page === n ? "page" : undefined}
                >
                  {n}
                </Button>
              ))}
              <Button
                variant="outline" size="icon" className="size-11 rounded-xl"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="หน้าถัดไป"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-lg">chevron_right</span>
              </Button>
            </nav>
          )}
        </>
      )}
    </PageShell>
  );
}
