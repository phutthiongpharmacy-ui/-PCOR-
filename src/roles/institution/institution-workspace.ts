import type { WorkspaceNavItem } from "@/roles/shared/components/workspace/RoleWorkspaceShell";

const TEACHING_SECTION = { id: "teaching", label: "การเรียนการสอน" } as const;
const LEARNER_SECTION = { id: "learners", label: "ผู้เรียนและผลการศึกษา" } as const;
const ADMISSIONS_SECTION = { id: "admissions", label: "งานรับสมัคร" } as const;
const SUPPORT_SECTION = { id: "support", label: "งานสนับสนุน" } as const;

export const INSTITUTION_NAV_ITEMS: readonly WorkspaceNavItem[] = [
  { href: "/institution/dashboard", icon: "dashboard", label: "ภาพรวมสถาบัน" },
  { href: "/institution/courses", icon: "menu_book", label: "รายวิชาที่เปิดสอน", section: TEACHING_SECTION },
  { href: "/institution/teachers", icon: "co_present", label: "อาจารย์", section: TEACHING_SECTION },
  { href: "/institution/assignments", icon: "assignment_ind", label: "มอบหมายการสอน", section: TEACHING_SECTION },
  { href: "/institution/students", icon: "school", label: "ผู้เข้ารับการฝึกอบรม", section: LEARNER_SECTION },
  { href: "/institution/registrations", icon: "how_to_reg", label: "ติดตามสถานะลงทะเบียน", section: LEARNER_SECTION },
  { href: "/institution/results", icon: "fact_check", label: "ติดตามผลการเรียน", section: LEARNER_SECTION },
  { href: "/institution/activity-transcript", icon: "history_edu", label: "Activity Transcript", section: LEARNER_SECTION },
  { href: "/institution/admissions", icon: "person_check", label: "อนุมัติการสมัครของผู้เรียน", section: ADMISSIONS_SECTION },
  { href: "/institution/admission-exams", icon: "event_available", label: "เปิดสอบ", section: ADMISSIONS_SECTION },
  { href: "/institution/admission-results", icon: "workspace_premium", label: "ประกาศผลสอบ", section: ADMISSIONS_SECTION },
  { href: "/institution/finance", icon: "payments", label: "การเงิน", section: SUPPORT_SECTION },
] as const;
