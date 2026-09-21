import { RoleWorkspaceShell } from "@/roles/shared/components/workspace/RoleWorkspaceShell";

const superAdminNavigation = [
  { href: "/admin/dashboard", icon: "dashboard", label: "ภาพรวมการกำกับระบบ" },
  { href: "/admin/users", icon: "manage_accounts", label: "บัญชีผู้ใช้" },
  { href: "/admin/scopes", icon: "shield_person", label: "Role และ Scope" },
  { href: "/admin/organisations", icon: "account_tree", label: "โครงสร้างองค์กร" },
  { href: "/admin/terms", icon: "badge", label: "วาระผู้ดำรงตำแหน่ง" },
  { href: "/admin/integrations", icon: "hub", label: "การเชื่อมต่อระบบ" },
  { href: "/admin/audit", icon: "manage_search", label: "Audit Log" },
  { href: "/admin/settings", icon: "settings", label: "ตั้งค่าระบบ" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleWorkspaceShell area="admin" role="super_admin" navItems={superAdminNavigation}>{children}</RoleWorkspaceShell>;
}
