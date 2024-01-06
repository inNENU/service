import {
  CookieStore as _CookieStore,
  getDomain,
  parseCookieHeader,
} from "@mptool/net";

/**
 * CookieStore 类
 */
export class CookieStore extends _CookieStore {
  applyResponse(response: Response, domainOrURL: string): void {
    return this.apply(
      parseCookieHeader(
        response.headers.getSetCookie().join(","),
        getDomain(domainOrURL),
      ),
    );
  }
}
