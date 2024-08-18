import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import {
  ActionFailType,
  ExpiredResponse,
  semesterStartTime,
} from "../config/index.js";
import type { CommonFailedResponse, LoginOptions } from "../typings.js";
import { IE_8_USER_AGENT, getIETimeStamp, middleware } from "../utils/index.js";
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
  | CommonFailedResponse<
      ActionFailType.MissingCommentary | ActionFailType.Unknown
    >;

export type UnderCourseTableResponse =
  | UnderCourseTableSuccessResponse
  | UnderCourseTableFailedResponse;

export const UNDER_COURSE_TABLE_TEST_RESPONSE: UnderCourseTableSuccessResponse =
  {
    success: true,
    data: Array.from({ length: 6 }).map((_, classIndex) =>
      Array.from({ length: 7 }).map((_, weekIndex) =>
        Math.random() * 7 > 5
          ? [
              {
                name: `测试课程 ${weekIndex + 1}-${classIndex + 1}`,
                teacher: "测试教师",
                time: `星期${weekIndex + 1} 第${classIndex * 2 + 1}${classIndex * 2 + 2}节`,
                location: "测试地点",
              },
            ]
          : [],
      ),
    ),
    startTime: "2020-09-01",
  };

export const getUnderCourseTable = async (
  cookieHeader: string,
  time: string,
): Promise<UnderCourseTableResponse> => {
  const QUERY_URL = `${UNDER_SYSTEM_SERVER}/tkglAction.do?${new URLSearchParams(
    {
      method: "goListKbByXs",
      istsxx: "no",
      xnxqh: time,
      zc: "",
    },
  ).toString()}`;

  const response = await fetch(QUERY_URL, {
    headers: {
      Cookie: cookieHeader,
      Referer: `${UNDER_SYSTEM_SERVER}/tkglAction.do?method=kbxxXs&tktime=${getIETimeStamp()}`,
      "User-Agent": IE_8_USER_AGENT,
    },
    redirect: "manual",
  });

  if (response.status === 302) return ExpiredResponse;

  const content = await response.text();

  if (content.includes("评教未完成，不能查看课表！"))
    return {
      success: false,
      type: ActionFailType.MissingCommentary,
      msg: "上学期评教未完成，不能查看本学期课表",
    };

  const tableData = getCourses(content);

  return {
    success: true,
    data: tableData,
    startTime: semesterStartTime[time],
  };
};

export const underCourseTableHandler = middleware<
  UnderCourseTableResponse,
  UnderCourseTableOptions
>(async (req, res) => {
  const { time } = req.body;
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST"))
    return res.json(UNDER_COURSE_TABLE_TEST_RESPONSE);

  return res.json(await getUnderCourseTable(cookieHeader, time));
});
