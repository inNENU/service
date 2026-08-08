import type { LoginOptions } from "@/typings.js";
import { request } from "@/utils/index.js";

import { getGradeList } from "../study/grade-list.js";
import type { GradeListResponse } from "../study/grade-list.js";
import { GRADE_LIST_TEST_RESPONSE } from "../study/grade-parser.js";
import { UNDER_STUDY_SERVER } from "./utils.js";

export interface GradeListOptions extends LoginOptions {
  /** 查询时间 */
  time?: string;
}

export const underStudyGradeListHandler = request<GradeListResponse, GradeListOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(GRADE_LIST_TEST_RESPONSE);

    return res.json(await getGradeList(cookieHeader, req.body.time ?? "", UNDER_STUDY_SERVER));
  },
);
