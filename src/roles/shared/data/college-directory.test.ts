import { describe, expect, it } from "vitest";

import {
  COLLEGE_ABBREVIATIONS,
  COLLEGE_OPTIONS,
  formatCollegeCourseCode,
  formatCourseCode,
  isCollegeCode,
} from "./college-directory";

describe("college directory", () => {
  it("keeps the seven official dropdown labels in display order", () => {
    expect(COLLEGE_OPTIONS.map((option) => option.label)).toEqual([
      "วิทยาลัยเภสัชบำบัด (CPhT)",
      "วิทยาลัยการคุ้มครองผู้บริโภคด้านยาและสุขภาพ (CPHCP)",
      "วิทยาลัยเภสัชกรรมสมุนไพร (CHPT)",
      "วิทยาลัยเภสัชกรรมอุตสาหการ (CIPT)",
      "วิทยาลัยเภสัชกรรมชุมชน (CCPT)",
      "วิทยาลัยการบริหารเภสัชกิจ (CPAT)",
      "วิทยาลัยเภสัชพันธุศาสตร์และเภสัชกรรมแม่นยำ (CPPM)",
    ]);
  });

  it("maps every college to its English abbreviation", () => {
    expect(COLLEGE_OPTIONS.map((option) => COLLEGE_ABBREVIATIONS[option.value]))
      .toEqual(["CPhT", "CPHCP", "CHPT", "CIPT", "CCPT", "CPAT", "CPPM"]);
    expect(formatCollegeCourseCode("วคบท-101", "วคบท.")).toBe("CPHCP 101");
    expect(formatCollegeCourseCode("วภท-301", "วภท.")).toBe("CPhT 301");
    expect(formatCollegeCourseCode("CIPT-201", "CIPT")).toBe("CIPT 201");
    expect(formatCollegeCourseCode("CPAT-401", "CPAT")).toBe("CPAT 401");
    expect(formatCourseCode("สม-501")).toBe("CHPT 501");
    expect(formatCourseCode("CCPT 201")).toBe("CCPT 201");
    expect(formatCourseCode("COURSE-NOT-FOUND")).toBe("COURSE-NOT-FOUND");
    expect(isCollegeCode("CPPM")).toBe(true);
    expect(isCollegeCode("unknown")).toBe(false);
  });
});
