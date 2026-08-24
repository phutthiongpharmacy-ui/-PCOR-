"use client";

import { Fragment, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { institutionInfo, notificationsData } from "@/roles/shared/data";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { clearPortalSession } from "@/roles/shared/features/roles/mock-login";
import { usePortalSession } from "@/roles/shared/features/roles/use-portal-session";
import { ROLE_PRESENTATION } from "@/roles/shared/features/roles/access-model";
import { useMemberNotifications } from "@/roles/member/features/notifications/member-notifications";

const adminNotificationsData: typeof notificationsData = [
  {
    id: 1,
    title: "การสมัครสอบ",
    message: "มีใบสมัครสอบใหม่ 2 รายการรอการตรวจสอบ",
    time: "15 นาทีที่แล้ว",
    isRead: false,
    type: "warning",
  },
  {
    id: 2,
    title: "คำร้อง",
    message: "มีคำร้องใหม่ 5 รายการรอการพิจารณา",
    time: "1 ชั่วโมงที่แล้ว",
    isRead: false,
    type: "info",
  },
  {
    id: 3,
    title: "งานวิจัย",
    message: "มีผลงานวิจัย 1 รายการส่งเข้ามาเพื่อตรวจสอบ",
    time: "เมื่อวานนี้",
    isRead: true,
    type: "success",
  },
];

const memberNavigationTitleMap: Record<string, string> = {
  "/member/dashboard": "ภาพรวม",
  "/member/students": "Pharmacist Profile",
  "/member/schedule": "ตารางกิจกรรมการฝึกอบรม",
  "/member/registration": "สถานะการลงทะเบียน",
  "/member/registration/courses": "ลงทะเบียนเรียน",
  "/member/results": "ผลการประเมินรายวิชา",
  "/member/finance": "การชำระเงิน",
  "/member/finance/channels": "ช่องทางการชำระเงิน",
  "/member/requests": "คำร้องของฉัน",
  "/member/research": "ค้นหางานวิจัยและบทความวิชาการ",
  "/member/admission": "ระบบสมัครสอบหนังสืออนุมัติ / วุฒิบัตร",
  "/member/passport": "Pharmacist Profile",
  "/member/cpd": "ระบบสะสมหน่วยกิตการศึกษาต่อเนื่อง (CPD)",
  "/member/pathway": "เส้นทางการศึกษา (Learning Pathway)",
  "/member/news": "ข่าวสารและประกาศ",
  "/member/notifications": "การแจ้งเตือน",
  "/member/help": "ศูนย์ช่วยเหลือ",
  "/member/settings": "การตั้งค่า",
  "/member/programs": "หลักสูตรและรายวิชา",
  "/member/programs/by-college": "รายการแยกตามวิทยาลัย",
  "/member/programs/all": "รายวิชาและหลักสูตรระยะสั้น",
};

export function resolveMemberNavigationTitle(pathname: string) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const exactTitle = memberNavigationTitleMap[normalizedPath];
  if (exactTitle) return exactTitle;

  const parentRoute = Object.keys(memberNavigationTitleMap)
    .filter((route) => normalizedPath.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];

  return parentRoute ? memberNavigationTitleMap[parentRoute] : "พื้นที่สมาชิก";
}

