import { RoleWorkspaceShell } from "@/roles/shared/components/workspace/RoleWorkspaceShell";
import { INSTITUTION_NAV_ITEMS } from "@/roles/institution/institution-workspace";

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleWorkspaceShell area="institution" role="institution_admin" navItems={INSTITUTION_NAV_ITEMS}>
      {children}
    </RoleWorkspaceShell>
  );
}
