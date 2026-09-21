import {
  courseCatalog,
  type CourseDefinition,
} from "@/roles/shared/features/courses/course-catalog";
import type {
  AcademicInstitution,
  CourseOffering,
} from "@/roles/shared/features/academic/model";
import {
  COURSE_SCHEDULE_DETAILS,
  formatCourseSchedule,
} from "@/roles/shared/features/academic/course-schedule";
import {
  getUniversityNameForInstitution,
} from "@/roles/shared/data/university-directory";
import { formatCollegeCourseCode } from "@/roles/shared/data/college-directory";

type NormalCourseDefinition = Extract<CourseDefinition, { kind: "course" }>;

export type OpenRegistrationCourse = {
  definition: NormalCourseDefinition;
  offering: CourseOffering;
  institutionName: string;
  universityName: string;
  syllabus?: {
    fileName: string;
    url: string;
  };
  academicYear: string;
  term: string;
  schedule: string;
  room: string;
};

export type OpenRegistrationFilters = {
  query?: string;
  college?: string;
  university?: string;
  academicYear?: string;
  term?: string;
};

export type OpenRegistrationFilterOptions = {
  colleges: string[];
  universities: string[];
  academicYears: string[];
  terms: string[];
};

const activeNormalCourseByCode = new Map(
  courseCatalog
    .filter((definition): definition is NormalCourseDefinition => (
      definition.kind === "course" && definition.status === "active"
    ))
    .map((definition) => [definition.code, definition]),
);

const syllabusByOfferingId: Readonly<Record<string, OpenRegistrationCourse["syllabus"]>> = {
  "offering-vpt-301": {
    fileName: "CPhT 301-syllabus.pdf",
    url: "/documents/syllabi/mock-course-syllabus.pdf",
  },
};

function parseAcademicTerm(value: string) {
  const match = /^\s*(\d+)\s*\/\s*(\d{4})\s*$/.exec(value);
  if (!match) return null;

  return {
    term: match[1],
    academicYear: match[2],
  };
}

export function buildOpenRegistrationCourses(
  offerings: readonly CourseOffering[],
  institutions: readonly AcademicInstitution[],
): OpenRegistrationCourse[] {
  const institutionById = new Map(
    institutions.map((institution) => [institution.id, institution]),
  );

  return offerings.flatMap((offering) => {
    const scheduleDetails = COURSE_SCHEDULE_DETAILS[offering.id];
    const definition = activeNormalCourseByCode.get(offering.courseCode);
    const institution = institutionById.get(offering.institutionId);
    const universityName = getUniversityNameForInstitution(offering.institutionId) ?? institution?.name;
    const academicTerm = parseAcademicTerm(offering.term);

    if (
      offering.status !== "open"
      || !definition
      || !institution
      || !universityName
      || !academicTerm
    ) {
      return [];
    }

    return [{
      definition,
      offering,
      institutionName: institution.name,
      universityName,
      ...(syllabusByOfferingId[offering.id]
        ? { syllabus: syllabusByOfferingId[offering.id] }
        : {}),
      academicYear: academicTerm.academicYear,
      term: academicTerm.term,
      schedule: scheduleDetails
        ? formatCourseSchedule(scheduleDetails)
        : "สถาบันจะแจ้งวันและเวลา",
      room: scheduleDetails?.room ?? "สถาบันจะแจ้งสถานที่เรียน",
    }];
  });
}

function matchesSelectFilter(actual: string, expected?: string) {
  return !expected || expected === "all" || actual === expected;
}

export function filterOpenRegistrationCourses(
  courses: readonly OpenRegistrationCourse[],
  filters: OpenRegistrationFilters = {},
) {
  const normalizedQuery = filters.query?.trim().toLocaleLowerCase("th-TH") ?? "";
  const query = normalizedQuery === "all" ? "" : normalizedQuery;

  return courses.filter((course) => {
    const matchesQuery = !query || [
      course.definition.code,
      formatCollegeCourseCode(course.definition.code, course.definition.collegeCode),
      course.definition.titleTh,
      course.definition.titleEn,
    ].some((value) => value.toLocaleLowerCase("th-TH").includes(query));

    return matchesQuery
      && matchesSelectFilter(course.definition.collegeCode, filters.college)
      && matchesSelectFilter(course.universityName, filters.university)
      && matchesSelectFilter(course.academicYear, filters.academicYear)
      && matchesSelectFilter(course.term, filters.term);
  });
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => (
    left.localeCompare(right, "th", { numeric: true, sensitivity: "base" })
  ));
}

export function openRegistrationFilterOptions(
  courses: readonly OpenRegistrationCourse[],
): OpenRegistrationFilterOptions {
  return {
    colleges: uniqueSorted(courses.map((course) => course.definition.collegeCode)),
    universities: uniqueSorted(courses.map((course) => course.universityName)),
    academicYears: uniqueSorted(courses.map((course) => course.academicYear)),
    terms: uniqueSorted(courses.map((course) => course.term)),
  };
}
