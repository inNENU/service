import { ActionFailType } from "@/config/index.js";
import type { LoginOptions } from "@/typings.js";
import { request } from "@/utils/index.js";

import { COURSE_TABLE_TEST_RESPONSE, getStudyCourseTable } from "../../study/course-table/index.js";
import type { CourseTableResponse } from "../../study/course-table/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export interface CourseTableOptions extends LoginOptions {
  /** 查询时间 */
  time: string;
}

export const underStudyCourseTableHandler = request<CourseTableResponse, CourseTableOptions>(
  async (req, res) => {
    const { time } = req.body;
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(COURSE_TABLE_TEST_RESPONSE);

    const year = Number(time.slice(0, 4));

    if (year < 2023) {
      return res.json({
        success: false,
        type: ActionFailType.Forbidden,
        msg: "该系统不支持查询 2023 年之前的课表",
      });
    }

    return res.json(await getStudyCourseTable(cookieHeader, time, UNDER_STUDY_SERVER));
  },
);
