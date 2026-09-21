import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  createCourseProposal,
  resubmitCourseProposalRecord,
  reviewCourseProposalRecord,
} from "./course-proposal-workflow";
import { CurriculumProposalDetailsView } from "./CurriculumProposalDetailsView";
import type { CourseProposalActor, CurriculumProposalDetails } from "./model";

const teacher: CourseProposalActor = {
  userId: "teacher-001",
  userName: "อาจารย์ผู้เสนอ",
  role: "teacher",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["course:proposal"],
};

const staff: CourseProposalActor = {
  userId: "staff-001",
  userName: "เจ้าหน้าที่ผู้ตรวจ",
  role: "royal_college_staff",
  organisationId: "org-royal-college",
  resourceScopes: ["staff:central"],
};

const curriculum: CurriculumProposalDetails = {
  collegeOrSpecialty: "วิทยาลัยเภสัชบำบัด",
  curriculumNameTh: "หลักสูตรเภสัชบำบัดขั้นสูง",
  curriculumNameEn: "Advanced Pharmacotherapy Program",
  qualificationNameTh: "วุฒิบัตรสาขาเภสัชบำบัด",
  qualificationNameEn: "Diploma in Pharmacotherapy",
  responsibleUnit: "วิทยาลัยเภสัชบำบัด",
  mainInstitution: "มหาวิทยาลัยมหิดล",
  affiliatedInstitutions: "โรงพยาบาลศิริราช",
  philosophyAndObjectives: "พัฒนาสมรรถนะด้านเภสัชบำบัด",
  trainingDuration: "4 ปี",
  educationManagementSystem: "ภาคทฤษฎีและฝึกปฏิบัติ",
  credits: { total: 48, theory: 12, laboratory: 4, professionalPractice: 24, researchOrProject: 8 },
  relatedShortCourses: "",
  hourCalculationRule: "15 ชั่วโมงเท่ากับ 1 หน่วยกิต",
  applicantQualifications: "เภสัชกรที่มีใบอนุญาต",
  selectionMethod: "สอบและสัมภาษณ์",
  assessmentMethod: "ประเมินแบบ S/U",
  completionCriteria: "ผ่านการประเมินครบทุกส่วน",
  trainingProviderQualifications: "ผ่านเกณฑ์สภาเภสัชกรรม",
  trainingSiteQualifications: "มีแหล่งฝึกและอาจารย์เพียงพอ",
  notes: "หมายเหตุที่เจ้าหน้าที่ต้องเห็น",
  pharmacyCouncilAnnouncementNo: "สภภ. 12/2569",
  announcementDate: "2026-08-01",
  effectiveDate: "2026-09-01",
};

afterEach(cleanup);

describe("CurriculumProposalDetailsView", () => {
  it("shows proposer metadata, notes, and proposer evidence without repeating staff review evidence", () => {
    const submitted = createCourseProposal({
      id: "CPROP-DETAIL-001",
      actor: teacher,
      courseCode: curriculum.pharmacyCouncilAnnouncementNo,
      courseTitle: curriculum.curriculumNameTh,
      credits: curriculum.credits.total,
      rationale: curriculum.philosophyAndObjectives,
      curriculum,
      evidenceReference: "proposal-evidence:v1",
      at: "2026-08-18T01:00:00.000Z",
    });
    const reviewed = reviewCourseProposalRecord({
      proposal: submitted,
      actor: staff,
      decision: "needs_revision",
      reason: "กรุณาปรับข้อมูล",
      evidenceReference: "staff-review-evidence:private",
      at: "2026-08-18T02:00:00.000Z",
    });
    const resubmitted = resubmitCourseProposalRecord({
      proposal: reviewed,
      actor: teacher,
      courseCode: curriculum.pharmacyCouncilAnnouncementNo,
      courseTitle: curriculum.curriculumNameTh,
      credits: curriculum.credits.total,
      rationale: curriculum.philosophyAndObjectives,
      curriculum,
      reason: "ปรับเกณฑ์สำเร็จตามข้อเสนอแนะแล้ว",
      evidenceReference: "proposal-evidence:v2",
      at: "2026-08-18T03:00:00.000Z",
    });

    render(<CurriculumProposalDetailsView proposal={resubmitted} />);

    expect(screen.getByText("CPROP-DETAIL-001")).toBeTruthy();
    expect(screen.getByText("หมายเหตุที่เจ้าหน้าที่ต้องเห็น")).toBeTruthy();
    expect(screen.getByText("proposal-evidence:v1")).toBeTruthy();
    expect(screen.getByText("proposal-evidence:v2")).toBeTruthy();
    expect(screen.getByText("ปรับเกณฑ์สำเร็จตามข้อเสนอแนะแล้ว")).toBeTruthy();
    expect(screen.queryByText("staff-review-evidence:private")).toBeNull();
    expect(screen.queryByText("กรุณาปรับข้อมูล")).toBeNull();
  });
});
