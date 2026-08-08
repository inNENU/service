import type { LoginOptions } from "@/typings.js";
import { request } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../../auth/index.js";
import { COURSE_TABLE_TEST_RESPONSE, getStudyCourseTable } from "../../study/course-table/index.js";
import type { CourseTableSuccessResponse } from "../../study/course-table/index.js";
import { GRAD_STUDY_SERVER } from "../utils.js";

export interface GradCourseTableOptions extends LoginOptions {
  /** 查询时间 */
  time: string;
}

export type GradCourseTableResponse = CourseTableSuccessResponse | AuthLoginFailedResponse;

export const gradStudyCourseTableHandler = request<GradCourseTableResponse, GradCourseTableOptions>(
  async (req, res) => {
    const { time } = req.body;
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(COURSE_TABLE_TEST_RESPONSE);

    return res.json(await getStudyCourseTable(cookieHeader, time, GRAD_STUDY_SERVER));
  },
);
