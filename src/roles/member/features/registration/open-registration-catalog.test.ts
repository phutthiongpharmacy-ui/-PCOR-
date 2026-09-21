import { describe, expect, it } from "vitest";

import type {
  AcademicInstitution,
  CourseOffering,
} from "@/roles/shared/features/academic/model";

import {
  buildOpenRegistrationCourses,
  filterOpenRegistrationCourses,
  openRegistrationFilterOptions,
} from "./open-registration-catalog";

const institutions: readonly AcademicInstitution[] = [
  {
    id: "org-inst-siriraj",
    code: "INST-SIRIRAJ",
    name: "สถาบันฝึกอบรมโรงพยาบาลศิริราช",
    kind: "hospital",
  },
  {
    id: "org-inst-chula",
    code: "INST-CHULA",
    name: "สถาบันฝึกอบรมจุฬาลงกรณ์มหาวิทยาลัย",
    kind: "university",
  },
];

const seededOfferings: readonly CourseOffering[] = [
  {
    id: "offering-cpc-101",
    courseCode: "วคบท-101",
    courseTitle: "ระบาดวิทยาเพื่อการคุ้มครองผู้บริโภค",
    credits: 4,
    term: "1/2569",
    institutionId: "org-inst-chula",
    collegeCode: "วคบท.",
    status: "open",
  },
  {
    id: "offering-admin-401",
    courseCode: "CPAT-401",
    courseTitle: "การบริหารระบบยาและเภสัชเศรษฐศาสตร์",
    credits: 6,
    term: "2/2569",
    institutionId: "org-inst-chula",
    collegeCode: "CPAT",
    status: "open",
  },
  {
    id: "offering-community-201",
    courseCode: "วภช-201",
    courseTitle: "การบริหารจัดการทางเภสัชกรรมชุมชน",
    credits: 3,
    term: "1/2570",
    institutionId: "org-inst-siriraj",
    collegeCode: "วภช.",
    status: "open",
  },
  {
    id: "offering-herbal-501",
    courseCode: "สม-501",
    courseTitle: "การบริหารจัดการผลิตภัณฑ์สมุนไพร",
    credits: 6,
    term: "2/2570",
    institutionId: "org-inst-chula",
    collegeCode: "สมุนไพร",
    status: "open",
  },
  {
    id: "offering-vpt-301",
    courseCode: "วภท-301",
    courseTitle: "องค์ความรู้ทางเภสัชบำบัดเฉพาะทาง",
    credits: 12,
    term: "1/2569",
    institutionId: "org-inst-siriraj",
    collegeCode: "วภท.",
    status: "open",
  },
  {
    id: "offering-vpt-302",
    courseCode: "วภท-302",
    courseTitle: "การประเมินผู้ป่วยข้างเตียง",
    credits: 12,
    term: "1/2569",
    institutionId: "org-inst-chula",
    collegeCode: "วภท.",
    status: "open",
  },
  {
    id: "offering-vpt-303",
    courseCode: "วภท-303",
    courseTitle: "การพัฒนาโครงร่างวิจัยทางคลินิก",
    credits: 12,
    term: "2/2569",
    institutionId: "org-inst-chula",
    collegeCode: "วภท.",
    status: "open",
  },
];

