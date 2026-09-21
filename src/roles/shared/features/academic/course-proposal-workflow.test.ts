import { describe, expect, it } from "vitest";

import {
  createCourseProposal,
  resubmitCourseProposalRecord,
  reviewCourseProposalRecord,
} from "./course-proposal-workflow";
import { DEFAULT_COURSE_PROPOSALS } from "./mock-data";
import {
  formatSubjectResultValue,
  type CourseProposalActor,
  type CurriculumProposalDetails,
} from "./model";

const teacher: CourseProposalActor = {
  userId: "teacher-001",
  userName: "อาจารย์ทดสอบ",
  role: "teacher",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["course:proposal"],
};

const staff: CourseProposalActor = {
  userId: "staff-001",
  userName: "เจ้าหน้าที่ทดสอบ",
  role: "royal_college_staff",
  organisationId: "org-royal-college",
  resourceScopes: ["staff:central"],
};

const curriculum: CurriculumProposalDetails = {
  collegeOrSpecialty: "วิทยาลัยเภสัชบำบัด",
  curriculumNameTh: "หลักสูตรการฝึกอบรมเภสัชบำบัดขั้นสูง",
  curriculumNameEn: "Advanced Pharmacotherapy Training Program",
  qualificationNameTh: "วุฒิบัตรสาขาเภสัชบำบัด",
  qualificationNameEn: "Diploma in Pharmacotherapy",
  responsibleUnit: "วิทยาลัยเภสัชบำบัด",
  mainInstitution: "มหาวิทยาลัยมหิดล",
  affiliatedInstitutions: "โรงพยาบาลศิริราช",
  philosophyAndObjectives: "พัฒนาสมรรถนะด้านการดูแลผู้ป่วยอย่างเป็นระบบ",
  trainingDuration: "4 ปี",
  educationManagementSystem: "ภาคทฤษฎี การฝึกปฏิบัติ และงานวิจัย",
  credits: {
    total: 48,
    theory: 12,
    laboratory: 4,
    professionalPractice: 24,
    researchOrProject: 8,
  },
  relatedShortCourses: "การติดตามระดับยาในเลือด",
  hourCalculationRule: "ภาคทฤษฎี 15 ชั่วโมงเท่ากับ 1 หน่วยกิต",
  applicantQualifications: "เภสัชกรที่มีใบอนุญาตประกอบวิชาชีพ",
  selectionMethod: "ตรวจคุณสมบัติ สอบข้อเขียน และสัมภาษณ์",
  assessmentMethod: "ประเมินผล S/U ตามสมรรถนะและผลงานวิจัย",
  completionCriteria: "ผ่านรายวิชา การฝึกปฏิบัติ และการประเมินขั้นสุดท้าย",
  trainingProviderQualifications: "มีคณะกรรมการบริหารหลักสูตรตามเกณฑ์",
  trainingSiteQualifications: "มีจำนวนผู้ป่วยและอาจารย์ผู้ฝึกเพียงพอ",
  notes: "ใช้เป็นข้อมูลทดสอบ",
  pharmacyCouncilAnnouncementNo: "สภภ. 12/2569",
  announcementDate: "2026-08-01",
  effectiveDate: "2026-09-01",
};

function submitted() {
  return createCourseProposal({
    id: "CPROP-TEST-001",
    actor: teacher,
    courseCode: "TEST-501",
    courseTitle: "รายวิชาทดสอบ",
    credits: 3,
    rationale: "ทดสอบการยื่นข้อเสนอรายวิชา",
    evidenceReference: "proposal-brief:TEST-501",
    at: "2026-08-18T01:00:00.000Z",
  });
}

