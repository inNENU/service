import { expiredResponse, unknownResponse, semesterStartTime } from "@/config/index.js";
import type { CommonSuccessResponse } from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../../auth/index.js";
import { isOnlineClass } from "./is-online.js";
import type { RawCourseTableItem, TableClassData, TableData } from "./typings.js";

interface RawCourseTableSuccessResult {
  code: 0;
  data: RawCourseTableItem[];
  message: string;
}

interface RawCourseTableFailResult {
  code: number;
  data: unknown;
  message: string;
}

type RawCourseTableResult = RawCourseTableSuccessResult | RawCourseTableFailResult;

export type CourseTableSuccessResponse = CommonSuccessResponse<{
  table: TableData;
  startTime: string;
}>;

export type CourseTableResponse = CourseTableSuccessResponse | AuthLoginFailedResponse;

export const getCourseTable = (classes: RawCourseTableItem[]): TableData => {
  // 行数按最大节次动态计算（每行两节），避免晚课（如第 13-14 节）越界
  const maxClassIndex = Math.max(...classes.map(({ ps }) => Number(ps)), 1);
  const tableData = Array.from({ length: Math.ceil(maxClassIndex / 2) }, () =>
    Array.from(
      { length: 7 },
      (): (Omit<TableClassData, "locations"> & {
        locations: Record<string, string>;
      })[] => [],
    ),
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
      xq: dayOfWeek,
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
          const weekNumber = temp.pop()!;

          return [weekNumber, temp.join("-")];
        }),
      );

      const key = JSON.stringify({
        name,
        teachersName,
        week: dayOfWeek,
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
        weeks,
        locations: location,
        classIndex: [Number(startClassIndex), Number(endClassIndex)],
        // 网课：整个时间段不与任何标准教学大节重叠
        isOnline: isOnlineClass(startTime, endTime),
      };

      tableData[Math.floor(Number(startClassIndex) / 2)][Number(dayOfWeek) - 1].push(classData);
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

export const COURSE_TABLE_TEST_RESPONSE: CourseTableSuccessResponse = {
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
                isOnline: false,
              },
            ]
          : [],
      ),
    ),
    startTime: "2020-09-01",
  },
};

export const getStudyCourseTable = async (
  cookieHeader: string,
  time: string,
  server: string,
): Promise<CourseTableResponse> => {
  const queryUrl = `${server}/new/student/xsgrkb/getCalendarWeekDatas`;

  const response = await fetch(queryUrl, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${server}/new/student/xsgrkb/week.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      xnxqdm: time,
    }),
  });

  if (response.headers.get("Content-Type")?.includes("text/html")) return expiredResponse;

  const data = (await response.json()) as RawCourseTableResult;

  if (data.code !== 0) {
    if (data.message === "尚未登录，请先登录") return expiredResponse;
    if (data.message === "本学期课表未开放!") return unknownResponse(data.message);

    throw new Error(data.message);
  }

  const courseTable = getCourseTable(data.data as RawCourseTableItem[]);

  return {
    success: true,
    data: {
      table: courseTable,
      startTime: semesterStartTime[time],
    },
  };
};
