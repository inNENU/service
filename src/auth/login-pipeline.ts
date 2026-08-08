import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";
import type { ParamsDictionary, RequestHandler } from "express-serve-static-core";

import {
  MissingCredentialResponse,
  TEST_ID_NUMBER,
  TEST_LOGIN_RESULT,
  unknownResponse,
} from "../config/index.js";
import type { ActionFailType } from "../config/index.js";
import type { AccountInfo, CommonFailedResponse, LoginOptions } from "../typings.js";
import { request } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { vpnCASLogin } from "../vpn/index.js";
import type { AuthLoginFailedResponse } from "./login.js";
import { authLogin } from "./login.js";

export interface LoginPipelineSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type LoginPipelineFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<ActionFailType>;

export type LoginPipelineResult = LoginPipelineSuccessResult | LoginPipelineFailedResponse;

export interface LoginPipelineVerifyContext {
  cookieStore: CookieStore;
  /** AuthLogin 返回的 ticket URL */
  location: string;
  /** 标准 ticket 兑换后的重定向目标（未走标准兑换时为 null） */
  finalLocation: string | null;
  /** 标准 ticket 兑换响应状态码（未走标准兑换时为 null） */
  status: number | null;
}

export interface LoginPipelineTicketOptions {
  /** Ticket 兑换请求的 Referer */
  referer?: string;
  /** Ticket 兑换请求的额外 headers */
  headers?: Record<string, string>;
  /** 请求超时（毫秒） */
  timeout?: number;
  /** 转换 ticket 兑换请求的 URL（如 webVPN 域名替换） */
  transformUrl?: (location: string) => string;
  /** Ticket 兑换响应非 302 时的处理（如 under-study 405 → Restricted） */
  onNonRedirect?: (
    status: number,
    ctx: Pick<LoginPipelineVerifyContext, "cookieStore" | "location">,
  ) => LoginPipelineResult | null;
}

export interface LoginPipelineConfig {
  /** AuthLogin 的 service 参数 */
  service: string;
  /** 是否走 WebVPN（需要先 vpnCASLogin） */
  webVPN?: boolean;
  /** AuthLogin 之前的前置步骤（可选，返回失败结果则中断） */
  beforeAuth?: (cookieStore: CookieStore) => Promise<void | LoginPipelineResult>;
  /** 标准 ticket 兑换配置（不传则跳过，直接交给 verify 处理） */
  ticket?: LoginPipelineTicketOptions;
  /** 认证完成后的最终验证 */
  verify: (ctx: LoginPipelineVerifyContext) => LoginPipelineResult | Promise<LoginPipelineResult>;
}

/**
 * 统一登录流程：
 *
 * VpnCASLogin（可选）→ beforeAuth（可选）→ authLogin → 标准 ticket 兑换（可选）→ verify
 *
 * @param options 账号信息
 * @param config 差异化配置（service、webVPN、ticket 请求头、最终会话验证）
 * @param cookieStore Cookie 管理器（默认新建）
 * @returns 登录结果
 */
export const loginPipeline = async <Result extends LoginPipelineResult = LoginPipelineResult>(
  options: AccountInfo,
  config: Omit<LoginPipelineConfig, "verify"> & {
    verify: (ctx: LoginPipelineVerifyContext) => Result | Promise<Result>;
  },
  cookieStore = new CookieStore(),
): Promise<Result> => {
  // 1. VPN CAS 登录（可选）
  if (config.webVPN) {
    const vpnLoginResult = await vpnCASLogin(options, cookieStore);

    if (!vpnLoginResult.success) return vpnLoginResult as Result;
  }

  // 2. 前置步骤（可选）
  if (config.beforeAuth) {
    const result = await config.beforeAuth(cookieStore);

    if (result && !result.success) return result as Result;
  }

  // 3. 统一身份认证
  const authResult = await authLogin({
    ...options,
    service: config.service,
    webVPN: config.webVPN,
    cookieStore,
  });

  if (!authResult.success) {
    console.error(authResult.msg);

    return authResult as Result;
  }

  const { location } = authResult;

  // 4. 标准 ticket 兑换（可选）
  if (config.ticket) {
    const { headers, onNonRedirect, referer, timeout, transformUrl } = config.ticket;
    const ticketUrl = transformUrl?.(location) ?? location;

    const ticketResponse = await fetch(ticketUrl, {
      headers: {
        Cookie: cookieStore.getHeader(location),
        ...(referer ? { Referer: referer } : {}),
        ...headers,
      },
      redirect: "manual",
      ...(timeout ? { signal: AbortSignal.timeout(timeout) } : {}),
    });

    cookieStore.applyResponse(ticketResponse, location);

    const { status } = ticketResponse;

    if (status !== 302) {
      const handled = onNonRedirect?.(status, { cookieStore, location });

      if (handled) return handled as Result;

      return unknownResponse("登录失败") as Result;
    }

    return config.verify({
      cookieStore,
      location,
      finalLocation: ticketResponse.headers.get("Location"),
      status,
    });
  }

  // 无标准 ticket 兑换（如 action 的多步跳转链），直接交给 verify 处理
  return config.verify({
    cookieStore,
    location,
    finalLocation: null,
    status: null,
  });
};

export interface LoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

/**
 * 创建登录相关 handler：loginToXxx 中间件 + xxxLoginHandler
 *
 * @param login 登录函数
 * @param server 需要写入 req.headers.cookie 的服务器地址
 * @param options 选项
 * @param options.testMode 是否启用 TEST 模式（grad-system 无 TEST 分支，传 false）
 * @returns 登录中间件与登录 handler
 */
export const createLoginHandlers = (
  login: (options: AccountInfo) => Promise<LoginPipelineResult>,
  server: string,
  { testMode = true }: { testMode?: boolean } = {},
): {
  loginTo: RequestHandler<
    ParamsDictionary,
    | LoginSuccessResponse
    | LoginPipelineFailedResponse
    | CommonFailedResponse<ActionFailType.MissingCredential>,
    LoginOptions
  >;
  loginHandler: RequestHandler<
    ParamsDictionary,
    LoginSuccessResponse | LoginPipelineFailedResponse,
    AccountInfo
  >;
} => {
  type Response = LoginSuccessResponse | LoginPipelineFailedResponse;

  const loginTo = request<
    Response | CommonFailedResponse<ActionFailType.MissingCredential>,
    LoginOptions
    // oxlint-disable-next-line typescript/consistent-return
  >(async (req, res, next) => {
    if (!req.body) return res.json(MissingCredentialResponse);

    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await login({ id, password, authToken });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(server);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    next();
  });

  const loginHandler = request<Response, AccountInfo>(async (req, res) => {
    const result =
      testMode && req.body.id === TEST_ID_NUMBER ? TEST_LOGIN_RESULT : await login(req.body);

    if (result.success) {
      const cookies = result.cookieStore.getAllCookies().map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json({ success: true, cookies });
    }

    return res.json(result);
  });

  return { loginTo, loginHandler };
};
