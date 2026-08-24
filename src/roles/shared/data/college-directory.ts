export const COLLEGE_OPTIONS = [
  { value: "วภท.", abbreviation: "CPhT", name: "วิทยาลัยเภสัชบำบัด", label: "วิทยาลัยเภสัชบำบัด (CPhT)" },
  { value: "วคบท.", abbreviation: "CPHCP", name: "วิทยาลัยการคุ้มครองผู้บริโภคด้านยาและสุขภาพ", label: "วิทยาลัยการคุ้มครองผู้บริโภคด้านยาและสุขภาพ (CPHCP)" },
  { value: "สมุนไพร", abbreviation: "CHPT", name: "วิทยาลัยเภสัชกรรมสมุนไพร", label: "วิทยาลัยเภสัชกรรมสมุนไพร (CHPT)" },
  { value: "CIPT", abbreviation: "CIPT", name: "วิทยาลัยเภสัชกรรมอุตสาหการ", label: "วิทยาลัยเภสัชกรรมอุตสาหการ (CIPT)" },
  { value: "วภช.", abbreviation: "CCPT", name: "วิทยาลัยเภสัชกรรมชุมชน", label: "วิทยาลัยเภสัชกรรมชุมชน (CCPT)" },
  { value: "CPAT", abbreviation: "CPAT", name: "วิทยาลัยการบริหารเภสัชกิจ", label: "วิทยาลัยการบริหารเภสัชกิจ (CPAT)" },
  { value: "CPPM", abbreviation: "CPPM", name: "วิทยาลัยเภสัชพันธุศาสตร์และเภสัชกรรมแม่นยำ", label: "วิทยาลัยเภสัชพันธุศาสตร์และเภสัชกรรมแม่นยำ (CPPM)" },
] as const;

export type CollegeCode = (typeof COLLEGE_OPTIONS)[number]["value"];

export const COLLEGE_ABBREVIATIONS: Record<CollegeCode, (typeof COLLEGE_OPTIONS)[number]["abbreviation"]> = {
  "วภท.": "CPhT",
  "วคบท.": "CPHCP",
  สมุนไพร: "CHPT",
  CIPT: "CIPT",
  "วภช.": "CCPT",
  CPAT: "CPAT",
  CPPM: "CPPM",
};

const COURSE_PREFIX_COLLEGE_CODES: Readonly<Record<string, CollegeCode>> = {
  "วภท": "วภท.",
  "วภท.": "วภท.",
  CPhT: "วภท.",
  "วคบท": "วคบท.",
  "วคบท.": "วคบท.",
  CPHCP: "วคบท.",
  "สม": "สมุนไพร",
  "สมุนไพร": "สมุนไพร",
  CHPT: "สมุนไพร",
  CIPT: "CIPT",
  "วภช": "วภช.",
  "วภช.": "วภช.",
  CCPT: "วภช.",
  CPAT: "CPAT",
  CPPM: "CPPM",
};

export function getCollegeOption(value: string) {
  return COLLEGE_OPTIONS.find((option) => option.value === value);
}

export function isCollegeCode(value: unknown): value is CollegeCode {
  return typeof value === "string" && getCollegeOption(value) !== undefined;
}

export function formatCollegeCourseCode(code: string | undefined, collegeCode: CollegeCode) {
  if (!code) return "ไม่กำหนดรหัส";
  const normalized = code.trim();
  if (!normalized) return "ไม่กำหนดรหัส";
  const separatorIndex = normalized.search(/[-\s]/);
  if (separatorIndex < 0) return normalized;
  return `${COLLEGE_ABBREVIATIONS[collegeCode]} ${normalized.slice(separatorIndex + 1)}`;
}

export function formatCourseCode(code: string | undefined) {
  if (!code) return "ไม่กำหนดรหัส";
  const normalized = code.trim();
  if (!normalized) return "ไม่กำหนดรหัส";
  const separatorIndex = normalized.search(/[-\s]/);
  if (separatorIndex < 0) return normalized;
  const collegeCode = COURSE_PREFIX_COLLEGE_CODES[normalized.slice(0, separatorIndex)];
  return collegeCode
    ? `${COLLEGE_ABBREVIATIONS[collegeCode]} ${normalized.slice(separatorIndex + 1)}`
    : normalized;
}
