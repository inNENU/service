import { semesterStartTime, expiredResponse, unknownResponse } from "@/config/index.js";
import type { LoginOptions } from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS, request } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../../auth/index.js";
import {
  UNDER_COURSE_TABLE_TEST_RESPONSE,
  getCourseTable,
} from "../../under-study/course-table/index.js";
import type {
  RawUnderCourseTableItem,
  UnderCourseTableSuccessResponse,
} from "../../under-study/course-table/index.js";
import { GRAD_STUDY_SERVER } from "../utils.js";

export interface GradCourseTableOptions extends LoginOptions {
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

type RawUnderCourseTableResult = RawUnderCourseTableSuccessResult | RawUnderCourseTableFailResult;

export type GradCourseTableResponse = UnderCourseTableSuccessResponse | AuthLoginFailedResponse;

export const getGradCourseTable = async (
  cookieHeader: string,
  time: string,
): Promise<GradCourseTableResponse> => {
  const queryUrl = `${GRAD_STUDY_SERVER}/new/student/xsgrkb/getCalendarWeekDatas`;

  const response = await fetch(queryUrl, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${GRAD_STUDY_SERVER}/new/student/xsgrkb/week.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      xnxqdm: time,
    }),
  });

  if (response.headers.get("Content-Type")?.includes("text/html")) return expiredResponse;

  const data = (await response.json()) as RawUnderCourseTableResult;

  if (data.code !== 0) {
    if (data.message === "尚未登录，请先登录") return expiredResponse;
    if (data.message === "本学期课表未开放!") return unknownResponse(data.message);

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

export const gradStudyCourseTableHandler = request<GradCourseTableResponse, GradCourseTableOptions>(
  async (req, res) => {
    const { time } = req.body;
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(UNDER_COURSE_TABLE_TEST_RESPONSE);

    return res.json(await getGradCourseTable(cookieHeader, time));
  },
);
