import { request } from "@/utils/index.js";

import {
  STUDY_PLAN_DETAIL_TEST_RESPONSE,
  STUDY_PLAN_TEST_RESPONSE,
  getStudyPlan,
} from "../study/study-plan.js";
import type { StudyPlanOptions, StudyPlanResponse } from "../study/study-plan.js";
import { UNDER_STUDY_SERVER } from "./utils.js";

export type * from "../study/study-plan.js";

export const underStudyStudyPlanHandler = request<StudyPlanResponse, StudyPlanOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) {
      return res.json(
        req.body.type === "detail" ? STUDY_PLAN_DETAIL_TEST_RESPONSE : STUDY_PLAN_TEST_RESPONSE,
      );
    }

    return res.json(await getStudyPlan(cookieHeader, UNDER_STUDY_SERVER, req.body));
  },
);
