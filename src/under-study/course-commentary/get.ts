import type { ActionFailType } from "@/config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import { UNDER_STUDY_SERVER } from "../utils.js";

export interface GetUnderCourseCommentaryOptions extends LoginOptions {
  type: "get";
  /** 教师代码 */
  teacherCode: string;
  /** 课程代码 */
  courseCode: string;
}

const ANSWER_URL = `${UNDER_STUDY_SERVER}/new/student/teapj/pj.page`;

export interface UnderCourseCommentaryInfo {
  /** 参数 */
  params: Record<string, string>;
  /** 问题 */
  questions: {
    /** 标题 */
    title: string;
    txdm: string;
    zbdm: string;
    options: {
      /** 选项文字 */
      text: string;
      /** 分数 */
      score: number;
      name: string;
      value: string;
    }[];
  }[];
  /** 评语 */
  text: {
    /** 评语标题 */
    title: string;
    txdm: string;
    zbdm: string;
    name: string;
  };
}

const PARAMS_REGEXP = /'\/new\/student\/teapj\/savePj',\s+\{\s+([^]*?)\s+wtpf:/;
const PARAMS_ITEM_REGEXP = /\b([^:]+): ?'([^']+)',/;
const OPTIONS_REGEXP =
  /<div class="question".+?data-txdm="(\d+)" data-zbdm="(\d+)">\s+<h3>(.*?)(?:<span class="zbsx" style="color:red;">.*?<\/span>)?\s+<\/h3>\s+<input.+?name="(\d+)"\s+?value="(\d+)"[^]+?data-fz="(.+?)"\s+data-mc="(.+?)" \/>[^]+?<input.+?name="(\d+)"\s+?value="(\d+)"[^]+?data-fz="(.+?)"\s+data-mc="(.+?)" \/>[^]+?<input.+?name="(\d+)"\s+?value="(\d+)"[^]+?data-fz="(.+?)"\s+data-mc="(.+?)" \/>[^]+?<input.+?name="(\d+)"\s+?value="(\d+)"[^]+?data-fz="(.+?)"\s+data-mc="(.+?)" \/>[^]+?<input.+?name="(\d+)"\s+?value="(\d+)"[^]+?data-fz="(.+?)"\s+data-mc="(.+?)" \/>[^]+?<input.+?name="(\d+)"\s+?value="(\d+)"[^]+?data-fz="(.+?)"\s+data-mc="(.+?)" \/>[^]+?<\/div>/g;
const TEXT_REGEXP =
  /<div class="question".+?data-txdm="(\d+)" data-zbdm="(\d+)">\s+<h3>(.*?)(?:<span class="zbsx" style="color:red;">.*?<\/span>)?\s+<\/h3>\s+<textarea.+?name="(\d+)"[^]+?data-fz="(.*?)"/;

const getCourseInfo = (html: string): UnderCourseCommentaryInfo => {
  const paramText = PARAMS_REGEXP.exec(html)![1];

  const params = Object.fromEntries(
    paramText
      .split("\n")
      .map((line) => PARAMS_ITEM_REGEXP.exec(line)!)
      .map(([, key, value]) => [key, value]),
  );

  const questions = Array.from(html.matchAll(OPTIONS_REGEXP)).map(
    ([, txdm, zbdm, title, ...items]) => {
      const optionNumber = items.length / 4;

      return {
        txdm,
        zbdm,
        title,
        options: new Array(optionNumber).fill(null).map((_, index) => {
          const [name, value, score, text] = items.slice(
            index * 4,
            index * 4 + 4,
          );

          return {
            name,
            value,
            score: Number(score),
            text,
          };
        }),
      };
    },
  );

  const [, txdm, zbdm, title, name] = TEXT_REGEXP.exec(html)!;

  return {
    params,
    questions,
    text: {
      txdm,
      zbdm,
      title,
      name,
    },
  };
};

export type UnderCourseCommentaryGetSuccessResponse =
  CommonSuccessResponse<UnderCourseCommentaryInfo>;

export type UnderCourseCommentaryGetResponse =
  | UnderCourseCommentaryGetSuccessResponse
  | CommonFailedResponse<
      | ActionFailType.Expired
      | ActionFailType.MissingArg
      | ActionFailType.MissingCredential
      | ActionFailType.Unknown
    >;

export const getUnderCommentary = async (
  cookieHeader: string,
  courseCode: string,
  teacherCode: string,
): Promise<UnderCourseCommentaryGetResponse> => {
  const urlParams = new URLSearchParams({
    teadm: teacherCode,
    dgksdm: courseCode,
    _: Date.now().toString(),
  }).toString();

  const response = await fetch(`${ANSWER_URL}?${urlParams}`, {
    headers: {
      Cookie: cookieHeader,
      Referer: `${UNDER_STUDY_SERVER}/new/student/teapj`,
      ...EDGE_USER_AGENT_HEADERS,
    },
  });

  const html = await response.text();

  return {
    success: true,
    data: getCourseInfo(html),
  };
};
