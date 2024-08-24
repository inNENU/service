import { UNDER_STUDY_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import {
  ExpiredResponse,
  UnknownResponse,
  semesterStartTime,
} from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "../typings.js";
import { EDGE_USER_AGENT_HEADERS, middleware } from "../utils/index.js";

export interface UnderCourseTableOptions extends LoginOptions {
  /** 查询时间 */
  time: string;
}

interface RawUnderCourseTableItem {
  /* ========= 课程基础信息 ========== */

  /**
   * 课程名称
   *
   * @example "习近平新时代中国特色社会主义思想概论"
   */
  kcmc: string;

  /**
   * 学时
   *
   * @example 2
   */
  xs: 2;

  /**
   * 课程编号
   *
   * @description 可用于查询指定课程
   */
  kcbh: string;
  /** 课程代码 */
  kcdm: string;

  /* ========= 班级信息 ========== */

  /**
   * 班级名称，可能为空
   *
   * @example "理科1班"
   */
  jxbmc: string;

  /**
   * 课容量
   *
   * @example 125
   */
  pkrs: number;

  /**
   * 教师姓名 (多个)，用英文逗号分隔
   *
   * @example "王庆勇,单桂晔,郭晋芝,周亚洲,邢海军,王玲玲,高志华,曹峻鸣"
   */
  teaxms: string;

  /**
   * 教师代码 (多个)，用英文逗号分隔
   *
   * @example "11300640,11841840,12432672"
   */
  teadms: "11300640,11841840,12432672";

  /**
   * 上课地址
   *
   * @example "逸夫教学楼401室"
   */
  jxcdmc: "逸夫教学楼401室";

  /**
   * 每周上课地址，用英文逗号分隔
   *
   * @example "逸夫教学楼401室-17,逸夫教学楼401室-12,逸夫教学楼401室-13,逸夫教学楼401室-14,逸夫教学楼401室-15,逸夫教学楼401室-16,逸夫教学楼401室-18,逸夫教学楼401室-19,逸夫教学楼401室-4,逸夫教学楼401室-5,逸夫教学楼401室-6,逸夫教学楼401室-7,逸夫教学楼401室-8,逸夫教学楼401室-9,逸夫教学楼401室-10,逸夫教学楼401室-11,逸夫教学楼401室-2,逸夫教学楼401室-3"
   */
  jxcdmc2: string;

  /**
   * 周次，用英文逗号分隔
   *
   * @example "17,12,13,14,15,16,18,19,4,5,6,7,8,9,10,11,2,3"
   */
  zc: string;

  /** 班级代码 */
  jxbdm: string;

  /* ========= 时间信息 ========== */

  /**
   * 学期代码
   *
   * @example "202301"
   */
  xnxqdm: string;
  /**
   * 星期
   *
   * @example "3"
   */
  xq: string;
  /**
   * 开始课时
   *
   * @example "01"
   */
  ps: string;
  /**
   * 结束课时
   *
   * @example "02"
   */
  pe: string;
  /**
   * 开始时间
   *
   * @example "08:00:00"
   */
  qssj: string;
  /**
   * 结束时间
   *
   * @example "09:30:00"
   */
  jssj: string;

  bapjxcd: "0";
  jxhjmc: "理论课时";
  kkxqdm: "MW";
  kcdldm: "03";
  jxcddm: "1015195";
  pkr: "";
  kcrwdm: "202320241000603";
  kxh: "1,10,11,12,13,14,15,16,17,2,3,4,5,6,7,8,9";
  islock: "0";
  pkrdms: "11369632";
  pkrlevel: 0;
  iszdjxcd: "0";
  jxxsmc: "";
  qsxq: "4";
  jsxq: "4";
  jxhjdm: "01";
  zdgnqdm: "";
  dgksdm: "223872330,223872000,223872066,223872132,223872198,223872264,223872396,223872462,246767928,246767994,246768060,246768126,246768192,246768258,246768324,246768390,268764936,268765002";
  tkbz: "1";
  zt: "1";
  jxmsmc: "";
  pkrdm: "";
  bgcolor: "#009688";
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
