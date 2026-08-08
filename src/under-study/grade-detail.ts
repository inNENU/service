import type { LoginOptions } from "@/typings.js";
import { request } from "@/utils/index.js";

import { GRADE_DETAIL_TEST_RESPONSE, getGradeDetail } from "../study/grade-detail.js";
import type { GradeDetailResponse } from "../study/grade-detail.js";
import { UNDER_STUDY_SERVER } from "./utils.js";

export interface GradeDetailOptions extends LoginOptions {
  /** 成绩代码 */
  gradeCode: string;
}

export const underStudyGradeDetailHandler = request<GradeDetailResponse, GradeDetailOptions>(
  async (req, res) => {
    const { gradeCode } = req.body;
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(GRADE_DETAIL_TEST_RESPONSE);

    return res.json(await getGradeDetail(cookieHeader, gradeCode, UNDER_STUDY_SERVER));
  },
);