const breadcrumbMap: Record<string, { trail: { label: string; href: string }[]; current: string }> = {
  "/member/dashboard": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "ภาพรวม" },
  "/member/students": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "ข้อมูลของฉัน" },
  "/member/schedule": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "ตารางเรียน" },
  "/member/registration": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "สถานะการลงทะเบียน" },
  "/member/registration/courses": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }, { label: "สถานะการลงทะเบียน", href: "/member/registration" }], current: "ลงทะเบียนเรียน" },
  "/member/results": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "ผลการเรียนแบบผ่าน/ไม่ผ่าน" },
  "/member/finance": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "การเงิน" },
  "/member/finance/channels": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }, { label: "การเงิน", href: "/member/finance" }], current: "ช่องทางการชำระเงิน" },
  "/member/requests": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "คำร้องของฉัน" },
  "/member/research": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "ฐานข้อมูลงานวิจัย" },
  "/member/admission": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "สมัครสอบออนไลน์" },
  "/member/passport": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "Pharmacist Profile" },
  "/member/cpd": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "หน่วยกิตการศึกษาต่อเนื่อง" },
  "/member/pathway": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "เส้นทางการศึกษา" },
  "/member/news": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "ข่าวสารและประกาศ" },
  "/member/help": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "ศูนย์ช่วยเหลือ" },
  "/member/settings": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "ตั้งค่าบัญชีและความปลอดภัย" },
  "/member/programs": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }], current: "หลักสูตรและรายวิชา" },
  "/member/programs/by-college": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }, { label: "หลักสูตร", href: "/member/programs" }], current: "แยกตามวิทยาลัย" },
  "/member/programs/all": { trail: [{ label: "หน้าหลัก", href: "/member/dashboard" }, { label: "หลักสูตร", href: "/member/programs" }], current: "รายวิชาทั้งหมด" },
  "/admin/dashboard": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "ภาพรวม" },
  "/admin/admissions": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "อนุมัติการสมัครสอบ" },
  "/admin/requests": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "ตรวจสอบคำร้อง" },
  "/admin/research": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "ตรวจสอบงานวิจัย" },
  "/admin/registrations": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "อนุมัติการลงทะเบียน" },
  "/admin/finance": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "ตรวจสอบการเงิน" },
  "/admin/courses": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "จัดการรายวิชา" },
  "/admin/courses/create": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }, { label: "จัดการรายวิชา", href: "/admin/courses" }], current: "ยื่นขอเปิดรายวิชาใหม่" },
  "/admin/programs": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "จัดการหลักสูตร" },
  "/admin/students": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "รายชื่อผู้เข้าศึกษา" },
  "/admin/exams": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "บันทึกผลสอบ" },
  "/admin/certificates": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "ออกวุฒิบัตร" },
  "/admin/terms": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "จัดการวาระประธาน" },
  "/admin/settings": { trail: [{ label: "แอดมิน", href: "/admin/dashboard" }], current: "ตั้งค่าระบบ" },
};


