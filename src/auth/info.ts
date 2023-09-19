import type { RequestHandler } from "express";

import { authLogin } from "./login.js";
import { AUTH_SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

export interface InfoSuccessResponse {
  success: true;

  /** 用户姓名 */
  name: string;

  /** 登陆别名 */
  alias: string;
}

export type InfoResponse = InfoSuccessResponse | CommonFailedResponse;

const userNameRegexp =
  /class="auth_username">\s+<span>\s+<span>\s+(.*?)\s+<\/span>/;

const inputRegExp = /id="alias".*?value="(.*?)"/;

export const getBasicInfo = async (
  cookieHeader: string,
): Promise<InfoResponse> => {
  const userNameResponse = await fetch(`${AUTH_SERVER}/authserver/index.do`, {
    method: "GET",
    headers: {
      Cookie: cookieHeader,
    },
  });

  const userNameResponseText = await userNameResponse.text();

  const userName = userNameRegexp.exec(userNameResponseText)?.[1];

  console.log("Getting username", userName);

  if (!userName)
    return <CommonFailedResponse>{
      success: false,
      msg: "获取姓名失败",
    };

  const aliasResponse = await fetch(
    `${AUTH_SERVER}/authserver/userAttributesEdit.do`,
    {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
    },
  );

  const aliasResponseText = await aliasResponse.text();

  const alias = inputRegExp.exec(aliasResponseText)?.[1];

  console.log("Getting alias: ", alias);

  if (typeof alias !== "string")
    return <CommonFailedResponse>{
      success: false,
      msg: "获取别名失败",
    };

  return <InfoSuccessResponse>{
    success: true,
    name: userName,
    alias: alias || "未设置别名",
  };
};

export const infoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  Partial<LoginOptions>
> = async (req, res) => {
  try {
    if (req.headers.cookie)
      return res.json(await getBasicInfo(req.headers.cookie));

    if (!req.body.id || !req.body.password)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "请提供账号密码",
      });

    const result = await authLogin(<LoginOptions>req.body);

    if (result.success) {
      const cookieHeader = result.cookieStore.getHeader(
        `${AUTH_SERVER}/authserver/`,
      );

      return res.json(await getBasicInfo(cookieHeader));
    }

    return res.json(<CommonFailedResponse>{
      success: false,
      msg: "登录失败，无法获取信息。",
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);

    return res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
