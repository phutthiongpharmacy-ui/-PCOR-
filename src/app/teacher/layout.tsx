import { RoleWorkspaceShell } from "@/roles/shared/components/workspace/RoleWorkspaceShell";
import { TEACHER_NAV_ITEMS } from "@/roles/teacher/teacher-workspace";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleWorkspaceShell area="teacher" role="teacher" navItems={TEACHER_NAV_ITEMS}>
      {children}
    </RoleWorkspaceShell>
  );
}
