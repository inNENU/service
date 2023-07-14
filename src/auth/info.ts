import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import { authLogin } from "./login.js";
import { AUTH_SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { getCookieHeader } from "../utils/cookie.js";

export interface InfoSuccessResponse {
  success: true;
  /** @deprecated */
  status: "success";

  /** 用户姓名 */
  name: string;

  /** 用户邮箱 */
  email: string;
}

export type InfoResponse = InfoSuccessResponse | CommonFailedResponse;

const userNameRegexp =
  /class="auth_username">\s+<span>\s+<span>\s+(.*?)\s+<\/span>/;

const inputRegExp = /id="alias".*?value="(.*?)"/;

export const getInfo = async (cookies: Cookie[]): Promise<InfoResponse> => {
  const userNameResponse = await fetch(`${AUTH_SERVER}/authserver/index.do`, {
    method: "GET",
    headers: {
      Cookie: getCookieHeader(cookies),
    },
  });

  const userNameResponseText = await userNameResponse.text();

  const userName = userNameRegexp.exec(userNameResponseText)?.[1];

  console.log("Getting username", userName);

  if (!userName)
    return <CommonFailedResponse>{
      success: false,
      status: "failed",
      msg: "获取姓名失败",
    };

  const emailResponse = await fetch(
    `${AUTH_SERVER}/authserver/userAttributesEdit.do`,
    {
      method: "GET",
      headers: {
        Cookie: getCookieHeader(cookies),
      },
    },
  );

  const emailResponseText = await emailResponse.text();

  const emailName = inputRegExp.exec(emailResponseText)?.[1];

  console.log("Getting email name", emailName);

  if (typeof emailName !== "string")
    return <CommonFailedResponse>{
      success: false,
      status: "failed",
      msg: "获取邮箱失败",
    };

  return <InfoSuccessResponse>{
    success: true,
    status: "success",
    name: userName,
    email: emailName ? `${emailName}@nenu.edu.cn` : "未设置邮箱",
  };
};

export const infoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions | { cookies: Cookie[] }
> = async (req, res) => {
  try {
    if ("cookies" in req.body) return res.json(await getInfo(req.body.cookies));

    const result = await authLogin(req.body);

    if (result.success) return res.json(await getInfo(result.cookies));

    return res.json(<CommonFailedResponse>{
      success: false,
      status: "failed",
      msg: "登录失败",
    });
  } catch (err) {
    return res.json(<CommonFailedResponse>{
      success: false,
      status: "failed",
      msg: "参数错误",
    });
  }
};
