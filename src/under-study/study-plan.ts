import { unknownResponse } from "@/config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse } from "@/typings.js";
import { request } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import {
  STUDY_PLAN_DETAIL_TEST_RESPONSE,
  STUDY_PLAN_TEST_RESPONSE,
  getStudyPlan,
} from "../study/study-plan.js";
import type {
  StudyPlanDetailResponse,
  StudyPlanItem,
  StudyPlanOptions,
} from "../study/study-plan.js";
import { UNDER_STUDY_SERVER } from "./utils.js";

export type * from "../study/study-plan.js";

export type UnderStudyPlanListSuccessResponse = CommonSuccessResponse<StudyPlanItem>;

export type UnderStudyPlanListResponse =
  | UnderStudyPlanListSuccessResponse
  | AuthLoginFailedResponse;

export type UnderStudyPlanResponse =
  | UnderStudyPlanListResponse
  | StudyPlanDetailResponse
  | CommonFailedResponse;

export const underStudyStudyPlanHandler = request<UnderStudyPlanResponse, StudyPlanOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) {
      if (req.body.type === "detail") return res.json(STUDY_PLAN_DETAIL_TEST_RESPONSE);

      const [plan] = STUDY_PLAN_TEST_RESPONSE.data;

      return res.json({ success: true, data: plan });
    }

    const result = await getStudyPlan(cookieHeader, UNDER_STUDY_SERVER, req.body);

    if (req.body.type === "detail")
      return res.json(result as StudyPlanDetailResponse | CommonFailedResponse);

    if (!result.success) return res.json(result);

    // 列表只保留"教学计划"入口（假定只有一个），避免返回通识选修课等无关计划
    const plans = (result.data as StudyPlanItem[]).filter(({ planType }) =>
      planType.includes("教学计划"),
    );

    if (plans.length > 1)
      console.warn(`学习计划列表匹配到 ${plans.length} 个教学计划入口，仅保留第一个`);

    const [plan] = plans;

    if (!plan) return res.json(unknownResponse("未找到当前专业的教学计划"));

    return res.json({ success: true, data: plan });
  },
);
