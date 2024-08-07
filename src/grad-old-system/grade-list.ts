import type { RequestHandler } from "express";

import { gradOldSystemLogin } from "./login.js";
import { GRAD_OLD_SYSTEM_HTTPS_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import {
  ExpiredResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../config/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT, getIETimeStamp } from "../utils/index.js";

export interface GradGradeResult {
  /** 修读时间 */
  time: string;
  /** 课程名称 */
  name: string;
  /** 分数 */
  grade: number;
  /** 分数文本 */
  gradeText: string | null;
  /** 绩点成绩 */
  gradePoint: number;
  /** 成绩标志 */
  mark: string;
  /** 课程性质 */
  courseCategory: string;
  /** 课程类型 */
  courseType: string;
  /** 学时 */
  hours: number | null;
  /** 学分 */
  point: number;
  /** 考试性质 */
  examType: string;
  /** 补重学期 */
  reLearn: string;
}

export interface GradGradeListSuccessResponse {
  success: true;
  data: GradGradeResult[];
}

export type GradGradeListResponse =
  | GradGradeListSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse;

const gradeItemRegExp = /<tr.+?class="smartTr"[^>]*?>([^]*?)<\/tr>/g;
const jsGradeItemRegExp = /<tr.+?class=\\"smartTr\\"[^>]*?>(.*?)<\/tr>/g;
const gradeCellRegExp =
  /^(?:<td[^>]*?>[^<]*?<\/td>\s*){3}<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>\s*<td[^>]*?>([^<]*?)<\/td>/;

const tableFieldsRegExp =
  /<input type="hidden"\s+name\s*=\s*"tableFields"\s+id\s*=\s*"tableFields"\s+value="([^"]+?)">/;
const sqlRegExp =
  /<input\s+type="hidden"\s+name\s*=\s*"isSql"\s+id\s*=\s*"isSql"\s+value="([^"]*?)">/;
const printPageSizeRegExp =
  /<input\s+type="hidden"\s+name\s*=\s*"printPageSize"\s+id\s*=\s*"printPageSize"\s+value="([^"]*?)">/;
const keyRegExp =
  /<input\s+type="hidden"\s+name\s*=\s*"key"\s+id\s*=\s*"key"\s+value="([^"]*?)">/;
const keyCodeRegExp =
  /<input\s+type="hidden"\s+name\s*=\s*"keyCode"\s+id\s*=\s*"keyCode"\s+value="([^"]*?)">/;
const printHQLInputRegExp =
  /<input\s+type="hidden"\s+name\s*=\s*"printHQL"\s+id\s*=\s*"printHQL"\s+value="([^"]*?)">/;
const printHQLJSRegExp =
  /window\.parent\.document\.getElementById\('printHQL'\)\.value = '([^']*?)';/;
const sqlStringRegExp =
  /<input\s+type="hidden"\s+name\s*=\s*"sqlString"\s+id\s*=\s*"sqlString"\s+value="([^"]*?)">/;

const fieldRegExp =
  /<input\s+type="hidden"\s+name\s*=\s*"field"\s+id\s*=\s*"field"\s+value="([^"]*?)">/;
const totalPagesRegExp =
  /<input\s+type="hidden"\s+name\s*=\s*"totalPages"\s+id\s*=\s*"totalPages"\s+value="([^"]*?)">/;
const otherFieldsRegExp =
  /<input\s+type="hidden"\s+name\s*=\s*"otherFields"\s+id\s*=\s*"otherFields"\s+value="([^"]*?)">/;

const DEFAULT_TABLE_FIELD =
  "学号:1:1:90:a.xh,姓名:2:1:110:a.xm,开课学期:3:1:120:a.xqmc,课程名称:4:1:130:a.kcmc,总成绩:5:1:70:a.zcj,成绩标志:6:1:90:,课程性质:7:1:110:,课程类别:8:1:90:,学时:9:1:70:a.zxs,学分:10:1:70:a.xf,考试性质:11:1:100:ksxz.dmmc,补重学期:15:1:100:";
const DEFAULT_OTHER_FIELD = "null";
const QUERY_URL = `${GRAD_OLD_SYSTEM_HTTPS_SERVER}/xszqcjglAction.do?method=queryxscj`;

