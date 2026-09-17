"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { OrganizationLogo } from "@/roles/shared/components/brand/OrganizationLogo";


// กลุ่ม nav แบบมี section label
// - ข่าวสาร → TopNav Notification Bell
// - ศูนย์ช่วยเหลือ → TopNav Help Button
// - ตั้งค่าบัญชี → TopNav Avatar/Settings Dropdown
const navGroups: {
  groupLabel?: string;
  items: { href: string; icon: string; label: string }[];
}[] = [
  {
    groupLabel: "เมนูหลัก",
    items: [
      { href: "/member/dashboard", icon: "dashboard", label: "ภาพรวม" },
      { href: "/member/passport", icon: "badge", label: "Pharmacist Profile" },
    ],
  },
  {
    groupLabel: "การเรียน",
    items: [
      { href: "/member/programs", icon: "menu_book", label: "หลักสูตรและรายวิชา" },
      { href: "/member/registration/courses", icon: "library_add", label: "ลงทะเบียนเรียน" },
      { href: "/member/registration", icon: "how_to_reg", label: "สถานะการลงทะเบียน" },
      { href: "/member/schedule", icon: "calendar_today", label: "ตารางเรียน" },
      { href: "/member/results", icon: "fact_check", label: "ผลการเรียน" },
      { href: "/member/activity-transcript", icon: "history_edu", label: "Activity Transcript" },
      { href: "/member/pathway", icon: "route", label: "เส้นทางการเรียน" },
    ],
  },
  {
    groupLabel: "บริการผู้เข้าศึกษา",
    items: [
      { href: "/member/finance", icon: "payments", label: "การเงิน" },
      { href: "/member/requests", icon: "description", label: "คำร้อง" },
    ],
  },
];

function SidebarNav({ pathname, onNavigate, reserveCloseSpace = false }: { pathname: string; onNavigate?: () => void; reserveCloseSpace?: boolean }) {
  const isActive = (href: string) => {
    if (href === "/member/dashboard") return pathname === "/member/dashboard";
    if (href === "/member/registration") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* Logo */}
      <Link
        href="/member/dashboard"
        onClick={onNavigate}
        className={cn("block px-5 pb-4 pt-5", reserveCloseSpace && "pr-16")}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-logo-surface p-1.5 flex-shrink-0">
            <OrganizationLogo className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold leading-none tracking-wide text-sidebar-foreground">PCOR</p>
            <p className="mt-2 break-words text-xs leading-snug text-sidebar-foreground">
              Pharmacy College Online Registry
            </p>
          </div>
        </div>
      </Link>

      <div className="mx-5 shrink-0 border-t border-sidebar-border" />

      {/* Navigation */}
      <nav aria-label="เมนูสมาชิก" className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.groupLabel && (
              <p className="mb-1 px-3 text-xs font-semibold tracking-wide text-sidebar-foreground select-none">
                {group.groupLabel}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-normal transition-colors duration-150",
                      active
                        ? "bg-sidebar-primary/10 text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "material-symbols-outlined text-xl transition-all",
                        active
                          ? "fill text-sidebar-primary"
                          : "text-sidebar-foreground group-hover:text-sidebar-foreground"
                      )}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
    </nav>

    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="fixed bottom-4 left-4 top-4 z-40 hidden w-60 flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar shadow-app-float md:flex">
        <SidebarNav pathname={pathname} />
      </aside>

      {/* Mobile trigger */}
      <div className="fixed left-2 top-5 z-50 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shadow-sm" aria-label="เปิดเมนูหลัก">
              <span aria-hidden="true" className="material-symbols-outlined text-xl">menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetTitle className="sr-only">เมนูหลัก</SheetTitle>
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 z-10 h-11 w-11 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                aria-label="ปิดเมนูหลัก"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-xl">close</span>
              </Button>
            </SheetClose>
            <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} reserveCloseSpace />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
