export const UNIVERSITY_OPTIONS = [
  "มหาวิทยาลัยนเรศวร",
  "มหาวิทยาลัยสงขลานครินทร์",
  "มหาวิทยาลัยขอนแก่น",
  "มหาวิทยาลัยมหิดล",
  "จุฬาลงกรณ์มหาวิทยาลัย",
  "มหาวิทยาลัยศิลปากร",
  "มหาวิทยาลัยเชียงใหม่",
  "มหาวิทยาลัยธรรมศาสตร์",
  "มหาวิทยาลัยอุบลราชธานี",
] as const;

export type UniversityName = (typeof UNIVERSITY_OPTIONS)[number];

const UNIVERSITY_BY_INSTITUTION: Record<string, UniversityName> = {
  "inst-siriraj": "มหาวิทยาลัยมหิดล",
  "inst-chula": "จุฬาลงกรณ์มหาวิทยาลัย",
  "inst-ramathibodi": "มหาวิทยาลัยมหิดล",
};

export function getUniversityNameForInstitution(institutionId: string) {
  return UNIVERSITY_BY_INSTITUTION[institutionId.replace(/^org-/, "")];
}
