"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PortalAccessGate } from "@/roles/shared/components/auth/PortalAccessGate";
import { OrganizationLogo } from "@/roles/shared/components/brand/OrganizationLogo";
import PageTransition from "@/roles/shared/components/layout/PageTransition";
import { ROLE_PRESENTATION, type SystemRole } from "@/roles/shared/features/roles/access-model";
import {
  clearPortalSession,
} from "@/roles/shared/features/roles/mock-login";
import type { PortalArea } from "@/roles/shared/features/roles/access-control";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";

export interface WorkspaceNavItem {
  href: string;
  icon: string;
  label: string;
  badge?: string;
}

interface RoleWorkspaceShellProps {
  area: PortalArea;
  role: SystemRole;
  navItems: readonly WorkspaceNavItem[];
  exactOrganisationId?: string;
  resourceId?: string;
  children: React.ReactNode;
}

function WorkspaceNavigation({
  role,
  navItems,
  onNavigate,
  reserveCloseSpace = false,
}: Pick<RoleWorkspaceShellProps, "role" | "navItems"> & {
  onNavigate?: () => void;
  reserveCloseSpace?: boolean;
}) {
  const pathname = usePathname();
  const { session } = usePortalSession();
  const presentation = ROLE_PRESENTATION[role];

  return (
    <div className="flex h-full flex-col">
      <Link
        href={presentation.home}
        onClick={onNavigate}
        className={cn("block px-5 pb-4 pt-5", reserveCloseSpace && "pr-16")}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-logo-surface p-1">
            <OrganizationLogo className="h-full w-full object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight text-sidebar-foreground">
              {presentation.portal}
            </span>
            <span className="mt-0.5 block truncate text-xs text-sidebar-foreground">
              {session?.organisation.code ?? "—"}
            </span>
          </span>
        </div>
      </Link>

      <div className="mx-4 h-px bg-sidebar-border" />
      <nav aria-label={`เมนู ${presentation.label}`} className="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary/10 text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <span aria-hidden="true" className={cn("material-symbols-outlined text-xl", active && "fill")}>{item.icon}</span>
              <span className="min-w-0 whitespace-normal leading-snug">{item.label}</span>
              {item.badge ? (
                <span className="ml-auto rounded-full bg-sidebar-primary/10 px-2 py-0.5 text-xs tabular-nums text-sidebar-primary">
                  {item.badge}
                </span>
              ) : active ? <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" /> : null}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}

export function WorkspaceAccountMenu({
  displayName,
  roleLabel,
  organisationName,
}: {
  displayName: string;
  roleLabel: string;
  organisationName: string;
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 max-w-56 min-w-0 gap-2 rounded-xl px-1.5 lg:pr-2.5"
          aria-label={`เมนูบัญชีผู้ใช้ของ ${displayName}`}
        >
          <Avatar className="h-8 w-8">
            <span aria-hidden="true" className="material-symbols-outlined text-sm">account_circle</span>
          </Avatar>
          <span className="hidden min-w-0 max-w-40 text-left lg:block">
            <span className="block truncate text-sm font-medium text-foreground">{displayName}</span>
            <span className="block truncate text-2xs font-normal text-muted-foreground">{organisationName}</span>
          </span>
          <span aria-hidden="true" className="material-symbols-outlined hidden text-base text-muted-foreground lg:block">expand_more</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        aria-label="เมนูบัญชีผู้ใช้"
        className="w-72 max-w-[calc(100vw-1rem)] text-sm"
      >
        <DropdownMenuLabel className="p-3 font-normal">
          <span className="block break-words text-sm font-semibold leading-snug text-foreground">{displayName}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{roleLabel}</span>
          <span className="mt-0.5 block break-words text-xs leading-relaxed text-muted-foreground">{organisationName}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="min-h-11"
          onSelect={() => {
            clearPortalSession();
            router.push("/");
          }}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">logout</span>
          ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function resolveWorkspaceNavigationTitle(
  pathname: string,
  navItems: readonly WorkspaceNavItem[],
  fallback: string,
) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const closestItem = [...navItems]
    .filter((item) => normalizedPath === item.href || normalizedPath.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return closestItem?.label ?? fallback;
}

export function RoleWorkspaceShell({
  area,
  role,
  navItems,
  exactOrganisationId,
  resourceId,
  children,
}: RoleWorkspaceShellProps) {
  const pathname = usePathname();
  const { session } = usePortalSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentTitle = resolveWorkspaceNavigationTitle(pathname, navItems, ROLE_PRESENTATION[role].label);
  return (
    <PortalAccessGate
      area={area}
      exactOrganisationId={exactOrganisationId}
      resourceId={resourceId}
    >
      <div className="flex min-h-screen bg-surface-container-low">
        <aside className="fixed bottom-4 left-4 top-4 z-40 hidden w-60 flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar shadow-app-float lg:flex">
          <WorkspaceNavigation role={role} navItems={navItems} />
        </aside>
        <div className="fixed left-2 top-5 z-50 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shadow-sm" aria-label="เปิดเมนู">
                <span aria-hidden="true" className="material-symbols-outlined text-xl">menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
            >
              <SheetTitle className="sr-only">เมนูหลัก</SheetTitle>
              <WorkspaceNavigation
                role={role}
                navItems={navItems}
                onNavigate={() => setMobileOpen(false)}
                reserveCloseSpace
              />
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3 h-11 w-11 rounded-xl text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                  aria-label="ปิดเมนู"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-xl">close</span>
                </Button>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-sidebar">
          <header className="fixed left-14 right-2 top-4 z-40 flex h-14 items-center justify-between rounded-2xl border border-border bg-card px-4 shadow-sm lg:left-sidebar lg:right-4">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-foreground">{currentTitle}</h1>
              <p className="truncate text-xs text-muted-foreground">{session?.organisation.name ?? "กำลังตรวจสอบขอบเขตข้อมูล"}</p>
            </div>
            <WorkspaceAccountMenu
              displayName={session?.displayName ?? "กำลังโหลดข้อมูลบัญชี"}
              roleLabel={ROLE_PRESENTATION[role].label}
              organisationName={session?.organisation.name ?? "กำลังโหลดข้อมูลองค์กร"}
            />
          </header>
          <main className="min-w-0 flex-1 px-4 pb-10 pt-20 md:pr-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </PortalAccessGate>
  );
}
