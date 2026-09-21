import type { WorkspaceNavItem } from "@/roles/shared/components/workspace/RoleWorkspaceShell";

export const TEACHER_NAV_ITEMS = [
  { href: "/teacher/dashboard", icon: "dashboard", label: "ภาพรวม" },
  { href: "/teacher/courses", icon: "menu_book", label: "รายวิชาที่ได้รับมอบหมาย" },
  { href: "/teacher/schedule", icon: "calendar_month", label: "ตารางสอน" },
  { href: "/teacher/course-proposals", icon: "post_add", label: "คำขอหลักสูตร" },
  { href: "/teacher/results", icon: "fact_check", label: "ผลการเรียนแบบผ่าน/ไม่ผ่าน" },
  { href: "/teacher/history", icon: "history", label: "ประวัติการดำเนินการ" },
] as const satisfies readonly WorkspaceNavItem[];
