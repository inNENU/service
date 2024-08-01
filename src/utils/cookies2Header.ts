import type { CookieType } from "@mptool/net";

export const cookies2Header = (cookies: CookieType[]): string => {
  const finalCookies = cookies.filter(
    ({ name }, index) =>
      cookies.findLastIndex((item) => item.name === name) === index,
  );

  const cookieHeader = finalCookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return cookieHeader;
};
