/**
 * 测试 HTTP 客户端
 *
 * 复用 @mptool/net 的 CookieStore（与服务器端/小程序端同一套逻辑）管理 cookie： - 本地服务通过 Set-Cookie 下发的 cookie 按对应域存入 -
 * 登录接口 body 中的 cookies 数组由 loginSystem 显式写入 - 请求本地服务时只带本地域的 cookie；外部域 cookie 由 /check 按系统域单独上传
 */
import { CookieStore } from "@mptool/net";

import { BASE_URL, REQUEST_TIMEOUT } from "./config.js";

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

export class ApiClient {
  readonly jar = new CookieStore();

  async request<T = any>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        // 本地服务依赖 req.headers.cookie 原样转发外部系统请求（loginToAction 中间件），
        // 因此请求本地服务时携带 CookieStore 中的全部 cookie；
        // 会话校验（/check）才由 checkSession 按系统域单独上传相关 cookie
        Cookie: this.jar
          .getAllCookies()
          .map((cookie) => cookie.toString())
          .join("; "),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      // 不跟随重定向，以便断言真实状态码
      redirect: "manual",
    });

    this.jar.applyHeader(response.headers, BASE_URL);

    const text = await response.text();
    let parsed: T;

    try {
      parsed = JSON.parse(text) as T;
    } catch {
      parsed = text as T;
    }

    return { status: response.status, body: parsed };
  }

  async get<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>("GET", path);
  }

  async post<T = any>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("POST", path, body);
  }
}
