import { CookieStore } from "@mptool/net";

import {
  ActionFailType,
  MissingCredentialResponse,
  UnknownResponse,
  WrongPasswordResponse,
} from "@/config/index.js";
import type { AccountInfo, CommonFailedResponse } from "@/typings.js";
import { request } from "@/utils/index.js";

import type {
  AuthInfoFailedResponse,
  AuthInfoSuccessResponse,
} from "./info.js";
import { authEncrypt } from "../encrypt.js";
import {
  AUTH_LOGIN_URL,
  IMPROVE_INFO_URL,
  RE_AUTH_URL,
  UPDATE_INFO_URL,
} from "../utils.js";
import { TEST_AUTH_INFO, getAuthInfo } from "./info.js";

export interface InitAuthOptions extends AccountInfo {
  /** 选项 */
  params: Record<string, string>;
  /** 盐值 */
  salt: string;
  /** App ID */
  appId: string | number;
  /** 用户 OpenID */
  openid: string;
}

export type InitAuthSuccessResponse = AuthInfoSuccessResponse;
export type InitAuthFailedResponse =
  | CommonFailedResponse<
      | ActionFailType.AccountLocked
      | ActionFailType.DatabaseError
      | ActionFailType.EnabledSSO
      | ActionFailType.Expired
      | ActionFailType.Forbidden
      | ActionFailType.NeedCaptcha
      | ActionFailType.MissingCredential
      | ActionFailType.Unknown
      | ActionFailType.SecurityError
      | ActionFailType.WrongCaptcha
      | ActionFailType.WrongPassword
    >
  | (CommonFailedResponse<ActionFailType.NeedReAuth> & {
      cookieStore: CookieStore;
    })
  | AuthInfoFailedResponse;

export type InitAuthResponse = InitAuthSuccessResponse | InitAuthFailedResponse;

export const initAuth = async (
  { id, password, authToken, salt, params, appId, openid }: InitAuthOptions,
  cookieHeader: string,
): Promise<InitAuthResponse> => {
  if (!id || !password) return MissingCredentialResponse;

  if (!salt || Object.keys(params).length === 0) {
    console.error("Missing salt or params", {
      salt,
      params,
    });

    return UnknownResponse("未成功取得初始化信息，请重新输入学号");
  }

  const cookieStore = new CookieStore();
  const loginResponse = await fetch(AUTH_LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
      Referer: AUTH_LOGIN_URL,
      "User-Agent": "inNENU service",
    },
    body: new URLSearchParams({
      ...params,
      password: authEncrypt(password, salt),
    }),
    signal: AbortSignal.timeout(5000),
    redirect: "manual",
  });

  cookieStore.applyResponse(loginResponse, AUTH_LOGIN_URL);

  const location = loginResponse.headers.get("Location");
  const resultContent = await loginResponse.text();

  if (loginResponse.status === 401) {
    if (
      resultContent.includes("该账号非常用账号或用户名密码有误") ||
      resultContent.includes("您提供的用户名或者密码有误")
    )
      return WrongPasswordResponse;

    if (resultContent.includes("该帐号已经被禁用"))
      return {
        success: false,
        type: ActionFailType.Forbidden,
        msg: "该帐号已经被禁用",
      };

    const lockedResult = /<span>账号已冻结，预计解冻时间：(.*?)<\/span>/.exec(
      resultContent,
    );

    if (lockedResult)
      return {
        success: false,
        type: ActionFailType.AccountLocked,
        msg: `账号已冻结，预计解冻时间：${lockedResult[1]}`,
      };

    if (resultContent.includes("该帐号未激活，请先完成帐号激活再登录"))
      return {
        success: false,
        type: ActionFailType.AccountLocked,
        msg: "该帐号未激活，请先完成帐号激活再登录",
      };

    if (resultContent.includes("图形动态码错误"))
      return {
        success: false,
        type: ActionFailType.WrongCaptcha,
        msg: "图形动态码错误，请重试",
      };
  }

  if (loginResponse.status === 200) {
    if (resultContent.includes("无效的验证码"))
      return {
        success: false,
        type: ActionFailType.WrongCaptcha,
        msg: "验证码错误",
      };

    if (
      resultContent.includes("会话已失效，请刷新页面再登录") ||
      resultContent.includes("当前登录会话已失效，请重新登录！")
    )
      return {
        success: false,
        type: ActionFailType.Expired,
        msg: "由于操作超时或在其他地方操作，会话已过期。请重新登录",
      };

    if (resultContent.includes("当前账户已在其他PC端登录会话。"))
      return {
        success: false,
        type: ActionFailType.EnabledSSO,
        msg: "您已开启单点登录，请访问学校统一身份认证官网，在个人设置中关闭单点登录后重试。",
      };

    if (resultContent.includes("<span>请输入验证码</span>"))
      return {
        success: false,
        type: ActionFailType.NeedCaptcha,
        msg: "需要验证码",
      };
  }

  if (loginResponse.status !== 302) {
    console.error(
      "Unknown login response during init: ",
      loginResponse.status,
      resultContent,
    );

    return UnknownResponse("登录失败");
  }

  if (location?.startsWith(AUTH_LOGIN_URL)) return WrongPasswordResponse;

  if (location?.startsWith(IMPROVE_INFO_URL)) {
    const response = await fetch(UPDATE_INFO_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader + ";" + cookieStore.getHeader(UPDATE_INFO_URL),
        "User-Agent": "inNENU service",
      },
    });

    const result = (await response.json()) as { errMsg: string };

    return {
      success: false,
      type: ActionFailType.SecurityError,
      msg: `信息化办公室提示: ${result.errMsg}`,
    };
  }

  if (location?.startsWith(RE_AUTH_URL))
    return {
      success: false,
      type: ActionFailType.NeedReAuth,
      msg: "需要二次认证",
      cookieStore,
    };

  const result = await getAuthInfo(
    {
      id,
      password,
      authToken,
      appId,
      openid,
    },
    cookieStore,
  );

  if (!result.success) return result;

  return {
    success: true,
    info: result.info,
    cookieStore,
  };
};

export const authInitHandler = request<
  InitAuthResponse,
  InitAuthOptions,
  { id: string }
>(async (req, res) => {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) return MissingCredentialResponse;

  // Note: Return fake result for testing
  if (cookieHeader.includes("TEST")) return res.json(TEST_AUTH_INFO);

  const result = await initAuth(req.body, cookieHeader);

  if ("cookieStore" in result) {
    const cookies = result.cookieStore
      .getAllCookies()
      .map((item) => item.toJSON());

    cookies.forEach(({ name, value, ...rest }) => {
      res.cookie(name, value, rest);
    });

    // @ts-expect-error: cookieStore is not a JSON-serializable object
    delete result.cookieStore;
  }

  return res.json(result);
});
