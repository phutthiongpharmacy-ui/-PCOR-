import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CurriculumProposalFormFields } from "./CurriculumProposalFormFields";
import { emptyCurriculumProposalForm } from "./curriculum-proposal-form";

describe("CurriculumProposalFormFields", () => {
  afterEach(cleanup);

  it("exposes every requested curriculum field with an accessible label", () => {
    render(
      <CurriculumProposalFormFields
        form={emptyCurriculumProposalForm("สถาบันฝึกอบรมโรงพยาบาลศิริราช")}
        onChange={vi.fn()}
        isRevision={false}
      />,
    );

    [
      "วิทยาลัย / สาขาเฉพาะทาง",
      "ชื่อหลักสูตรภาษาไทย",
      "ชื่อหลักสูตรภาษาอังกฤษ",
      "ชื่อวุฒิหรือประกาศนียบัตรภาษาไทย",
      "ชื่อวุฒิหรือประกาศนียบัตรภาษาอังกฤษ",
      "หน่วยงานรับผิดชอบ",
      "สถาบันหลัก",
      "สถาบันสมทบ (ถ้ามี)",
      "ปรัชญาและวัตถุประสงค์",
      "ระยะเวลาฝึกอบรม",
      "ระบบการจัดการศึกษา",
      "หน่วยกิตรวม",
      "ภาคทฤษฎี",
      "ภาคปฏิบัติการ",
      "ฝึกปฏิบัติวิชาชีพ",
      "วิจัย / โครงงาน",
      "หลักสูตรระยะสั้นที่เกี่ยวข้อง (ถ้ามี)",
      "หลักเกณฑ์การคำนวณชั่วโมง",
      "คุณสมบัติผู้สมัคร",
      "วิธีคัดเลือก",
      "วิธีประเมินผล",
      "เกณฑ์สำเร็จการฝึกอบรม",
      "คุณสมบัติของหน่วยงานจัดฝึกอบรม",
      "คุณสมบัติของแหล่งฝึก",
      "เลขที่ประกาศสภาเภสัชกรรม",
      "วันที่ประกาศ",
      "วันที่มีผล",
      "หมายเหตุ (ถ้ามี)",
    ].forEach((label) => expect(screen.getByLabelText(label)).toBeTruthy());
  });

  it("shows the revision summary only while editing a returned proposal", () => {
    const { rerender } = render(
      <CurriculumProposalFormFields
        form={emptyCurriculumProposalForm()}
        onChange={vi.fn()}
        isRevision={false}
      />,
    );
    expect(screen.queryByLabelText("สรุปสิ่งที่แก้ไข")).toBeNull();

    rerender(
      <CurriculumProposalFormFields
        form={emptyCurriculumProposalForm()}
        onChange={vi.fn()}
        isRevision
      />,
    );
    expect(screen.getByLabelText("สรุปสิ่งที่แก้ไข")).toBeTruthy();
  });
});
