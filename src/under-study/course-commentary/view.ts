import type { AuthLoginFailedResponse } from "../../auth/index.js";
import type { ActionFailType } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../../utils/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

const VIEW_URL = `${UNDER_STUDY_SERVER}/new/student/teapj/viewPjData`;

interface RawUnderCourseCommentaryScore {
  dtjg: string;
  xzpf: number;
  yjfk: "";
  zbdm: string;
  zbfz: number;
  zbmc: string;
}

export interface UnderCourseCommentaryScoreItem {
  name: string;
  answer: string;
  score: number;
}

const getCourseCommentary = (
  records: RawUnderCourseCommentaryScore[],
): UnderCourseCommentaryScoreItem[] =>
  records.map(({ zbfz: score, zbmc: name, dtjg: answer }) => ({
    name,
    answer,
    score,
  }));

export interface ViewUnderCourseCommentaryOptions extends LoginOptions {
  type: "view";
  commentaryCode: string;
}

export type UnderCourseCommentaryViewSuccessResponse = CommonSuccessResponse<
  UnderCourseCommentaryScoreItem[]
>;

export type UnderCourseCommentaryViewResponse =
  | UnderCourseCommentaryViewSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<
      | ActionFailType.Expired
      | ActionFailType.MissingCredential
      | ActionFailType.Unknown
    >;

export const UNDER_COURSE_COMMENTARY_VIEW_TEST_RESPONSE: UnderCourseCommentaryViewSuccessResponse =
  {
    success: true,
    data: Array.from({ length: 10 }, (_, i) => ({
      name: `得分项目${i}`,
      answer: "10分",
      score: 10,
    })),
  };

export const viewUnderCourseCommentary = async (
  cookieHeader: string,
  commentaryCode: string,
): Promise<UnderCourseCommentaryViewResponse> => {
  const response = await fetch(`${VIEW_URL}?pjdm=${commentaryCode}`, {
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${UNDER_STUDY_SERVER}/new/student/teapj`,
      ...EDGE_USER_AGENT_HEADERS,
    },
  });

  const data = (await response.json()) as RawUnderCourseCommentaryScore[];

  return {
    success: true,
    data: getCourseCommentary(data),
  };
};
