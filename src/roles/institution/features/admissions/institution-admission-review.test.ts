import { describe, expect, it } from "vitest";

import type { Admission } from "@/providers/mock-db-provider";
import type { ScopedAcademicActor } from "@/roles/shared/features/academic";

import {
  institutionAdmissionApprovalIssue,
  orderInstitutionAdmissionsBySubmissionTime,
  reviewInstitutionAdmissionRecord,
  selectInstitutionAdmissions,
} from "./institution-admission-review";

const sirirajActor: ScopedAcademicActor = {
  userId: "institution-admin-001",
  userName: "ผู้ดูแลสถาบันทดสอบ",
  role: "institution_admin",
  organisationId: "org-inst-siriraj",
  resourceScopes: ["institution:org-inst-siriraj"],
};

function admission(overrides: Partial<Admission> = {}): Admission {
  return {
    id: "APP-TEST-001",
    name: "ภก. ผู้สมัคร ทดสอบ",
    license: "ภ.12345",
    program: "เภสัชบำบัด",
    date: "24 มิ.ย. 2569",
    institutionId: "org-inst-siriraj",
    applicationType: "exam",
    status: "pending",
    documents: [
      {
        id: "license",
        label: "สำเนาใบประกอบวิชาชีพเภสัชกรรม",
        required: false,
        file: {
          name: "license.pdf",
          type: "application/pdf",
          size: 1200,
          lastModified: 1783209600000,
        },
        reviewStatus: "pending",
      },
    ],
    documentStatus: "pending",
    licenseStatus: "active",
    licenseCheckedAt: "2026-08-11T07:30:00.000Z",
    ...overrides,
  };
}

