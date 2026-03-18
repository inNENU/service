import { IE_8_USER_AGENT, getIETimeStamp, request } from "@/utils/index.js";

import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { ActionFailType, expiredResponse } from "../config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse, LoginOptions } from "../typings.js";
import type { TableClassData } from "../under-study/index.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";

const semesterStartTime: Record<string, string> = {
  "2023-2024-2": "2024-02-27T16:00:00Z",
  "2023-2024-1": "2023-08-27T16:00:00Z",
  "2022-2023-2": "2023-02-19T16:00:00Z",
  "2022-2023-1": "2022-08-28T16:00:00Z",
  "2021-2022-2": "2022-02-27T16:00:00Z",
  "2021-2022-1": "2021-08-29T16:00:00Z",
  "2020-2021-2": "2021-03-07T16:00:00Z",
  "2020-2021-1": "2020-08-30T16:00:00Z",
  "2019-2020-2": "2020-02-23T16:00:00Z",
  "2019-2020-1": "2019-08-25T16:00:00Z",
};

/** @deprecated */
export interface LegacyTableClassData extends TableClassData {
  /** @deprecated */
  teacher: string;
  /** @deprecated */
  location: string;
}

/** @deprecated */
export type LegacyTableCellData = LegacyTableClassData[];
/** @deprecated */
export type LegacyTableRowData = LegacyTableCellData[];
/** @deprecated */
export type LegacyTableData = LegacyTableRowData[];

const courseRowRegExp =
  /<tr>\s+<td[^>]*>\s+\d+\s+<\/td>\s+((?:<td[^>]*>[^]+?<\/td>\s*?)+)\s+<\/tr>/g;
const courseCellRegExp = /<td .*?>\s+<div id="\d-\d-\d"\s?>([^]+?)<\/div>[^]+?<\/td>/g;

const classRegExp =
  /<a[^>]*?>(.+?)\s*<br>(.+?)<br>\s*<nobr>\s*(\S+?)<nobr><br>(.+?)<br><br>\s*<\/a>/g;

const getWeekRange = (timeText: string): number[] => {
  const match = [...timeText.matchAll(/([\d,-]+)[^\d]*周/g)];

  return match
    .map(([, time]) =>
      time.split(",").map((item) => {
        const range = item.split("-").map(Number);

        if (range.length === 1) return range;

        return Array.from({ length: range[1] - range[0] + 1 }, (_, index) => index + range[0]);
      }),
    )
    .flat(2);
};

const getClassIndex = (timeText: string): [number, number] => {
  const match = [...timeText.matchAll(/\[(\d+)-(\d+)节\]/g)];

  return match
    .map(([, startIndex, endIndex]) => [Number(startIndex), Number(endIndex)])
    .flat(2) as [number, number];
};

const getCourses = (content: string): LegacyTableData =>
  [...content.matchAll(courseRowRegExp)].map(([, rowContent]) =>
    [...rowContent.matchAll(courseCellRegExp)].map(([, cell]) => {
      const result: (Omit<LegacyTableClassData, "teacher" | "location" | "locations"> & {
        locations: Record<string, string>;
      })[] = [];

      [...cell.matchAll(classRegExp)].forEach(([, name, teacher, time, location]) => {
        const weeks = getWeekRange(time);
        const locations = Object.fromEntries(
          Array.from({ length: weeks.length }, (_, i) => [weeks[i].toString(), location]),
        );
        const existingClass = result.find((item) => item.name === name);

        if (existingClass) {
          existingClass.weeks.push(...weeks);
          existingClass.locations = {
            ...existingClass.locations,
            ...locations,
          };
        }

        result.push({
          name,
          teachers: [teacher],
          time,
          locations,
          weeks: getWeekRange(time),
          classIndex: getClassIndex(time),
        });
      });

      return result.map(({ weeks, ...item }) => {
        const locations = weeks.map((week) => item.locations[week.toString()]);

        return {
          ...item,
          teacher: item.teachers.join("，"),
          weeks: weeks.sort((a, b) => a - b),
          locations,
          location: [...new Set(locations)].join("，"),
        };
      });
    }),
  );

/** @deprecated */
export interface LegacyUnderCourseTableOptions extends LoginOptions {
  /** 查询时间 */
  time: string;
}

/** @deprecated */
export type LegacyUnderCourseTableSuccessResponse = CommonSuccessResponse<{
  table: LegacyTableData;
  startTime: string;
}>;

/** @deprecated */
export type LegacyUnderCourseTableFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<ActionFailType.MissingCommentary | ActionFailType.Unknown>;

/** @deprecated */
export type UnderCourseTableResponse =
  | LegacyUnderCourseTableSuccessResponse
  | LegacyUnderCourseTableFailedResponse;

export const LEGACY_UNDER_COURSE_TABLE_TEST_RESPONSE: LegacyUnderCourseTableSuccessResponse = {
  success: true,
  data: {
    table: Array.from({ length: 6 }).map((_, classIndex) =>
      Array.from({ length: 7 }).map((_, weekIndex) =>
        Math.random() * 7 > 5
          ? [
              {
                name: `测试课程 ${weekIndex + 1}-${classIndex + 1}`,
                teachers: ["测试教师"],
                time: `星期${weekIndex + 1} 第${classIndex * 2 + 1}${classIndex * 2 + 2}节`,
                classIndex: [classIndex * 2 + 1, classIndex * 2 + 2],
                weeks: Array.from({ length: 17 }, (_, i) => i + 1),
                locations: Array.from({ length: 17 }, () => "测试地点"),
                teacher: "测试教师",
                location: "测试地点",
              },
            ]
          : [],
      ),
    ),
    startTime: "2020-09-01",
  },
};

export const getUnderCourseTable = async (
  cookieHeader: string,
  time: string,
): Promise<UnderCourseTableResponse> => {
  const QUERY_URL = `${UNDER_SYSTEM_SERVER}/tkglAction.do?${new URLSearchParams({
    method: "goListKbByXs",
    istsxx: "no",
    xnxqh: time,
    zc: "",
  }).toString()}`;

  const response = await fetch(QUERY_URL, {
    headers: {
      Cookie: cookieHeader,
      Referer: `${UNDER_SYSTEM_SERVER}/tkglAction.do?method=kbxxXs&tktime=${getIETimeStamp()}`,
      "User-Agent": IE_8_USER_AGENT,
    },
    redirect: "manual",
  });

  if (response.status === 302) return expiredResponse;

  const content = await response.text();

  if (content.includes("评教未完成，不能查看课表！")) {
    return {
      success: false,
      type: ActionFailType.MissingCommentary,
      msg: "上学期评教未完成，不能查看本学期课表",
    };
  }

  return {
    success: true,
    data: {
      table: getCourses(content),
      startTime: semesterStartTime[time],
    },
  };
};

export const underCourseTableHandler = request<
  UnderCourseTableResponse,
  LegacyUnderCourseTableOptions
>(async (req, res) => {
  const { time } = req.body;
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST")) return res.json(LEGACY_UNDER_COURSE_TABLE_TEST_RESPONSE);

  const year = Number(time.slice(0, 4));

  if (year >= 2024) {
    return res.json({
      success: false,
      type: ActionFailType.Forbidden,
      msg: "该系统不支持查询 2024 年之后的课表",
    });
  }

  return res.json(await getUnderCourseTable(cookieHeader, time));
});
