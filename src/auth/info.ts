import type { RequestHandler } from "express";

import type { LoginOptions } from "./login.js";
import { login } from "./login.js";
import type { EmptyObject } from "../typings.js";

export interface InfoSuccessResponse {
  status: "success";

  /** 用户姓名 */
  name: string;

  /** 用户邮箱 */
  email: string;
}

export interface InfoFailedResponse {
  status: "failed";
  msg: string;
}

export type InfoResponse = InfoSuccessResponse | InfoFailedResponse;

const userNameRegexp =
  /class="auth_username">\s+<span>\s+<span>\s+(.*?)\s+<\/span>/;

const inputRegExp = /id="alias".*?value="(.*?)"/;

export const infoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password } = req.body;

    const result = await login({ id, password });

    if (result.status === "success") {
      const userNameResponse = await fetch(
        "https://authserver.nenu.edu.cn/authserver/index.do",
        {
          method: "GET",
          headers: {
            Cookie: result.cookies.join("; "),
          },
        }
      );

      const userNameResponseText = await userNameResponse.text();

      const userName = userNameRegexp.exec(userNameResponseText)?.[1];

      if (!userName)
        return res.json(<InfoFailedResponse>{
          status: "failed",
          msg: "获取姓名失败",
        });

      const emailResponse = await fetch(
        "https://authserver.nenu.edu.cn/authserver/userAttributesEdit.do",
        {
          method: "GET",
          headers: {
            Cookie: result.cookies.join("; "),
          },
        }
      );

      const emailResponseText = await emailResponse.text();

      const emailName = inputRegExp.exec(emailResponseText)?.[1];

      if (typeof emailName !== "string")
        return res.json(<InfoFailedResponse>{
          status: "failed",
          msg: "获取邮箱失败",
        });

      return res.json(<InfoSuccessResponse>{
        status: "success",
        name: userName,
        email: emailName ? `${emailName}@nenu.edu.cn` : "未设置邮箱",
      });
    }

    return res.json(<InfoResponse>{
      status: "failed",
      msg: "登录失败",
    });
  } catch (err) {
    return res.json(<InfoFailedResponse>{ status: "failed", msg: "参数错误" });
  }
};