describe("open registration catalog", () => {
  it("joins valid open offerings while excluding closed, inactive, and noncanonical records", () => {
    const candidates: CourseOffering[] = [
      seededOfferings[0],
      { ...seededOfferings[1], status: "closed" },
      { ...seededOfferings[2], id: "offering-without-presentation" },
      { ...seededOfferings[3], courseCode: "วคบท-102" },
      { ...seededOfferings[4], courseCode: "COURSE-NOT-FOUND" },
      { ...seededOfferings[5], term: "2569" },
      { ...seededOfferings[6], institutionId: "org-inst-unknown" },
    ];

    const result = buildOpenRegistrationCourses(candidates, institutions);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      definition: {
        kind: "course",
        code: "วคบท-101",
        status: "active",
      },
      offering: { id: "offering-cpc-101" },
      institutionName: "สถาบันฝึกอบรมจุฬาลงกรณ์มหาวิทยาลัย",
      universityName: "จุฬาลงกรณ์มหาวิทยาลัย",
      academicYear: "2569",
      term: "1",
    });
    expect(result[1]).toMatchObject({
      offering: { id: "offering-without-presentation" },
      schedule: "สถาบันจะแจ้งวันและเวลา",
      room: "สถาบันจะแจ้งสถานที่เรียน",
    });
  });

  it("searches by course code and Thai or English canonical title", () => {
    const courses = buildOpenRegistrationCourses(seededOfferings, institutions);

    expect(filterOpenRegistrationCourses(courses, { query: "CPAT-401" }))
      .toHaveLength(1);
    expect(filterOpenRegistrationCourses(courses, { query: "CPhT 301" }))
      .toHaveLength(1);
    expect(filterOpenRegistrationCourses(courses, { query: "ระบาดวิทยา" })[0]
      .offering.id).toBe("offering-cpc-101");
    expect(filterOpenRegistrationCourses(courses, { query: "clinical research" })[0]
      .offering.id).toBe("offering-vpt-303");
  });

  it("keeps offerings from institutions without a university mapping", () => {
    const institution = {
      id: "org-inst-independent",
      code: "INST-INDEPENDENT",
      name: "สถาบันฝึกอบรมอิสระ",
      kind: "university" as const,
    };
    const result = buildOpenRegistrationCourses([
      { ...seededOfferings[0], institutionId: institution.id },
    ], [...institutions, institution]);

    expect(result).toHaveLength(1);
    expect(result[0].universityName).toBe(institution.name);
  });

  it("filters independently by college, university, academic year, and term", () => {
    const courses = buildOpenRegistrationCourses(seededOfferings, institutions);

    expect(filterOpenRegistrationCourses(courses, { college: "วภท." }))
      .toHaveLength(3);
    expect(filterOpenRegistrationCourses(courses, { university: "มหาวิทยาลัยมหิดล" }))
      .toHaveLength(2);
    expect(filterOpenRegistrationCourses(courses, { academicYear: "2570" }))
      .toHaveLength(2);
    expect(filterOpenRegistrationCourses(courses, { term: "2" }))
      .toHaveLength(3);
    expect(filterOpenRegistrationCourses(courses, {
      query: "all",
      college: "all",
      university: "all",
      academicYear: "all",
      term: "all",
    })).toHaveLength(7);
  });

  it("returns unique naturally sorted filter options", () => {
    const courses = buildOpenRegistrationCourses(seededOfferings, institutions);

    expect(openRegistrationFilterOptions(courses)).toEqual({
      colleges: ["วคบท.", "วภช.", "วภท.", "สมุนไพร", "CPAT"],
      universities: ["จุฬาลงกรณ์มหาวิทยาลัย", "มหาวิทยาลัยมหิดล"],
      academicYears: ["2569", "2570"],
      terms: ["1", "2"],
    });
  });

  it("builds all seven configured offerings with useful schedules and rooms", () => {
    const result = buildOpenRegistrationCourses(seededOfferings, institutions);

    expect(result.map((course) => course.offering.id)).toEqual(
      seededOfferings.map((offering) => offering.id),
    );
    expect(result.every((course) => (
      course.schedule.includes("วัน")
      && course.schedule.includes("น.")
      && course.room.length > 8
    ))).toBe(true);
  });

  it("attaches the mock syllabus only to the intended CPhT 301 offering", () => {
    const result = buildOpenRegistrationCourses(seededOfferings, institutions);
    const cphT301 = result.find((course) => course.offering.id === "offering-vpt-301");

    expect(cphT301?.syllabus).toEqual({
      fileName: "CPhT 301-syllabus.pdf",
      url: "/documents/syllabi/mock-course-syllabus.pdf",
    });
    expect(result.filter((course) => course.syllabus).map((course) => course.offering.id))
      .toEqual(["offering-vpt-301"]);
  });
});
