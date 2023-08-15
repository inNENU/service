import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_MAIN_PAGE, ACTION_SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

interface RawEmailPageResponse {
  success: boolean;
  url: string;
}

export interface ActionEmailPageSuccessResult {
  success: true;
  url: string;
}

export type ActionEmailPageResult =
  | ActionEmailPageSuccessResult
  | CommonFailedResponse;

const EMAIL_PAGE_URL = `${ACTION_SERVER}/extract/sendRedirect2Email`;
const EMAIL_URL = `${ACTION_SERVER}/extract/sendRedirect2EmailPage`;

export const emailPage = async (
  cookieHeader: string,
  mid = "",
): Promise<ActionEmailPageResult> => {
  try {
    const emailPageResponse = await fetch(mid ? EMAIL_PAGE_URL : EMAIL_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
        Referer: ACTION_MAIN_PAGE,
      },
      body: new URLSearchParams({
        ...(mid ? { domain: "nenu.edu.cn", mid } : {}),
        account_name: "",
      }),
    });

    const emailPageResult = <RawEmailPageResponse>(
      await emailPageResponse.json()
    );

    if (emailPageResult.success)
      return {
        success: true,
        url: emailPageResult.url,
      };

    return {
      success: false,
      msg: "获取邮件页面失败",
    };
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);

    return {
      success: false,
      msg: message,
    };
  }
};

export interface ActionEmailPageOptions extends Partial<LoginOptions> {
  /** 邮件 ID */
  mid?: string;
}

export const actionEmailPageHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ActionEmailPageOptions,
  ActionEmailPageOptions
> = async (req, res) => {
  try {
    if (req.method === "GET") {
      if (!req.headers.cookie) {
        if (!req.query.id || !req.query.password) {
          res.setHeader("Content-Type", "text/html");

          return res.status(400).send("请提供账号密码");
        }

        const result = await actionLogin(<LoginOptions>req.query);

        if (!result.success) {
          res.setHeader("Content-Type", "text/html");

          return res.status(500).send(result.msg);
        }

        req.headers.cookie = result.cookieStore.getHeader(ACTION_SERVER);
      }

      const result = await emailPage(req.headers.cookie, req.query.mid || "");

      if (result.success) {
        res.setHeader("Location", result.url);

        return res.status(302).end();
      }

      res.setHeader("Content-Type", "text/html");

      return res.send(result.msg);
    } else {
      if (!req.headers.cookie) {
        if (!req.body.id || !req.body.password)
          return res.json(<CommonFailedResponse>{
            success: false,
            msg: "请提供账号密码",
          });

        const result = await actionLogin(<LoginOptions>req.body);

        if (!result.success) return res.json(result);

        req.headers.cookie = result.cookieStore.getHeader(ACTION_SERVER);
      }

      return res.json(await emailPage(req.headers.cookie, req.body.mid || ""));
    }
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
