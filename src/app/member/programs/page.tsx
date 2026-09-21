"use client";

import Image from "next/image";
import { useState } from "react";
import { programsData } from "@/roles/shared/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { COLLEGE_OPTIONS, type CollegeCode } from "@/roles/shared/data/college-directory";
import { ProgramSectionNav } from "@/roles/member/features/programs/ProgramSectionNav";
import { PageShell } from "@/roles/shared/components/layout/PageShell";

const PAGE_SIZE = 3;
type Program = (typeof programsData)[number];

function ProgramCard({ program }: { program: Program }) {
  const titleId = `program-${program.id}-title`;
  const documentTitleId = `program-${program.id}-document-title`;

  return (
    <Dialog>
      <Card role="article" aria-labelledby={titleId} className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Badge variant="outline" className="px-1.5 py-0 text-xs opacity-90">{program.college}</Badge>
            <Badge variant={program.status === "active" ? "default" : "secondary"} className="px-1.5 py-0 text-xs opacity-90">
              {program.status === "active" ? "สมัครสอบประเมินผล" : "กำลังดำเนินการ"}
            </Badge>
          </div>
          <h3 id={titleId} className="mb-1.5 line-clamp-2 text-sm font-semibold">{program.title}</h3>
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{program.description}</p>
          <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span aria-hidden="true" className="material-symbols-outlined text-sm">bookmark</span>{program.credits} หน่วยกิต</span>
            <span className="flex items-center gap-1"><span aria-hidden="true" className="material-symbols-outlined text-sm">schedule</span>{program.duration}</span>
          </div>
          <div className="mb-3 mt-4 flex -space-x-2 border-t border-border/50 pt-3">
            {["male_1", "female_2", "male_2"].slice(0, (program.id % 3) + 1).map((avatar) => (
              <div key={avatar} className="size-7 overflow-hidden rounded-full border-2 border-card bg-muted">
                <Image
                  src={`/images/assets/member/learning/instructors/${avatar}.png`}
                  alt=""
                  width={28}
                  height={28}
                  className="size-full object-cover"
                />
              </div>
            ))}
            <span className="ml-3 self-center text-3xs text-muted-foreground">คณาจารย์ประจำวิชา</span>
          </div>
          <DialogTrigger asChild>
            <Button
              variant="link"
              className="h-auto gap-1 p-0 text-xs text-primary"
              aria-label={`ดูรายละเอียดหลักสูตร ${program.title}`}
            >
              ดูรายละเอียด <span aria-hidden="true" className="material-symbols-outlined text-sm">arrow_forward</span>
            </Button>
          </DialogTrigger>
        </CardContent>
      </Card>

      <DialogContent showCloseButton={false} className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-3 top-3 size-11 bg-secondary"
            aria-label={`ปิดรายละเอียดหลักสูตร ${program.title}`}
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </Button>
        </DialogClose>

        <DialogHeader className="pr-12">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{program.college}</Badge>
            <Badge variant={program.status === "active" ? "default" : "secondary"}>
              {program.status === "active" ? "สมัครสอบประเมินผล" : "กำลังดำเนินการ"}
            </Badge>
          </div>
          <DialogTitle className="text-xl leading-snug">{program.title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{program.description}</DialogDescription>
        </DialogHeader>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">รหัสหลักสูตร</dt>
            <dd className="mt-1 font-medium">{program.code}</dd>
          </div>
          <div className="rounded-2xl bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">วิทยาลัย</dt>
            <dd className="mt-1 font-medium">{program.collegeFull}</dd>
          </div>
          <div className="rounded-2xl bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">หน่วยกิต</dt>
            <dd className="mt-1 font-medium tabular-nums">{program.credits} หน่วยกิต</dd>
          </div>
          <div className="rounded-2xl bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">ระยะเวลา</dt>
            <dd className="mt-1 font-medium">{program.duration}</dd>
          </div>
        </dl>

        <section aria-labelledby={documentTitleId} className="rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="material-symbols-outlined flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              picture_as_pdf
            </span>
            <div className="min-w-0 flex-1">
              <h4 id={documentTitleId} className="font-semibold">เอกสารสรุปหลักสูตร (PDF)</h4>
              <p className="mt-1 break-all text-xs text-muted-foreground">{program.document.fileName}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            เอกสารสรุปข้อมูลหลักสูตรและเส้นทางคุณวุฒิสำหรับประกอบการพิจารณา
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="min-h-11 sm:flex-1">
              <a
                href={program.document.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`เปิดเอกสารสรุปหลักสูตร ${program.title} PDF ในแท็บใหม่`}
              >
                <span aria-hidden="true" className="material-symbols-outlined">open_in_new</span>
                เปิดเอกสารสรุป (PDF)
              </a>
            </Button>
            <Button asChild variant="outline" className="min-h-11 sm:flex-1">
              <a
                href={program.document.url}
                download={program.document.fileName}
                aria-label={`ดาวน์โหลดเอกสารสรุปหลักสูตร ${program.title} PDF`}
              >
                <span aria-hidden="true" className="material-symbols-outlined">download</span>
                ดาวน์โหลด
              </a>
            </Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

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
            {paginated.map((program) => <ProgramCard key={program.id} program={program} />)}
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
