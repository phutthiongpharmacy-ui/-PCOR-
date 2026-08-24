import {
  courseCatalog,
  type CourseDefinition,
} from "@/roles/shared/features/courses/course-catalog";
import type {
  AcademicInstitution,
  CourseOffering,
} from "@/roles/shared/features/academic/model";
import {
  getUniversityNameForInstitution,
} from "@/roles/shared/data/university-directory";
import { formatCollegeCourseCode } from "@/roles/shared/data/college-directory";

type NormalCourseDefinition = Extract<CourseDefinition, { kind: "course" }>;

interface OpenRegistrationPresentationDetails {
  schedule: string;
  room: string;
}

export type OpenRegistrationCourse = {
  definition: NormalCourseDefinition;
  offering: CourseOffering;
  institutionName: string;
  universityName: string;
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

const OPEN_REGISTRATION_PRESENTATION_DETAILS: Readonly<
  Record<string, OpenRegistrationPresentationDetails>
> = {
  "offering-cpc-101": {
    schedule: "วันเสาร์ 09:00–12:00 น.",
    room: "ห้องเรียน 301 อาคารเภสัชศาสตร์",
  },
  "offering-admin-401": {
    schedule: "วันอาทิตย์ 09:00–16:00 น.",
    room: "ห้องประชุม 2 อาคารบริหารการศึกษา",
  },
  "offering-community-201": {
    schedule: "วันพุธ 18:00–21:00 น.",
    room: "ห้องเรียน 204 อาคารบริการสุขภาพชุมชน",
  },
  "offering-herbal-501": {
    schedule: "วันเสาร์ 13:00–16:00 น.",
    room: "ห้องปฏิบัติการเภสัชเวท 2",
  },
  "offering-vpt-301": {
    schedule: "วันจันทร์ 09:00–12:00 น.",
    room: "ห้องบรรยาย 1 อาคารศูนย์การแพทย์",
  },
  "offering-vpt-302": {
    schedule: "วันพุธ 13:00–16:00 น.",
    room: "หอผู้ป่วยอายุรกรรม ชั้น 12",
  },
  "offering-vpt-303": {
    schedule: "วันศุกร์ 09:00–12:00 น.",
    room: "ห้องสัมมนาวิจัย 3",
  },
};

const activeNormalCourseByCode = new Map(
  courseCatalog
    .filter((definition): definition is NormalCourseDefinition => (
      definition.kind === "course" && definition.status === "active"
    ))
    .map((definition) => [definition.code, definition]),
);

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
    const presentation = OPEN_REGISTRATION_PRESENTATION_DETAILS[offering.id];
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
      academicYear: academicTerm.academicYear,
      term: academicTerm.term,
      schedule: presentation?.schedule ?? "สถาบันจะแจ้งวันและเวลา",
      room: presentation?.room ?? "สถาบันจะแจ้งสถานที่เรียน",
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
