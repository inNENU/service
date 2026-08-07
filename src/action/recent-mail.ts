import { request } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import { unknownResponse } from "../config/index.js";
import type { ActionFailType } from "../config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse } from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { ACTION_443_SERVER, ACTION_ENDPOINT } from "./utils.js";

interface RawEmailData {
  /** 主题 */
  subject: string;
  /** 日期 */
  sqsj: string;
  /** 邮件 id */
  id: string;
}

interface RawRecentMailSuccessResponse {
  ok: true;
  data: RawEmailData[];
}

interface RawRecentMailFailedResponse {
  ok: false;
  msg: string;
}

type RawRecentMailResponse = RawRecentMailSuccessResponse | RawRecentMailFailedResponse;

export interface EmailData {
  /** 邮件主题 */
  subject: string;
  /** 接收日期 */
  date: string;
  /** 邮件 ID */
  id: string;
}

export type RecentMailSuccessResponse = CommonSuccessResponse<EmailData[]>;

export type RecentMailFailedResponse = CommonFailedResponse<
  ActionFailType.MissingCredential | ActionFailType.NotInitialized | ActionFailType.Unknown
>;

export type ActionRecentMailResponse =
  | RecentMailSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | RecentMailFailedResponse;

const TEST_RECENT_EMAIL_RESPONSE: RecentMailSuccessResponse = {
  success: true,
  data: Array.from({ length: 10 }, (): EmailData => ({
    subject: "测试邮件",
    date: "01-01",
    id: "1",
  })),
};

export const getRecentEmails = async (cookieHeader: string): Promise<ActionRecentMailResponse> => {
  const emailReponse = await fetch(ACTION_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/json; charset=UTF-8",
      Cookie: cookieHeader,
      // The system forces referer
      Referer: ACTION_443_SERVER,
    },
    body: JSON.stringify({ action: "index-wdyj", owner: "" }),
  });

  const result = (await emailReponse.json()) as RawRecentMailResponse;

  if (result.ok) {
    return {
      success: true,
      data: result.data.map(({ subject, sqsj, id }: RawEmailData): EmailData => ({
        subject,
        date: sqsj,
        id,
      })),
    };
  }

  return unknownResponse(result.msg);
};

export const actionRecentEmailHandler = request<ActionRecentMailResponse>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST")) return res.json(TEST_RECENT_EMAIL_RESPONSE);

  return res.json(await getRecentEmails(cookieHeader));
});
