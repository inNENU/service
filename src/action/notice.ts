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
import type { RichTextNode } from "../utils/getRichText.js";
import { getRichTextNodes } from "../utils/index.js";

const titleRegExp = /var title = '(.*?)';/;
const fromRegExp = /var ly = '(.*?)'/;
const authorRegExp = /var wz = '(.*?)'/;
const timeRegExp =
  /<span style="margin: 0 10px;font-size: 13px;color: #787878;font-family: 'Microsoft YaHei';">\s+时间：(.*?)(?:&nbsp;)*?\s+<\/span>/;
const pageViewRegExp =
  /<span style="margin: 0 10px;font-size: 13px;color: #787878;font-family: 'Microsoft YaHei';">\s+阅览：(\d+)\s+<\/span>/;
const contentRegExp =
  /<div class="read" id="WBNR">\s+([\s\S]*?)\s+<\/div>\s+<p id="zrbj"/;
const attachmentsRegExp =
  /<a\s+href="(https:\/\/my\.webvpn\.nenu\.edu\.cn:443\/download\.action.*?)"\s+title="(.*?)">([\s\S]+?)<\/a>/g;

export interface NoticeOptions extends Partial<LoginOptions> {
  noticeID: string;
}

export interface NoticeAttachment {
  /** 附件类型 */
  type: string;
  /** 附件名称 */
  name: string;
  /** 附件地址 */
  url: string;
}

export interface NoticeSuccessResponse {
  success: true;
  title: string;
  author: string;
  time: string;
  from: string;
  pageView: number;
  content: RichTextNode[];
  attachments: NoticeAttachment[];
}

export type NoticeResponse = NoticeSuccessResponse | CommonFailedResponse;

export const noticeHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  NoticeOptions
> = async (req, res) => {
  try {
    const { noticeID } = req.body;

    if (!noticeID)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "ID is required",
      });

    const noticeUrl = `${ACTION_SERVER}/page/viewNews?ID=${noticeID}`;

    if (!req.headers.cookie) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await actionLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(noticeUrl);
    }

    const response = await fetch(noticeUrl, {
      headers: {
        Cookie: req.headers.cookie,
      },
      redirect: "manual",
    });

    if (response.status === 302)
      return res.json(<AuthLoginFailedResponse>{
        success: false,
        type: LoginFailType.Expired,
        msg: "登录信息已过期，请重新登录",
      });

    const responseText = await response.text();

    const title = titleRegExp.exec(responseText)![1];
    const author = authorRegExp.exec(responseText)![1];
    const time = timeRegExp.exec(responseText)![1];
    const from = fromRegExp.exec(responseText)![1];
    const pageView = pageViewRegExp.exec(responseText)![1];
    const content = contentRegExp.exec(responseText)![1];

    const attachments = Array.from(content.matchAll(attachmentsRegExp)).map(
      ([, url, , text]) => {
        const nameParts = text
          .replace(/<br>/g, "")
          .replace(/\s+/, " ")
          .trim()
          .split(".");

        if (nameParts.length > 1) nameParts.pop();

        return {
          type: title.split(".").pop()!,
          name: nameParts.join("."),
          url: url
            .replace(
              "https://my.webvpn.nenu.edu.cn:443",
              "https://m-443.webvpn.nenu.edu.cn"
            )
            .replace(
              "https://m-443.webvpn.nenu.edu.cn:443",
              "https://m-443.webvpn.nenu.edu.cn"
            ),
        };
      }
    );

    console.log(attachments);

    return res.json(<NoticeSuccessResponse>{
      success: true,
      title,
      author,
      from,
      time,
      pageView: Number(pageView),
      content: await getRichTextNodes(content, {
        getLinkText: (link) =>
          link.startsWith(ACTION_SERVER) ||
          link.startsWith("https://my.webvpn.nenu.edu.cn")
            ? null
            : link,
        // TODO: Support image
        getImageSrc: () => null,
      }),
      attachments,
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
