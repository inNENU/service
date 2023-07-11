import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import { underSystemLogin } from "./login.js";
import { getTimeStamp } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { semesterStartTime } from "../config/semester-start-time.js";
import type { CookieOptions, EmptyObject, LoginOptions } from "../typings.js";
import { IE_8_USER_AGENT, getCookieHeader } from "../utils/index.js";

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

interface UserCourseTableExtraOptions {
  /** 学号 */
  id: number;
  /** 查询时间 */
  time: string;
}

export type UserCourseTableOptions = (LoginOptions | CookieOptions) &
  UserCourseTableExtraOptions;

export interface UserCourseTableSuccessResponse {
  success: true;
  /** @deprecated */
  status: "success";
  data: TableItem;
  startTime: string;
}

export type UserCourseTableFailedResponse = AuthLoginFailedResponse;

export type UserCourseTableResponse =
  | UserCourseTableSuccessResponse
  | UserCourseTableFailedResponse;

export const underCourseTableHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UserCourseTableOptions
> = async (req, res) => {
  try {
    let cookies: Cookie[] = [];

    const { id, time } = req.body;

    if ("cookies" in req.body) {
      ({ cookies } = req.body);
    } else {
      const result = await underSystemLogin(req.body);

      if (result.status === "failed") return res.json(result);

      ({ cookies } = result);
    }

    const params = new URLSearchParams({
      method: "goListKbByXs",
      istsxx: "no",
      xnxqh: time,
      zc: "",
      xs0101id: id.toString(),
    });

    console.log("Requesting with params:", params);

    const response = await fetch(
      `https://dsjx.webvpn.nenu.edu.cn/tkglAction.do?${params.toString()}`,
      {
        headers: {
          Cookie: getCookieHeader(cookies),
          Referer: `https://dsjx.webvpn.nenu.edu.cn/tkglAction.do?method=kbxxXs&tktime=${getTimeStamp().toString()}`,
          "User-Agent": IE_8_USER_AGENT,
        },
      },
    );

    const content = await response.text();

    const tableData = getCourses(content);

    return res.json(<UserCourseTableSuccessResponse>{
      success: true,
      status: "success",
      data: tableData,
      startTime: semesterStartTime[time],
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResponse>{
      success: false,
      status: "failed",
      msg: message,
    });
  }
};
