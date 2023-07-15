import { parse, splitCookiesString } from "set-cookie-parser";

import type { Cookie } from "../typings.js";

export const getCookies = (res: Response): Cookie[] =>
  parse(splitCookiesString(res.headers.get("set-cookie") || ""));

export const joinCookies = (
  cookies: Cookie[],
  newCookies: Cookie[],
): Cookie[] => {
  const joined = [...cookies, ...newCookies];

  return joined.filter(
    ({ name }, index) =>
      // eslint-disable-next-line
      joined.findLastIndex((item) => item.name === name) === index,
  );
};

export const getCookieHeader = (cookies: Cookie[]): string => {
  const finalCookies = cookies.filter(
    ({ name }, index) =>
      // eslint-disable-next-line
      cookies.findLastIndex((item) => item.name === name) === index,
  );

  const cookieHeader = finalCookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return cookieHeader;
};
