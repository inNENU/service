import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_SERVER } from "./utils.js";
import type {
  AuthLoginFailedResponse,
  AuthLoginFailedResult,
} from "../auth/index.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

export interface NoticeAttachmentOptions extends Partial<LoginOptions> {
  noticeID: string;
  url: string;
}

export const noticeAttachmentHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  NoticeAttachmentOptions
> = async (req, res) => {
  try {
    const { noticeID, url } = req.body;

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
    // const noticeUrl = `${ACTION_SERVER}/page/viewNews?ID=${noticeID}`;

    // await fetch(noticeUrl, {
    //   headers: {
    //     Cookie: req.headers.cookie,
    //   },
    //   redirect: "manual",
    // });

    const response = await fetch(url, {
      headers: {
        Cookie: req.headers.cookie,
        // DNT: "1",
        // "Upgrade-Insecure-Requests": "1",
        // "User-Agent":
        //   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 Edg/116.0.1938.62",
        // "sec-ch-ua": `"Chromium";v="116", "Not)A;Brand";v="24", "Microsoft Edge";v="116"`,
        // "sec-ch-ua-mobile": "?0",
        // "sec-ch-ua-platform": `"Windows"`,
        // Accept:
        //   "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        // "Accept-Encoding": "gzip, deflate, br",
        // "Sec-Fetch-Site": "none",
        // "Sec-Fetch-Mode": "navigate",
        // "Sec-Fetch-User": "?1",
        // "Sec-Fetch-Dest": "document",
        // "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,en-GB;q=0.6",
      },
      // credentials: "same-origin",
      // mode: "navigate",
    });

    if (response.status === 302)
      return res.json(<AuthLoginFailedResponse>{
        success: false,
        type: LoginFailType.Expired,
        msg: "登录信息已过期，请重新登录",
      });

    console.log(response.status);

    return res.send(await response.arrayBuffer());
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
