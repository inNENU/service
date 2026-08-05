/**
 * 测试 HTTP 客户端
 *
 * Node 环境无跨域限制，直接向本地服务发起请求。 Cookie 由测试端自行管理：解析所有 Set-Cookie 并按名称覆盖存储， 每次请求把全部 cookie 作为 Cookie
 * 头带上（与服务端行为一致）。
 */
import type { CookieType } from "@mptool/net";

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

/** 简易 cookie 管理（忽略域名作用域，仅保留 name/value 用于转发） */
export class CookieJar {
  private readonly cookies = new Map<string, CookieType>();

  set(name: string, value: string): void {
    this.cookies.set(name, { name, value });
  }

  /** 应用服务端返回的 cookies 数组（如登录接口 body 中的 cookies 字段） */
  apply(cookies?: CookieType[] | null): void {
    for (const cookie of cookies ?? []) this.cookies.set(cookie.name, cookie);
  }

  /** 解析响应头中的 Set-Cookie */
  applySetCookie(headers: Headers): void {
    for (const raw of headers.getSetCookie()) {
      const [pair, ...directives] = raw.split(";");
      const equalIndex = pair.indexOf("=");

      if (equalIndex === -1) continue;

      const name = pair.slice(0, equalIndex).trim();
      const value = pair.slice(equalIndex + 1).trim();
      const cookie: CookieType = { name, value };

      for (const directive of directives) {
        const [key, ...rest] = directive.trim().split("=");
        const directiveValue = rest.join("=").trim();

        switch (key.toLowerCase()) {
          case "domain": {
            cookie.domain = directiveValue;
            break;
          }
          case "path": {
            cookie.path = directiveValue;
            break;
          }
          case "expires": {
            const date = new Date(directiveValue);

            if (!Number.isNaN(date.getTime())) cookie.expires = date;
            break;
          }
          case "max-age": {
            cookie.maxAge = Number(directiveValue);
            break;
          }
          case "secure": {
            cookie.secure = true;
            break;
          }
          case "httponly": {
            cookie.httpOnly = true;
            break;
          }
          default: {
            break;
          }
        }
      }

      this.cookies.set(name, cookie);
    }
  }

  get(name: string): string | undefined {
    return this.cookies.get(name)?.value;
  }

  getHeader(): string {
    return [...this.cookies.values()].map(({ name, value }) => `${name}=${value}`).join("; ");
  }

  toJSON(): CookieType[] {
    return [...this.cookies.values()].map((cookie) => Object.assign({}, cookie));
  }
}
