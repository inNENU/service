import type { RequestHandler } from "express";

import { underSystemLogin } from "./login.js";
import { SERVER, getTimeStamp } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import { semesterStartTime } from "../config/semester-start-time.js";
import type { CookieOptions, EmptyObject, LoginOptions } from "../typings.js";
import {
  CookieStore,
  IE_8_USER_AGENT,
  getCookieItems,
} from "../utils/index.js";

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
  // Comment as not required
  // id: number;
  /** 查询时间 */
  time: string;
}

export type UserCourseTableOptions =
  | ((LoginOptions | CookieOptions) & UserCourseTableExtraOptions)
  | UserCourseTableExtraOptions;

export interface UserCourseTableSuccessResponse {
  success: true;
  data: TableItem;
  startTime: string;
}

export type UserCourseTableFailedResponse = AuthLoginFailedResult;

export type UserCourseTableResponse =
  | UserCourseTableSuccessResponse
  | UserCourseTableFailedResponse;

export const underCourseTableHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UserCourseTableOptions
> = async (req, res) => {
  try {
    const cookieStore = new CookieStore();

    const { time } = req.body;

    if (!req.headers.cookie)
      if ("cookies" in req.body) {
        cookieStore.apply(getCookieItems(req.body.cookies));
      } else {
        const result = await underSystemLogin(
          <LoginOptions>req.body,
          cookieStore,
        );

        if (!result.success) return res.json(result);
      }

    const params = new URLSearchParams({
      method: "goListKbByXs",
      istsxx: "no",
      xnxqh: time,
      zc: "",
      // Not required
      // xs0101id: id.toString(),
    });

    console.log("Requesting with params:", params);

    const url = `${SERVER}/tkglAction.do?${params.toString()}`;

    const response = await fetch(
      `${SERVER}/tkglAction.do?${params.toString()}`,
      {
        headers: {
          Cookie: req.headers.cookie || cookieStore.getHeader(url),
          Referer: `${SERVER}/tkglAction.do?method=kbxxXs&tktime=${getTimeStamp().toString()}`,
          "User-Agent": IE_8_USER_AGENT,
        },
      },
    );

    const content = await response.text();

    const tableData = getCourses(content);

    return res.json(<UserCourseTableSuccessResponse>{
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
