import type { RequestHandler } from "express";

import { postSystemLogin } from "./login.js";
import { SERVER, getTimeStamp } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import { semesterStartTime } from "../config/semester-start-time.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT } from "../utils/index.js";

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
  /<td .*?>[\s\S]+?<div id="\d-\d-\d"\s+style="display: none;"\s?>(?:&nbsp;)*([\s\S]+?)<\/div>[\s\S]+?<\/td>/g;

const classRegExp =
  /(\S+?)<br>(?:\S+?)<br>(\S+?)<br>\s*<nobr>\s*(\S+?)<nobr><br>(\S+?)<br>\s*/g;

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

export interface PostCourseTableOptions extends Partial<LoginOptions> {
  /** 查询时间 */
  time: string;
}

export interface PostCourseTableSuccessResponse {
  success: true;
  data: TableItem;
  startTime: string;
}

export type PostCourseTableFailedResponse = AuthLoginFailedResult;

export type PostCourseTableResponse =
  | PostCourseTableSuccessResponse
  | PostCourseTableFailedResponse;

export const postCourseTableHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  PostCourseTableOptions
> = async (req, res) => {
  try {
    const { time } = req.body;

    const QUERY_URL = `${SERVER}/tkglAction.do?${new URLSearchParams({
      method: "goListKbByXs",
      xnxqh: time,
    }).toString()}`;

    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await postSystemLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);

      cookieHeader = result.cookieStore.getHeader(QUERY_URL);
    }

    const response = await fetch(QUERY_URL, {
      headers: {
        Cookie: cookieHeader,
        Referer: `${SERVER}/tkglAction.do?method=kbxxXs&tktime=${getTimeStamp()}`,
        "User-Agent": IE_8_USER_AGENT,
      },
    });

    const content = await response.text();

    const tableData = getCourses(content);

    return res.json(<PostCourseTableSuccessResponse>{
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
