import type { CommonSuccessResponse } from "../typings.js";
import { request } from "../utils/index.js";

export interface SuggestionOptions {
  appId: string;
}

export const mpSuggestionsHandler = request<
  CommonSuccessResponse<string[]>,
  SuggestionOptions
>((_req, res) => {
  return res.json({
    success: true,
    data: [
      "报到流程",
      "新生入学",
      "宿舍",
      "奖学金",
      "开学考试",
      "人才培养计划",
    ],
  });
});
