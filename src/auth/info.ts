import type { RequestHandler } from "express";

import { authLogin } from "./login.js";
import { AUTH_SERVER } from "./utils.js";
import { ActionFailType } from "../config/index.js";
import type {
  AccountInfo,
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
  try {
    const userNameResponse = await fetch(`${AUTH_SERVER}/authserver/index.do`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
    });

    const userNameResponseText = await userNameResponse.text();

    const userName = userNameRegexp.exec(userNameResponseText)?.[1];

    console.log("Getting username", userName);

    if (!userName) throw new Error("获取姓名失败");

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

    if (typeof alias !== "string") throw new Error("获取别名失败");

    return {
      success: true,
      name: userName,
      alias: alias || "未设置别名",
    };
  } catch (err) {
    console.error(err);

    return {
      success: false,
      type: ActionFailType.Unknown,
      msg: "获取信息失败",
    };
  }
};

export const infoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    if (req.headers.cookie)
      return res.json(await getBasicInfo(req.headers.cookie));

    if (!req.body.id || !req.body.password)
      throw new Error(`"id" and "password" field is required!`);

    const result = await authLogin(req.body as AccountInfo);

    if (result.success) {
      const cookieHeader = result.cookieStore.getHeader(
        `${AUTH_SERVER}/authserver/`,
      );

      return res.json(await getBasicInfo(cookieHeader));
    }

    throw new Error("登录失败，无法获取信息。");
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
