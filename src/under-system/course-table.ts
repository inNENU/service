import type { RequestHandler } from "express";

import { underSystemLogin } from "./login.js";
import { SERVER, getTimeStamp } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import { semesterStartTime } from "../config/semester-start-time.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT } from "../utils/index.js";
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
  /<a[^>]*?>(\S+?)<br>(\S+?)<br>\s*<nobr>\s*(\S+?)<nobr><br>(\S+?)<br><br>\s*<\/a>/g;

const getCourses = (content: string): TableItem =>
  [...content.matchAll(courseRowRegExp)].map(([, rowContent]) =>
    [...rowContent.matchAll(courseCellRegExp)].map(([, cell]) =>
      [...cell.matchAll(classRegExp)].map(
        ([, name, teacher, time, location]) => ({
          name,
          teacher,
          time,
          location,
        }),
      ),
    ),
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

    const QUERY_URL = `${SERVER}/tkglAction.do?${new URLSearchParams({
      method: "goListKbByXs",
      istsxx: "no",
      xnxqh: time,
      zc: "",
    }).toString()}`;

    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await underSystemLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);

      cookieHeader = result.cookieStore.getHeader(QUERY_URL);
    }

    const response = await fetch(QUERY_URL, {
      headers: {
        Cookie: cookieHeader,
        Referer: `${SERVER}/tkglAction.do?method=kbxxXs&tktime=${getTimeStamp()}`,
        "User-Agent": IE_8_USER_AGENT,
      },
      redirect: "manual",
    });

    if (response.status === 302)
      return res.json(<CommonFailedResponse>{
        success: false,
        type: LoginFailType.Expired,
        msg: "登录已过期，请重试",
      });

    const content = await response.text();

    if (content.includes("评教未完成，不能查看课表！"))
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "上学期评教未完成，不能查看本学期课表",
      });

    const tableData = getCourses(content);

    return res.json(<UnderCourseTableSuccessResponse>{
      success: true,
      data: tableData,
      startTime: semesterStartTime[time],
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
