import { request } from "@/utils/index.js";

import type { ActionFailType } from "../config/index.js";
import { expiredResponse, unknownResponse } from "../config/index.js";
import type { CommonFailedResponse, CommonListSuccessResponse, LoginOptions } from "../typings.js";
import type { ActionLoginResponse } from "./login.js";
import { ACTION_443_SERVER, ACTION_ENDPOINT, INFO_BASE_SERVER } from "./utils.js";

export interface NoticeListOptions extends LoginOptions {
  /**
   * 类型
   *
   * @default "notice"
   */
  type?: "notice" | "news";
  /**
   * 每页尺寸
   *
   * @default 20
   */
  size?: number;
  /**
   * 当前页面
   *
   * @default 1
   */
  current?: number;
}

interface RawNoticeItem {
  /** 通知 ID */
  id: string;
  /** 原始链接 */
  url: string;
  /** 发布时间 */
  fbsj: string;
  /** 短日期 */
  dateStr: string;
  /** 显示标题 */
  showTitle: string;
  /** 提示标题 */
  tipsTitle: string;
  /** 发布单位 */
  fbdw: string;
  /** 创建时间 */
  cjsj: string;
  /** 浏览次数 */
  llcs: string;
  sfdz: string;
  fbzt: string;
}

interface RawNoticeListSuccessResponse {
  ok: true;
  data: RawNoticeItem[];
  pageNumber: number;
  pageSize: number;
  allNum: number;
}

export interface NoticeInfo {
  title: string;
  from: string;
  time: string;
  id?: string;
  url?: string;
}

const getNoticeItem = ({
  id,
  fbdw: from,
  fbsj: time,
  showTitle: title,
  url,
}: RawNoticeItem): NoticeInfo => ({
  id,
  title,
  from,
  time,
  ...(url
    ? { url: url.slice(INFO_BASE_SERVER.length) } // Remove the base URL
    : {}),
});

export interface NoticeListSuccessResponse extends CommonListSuccessResponse<NoticeInfo[]> {
  size: number;
  count: number;
}

export type RawNoticeListResponse = RawNoticeListSuccessResponse | { ok: false; msg: string };

export type NoticeListResponse =
  | NoticeListSuccessResponse
  | ActionLoginResponse
  | CommonFailedResponse<ActionFailType.MissingCredential | ActionFailType.Unknown>;

const TEST_NOTICE_LIST: NoticeListSuccessResponse = {
  success: true,
  data: Array.from({ length: 10 }, (_, i) => ({
    title: `测试通知标题${i + 1}`,
    from: `来源${i + 1}`,
    time: `${new Date().getFullYear()}/${i + 1}/${i + 1}`,
    id: "test",
  })),
  count: 10,
  size: 20,
  current: 1,
  total: 1,
};

export const getNoticeList = async (
  cookieHeader: string,
  type: string,
  size: number,
  current: number,
): Promise<NoticeListResponse> => {
  const treeid = type === "news" ? "1041" : "1121";

  const response = await fetch(`${ACTION_ENDPOINT}?NOWPAGE=${current}`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/json; charset=UTF-8",
      Cookie: cookieHeader,
      // The system forces the referer
      Referer: `${ACTION_443_SERVER}/listrq.jsp?urltype=tree.TreeTempUrl&wbtreeid=${treeid}`,
    },
    body: JSON.stringify({
      owner: "",
      action: "notice-list",
      pageSize: size,
      pageNumber: current,
      treeid,
    }),
    redirect: "manual",
  });

  if (response.status === 302) return expiredResponse;

  const result = (await response.json()) as RawNoticeListResponse;

  if (result.ok) {
    const { data, pageNumber, pageSize, allNum } = result;

    if (!data.length) return unknownResponse(`获取公告列表失败: ${JSON.stringify(data, null, 2)}`);

    return {
      success: true,
      data: data.map((item) => getNoticeItem(item)),
      count: allNum,
      size: pageSize,
      current: pageNumber,
      total: Math.ceil(allNum / pageSize),
    };
  }

  return unknownResponse(result.msg);
};

export const noticeListHandler = request<NoticeListResponse, NoticeListOptions>(
  async (req, res) => {
    const { type = "notice", size = 14, current = 1 } = req.body;

    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(TEST_NOTICE_LIST);

    return res.json(await getNoticeList(cookieHeader, type, size, current));
  },
);
