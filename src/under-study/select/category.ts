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
  /** 是否可选课 */
  canSelect: true;
  /** 是否是公共课程 */
  isPublic: boolean;
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
  /** 是否可选课 */
  canSelect: false;
  /** 说明 */
  description: string;
}

export interface UnderSelectCategoryInfo {
  allowed: UnderSelectAllowedCategoryItem[];
  disallowed: UnderSelectDisallowedCategoryItem[];
}

const CATEGORY_PAGE = `${UNDER_STUDY_SERVER}/new/student/xsxk/`;

const ALLOWED_CATEGORY_ITEM_REGEXP =
  /<div id="bb2"[^]+?lay-tips="选课学期:(.*?)\s*<br>现在是(.*?)阶段\s*<br>(.*?)\s*"\s+lay-iframe="(.*?)"\s+data-href="(.*?)">[^]+?<div class="description">([^]+?)<br>([^]+?)<br><\/div>/g;
const DISALLOWED_CATEGORY_ITEM_REGEXP =
  /<div id="bb1"[^]+?lay-tips="选课学期:(.*?)\s*<br>\s*([^"]+?)\s*"\s+lay-iframe="(.*?)"\s+data-href="(.*?)"/g;

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
      canSelect: true,
      isPublic: name.includes("公共课程"),
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
      canSelect: false,
    }),
  ),
});

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

const TEST_UNDER_SELECT_CATEGORY_RESPONSE: UnderSelectCategorySuccessResponse =
  {
    success: true,
    data: {
      allowed: [],
      disallowed: [
        {
          term: "2021-2022-1",
          name: "公共课程",
          link: "/test",
          canSelect: false,
          description: "测试分类",
        },
      ],
    },
  };

export const getUnderSelectCategories = async (
  cookieHeader: string,
): Promise<UnderSelectCategoryResponse> => {
  const response = await fetch(CATEGORY_PAGE, {
    headers: {
      Cookie: cookieHeader,
      Referer: `${UNDER_STUDY_SERVER}/new/welcome.page?ui=new`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    redirect: "manual",
  });

  if (response.status === 302) return ExpiredResponse;

  const content = await response.text();

  if (
    ["选课正在初始化", "选课未初始化"].some((item) => content.includes(item))
  ) {
    return {
      success: false,
      type: ActionFailType.NotInitialized,
      msg: "选课未初始化完成，请稍后再试",
    };
  }

  return {
    success: true,
    data: getSelectCategories(content),
  } as UnderSelectCategorySuccessResponse;
};

export const underStudySelectCategoryHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await underStudyLogin({ id, password, authToken });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(CATEGORY_PAGE);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const cookieHeader = req.headers.cookie;

    if (cookieHeader.includes("TEST"))
      return res.json(TEST_UNDER_SELECT_CATEGORY_RESPONSE);

    return res.json(await getUnderSelectCategories(cookieHeader));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
