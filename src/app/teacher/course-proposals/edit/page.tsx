import TeacherCurriculumProposalFormPage from "@/roles/teacher/features/course-proposals/TeacherCurriculumProposalFormPage";

export default async function EditTeacherCurriculumProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ proposalId?: string }>;
}) {
  const { proposalId } = await searchParams;
  return <TeacherCurriculumProposalFormPage proposalId={proposalId} />;
}
