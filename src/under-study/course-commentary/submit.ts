import type { ActionFailType } from "@/config/index.js";
import { ExpiredResponse, UnknownResponse } from "@/config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { UnderCourseCommentaryInfo } from "./get.js";
import type { RawUnderCourseCommentaryFailResult } from "./utils.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

interface RawUnderCourseCommentarySubmitSuccessResult {
  code: 0;
  data: "";
  message: "评价成功";
}

type RawUnderCourseCommentarySubmitResult =
  | RawUnderCourseCommentarySubmitSuccessResult
  | RawUnderCourseCommentaryFailResult;

export interface SubmitUnderCourseCommentaryOptions
  extends LoginOptions,
    UnderCourseCommentaryInfo {
  type: "submit";
  /** 选项 */
  answers: number[];
  /** 评语 */
  commentary: string;
}

export type SubmitUnderCourseCommentarySuccessResponse =
  CommonSuccessResponse<string>;

export type SubmitUnderCourseCommentaryFailResponse = CommonFailedResponse<
  | ActionFailType.Expired
  | ActionFailType.MissingArg
  | ActionFailType.MissingCredential
  | ActionFailType.Unknown
>;

export type SubmitUnderCourseCommentaryResponse =
  | SubmitUnderCourseCommentarySuccessResponse
  | SubmitUnderCourseCommentaryFailResponse;

export const submitUnderCourseCommentary = async (
  cookieHeader: string,
  {
    commentary,
    params,
    questions,
    text,
    answers,
  }: SubmitUnderCourseCommentaryOptions,
): Promise<SubmitUnderCourseCommentaryResponse> => {
  const response = await fetch(
    `${UNDER_STUDY_SERVER}/new/student/teapj/savePj`,
    {
      method: "POST",
      headers: {
        Accept: "application/json; charset=UTF-8",
        Cookie: cookieHeader,
        Referer: `${UNDER_STUDY_SERVER}/new/student/teapj`,
        ...EDGE_USER_AGENT_HEADERS,
      },
      body: new URLSearchParams({
        ...params,
        wtpf: answers
          .reduce(
            (acc, answer, index) =>
              acc + questions[index].options[answer].score,
            0,
          )
          .toString(),
        dt: JSON.stringify([
          ...questions.map(({ txdm, zbdm, title }, index) => {
            const { text, value, score } =
              questions[index].options[answers[index]];

            return {
              txdm,
              zbdm,
              zbmc: title,
              zbxmdm: value,
              fz: score,
              dtjg: text,
            };
          }),
          {
            txdm: text.txdm,
            zbdm: text.zbdm,
            zbmc: text.title,
            fz: 0,
            dtjg: commentary,
          },
        ]),
      }),
    },
  );

  if (response.headers.get("Content-Type")?.includes("text/html"))
    return ExpiredResponse;

  const data = (await response.json()) as RawUnderCourseCommentarySubmitResult;

  if (data.code === 0) {
    return {
      success: true,
      data: data.message,
    };
  }

  if (data.message === "尚未登录，请先登录") return ExpiredResponse;

  return UnknownResponse(data.message);
};
