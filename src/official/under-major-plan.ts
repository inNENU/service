import type { RequestHandler } from "express";

import { OFFICIAL_URL } from "./utils.js";
import { UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
} from "../typings.js";

const UNDER_MAJOR_PLAN_URL = `${OFFICIAL_URL}/jyjx/bksjy/rcpyfa.htm`;

const MAJOR_PLAN_LIST_REGEXP = /<ul class="table2[^>]*?>([^]*?)<\/ul>/;
const MAJOR_PLAN_ITEM_REGEXP = /<li><p><a href="(.*?)">(.*?)<\/a><\/p><\/li>/g;

export type UnderMajorPlanSuccessResponse = CommonSuccessResponse<
  { name: string; url: string }[]
>;

export type UnderMajorPlanResponse =
  | UnderMajorPlanSuccessResponse
  | CommonFailedResponse;

export const underMajorPlanHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EmptyObject
> = async (_, res) => {
  try {
    const response = await fetch(UNDER_MAJOR_PLAN_URL);

    if (response.status !== 200) throw new Error("请求失败");

    const html = await response.text();

    const listContent = html.match(MAJOR_PLAN_LIST_REGEXP)?.[1];

    if (!listContent) throw new Error("未找到列表");

    const list = Array.from(listContent.matchAll(MAJOR_PLAN_ITEM_REGEXP)).map(
      ([, url, name]) => ({
        name,
        url: `${OFFICIAL_URL}${url}`,
      }),
    );

    return res.json({
      success: true,
      data: list,
    } as UnderMajorPlanSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
