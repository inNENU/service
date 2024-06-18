import type { RequestHandler } from "express";

import { underSystemLogin } from "./login.js";
import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import {
  ActionFailType,
  ExpiredResponse,
  UnknownResponse,
  semesterStartTime,
} from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT, getIETimeStamp } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/login.js";

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
  /<td .*?>\s+<div id="\d-\d-\d"\s?>([^]+?)<\/div>[^]+?<\/td>/g;

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

export interface UnderCourseTableOptions extends LoginOptions {
  /** 查询时间 */
  time: string;
}

export interface UnderCourseTableSuccessResponse {
  success: true;
  data: TableItem;
  startTime: string;
}

export type UnderCourseTableFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
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
        throw new Error(`"id" and password" field is required!`);

      const result = await underSystemLogin(req.body as AccountInfo);

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

    if (response.status === 302) return res.json(ExpiredResponse);

    const content = await response.text();

    if (content.includes("评教未完成，不能查看课表！"))
      return res.json({
        success: false,
        type: ActionFailType.MissingCommentary,
        msg: "上学期评教未完成，不能查看本学期课表",
      });

    const tableData = getCourses(content);

    return res.json({
      success: true,
      data: tableData,
      startTime: semesterStartTime[time],
    } as UnderCourseTableSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
