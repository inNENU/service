import { request } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import { getGradeList } from "../study/grade-list.js";
import { GRADE_LIST_TEST_RESPONSE } from "../study/grade-parser.js";
import type { GradeListSuccessResponse } from "../study/grade-parser.js";
import type { LoginOptions } from "../typings.js";
import { GRAD_STUDY_SERVER } from "./utils.js";

export interface GradGradeListOptions extends LoginOptions {
  /** 查询时间 */
  time?: string;
}

export type GradGradeListResponse = GradeListSuccessResponse | AuthLoginFailedResponse;

export const gradGradeListHandler = request<GradGradeListResponse, GradGradeListOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(GRADE_LIST_TEST_RESPONSE);

    return res.json(await getGradeList(cookieHeader, req.body.time ?? "", GRAD_STUDY_SERVER));
  },
);
