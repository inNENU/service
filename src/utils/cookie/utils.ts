import { parse, splitCookiesString } from "set-cookie-parser";

import { Cookie } from "./cookie.js";
import type { CookieType } from "../../typings.js";

/**
 * @see RFC 6265
 */
export const normalizeDomain = (domain = ""): string =>
  domain.replace(/^(\.*)?(?=\S)/gi, ".");

export const getCookieScopeDomain = (domain = ""): string[] => {
  if (!domain) return [];

  // 获取 cookie 作用域范围列表
  domain = domain.replace(/^\.+/gi, "");

  const scopes = domain
    .split(".")
    .map((k) => [".", domain.slice(domain.indexOf(k))].join(""));

  return [domain].concat(scopes);
};

export interface UrlInfo {
  domain: string;
  path: string;
}

export const getDomain = (domainOrURL: string): string =>
  domainOrURL
    .replace(/^https?:\/\//, "")
    .split("/")
    .shift()!
    .replace(/:\d+$/, "");

export const parseUrl = (url: string): UrlInfo => {
  const domain = getDomain(url);
  const path = url.split(domain)[1].replace(/^:\d+/, "") || "/";

  return {
    domain,
    path,
  };
};

export type CookieStoreOptions = string | { domain?: string; path?: string };

export const getCookieOptions = (options?: CookieStoreOptions): UrlInfo => {
  const { domain = "", path = "/" } =
    typeof options === "object"
      ? options
      : typeof options === "string"
      ? parseUrl(options)
      : {};

  return { domain, path };
};
export const parseCookieHeader = (
  setCookieHeader: string,
  domain: string,
): CookieType[] =>
  // @ts-ignore
  parse(splitCookiesString(setCookieHeader), {
    decodeValues: false,
  }).map((item) => ({
    ...item,
    domain: normalizeDomain(item.domain) || domain,
  }));

export const getResponseCookies = (
  res: Response,
  domainOrUrl?: string,
): CookieType[] =>
  parseCookieHeader(
    res.headers.get("set-cookie") || "",
    domainOrUrl ? getDomain(domainOrUrl) : "",
  );

export const getCookieItems = (
  cookies: CookieType[],
  domain?: string,
): Cookie[] =>
  cookies.map(
    (item) =>
      new Cookie({
        ...item,
        domain: normalizeDomain(item.domain) || domain,
      }),
  );

export const getCookieHeader = (
  cookies: CookieType[],
  domainOrURL: string,
): string => {
  const domain = getDomain(domainOrURL);
  const finalCookies = cookies.filter(
    ({ name }, index) =>
      // eslint-disable-next-line
      (<CookieType[]>cookies).findLastIndex((item) => item.name === name) ===
      index,
  );

  const cookieHeader = finalCookies
    .filter((item) => domain === item.domain)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return cookieHeader;
};