const getDisplayTime = (time: string): string => {
  const [startYear, endYear, semester] = time.split("-");

  return semester === "1"
    ? `${startYear.substring(2)}年秋`
    : `${endYear.substring(2)}年春`;
};

export const getGrades = (content: string, isJS = false): GradGradeResult[] =>
  Array.from(content.matchAll(isJS ? jsGradeItemRegExp : gradeItemRegExp)).map(
    ([, item]) => {
      const [
        ,
        time,
        name,
        grade,
        mark = "",
        courseCategory,
        courseType,
        hours,
        point,
        examType,
        reLearn,
      ] = Array.from(gradeCellRegExp.exec(item)!).map((item) =>
        item.replace(/&nbsp;/g, " ").trim(),
      );

      const actualGrade =
        grade && !Number.isNaN(Number(grade))
          ? Number(grade)
          : grade === "通过"
            ? 60
            : 0;

      return {
        time: getDisplayTime(time),
        name,
        grade: actualGrade,
        gradeText: grade && Number.isNaN(Number(grade)) ? grade : null,
        gradePoint:
          actualGrade < 60
            ? 0
            : Math.round((actualGrade / 10 - 5) * Number(point) * 10) / 10,
        mark,
        courseCategory,
        courseType,
        hours: hours ? Number(hours) : null,
        point: Number(point),
        examType,
        reLearn: reLearn ? getDisplayTime(reLearn) : "",
      };
    },
  );

export const getGradeLists = async (
  cookieHeader: string,
  content: string,
): Promise<GradGradeResult[]> => {
  // We force writing these 2 field to ensure we care getting the default table structure
  const tableFields = tableFieldsRegExp.exec(content)![1];
  const otherFields = String(otherFieldsRegExp.exec(content)?.[1]);
  const totalPages = Number(totalPagesRegExp.exec(content)![1]);

  // users are editing them, so the main page must be refetched
  const shouldRefetch =
    tableFields !== DEFAULT_TABLE_FIELD || otherFields !== DEFAULT_OTHER_FIELD;

  const grades = shouldRefetch ? [] : getGrades(content);

  console.log("Total pages:", totalPages);

  if (totalPages === 1 && !shouldRefetch) return grades;

  const field = String(fieldRegExp.exec(content)?.[1]);
  const isSql = sqlRegExp.exec(content)![1];
  const printPageSize = String(printPageSizeRegExp.exec(content)?.[1]);
  const key = String(keyRegExp.exec(content)?.[1]);
  const keyCode = String(keyCodeRegExp.exec(content)?.[1]);
  const printHQL =
    String(printHQLInputRegExp.exec(content)?.[1]) ||
    String(printHQLJSRegExp.exec(content)?.[1]);
  const sqlString = sqlStringRegExp.exec(content)?.[1];

  const pages: number[] = [];

  for (let page = shouldRefetch ? 1 : 2; page <= totalPages; page++)
    pages.push(page);

  await Promise.all(
    pages.map(async (page) => {
      const params = new URLSearchParams({
        keyCode,
        PageNum: page.toString(),
        printHQL,
        ...(sqlString ? { sqlString } : {}),
        isSql,
        printPageSize,
        key,
        field,
        totalPages: totalPages.toString(),
        tableFields: DEFAULT_TABLE_FIELD,
        otherFields: DEFAULT_OTHER_FIELD,
      });

      const response = await fetch(QUERY_URL, {
        method: "POST",
        headers: {
          Cookie: cookieHeader,
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: QUERY_URL,
          "User-Agent": IE_8_USER_AGENT,
        },
        body: params.toString(),
      });

      const responseText = await response.text();

      const newGrades = getGrades(responseText, true);

      grades.push(...newGrades);
    }),
  );

  return grades;
};

export const gradOldGradeListHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await gradOldSystemLogin({ id, password, authToken });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(QUERY_URL);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const cookieHeader = req.headers.cookie;

    const response = await fetch(QUERY_URL, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `${GRAD_OLD_SYSTEM_HTTPS_SERVER}/jiaowu/cjgl/xszq/query_xscj.jsp?tktime=${getIETimeStamp()}`,
        "User-Agent": IE_8_USER_AGENT,
      },
    });

    const content = await response.text();

    if (content.startsWith("<script")) return res.json(ExpiredResponse);

    const gradeList = await getGradeLists(cookieHeader, content);

    return res.json({
      success: true,
      data: gradeList,
    } as GradGradeListSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
