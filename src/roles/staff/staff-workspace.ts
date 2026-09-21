import type { WorkspaceNavItem } from "@/roles/shared/components/workspace/RoleWorkspaceShell";

const ACTION_SECTION = { id: "actions", label: "งานที่ดำเนินการได้" } as const;
const READ_ONLY_SECTION = { id: "read-only", label: "ติดตามและตรวจสอบ (ดูอย่างเดียว)" } as const;

export const STAFF_NAV_ITEMS: readonly WorkspaceNavItem[] = [
  { href: "/staff/dashboard", icon: "dashboard", label: "ภาพรวมงาน" },
  { href: "/staff/courses", icon: "menu_book", label: "หลักสูตรและรายวิชา", section: ACTION_SECTION },
  { href: "/staff/course-proposals", icon: "fact_check", label: "ตรวจคำขอรายวิชา", section: ACTION_SECTION },
  { href: "/staff/exams", icon: "quiz", label: "งานสอบ", section: ACTION_SECTION },
  { href: "/staff/requests", icon: "description", label: "คำร้อง", section: ACTION_SECTION },
  { href: "/staff/research", icon: "science", label: "งานวิจัย", section: ACTION_SECTION },
  { href: "/staff/certificates", icon: "workspace_premium", label: "ใบรับรองและเอกสาร", section: ACTION_SECTION },
  { href: "/staff/news-help", icon: "campaign", label: "ข่าวสารและ Help Center", section: ACTION_SECTION },
  { href: "/staff/finance", icon: "payments", label: "การเงิน", section: ACTION_SECTION },
  { href: "/staff/signatures", icon: "draw", label: "เตรียมเอกสารลงนาม", section: ACTION_SECTION },
  { href: "/staff/registrations", icon: "fact_check", label: "ติดตามการลงทะเบียน", section: READ_ONLY_SECTION },
] as const;
