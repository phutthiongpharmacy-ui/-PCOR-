import type {
  CourseProposal,
  CourseProposalHistoryEntry,
  CurriculumProposalDetails,
} from "./model";

interface DetailItem {
  label: string;
  value: string | number;
}

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function formatThaiDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function DetailGroup({ title, items }: { title: string; items: DetailItem[] }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
              {item.value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function curriculumGroups(curriculum: CurriculumProposalDetails) {
  return [
    {
      title: "ข้อมูลหลักสูตร",
      items: [
        { label: "วิทยาลัย / สาขาเฉพาะทาง", value: curriculum.collegeOrSpecialty },
        { label: "หน่วยงานรับผิดชอบ", value: curriculum.responsibleUnit },
        { label: "ชื่อหลักสูตรภาษาไทย", value: curriculum.curriculumNameTh },
        { label: "ชื่อหลักสูตรภาษาอังกฤษ", value: curriculum.curriculumNameEn },
        { label: "วุฒิหรือประกาศนียบัตรภาษาไทย", value: curriculum.qualificationNameTh },
        { label: "วุฒิหรือประกาศนียบัตรภาษาอังกฤษ", value: curriculum.qualificationNameEn },
        { label: "สถาบันหลัก", value: curriculum.mainInstitution },
        { label: "สถาบันสมทบ", value: curriculum.affiliatedInstitutions },
      ],
    },
    {
      title: "โครงสร้างการฝึกอบรม",
      items: [
        { label: "ปรัชญาและวัตถุประสงค์", value: curriculum.philosophyAndObjectives },
        { label: "ระยะเวลาฝึกอบรม", value: curriculum.trainingDuration },
        { label: "ระบบการจัดการศึกษา", value: curriculum.educationManagementSystem },
        { label: "หน่วยกิตรวม", value: curriculum.credits.total },
        { label: "หน่วยกิตภาคทฤษฎี", value: curriculum.credits.theory },
        { label: "หน่วยกิตภาคปฏิบัติการ", value: curriculum.credits.laboratory },
        { label: "หน่วยกิตฝึกปฏิบัติวิชาชีพ", value: curriculum.credits.professionalPractice },
        { label: "หน่วยกิตวิจัย / โครงงาน", value: curriculum.credits.researchOrProject },
        { label: "หลักสูตรระยะสั้นที่เกี่ยวข้อง", value: curriculum.relatedShortCourses },
        { label: "หลักเกณฑ์การคำนวณชั่วโมง", value: curriculum.hourCalculationRule },
      ],
    },
    {
      title: "การรับเข้าและการประเมิน",
      items: [
        { label: "คุณสมบัติผู้สมัคร", value: curriculum.applicantQualifications },
        { label: "วิธีคัดเลือก", value: curriculum.selectionMethod },
        { label: "วิธีประเมินผล", value: curriculum.assessmentMethod },
        { label: "เกณฑ์สำเร็จการฝึกอบรม", value: curriculum.completionCriteria },
        { label: "คุณสมบัติของหน่วยงานจัดฝึกอบรม", value: curriculum.trainingProviderQualifications },
        { label: "คุณสมบัติของแหล่งฝึก", value: curriculum.trainingSiteQualifications },
      ],
    },
    {
      title: "ประกาศและข้อมูลเพิ่มเติม",
      items: [
        { label: "เลขที่ประกาศสภาเภสัชกรรม", value: curriculum.pharmacyCouncilAnnouncementNo },
        { label: "วันที่ประกาศ", value: formatThaiDate(curriculum.announcementDate) },
        { label: "วันที่มีผล", value: formatThaiDate(curriculum.effectiveDate) },
        { label: "หมายเหตุ", value: curriculum.notes },
      ],
    },
  ];
}

const proposerActionLabel: Record<Extract<CourseProposalHistoryEntry["action"], "submitted" | "resubmitted">, string> = {
  submitted: "ยื่นคำขอ",
  resubmitted: "ส่งข้อมูลแก้ไข",
};

type ProposerHistoryEntry = CourseProposalHistoryEntry & {
  action: "submitted" | "resubmitted";
};

function isProposerHistoryEntry(
  entry: CourseProposalHistoryEntry,
): entry is ProposerHistoryEntry {
  return entry.action === "submitted" || entry.action === "resubmitted";
}

function ProposerSubmissionHistory({ proposal }: { proposal: CourseProposal }) {
  const submissions = proposal.history.filter(isProposerHistoryEntry);

  if (!submissions.length) return null;

  return (
    <section className="space-y-3 py-5 first:pt-0 last:pb-0">
      <h3 className="text-sm font-semibold text-foreground">ประวัติข้อมูลจากผู้เสนอ</h3>
      <ol className="space-y-3">
        {submissions.map((entry) => (
          <li key={entry.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-foreground">{proposerActionLabel[entry.action]}</p>
              <time className="text-xs text-muted-foreground" dateTime={entry.occurredAt}>
                {formatThaiDateTime(entry.occurredAt)}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{entry.reason}</p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">ผู้ส่งข้อมูล</dt>
                <dd className="mt-1 text-sm text-foreground">{entry.actor.userName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">หลักฐานอ้างอิงจากผู้เสนอ</dt>
                <dd className="mt-1 break-words text-sm text-foreground">
                  {entry.evidenceReference || "—"}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CurriculumProposalDetailsView({ proposal }: { proposal: CourseProposal }) {
  return (
    <div className="divide-y divide-border">
      <div className="py-5 first:pt-0 last:pb-0">
        <DetailGroup
          title="ข้อมูลคำขอ"
          items={[
            { label: "รหัสคำขอ", value: proposal.id },
            { label: "ผู้เสนอ", value: proposal.proposerName },
            { label: "ยื่นครั้งแรก", value: formatThaiDateTime(proposal.submittedAt) },
            { label: "อัปเดตล่าสุด", value: formatThaiDateTime(proposal.updatedAt) },
          ]}
        />
      </div>
      {proposal.curriculum ? (
        curriculumGroups(proposal.curriculum).map((group) => (
          <div key={group.title} className="py-5 first:pt-0 last:pb-0">
            <DetailGroup title={group.title} items={group.items} />
          </div>
        ))
      ) : (
        <div className="py-5 first:pt-0 last:pb-0">
          <div className="space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
            <p className="font-medium text-foreground">ข้อมูลคำขอรูปแบบเดิม</p>
            <p className="text-muted-foreground">{proposal.courseCode} · {proposal.courseTitle}</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{proposal.rationale}</p>
          </div>
        </div>
      )}
      <ProposerSubmissionHistory proposal={proposal} />
    </div>
  );
}
