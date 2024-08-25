import type { RawUnderCourseTableItem } from "./typings.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import {
  ExpiredResponse,
  UnknownResponse,
  semesterStartTime,
} from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS, middleware } from "../../utils/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export interface UnderCourseTableOptions extends LoginOptions {
  /** 查询时间 */
  time: string;
}

interface RawUnderCourseTableSuccessResult {
  code: 0;
  data: RawUnderCourseTableItem[];
  message: string;
}

interface RawUnderCourseTableFailResult {
  code: number;
  data: unknown;
  message: string;
}

type RawUnderCourseTableResult =
  | RawUnderCourseTableSuccessResult
  | RawUnderCourseTableFailResult;

export interface TableClassData {
  name: string;
  teachers: string[];
  time: string;
  weeks: number[];
  locations: string[];
  classIndex: [number, number];
}

export type TableCellData = TableClassData[];
export type TableRowData = TableCellData[];
export type TableData = TableRowData[];

export type UnderCourseTableSuccessResponse = CommonSuccessResponse<{
  table: TableData;
  startTime: string;
}>;

export type UnderCourseTableResponse =
  | UnderCourseTableSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse;

export const getCourseTable = (
  classes: RawUnderCourseTableItem[],
): TableData => {
  const tableData = new Array(6).fill(null).map(() =>
    new Array(7).fill(null).map<
      (Omit<TableClassData, "locations"> & {
        locations: Record<string, string>;
      })[]
    >(() => []),
  );

  const store = new Map<
    string,
    Omit<TableClassData, "locations"> & {
      locations: Record<string, string>;
    }
  >();

  classes.forEach(
    ({
      kcmc: name,
      xq: week,
      zc: weeksText,
      ps: startClassIndex,
      pe: endClassIndex,
      jxcdmc2: locationsText,
      teaxms: teachersName,
      qssj: startTime,
      jssj: endTime,
    }) => {
      const weeks = weeksText.split(",").map(Number);
      const location = Object.fromEntries(
        locationsText.split(",").map((item) => {
          const temp = item.split("-");
          const week = temp.pop()!;

          return [week, temp.join("-")];
        }),
      );

      const key = JSON.stringify({
        name,
        teachersName,
        week,
        startTime,
        endTime,
      });

      if (store.has(key)) {
        const data = store.get(key)!;

        data.weeks.push(...weeks);
        data.locations = {
          ...data.locations,
          ...location,
        };

        return;
      }

      const classData: Omit<TableClassData, "locations"> & {
        locations: Record<string, string>;
      } = {
        name,
        teachers: teachersName.split(","),
        time: `${startTime} - ${endTime}`,
        weeks: weeks,
        locations: location,
        classIndex: [Number(startClassIndex), Number(endClassIndex)],
      };

      tableData[Math.floor(Number(startClassIndex) / 2)][Number(week) - 1].push(
        classData,
      );
      store.set(key, classData);
    },
  );

  return tableData.map((row) =>
    row.map((cell) =>
      cell.map(({ weeks, locations, ...rest }) => ({
        ...rest,
        weeks: weeks.sort((a, b) => a - b),
        locations: weeks.map((week) => locations[week.toString()]),
      })),
    ),
  );
};

export const getUnderCourseTable = async (
  cookieHeader: string,
  time: string,
): Promise<UnderCourseTableResponse> => {
  const queryUrl = `${UNDER_STUDY_SERVER}/new/student/xsgrkb/getCalendarWeekDatas`;

  const response = await fetch(queryUrl, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${UNDER_STUDY_SERVER}/new/student/xsgrkb/week.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      xnxqdm: time,
    }),
  });

  if (response.headers.get("Content-Type")?.includes("text/html"))
    return ExpiredResponse;

  const data = (await response.json()) as RawUnderCourseTableResult;

  if (data.code !== 0) {
    if (data.message === "尚未登录，请先登录") return ExpiredResponse;
    if (data.message === "本学期课表未开放!")
      return UnknownResponse(data.message);

    throw new Error(data.message);
  }

  const courseTable = getCourseTable(data.data as RawUnderCourseTableItem[]);

  return {
    success: true,
    data: {
      table: courseTable,
      startTime: semesterStartTime[time],
    },
  };
};

export const underStudyCourseTableHandler = middleware<
  UnderCourseTableResponse,
  UnderCourseTableOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  // if (cookieHeader.includes("TEST"))
  //   return res.json(UNDER_GRADE_DETAIL_RESPONSE);

  return res.json(await getUnderCourseTable(cookieHeader, req.body.time));
});
