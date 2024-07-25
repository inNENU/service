import type { RequestHandler } from "express";

import { underStudyLogin } from "./login.js";
import { UNDER_STUDY_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type { ActionFailType } from "../config/index.js";
import {
  ExpiredResponse,
  InvalidArgResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../utils/index.js";

export interface GetUnderCourseCommentaryListOptions extends LoginOptions {
  type: "list";
  /** 查询时间 */
  time?: string;
}

export interface GetUnderCourseCommentaryOptions extends LoginOptions {
  type: "get";
  /** 教师代码 */
  teacherCode: string;
  /** 课程代码 */
  courseCode: string;
}

export interface SubmitUnderCourseCommentaryOptions
  extends LoginOptions,
    UnderCourseCommentaryInfo {
  type: "submit";
  /** 选项 */
  answers: number[];
  /** 评语 */
  commentary: string;
}

interface RawUnderCourseCommentaryListResultItem {
  rownum_: number;
  /** 教师编号 */
  teabh: string;
  /** 教师代码 */
  teadm: string;
  /** 评价代码 */
  pjdm: string;
  /** 课程代码 */
  dgksdm: string;
  /** 教师姓名 */
  teaxm: string;
  /** 教学环节代码 */
  jxhjdm: string;
  /** 教学环节名称 */
  jxhjmc: string;
  /** 结课日期 */
  jkrq: string;
  /** 学年学期代码 */
  xnxqdm: string;
  /** 课程名称 */
  kcmc: string;
  kcrwdm: string;
  /** 修读学期 */
  xnxqmc: string;
  /** 学生代码 */
  xsdm: string;
}

interface RawUnderCourseCommentaryListSuccessResult {
  data: "";
  rows: RawUnderCourseCommentaryListResultItem[];
  total: number;
}

interface RawUnderCourseCommentaryListFailedResult {
  code: number;
  data: string;
  message: string;
}

type RawUnderCourseCommentaryListResult =
  | RawUnderCourseCommentaryListSuccessResult
  | RawUnderCourseCommentaryListFailedResult;

export interface UnderCourseCommentaryItem {
  /** 修读学期 */
  term: string;
  /** 结课日期 */
  endDate: string;
  /** 课程名称 */
  name: string;
  /** 教师名称 */
  teacherName: string;
  /** 课程代码 */
  courseCode: string;
  /** 教师代码 */
  teacherCode: string;
  /** 教学环节名称 */
  teachingLinkName: string;
  /** 评价代码 */
  commentaryCode: string;
}

export type UnderCourseCommentaryListListSuccessResponse =
  CommonSuccessResponse<UnderCourseCommentaryItem[]>;

export type UnderCourseCommentaryListListResponse =
  | UnderCourseCommentaryListListSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Expired | ActionFailType.Unknown>;

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

interface RawUnderCourseCommentarySubmitSuccessResult {
  code: 0;
  data: "";
  message: "评价成功";
}

interface RawUnderCourseCommentaryListFailedResult {
  code: number;
  data: string;
  message: string;
}

type RawUnderCourseCommentarySubmitResult =
  | RawUnderCourseCommentarySubmitSuccessResult
  | RawUnderCourseCommentaryListFailedResult;

const MAIN_URL = `${UNDER_STUDY_SERVER}/new/student/teapj`;
const LIST_URL = `${UNDER_STUDY_SERVER}/new/student/teapj/pjDatas`;
const VIEW_URL = `${UNDER_STUDY_SERVER}/new/student/teapj/viewPjData`;
const ANSWER_URL = `${UNDER_STUDY_SERVER}/new/student/teapj/pj.page`;

const SELECTED_OPTION_REG =
  /<option value='([^']*?)' selected>([^<]*?)<\/option>/;

const getCurrentTime = async (
  cookieHeader: string,
): Promise<{ time: string; value: string }> => {
  const response = await fetch(MAIN_URL, {
    headers: {
      Cookie: cookieHeader,
      ...EDGE_USER_AGENT_HEADERS,
      referer: `${UNDER_STUDY_SERVER}/new/student/teapj`,
    },
  });

  const html = await response.text();
  const timeMatch = SELECTED_OPTION_REG.exec(html);

  if (!timeMatch) throw new Error("无法获取当前评教日期");

  const [, value, time] = timeMatch;

  return {
    time,
    value,
  };
};

