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

interface RawRecentMailSuccessResponse {
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

interface RawRecentMailFailedResponse {
  emailList: {
    suc: false;
    ver: 0;
    error_code: string;
  };
}

type RawRecentMailResponse =
  | RawRecentMailSuccessResponse
  | RawRecentMailFailedResponse;

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

export interface ActionRecentMailResponse {
  success: true;
  /** 未读数 */
  unread: number;
  /** 近期邮件 */
  recent: EmailItem[];
}

const EMAIL_INFO_URL = `${ACTION_SERVER}/extract/getEmailInfo`;

export const emailInfo = async (
  cookieHeader: string
): Promise<ActionRecentMailResponse | CommonFailedResponse> => {
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

    const checkResult = <RawRecentMailResponse>await checkResponse.json();

    if (
      "success" in checkResult &&
      checkResult.success &&
      checkResult.emailList.con
    )
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

export const actionRecentEmailHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Partial<LoginOptions>,
  Partial<LoginOptions> & { mid?: string }
> = async (req, res) => {
  try {
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
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
