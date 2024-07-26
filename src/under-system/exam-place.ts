import type { RequestHandler } from "express";

import { underSystemLogin } from "./login.js";
import {
  UNDER_SYSTEM_SERVER,
  fieldRegExp,
  keyCodeRegExp,
  otherFieldsRegExp,
  printHQLInputRegExp,
  printHQLJSRegExp,
  printPageSizeRegExp,
  sqlStringRegExp,
  tableFieldsRegExp,
  totalPagesRegExp,
} from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { MissingCredentialResponse, UnknownResponse } from "../config/index.js";
import type { AccountInfo, EmptyObject, LoginOptions } from "../typings.js";
import { IE_8_USER_AGENT } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/login.js";

const selectRegExp =
  /<select\s+name="kskzid"\s+id="kskzid"[^>]*><option value="">---请选择---<\/option>([^]*?)<\/select>/;
const optionRegExp = /<option value="([^"]+)">([^<]+)<\/option>/g;

const examRegExp =
  /<tr[^>]*><td[^>]*>.*?<\/td>\s*<td[^>]*>.*?<\/td>\s*<td[^>]*>.*?<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/g;

const DEFAULT_TABLE_FIELD =
  "学号:0:1:90:xh,姓名:1:1:90:xm,课程名称:2:1:130:course_name,考试时间:3:1:260:kw0403.ksqssj,校区名称:4:1:200:xqmc,教学楼:5:1:300:jxl,考场:6:1:420:kw0404.kcmc";
const DEFAULT_OTHER_FIELD = "null";

const INFO_URL = `${UNDER_SYSTEM_SERVER}/jiaowu/kwgl/kwgl_xsJgfb_soso.jsp`;
const QUERY_URL = `${UNDER_SYSTEM_SERVER}/kwsjglAction.do?method=sosoXsFb`;

export interface ExamPlace {
  /** 课程 */
  course: string;
  /** 时间 */
  time: string;
  /** 校区 */
  campus: string;
  /** 教学楼 */
  building: string;
  /** 考场 */
  classroom: string;
}

const getExamPlaces = (content: string): ExamPlace[] =>
  Array.from(content.matchAll(examRegExp)).map((item) => {
    const [, course, time, campus, building, classroom] = item.map((text) =>
      text.replace(/&nbsp;/g, "").trim(),
    );

    return {
      course,
      time,
      campus,
      building,
      classroom,
    };
  });

export const getExamList = async (
  cookieHeader: string,
  value: string,
): Promise<ExamPlace[]> => {
  const response = await fetch(QUERY_URL, {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: INFO_URL,
      "User-Agent": IE_8_USER_AGENT,
    },
    body: new URLSearchParams({
      xnxq: "",
      kskzid: value,
    }),
  });

  const content = await response.text();

  // We force writing these 2 field to ensure we care getting the default table structure
  const tableFields = tableFieldsRegExp.exec(content)![1];
  const otherFields = String(otherFieldsRegExp.exec(content)?.[1]);
  const totalPages = Number(totalPagesRegExp.exec(content)![1]);

  // users are editing them, so the main page must be refetched
  const shouldRefetch =
    tableFields !== DEFAULT_TABLE_FIELD || otherFields !== DEFAULT_OTHER_FIELD;

  const exams = shouldRefetch ? [] : getExamPlaces(content);

  console.log("Total pages:", totalPages);

  if (totalPages === 1 && !shouldRefetch) return exams;

  const field = String(fieldRegExp.exec(content)?.[1]);
  const printPageSize = String(printPageSizeRegExp.exec(content)?.[1]);
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
        printPageSize,
        field,
        totalPages: totalPages.toString(),
        tableFields: DEFAULT_TABLE_FIELD,
        otherFields: DEFAULT_OTHER_FIELD,
      });

      const response = await fetch(INFO_URL, {
        method: "POST",
        headers: {
          Cookie: cookieHeader,
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: INFO_URL,
          "User-Agent": IE_8_USER_AGENT,
        },
        body: params.toString(),
      });

      const responseText = await response.text();

      const newExamPlaces = getExamPlaces(responseText);

      exams.push(...newExamPlaces);
    }),
  );

  return exams;
};

export interface UnderExamPlaceSuccessResponse {
  success: true;

  /** 计划 */
  data: {
    name: string;
    exams: ExamPlace[];
  }[];
}

export type UnderExamPlaceFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export type UnderExamPlaceResponse =
  | UnderExamPlaceSuccessResponse
  | UnderExamPlaceFailedResponse;

export const underExamPlaceHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await underSystemLogin(req.body as AccountInfo);

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(UNDER_SYSTEM_SERVER);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const cookieHeader = req.headers.cookie;

    if (cookieHeader.includes("TEST")) {
      return res.json({
        success: true,
        data: [
          {
            name: "测试计划",
            exams: Array.from({ length: 5 }, (_, i) => ({
              course: `课程${i + 1}`,
              time: `2023-01-0${i + 1}`,
              campus: "校区",
              building: "教学楼",
              classroom: "考场",
            })),
          },
        ],
      } as UnderExamPlaceSuccessResponse);
    }

    const response = await fetch(INFO_URL, {
      headers: {
        Cookie: cookieHeader,
        "User-Agent": IE_8_USER_AGENT,
      },
    });

    const content = await response.text();
    const select = selectRegExp.exec(content)![1].trim();

    const options = Array.from(select.matchAll(optionRegExp)).map(
      ([, value, name]) => ({ value, name }),
    );

    const data = await Promise.all(
      options.map(async ({ name, value }) => ({
        name,
        exams: await getExamList(cookieHeader, value),
      })),
    );

    return res.json({
      success: true,
      data,
    } as UnderExamPlaceSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
