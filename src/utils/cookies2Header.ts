import type { CookieType } from "@mptool/net";

export const cookies2Header = <T extends CookieType[] | undefined>(
  cookies: T,
): T extends undefined ? null : string => {
  if (!cookies) return null as T extends undefined ? null : string;

  const finalCookies = cookies.filter(
    ({ name }, index) =>
      cookies.findLastIndex((item) => item.name === name) === index,
  );

  const cookieHeader = finalCookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return cookieHeader as T extends undefined ? null : string;
};
