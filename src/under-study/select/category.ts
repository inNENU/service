import type { RequestHandler } from "express";

import type { AuthLoginFailedResponse } from "../../auth/index.js";
import {
  ActionFailType,
  ExpiredResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../../utils/index.js";
import { underStudyLogin } from "../login.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export interface UnderSelectAllowedCategoryItem {
  /** 分类名称 */
  name: string;
  /** 分类链接 */
  link: string;
  /** 学期 */
  term: string;

  /** 选课阶段 */
  stage: string;
  /** 是否可退选 */
  canRemove: boolean;
  /** 分类开始时间 */
  startTime: string;
  /** 分类结束时间 */
  endTime: string;
}

export interface UnderSelectDisallowedCategoryItem {
  /** 分类名称 */
  name: string;
  /** 分类链接 */
  link: string;
  /** 学期 */
  term: string;

  /** 说明 */
  description: string;
}

export interface UnderSelectCategoryInfo {
  allowed: UnderSelectAllowedCategoryItem[];
  disallowed: UnderSelectDisallowedCategoryItem[];
}

export type UnderSelectCategorySuccessResponse =
  CommonSuccessResponse<UnderSelectCategoryInfo>;

export type UnderSelectCategoryResponse =
  | UnderSelectCategorySuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<
      | ActionFailType.NotInitialized
      | ActionFailType.MissingCredential
      | ActionFailType.Unknown
    >;

const CATEGORY_PAGE = `${UNDER_STUDY_SERVER}/new/student/xsxk/`;

const ALLOWED_CATEGORY_ITEM_REGEXP =
  /<div id="bb2"[^]+?lay-tips="选课学期:(.*?)\s*<br>现在是(.*?)阶段\s*<br>(.*?)\s*"\s+lay-iframe="(.*?)"\s+data-href="(.*?)">[^]+?<div class="description">([^]+?)<br>([^]+?)<br><\/div>/g;
const DISALLOWED_CATEGORY_ITEM_REGEXP =
  /<div id="bb1"[^]+?lay-tips="选课学期:(.*?)\s*<br>\s*([^"]+?)\s*"\s+lay-iframe="(.*?)"/g;

const getSelectCategories = (content: string): UnderSelectCategoryInfo => ({
  allowed: Array.from(content.matchAll(ALLOWED_CATEGORY_ITEM_REGEXP)).map(
    ([, term, stage, canRemoveText, name, link, startTime, endTime]) => ({
      term,
      stage,
      canRemove: canRemoveText === "可退选",
      name,
      link,
      startTime,
      endTime,
    }),
  ),
  disallowed: Array.from(content.matchAll(DISALLOWED_CATEGORY_ITEM_REGEXP)).map(
    ([, term, description, name, link]) => ({
      term,
      description: description
        .split("<hr>")
        .map((line) => line.trim())
        .filter((line) => line.length)
        .join("\n"),
      name,
      link,
    }),
  ),
});

export const underStudySelectCategoryHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password } = req.body;

    if (id && password) {
      const result = await underStudyLogin({ id, password });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(CATEGORY_PAGE);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const response = await fetch(CATEGORY_PAGE, {
      headers: {
        Cookie: req.headers.cookie,
        Referer: `${UNDER_STUDY_SERVER}/new/welcome.page?ui=new`,
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
    });

    if (response.status === 302) {
      console.log(response.headers, req.headers.cookie);

      return res.json(ExpiredResponse);
    }

    const content = await response.text();

    if (
      ["选课正在初始化", "选课未初始化"].some((item) => content.includes(item))
    ) {
      return res.json({
        success: false,
        type: ActionFailType.NotInitialized,
        msg: "选课未初始化完成，请稍后再试",
      });
    }

    console.log(content);

    return res.json({
      success: true,
      data: getSelectCategories(content),
    } as UnderSelectCategorySuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
