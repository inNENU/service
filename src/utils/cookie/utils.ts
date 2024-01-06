import type { CookieType } from "../../typings.js";

export const cookies2Header = (cookies: CookieType[]): string => {
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