export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const memberNotificationStore = useMemberNotifications();
  const { session } = usePortalSession();
  const isAdminRoute = pathname.startsWith("/admin");
  const activeProfile = {
    title: session?.displayName ?? "ข้อมูลผู้ดูแลระบบ",
    description: session ? `${ROLE_PRESENTATION[session.role].label} • ${session.organisation.name}` : "กำลังโหลดข้อมูลผู้ดูแลระบบ",
  };
  const activeNotifications = isAdminRoute
    ? adminNotificationsData.map((item) => ({ ...item, destination: getNotificationDestination(item.title) }))
    : memberNotificationStore.notifications.map((item) => ({
        ...item,
        type: item.kind,
        time: new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(item.createdAt)),
      }));
  const unreadNotificationCount = activeNotifications.filter((notification) => !notification.isRead).length;
  const memberNavigationTitle = resolveMemberNavigationTitle(pathname);
  const displayName = session?.displayName ?? "กำลังโหลดข้อมูลบัญชี";
  const organisationName = session?.organisation.name ?? "กำลังโหลดข้อมูลสถาบัน";
  const accountDescription = isAdminRoute && session
    ? `${ROLE_PRESENTATION[session.role].label} • ${organisationName}`
    : organisationName;
  const adminStudentDetailMatch = pathname.match(/^\/admin\/students\/([^/]+)\/?$/);

  let bc = adminStudentDetailMatch
    ? {
        trail: [
          { label: "แอดมิน", href: "/admin/dashboard" },
          { label: "รายชื่อผู้เข้าศึกษา", href: "/admin/students" },
        ],
        current: decodeURIComponent(adminStudentDetailMatch[1]),
      }
    : breadcrumbMap[pathname];
  if (!bc) {
    const keys = Object.keys(breadcrumbMap).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (pathname.startsWith(key)) { bc = breadcrumbMap[key]; break; }
    }
  }
  if (!bc) {
    bc = {
      trail: [{
        label: "หน้าหลัก",
        href: "/member/dashboard",
      }],
      current: "",
    };
  }

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchText.trim()) {
      toast.info(`ค้นหา: "${searchText}"`, { description: "ฟีเจอร์ค้นหาทั้งระบบอยู่ระหว่างการพัฒนา" });
      setSearchText("");
    }
  };

  function getNotificationDestination(title: string) {
    if (title === "การเงิน") return isAdminRoute ? "/admin/finance" : "/member/finance";
    if (title === "คำร้อง") return isAdminRoute ? "/admin/requests" : "/member/requests";
    if (title === "การสมัครสอบ") return "/admin/admissions";
    if (title === "งานวิจัย") return "/admin/research";
    return isAdminRoute ? "/admin/dashboard" : "/member/news";
  }

  return (
    <header
      className={cn(
        "fixed left-14 right-2 top-4 z-40 flex h-14 items-center rounded-2xl px-2 shadow-sm sm:px-3 md:left-sidebar md:right-4 md:px-4",
        "border border-border bg-card",
      )}
    >
      {/* Breadcrumbs */}
      {isAdminRoute && <Breadcrumb>
        <BreadcrumbList className="text-sm">
          {bc.trail.map((item, i) => (
            <Fragment key={`${item.href}-${i}`}>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <span className="material-symbols-outlined text-sm text-muted-foreground/50">chevron_right</span>
              </BreadcrumbSeparator>
            </Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-primary text-sm">{bc.current}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>}

      {!isAdminRoute && (
        <div className="min-w-0 flex-1 px-1 sm:px-2">
          <h1 className="truncate text-sm font-semibold text-foreground">
            {memberNavigationTitle}
          </h1>
        </div>
      )}

      {/* Right actions */}
      <div
        aria-label="การทำงานของผู้ใช้"
        role="group"
        className={cn("ml-auto flex items-center gap-1.5", isAdminRoute ? "min-w-0" : "shrink-0")}
      >
        {/* Search remains an internal administration utility. */}
        {isAdminRoute && (
          <div className="hidden sm:flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 h-7 mr-1">
            <span className="material-symbols-outlined text-base text-muted-foreground">search</span>
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleSearch}
              className="w-32 lg:w-44 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        )}

        {/* Notification */}
        <DropdownMenu open={isNotifOpen} onOpenChange={setIsNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-11 w-11 rounded-xl"
              aria-label={`การแจ้งเตือน${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} รายการใหม่)` : ""}`}
            >
              <span aria-hidden="true" className={cn("material-symbols-outlined text-xl text-muted-foreground", isNotifOpen && "fill text-foreground")}>notifications</span>
              {unreadNotificationCount > 0 && (
                <span aria-hidden="true" className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-3xs font-semibold leading-none text-destructive-foreground ring-2 ring-card">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            aria-label="เมนูการแจ้งเตือน"
            className="w-[calc(100vw-1rem)] max-w-80"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">การแจ้งเตือน</span>
              {unreadNotificationCount > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-2xs">{unreadNotificationCount} ใหม่</Badge>
              )}
            </div>
            <div className="custom-scrollbar max-h-[300px] overflow-y-auto">
              {activeNotifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</p>
              ) : activeNotifications.map(notif => (
                <DropdownMenuItem
                  key={notif.id}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-3 rounded-none p-4 transition-colors hover:bg-muted/50 focus:bg-muted/50",
                    !notif.isRead && "bg-primary/5",
                  )}
                  onSelect={() => {
                    setIsNotifOpen(false);
                    if (!isAdminRoute) memberNotificationStore.markRead(String(notif.id));
                    router.push(notif.destination);
                  }}
                >
                  <div className={`${notif.type === 'warning' ? 'bg-destructive/10' : notif.type === 'success' ? 'bg-success-soft' : 'bg-primary/10'} mt-0.5 flex-shrink-0 rounded-full p-2`}>
                    <span aria-hidden="true" className={`material-symbols-outlined ${notif.type === 'warning' ? 'text-destructive' : notif.type === 'success' ? 'text-success-on-soft' : 'text-primary'} text-base`}>
                      {notif.type === 'warning' ? 'warning' : notif.type === 'success' ? 'check_circle' : 'info'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-sm font-medium text-foreground">{notif.title}</p>
                      {!notif.isRead && <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-3xs">ใหม่</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notif.message}</p>
                    <p className="mt-2 text-2xs text-muted-foreground">{notif.time}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
            <div className="border-t p-1">
              {!isAdminRoute && (
                <DropdownMenuItem className="min-h-11 justify-center text-xs font-medium text-primary" onSelect={() => { setIsNotifOpen(false); router.push("/member/notifications"); }}>
                  ดูการแจ้งเตือนทั้งหมด
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                disabled={unreadNotificationCount === 0}
                className="min-h-11 justify-center text-xs"
                onSelect={() => {
                  setIsNotifOpen(false);
                  if (isAdminRoute) toast.success("อ่านทั้งหมดแล้ว");
                  else memberNotificationStore.markAllRead();
                }}
              >
                ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-11 w-11 rounded-xl",
            isAdminRoute ? "inline-flex" : "hidden sm:inline-flex",
            pathname.startsWith("/member/help") && "bg-muted text-foreground",
          )}
          aria-label="ศูนย์ช่วยเหลือ"
          onClick={() => {
            if (isAdminRoute) {
              toast.info("ศูนย์ช่วยเหลือ", {
                description: `ติดต่อ: ${institutionInfo.emails.general} | โทร: ${institutionInfo.phone} ${institutionInfo.phoneExtensions["ราชวิทยาลัย"]}`,
              });
              return;
            }
            router.push("/member/help");
          }}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl text-muted-foreground">help</span>
        </Button>

        <div aria-hidden="true" className={cn("mx-0.5 h-6 w-px bg-border", !isAdminRoute && "hidden sm:block")} />

        {/* Account */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-11 max-w-56 min-w-0 gap-2 rounded-xl px-1.5 sm:pr-2.5"
              aria-label={`เมนูบัญชีผู้ใช้ของ ${displayName}`}
            >
              <Avatar className="h-8 w-8">
                {!isAdminRoute && <AvatarImage src="/somchai_profile.png" alt="" />}
                <AvatarFallback>{displayName.trim().slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className={cn(
                "min-w-0 max-w-36 text-left lg:max-w-52",
                isAdminRoute ? "hidden sm:block" : "hidden lg:block",
              )}>
                <span className="block truncate text-sm font-medium text-foreground">{displayName}</span>
                <span className="block truncate text-2xs font-normal text-muted-foreground">{organisationName}</span>
              </span>
              <span className={cn(isAdminRoute ? "hidden sm:block" : "hidden lg:block")}>
                <span aria-hidden="true" className="material-symbols-outlined text-base text-muted-foreground">expand_more</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            aria-label="เมนูบัญชีผู้ใช้"
            className="w-72 max-w-[calc(100vw-1rem)] text-sm"
          >
            <DropdownMenuLabel className="p-3 font-normal">
              <span className="flex min-w-0 items-start gap-3">
                <Avatar className="h-10 w-10">
                  {!isAdminRoute && <AvatarImage src="/somchai_profile.png" alt="" />}
                  <AvatarFallback>{displayName.trim().slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold leading-snug text-foreground">{displayName}</span>
                  <span className="mt-1 block line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground">{accountDescription}</span>
                </span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isAdminRoute && (
              <DropdownMenuItem className="min-h-11 sm:hidden" onSelect={() => router.push("/member/help")}>
                <span aria-hidden="true" className="material-symbols-outlined text-base">help</span>
                ศูนย์ช่วยเหลือ
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="min-h-11" onSelect={() => isAdminRoute
              ? toast.info(activeProfile.title, { description: activeProfile.description })
              : router.push("/member/passport")}>
              <span aria-hidden="true" className="material-symbols-outlined text-base">person</span>
              Pharmacist Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={() => router.push(isAdminRoute ? "/admin/settings" : "/member/settings")}>
              <span aria-hidden="true" className="material-symbols-outlined text-base">settings</span>
              การตั้งค่าบัญชี
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" className="min-h-11" onSelect={() => { clearPortalSession(); router.push("/"); }}>
              <span aria-hidden="true" className="material-symbols-outlined text-base">logout</span>
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