describe("course proposal workflow", () => {
  it("creates a submitted proposal with an immutable actor and history snapshot", () => {
    const proposal = submitted();

    expect(proposal).toMatchObject({
      proposerId: teacher.userId,
      institutionId: teacher.organisationId,
      status: "submitted",
    });
    expect(proposal.history).toHaveLength(1);
    expect(proposal.history[0]).toMatchObject({
      action: "submitted",
      toStatus: "submitted",
      evidenceReference: "proposal-brief:TEST-501",
    });
    expect(proposal.history[0].actor).not.toBe(teacher);
    expect(proposal.history[0].actor.resourceScopes).not.toBe(teacher.resourceScopes);
  });

  it("stores a validated curriculum payload without sharing mutable credit data", () => {
    const proposal = createCourseProposal({
      id: "CPROP-CURRICULUM-001",
      actor: teacher,
      courseCode: curriculum.pharmacyCouncilAnnouncementNo,
      courseTitle: curriculum.curriculumNameTh,
      credits: curriculum.credits.total,
      rationale: curriculum.philosophyAndObjectives,
      curriculum,
      at: "2026-08-18T01:00:00.000Z",
    });

    expect(proposal.curriculum).toEqual(curriculum);
    expect(proposal.curriculum).not.toBe(curriculum);
    expect(proposal.curriculum?.credits).not.toBe(curriculum.credits);
  });

  it("rejects inconsistent curriculum credit totals and effective dates", () => {
    expect(() => createCourseProposal({
      id: "CPROP-CURRICULUM-002",
      actor: teacher,
      courseCode: curriculum.pharmacyCouncilAnnouncementNo,
      courseTitle: curriculum.curriculumNameTh,
      credits: 10,
      rationale: curriculum.philosophyAndObjectives,
      curriculum: {
        ...curriculum,
        credits: { ...curriculum.credits, total: 10 },
      },
    })).toThrow("Curriculum credit categories cannot exceed total credits");

    expect(() => createCourseProposal({
      id: "CPROP-CURRICULUM-003",
      actor: teacher,
      courseCode: curriculum.pharmacyCouncilAnnouncementNo,
      courseTitle: curriculum.curriculumNameTh,
      credits: curriculum.credits.total,
      rationale: curriculum.philosophyAndObjectives,
      curriculum: {
        ...curriculum,
        effectiveDate: "2026-07-01",
      },
    })).toThrow("Effective date cannot be earlier than announcement date");
  });

  it.each(["needs_revision", "passed", "rejected"] as const)(
    "records a %s review without mutating prior history",
    (decision) => {
      const before = submitted();
      const reviewed = reviewCourseProposalRecord({
        proposal: before,
        actor: staff,
        decision,
        reason: `เหตุผลสำหรับ ${decision}`,
        evidenceReference: `review:${decision}`,
        at: "2026-08-18T02:00:00.000Z",
      });

      expect(reviewed.status).toBe(decision);
      expect(reviewed.latestReview).toMatchObject({ decision, note: `เหตุผลสำหรับ ${decision}` });
      expect(reviewed.history).toHaveLength(2);
      expect(reviewed.history[1]).toMatchObject({
        action: "reviewed",
        fromStatus: "submitted",
        toStatus: decision,
      });
      expect(before.status).toBe("submitted");
      expect(before.history).toHaveLength(1);
    },
  );

  it("rejects an invalid runtime review decision", () => {
    expect(() => reviewCourseProposalRecord({
      proposal: submitted(),
      actor: staff,
      decision: "submitted" as never,
      reason: "สถานะนี้ไม่ใช่ผลการพิจารณา",
    })).toThrow("Course proposal review decision is invalid");
  });

  it("resubmits only a returned proposal and retains the complete prior history", () => {
    const returned = reviewCourseProposalRecord({
      proposal: submitted(),
      actor: staff,
      decision: "needs_revision",
      reason: "เพิ่มผลลัพธ์การเรียนรู้",
      evidenceReference: "review:return",
      at: "2026-08-18T02:00:00.000Z",
    });
    const resubmitted = resubmitCourseProposalRecord({
      proposal: returned,
      actor: teacher,
      courseCode: "TEST-501",
      courseTitle: "รายวิชาทดสอบ ฉบับปรับปรุง",
      credits: 3,
      rationale: "เพิ่มผลลัพธ์การเรียนรู้และวิธีประเมินแล้ว",
      reason: "ปรับตามข้อเสนอแนะของผู้ตรวจ",
      evidenceReference: "proposal-brief:TEST-501:v2",
      at: "2026-08-18T03:00:00.000Z",
    });

    expect(resubmitted).toMatchObject({ status: "submitted", courseTitle: "รายวิชาทดสอบ ฉบับปรับปรุง" });
    expect(resubmitted.history.map((entry) => entry.action)).toEqual([
      "submitted",
      "reviewed",
      "resubmitted",
    ]);
    expect(returned.status).toBe("needs_revision");
    expect(() => resubmitCourseProposalRecord({
      proposal: submitted(),
      actor: teacher,
      courseCode: "TEST-501",
      courseTitle: "รายวิชาทดสอบ",
      credits: 3,
      rationale: "รายละเอียด",
      reason: "แก้ไข",
      evidenceReference: "proposal-brief:test",
    })).toThrow("Only a course proposal needing revision can be resubmitted");
  });

  it("seeds all four synthetic statuses across two proposers", () => {
    expect(new Set(DEFAULT_COURSE_PROPOSALS.map((proposal) => proposal.status))).toEqual(
      new Set(["submitted", "needs_revision", "passed", "rejected"]),
    );
    expect(new Set(DEFAULT_COURSE_PROPOSALS.map((proposal) => proposal.proposerId))).toEqual(
      new Set(["teacher-001", "teacher-002"]),
    );
  });
});

describe("formatSubjectResultValue", () => {
  it("renders clear Thai S/U labels and an em dash for no result", () => {
    expect(formatSubjectResultValue("S")).toBe("ผ่าน (S)");
    expect(formatSubjectResultValue("U")).toBe("ไม่ผ่าน (U)");
    expect(formatSubjectResultValue(undefined)).toBe("—");
  });
});
