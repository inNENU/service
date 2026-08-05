/**
 * 测试 HTTP 客户端
 *
 * Node 环境无跨域限制，直接向本地服务发起请求。 Cookie 由测试端自行管理：解析所有 Set-Cookie 并按名称覆盖存储， 每次请求把全部 cookie 作为 Cookie
 * 头带上（与服务端行为一致）。
 */
import { BASE_URL, REQUEST_TIMEOUT } from "./config.js";
import { CookieJar } from "./cookiJar.js";

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

export class ApiClient {
  readonly jar = new CookieJar();

  async request<T = any>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: this.jar.getHeader(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      // 不跟随重定向，以便断言真实状态码
      redirect: "manual",
    });

    this.jar.applySetCookie(response.headers);

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
