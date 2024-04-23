import type { RequestHandler } from "express";

import { underSystemLogin } from "./login.js";
import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import { semesterStartTime } from "../config/semester-start-time.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT, getIETimeStamp } from "../utils/index.js";
import type { VPNLoginFailedResult } from "../vpn/login.js";

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
  /<tr>\s+<td[^>]*>\s+\d+\s+<\/td>\s+((?:<td[^>]*>[\s\S]+?<\/td>\s*?)+)\s+<\/tr>/g;
const courseCellRegExp =
  /<td .*?>\s+<div id="\d-\d-\d"\s?>([\s\S]+?)<\/div>[\s\S]+?<\/td>/g;

const classRegExp =
  /<a[^>]*?>(.+?)\s*<br>(.+?)<br>\s*<nobr>\s*(\S+?)<nobr><br>(.+?)<br><br>\s*<\/a>/g;

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

export interface UnderCourseTableOptions extends Partial<LoginOptions> {
  /** 查询时间 */
  time: string;
}

export interface UnderCourseTableSuccessResponse {
  success: true;
  data: TableItem;
  startTime: string;
}

export type UnderCourseTableFailedResponse =
  | AuthLoginFailedResult
  | VPNLoginFailedResult
  | CommonFailedResponse;

export type UnderCourseTableResponse =
  | UnderCourseTableSuccessResponse
  | UnderCourseTableFailedResponse;

export const underCourseTableHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderCourseTableOptions
> = async (req, res) => {
  try {
    const { time } = req.body;

    const QUERY_URL = `${UNDER_SYSTEM_SERVER}/tkglAction.do?${new URLSearchParams(
      {
        method: "goListKbByXs",
        istsxx: "no",
        xnxqh: time,
        zc: "",
      },
    ).toString()}`;

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

    const response = await fetch(QUERY_URL, {
      headers: {
        Cookie: cookieHeader,
        Referer: `${UNDER_SYSTEM_SERVER}/tkglAction.do?method=kbxxXs&tktime=${getIETimeStamp()}`,
        "User-Agent": IE_8_USER_AGENT,
      },
      redirect: "manual",
    });

    if (response.status === 302)
      return res.json({
        success: false,
        type: LoginFailType.Expired,
        msg: "登录已过期，请重试",
      } as CommonFailedResponse);

    const content = await response.text();

    if (content.includes("评教未完成，不能查看课表！"))
      return res.json({
        success: false,
        msg: "上学期评教未完成，不能查看本学期课表",
      } as CommonFailedResponse);

    const tableData = getCourses(content);

    return res.json({
      success: true,
      data: tableData,
      startTime: semesterStartTime[time],
    } as UnderCourseTableSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
