import type { ActionFailType } from "@/config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse, LoginOptions } from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../../auth/index.js";

interface RawCourseCommentaryScore {
  dtjg: string;
  xzpf: number;
  yjfk: "";
  zbdm: string;
  zbfz: number;
  zbmc: string;
}

export interface CourseCommentaryScoreItem {
  name: string;
  answer: string;
  score: number;
}

const getCourseCommentary = (records: RawCourseCommentaryScore[]): CourseCommentaryScoreItem[] =>
  records.map(({ zbfz: score, zbmc: name, dtjg: answer }) => ({
    name,
    answer,
    score,
  }));

export interface ViewCourseCommentaryOptions extends LoginOptions {
  type: "view";
  commentaryCode: string;
}

export type CourseCommentaryViewSuccessResponse = CommonSuccessResponse<
  CourseCommentaryScoreItem[]
>;

export type CourseCommentaryViewResponse =
  | CourseCommentaryViewSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<
      ActionFailType.Expired | ActionFailType.MissingCredential | ActionFailType.Unknown
    >;

export const COURSE_COMMENTARY_VIEW_TEST_RESPONSE: CourseCommentaryViewSuccessResponse = {
  success: true,
  data: Array.from({ length: 10 }, (_, i) => ({
    name: `得分项目${i}`,
    answer: "10分",
    score: 10,
  })),
};

export const viewCommentary = async (
  cookieHeader: string,
  commentaryCode: string,
  server: string,
): Promise<CourseCommentaryViewResponse> => {
  const response = await fetch(`${server}/new/student/teapj/viewPjData?pjdm=${commentaryCode}`, {
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${server}/new/student/teapj`,
      ...EDGE_USER_AGENT_HEADERS,
    },
  });

  const data = (await response.json()) as RawCourseCommentaryScore[];

  return {
    success: true,
    data: getCourseCommentary(data),
  };
};
