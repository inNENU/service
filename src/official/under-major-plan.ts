import { request } from "@/utils/index.js";

import { OFFICIAL_URL } from "./utils.js";
import { UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";

const UNDER_MAJOR_PLAN_URL = `${OFFICIAL_URL}/jyjx/bksjy/rcpyfa.htm`;

const MAJOR_PLAN_LIST_REGEXP = /<ul class="table2[^>]*?>([^]*?)<\/ul>/;
const MAJOR_PLAN_ITEM_REGEXP =
  /<li><p><a href="\.\.\/\.\.([^"]*?)"[^>]*>(.*?)<\/a><\/p><\/li>/g;

export type UnderMajorPlanSuccessResponse = CommonSuccessResponse<
  { name: string; url: string }[]
>;

export type UnderMajorPlanResponse =
  | UnderMajorPlanSuccessResponse
  | CommonFailedResponse;

export const getUnderMajorPlan = async (): Promise<UnderMajorPlanResponse> => {
  const response = await fetch(UNDER_MAJOR_PLAN_URL);

  if (response.status !== 200) return UnknownResponse("请求失败");

  const html = await response.text();

  const listContent = MAJOR_PLAN_LIST_REGEXP.exec(html)?.[1];

  if (!listContent) return UnknownResponse("未找到列表");

  const list = Array.from(listContent.matchAll(MAJOR_PLAN_ITEM_REGEXP)).map(
    ([, url, name]) => ({
      name,
      url: `${OFFICIAL_URL}${url}`,
    }),
  );

  return {
    success: true,
    data: list,
  };
};

export const underMajorPlanHandler = request<UnderMajorPlanResponse>(
  async (_, res) => {
    return res.json(await getUnderMajorPlan());
  },
);