const getCourseList = (
  records: RawUnderCourseCommentaryListResultItem[],
): UnderCourseCommentaryItem[] =>
  records.map(
    ({
      xnxqmc: term,
      jkrq: endDate,
      kcmc: name,
      dgksdm: courseCode,
      teaxm: teacherName,
      teadm: teacherCode,
      jxhjmc: teachingLinkName,
      pjdm: commentaryCode,
    }) => ({
      term,
      endDate,
      name,
      courseCode,
      teacherName,
      teacherCode,
      teachingLinkName,
      commentaryCode,
    }),
  );

interface RawUnderCourseCommentaryScore {
  dtjg: string;
  xzpf: number;
  yjfk: "";
  zbdm: string;
  zbfz: number;
  zbmc: string;
}

export interface ViewUnderCourseCommentaryOptions extends LoginOptions {
  type: "view";
  commentaryCode: string;
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

type UnderCourseCommentaryOptions =
  | ViewUnderCourseCommentaryOptions
  | GetUnderCourseCommentaryListOptions
  | GetUnderCourseCommentaryOptions
  | SubmitUnderCourseCommentaryOptions;

export const underStudyCourseCommentaryHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderCourseCommentaryOptions
> = async (req, res) => {
  try {
    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await underStudyLogin({ id, password, authToken });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(LIST_URL);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const cookieHeader = req.headers.cookie;

    if (req.body.type === "list") {
      const time = req.body.time ?? (await getCurrentTime(cookieHeader)).value;

      const response = await fetch(LIST_URL, {
        method: "POST",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          Cookie: cookieHeader,
          Referer: `${UNDER_STUDY_SERVER}/new/student/teapj`,
          ...EDGE_USER_AGENT_HEADERS,
        },
        body: new URLSearchParams({
          xnxqdm: time,
          source: "kccjlist",
          primarySort: "kcrwdm asc",
          page: "1",
          rows: "150",
          sort: "jkrq",
          order: "asc",
        }),
      });

      if (response.headers.get("Content-Type")?.includes("text/html"))
        return res.json(ExpiredResponse);

      const data =
        (await response.json()) as RawUnderCourseCommentaryListResult;

      if ("code" in data) {
        if (data.message === "尚未登录，请先登录")
          return res.json(ExpiredResponse);

        throw new Error(data.message);
      }

      return res.json({
        success: true,
        data: getCourseList(data.rows),
      });
    }

    if (req.body.type === "view") {
      const response = await fetch(
        `${VIEW_URL}?pjdm=${req.body.commentaryCode}`,
        {
          headers: {
            Accept: "application/json, text/javascript, */*; q=0.01",
            Cookie: cookieHeader,
            Referer: `${UNDER_STUDY_SERVER}/new/student/teapj`,
            ...EDGE_USER_AGENT_HEADERS,
          },
        },
      );

      const data = (await response.json()) as RawUnderCourseCommentaryScore[];

      return res.json({
        success: true,
        data: getCourseCommentary(data),
      });
    }

    if (req.body.type === "get") {
      const { courseCode, teacherCode } = req.body;
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

      return res.json({
        success: true,
        data: getCourseInfo(html),
      });
    }

    if (req.body.type === "submit") {
      const { params, questions, text, answers } = req.body;

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
                  acc + Number(questions[index].options[answer].score),
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
                dtjg: req.body.commentary,
              },
            ]),
          }),
        },
      );

      if (response.headers.get("Content-Type")?.includes("text/html"))
        return res.json(ExpiredResponse);

      const data =
        (await response.json()) as RawUnderCourseCommentarySubmitResult;

      if (data.code === 0) {
        return res.json({
          success: true,
          data: data.message,
        });
      }

      if (data.message === "尚未登录，请先登录")
        return res.json(ExpiredResponse);

      return res.json(UnknownResponse(data.message));
    }

    return res.json(InvalidArgResponse("type"));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
