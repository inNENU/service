import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_MAIN_PAGE, ACTION_SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

interface RawEmailItem {
  /** 发件人 */
  from: string;
  /** 邮件ID */
  id: string;
  /** 接收日期 */
  receivedDate: number;
  /** 发送日期 */
  sentDate: number;
  /** 偶见大小 */
  size: number;

  /** 邮件主题 */
  subject: string;
  to: string;

  fid: 1;
  flags: {
    read: boolean;
    popRead: boolean;
    attached: boolean;
  };
}

interface RawEmailInfoSuccessResponse {
  success: true;
  count: string;
  emailList: {
    suc: true;
    ver: 0;
    /** 账户名称 */
    account_name: string;
    con: {
      /** 总数 */
      total: number;
      var: RawEmailItem[];
    };
  };
}

interface RawEmailInfoFailedResponse {
  emailList: {
    suc: false;
    ver: 0;
    error_code: string;
  };
}

type RawEmailInfoResponse =
  | RawEmailInfoSuccessResponse
  | RawEmailInfoFailedResponse;

export interface EmailItem {
  /** 邮件主题 */
  subject: string;
  /** 接收日期 */
  receivedDate: number;
  /** 发件人 */
  from: string;
  /** 邮件 ID */
  mid: string;
}

export interface ActionEmailInfoResponse {
  success: true;
  /** 未读数 */
  unread: number;
  /** 近期邮件 */
  recent: EmailItem[];
}

const EMAIL_INFO_URL = `${ACTION_SERVER}/extract/getEmailInfo`;

export const emailInfo = async (
  cookieHeader: string
): Promise<ActionEmailInfoResponse | CommonFailedResponse> => {
  try {
    const checkResponse = await fetch(EMAIL_INFO_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
        Referer: ACTION_MAIN_PAGE,
      },
      body: `domain=nenu.edu.cn&type=1&format=json`,
    });

    const checkResult = <RawEmailInfoResponse>await checkResponse.json();

    if ("success" in checkResult && checkResult.success)
      return {
        success: true,
        unread: Number(checkResult.count),
        recent: checkResult.emailList.con.var.map(
          ({ subject, receivedDate, from, id }) => ({
            subject,
            receivedDate,
            from,
            mid: id,
          })
        ),
      };

    return {
      success: false,
      msg: "用户无邮箱",
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

interface RawEmailPageResponse {
  success: boolean;
  url: string;
}

export interface ActionEmailPageSuccessResult {
  success: true;
  url: string;
}

type ActionEmailPageResult =
  | ActionEmailPageSuccessResult
  | CommonFailedResponse;

const EMAIL_PAGE_URL = `${ACTION_SERVER}/extract/sendRedirect2Email`;
const EMAIL_URL = `${ACTION_SERVER}/extract/sendRedirect2EmailPage`;

export const emailPage = async (
  cookieHeader: string,
  mid = ""
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

export const actionEmailHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Partial<LoginOptions>,
  Partial<LoginOptions> & { mid?: string }
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

      return res.json(await emailInfo(req.headers.cookie));
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
