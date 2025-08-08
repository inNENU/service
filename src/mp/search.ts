import { UnknownResponse } from "@/config/index.js";

import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import { request } from "../utils/index.js";

export type SearchType = "all" | "guide" | "intro" | "function";

export interface SearchOptions {
  word: string;
  scope?: SearchType;
  type?: "word" | "result";
}

export type SearchResponse =
  | CommonSuccessResponse<unknown[]>
  | CommonFailedResponse;

export const mpSearchHandler = request<SearchResponse, SearchOptions>(
  (req, res) => {
    const { type = "result", word } = req.body;

    if (!word || type === "word") return res.json({ success: true, data: [] });

    return res.json(UnknownResponse("旧版搜索已下线，请等待小程序新版本"));
  },
);

export const mpSuggestionsHandler = request<
  CommonSuccessResponse<string[]>,
  SearchOptions
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
