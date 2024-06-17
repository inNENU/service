import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_MAIN_PAGE, ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import { ActionFailType, ExpiredResponse } from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/login.js";

const EMAIL_PAGE_URL = `${ACTION_SERVER}/extract/sendRedirect2Email`;
const EMAIL_URL = `${ACTION_SERVER}/extract/sendRedirect2EmailPage`;

export interface ActionEmailPageOptions extends LoginOptions {
  /** 邮件 ID */
  mid?: string;
}

interface RawEmailPageResponse {
  success: boolean;
  url: string;
}

export type ActionEmailPageSuccessResponse = CommonSuccessResponse<string>;

export type ActionEmailPageResponse =
  | ActionEmailPageSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Expired | ActionFailType.Unknown>;

export const actionEmailPageHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ActionEmailPageOptions,
  ActionEmailPageOptions
> = async (req, res) => {
  try {
    if (!req.headers.cookie) {
      if (!req.body.id || !req.body.password)
        throw new Error(`"id" and password" field is required!`);

      const result = await actionLogin(req.body as AccountInfo);

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(ACTION_SERVER);
    }

    const { mid } = req.body;

    const response = await fetch(mid ? EMAIL_PAGE_URL : EMAIL_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: req.headers.cookie,
        Referer: ACTION_MAIN_PAGE,
      },
      body: new URLSearchParams({
        ...(mid ? { domain: "nenu.edu.cn", mid } : {}),
        account_name: "",
      }),
      redirect: "manual",
    });

    if (response.status === 302) {
      return res.json(ExpiredResponse);
    }

    const result = (await response.json()) as RawEmailPageResponse;

    if (result.success)
      return res.json({
        success: true,
        data: result.url,
      } as ActionEmailPageSuccessResponse);

    throw new Error("获取邮件页面失败");
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      type: ActionFailType.Unknown,
      msg: message,
    } as CommonFailedResponse);
  }
};
