import { RoleWorkspaceShell } from "@/roles/shared/components/workspace/RoleWorkspaceShell";

const teacherNavigation = [
  { href: "/teacher/dashboard", icon: "dashboard", label: "ภาพรวม" },
  { href: "/teacher/courses", icon: "menu_book", label: "รายวิชาที่ได้รับมอบหมาย" },
  { href: "/teacher/course-proposals", icon: "post_add", label: "คำขอสร้างรายวิชา" },
  { href: "/teacher/results", icon: "fact_check", label: "ผลการเรียนแบบผ่าน/ไม่ผ่าน" },
  { href: "/teacher/history", icon: "history", label: "ประวัติการดำเนินการ" },
] as const;

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleWorkspaceShell area="teacher" role="teacher" navItems={teacherNavigation}>
      {children}
    </RoleWorkspaceShell>
  );
}
