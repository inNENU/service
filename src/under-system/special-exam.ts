import type { RequestHandler } from "express";

import { underSystemLogin } from "./login.js";
import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT, getIETimeStamp } from "../utils/index.js";

export interface UnderSpecialExamItem {
  /** 考试时间 */
  time: string;

  /** 考试名称 */
  name: string;

  /** 考试分数 */
  score: number;
}

const gradeItemRegExp =
  /<td[^>]*?>[^<]*?<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>[^<]*?<\/td><td[^>]*?>[^<]*?<\/td><td[^>]*?>[^<]*?<\/td><td[^>]*?>[^<]*?<\/td><td[^>]*?>[^<]*?<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^<]*?)<\/td><\/tr>/g;

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
const xsIdRegExp =
  /<input\s+type="hidden"\s+name\s*=\s*"xsId"\s+id\s*=\s*"xsId"\s+value="([^"]*?)" \/>/;

const DEFAULT_TABLE_FIELD =
  "学年学期:0:1:120:xqmc,学号:1:1:120:xh,姓名:2:1:120:xm,管理年度:7:1:120:dqszj,专业名称:5:1:120:zymc,上课单位:6:1:150:dwmc,控制名称:4:1:150:skkz,总成绩:3:1:100:zcj";
const DEFAULT_OTHER_FIELD = "null";
const QUERY_URL = `${UNDER_SYSTEM_SERVER}/jiaowu/cjgl/cxfxtj/zxcjcxxs.jsp`;

const getGrades = (content: string): UnderSpecialExamItem[] =>
  Array.from(content.matchAll(gradeItemRegExp)).map(
    ([, time, name, score]) => ({
      time,
      name,
      score: Number(score),
    }),
  );

export const getSpecialExams = async (
  cookieHeader: string,
  content: string,
): Promise<UnderSpecialExamItem[]> => {
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
  const xsId = xsIdRegExp.exec(content)![1];

  const pages: number[] = [];

  for (let page = shouldRefetch ? 1 : 2; page <= totalPages; page++)
    pages.push(page);

  await Promise.all(
    pages.map(async (page) => {
      const params = new URLSearchParams({
        xsId,
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

      const newGrades = getGrades(responseText);

      grades.push(...newGrades);
    }),
  );

  return grades;
};

export interface UnderSpecialExamSuccessResponse {
  success: true;
  data: UnderSpecialExamItem[];
}

export type UnderSpecialExamResponse =
  | UnderSpecialExamSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

export const underSpecialExamHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Partial<LoginOptions>
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json({
          success: false,
          msg: "请提供账号密码",
        } as CommonFailedResponse);

      const result = await underSystemLogin(req.body as LoginOptions);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(QUERY_URL);
    }

    const response = await fetch(`${QUERY_URL}?tktime=${getIETimeStamp()}`, {
      headers: {
        Cookie: cookieHeader,
        Referer: `${UNDER_SYSTEM_SERVER}/framework/new_window.jsp?lianjie=&winid=win5`,
        "User-Agent": IE_8_USER_AGENT,
      },
    });

    const content = await response.text();

    const gradeList = await getSpecialExams(cookieHeader, content);

    return res.json({
      success: true,
      data: gradeList,
    } as UnderSpecialExamSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
