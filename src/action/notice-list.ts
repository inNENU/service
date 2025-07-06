import type { ActionLoginResponse } from "./login.js";
import { ACTION_SERVER, INFO_BASE_SERVER } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import { ExpiredResponse, UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonListSuccessResponse,
  LoginOptions,
} from "../typings.js";
import { request } from "../utils/index.js";

const NOTICE_LIST_QUERY_URL = `${ACTION_SERVER}/page/queryList`;

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
  LLCS: number;
  /** time */
  FBSJ: string;
  /** title */
  KEYWORDS_: string;
  /** id */
  ID__: string;
  SFZD: string;
  FLAG: string;
  /** index */
  RN: number;
  /** from */
  CJBM: string;
  TYPE: "notice" | "news";
  /** url */
  URL: string | null;
}

interface RawNoticeListData {
  data: RawNoticeItem[];
  pageIndex: number;
  totalPage: number;
  pageSize: number;
  totalCount: number;
}

export interface NoticeInfo {
  title: string;
  from: string;
  time: string;
  id?: string;
  url?: string;
}

const getNoticeItem = ({
  ID__: id,
  CJBM: from,
  KEYWORDS_: title,
  FBSJ: time,
  URL: url,
}: RawNoticeItem): NoticeInfo => ({
  id,
  title,
  from,
  time,
  ...(url
    ? { url: url.slice(INFO_BASE_SERVER.length) } // Remove the base URL
    : {}),
});

export interface NoticeListSuccessResponse
  extends CommonListSuccessResponse<NoticeInfo[]> {
  size: number;
  count: number;
}

export type NoticeListResponse =
  | NoticeListSuccessResponse
  | ActionLoginResponse
  | CommonFailedResponse<
      ActionFailType.MissingCredential | ActionFailType.Unknown
    >;

const TEST_NOTICE_LIST: NoticeListSuccessResponse = {
  success: true,
  data: Array(10)
    .fill(null)
    .map((_, i) => ({
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
  const response = await fetch(NOTICE_LIST_QUERY_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: `${ACTION_SERVER}/basicInfo/studentPageTurn?type=lifeschool`,
    },
    body: new URLSearchParams({
      type,
      _search: "false",
      nd: Date.now().toString(),
      limit: size.toString(),
      page: current.toString(),
    }),
    redirect: "manual",
  });

  if (response.status === 302) return ExpiredResponse;

  const { data, pageIndex, pageSize, totalCount, totalPage } =
    (await response.json()) as RawNoticeListData;

  if (!data.length)
    return UnknownResponse(
      `获取公告列表失败: ${JSON.stringify(data, null, 2)}`,
    );

  return {
    success: true,
    data: data.map(getNoticeItem),
    count: totalCount,
    size: pageSize,
    current: pageIndex,
    total: totalPage,
  };
};

export const noticeListHandler = request<NoticeListResponse, NoticeListOptions>(
  async (req, res) => {
    const { type = "notice", size = 20, current = 1 } = req.body;

    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(TEST_NOTICE_LIST);

    return res.json(await getNoticeList(cookieHeader, type, size, current));
  },
);
