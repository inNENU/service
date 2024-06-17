import type { RequestHandler } from "express";

import { gradOldSystemLogin } from "./login.js";
import { GRAD_OLD_SYSTEM_HTTPS_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { semesterStartTime } from "../config/semester-start-time.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT, getIETimeStamp } from "../utils/index.js";

export interface ClassItem {
  name: string;
  teacher: string;
  time: string;
  location: string;
}

export type CellItem = ClassItem[];
export type RowItem = CellItem[];
export type TableItem = RowItem[];

const courseRowRegExp =
  /<tr>\s+<td[^>]*>\s+\d+\s+<\/td>\s+((?:<td[^>]*>[^]+?<\/td>\s*?)+)\s+<\/tr>/g;
const courseCellRegExp =
  /<td .*?>[^]+?<div id="\d-\d-\d"\s+style="display: none;"\s?>(?:&nbsp;)*([^]+?)<\/div>[^]+?<\/td>/g;

const classRegExp =
  /(.+?)<br>(?:.+?)<br>(.+?)<br>\s*<nobr>\s*(\S+?)<nobr><br>(.+?)<br>\s*/g;

const getCourses = (content: string): TableItem =>
  [...content.matchAll(courseRowRegExp)].map(([, rowContent]) =>
    [...rowContent.matchAll(courseCellRegExp)].map(([, cell]) => {
      const classMap: Record<string, ClassItem[]> = {};

      [...cell.matchAll(classRegExp)]
        .map(([, name, teacher, time, location]) => ({
          name,
          teacher,
          time,
          location,
        }))
        .forEach((item) => {
          (classMap[item.name] ??= []).push(item);
        });

      return Object.values(classMap).map((classes) => ({
        name: classes[0].name,
        location: classes[0].location,
        teacher: classes.map((item) => item.teacher).join("、"),
        time: classes.map((item) => item.time).join("、"),
      }));
    }),
  );

export interface GradCourseTableOptions extends LoginOptions {
  /** 查询时间 */
  time: string;
}

export interface GradCourseTableSuccessResponse {
  success: true;
  data: TableItem;
  startTime: string;
}

export type GradCourseTableFailedResponse = AuthLoginFailedResponse;

export type GradCourseTableResponse =
  | GradCourseTableSuccessResponse
  | GradCourseTableFailedResponse;

export const gradOldCourseTableHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  GradCourseTableOptions
> = async (req, res) => {
  try {
    const { time } = req.body;

    const QUERY_URL = `${GRAD_OLD_SYSTEM_HTTPS_SERVER}/tkglAction.do?${new URLSearchParams(
      {
        method: "goListKbByXs",
        xnxqh: time,
      },
    ).toString()}`;

    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        throw new Error(`"id" and password" field is required!`);

      const result = await gradOldSystemLogin(req.body as AccountInfo);

      if (!result.success) return res.json(result);

      cookieHeader = result.cookieStore.getHeader(QUERY_URL);
    }

    const response = await fetch(QUERY_URL, {
      headers: {
        Cookie: cookieHeader,
        Referer: `${GRAD_OLD_SYSTEM_HTTPS_SERVER}/tkglAction.do?method=kbxxXs&tktime=${getIETimeStamp()}`,
        "User-Agent": IE_8_USER_AGENT,
      },
    });

    const content = await response.text();

    if (content.includes("该学期无课表时间信息"))
      throw new Error("该学期无课表时间信息");

    const tableData = getCourses(content);

    return res.json({
      success: true,
      data: tableData,
      startTime: semesterStartTime[time],
    } as GradCourseTableSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