describe("Institution admission review", () => {
  it("orders applications from the earliest submission to the latest", () => {
    const latest = admission({ id: "APP-TEST-003", date: "24 มิ.ย. 2569" });
    const earliest = admission({ id: "APP-TEST-001", date: "9 มิ.ย. 2569" });
    const middle = admission({ id: "APP-TEST-002", date: "18 มิ.ย. 2569" });
    const source = [latest, earliest, middle];

    expect(orderInstitutionAdmissionsBySubmissionTime(source))
      .toEqual([earliest, middle, latest]);
    expect(source).toEqual([latest, earliest, middle]);
  });

  it("uses the exact submission time when applications share a display date", () => {
    const later = admission({
      id: "APP-TEST-002",
      submittedAt: "2026-06-24T03:00:00.000Z",
    });
    const earlier = admission({
      id: "APP-TEST-001",
      submittedAt: "2026-06-24T01:00:00.000Z",
    });

    expect(orderInstitutionAdmissionsBySubmissionTime([later, earlier]))
      .toEqual([earlier, later]);
  });

  it("selects only applications assigned to the exact institution", () => {
    const siriraj = admission();
    const chula = admission({ id: "APP-TEST-002", institutionId: "org-inst-chula" });

    expect(selectInstitutionAdmissions([siriraj, chula], "org-inst-siriraj"))
      .toEqual([siriraj]);
  });

  it("rejects an actor outside the application institution scope", () => {
    const chulaAdmission = admission({ institutionId: "org-inst-chula" });

    expect(() => reviewInstitutionAdmissionRecord({
      admission: chulaAdmission,
      admissionId: chulaAdmission.id,
      actor: sirirajActor,
      decision: "documents_complete",
    })).toThrowError("บัญชีนี้ไม่มีสิทธิ์จัดการข้อมูลของสถาบันดังกล่าว");
  });

  it("requires a note and selected document before requesting corrections", () => {
    const record = admission();

    expect(() => reviewInstitutionAdmissionRecord({
      admission: record,
      admissionId: record.id,
      actor: sirirajActor,
      decision: "request_information",
      reason: " ",
      missingDocumentIds: ["license"],
    })).toThrowError("กรุณาระบุคำแนะนำสำหรับผู้สมัคร");

    expect(() => reviewInstitutionAdmissionRecord({
      admission: record,
      admissionId: record.id,
      actor: sirirajActor,
      decision: "request_information",
      reason: "กรุณาแนบสำเนาที่ชัดเจน",
    })).toThrowError("กรุณาเลือกเอกสารที่ต้องการให้ผู้สมัครแก้ไขหรือแนบเพิ่ม");
  });

  it("marks selected documents for correction without mutating the source record", () => {
    const record = admission();
    const updated = reviewInstitutionAdmissionRecord({
      admission: record,
      admissionId: record.id,
      actor: sirirajActor,
      decision: "request_information",
      reason: "กรุณาแนบสำเนาที่เห็นวันหมดอายุชัดเจน",
      missingDocumentIds: ["license"],
      reviewedAt: "2026-08-27T03:00:00.000Z",
    });

    expect(updated).toMatchObject({
      documentStatus: "incomplete",
      documentNote: "กรุณาแนบสำเนาที่เห็นวันหมดอายุชัดเจน",
      reviewedBy: sirirajActor.userName,
      reviewedAt: "2026-08-27T03:00:00.000Z",
    });
    expect(updated.documents[0]).toMatchObject({
      reviewStatus: "missing",
      reviewerNote: "กรุณาแนบสำเนาที่เห็นวันหมดอายุชัดเจน",
    });
    expect(record.documents[0].reviewStatus).toBe("pending");
  });

  it("requires completed documents, then approves an eligible exam application", () => {
    const record = admission();
    expect(institutionAdmissionApprovalIssue(record)).toBe("กรุณายืนยันว่าเอกสารครบถ้วนก่อนอนุมัติ");

    const documentChecked = reviewInstitutionAdmissionRecord({
      admission: record,
      admissionId: record.id,
      actor: sirirajActor,
      decision: "documents_complete",
    });
    const approved = reviewInstitutionAdmissionRecord({
      admission: documentChecked,
      admissionId: record.id,
      actor: sirirajActor,
      decision: "approve",
      reviewedAt: "2026-08-27T04:00:00.000Z",
    });

    expect(documentChecked).toMatchObject({ documentStatus: "complete" });
    expect(documentChecked.documents[0].reviewStatus).toBe("accepted");
    expect(approved).toMatchObject({
      status: "approved",
      decisionNote: "เอกสารและคุณสมบัติครบถ้วนตามเกณฑ์",
      reviewedAt: "2026-08-27T04:00:00.000Z",
    });
  });

  it("blocks an ineligible study application and requires a rejection reason", () => {
    const record = admission({
      applicationType: "study",
      documentStatus: "complete",
      licenseStatus: "revoked",
      documents: [],
    });

    expect(institutionAdmissionApprovalIssue(record)).toContain("ไม่สามารถสมัครสอบหรือลงทะเบียนรายวิชา");
    expect(() => reviewInstitutionAdmissionRecord({
      admission: record,
      admissionId: record.id,
      actor: sirirajActor,
      decision: "approve",
    })).toThrowError("ไม่สามารถสมัครสอบหรือลงทะเบียนรายวิชา");
    expect(() => reviewInstitutionAdmissionRecord({
      admission: record,
      admissionId: record.id,
      actor: sirirajActor,
      decision: "reject",
      reason: " ",
    })).toThrowError("กรุณาระบุเหตุผลที่ไม่อนุมัติคำสมัคร");
  });

  it("keeps approved and rejected applications terminal", () => {
    const approved = admission({ status: "approved", documentStatus: "complete" });

    expect(() => reviewInstitutionAdmissionRecord({
      admission: approved,
      admissionId: approved.id,
      actor: sirirajActor,
      decision: "reject",
      reason: "เปลี่ยนผล",
    })).toThrowError("พิจารณาได้เฉพาะคำสมัครที่รอดำเนินการ");
  });
});
